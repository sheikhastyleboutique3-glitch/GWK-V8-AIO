import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

type PayMethod = 'CASH' | 'CARD' | 'GIFT_CARD' | 'STORE_CREDIT' | 'LOYALTY' | 'AGGREGATOR' | 'LOYALTY_CARD' | 'TERMINAL' | 'QR' | 'ON_ACCOUNT';

interface Tender {
  method: PayMethod;
  amount: number;
  giftCardCode?: string;
  loyaltyCode?: string;
  terminalId?: number;
}

interface BusinessInfo {
  businessName?: string;
  branchName?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
  currency?: string;
}

interface PaymentScreenProps {
  total: number;
  subtotal: number;
  cartSubtotal: number;
  tenders: Tender[];
  setTenders: React.Dispatch<React.SetStateAction<Tender[]>>;
  tipAmount: number;
  setTipAmount: (v: number) => void;
  activeCustomer: any;
  loadedOrderId: number | null;
  loadedOrder: any;
  mode: 'new' | 'existing';
  businessInfo: BusinessInfo;
  lines: any[];
  comboCart: any[];
  onClose: () => void;
  onCharge: () => void;
  isCharging: boolean;
  lastReceipt: any;
  refetchLoaded?: () => void;
}

const PaymentScreen = React.memo(function PaymentScreen({
  total,
  subtotal,
  cartSubtotal,
  tenders,
  setTenders,
  tipAmount,
  setTipAmount,
  activeCustomer,
  loadedOrderId,
  loadedOrder,
  mode,
  businessInfo,
  lines,
  comboCart,
  onClose,
  onCharge,
  isCharging,
  lastReceipt,
  refetchLoaded,
}: PaymentScreenProps) {
  const { t } = useTranslation();
  const [payNumpad, setPayNumpad] = useState('');

  const paid = tenders.reduce((s, t) => s + t.amount, 0);
  const remaining = Math.max(0, +(total - paid).toFixed(2));
  const change = Math.max(0, +(paid - total).toFixed(2));

  const addPaymentMethod = useCallback((method: string) => {
    const amt = payNumpad ? parseFloat(payNumpad) : remaining;
    if (remaining <= 0) { toast.error('Already paid'); return; }
    if (amt > 0) {
      setTenders((prev) => [...prev, { method: method as PayMethod, amount: +amt.toFixed(2) }]);
      setPayNumpad('');
    }
  }, [payNumpad, remaining, setTenders]);

  const handleNumpadKey = useCallback((key: string) => {
    // Haptic feedback for tablet/phone users
    try { navigator.vibrate?.(15); } catch {}
    if (key === '⌫') setPayNumpad((p) => p.slice(0, -1));
    else if (key === '+/-') setPayNumpad((p) => p.startsWith('-') ? p.slice(1) : '-' + p);
    else if (key.startsWith('+')) {
      const add = parseInt(key.slice(1), 10);
      setPayNumpad((p) => String((parseFloat(p) || 0) + add));
    }
    else setPayNumpad((p) => p + key);
  }, []);

  const handleValidate = useCallback(() => {
    onCharge();
    onClose();
  }, [onCharge, onClose]);

  const handleClearPayments = useCallback(() => {
    setTenders([]);
    setPayNumpad('');
  }, [setTenders]);

  const handleInvoice = useCallback(() => {
    if (!lastReceipt) return;
    import('../../lib/pdf').then(({ downloadInvoicePdf }) => {
      downloadInvoicePdf({
        order: lastReceipt,
        businessName: businessInfo.businessName,
        branchName: businessInfo.branchName,
        address: businessInfo.address,
        phone: businessInfo.phone,
        taxId: businessInfo.taxId,
        email: businessInfo.email,
        currency: businessInfo.currency || 'QAR',
      });
      toast.success('Invoice generated');
    });
  }, [lastReceipt, businessInfo]);

  const handleTip = useCallback((pct: number) => {
    const baseForTip = mode === 'existing' ? (loadedOrder?.subtotal ?? 0) : cartSubtotal;
    const tipVal = +(baseForTip * pct / 100).toFixed(2);
    const isActive = Math.abs(tipAmount - tipVal) < 0.01;
    const newTip = isActive ? 0 : tipVal;
    setTipAmount(newTip);
    if (mode === 'existing' && loadedOrderId) {
      import('../../lib/api').then(({ default: api }) => {
        api.patch(`/sales/orders/${loadedOrderId}/tip`, { amount: newTip }).then(() => refetchLoaded?.());
      });
    }
  }, [mode, loadedOrder, cartSubtotal, tipAmount, setTipAmount, loadedOrderId, refetchLoaded]);

  const handleNoTip = useCallback(() => {
    setTipAmount(0);
    if (mode === 'existing' && loadedOrderId) {
      import('../../lib/api').then(({ default: api }) => {
        api.patch(`/sales/orders/${loadedOrderId}/tip`, { amount: 0 }).then(() => refetchLoaded?.());
      });
    }
  }, [setTipAmount, mode, loadedOrderId, refetchLoaded]);

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 flex flex-col">
      {/* Payment header */}
      <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
        <button onClick={onClose} className="text-sm hover:text-gray-300">« Back</button>
        <h2 className="text-lg font-bold">Payment</h2>
        <span className="text-sm text-gray-400">{loadedOrderId ? `Order #${loadedOrder?.orderNo?.slice(-6) || ''}` : 'New Order'}</span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto">
        {/* LEFT: Payment methods + Summary */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="p-4 flex-1">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-3">Payment Method</div>
            <div className="space-y-2">
              {['CASH', 'CARD', 'QR', 'GIFT_CARD', 'ON_ACCOUNT'].map((m) => (
                <button key={m} onClick={() => addPaymentMethod(m)} className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition">
                  {m === 'CASH' ? '💵 Cash' : m === 'CARD' ? '💳 Card' : m === 'QR' ? '📱 QR Pay' : m === 'GIFT_CARD' ? '🎁 Gift Card' : m === 'ON_ACCOUNT' ? '📋 Customer Account' : m}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Summary</div>
            <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
              {tenders.map((ten, i) => (
                <div key={i} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-800 rounded px-2 py-1">
                  <span>{ten.method.replace('_', ' ')}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{ten.amount.toFixed(2)}</span>
                    <button onClick={() => setTenders((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-500 text-xs">✕</button>
                  </span>
                </div>
              ))}
              {!tenders.length && <p className="text-xs text-gray-400">Click a payment method to add</p>}
            </div>
            <button
              onClick={handleValidate}
              disabled={remaining > 0 || isCharging || (!lines.length && !comboCart.length)}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
            >
              {isCharging ? (
                <><span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</>
              ) : (
                <><span className="text-2xl">▶</span> Validate</>
              )}
            </button>
          </div>
        </div>

        {/* CENTER: Remaining + Numpad */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
          <div className="grid grid-cols-3 gap-8 text-center mb-8">
            <div>
              <div className="text-sm text-gray-400">Remaining</div>
              <div className={`text-3xl font-bold ${remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{remaining.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Total Due</div>
              <div className="text-xl font-semibold text-gray-800 dark:text-gray-200">{total.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Change</div>
              <div className={`text-3xl font-bold ${change > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>{change.toFixed(2)}</div>
            </div>
          </div>

          {/* Amount input */}
          <div className="text-4xl font-mono font-bold mb-6 min-h-[3rem] text-center text-gray-800 dark:text-gray-100">
            {payNumpad || remaining.toFixed(2)}
          </div>

          {/* ── Tip Quick Buttons (Odoo parity: 10%/15%/20%) ──────── */}
          <div className="w-full max-w-xs md:max-w-sm mb-4">
            <div className="text-xs font-semibold text-gray-400 uppercase text-center mb-2">
              Add Tip {businessInfo.currency && businessInfo.currency !== 'QAR' ? `(${businessInfo.currency})` : ''}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[10, 15, 20].map((pct) => {
                const baseForTip = mode === 'existing' ? (loadedOrder?.subtotal ?? 0) : cartSubtotal;
                const tipVal = +(baseForTip * pct / 100).toFixed(2);
                const isActive = Math.abs(tipAmount - tipVal) < 0.01;
                return (
                  <button
                    key={pct}
                    onClick={() => handleTip(pct)}
                    className={`py-2 rounded-lg text-sm font-bold transition ${isActive ? 'bg-amber-500 text-white ring-2 ring-amber-300' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'}`}
                  >
                    <div>{pct}%</div>
                    <div className="text-[10px] font-normal opacity-75">{tipVal.toFixed(0)} {businessInfo.currency || 'QAR'}</div>
                  </button>
                );
              })}
              <button
                onClick={handleNoTip}
                className={`py-2 rounded-lg text-sm font-bold transition ${tipAmount === 0 ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'}`}
              >
                No Tip
              </button>
            </div>
            {tipAmount > 0 && (
              <div className="text-center mt-1 text-xs text-amber-600 font-medium">
                Tip: +{tipAmount.toFixed(2)}
              </div>
            )}
          </div>

          {/* Numpad — tablet-optimized with larger touch targets + haptic */}
          <div className="grid grid-cols-4 gap-3 w-full max-w-sm">
            {['1', '2', '3', '+10', '4', '5', '6', '+20', '7', '8', '9', '+50', '+/-', '0', '.', '⌫'].map((key) => (
              <button key={key} onClick={() => handleNumpadKey(key)}
                className={`min-h-[56px] py-4 rounded-xl text-xl font-bold transition-all active:scale-95 select-none touch-manipulation ${key.startsWith('+') ? 'bg-primary/10 text-primary border-2 border-primary/20 hover:bg-primary/20' : key === '⌫' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 border-2 border-red-200 dark:border-red-800' : key === '+/-' ? 'bg-gray-50 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'}`}>
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: Customer + actions */}
        <div className="w-full md:w-48 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-800 p-4 flex md:flex-col gap-2">
          {activeCustomer && (
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Customer</div>
              <div className="font-medium text-sm text-primary">👤 {activeCustomer.name}</div>
            </div>
          )}
          <button onClick={handleInvoice}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 mb-2">
            🧾 Invoice
          </button>
          <button onClick={handleClearPayments}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-red-600">
            Clear Payments
          </button>
        </div>
      </div>
    </div>
  );
});

export default PaymentScreen;
