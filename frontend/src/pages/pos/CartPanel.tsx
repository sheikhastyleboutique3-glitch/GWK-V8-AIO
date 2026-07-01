import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { usePrompt } from '../../lib/usePrompt';
import { useConfirm } from '../../lib/useConfirm';
import { printReceipt, printKot, agentHandlesPrinting } from '../../lib/thermalPrint';
import { ChosenModifier } from '../../components/ModifierModal';

type Channel = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'QR' | 'TALABAT' | 'SNOONU' | 'AGGREGATOR';
const AGGREGATOR_CHANNELS: Channel[] = ['TALABAT', 'SNOONU', 'AGGREGATOR'];
const isAggregatorChannel = (c: Channel) => AGGREGATOR_CHANNELS.includes(c);

export interface CartLine {
  itemId?: number;
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  discount?: number;
  firedAt?: string | null;
  modifiers?: ChosenModifier[];
  notes?: string;
}


interface CartPanelProps {
  branchId: number | undefined;
  mode: 'new' | 'existing';
  lines: CartLine[];
  comboCart: { comboId: number; name: string; price: number; choiceIds: number[] }[];
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  setComboCart: React.Dispatch<React.SetStateAction<{ comboId: number; name: string; price: number; choiceIds: number[] }[]>>;
  channel: Channel;
  setChannel: (c: Channel) => void;
  tableName: string;
  setTableName: (t: string) => void;
  deliveryPlatformId: number | undefined;
  setDeliveryPlatformId: (id: number | undefined) => void;
  platformRef: string;
  setPlatformRef: (r: string) => void;
  presetId: number | undefined;
  setPresetId: (id: number | undefined) => void;
  customer: any;
  setCustomer: (c: any) => void;
  customerSearch: string;
  setCustomerSearch: (s: string) => void;
  couponCode: string;
  setCouponCode: (c: string) => void;
  coupon: { code: string; discount: number } | null;
  setCoupon: (c: { code: string; discount: number } | null) => void;
  discountRuleId: number | '';
  setDiscountRuleId: (id: number | '') => void;
  tipAmount: number;
  setTipAmount: (t: number) => void;
  loadedOrderId: number | null;
  setLoadedOrderId: (id: number | null) => void;
  loadedOrder: any;
  subtotal: number;
  total: number;
  posSession: any;
  businessInfo: any;
  lastReceipt: any;
  setLastReceipt: (r: any) => void;
  showPayment: boolean;
  setShowPayment: (v: boolean) => void;
  onSwitchToFloor: () => void;
  onCloseBill: () => void;
  refetchLoaded: () => void;
  canRefund: boolean;
  // Ship-later feature
  shipLater: boolean;
  setShipLater: (v: boolean) => void;
}


