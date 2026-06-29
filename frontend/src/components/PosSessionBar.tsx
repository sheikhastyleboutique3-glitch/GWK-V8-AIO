import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { printSessionReport, BusinessInfo } from '../lib/thermalPrint';
import Modal from './Modal';
import { usePrompt } from '../lib/usePrompt';

// Qatar denominations (QAR bills + coins)
const DENOMINATIONS = [500, 200, 100, 50, 10, 5, 1, 0.5, 0.25];

interface DenomRow { denomination: number; count: number }
const emptyDenoms = (): DenomRow[] => DENOMINATIONS.map((d) => ({ denomination: d, count: 0 }));
const denomTotal = (rows: DenomRow[]) => rows.reduce((s, r) => s + r.denomination * r.count, 0);

export default function PosSessionBar({ branchId, businessInfo }: { branchId?: number; businessInfo: BusinessInfo }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [showOpen, setShowOpen] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [openDenoms, setOpenDenoms] = useState<DenomRow[]>(emptyDenoms());
  const [closeDenoms, setCloseDenoms] = useState<DenomRow[]>(emptyDenoms());
  const [prompt, PromptDialog] = usePrompt();

  const key = ['pos-session-current', branchId];
  const { data: session } = useQuery({
    queryKey: key,
    queryFn: () => api.get('/pos-sessions/current', { params: { branchId } }).then((r) => r.data.data),
    enabled: !!branchId,
    refetchInterval: 30_000,
  });

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
      toast.success(t('pos.session.opened'));
      setShowOpen(false);
      setOpenDenoms(emptyDenoms());
      await qc.refetchQueries({ queryKey: ['pos-session-current', branchId] });
      // Odoo behavior: auto-navigate to POS after opening session
      if (!location.pathname.startsWith('/pos')) {
        navigate('/pos');
      }
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const closeMut = useMutation({
    mutationFn: () => {
      const total = denomTotal(closeDenoms);
      return api.post(`/pos-sessions/${session.id}/close`, {
        closingCounted: total,
        denominations: closeDenoms.filter((d) => d.count > 0),
      }).then((r) => r.data.data);
    },
    onSuccess: async (rep) => {
      printSessionReport(rep, businessInfo);
      toast.success(t('pos.session.closed'));
      setShowClose(false);
      setCloseDenoms(emptyDenoms());
      await qc.refetchQueries({ queryKey: ['pos-session-current', branchId] });
      // Odoo behavior: navigate back to dashboard after closing session
      navigate('/');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const cashMut = useMutation({
    mutationFn: (p: { type: 'CASH_IN' | 'CASH_OUT'; amount: number; reason?: string }) =>
      api.post(`/pos-sessions/${session.id}/cash`, p),
    onSuccess: () => {
      toast.success(t('pos.session.recorded'));
      qc.invalidateQueries({ queryKey: ['pos-session-current', branchId] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const xreport = useMutation({
    mutationFn: () => api.get(`/pos-sessions/${session.id}/report`).then((r) => r.data.data),
    onSuccess: (rep) => printSessionReport(rep, businessInfo),
  });

  // Fetch session report for Expected cash (used in close panel)
  const { data: sessionReport } = useQuery({
    queryKey: ['pos-session-report-live', session?.id],
    queryFn: () => api.get(`/pos-sessions/${session?.id}/report`).then((r) => r.data.data),
    enabled: !!session?.id && showClose,
    refetchInterval: false,
  });

  if (!branchId) return null;

  const promptCash = async (type: 'CASH_IN' | 'CASH_OUT') => {
    const raw = await prompt({
      title: type === 'CASH_IN' ? 'Cash In' : 'Cash Out',
      description: type === 'CASH_IN' ? 'Enter the amount to add to the drawer.' : 'Enter the amount to remove from the drawer.',
      placeholder: '0.00',
      type: 'number',
      confirmLabel: type === 'CASH_IN' ? 'Add Cash' : 'Remove Cash',
    });
    if (!raw) return;
    const amount = parseFloat(raw);
    if (!(amount > 0)) return toast.error('Invalid amount');
    const reason = await prompt({ title: 'Reason (optional)', placeholder: 'e.g. Change for customer' }) || undefined;
    cashMut.mutate({ type, amount, reason });
  };

  const updateDenom = (list: DenomRow[], setList: (v: DenomRow[]) => void, index: number, count: number) => {
    setList(list.map((r, i) => (i === index ? { ...r, count: Math.max(0, count) } : r)));
  };

  // ---- NO SESSION: show open button ----
  if (!session) {
    return (
      <>
        <div className="px-4 py-3 flex items-center justify-between bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <span className="text-sm font-medium text-amber-800 dark:text-amber-200">No active session</span>
          </div>
          <button
            onClick={() => setShowOpen(true)}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition"
          >
            Open Session
          </button>
        </div>

        {/* Opening Session — simple amount input (no denominations) */}
        <Modal open={showOpen} onClose={() => setShowOpen(false)} title="Open Session" size="sm">
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Enter the opening cash float in the drawer.</p>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Opening Float (QAR)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={denomTotal(openDenoms) || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setOpenDenoms([{ denomination: 1, count: val }]);
                }}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xl font-bold text-center"
                autoFocus
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowOpen(false)} className="flex-1 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium">Cancel</button>
              <button
                onClick={() => openMut.mutate()}
                disabled={openMut.isPending}
                className="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold disabled:opacity-50"
              >
                {openMut.isPending ? 'Opening...' : 'Open Session'}
              </button>
            </div>
          </div>
        </Modal>
        <PromptDialog />
      </>
    );
  }

  // ---- SESSION OPEN: show controls ----
  return (
    <>
      <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 p-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          ● {t('pos.session.openLabel')} · {session.sessionNo}
        </span>
        <span className="text-xs text-gray-500">{t('pos.session.float')}: {Number(session.openingFloat).toFixed(2)}</span>
        <div className="ms-auto flex flex-wrap gap-2">
          <button onClick={() => promptCash('CASH_IN')} className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs">＋ Cash In</button>
          <button onClick={() => promptCash('CASH_OUT')} className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs">－ Cash Out</button>
          <button onClick={() => xreport.mutate()} className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs">🖨 X-Report</button>
          <button onClick={() => setShowClose(true)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium">Close Session</button>
        </div>
      </div>

      {/* Closing Session Panel — Odoo-style Expected/Counted/Difference */}
      <Modal open={showClose} onClose={() => setShowClose(false)} title="Closing Session" size="md">
        <div className="space-y-4">
          {/* Order summary */}
          <div className="flex justify-between text-sm text-gray-500">
            <span>Total {sessionReport?.orderCount ?? 0} orders</span>
            <span className="font-bold text-gray-800 dark:text-gray-200">{(sessionReport?.salesTotal ?? 0).toFixed(2)} QAR</span>
          </div>

          {/* Payment Method Breakdown */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Payment Method</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Expected</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Counted</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <td className="px-4 py-3 font-medium">Cash</td>
                  <td className="px-4 py-3 text-right">{(sessionReport?.expectedCash ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={denomTotal(closeDenoms) || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCloseDenoms([{ denomination: 1, count: val }]);
                      }}
                      placeholder="0.00"
                      className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-right font-bold"
                    />
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${(denomTotal(closeDenoms) - (sessionReport?.expectedCash ?? 0)) < 0 ? 'text-red-600' : (denomTotal(closeDenoms) - (sessionReport?.expectedCash ?? 0)) > 0 ? 'text-emerald-600' : ''}`}>
                    {(() => {
                      const diff = +(denomTotal(closeDenoms) - (sessionReport?.expectedCash ?? 0)).toFixed(2);
                      if (!denomTotal(closeDenoms)) return '—';
                      return diff === 0 ? '0.00' : `${diff > 0 ? '+' : ''}${diff.toFixed(2)}`;
                    })()}
                  </td>
                </tr>
                {Object.entries(sessionReport?.paymentsByMethod ?? {}).filter(([m]) => m !== 'CASH').map(([method, amount]) => (
                  <tr key={method}>
                    <td className="px-4 py-3">{method.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-right">{Number(amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-400">—</td>
                    <td className="px-4 py-3 text-right text-gray-400">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Closing note */}
          <textarea placeholder="Add a closing note..." className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm resize-none" rows={2} />

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-800">
            <button onClick={() => closeMut.mutate()} disabled={closeMut.isPending} className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">
              {closeMut.isPending ? 'Closing...' : 'Close Session'}
            </button>
            <button onClick={() => { setShowClose(false); navigate('/'); }} className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium">Backend</button>
            <button onClick={() => setShowClose(false)} className="px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium">Discard</button>
          </div>
        </div>
      </Modal>
      <PromptDialog />
    </>
  );
}

/** Denomination counting grid — bills and coins with +/- buttons */
function DenomGrid({ rows, onChange }: { rows: DenomRow[]; onChange: (index: number, count: number) => void }) {
  return (
    <div className="grid grid-cols-1 gap-1.5">
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
              className="w-7 h-7 rounded bg-gray-200 dark:bg-gray-700 text-sm font-bold flex items-center justify-center"
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
              className="w-7 h-7 rounded bg-gray-200 dark:bg-gray-700 text-sm font-bold flex items-center justify-center"
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


