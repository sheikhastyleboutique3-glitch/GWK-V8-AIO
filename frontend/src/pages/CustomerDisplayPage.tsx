/**
 * Customer-Facing Display Screen (Second Monitor)
 *
 * Shows the current order being built in real-time:
 * - Business logo + name
 * - Items being added (with live animation)
 * - Running total
 * - After payment: "Thank you!" + optional QR for review
 *
 * Open this on a second monitor/tablet facing the customer.
 * URL: /customer-display?branchId=2
 *
 * Listens to the same WebSocket events as POS — updates instantly.
 */
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { useSocket } from '../lib/useSocket';
import { useAuth } from '../contexts/AuthContext';

interface DisplayItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function CustomerDisplayPage() {
  const [searchParams] = useSearchParams();
  const { activeBranch } = useAuth();
  const branchId = parseInt(searchParams.get('branchId') || '') || activeBranch?.id;
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [total, setTotal] = useState(0);
  const [showThankYou, setShowThankYou] = useState(false);
  const [lastOrderNo, setLastOrderNo] = useState('');

  // Business info for branding
  const { data: settings } = useQuery({
    queryKey: ['settings-display'],
    queryFn: () => api.get('/settings').then((r) => r.data.data),
    staleTime: 10 * 60_000,
  });

  const businessName = settings?.find((s: any) => s.key === 'company_name')?.value || 'Welcome';
  const logoUrl = settings?.find((s: any) => s.key === 'company_logo')?.value;
  const currency = settings?.find((s: any) => s.key === 'default_currency')?.value || 'QAR';

  // Listen for real-time order events
  useSocket({
    onOrderChanged: (payload) => {
      if (payload.action === 'completed') {
        // Show thank you screen
        setLastOrderNo(payload.orderNo);
        setShowThankYou(true);
        setTimeout(() => {
          setShowThankYou(false);
          setItems([]);
          setTotal(0);
        }, 8000); // Show for 8 seconds
      } else if (payload.action === 'created' || payload.action === 'item_added' || payload.action === 'updated' || payload.action === 'item_removed') {
        // Refresh the latest open order
        fetchLatestOrder();
      }
    },
  });

  const fetchLatestOrder = async () => {
    try {
      const params = branchId ? `?branchId=${branchId}&status=OPEN` : '?status=OPEN';
      const res = await api.get(`/sales/orders${params}`);
      const orders = res.data?.data || [];
      // Get the most recently created open order
      const latest = orders.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      if (latest) {
        const orderItems: DisplayItem[] = (latest.items || []).map((it: any) => ({
          name: it.product?.name || `Item #${it.productId}`,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total: it.quantity * it.unitPrice,
        }));
        setItems(orderItems);
        setTotal(latest.total || orderItems.reduce((s, i) => s + i.total, 0));
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch {
      // Ignore fetch errors on display screen
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchLatestOrder();
  }, [branchId]);

  // Thank You screen
  if (showThankYou) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-8">
        <div className="text-6xl mb-6 animate-bounce">🎉</div>
        <h1 className="text-4xl font-bold mb-2">Thank You!</h1>
        <p className="text-xl opacity-90 mb-6">Order {lastOrderNo}</p>
        <p className="text-lg opacity-75">See you again soon!</p>
        {logoUrl && <img src={logoUrl} alt="" className="mt-8 h-16 opacity-50" />}
      </div>
    );
  }

  // Idle screen (no active order)
  if (items.length === 0) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
        {logoUrl && <img src={`${window.location.origin}${logoUrl}`} alt="" className="h-24 mb-6 opacity-90" />}
        <h1 className="text-3xl font-bold mb-2">{businessName}</h1>
        <p className="text-lg text-gray-400">Welcome — your order will appear here</p>
      </div>
    );
  }

  // Active order display
  return (
    <div className="h-[100dvh] flex flex-col bg-white dark:bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          {logoUrl && <img src={`${window.location.origin}${logoUrl}`} alt="" className="h-8" />}
          <span className="font-bold text-lg">{businessName}</span>
        </div>
        <span className="text-sm text-gray-400">Your Order</span>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={`${item.name}-${i}`}
              className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-right duration-300"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  {item.quantity}
                </span>
                <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {item.name}
                </span>
              </div>
              <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                {currency} {item.total.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Total bar */}
      <div className="bg-gray-900 text-white px-6 py-5 flex items-center justify-between flex-shrink-0">
        <span className="text-xl font-medium">Total</span>
        <span className="text-3xl font-bold">
          {currency} {total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
