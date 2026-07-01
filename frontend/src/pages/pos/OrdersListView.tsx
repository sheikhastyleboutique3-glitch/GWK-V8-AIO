import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { usePrompt } from '../../lib/usePrompt';

interface OrdersListViewProps {
  branchId: number | undefined;
  loadedOrderId: number | null;
  onLoadBill: (order: any) => void;
  onNewOrder: () => void;
  onSwitchToOrder: () => void;
}

const OrdersListView = React.memo(function OrdersListView({
  branchId,
  loadedOrderId,
  onLoadBill,
  onNewOrder,
  onSwitchToOrder,
}: OrdersListViewProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [prompt, PromptDialog] = usePrompt();

  const [orderSearchQ, setOrderSearchQ] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  const { data: allOrders } = useQuery({
    queryKey: ['pos-all-orders', branchId, orderStatusFilter],
    queryFn: () => api.get('/sales/orders', { params: { branchId, ...(orderStatusFilter !== 'all' ? { status: orderStatusFilter } : {}) } }).then((r) => r.data.data),
    enabled: !!branchId,
    refetchInterval: 60_000,
  });

  const filteredOrders = useMemo(() => {
    if (!allOrders) return [];
    if (!orderSearchQ.trim()) return allOrders;
    const q = orderSearchQ.toLowerCase();
    return allOrders.filter((o: any) =>
      o.orderNo?.toLowerCase().includes(q) ||
      o.customer?.name?.toLowerCase().includes(q) ||
      o.tableName?.toLowerCase().includes(q)
    );
  }, [allOrders, orderSearchQ]);

  const cancelOrderWithNote = useCallback(async (orderId: number, orderNo: string) => {
    const reason = await prompt({ title: `Cancel order ${orderNo}?`, description: 'Enter cancellation reason:', placeholder: 'Reason...' });
    if (reason === null) return;
    try {
      await api.patch(`/sales/orders/${orderId}/void`);
      if (reason.trim()) {
        await api.patch(`/sales/orders/${orderId}`, { notes: `❌ CANCELLED: ${reason.trim()}` }).catch(() => {});
      }
      toast.success(`Order ${orderNo} cancelled`);
      qc.invalidateQueries({ queryKey: ['pos-all-orders'] });
      qc.invalidateQueries({ queryKey: ['pos-pending'] });
      qc.invalidateQueries({ queryKey: ['kds-board'] });
      qc.invalidateQueries({ queryKey: ['waiter-active-orders'] });
      if (loadedOrderId === orderId) {
        onNewOrder();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to cancel');
    }
  }, [prompt, qc, loadedOrderId, onNewOrder]);

  const handleOrderClick = useCallback((order: any) => {
    onLoadBill(order);
    onSwitchToOrder();
  }, [onLoadBill, onSwitchToOrder]);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={onNewOrder} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">+ New Order</button>
        <input value={orderSearchQ} onChange={(e) => setOrderSearchQ(e.target.value)} placeholder="Search orders..."
          className="flex-1 min-w-[180px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
        <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm">
          <option value="all">All</option>
          <option value="OPEN">Open</option>
          <option value="HELD">Held</option>
          <option value="COMPLETED">Paid</option>
          <option value="VOIDED">Voided</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Receipt #</th>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Table / Ref</th>
              <th className="text-left px-3 py-2">Customer</th>
              <th className="text-right px-3 py-2">Total</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-center px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {(filteredOrders || []).map((o: any) => (
              <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                onClick={() => handleOrderClick(o)}>
                <td className="px-3 py-2 text-xs">{new Date(o.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 font-mono text-xs">{o.orderNo}</td>
                <td className="px-3 py-2">
                  {o.channel === 'DELIVERY' && <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[10px] font-bold">🚗 DELIVERY</span>}
                  {o.channel === 'TAKEAWAY' && <span className="px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-[10px] font-bold">🥡 TAKEAWAY</span>}
                  {o.channel === 'DINE_IN' && <span className="text-[10px] text-gray-500">🍽️ DINE IN</span>}
                  {o.channel && !['DINE_IN', 'DELIVERY', 'TAKEAWAY'].includes(o.channel) && <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold">{o.channel}</span>}
                  {o.shipLater && <span className="ms-1 px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold">📦 SHIP LATER</span>}
                </td>
                <td className="px-3 py-2 text-xs">{o.tableName || '—'}</td>
                <td className="px-3 py-2">{o.customer?.name || '—'}</td>
                <td className="px-3 py-2 text-right font-semibold">{Number(o.total).toFixed(2)}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    o.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                    o.status === 'OPEN' || o.status === 'HELD' ? 'bg-amber-100 text-amber-700' :
                    o.status === 'VOIDED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{o.status === 'COMPLETED' ? 'Paid' : o.status}</span>
                </td>
                <td className="px-3 py-2 text-center">
                  {(o.status === 'OPEN' || o.status === 'HELD') && (
                    <button onClick={(e) => { e.stopPropagation(); cancelOrderWithNote(o.id, o.orderNo); }}
                      className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 text-xs font-bold flex items-center justify-center"
                      title="Cancel order">✕</button>
                  )}
                </td>
              </tr>
            ))}
            {!filteredOrders?.length && <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">No orders found.</td></tr>}
          </tbody>
        </table>
      </div>
      <PromptDialog />
    </div>
  );
});

export default OrdersListView;
