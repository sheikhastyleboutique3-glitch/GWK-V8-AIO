import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useRealtimeProducts } from '../lib/useRealtimeProducts';

interface CartLine {
  productId: number;
  name: string;
  price: number;
  qty: number;
}

/**
 * Public branch-based digital menu with self-ordering.
 * Reached via /order/:branchId (or /order/:branchId?table=5).
 * No authentication required. Customers can browse the menu and place orders.
 */
export default function PublicMenuPage() {
  const { t } = useTranslation();
  const { branchId } = useParams();
  const [searchParams] = useSearchParams();
  const tableFromQR = searchParams.get('table') || '';

  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [tableName, setTableName] = useState(tableFromQR);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [placed, setPlaced] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  // Live sync via WebSocket
  useRealtimeProducts({ joinPublic: true });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['branch-menu', branchId],
    queryFn: () => api.get(`/self-order/branch/${branchId}/menu`).then((r) => r.data.data),
    refetchInterval: 120_000, // Slow fallback only — WebSocket is primary
  });

  const products = useMemo(() => {
    const all = data?.products || [];
    return categoryId ? all.filter((p: any) => p.categoryId === categoryId) : all;
  }, [data, categoryId]);

  const total = useMemo(() => cart.reduce((s, l) => s + l.price * l.qty, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart]);

  const add = (p: any) => {
    const price = Number(p.salePrice || p.costPrice || 0);
    setCart((prev) => {
      const f = prev.find((l) => l.productId === p.id);
      if (f) return prev.map((l) => (l === f ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { productId: p.id, name: p.name, price, qty: 1 }];
    });
    toast.success(`Added ${p.name}`, { duration: 1500, icon: '+' });
  };

  const setQty = (i: number, q: number) =>
    setCart((prev) => prev.flatMap((l, idx) => (idx === i ? (q <= 0 ? [] : [{ ...l, qty: q }]) : [l])));

  const place = useMutation({
    mutationFn: () =>
      api.post(`/self-order/branch/${branchId}/order`, {
        tableName: tableName || undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        notes: notes || undefined,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.qty, unitPrice: l.price })),
      }),
    onSuccess: (r: any) => {
      setPlaced(r.data?.data?.orderNo || r.data?.orderNo || 'OK');
      setCart([]);
      setShowCheckout(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to place order'),
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  if (isError || !data)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Menu not available
      </div>
    );

  // ---- Order Placed Confirmation ----
  if (placed) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-center p-6 bg-gray-50">
        <div className="text-6xl">✅</div>
        <div className="text-2xl font-bold">Thank you!</div>
        <div className="text-gray-500">
          Your order <span className="font-mono font-bold">{placed}</span> has been placed.
        </div>
        <p className="text-sm text-gray-400">Your order will be prepared shortly.</p>
        <button
          onClick={() => setPlaced(null)}
          className="mt-4 px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold"
        >
          Order again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-5 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-gray-900">{data.branch?.name || 'Menu'}</h1>
        {tableFromQR && <p className="text-xs text-gray-500">Table {tableFromQR}</p>}
      </header>

      {/* Category tabs */}
      <div className="sticky top-[65px] z-10 bg-white border-b border-gray-100 px-4 py-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setCategoryId(undefined)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
              !categoryId ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {(data.categories || []).map((c: any) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                categoryId === c.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {c.icon ? `${c.icon} ` : ''}{c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="flex-1 p-4 pb-28">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {products.map((p: any) => (
            <button
              key={p.id}
              onClick={() => add(p)}
              className="rounded-xl bg-white border border-gray-200 overflow-hidden text-start hover:shadow-md hover:border-blue-300 transition active:scale-95"
            >
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" className="w-full h-28 object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-28 bg-gray-100 flex items-center justify-center text-3xl">
                  🍽️
                </div>
              )}
              <div className="p-2.5">
                <div className="text-sm font-medium line-clamp-2 text-gray-900">{p.name}</div>
                {p.nameAr && p.nameAr !== p.name && (
                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-1" dir="rtl">{p.nameAr}</div>
                )}
                <div className="text-sm font-bold text-blue-600 mt-1">
                  {Number(p.salePrice || p.costPrice || 0).toFixed(2)} QAR
                </div>
              </div>
            </button>
          ))}
          {!products.length && (
            <p className="text-sm text-gray-400 col-span-full text-center py-8">No items available</p>
          )}
        </div>
      </div>

      {/* Floating cart bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 py-3 z-20 shadow-lg">
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full max-w-lg mx-auto flex items-center justify-between bg-blue-600 text-white rounded-xl px-5 py-3.5 font-semibold"
          >
            <span className="flex items-center gap-2">
              <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm">{itemCount}</span>
              View Order
            </span>
            <span>{total.toFixed(2)} QAR</span>
          </button>
        </div>
      )}

      {/* Checkout Sheet */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Your Order</h2>
              <button onClick={() => setShowCheckout(false)} className="text-gray-400 text-xl">&times;</button>
            </div>

            {/* Cart items */}
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {cart.map((l, i) => (
                <div key={l.productId} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 line-clamp-1 font-medium">{l.name}</span>
                  <button
                    onClick={() => setQty(i, l.qty - 1)}
                    className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-medium">{l.qty}</span>
                  <button
                    onClick={() => setQty(i, l.qty + 1)}
                    className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold flex items-center justify-center"
                  >
                    +
                  </button>
                  <span className="w-16 text-end font-medium">{(l.price * l.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between font-bold border-t border-gray-100 pt-3 mb-4">
              <span>Total</span>
              <span>{total.toFixed(2)} QAR</span>
            </div>

            {/* Customer info */}
            <div className="space-y-2 mb-4">
              <input
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="Table number (optional)"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
              />
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone number (optional)"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions..."
                rows={2}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm resize-none"
              />
            </div>

            <button
              disabled={!cart.length || place.isPending}
              onClick={() => place.mutate()}
              className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50"
            >
              {place.isPending ? 'Placing order...' : `Place Order — ${total.toFixed(2)} QAR`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
