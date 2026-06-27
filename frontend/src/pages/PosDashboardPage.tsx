import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { format } from 'date-fns';

// Qatar denominations (QAR bills + coins)
const DENOMINATIONS = [500, 200, 100, 50, 10, 5, 1, 0.5, 0.25];

interface DenomRow { denomination: number; count: number }
const emptyDenoms = (): DenomRow[] => DENOMINATIONS.map((d) => ({ denomination: d, count: 0 }));
const denomTotal = (rows: DenomRow[]) => rows.reduce((s, r) => s + r.denomination * r.count, 0);

interface PosSession {
  id: number;
  sessionNo: string;
  status: string;
  openingFloat: number;
  closingCounted?: number;
  openedAt: string;
  closedAt?: string;
  branch?: { id: number; name: string };
  _count?: { orders: number };
  totalRevenue?: number;
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'QAR', maximumFractionDigits: 2 }).format(n || 0);

export default function PosDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, activeBranch } = useAuth();
  const qc = useQueryClient();

  const branchId = activeBranch?.id || user?.branchId;

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openDenoms, setOpenDenoms] = useState<DenomRow[]>(emptyDenoms());

  // Fetch current session
  const { data: currentSession, isLoading: sessionLoading } = useQuery({
    queryKey: ['pos-session-current', branchId],
    queryFn: () => api.get('/pos-sessions/current', { params: { branchId } }).then((r) => r.data.data),
    enabled: !!branchId,
    refetchInterval: 30_000,
  });

  // Fetch recent sessions
  const { data: recentSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['pos-sessions-recent', branchId],
    queryFn: () => api.get('/pos-sessions', { params: { branchId, limit: 5 } }).then((r) => r.data.data),
    enabled: !!branchId,
  });

  // Fetch session report for today's stats (use current session if open)
  const { data: sessionReport } = useQuery({
    queryKey: ['pos-session-report', currentSession?.id],
    queryFn: () => api.get(`/pos-sessions/${currentSession.id}/report`).then((r) => r.data.data),
    enabled: !!currentSession?.id,
    refetchInterval: 60_000,
  });

  // Try to fetch POS configs (may not exist)
  const { data: posConfigs } = useQuery({
    queryKey: ['pos-configs'],
    queryFn: () => api.get('/pos-configs').then((r) => r.data.data),
    retry: false,
  });

  // Open session mutation
  const openMut = useMutation({
    mutationFn: () => {
      const total = denomTotal(openDenoms);
      return api.post('/pos-sessions/open', {
        branchId,
        openingFloat: total,
        denominations: openDenoms.filter((d) => d.count > 0),
      });
    },
    onSuccess: async () => {
      toast.success(t('pos.session.opened', 'Session opened successfully'));
      setShowOpenModal(false);
      setOpenDenoms(emptyDenoms());
      await qc.refetchQueries({ queryKey: ['pos-session-current', branchId] });
      navigate('/pos');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to open session'),
  });

  const updateDenom = (index: number, count: number) => {
    setOpenDenoms((prev) => prev.map((r, i) => (i === index ? { ...r, count: Math.max(0, count) } : r)));
  };

  if (!branchId) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('pos.dashboard.title', 'Point of Sale')} subtitle={t('pos.dashboard.subtitle', 'Select a branch to get started')} />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-6xl mb-4">🏪</div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No Branch Selected</h3>
            <p className="text-sm text-gray-500 mt-1">Please select a branch from the top navigation to access POS.</p>
          </div>
        </div>
      </div>
    );
  }

  if (sessionLoading) return <LoadingSpinner size="lg" />;

  const isOpen = !!currentSession && currentSession.status === 'OPEN';
  const branchName = activeBranch?.name || user?.branch?.name || 'Main Branch';

  // Compute today's quick stats from session report or current session
  const totalOrders = sessionReport?.totalOrders ?? currentSession?._count?.orders ?? 0;
  const totalRevenue = sessionReport?.totalRevenue ?? sessionReport?.netSales ?? 0;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Build config cards. If /pos-configs returned data, use it. Otherwise fallback to single card for current branch.
  const configCards = posConfigs && Array.isArray(posConfigs) && posConfigs.length > 0
    ? posConfigs
    : [{ id: branchId, name: `POS - ${branchName}`, branchName, branchId }];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('pos.dashboard.title', 'Point of Sale')}
        subtitle={t('pos.dashboard.subtitle', 'Manage your POS sessions and start selling')}
      />

      {/* Quick Stats */}
      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-5">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">{t('pos.dashboard.totalOrders', "Today's Orders")}</p>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">{totalOrders}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-5">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">{t('pos.dashboard.totalRevenue', 'Total Revenue')}</p>
            <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">{fmtCurrency(totalRevenue)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 rounded-2xl border border-purple-200 dark:border-purple-800 p-5">
            <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">{t('pos.dashboard.avgTicket', 'Avg. Ticket')}</p>
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">{fmtCurrency(avgTicket)}</p>
          </div>
        </div>
      )}

      {/* POS Config Cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          {t('pos.dashboard.terminals', 'POS Terminals')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {configCards.map((config: any) => (
            <div
              key={config.id}
              className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              {/* Gradient top accent */}
              <div className={`h-1.5 ${isOpen ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700'}`} />

              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      {config.name || `POS - ${config.branchName || branchName}`}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {config.branchName || branchName}
                    </p>
                  </div>
                  {/* Status indicator */}
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span className={`text-xs font-medium ${isOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>
                      {isOpen ? t('pos.dashboard.open', 'OPEN') : t('pos.dashboard.closed', 'CLOSED')}
                    </span>
                  </div>
                </div>

                {/* Last session info */}
                {currentSession && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>🕐</span>
                    <span>
                      {isOpen
                        ? `Opened ${format(new Date(currentSession.openedAt), 'MMM d, HH:mm')}`
                        : currentSession.closedAt
                          ? `Last closed ${format(new Date(currentSession.closedAt), 'MMM d, HH:mm')}`
                          : 'No recent sessions'
                      }
                    </span>
                    {currentSession.sessionNo && (
                      <span className="ml-auto font-mono text-gray-400">#{currentSession.sessionNo}</span>
                    )}
                  </div>
                )}

                {/* Action button */}
                <div className="mt-4">
                  {isOpen ? (
                    <button
                      onClick={() => navigate('/pos')}
                      className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <span>🛒</span>
                      {t('pos.dashboard.continueSelling', 'Continue Selling')}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setOpenDenoms(emptyDenoms());
                        setShowOpenModal(true);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      <span>▶️</span>
                      {t('pos.dashboard.openSession', 'Open Session')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            📋 {t('pos.dashboard.recentSessions', 'Recent Sessions')}
          </h3>
          <button
            onClick={() => navigate('/sessions')}
            className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:underline"
          >
            {t('common.viewAll', 'View All')} →
          </button>
        </div>

        {sessionsLoading ? (
          <LoadingSpinner size="sm" />
        ) : !recentSessions || recentSessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">{t('pos.dashboard.noSessions', 'No sessions found')}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {recentSessions.slice(0, 5).map((session: PosSession) => (
              <div
                key={session.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${session.status === 'OPEN' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {session.sessionNo || `Session #${session.id}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {session.openedAt ? format(new Date(session.openedAt), 'MMM d, yyyy · HH:mm') : ''}
                      {session.closedAt ? ` — ${format(new Date(session.closedAt), 'HH:mm')}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    session.status === 'OPEN'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {session.status}
                  </span>
                  {session.totalRevenue !== undefined && (
                    <p className="text-xs text-gray-500 mt-0.5">{fmtCurrency(session.totalRevenue)}</p>
                  )}
                  {session._count?.orders !== undefined && (
                    <p className="text-xs text-gray-400">{session._count.orders} orders</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Opening Cash Count Modal */}
      <Modal open={showOpenModal} onClose={() => setShowOpenModal(false)} title={t('pos.session.openingCashCount', 'Opening Cash Count')} size="md">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          {t('pos.dashboard.openingHint', 'Count the cash in your drawer by denomination before starting the session.')}
        </p>
        <DenomGrid rows={openDenoms} onChange={updateDenom} />
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {t('pos.session.total', 'Total')}: {denomTotal(openDenoms).toFixed(2)} QAR
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowOpenModal(false)}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              onClick={() => openMut.mutate()}
              disabled={openMut.isPending}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {openMut.isPending ? t('pos.session.opening', 'Opening...') : t('pos.session.openSession', 'Open Session')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** Denomination counting grid — bills and coins with +/- buttons */
function DenomGrid({ rows, onChange }: { rows: DenomRow[]; onChange: (index: number, count: number) => void }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 max-h-[50vh] overflow-y-auto">
      {rows.map((r, i) => (
        <div key={r.denomination} className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
          <span className="w-16 text-sm font-medium text-gray-700 dark:text-gray-200">
            {r.denomination >= 1 ? `${r.denomination} QAR` : `${(r.denomination * 100).toFixed(0)} Dhs`}
          </span>
          <span className="text-xs text-gray-400 w-12">
            {r.denomination >= 100 ? 'Bill' : r.denomination >= 1 ? 'Note' : 'Coin'}
          </span>
          <div className="flex items-center gap-1 ms-auto">
            <button
              onClick={() => onChange(i, r.count - 1)}
              className="w-7 h-7 rounded bg-gray-200 dark:bg-gray-700 text-sm font-bold flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >−</button>
            <input
              type="number"
              min={0}
              value={r.count}
              onChange={(e) => onChange(i, parseInt(e.target.value) || 0)}
              className="w-14 text-center rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-1 py-1 text-sm"
            />
            <button
              onClick={() => onChange(i, r.count + 1)}
              className="w-7 h-7 rounded bg-gray-200 dark:bg-gray-700 text-sm font-bold flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >+</button>
          </div>
          <span className="w-20 text-end text-sm font-semibold text-gray-700 dark:text-gray-200">
            {(r.denomination * r.count).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
