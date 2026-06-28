/**
 * #6 — Table-Side QR Payment Page
 *
 * Customer scans QR at table → sees their bill → pays on their phone.
 * URL: /pay/:orderId?token=XXXX (token prevents unauthorized access)
 *
 * Flow:
 * 1. Waiter generates a QR code for the table's order
 * 2. Customer scans → sees items + total
 * 3. Customer selects tip → clicks "Pay"
 * 4. Redirects to payment provider (Stripe/PayTabs/tap) or shows "Thank You"
 * 5. Order auto-closes when payment webhook confirms
 */
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

export default function TablePayPage() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [tipPercent, setTipPercent] = useState(0);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  // Fetch order details (public endpoint — validated by token)
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['table-pay', orderId],
    queryFn: () => fetch(`/api/sales/orders/${orderId}/public?token=${token}`).then(r => {
      if (!r.ok) throw new Error('Invalid or expired link');
      return r.json().then(d => d.data);
    }),
    enabled: !!orderId && !!token,
    retry: false,
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (error || !order) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <div className="text-4xl mb-3">🔒</div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">Link Invalid or Expired</h1>
        <p className="text-sm text-gray-500">Please ask your waiter for a new payment link.</p>
      </div>
    </div>
  );

  if (paid) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-700 p-4">
      <div className="text-center text-white">
        <div className="text-6xl mb-4">✓</div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-lg opacity-90">Thank you for dining with us.</p>
        <p className="text-sm opacity-75 mt-2">Order: {order.orderNo}</p>
      </div>
    </div>
  );

  const subtotal = order.total || 0;
  const tipAmount = subtotal * (tipPercent / 100);
  const grandTotal = subtotal + tipAmount;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-4 text-center">
        <h1 className="font-bold text-gray-900">{order.branch?.name || 'Restaurant'}</h1>
        <p className="text-xs text-gray-500">Order {order.orderNo} · {order.tableName || order.channel}</p>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-2">
          {(order.items || []).map((it: any, i: number) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100">
              <div>
                <span className="text-sm font-medium text-gray-800">{it.quantity}x {it.product?.name || 'Item'}</span>
              </div>
              <span className="text-sm font-semibold">{(it.quantity * it.unitPrice).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Tip selector */}
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Add a tip?</p>
          <div className="grid grid-cols-4 gap-2">
            {[0, 5, 10, 15].map(pct => (
              <button
                key={pct}
                onClick={() => setTipPercent(pct)}
                className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                  tipPercent === pct
                    ? 'bg-primary text-white'
                    : 'bg-white border border-gray-200 text-gray-700'
                }`}
              >
                {pct === 0 ? 'No tip' : `${pct}%`}
              </button>
            ))}
          </div>
          {tipAmount > 0 && (
            <p className="text-xs text-gray-500 mt-1 text-center">Tip: {tipAmount.toFixed(2)}</p>
          )}
        </div>
      </div>

      {/* Total + Pay button */}
      <div className="bg-white border-t border-gray-200 px-5 py-4 space-y-3">
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{grandTotal.toFixed(2)} {order.currency || 'QAR'}</span>
        </div>
        <button
          onClick={() => {
            setPaying(true);
            // In production: redirect to payment gateway (Stripe, PayTabs, tap)
            // For now: simulate success after 2s
            setTimeout(() => { setPaid(true); setPaying(false); }, 2000);
          }}
          disabled={paying}
          className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg disabled:opacity-50"
        >
          {paying ? 'Processing...' : `Pay ${grandTotal.toFixed(2)} ${order.currency || 'QAR'}`}
        </button>
        <p className="text-[10px] text-gray-400 text-center">Secure payment powered by GWK</p>
      </div>
    </div>
  );
}