const CartPanel = React.memo(function CartPanel(props: CartPanelProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [prompt, PromptDialog] = usePrompt();
  const [confirm, ConfirmDialog] = useConfirm();

  const {
    branchId, mode, lines, comboCart, cart, setCart, setComboCart,
    channel, setChannel, tableName, setTableName,
    deliveryPlatformId, setDeliveryPlatformId, platformRef, setPlatformRef,
    presetId, setPresetId, customer, setCustomer, customerSearch, setCustomerSearch,
    couponCode, setCouponCode, coupon, setCoupon,
    discountRuleId, setDiscountRuleId, tipAmount, setTipAmount,
    loadedOrderId, setLoadedOrderId, loadedOrder,
    subtotal, total, posSession, businessInfo,
    lastReceipt, setLastReceipt, showPayment, setShowPayment,
    onSwitchToFloor, onCloseBill, refetchLoaded, canRefund,
    shipLater, setShipLater,
  } = props;

  // Numpad state
  const [selectedLineIdx, setSelectedLineIdx] = useState<number>(-1);
  const [numBuffer, setNumBuffer] = useState<string>('');
  const [numMode, setNumMode] = useState<'Qty' | '%Disc' | 'Price' | null>(null);
  // Auto-fire to kitchen when taking payment (default ON — food must always
  // reach the kitchen). Persisted locally so each terminal keeps its choice.
  const [autoFire, setAutoFire] = useState(() => localStorage.getItem('pos_auto_fire') !== 'false');
  // Print mode for THIS device: 'browser' (default, print here) or 'agent'
  // (on-prem print agent handles it — suppress automatic browser prints).
  const [agentPrint, setAgentPrint] = useState(() => agentHandlesPrinting());
  // Items on an open order that have NOT been sent to the kitchen yet.
  const unfiredCount = useMemo(
    () =>
      mode === 'existing'
        ? (loadedOrder?.items || []).filter((it: any) => !it.firedAt && !it.isVoided).length
        : 0,
    [mode, loadedOrder],
  );
  // Split bill modal state
  const [splitModal, setSplitModal] = useState(false);
  const [splitSelected, setSplitSelected] = useState<Record<number, number>>({});
  const [splitPayMethod, setSplitPayMethod] = useState<'CASH' | 'CARD' | 'later'>('later');


  // Queries
  const { data: deliveryPlatforms } = useQuery({
    queryKey: ['delivery-platforms'],
    queryFn: () => api.get('/delivery-platforms').then((r) => r.data.data),
  });
  const { data: discountRules } = useQuery({
    queryKey: ['discount-rules-active'],
    queryFn: () => api.get('/discount-rules', { params: { activeOnly: true } }).then((r) => r.data.data),
  });
  const { data: presets } = useQuery({
    queryKey: ['order-presets-active'],
    queryFn: () => api.get('/order-presets', { params: { activeOnly: true } }).then((r) => r.data.data),
  });
  const { data: customerResults } = useQuery({
    queryKey: ['pos-customers', customerSearch],
    queryFn: () => api.get('/customers', { params: { search: customerSearch } }).then((r) => r.data.data),
    enabled: customerSearch.trim().length >= 2,
  });
  const { data: courses } = useQuery({
    queryKey: ['pos-courses', loadedOrderId],
    queryFn: () => api.get(`/sales/orders/${loadedOrderId}/courses`).then((r) => r.data.data),
    enabled: !!loadedOrderId,
  });

  const activeCustomer = mode === 'existing' ? loadedOrder?.customer : customer;
  const appliedCouponCode = mode === 'existing' ? loadedOrder?.couponCode : coupon?.code;
  const discount = mode === 'existing' ? (loadedOrder?.couponDiscount ?? 0) + (loadedOrder?.ruleDiscount ?? 0) : coupon?.discount ?? 0;


  // Mutations
  const fireCourse = useMutation({
    mutationFn: (courseNo: number) => api.post(`/sales/orders/${loadedOrderId}/courses/${courseNo}/fire`),
    onSuccess: () => { toast.success(t('pos.courseFired')); qc.invalidateQueries({ queryKey: ['pos-courses', loadedOrderId] }); refetchLoaded(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const applyDiscountRule = useMutation({
    mutationFn: (ruleId: number | '') => api.patch(`/sales/orders/${loadedOrderId}/discount`, { ruleId: ruleId === '' ? null : ruleId }),
    onSuccess: () => { toast.success(t('common.saved')); refetchLoaded(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const applyCouponNew = useMutation({
    mutationFn: () => api.get(`/promotions/coupons/${encodeURIComponent(couponCode.trim())}/validate`, { params: { orderTotal: subtotal } }).then((r) => r.data.data),
    onSuccess: (res: any) => { setCoupon({ code: res.code, discount: res.discount }); toast.success(`Coupon ${res.code}: −${res.discount.toFixed(2)}`); },
    onError: (e: any) => { setCoupon(null); toast.error(e.response?.data?.message || 'Invalid coupon'); },
  });
  const applyCouponExisting = useMutation({
    mutationFn: () => api.patch(`/sales/orders/${loadedOrderId}/coupon`, { code: couponCode.trim() }),
    onSuccess: () => { refetchLoaded(); toast.success('Coupon applied'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Invalid coupon'),
  });

  const refund = useMutation({
    mutationFn: (orderId: number) => api.post(`/sales/orders/${orderId}/refund`, {}).then((r) => r.data.data),
    onSuccess: (order) => { toast.success(`Order ${order.orderNo} refunded`); setLastReceipt(order); qc.invalidateQueries({ queryKey: ['inventory'] }); qc.invalidateQueries({ queryKey: ['pos-pending'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Refund failed'),
  });


  // Helpers
  const setQtyAt = (i: number, q: number) => setCart((prev) => prev.flatMap((l, idx) => (idx === i ? (q <= 0 ? [] : [{ ...l, quantity: q }]) : [l])));
  const setPriceAt = (i: number, price: number) => setCart((prev) => prev.map((l, idx) => (idx === i ? { ...l, unitPrice: price } : l)));
  const removeCombo = (i: number) => setComboCart((prev) => prev.filter((_, idx) => idx !== i));

  const onApplyCoupon = () => {
    if (!couponCode.trim()) return;
    mode === 'existing' ? applyCouponExisting.mutate() : applyCouponNew.mutate();
  };

  const cancelOrderWithNote = async (orderId: number, orderNo: string) => {
    const reason = await prompt({ title: `Cancel order ${orderNo}?`, description: 'Enter cancellation reason:', placeholder: 'Reason...' });
    if (reason === null) return;
    try {
      await api.patch(`/sales/orders/${orderId}/void`);
      if (reason.trim()) await api.patch(`/sales/orders/${orderId}`, { notes: `❌ CANCELLED: ${reason.trim()}` }).catch(() => {});
      toast.success(`Order ${orderNo} cancelled`);
      qc.invalidateQueries({ queryKey: ['pos-all-orders'] });
      qc.invalidateQueries({ queryKey: ['pos-pending'] });
      qc.invalidateQueries({ queryKey: ['kds-board'] });
      qc.invalidateQueries({ queryKey: ['waiter-active-orders'] });
      if (loadedOrderId === orderId) { setLoadedOrderId(null); onSwitchToFloor(); }
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to cancel'); }
  };

  // Numpad apply action
  const applyNumpad = async (action: 'Qty' | '%Disc' | 'Price', buf: string, targetIdx: number, line: CartLine) => {
    if (action === 'Qty') {
      const val = parseInt(buf, 10);
      if (!val || val <= 0) return;
      if (mode === 'new') setQtyAt(targetIdx, val);
      else if (line.itemId) {
        try { await api.patch(`/sales/orders/${loadedOrderId}/items/${line.itemId}`, { quantity: val }); qc.invalidateQueries({ queryKey: ['pos-loaded', loadedOrderId] }); } catch {}
      }
    } else if (action === '%Disc') {
      const percent = parseFloat(buf);
      if (!percent || percent <= 0) return;
      const discAmt = Math.round(line.unitPrice * line.quantity * percent) / 100;
      if (mode === 'existing' && line.itemId) {
        try { await api.patch(`/sales/orders/${loadedOrderId}/items/${line.itemId}`, { discount: discAmt }); qc.invalidateQueries({ queryKey: ['pos-loaded', loadedOrderId] }); toast.success(`-${discAmt.toFixed(2)} (${percent}%)`); } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
      } else { toast.success(`-${discAmt.toFixed(2)} (${percent}%)`); }
    } else if (action === 'Price') {
      const newPrice = parseFloat(buf);
      if (isNaN(newPrice)) return;
      if (mode === 'new') { setPriceAt(targetIdx, newPrice); toast.success(`Price → ${newPrice.toFixed(2)}`); }
      else { toast('Price change requires manager override — use %Disc instead'); }
    }
  };


  // Kitchen fire handler
  const handleKitchenFire = async () => {
    if (mode === 'existing' && loadedOrderId) {
      try {
        const { data: fireResult } = await api.post(`/sales/orders/${loadedOrderId}/courses/1/fire`);
        const firedOrder = fireResult.data;
        const prevFiredIds = new Set((loadedOrder?.items || []).filter((it: any) => it.firedAt).map((it: any) => it.id));
        const newlyFired = (firedOrder.items || []).filter((it: any) => it.firedAt && !prevFiredIds.has(it.id) && !it.isVoided);
        if (newlyFired.length > 0) {
          printKot(firedOrder, { items: newlyFired, splitByStation: true, auto: true });
          toast.success(`🔥 ${newlyFired.length} item(s) sent to kitchen!`, { duration: 3000 });
        } else { toast('All items already sent to kitchen', { icon: '✓' }); }
        qc.invalidateQueries({ queryKey: ['pos-loaded', loadedOrderId] });
        qc.invalidateQueries({ queryKey: ['kds-board'] });
      } catch (e: any) { toast.error(`❌ Kitchen fire failed: ${e.response?.data?.message || 'Failed'}`, { duration: 5000 }); }
    } else if (mode === 'new' && lines.length > 0) {
      try {
        const kotItems = cart.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, product: { name: l.name, nameAr: undefined, category: undefined }, modifiers: l.modifiers, notes: undefined }));
        const { data: created } = await api.post('/sales/orders', {
          branchId, channel,
          tableName: (channel === 'DINE_IN' && tableName) ? tableName : (channel === 'DELIVERY' || channel === 'TAKEAWAY') ? (tableName || undefined) : undefined,
          customerId: customer?.id, presetId,
          items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, modifiers: l.modifiers })),
          shipLater: shipLater || undefined,
        });
        const newOrderId = created.data.id;
        const newOrder = created.data;
        await api.post(`/sales/orders/${newOrderId}/courses/1/fire`).catch(() => {});
        const kotOrder = { orderNo: newOrder.orderNo, tableName: newOrder.tableName || tableName, channel, items: kotItems };
        printKot(kotOrder as any, { splitByStation: true, auto: true });
        setLoadedOrderId(newOrderId);
        setCart([]);
        setTableName(newOrder.tableName || '');
        toast.success('🔥 Order created & sent to kitchen!', { duration: 3000 });
        qc.invalidateQueries({ queryKey: ['pos-pending'] });
        qc.invalidateQueries({ queryKey: ['kds-board'] });
      } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to create order'); }
    } else { toast('Load an existing order or add items first'); }
  };


  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col min-h-0 overflow-hidden max-h-full">
      {/* ═══ TOP ZONE (fixed): Channel/Preset selector + Order header ═══ */}
      <div className="flex-shrink-0 p-3 pb-0">
      {mode === 'existing' ? (
        <div className="mb-2">
          <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
            <div className="text-sm font-medium text-primary">
              {t('pos.settling')}: {loadedOrder?.tableName ? `${t('pos.table')} ${loadedOrder.tableName}` : loadedOrder?.orderNo}
            </div>
            <button onClick={onCloseBill} className="text-xs text-gray-500 hover:text-gray-700" aria-label="Close bill">✕</button>
          </div>
          {(courses?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(courses || []).map((c: any) => (
                <button key={c.courseNo} disabled={c.status !== 'QUEUED' || fireCourse.isPending} onClick={() => fireCourse.mutate(c.courseNo)}
                  className={`px-2 py-1 rounded text-xs font-medium ${c.status === 'QUEUED' ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                  {c.status === 'QUEUED' ? `🔥 ${t('pos.fireCourse')} ${c.courseNo}` : `${t('pos.course')} ${c.courseNo} ✓`}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {(presets?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {(presets || []).map((p: any) => (
                <button key={p.id} onClick={() => { setPresetId(presetId === p.id ? undefined : p.id); setChannel(p.channel); if (p.channel !== 'DINE_IN' && p.channel !== 'DELIVERY' && p.channel !== 'TAKEAWAY') setTableName(''); if (isAggregatorChannel(p.channel)) {} }}
                  style={presetId === p.id && p.color ? { backgroundColor: p.color, color: '#fff' } : {}}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${presetId === p.id ? 'text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {!(presets?.length) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {(['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'QR', 'TALABAT', 'SNOONU'] as Channel[]).map((c) => (
                <button key={c} onClick={() => { setChannel(c); if (c !== 'DINE_IN' && c !== 'DELIVERY' && c !== 'TAKEAWAY') setTableName(''); const match = (deliveryPlatforms || []).find((p: any) => p.channel === c || p.name?.toUpperCase() === c); if (match) setDeliveryPlatformId(match.id); }}
                  className={`flex-1 min-w-[4rem] px-2 py-1.5 rounded-lg text-xs ${channel === c ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  {c.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}
          {channel === 'DINE_IN' && tableName && (
            <div className="mb-2 text-xs text-gray-500">Table: <span className="font-semibold text-gray-800 dark:text-gray-200">{tableName}</span>
              <button onClick={() => { setTableName(''); onSwitchToFloor(); }} className="ms-2 text-primary hover:underline">Change</button>
            </div>
          )}
          {(channel === 'DELIVERY' || channel === 'TAKEAWAY') && (
            <div className="mb-2">
              <input value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder={channel === 'DELIVERY' ? 'Delivery address / customer name...' : 'Customer name / order reference...'}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </div>
          )}
          {isAggregatorChannel(channel) && (
            <div className="mb-3 space-y-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2">
              <div className="text-[10px] uppercase text-amber-700 dark:text-amber-400">{t('pos.aggregatorOrder')}</div>
              <select value={deliveryPlatformId ?? ''} onChange={(e) => setDeliveryPlatformId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm">
                <option value="">{t('pos.selectPlatform')}</option>
                {(deliveryPlatforms || []).filter((p: any) => p.isActive).map((p: any) => (<option key={p.id} value={p.id}>{p.name} ({p.commissionPct}%)</option>))}
              </select>
              <input value={platformRef} onChange={(e) => setPlatformRef(e.target.value)} placeholder={t('pos.platformRef')}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </div>
          )}
          {/* Ship-Later toggle for delivery orders */}
          {(channel === 'DELIVERY' || channel === 'TAKEAWAY') && (
            <label className="flex items-center gap-2 mb-2 cursor-pointer">
              <input type="checkbox" checked={shipLater} onChange={(e) => setShipLater(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary" />
              <span className="text-xs text-gray-600 dark:text-gray-400">📦 Ship Later (delayed fulfillment)</span>
            </label>
          )}
        </>
      )}


      </div>{/* end TOP ZONE */}

      {/* ═══ MIDDLE ZONE (scrollable): Order line items ═══ */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 divide-y divide-gray-100 dark:divide-gray-800">
        {lines.map((l, i) => (
          <div key={l.itemId ?? `${l.productId}-${i}`} className={`px-1 py-2 cursor-pointer rounded ${selectedLineIdx === i ? 'bg-emerald-50 dark:bg-emerald-900/30 ring-2 ring-emerald-500 dark:ring-emerald-400' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
            onClick={() => setSelectedLineIdx(i)}
            onDoubleClick={async () => {
              if (mode === 'existing' && l.itemId) {
                const note = await prompt({ title: `Note for "${l.name}"`, description: 'Printed on KOT', defaultValue: l.notes || '', placeholder: 'e.g. No ice, extra sauce' });
                if (note !== null) {
                  try { await api.patch(`/sales/orders/${loadedOrderId}/items/${l.itemId}`, { notes: note }); toast.success('Item note saved'); qc.invalidateQueries({ queryKey: ['pos-loaded', loadedOrderId] }); } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
                }
              }
            }}>
            <div className="flex justify-between items-center gap-2">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 line-clamp-1 flex items-center gap-1">
                {l.firedAt ? <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex-shrink-0" title="Sent to kitchen">🔥</span>
                  : mode === 'existing' ? <span className="text-[10px] text-gray-300 dark:text-gray-600 flex-shrink-0" title="Not yet sent">○</span> : null}
                {l.name}
              </span>
              {mode === 'new' ? (
                <>
                  <button onClick={() => setQtyAt(i, l.quantity - 1)} className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800">−</button>
                  <span className="w-6 text-center text-sm">{l.quantity}</span>
                  <button onClick={() => setQtyAt(i, l.quantity + 1)} className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800">+</button>
                </>
              ) : (
                <>
                  <span className="text-sm">×{l.quantity}</span>
                  <button onClick={async () => {
                    if (!l.itemId) return;
                    const reason = await prompt({ title: `Cancel "${l.name}"?`, description: 'Reason (sent to kitchen):', placeholder: 'e.g. Customer changed mind' });
                    if (reason === null) return;
                    try { await api.patch(`/sales/orders/${loadedOrderId}/items/${l.itemId}`, { isVoided: true, voidReason: reason || 'Cancelled' }); toast.success(`${l.name} cancelled`); qc.invalidateQueries({ queryKey: ['pos-loaded', loadedOrderId] }); qc.invalidateQueries({ queryKey: ['kds-board'] }); } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
                  }} className="text-red-600 text-sm" aria-label="Cancel item">✕</button>
                </>
              )}
            </div>
            {l.notes && <div className="text-[11px] text-amber-600 mt-0.5 italic">📝 {l.notes}</div>}
            {l.modifiers && l.modifiers.length > 0 && <div className="text-[11px] text-gray-500 mt-0.5">{l.modifiers.filter((m: any) => m?.name).map((m: any) => m.name).join(', ')}</div>}
            <div className="flex justify-between items-center mt-1">
              {mode === 'new' ? (
                <input type="number" value={l.unitPrice} onChange={(e) => setPriceAt(i, parseFloat(e.target.value) || 0)} className="w-24 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs" />
              ) : (<span className="text-xs text-gray-500">{l.unitPrice.toFixed(2)}</span>)}
              <div className="text-right">
                {(l.discount ?? 0) > 0 && <div className="text-[10px] text-green-600 line-through">{(l.unitPrice * l.quantity).toFixed(2)}</div>}
                <span className="text-sm font-semibold">{((l.unitPrice * l.quantity) - (l.discount ?? 0)).toFixed(2)}</span>
                {(l.discount ?? 0) > 0 && <span className="text-[10px] text-green-600 ms-1">(-{(l.discount ?? 0).toFixed(2)})</span>}
              </div>
            </div>
          </div>
        ))}
        {comboCart.map((c, i) => (
          <div key={`combo-${i}`} className="px-1 py-2">
            <div className="flex justify-between items-center gap-2">
              <span className="text-sm font-medium flex-1 line-clamp-1">🍱 {c.name}</span>
              {mode === 'new' && <button onClick={() => removeCombo(i)} className="text-red-600 text-sm">✕</button>}
              <span className="text-sm w-16 text-end">{c.price.toFixed(2)}</span>
            </div>
          </div>
        ))}
        {!lines.length && !comboCart.length && <p className="text-sm text-gray-400 py-8 text-center">Tap products to add them.</p>}
      </div>{/* end MIDDLE ZONE (scrollable lines) */}

      {/* ═══ BOTTOM ZONE (fixed): Actions + Numpad + Totals + Payment ═══ */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 px-3 pb-2 pt-1 space-y-1">

      {/* Quick actions bar (compact) */}
      <div className="grid grid-cols-5 gap-1 text-[10px]">
        <button onClick={handleKitchenFire} className={`px-1 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-500/10 text-orange-700 text-center font-medium ${unfiredCount > 0 ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}>🔥 KOT{unfiredCount > 0 ? ` (${unfiredCount})` : ''}</button>
        <button onClick={async () => { const note = await prompt({ title: 'Customer Note', placeholder: 'e.g. Allergic to nuts' }); if (note != null && mode === 'existing' && loadedOrderId) { api.patch(`/sales/orders/${loadedOrderId}`, { notes: note }).then(() => { toast.success('Note saved'); qc.invalidateQueries({ queryKey: ['pos-loaded', loadedOrderId] }); }); } }}
          className="px-1 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-center">📝</button>
        <button onClick={() => { if (mode === 'existing' && loadedOrder) { printReceipt(loadedOrder, businessInfo); toast.success('Bill printed'); } else if (mode === 'new' && lines.length > 0) { printReceipt({ orderNo: 'PREVIEW', tableName, items: lines.map(l => ({ productId: l.productId, product: { name: l.name }, quantity: l.quantity, unitPrice: l.unitPrice, modifiers: l.modifiers })), total, subtotal } as any, businessInfo); } else toast('Add items first'); }}
          className="px-1 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-center">🧾</button>
        <button onClick={() => { if (mode === 'existing' && loadedOrderId && loadedOrder?.items?.length >= 2) setSplitModal(true); else toast('Need 2+ items to split'); }}
          className="px-1 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-center">✂️</button>
        <button onClick={async () => { if (mode === 'existing' && loadedOrderId && loadedOrder) cancelOrderWithNote(loadedOrderId, loadedOrder.orderNo); else toast('Load order first'); }}
          className="px-1 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 text-center font-medium">❌</button>
      </div>

      {/* Numpad (compact Odoo-style) */}
      {lines.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-800 mt-2 pt-2">
          {selectedLineIdx >= 0 && selectedLineIdx < lines.length && (
            <div className="text-[10px] text-primary font-medium mb-1">
              Selected: {lines[selectedLineIdx].name} (×{lines[selectedLineIdx].quantity})
              {lines[selectedLineIdx].discount ? <span className="ms-1 text-emerald-600">(-{Number(lines[selectedLineIdx].discount).toFixed(2)})</span> : null}
            </div>
          )}
          {numBuffer && (
            <div className="text-right text-lg font-mono font-bold text-gray-800 dark:text-gray-100 mb-1 px-1 flex items-center justify-end gap-2">
              <span className="text-[10px] text-gray-400 font-normal">{numMode || 'Qty'}</span>{numBuffer}
            </div>
          )}
          <div className="grid grid-cols-4 gap-1 text-xs">
            {[7,8,9,'Qty',4,5,6,'%Disc',1,2,3,'Price','+/-',0,'.','C'].map((key, idx) => {
              const isAction = typeof key === 'string' && ['Qty','%Disc','Price'].includes(key as string);
              const isClear = key === 'C';
              const isActiveMode = isAction && numMode === key;
              return (
                <button key={idx}
                  className={`py-2 rounded ${isAction ? (isActiveMode ? 'bg-primary text-white font-bold ring-2 ring-primary/50' : 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400 font-medium') : isClear ? 'bg-red-50 dark:bg-red-500/10 text-red-600 font-medium' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600'} text-center text-sm`}
                  onClick={async () => {
                    if (isClear) { setNumBuffer(''); setNumMode(null); return; }
                    const targetIdx = selectedLineIdx >= 0 && selectedLineIdx < lines.length ? selectedLineIdx : lines.length - 1;
                    const line = lines[targetIdx];
                    if (isAction) {
                      const actionKey = key as 'Qty' | '%Disc' | 'Price';
                      if (numBuffer && line) { await applyNumpad(actionKey, numBuffer, targetIdx, line); setNumBuffer(''); setNumMode(null); }
                      else { setNumMode(actionKey); setNumBuffer(''); }
                      return;
                    }
                    let newBuf = numBuffer;
                    if (key === '+/-') newBuf = numBuffer.startsWith('-') ? numBuffer.slice(1) : '-' + numBuffer;
                    else newBuf = numBuffer + String(key);
                    setNumBuffer(newBuf);
                    if (numMode === 'Qty' && line) {
                      const val = parseInt(newBuf, 10);
                      if (val > 0) {
                        if (mode === 'new') setQtyAt(targetIdx, val);
                        else if (line.itemId) api.patch(`/sales/orders/${loadedOrderId}/items/${line.itemId}`, { quantity: val }).then(() => qc.invalidateQueries({ queryKey: ['pos-loaded', loadedOrderId] })).catch(() => {});
                      }
                    }
                  }}>{key}</button>
              );
            })}
          </div>
        </div>
      )}


      {/* Totals + Payment */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-1">
        {/* Unfired-items guard: the #1 "kitchen didn't get the order" failure. */}
        {unfiredCount > 0 && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 px-3 py-2 mb-1.5">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">⚠ {unfiredCount} item(s) not sent to kitchen</span>
            <button onClick={handleKitchenFire} className="px-2 py-1 rounded-lg bg-amber-600 text-white text-xs font-bold whitespace-nowrap active:scale-95">🔥 Send now</button>
          </div>
        )}
        <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{subtotal.toFixed(2)}</span></div>
        {discount > 0 && <div className="flex justify-between text-xs text-green-600"><span>Coupon {appliedCouponCode}</span><span>-{discount.toFixed(2)}</span></div>}
        <div className="flex justify-between text-base font-bold mt-1"><span>Total</span><span>{total.toFixed(2)}</span></div>
        <label className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-500 cursor-pointer select-none">
          <input type="checkbox" checked={autoFire} onChange={(e) => { setAutoFire(e.target.checked); localStorage.setItem('pos_auto_fire', String(e.target.checked)); }}
            className="rounded border-gray-300 text-primary focus:ring-primary" />
          🔥 Auto-send to kitchen when taking payment
        </label>
        <label className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-500 cursor-pointer select-none">
          <input type="checkbox" checked={agentPrint} onChange={(e) => { setAgentPrint(e.target.checked); localStorage.setItem('pos_print_mode', e.target.checked ? 'agent' : 'browser'); }}
            className="rounded border-gray-300 text-primary focus:ring-primary" />
          🖨️ Printer handled by on-prem agent (don’t print here)
        </label>
        <button disabled={(!lines.length && !comboCart.length) || !posSession} onClick={async () => {
            // Auto-fire any unsent items before payment so the kitchen is never skipped.
            if (autoFire && unfiredCount > 0) { try { await handleKitchenFire(); } catch { /* fire surfaces its own error */ } }
            setShowPayment(true);
          }}
          className="w-full mt-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-50 active:scale-[0.97] transition-transform">
          {!posSession ? t('pos.session.openSessionFirst') : `💳 Payment · ${total.toFixed(2)}`}
        </button>
      </div>

      </div>{/* end BOTTOM ZONE */}

      {/* Last receipt */}
      {lastReceipt && (
        <div className="mt-3 border-t border-gray-200 dark:border-gray-800 pt-3">
          <button onClick={() => printReceipt(lastReceipt, businessInfo)}
            className="w-full py-2.5 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium flex items-center justify-center gap-2">
            🖨 {t('pos.printReceipt')}
          </button>
          <div className="mt-2 text-xs text-gray-500">Last: {lastReceipt.orderNo} · total {Number(lastReceipt.total).toFixed(2)} · GP {Number(lastReceipt.grossProfit).toFixed(2)}
            {lastReceipt.status === 'REFUNDED' && <span className="ms-2 text-red-600 font-medium">· {t('pos.refunded')}</span>}
          </div>
          {canRefund && lastReceipt.status === 'COMPLETED' && (
            <button onClick={async () => { const ok = await confirm({ title: t('pos.refundConfirm'), description: 'This will fully refund this order.', variant: 'danger', confirmLabel: 'Refund' }); if (ok) refund.mutate(lastReceipt.id); }}
              disabled={refund.isPending} className="w-full mt-2 py-2 rounded-xl border border-red-300 text-red-600 text-sm font-medium disabled:opacity-50">
              {t('pos.refund')}
            </button>
          )}
        </div>
      )}

      {/* Split Bill Modal */}
      {splitModal && loadedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setSplitModal(false); setSplitSelected({}); }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-5 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-1">{t('pos.splitBillTitle')}</h3>
            <p className="text-xs text-gray-500 mb-3">{t('pos.splitBillDesc')}</p>
            <div className="flex-1 overflow-y-auto space-y-1 mb-4">
              {(loadedOrder.items || []).filter((it: any) => !it.isVoided).map((it: any) => {
                const qty = splitSelected[it.id] ?? 0;
                return (
                  <div key={it.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{it.product?.name ?? `#${it.productId}`}</div><div className="text-[10px] text-gray-500">{Number(it.unitPrice).toFixed(2)} × {it.quantity}</div></div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSplitSelected(p => ({ ...p, [it.id]: Math.max(0, (p[it.id] ?? 0) - 1) }))} disabled={qty === 0} className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800 text-sm font-bold disabled:opacity-30">-</button>
                      <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                      <button onClick={() => setSplitSelected(p => ({ ...p, [it.id]: Math.min(it.quantity, (p[it.id] ?? 0) + 1) }))} disabled={qty >= it.quantity} className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800 text-sm font-bold disabled:opacity-30">+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            {(() => {
              const splitTotal = Object.entries(splitSelected).reduce((sum, [id, qty]) => { const it = (loadedOrder.items || []).find((i: any) => i.id === Number(id)); return sum + (it ? it.unitPrice * qty : 0); }, 0);
              const hasSelection = Object.values(splitSelected).some(q => q > 0);
              return (<>
                <div className="flex justify-between text-sm font-bold mb-3 border-t border-gray-200 dark:border-gray-800 pt-3"><span>{t('pos.splitTotal')}</span><span>{splitTotal.toFixed(2)}</span></div>
                <div className="flex gap-2 mb-3">
                  {(['CASH', 'CARD', 'later'] as const).map(m => (<button key={m} onClick={() => setSplitPayMethod(m)} className={`flex-1 py-2 rounded-lg text-xs font-medium border ${splitPayMethod === m ? 'bg-primary text-white border-primary' : 'border-gray-200 dark:border-gray-700'}`}>{m === 'later' ? t('pos.splitLater') : m}</button>))}
                </div>
                <button disabled={!hasSelection} onClick={async () => {
                  const itemIds = Object.entries(splitSelected).filter(([, qty]) => qty > 0).map(([id]) => Number(id));
                  if (!itemIds.length) return;
                  try {
                    const res = await api.post(`/sales/orders/${loadedOrderId}/split`, { itemIds, quantities: splitSelected });
                    const newOrder = res.data?.data?.newOrder;
                    if (splitPayMethod !== 'later' && newOrder) { await api.post(`/sales/orders/${newOrder.id}/payments`, { method: splitPayMethod, amount: newOrder.total }); const { data: completed } = await api.post(`/sales/orders/${newOrder.id}/complete`, {}); printReceipt(completed?.data ?? newOrder, businessInfo, { auto: true }); toast.success(t('pos.splitPaid', { method: splitPayMethod })); }
                    else toast.success(t('pos.splitDone'));
                    setSplitModal(false); setSplitSelected({}); qc.invalidateQueries({ queryKey: ['pos-pending'] }); refetchLoaded();
                  } catch (e: any) { toast.error(e.response?.data?.message || 'Split failed'); }
                }} className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
                  {splitPayMethod === 'later' ? t('pos.splitCreateOrder') : t('pos.splitAndPay')}
                </button>
              </>);
            })()}
          </div>
        </div>
      )}

      <PromptDialog />
      <ConfirmDialog />
    </div>
  );
});

export default CartPanel;
