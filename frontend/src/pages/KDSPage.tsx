import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../lib/useSocket';
import { stationForItem } from '../lib/thermalPrint';
import { playKitchenBell } from '../lib/useOrderSound';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';

type KdsStatus = 'QUEUED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';

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

  // Time threshold for alerts (10 minutes default)
  const ALERT_THRESHOLD_MS = 10 * 60 * 1000;
  // Force re-render every 30s to update elapsed times
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Elapsed time helper
  const elapsedStr = (firedAt: string | null | undefined): string => {
    if (!firedAt) return '';
    const ms = Date.now() - new Date(firedAt).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return '<1m';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h${mins % 60}m`;
  };
  const isOverdue = (firedAt: string | null | undefined): boolean => {
    if (!firedAt) return false;
    return Date.now() - new Date(firedAt).getTime() > ALERT_THRESHOLD_MS;
  };

  // ─── Real-time sync: instant ticket arrival from POS/Waiter fires ───
  useSocket({
    onKdsUpdate: () => playKitchenBell(),
    onOrderChanged: (p) => { if (p.action === 'fired') playKitchenBell(); },
  });

  const { data: board, isLoading } = useQuery({
    queryKey: ['kds-board', activeBranch?.id ?? 'all'],
    queryFn: () =>
      api
        .get('/kds/board', { params: activeBranch?.id ? { branchId: activeBranch.id } : {} })
        .then((r) => r.data.data),
    refetchInterval: 60_000, // Fallback — WebSocket gives instant updates
  });

  // Floor data for table→floor lookup
  const { data: floors } = useQuery({
    queryKey: ['kds-floors', activeBranch?.id],
    queryFn: () => api.get('/floors', { params: { branchId: activeBranch?.id } }).then((r) => r.data.data),
    enabled: !!activeBranch?.id,
    staleTime: 120_000,
  });
  const floorForTable = (tableName: string): string | null => {
    if (!floors || !tableName) return null;
    for (const f of floors) {
      if ((f.tables || []).some((t: any) => t.name === tableName)) return f.name;
    }
    return null;
  };

  const advance = useMutation({
    mutationFn: ({ id, status }: { id: number; status: KdsStatus }) =>
      api.patch(`/kds/items/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kds-board'] }),
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const columns: KdsStatus[] = ['QUEUED', 'PREPARING', 'READY'];

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 p-3 md:p-4">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => window.location.href = '/'} className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-sm font-medium transition-colors">← Back</button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('nav.kds')}</h1>
          <span className="text-sm text-gray-500">{activeBranch?.name}</span>
        </div>
      </div>

      {/* Station tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 flex-shrink-0">
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
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0 overflow-hidden">
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
              <div key={col} className={`rounded-xl border-t-4 ${COLUMN_STYLE[col]} bg-gray-50 dark:bg-gray-900/50 p-3 flex flex-col min-h-0 overflow-hidden`}>
                <h3 className="font-semibold text-sm mb-3 flex justify-between flex-shrink-0">
                  <span>{col}</span>
                  <span className="text-gray-400">{orders.length} order{orders.length !== 1 ? 's' : ''} · {items.length} item{items.length !== 1 ? 's' : ''}</span>
                </h3>
                <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
                  {orders.map((order) => {
                    // Earliest firedAt determines when order hit the kitchen
                    const earliestFired = order.items.reduce((min: string | null, it: any) => {
                      if (!it.firedAt) return min;
                      if (!min) return it.firedAt;
                      return it.firedAt < min ? it.firedAt : min;
                    }, null as string | null);
                    const overdue = isOverdue(earliestFired);
                    return (
                    <div key={order.orderNo} className={`rounded-lg bg-white dark:bg-gray-900 border ${overdue ? 'border-red-500 ring-2 ring-red-500/30 animate-pulse' : 'border-gray-200 dark:border-gray-800'} p-3`}>
                      {/* Order header */}
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{order.orderNo}</div>
                          {earliestFired && (
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${overdue ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 font-bold' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                              {overdue ? '⚠️ ' : '⏱ '}{elapsedStr(earliestFired)}
                            </span>
                          )}
                        </div>
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
                  ); })}
                  {!orders.length && <p className="text-xs text-gray-400 text-center py-6">Empty</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
