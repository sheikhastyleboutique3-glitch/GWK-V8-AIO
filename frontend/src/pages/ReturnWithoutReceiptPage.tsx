/**
 * Return Without Receipt Page (Odoo 19 parity).
 *
 * Allows managers to process manual refunds when the customer has no
 * receipt to link to. Creates a standalone refund order with a negative
 * total and records a REFUND finance journal entry.
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';

interface ReturnItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

type RefundMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'WALLET' | 'STORE_CREDIT';

export default function ReturnWithoutReceiptPage() {
  const { t } = useTranslation();
  const { activeBranch } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('CASH');
  const [items, setItems] = useState<ReturnItem[]>([
    { description: '', quantity: 1, unitPrice: 0 },
  ]);

  const addItem = () => setItems((prev) => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof ReturnItem, value: any) =>
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));

  const refundTotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const submit = useMutation({
    mutationFn: () =>
      api.post('/sales/orders/returns', {
        branchId: activeBranch?.id,
        customerName: customerName.trim() || undefined,
        reason: reason.trim() || undefined,
        refundMethod,
        items: items.filter((i) => i.description.trim() && i.unitPrice > 0),
      }),
    onSuccess: (res) => {
      toast.success(`Return ${res.data?.data?.orderNo || ''} processed successfully`);
      setItems([{ description: '', quantity: 1, unitPrice: 0 }]);
      setCustomerName('');
      setReason('');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Return failed'),
  });

  const canSubmit =
    activeBranch?.id &&
    items.some((i) => i.description.trim() && i.unitPrice > 0) &&
    refundTotal > 0;

  return (
    <div>
      <PageHeader
        title="Return Without Receipt"
        subtitle="Process a manual refund when the customer has no receipt"
      />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Customer & Reason */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Customer Name (optional)
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in customer"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              Reason for Return
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Defective item, wrong order"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
            />
          </div>
        </div>

        {/* Refund Method */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
            Refund Method
          </label>
          <div className="flex flex-wrap gap-2">
            {(['CASH', 'CARD', 'BANK_TRANSFER', 'WALLET', 'STORE_CREDIT'] as RefundMethod[]).map(
              (m) => (
                <button
                  key={m}
                  onClick={() => setRefundMethod(m)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    refundMethod === m
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {m === 'CASH'
                    ? '💵 Cash'
                    : m === 'CARD'
                    ? '💳 Card'
                    : m === 'BANK_TRANSFER'
                    ? '🏦 Bank Transfer'
                    : m === 'WALLET'
                    ? '📱 Wallet'
                    : '🎁 Store Credit'}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Return Items */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex justify-between items-center mb-4">
            <label className="text-xs font-semibold text-gray-500 uppercase">Return Items</label>
            <button
              onClick={addItem}
              className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-3 items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    placeholder="Item description"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm"
                  />
                </div>
                <div className="w-20">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center"
                    placeholder="Qty"
                  />
                </div>
                <div className="w-28">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unitPrice || ''}
                    onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-right"
                    placeholder="Price"
                  />
                </div>
                <div className="w-20 text-right pt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {(item.quantity * item.unitPrice).toFixed(2)}
                </div>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(idx)}
                    className="mt-1.5 text-red-500 hover:text-red-700 text-lg"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total & Submit */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex justify-between items-center">
          <div>
            <div className="text-xs text-gray-500 uppercase">Refund Total</div>
            <div className="text-2xl font-bold text-red-600">{refundTotal.toFixed(2)}</div>
          </div>
          <button
            onClick={() => submit.mutate()}
            disabled={!canSubmit || submit.isPending}
            className="px-6 py-3 rounded-xl bg-red-600 text-white font-bold text-sm disabled:opacity-50 hover:bg-red-700 transition"
          >
            {submit.isPending ? 'Processing...' : 'Process Return'}
          </button>
        </div>
      </div>
    </div>
  );
}
