import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * Public self-order kiosk (no auth). Reached via QR / kiosk at /kiosk/:configId.
 * Guests browse the branch menu, build a cart, and place a self-order.
 */
export default function KioskPage() {
  const { t } = useTranslation();
  const { configId } = useParams();
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [cart, setCart] = useState<{ productId: number; name: string; price: number; qty: number }[]>([]);
  const [tableName, setTableName] = useState('');
  const [placed, setPlaced] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['kiosk-menu', configId],
    queryFn: () => api.get(`/self-order/${configId}/menu`).then((r) => r.data.data),
  });

  const products = useMemo(() => {
    const all = data?.products || [];
    return categoryId ? all.filter((p: any) => p.categoryId === categoryId) : all;
  }, [data, categoryId]);

  const total = useMemo(() => cart.reduce((s, l) => s + l.price * l.qty, 0), [cart]);

  const add = (p: any) => {
    const price = p.salePrice || p.costPrice || 0;
    setCart((prev) => {
      const f = prev.find((l) => l.productId === p.id);
      if (f) return prev.map((l) => (l === f ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { productId: p.id, name: p.name, price, qty: 1 }];
    });
  };
  const setQty = (i: number, q: number) => setCart((prev) => prev.flatMap((l, idx) => (idx === i ? (q <= 0 ? [] : [{ ...l, qty: q }]) : [l])));

  const place = useMutation({
    mutationFn: () =>
      api.post(`/self-order/${configId}/order`, {
        tableName: tableName || undefined,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.qty, unitPrice: l.price })),
      }),
    onSuccess: (r: any) => {
      setPlaced(r.data?.data?.orderNo || r.data?.orderNo || 'OK');
      setCart([]);
      setTableName('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to place order'),
  });

  if (isLoading) return <div className="flex items-center justify-center h-screen"><LoadingSpinner /></div>;
  if (isError || !data) return <div className="flex items-center justify-center h-screen text-gray-500">{t('kiosk.notFound')}</div>;

  if (placed) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 text-center p-6">
        <div className="text-6xl">✅</div>
        <div className="text-2xl font-bold">{t('kiosk.thankYou')}</div>
        <div className="text-gray-500">{t('kiosk.orderPlaced')}: <span className="font-mono">{placed}</span></div>
        <button onClick={() => setPlaced(null)} className="mt-4 px-6 py-3 rounded-xl bg-primary text-white font-semibold">{t('kiosk.newOrder')}</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-5 py-4">
        <h1 className="text-lg font-bold">{data.config?.name} — {t('kiosk.title')}</h1>
      </header>

      <div className="flex-1 grid md:grid-cols-3 gap-4 p-4 max-w-6xl w-full mx-auto">
        {/* Menu */}
        <div className="md:col-span-2">
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => setCategoryId(undefined)} className={`px-3 py-1.5 rounded-lg text-sm ${!categoryId ? 'bg-primary text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800'}`}>{t('kiosk.all')}</button>
            {(data.categories || []).map((c: any) => (
              <button key={c.id} onClick={() => setCategoryId(c.id)} className={`px-3 py-1.5 rounded-lg text-sm ${categoryId === c.id ? 'bg-primary text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800'}`}>
                {c.icon ? `${c.icon} ` : ''}{c.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((p: any) => (
              <button key={p.id} onClick={() => add(p)} className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden text-start hover:ring-2 hover:ring-primary">
                {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-24 object-cover" /> : <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl">🍽️</div>}
                <div className="p-2">
                  <div className="text-sm font-medium line-clamp-2">{p.name}</div>
                  <div className="text-sm font-bold text-primary mt-1">{Number(p.salePrice || p.costPrice || 0).toFixed(2)}</div>
                </div>
              </button>
            ))}
            {!products.length && <p className="text-sm text-gray-400 col-span-full">{t('kiosk.noItems')}</p>}
          </div>
        </div>

        {/* Cart */}
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 h-fit sticky top-4">
          <div className="font-semibold mb-3">🛒 {t('kiosk.yourOrder')}</div>
          {data.config?.requireTable && (
            <input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder={t('kiosk.tableNo')} className="w-full mb-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
          )}
          <div className="space-y-2 mb-3 max-h-72 overflow-y-auto">
            {cart.map((l, i) => (
              <div key={l.productId} className="flex items-center gap-2 text-sm">
                <span className="flex-1 line-clamp-1">{l.name}</span>
                <button onClick={() => setQty(i, l.qty - 1)} className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800">−</button>
                <span className="w-5 text-center">{l.qty}</span>
                <button onClick={() => setQty(i, l.qty + 1)} className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800">+</button>
                <span className="w-14 text-end">{(l.price * l.qty).toFixed(2)}</span>
              </div>
            ))}
            {!cart.length && <p className="text-sm text-gray-400">{t('kiosk.empty')}</p>}
          </div>
          <div className="flex justify-between font-bold border-t border-gray-100 dark:border-gray-800 pt-2 mb-3">
            <span>{t('common.total')}</span><span>{total.toFixed(2)}</span>
          </div>
          <button
            disabled={!cart.length || place.isPending || (data.config?.requireTable && !tableName)}
            onClick={() => place.mutate()}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-50"
          >
            {t('kiosk.placeOrder')}
          </button>
        </div>
      </div>
    </div>
  );
}
