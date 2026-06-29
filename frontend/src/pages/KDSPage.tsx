import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { connectKds } from '../lib/kdsSocket';
import { stationForItem } from '../lib/thermalPrint';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';

type KdsStatus = 'QUEUED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

// ── Force dark mode on KDS page (kitchen screens need high contrast) ──────
function useKdsDarkMode() {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.add('dark');
    return () => {
      if (!wasDark) root.classList.remove('dark');
    };
  }, []);
}

const NEXT: Record<string, { label: string; status: KdsStatus }> = {
  QUEUED: { label: 'Start', status: 'PREPARING' },
  PREPARING: { label: 'Ready', status: 'READY' },
  READY: { label: 'Served', status: 'SERVED' },
};
const COLUMN_STYLE: Record<string, string> = {
  QUEUED: 'border-gray-300 dark:border-gray-700',
  PREPARING: 'border-amber-400',
  READY: 'border-green-500',
};

export default function KDSPage() {
  const { t } = useTranslation();
  const { activeBranch } = useAuth();
  const qc = useQueryClient();
  const [station, setStation] = useState<string | null>(null); // null = ALL stations
  const { isOnline } = useOnlineStatus();

  // Force dark mode on KDS (kitchen visibility)
  useKdsDarkMode();

  const { data: board, isLoading } = useQuery({
    queryKey: ['kds-board', activeBranch?.id ?? 'all'],
    queryFn: () =>
      api
        .get('/kds/board', { params: activeBranch?.id ? { branchId: activeBranch.id } : {} })
        .then((r) => r.data.data),
    refetchInterval: 20_000,
  });

  // Floor data for table→floor lookup
  const { data: floors } = useQuery({
    queryKey: ['kds-floors', activeBranch?.id],
    queryFn: () => api.get('/floors', { params: { branchId: activeBranch?.id } }).then((r) => r.data.data),
    enabled: !!activeBranch?.id,
  });
  const floorForTable = (tableName: string): string | null => {
    if (!floors || !tableName) return null;
    for (const f of floors) {
      if ((f.tables || []).some((t: any) => t.name === tableName)) return f.name;
    }
    return null;
  };

  // Real-time push: refresh the board instantly on kitchen changes (polling is the fallback).
  useEffect(() => {
    const disconnect = connectKds(activeBranch?.id, () =>
      qc.invalidateQueries({ queryKey: ['kds-board'] }),
    );
    return disconnect;
  }, [activeBranch?.id, qc]);

  // ── KDS Sound Alert: play a bell/chime when new items arrive ──────────
  const prevQueuedCount = useRef<number>(0);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('kds_sound') !== 'false');

  useEffect(() => {
    const queuedItems = board?.QUEUED ?? [];
    const currentCount = queuedItems.length;
    if (currentCount > prevQueuedCount.current && prevQueuedCount.current > 0 && soundEnabled) {
      // Play alert sound for new items arriving
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880; // A5 note — audible bell
        osc.type = 'sine';
        gain.gain.value = 0.3;
        osc.start();
        // Two short beeps
        setTimeout(() => { gain.gain.value = 0; }, 150);
        setTimeout(() => { gain.gain.value = 0.3; }, 250);
        setTimeout(() => { osc.stop(); ctx.close(); }, 400);
      } catch { /* audio not available */ }
    }
    prevQueuedCount.current = currentCount;
  }, [board?.QUEUED?.length, soundEnabled]);

  // ── Prep Time Targets (configurable per station) ──────────────────────
  // Default targets in seconds; can be overridden via Settings
  const PREP_TARGETS: Record<string, number> = {
    'BAR / DRINKS': 120,      // 2 min
    'PASTRY / BAKERY': 480,   // 8 min
    'HOT KITCHEN': 720,       // 12 min
    'DEFAULT': 600,           // 10 min fallback
  };
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getElapsed = (firedAt: string | null) => {
    if (!firedAt) return 0;
    return Math.floor((now - new Date(firedAt).getTime()) / 1000);
  };
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };
  const getTargetForStation = (item: any) => {
    const st = stationForItem(item) || 'DEFAULT';
    return PREP_TARGETS[st] ?? PREP_TARGETS['DEFAULT'];
  };

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: number; status: KdsStatus }) =>
      api.patch(`/kds/items/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kds-board'] }),
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  // Kitchen Recall: cancel a fired item and notify KDS to stop preparing.
  const recall = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      api.post(`/kds/items/${id}/recall`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kds-board'] });
      toast.success('Item recalled — kitchen notified');
      setRecallTarget(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Recall failed'),
  });

  // Recall reason picker state
  const [recallTarget, setRecallTarget] = useState<number | null>(null);
  const RECALL_REASONS = [
    'Customer cancelled',
    'Wrong item prepared',
    'Allergy alert',
    'Quality issue',
    'Kitchen overload',
    'Out of ingredient',
    'Duplicate order',
    'Other',
  ];

  const columns: KdsStatus[] = ['QUEUED', 'PREPARING', 'READY'];

  // ── KDS Bump Bar Keyboard Support ──────────────────────────────────────
  // Physical bump bars simulate keypresses. Common mapping:
  //   Space / Enter = advance first item in QUEUED column
  //   Backspace     = recall first QUEUED/PREPARING item
  //   1-9           = advance item N in the visible board
  //   Escape        = clear recall modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const queuedItems = (board?.QUEUED ?? []).filter((it: any) =>
        !station || stationForItem(it) === station
      );
      const preparingItems = (board?.PREPARING ?? []).filter((it: any) =>
        !station || stationForItem(it) === station
      );

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        // Advance first QUEUED item → PREPARING
        if (queuedItems.length > 0) {
          advance.mutate({ id: queuedItems[0].id, status: 'PREPARING' });
        } else if (preparingItems.length > 0) {
          // If no QUEUED, advance first PREPARING → READY
          advance.mutate({ id: preparingItems[0].id, status: 'READY' });
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        // Recall first PREPARING item (or first QUEUED if no PREPARING)
        const target = preparingItems[0] || queuedItems[0];
        if (target) setRecallTarget(target.id);
      } else if (e.key === 'Escape') {
        setRecallTarget(null);
      } else if (e.key >= '1' && e.key <= '9') {
        // Number keys: advance the Nth item in QUEUED column
        const idx = parseInt(e.key, 10) - 1;
        if (idx < queuedItems.length) {
          advance.mutate({ id: queuedItems[idx].id, status: 'PREPARING' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [board, station, advance, recall]);

  return (
    <div className="h-screen flex flex-col overflow-hidden p-4">
      {/* Top bar with back button */}
      <div className="flex items-center gap-3 mb-3 flex-shrink-0">
        <button onClick={() => window.location.href = '/'} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition text-lg" title="Back to Dashboard">✕</button>
        <h1 className="font-bold text-lg">{t('nav.kds')}</h1>
        {activeBranch?.name && <span className="text-sm text-gray-500">{activeBranch.name}</span>}
      </div>

      {/* ── Offline Warning Banner for Kitchen Staff ── */}
      {!isOnline && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-600 text-white flex items-center gap-3 animate-pulse">
          <span className="text-2xl">📡</span>
          <div>
            <div className="font-bold text-sm">OFFLINE — Data may be stale</div>
            <div className="text-xs opacity-90">Kitchen display is not receiving live updates. Check network connection.</div>
          </div>
        </div>
      )}

      {/* Station tabs + Sound toggle */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 items-center">
        <button onClick={() => setStation(null)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${!station ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'}`}>
          🍽️ All Stations
        </button>
        <button onClick={() => setStation('HOT KITCHEN')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${station === 'HOT KITCHEN' ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'}`}>
          🔥 Hot Kitchen
        </button>
        <button onClick={() => setStation('PASTRY / BAKERY')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${station === 'PASTRY / BAKERY' ? 'bg-pink-600 text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'}`}>
          🧁 Pastry
        </button>
        <button onClick={() => setStation('BAR / DRINKS')} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${station === 'BAR / DRINKS' ? 'bg-amber-600 text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'}`}>
          ☕ Bar / Drinks
        </button>
        {/* Sound toggle */}
        <button
          onClick={() => { const next = !soundEnabled; setSoundEnabled(next); localStorage.setItem('kds_sound', String(next)); }}
          className={`ms-auto px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${soundEnabled ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}
          title={soundEnabled ? 'Sound alerts ON' : 'Sound alerts OFF'}
        >
          {soundEnabled ? '🔔 Sound ON' : '🔕 Sound OFF'}
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-auto">
          {columns.map((col) => {
            const rawItems = board?.[col] ?? [];
            // Filter by station if one is selected
            const items = station
              ? rawItems.filter((it: any) => stationForItem(it) === station)
              : rawItems;
            // Group items by order (one card per order, all items inside)
            const orderMap = new Map<string, { orderNo: string; tableName: string; channel: string; orderId: number; items: any[] }>();
            for (const it of items) {
              const key = it.order?.orderNo || `#${it.orderId}`;
              if (!orderMap.has(key)) {
                orderMap.set(key, {
                  orderNo: it.order?.orderNo || `#${it.orderId}`,
                  tableName: it.order?.tableName || '',
                  channel: it.order?.channel || '',
                  orderId: it.orderId,
                  items: [],
                });
              }
              orderMap.get(key)!.items.push(it);
            }
            const orders = Array.from(orderMap.values());

            return (
              <div key={col} className={`rounded-xl border-t-4 ${COLUMN_STYLE[col]} bg-gray-50 dark:bg-gray-900/50 p-3`}>
                <h3 className="font-semibold text-sm mb-3 flex justify-between">
                  <span>{col}</span>
                  <span className="text-gray-400">{orders.length} order{orders.length !== 1 ? 's' : ''} · {items.length} item{items.length !== 1 ? 's' : ''}</span>
                </h3>
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.orderNo} className="rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3">
                      {/* Order header */}
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                        <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{order.orderNo}</div>
                        <div className="flex items-center gap-1.5 text-xs">
                          {order.channel === 'DELIVERY' && <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-bold">🚗 DELIVERY</span>}
                          {order.channel === 'TAKEAWAY' && <span className="px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold">🥡 TAKEAWAY</span>}
                          {order.channel === 'DINE_IN' && order.tableName && <span className="font-medium text-gray-600 dark:text-gray-400">DINE IN {floorForTable(order.tableName) ? `${floorForTable(order.tableName)} → ` : ''}{order.tableName}</span>}
                          {order.channel === 'DINE_IN' && !order.tableName && <span className="text-gray-400">DINE IN</span>}
                          {order.channel !== 'DINE_IN' && order.channel !== 'DELIVERY' && order.channel !== 'TAKEAWAY' && <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold">{order.channel?.replace('_', ' ')}</span>}
                        </div>
                      </div>
                      {/* Items list */}
                      <div className="space-y-1.5">
                        {order.items.map((it: any) => (
                          <div key={it.id} className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                <span className="font-bold text-gray-600 dark:text-gray-400 me-1">×{it.quantity}</span>
                                {it.product?.name}
                              </div>
                              {Array.isArray(it.modifiers) && it.modifiers.length > 0 && (
                                <div className="text-[11px] text-amber-600 dark:text-amber-400">
                                  → {it.modifiers.map((m: any) => m.name).filter(Boolean).join(', ')}
                                </div>
                              )}
                              {it.notes && <div className="text-[11px] text-gray-500 italic">* {it.notes}</div>}
                              {/* Prep time elapsed */}
                              {it.firedAt && col !== 'READY' && (() => {
                                const elapsed = getElapsed(it.firedAt);
                                const target = getTargetForStation(it);
                                const overdue = elapsed > target;
                                return (
                                  <div className={`text-[10px] font-mono mt-0.5 ${overdue ? 'text-red-600 font-bold animate-pulse' : elapsed > target * 0.75 ? 'text-amber-600' : 'text-gray-400'}`}>
                                    ⏱ {formatTime(elapsed)}{overdue ? ' OVERDUE' : ''}
                                  </div>
                                );
                              })()}
                            </div>
                            {NEXT[col] && (
                              <button
                                onClick={() => advance.mutate({ id: it.id, status: NEXT[col].status })}
                                disabled={advance.isPending}
                                className="px-2 py-1 rounded text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors flex-shrink-0"
                              >
                                {NEXT[col].label}
                              </button>
                            )}
                            {/* Kitchen Recall: cancel a fired item (Odoo parity) */}
                            {(col === 'QUEUED' || col === 'PREPARING') && (
                              <button
                                onClick={() => setRecallTarget(it.id)}
                                disabled={recall.isPending}
                                className="px-2 py-1 rounded text-[10px] font-medium bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-600 hover:text-white transition-colors flex-shrink-0"
                                title="Recall — stop preparing this item"
                              >
                                ↩ Recall
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* Advance all items at once */}
                      {NEXT[col] && order.items.length > 1 && (
                        <button
                          onClick={() => {
                            for (const it of order.items) {
                              advance.mutate({ id: it.id, status: NEXT[col].status });
                            }
                          }}
                          className="mt-2 w-full py-1.5 rounded-lg bg-primary text-white text-xs font-medium"
                        >
                          {NEXT[col].label} All ({order.items.length})
                        </button>
                      )}
                    </div>
                  ))}
                  {!orders.length && <p className="text-xs text-gray-400 text-center py-6">Empty</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Recall Reason Picker Modal ── */}
      {recallTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setRecallTarget(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-1 text-gray-900 dark:text-gray-100">Recall Reason</h3>
            <p className="text-xs text-gray-500 mb-4">Why is this item being recalled?</p>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {RECALL_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => recall.mutate({ id: recallTarget, reason })}
                  disabled={recall.isPending}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition"
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              onClick={() => setRecallTarget(null)}
              className="w-full mt-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
