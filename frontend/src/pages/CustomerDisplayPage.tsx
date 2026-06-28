import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { io, Socket } from 'socket.io-client';

/**
 * Customer-Facing Display (2nd screen / tablet).
 *
 * Accessed at /display/:branchId — shows real-time order items and running total
 * as the cashier scans them on the POS. Connects via WebSocket to receive live
 * order updates. Designed for a customer-facing tablet mounted at the counter.
 *
 * Features:
 * - Large, clean UI optimized for customer viewing distance
 * - Real-time item list updates via WebSocket (ORDER_CHANGED events)
 * - Shows running total, item count, and last added item with animation
 * - Idle state shows business logo/welcome message
 * - Dark background for screen visibility in bright environments
 */
export default function CustomerDisplayPage() {
  const { branchId } = useParams();
  const [orderId, setOrderId] = useState<number | null>(null);
  const [lastItemName, setLastItemName] = useState('');
  const [flash, setFlash] = useState(false);

  // Fetch business branding
  const { data: settings } = useQuery({
    queryKey: ['settings-branding-display'],
    queryFn: () => api.get('/settings', { params: { group: 'branding' } }).then(r => r.data.data),
  });
  const businessName = settings?.find((s: any) => s.key === 'company_name')?.value || 'Welcome';
  const logoUrl = settings?.find((s: any) => s.key === 'company_logo')?.value;

  // Fetch current active order for this branch (most recently updated OPEN order)
  const { data: order, refetch } = useQuery({
    queryKey: ['customer-display-order', branchId, orderId],
    queryFn: async () => {
      if (orderId) {
        return api.get(`/sales/orders/${orderId}`).then(r => r.data.data);
      }
      // Find the most recent OPEN order for this branch
      const res = await api.get('/sales/orders', {
        params: { branchId, status: 'OPEN', take: 1 },
      });
      const orders = res.data.data || [];
      if (orders.length > 0) {
        setOrderId(orders[0].id);
        return orders[0];
      }
      return null;
    },
    refetchInterval: 10_000, // Slow fallback
  });

  // WebSocket: listen for order changes to refetch instantly
  useEffect(() => {
    if (!branchId) return;
    let socket: Socket | null = null;
    try {
      socket = io('/realtime', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
      socket.on('connect', () => {
        socket?.emit('join_branch', { branchId: parseInt(branchId, 10) });
      });
      socket.on('order_changed', (payload: any) => {
        if (payload.action === 'item_added') {
          setOrderId(payload.orderId);
          setFlash(true);
          setTimeout(() => setFlash(false), 800);
        }
        if (payload.action === 'completed') {
          // Order completed — show thank you, then reset
          setTimeout(() => {
            setOrderId(null);
          }, 5000);
        }
        refetch();
      });
    } catch {}
    return () => {
      socket?.disconnect();
    };
  }, [branchId, refetch]);

  // Track last item for animation
  useEffect(() => {
    if (order?.items?.length) {
      const last = order.items[order.items.length - 1];
      setLastItemName(last?.product?.name || 'Item');
    }
  }, [order?.items?.length]);

  const items = order?.items?.filter((i: any) => !i.isVoided) || [];
  const total = order?.total ?? 0;
  const itemCount = items.reduce((s: number, i: any) => s + i.quantity, 0);

  // ── Idle State (no active order) ──
  if (!order || order.status === 'COMPLETED') {
    return (
      <div className="h-screen bg-gray-950 flex flex-col items-center justify-center text-white p-8">
        {logoUrl && (
          <img src={`${window.location.origin}${logoUrl}`} alt="" className="w-32 h-32 object-contain mb-6 rounded-2xl" />
        )}
        <h1 className="text-4xl font-bold mb-2">{businessName}</h1>
        <p className="text-xl text-gray-400">Welcome! Your items will appear here.</p>
        <p className="text-gray-600 text-sm mt-8">Customer Display — Branch #{branchId}</p>
      </div>
    );
  }

  // ── Active Order Display ──
  return (
    <div className="h-screen bg-gray-950 flex flex-col text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          {logoUrl && <img src={`${window.location.origin}${logoUrl}`} alt="" className="w-10 h-10 object-contain rounded-lg" />}
          <span className="text-lg font-semibold text-gray-300">{businessName}</span>
        </div>
        <div className="text-sm text-gray-500">
          Order #{order.orderNo?.slice(-6)}
          {order.tableName && <span className="ml-3">Table: {order.tableName}</span>}
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        <div className="space-y-2">
          {items.map((item: any, i: number) => {
            const isLast = i === items.length - 1;
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-500 ${
                  isLast && flash
                    ? 'bg-blue-600/30 scale-[1.02]'
                    : 'bg-gray-900/60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 text-sm w-6">{item.quantity}×</span>
                  <div>
                    <span className="text-lg font-medium">{item.product?.name || 'Item'}</span>
                    {item.modifiers && Array.isArray(item.modifiers) && item.modifiers.length > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.modifiers.map((m: any) => m.name).filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-lg font-semibold">
                  {(item.quantity * item.unitPrice - (item.discount || 0)).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
        {!items.length && (
          <div className="flex items-center justify-center h-full text-gray-600 text-xl">
            Waiting for items...
          </div>
        )}
      </div>

      {/* Footer — Running Total */}
      <div className="border-t border-gray-800 px-8 py-6 bg-gray-900/80">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-400 text-sm">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
            {order.discountTotal > 0 && (
              <span className="text-emerald-400 text-sm ml-4">
                Saved: {order.discountTotal.toFixed(2)}
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm uppercase tracking-wider">Total</p>
            <p className="text-5xl font-bold tracking-tight">
              {total.toFixed(2)} <span className="text-2xl text-gray-500">QAR</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
