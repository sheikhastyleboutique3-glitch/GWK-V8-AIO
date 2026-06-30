import { useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useBarcodeScanner } from '../lib/useBarcodeScanner';
import { printReceipt, printKot } from '../lib/thermalPrint';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import OfflineBanner from '../components/OfflineBanner';
import { usePrompt } from '../lib/usePrompt';
import { useConfirm } from '../lib/useConfirm';
import { usePosKeyboard } from '../lib/usePosKeyboard';
import { usePosSessionGuard } from '../lib/usePosSessionGuard';
import PosSessionBar from '../components/PosSessionBar';
import PinSwitchModal from '../components/PinSwitchModal';
import ModifierModal, { ModGroup, ChosenModifier } from '../components/ModifierModal';

// ── Extracted sub-components (Phase 3 split) ──
import FloorPlanView from './pos/FloorPlanView';
import OrdersListView from './pos/OrdersListView';
import PaymentScreen from './pos/PaymentScreen';
import CartPanel, { CartLine } from './pos/CartPanel';
import ProductCatalog from './pos/ProductCatalog';
// Phase 4: Serial/Lot selection drawer
import BatchSelectionDrawer from './pos/BatchSelectionDrawer';


type Channel = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'QR' | 'TALABAT' | 'SNOONU' | 'AGGREGATOR';
type PayMethod = 'CASH' | 'CARD' | 'GIFT_CARD' | 'STORE_CREDIT' | 'LOYALTY' | 'AGGREGATOR' | 'LOYALTY_CARD' | 'TERMINAL' | 'QR' | 'ON_ACCOUNT';
const AGGREGATOR_CHANNELS: Channel[] = ['TALABAT', 'SNOONU', 'AGGREGATOR'];
const isAggregatorChannel = (c: Channel) => AGGREGATOR_CHANNELS.includes(c);

interface Tender {
  method: PayMethod;
  amount: number;
  giftCardCode?: string;
  loyaltyCode?: string;
  terminalId?: number;
}

export default function POSPage() {
  const { t } = useTranslation();
  const { activeBranch, user } = useAuth();
  const qc = useQueryClient();
  // Use activeBranch if set, otherwise fall back to user's assigned branch
  const branchId = activeBranch?.id || user?.branchId || (user?.assignedBranches?.[0] as any)?.id;
  const { isOnline, isSyncing, pendingCount } = useOnlineStatus();
  const [prompt, PromptDialog] = usePrompt();
  const [confirm, ConfirmDialog] = useConfirm();
  const canRefund = user?.role === 'SUPER_ADMIN' || user?.role === 'BRANCH_MANAGER';
  const canEditFloor = user?.role === 'SUPER_ADMIN' || user?.role === 'BRANCH_MANAGER' || user?.role === 'CASHIER';

  // ─── TOP-LEVEL VIEW SWITCH ───
  const [posView, setPosView] = useState<'floor' | 'order' | 'orders'>('floor');

  // ─── Cart & Order State ───
  const [cart, setCart] = useState<CartLine[]>([]);
  const [comboCart, setComboCart] = useState<{ comboId: number; name: string; price: number; choiceIds: number[] }[]>([]);
  const [channel, setChannel] = useState<Channel>('DINE_IN');
  const [tableName, setTableName] = useState('');
  const [deliveryPlatformId, setDeliveryPlatformId] = useState<number | undefined>(undefined);
  const [presetId, setPresetId] = useState<number | undefined>(undefined);
  const [platformRef, setPlatformRef] = useState('');
  const [customer, setCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [tipAmount, setTipAmount] = useState(0);
  const [discountRuleId, setDiscountRuleId] = useState<number | ''>('');
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [loadedOrderId, setLoadedOrderId] = useState<number | null>(null);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [tenderAmount, setTenderAmount] = useState('');
  // Phase 4: Ship-later
  const [shipLater, setShipLater] = useState(false);
  // Phase 4: Batch selection drawer
  const [batchDrawer, setBatchDrawer] = useState<{ product: any; batches: any[] } | null>(null);
  // Mobile cart drawer toggle
  const [mobileCartOpen, setMobileCartOpen] = useState(false);


  const mode: 'new' | 'existing' = loadedOrderId ? 'existing' : 'new';

  // ─── Modifier state ───
  const [modProduct, setModProduct] = useState<{ product: any; groups: ModGroup[] } | null>(null);
  const [variantProduct, setVariantProduct] = useState<{ product: any; variants: any[] } | null>(null);
  const { data: modifierGroups } = useQuery({
    queryKey: ['modifier-groups'],
    queryFn: () => api.get('/modifiers/groups').then((r) => r.data.data),
  });
  const productGroups = useMemo(() => {
    const map = new Map<number, ModGroup[]>();
    (modifierGroups || []).forEach((g: any) => {
      (g.productLinks || []).forEach((l: any) => {
        const arr = map.get(l.productId) ?? [];
        arr.push(g);
        map.set(l.productId, arr);
      });
    });
    return map;
  }, [modifierGroups]);

  // ─── Combos ───
  const { data: combos } = useQuery({
    queryKey: ['combos'],
    queryFn: () => api.get('/combos').then((r) => r.data.data),
  });
  const [comboPick, setComboPick] = useState<{ combo: any; sel: Record<number, number> } | null>(null);

  // ─── PIN switch ───
  const [showPinSwitch, setShowPinSwitch] = useState(false);

  // ─── POS Session ───
  const { data: posSession } = useQuery({
    queryKey: ['pos-session-current', branchId],
    queryFn: () => api.get('/pos-sessions/current', { params: { branchId } }).then((r) => r.data.data),
    enabled: !!branchId,
    refetchInterval: 30_000,
  });
  const { blocked: sessionBlocked, proceed: sessionProceed, cancel: sessionCancel } = usePosSessionGuard({
    sessionOpen: !!posSession,
    allowedPaths: ['/pos', '/kds', '/waiter'],
  });

  // ─── Loaded order ───
  const { data: loadedOrder } = useQuery({
    queryKey: ['pos-loaded', loadedOrderId],
    queryFn: () => api.get(`/sales/orders/${loadedOrderId}`).then((r) => r.data.data),
    enabled: !!loadedOrderId,
    refetchInterval: 60_000,
  });
  const refetchLoaded = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['pos-loaded', loadedOrderId] });
    qc.invalidateQueries({ queryKey: ['pos-pending'] });
  }, [qc, loadedOrderId]);

  // ─── Pending bills ───
  const { data: pendingBills } = useQuery({
    queryKey: ['pos-pending', branchId],
    queryFn: async () => {
      const [open, held] = await Promise.all([
        api.get('/sales/orders', { params: { branchId, status: 'OPEN' } }).then((r) => r.data.data),
        api.get('/sales/orders', { params: { branchId, status: 'HELD' } }).then((r) => r.data.data),
      ]);
      return [...(open || []), ...(held || [])];
    },
    enabled: !!branchId,
    refetchInterval: 60_000,
  });


  // ─── Business info for receipts ───
  const { data: settings } = useQuery({
    queryKey: ['settings-receipt'],
    queryFn: () => api.get('/settings').then((r) => r.data.data),
  });
  const businessInfo = useMemo(() => {
    const map: Record<string, string> = {};
    (settings || []).forEach((s: any) => { map[s.key] = s.value; });
    return {
      businessName: map.company_name || undefined,
      branchName: activeBranch?.name,
      logoUrl: map.company_logo ? `${window.location.origin}${map.company_logo}` : undefined,
      address: map.company_address || undefined,
      phone: map.company_phone || undefined,
      email: map.company_email || undefined,
      taxId: map.company_tax_id || undefined,
      currency: map.default_currency || 'QAR',
    };
  }, [settings, activeBranch]);

  // ─── Derived values ───
  const lines: CartLine[] = useMemo(() => {
    if (mode === 'existing') {
      return (loadedOrder?.items || []).filter((it: any) => !it.isVoided).map((it: any) => ({
        itemId: it.id, productId: it.productId, name: it.product?.name ?? `#${it.productId}`,
        unitPrice: it.unitPrice, quantity: it.quantity, discount: it.discount ?? 0,
        firedAt: it.firedAt, modifiers: Array.isArray(it.modifiers) ? it.modifiers : undefined, notes: it.notes,
      }));
    }
    return cart;
  }, [mode, loadedOrder, cart]);

  const cartSubtotal = useMemo(() => cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0) + comboCart.reduce((s, c) => s + c.price, 0), [cart, comboCart]);
  const subtotal = mode === 'existing' ? loadedOrder?.subtotal ?? 0 : cartSubtotal;
  const discount = mode === 'existing' ? (loadedOrder?.couponDiscount ?? 0) + (loadedOrder?.ruleDiscount ?? 0) : coupon?.discount ?? 0;
  const existingTipDelta = mode === 'existing' ? tipAmount - (loadedOrder?.tip ?? 0) : 0;
  const total = mode === 'existing'
    ? (loadedOrder?.total ?? 0) + existingTipDelta
    : Math.max(0, cartSubtotal - (coupon?.discount ?? 0) + tipAmount);
  const paid = useMemo(() => tenders.reduce((s, t) => s + t.amount, 0), [tenders]);
  const remaining = Math.max(0, +(total - paid).toFixed(2));

  // ─── Table order picker ───
  const [tableOrderPicker, setTableOrderPicker] = useState<{ tableName: string; orders: any[] } | null>(null);


  // ─── Barcode scanner ───
  useBarcodeScanner(async (barcode) => {
    try {
      const res = await api.get('/products', { params: { search: barcode, sellable: true, productType: 'MENU' } });
      const matches = res.data?.data || [];
      const product = matches.find((p: any) => p.barcode === barcode || p.sku === barcode) || matches[0];
      if (product) { onProduct(product); toast.success(`Scanned: ${product.name}`); }
      else toast.error(`No product found for barcode: ${barcode}`);
    } catch { toast.error(`Barcode lookup failed: ${barcode}`); }
  }, { enabled: !!branchId });

  // ─── Cart helpers ───
  const addToCart = useCallback((p: any, unitPrice?: number, modifiers?: ChosenModifier[]) => {
    setCart((prev) => {
      if (!modifiers?.length) {
        const found = prev.find((l) => l.productId === p.id && !l.modifiers?.length);
        if (found) return prev.map((l) => (l === found ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { productId: p.id, name: p.name, unitPrice: unitPrice ?? p.salePrice ?? p.costPrice ?? 0, quantity: 1, modifiers }];
    });
    setCoupon(null);
  }, []);

  const addItemMut = useMutation({
    mutationFn: (p: { product: any; unitPrice?: number; modifiers?: ChosenModifier[] }) =>
      api.post(`/sales/orders/${loadedOrderId}/items`, { productId: p.product.id, quantity: 1, unitPrice: p.unitPrice ?? p.product.salePrice ?? p.product.costPrice ?? 0, modifiers: p.modifiers }),
    onSuccess: refetchLoaded,
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to add item'),
  });

  const addLine = useCallback((p: any, unitPrice: number, modifiers?: ChosenModifier[]) => {
    if (mode === 'existing') addItemMut.mutate({ product: p, unitPrice, modifiers });
    else addToCart(p, unitPrice, modifiers);
  }, [mode, addItemMut, addToCart]);

  // Product selection handler (modifiers, variants, serial/lot, weighed)
  const onProduct = useCallback(async (p: any) => {
    if (p.hasVariants) {
      try {
        const variants = await api.get(`/product-attributes/variants/${p.id}`).then((r) => r.data.data);
        if (variants?.length) { setVariantProduct({ product: p, variants: variants.filter((v: any) => v.isActive !== false) }); return; }
      } catch {}
    }
    const groups = productGroups.get(p.id);
    if (groups && groups.length) { setModProduct({ product: p, groups }); return; }
    // Serial/lot-tracked: show batch selection drawer (Phase 4)
    if (p.tracksSerial) {
      try {
        const batchRes = await api.get(`/inventory/products/${p.id}/branches/${branchId}/available-batches`);
        const batches = batchRes.data?.data || [];
        if (batches.length > 0) { setBatchDrawer({ product: p, batches }); return; }
      } catch {}
      const serial = await prompt({ title: t('pos.enterSerial', { name: p.name }) as string, placeholder: 'Serial / Lot number' });
      if (serial === null) return;
      if (serial.trim()) { addLine(p, p.salePrice ?? p.costPrice ?? 0, [{ optionId: -1, name: `S/N ${serial.trim()}`, priceDelta: 0 }] as any); return; }
    }
    if (p.weighed) { handleWeighed(p); return; }
    addLine(p, p.salePrice ?? p.costPrice ?? 0, undefined);
  }, [productGroups, branchId, prompt, t, addLine]);

  const handleWeighed = async (p: any) => {
    const raw = await prompt({ title: `${p.name} — Enter weight (kg)`, defaultValue: '1', type: 'number' });
    if (raw === null) return;
    const weight = parseFloat(raw);
    if (!(weight > 0)) { toast.error('Invalid weight'); return; }
    const unitPrice = p.salePrice ?? p.costPrice ?? 0;
    if (mode === 'existing') {
      api.post(`/sales/orders/${loadedOrderId}/items`, { productId: p.id, quantity: weight, unitPrice, modifiers: [{ optionId: -3, name: `${weight.toFixed(3)} kg`, priceDelta: 0 }] }).then(() => refetchLoaded());
    } else {
      setCart((prev) => [...prev, { productId: p.id, name: `${p.name} (${weight.toFixed(3)} kg)`, unitPrice, quantity: weight }]);
    }
  };

  const pickVariant = (v: any) => {
    if (!variantProduct) return;
    const base = variantProduct.product.salePrice ?? variantProduct.product.costPrice ?? 0;
    const variantLabel = v.sku || v.name || `Variant #${v.id}`;
    const prod = { ...variantProduct.product, name: `${variantProduct.product.name} · ${variantLabel}` };
    addLine(prod, base + (v.priceExtra ?? 0), [{ optionId: v.id, name: variantLabel, nameAr: variantLabel, priceDelta: v.priceExtra ?? 0 }] as any);
    setVariantProduct(null);
  };


  // ─── Combo handling ───
  const openCombo = (combo: any) => {
    const sel: Record<number, number> = {};
    (combo.lines || []).forEach((l: any) => { if (l.choices?.length) sel[l.id] = l.choices[0].id; });
    setComboPick({ combo, sel });
  };
  const comboPickPrice = () => {
    if (!comboPick) return 0;
    const allChoices = (comboPick.combo.lines || []).flatMap((l: any) => l.choices || []);
    const extras = Object.values(comboPick.sel).reduce((s: number, chId) => s + (allChoices.find((c: any) => c.id === chId)?.priceExtra ?? 0), 0);
    return Math.round((comboPick.combo.basePrice + extras) * 100) / 100;
  };
  const confirmCombo = () => {
    if (!comboPick) return;
    const choiceIds = Object.values(comboPick.sel);
    if (!choiceIds.length) return setComboPick(null);
    setComboCart((prev) => [...prev, { comboId: comboPick.combo.id, name: comboPick.combo.name, price: comboPickPrice(), choiceIds }]);
    setComboPick(null);
  };

  // ─── Bill management ───
  const loadBill = useCallback((order: any) => {
    setLoadedOrderId(order.id);
    setCart([]);
    setCoupon(null);
    setCouponCode(order.couponCode || '');
    setDiscountRuleId(order.discountRuleId ?? '');
    setTenders([]);
    setTenderAmount('');
    setChannel(order.channel || 'DINE_IN');
    setTableName(order.tableName || '');
    setShipLater(order.shipLater || false);
  }, []);
  const closeBill = useCallback(() => {
    setLoadedOrderId(null);
    setTenders([]);
    setTenderAmount('');
    setCouponCode('');
    setShipLater(false);
  }, []);

  // Stable callback so CartPanel's React.memo is actually effective. Passing an
  // inline `() => setPosView('floor')` created a new function every render,
  // forcing CartPanel (and its numpad/cart subtree) to re-render needlessly.
  const switchToFloor = useCallback(() => setPosView('floor'), []);

  // ─── Floor plan table open ───
  const openTableOrder = useCallback(async (table: any) => {
    try {
      const tName = table.name;
      const tableOrders = (pendingBills || []).filter((o: any) => o.tableName === tName);
      if (tableOrders.length === 0) {
        const { data } = await api.post('/sales/orders', { branchId, channel: 'DINE_IN', tableName: tName });
        setLoadedOrderId(data.data.id);
        setTableName(tName);
        qc.invalidateQueries({ queryKey: ['pos-pending'] });
        setPosView('order');
      } else if (tableOrders.length === 1) {
        loadBill(tableOrders[0]);
        setPosView('order');
      } else {
        setTableOrderPicker({ tableName: tName, orders: tableOrders });
      }
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to open table'); }
  }, [pendingBills, branchId, qc, loadBill]);

  const addOrderToTable = useCallback(async (tName: string) => {
    try {
      const { data } = await api.post('/sales/orders', { branchId, channel: 'DINE_IN', tableName: tName });
      setLoadedOrderId(data.data.id);
      setTableName(tName);
      setTableOrderPicker(null);
      qc.invalidateQueries({ queryKey: ['pos-pending'] });
      setPosView('order');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to create order'); }
  }, [branchId, qc]);


  // ─── Checkout (charge) ───
  const charge = useMutation({
    mutationFn: async () => {
      if (!branchId) throw new Error('Select a branch first');
      if (!lines.length && !comboCart.length) throw new Error('Cart is empty');
      if (!tenders.length) throw new Error('Add at least one payment');
      if (paid + 1e-6 < total) throw new Error(`Payment is short by ${remaining.toFixed(2)}`);
      let orderId: number;
      if (mode === 'existing') {
        orderId = loadedOrderId as number;
      } else {
        const idempotencyKey = `pos-${branchId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const { data: created } = await api.post('/sales/orders', {
          branchId, channel,
          tableName: (channel === 'DINE_IN' && tableName) ? tableName : (channel === 'DELIVERY' || channel === 'TAKEAWAY') ? (tableName || undefined) : undefined,
          customerId: customer?.id, couponCode: coupon?.code, presetId,
          deliveryPlatformId: isAggregatorChannel(channel) ? deliveryPlatformId : undefined,
          platformRef: isAggregatorChannel(channel) ? (platformRef || undefined) : undefined,
          idempotencyKey, shipLater: shipLater || undefined,
          items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, modifiers: l.modifiers })),
          combos: comboCart.map((c) => ({ comboId: c.comboId, choiceIds: c.choiceIds })),
          tip: tipAmount > 0 ? tipAmount : undefined,
        });
        orderId = created.data.id;
        try {
          const fireRes = await api.post(`/sales/orders/${orderId}/courses/1/fire`);
          if (fireRes.data?.data) printKot(fireRes.data.data, { splitByStation: true });
        } catch { toast('Note: Kitchen fire pending', { icon: '⚠️' }); }
      }
      for (const ten of tenders) {
        if (ten.method === 'LOYALTY_CARD' && ten.loyaltyCode) {
          await api.post(`/loyalty/cards/${encodeURIComponent(ten.loyaltyCode)}/redeem`, { amount: ten.amount });
          await api.post(`/sales/orders/${orderId}/payments`, { method: 'WALLET', amount: ten.amount, reference: `loyalty:${ten.loyaltyCode}` });
          continue;
        }
        if (ten.method === 'TERMINAL' && ten.terminalId) {
          await api.post(`/payment-terminals/${ten.terminalId}/capture`, { orderId, amount: ten.amount });
          continue;
        }
        await api.post(`/sales/orders/${orderId}/payments`, { method: ten.method, amount: ten.amount, ...(ten.method === 'GIFT_CARD' ? { giftCardCode: ten.giftCardCode } : {}) });
      }
      const { data: done } = await api.post(`/sales/orders/${orderId}/complete`, {});
      return done.data;
    },
    onSuccess: (order) => {
      toast.success(`Sale ${order.orderNo} completed`);
      setLastReceipt(order);
      printReceipt(order, businessInfo);
      setCart([]); setComboCart([]); setTableName(''); setPlatformRef(''); setPresetId(undefined);
      setCouponCode(''); setCoupon(null); setTenderAmount(''); setTenders([]); setTipAmount(0);
      setLoadedOrderId(null); setCustomer(null); setCustomerSearch(''); setShipLater(false);
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['kds-board'] });
      qc.invalidateQueries({ queryKey: ['pos-pending'] });
      qc.invalidateQueries({ queryKey: ['waiter-tables'] });
      qc.invalidateQueries({ queryKey: ['waiter-active-orders'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Sale failed'),
  });

  // ─── POS Keyboard Shortcuts ───
  usePosKeyboard({
    onPay: () => setShowPayment(true),
    onHold: () => { if (mode === 'existing' && loadedOrderId) { api.patch(`/sales/orders/${loadedOrderId}/hold`, {}).then(() => { toast.success('Order held'); setLoadedOrderId(null); setCart([]); }); } },
    onPrint: () => { if (lastReceipt) printReceipt(lastReceipt, businessInfo); },
    onClear: () => { setCart([]); setComboCart([]); setLoadedOrderId(null); setLastReceipt(null); setShowPayment(false); },
    onOrders: () => setPosView('orders'),
    onEscape: () => { if (showPayment) setShowPayment(false); else if (lastReceipt) setLastReceipt(null); },
    onQtyUp: () => {},
    onQtyDown: () => {},
  });


  // ─── RENDER ───
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <OfflineBanner />
      {/* ─── TOP NAV BAR ─── */}
      <div className="bg-gray-900 text-white px-4 py-2 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => window.location.replace('/')} className="text-gray-400 hover:text-white transition text-lg" title="Back to Dashboard">✕</button>
        <span className="font-bold text-sm whitespace-nowrap">{activeBranch?.name || 'POS'}</span>
        <div className="flex gap-1 ms-4">
          <button onClick={() => setPosView('floor')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${posView === 'floor' ? 'bg-primary text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}>🏠 Floor Plan</button>
          <button onClick={() => setPosView('order')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${posView === 'order' ? 'bg-primary text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}>🛒 Order</button>
          <button onClick={() => setPosView('orders')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${posView === 'orders' ? 'bg-primary text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}>📋 Orders {pendingBills?.length ? `(${pendingBills.length})` : ''}</button>
        </div>
        <div className="ms-auto flex items-center gap-2 text-xs text-gray-400">
          {branchId && <button onClick={() => window.open(`/display/${branchId}`, '_blank')} className="px-2 py-1 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition" title="Open Customer Display">🖥️</button>}
          <button onClick={() => setShowPinSwitch(true)} className="px-2 py-1 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition" title="Switch User">👤 {user?.firstName}</button>
          {!isOnline && <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">OFFLINE{pendingCount > 0 ? ` (${pendingCount})` : ''}</span>}
          {isSyncing && <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">SYNCING...</span>}
        </div>
      </div>
      <div className="flex-shrink-0"><PosSessionBar branchId={branchId} businessInfo={businessInfo} /></div>

      {/* ─── FLOOR PLAN VIEW ─── */}
      {posView === 'floor' && (
        <FloorPlanView
          branchId={branchId}
          pendingBills={pendingBills || []}
          canEditFloor={canEditFloor}
          onOpenTable={openTableOrder}
          onNewOrder={() => { setTableName(''); setPosView('order'); }}
        />
      )}

      {/* ─── ORDERS LIST VIEW ─── */}
      {posView === 'orders' && (
        <OrdersListView
          branchId={branchId}
          loadedOrderId={loadedOrderId}
          onLoadBill={loadBill}
          onNewOrder={() => { closeBill(); setTableName(''); setChannel('DINE_IN'); setPresetId(undefined); setCoupon(null); setCouponCode(''); setPosView('order'); }}
          onSwitchToOrder={() => setPosView('order')}
        />
      )}


      {/* ─── ORDER VIEW ─── */}
      {posView === 'order' && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* New order / table context bar */}
          <div className="flex items-center gap-2 px-4 pt-3 pb-1">
            <button onClick={() => { closeBill(); setTableName(''); setChannel('DINE_IN'); setPresetId(undefined); setCoupon(null); setCouponCode(''); }}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">+ New Order</button>
            {channel === 'DINE_IN' && !tableName && (
              <button onClick={() => setPosView('floor')} className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 dark:text-amber-400 text-xs font-medium">🪑 Select Table</button>
            )}
            {tableName && channel === 'DINE_IN' && (
              <span className="text-xs text-gray-500">Table: <strong>{tableName}</strong>
                <button onClick={() => setPosView('floor')} className="ms-2 text-primary hover:underline">Change</button>
              </span>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden p-4">
            {/* On mobile: show products full-width, cart accessible via bottom sheet/tab */}
            {/* On desktop/tablet: side-by-side layout */}
            <div className="lg:col-span-2 overflow-hidden flex flex-col min-h-0">
              <ProductCatalog onProductSelect={onProduct} />
            </div>

            {/* Cart Panel — on mobile it's a fixed bottom bar with expand, on desktop it's the right column */}
            <div className="hidden lg:flex lg:flex-col min-h-0">
              <CartPanel
              branchId={branchId} mode={mode} lines={lines} comboCart={comboCart}
              cart={cart} setCart={setCart} setComboCart={setComboCart}
              channel={channel} setChannel={setChannel}
              tableName={tableName} setTableName={setTableName}
              deliveryPlatformId={deliveryPlatformId} setDeliveryPlatformId={setDeliveryPlatformId}
              platformRef={platformRef} setPlatformRef={setPlatformRef}
              presetId={presetId} setPresetId={setPresetId}
              customer={customer} setCustomer={setCustomer}
              customerSearch={customerSearch} setCustomerSearch={setCustomerSearch}
              couponCode={couponCode} setCouponCode={setCouponCode}
              coupon={coupon} setCoupon={setCoupon}
              discountRuleId={discountRuleId} setDiscountRuleId={setDiscountRuleId}
              tipAmount={tipAmount} setTipAmount={setTipAmount}
              loadedOrderId={loadedOrderId} setLoadedOrderId={setLoadedOrderId}
              loadedOrder={loadedOrder} subtotal={subtotal} total={total}
              posSession={posSession} businessInfo={businessInfo}
              lastReceipt={lastReceipt} setLastReceipt={setLastReceipt}
              showPayment={showPayment} setShowPayment={setShowPayment}
              onSwitchToFloor={switchToFloor} onCloseBill={closeBill}
              refetchLoaded={refetchLoaded} canRefund={canRefund}
              shipLater={shipLater} setShipLater={setShipLater}
            />
            </div>

            {/* Mobile bottom cart bar — shows on phones (lg:hidden) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-2xl safe-area-bottom">
              {/* Expandable cart drawer (slides up when tapped) */}
              {mobileCartOpen && (
                <div className="max-h-[60vh] overflow-y-auto px-4 pt-3 pb-1 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Order Items</span>
                    <button onClick={() => setMobileCartOpen(false)} className="text-xs text-gray-400 px-2 py-1">▼ Close</button>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {lines.map((l, i) => (
                      <div key={l.itemId ?? `${l.productId}-${i}`} className="flex items-center justify-between py-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{l.name}</div>
                          {l.modifiers && l.modifiers.length > 0 && (
                            <div className="text-[10px] text-gray-500">{l.modifiers.filter((m: any) => m?.name).map((m: any) => m.name).join(', ')}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ms-2">
                          <button onClick={() => {
                            if (mode === 'new') {
                              setCart(prev => prev.flatMap((c, idx) => idx === i ? (c.quantity <= 1 ? [] : [{ ...c, quantity: c.quantity - 1 }]) : [c]));
                            } else if (l.itemId && l.quantity > 1) {
                              api.patch(`/sales/orders/${loadedOrderId}/items/${l.itemId}`, { quantity: l.quantity - 1 }).then(() => refetchLoaded());
                            }
                          }} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-base font-bold flex items-center justify-center active:scale-90">−</button>
                          <span className="text-sm font-bold w-5 text-center">{l.quantity}</span>
                          <button onClick={() => {
                            if (mode === 'new') {
                              setCart(prev => prev.map((c, idx) => idx === i ? { ...c, quantity: c.quantity + 1 } : c));
                            } else if (l.itemId) {
                              api.patch(`/sales/orders/${loadedOrderId}/items/${l.itemId}`, { quantity: l.quantity + 1 }).then(() => refetchLoaded());
                            }
                          }} className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-base font-bold flex items-center justify-center active:scale-90">+</button>
                          <span className="text-sm font-semibold w-14 text-end">{(l.unitPrice * l.quantity).toFixed(2)}</span>
                          <button onClick={() => {
                            if (mode === 'new') {
                              setCart(prev => prev.filter((_, idx) => idx !== i));
                            } else if (l.itemId) {
                              api.patch(`/sales/orders/${loadedOrderId}/items/${l.itemId}`, { isVoided: true, voidReason: 'Removed from mobile' }).then(() => refetchLoaded());
                            }
                          }} className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 text-xs font-bold flex items-center justify-center active:scale-90">✕</button>
                        </div>
                      </div>
                    ))}
                    {!lines.length && <p className="text-sm text-gray-400 text-center py-4">No items yet — tap products to add</p>}
                  </div>
                </div>
              )}
              {/* Bottom summary bar (always visible) */}
              <div className="flex items-center gap-2 px-4 py-2.5">
                <button onClick={() => setMobileCartOpen(!mobileCartOpen)} className="flex-1 text-left active:scale-[0.98]">
                  <div className="text-xs text-gray-500">{lines.length} item{lines.length !== 1 ? 's' : ''} {mobileCartOpen ? '▼' : '▲ tap to view'}</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{total.toFixed(2)}</div>
                </button>
                <button onClick={() => setShowPayment(true)} disabled={!lines.length || !posSession}
                  className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-50 active:scale-[0.97] transition-transform">
                  💳 Pay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ─── PAYMENT SCREEN ─── */}
      {showPayment && (
        <PaymentScreen
          total={total} subtotal={subtotal} cartSubtotal={cartSubtotal}
          tenders={tenders} setTenders={setTenders}
          tipAmount={tipAmount} setTipAmount={setTipAmount}
          activeCustomer={mode === 'existing' ? loadedOrder?.customer : customer}
          loadedOrderId={loadedOrderId} loadedOrder={loadedOrder} mode={mode}
          businessInfo={businessInfo} lines={lines} comboCart={comboCart}
          onClose={() => setShowPayment(false)}
          onCharge={() => charge.mutate()}
          isCharging={charge.isPending}
          lastReceipt={lastReceipt}
          refetchLoaded={refetchLoaded}
        />
      )}

      {/* ─── MODALS ─── */}
      {/* Modifier modal */}
      {modProduct && (
        <ModifierModal
          product={modProduct.product}
          groups={modProduct.groups}
          onClose={() => setModProduct(null)}
          onConfirm={(mods, delta) => { addLine(modProduct.product, (modProduct.product.salePrice ?? modProduct.product.costPrice ?? 0) + delta, mods); setModProduct(null); }}
        />
      )}

      {/* Variant picker */}
      {variantProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setVariantProduct(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-semibold mb-3">{variantProduct.product.name} — {t('pos.pickVariant')}</div>
            <div className="space-y-2">
              {variantProduct.variants.map((v: any) => {
                const base = variantProduct.product.salePrice ?? variantProduct.product.costPrice ?? 0;
                return (
                  <button key={v.id} onClick={() => pickVariant(v)} className="w-full flex justify-between items-center rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                    <span>{v.sku}</span><span className="font-semibold">{(base + (v.priceExtra ?? 0)).toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setVariantProduct(null)} className="mt-3 w-full py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {/* Combo picker */}
      {comboPick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setComboPick(null)}>
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 p-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-semibold mb-3">🍱 {comboPick.combo.name}</div>
            <div className="space-y-3">
              {(comboPick.combo.lines || []).map((l: any) => (
                <div key={l.id}>
                  <div className="text-xs text-gray-500 mb-1">{l.name}</div>
                  <div className="space-y-1">
                    {(l.choices || []).map((ch: any) => (
                      <label key={ch.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm cursor-pointer">
                        <span className="flex items-center gap-2"><input type="radio" name={`combo-line-${l.id}`} checked={comboPick.sel[l.id] === ch.id} onChange={() => setComboPick({ ...comboPick, sel: { ...comboPick.sel, [l.id]: ch.id } })} />{ch.product?.name ?? `#${ch.productId}`}</span>
                        {ch.priceExtra ? <span className="text-xs text-gray-400">+{Number(ch.priceExtra).toFixed(2)}</span> : null}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="font-semibold">{comboPickPrice().toFixed(2)}</span>
              <div className="flex gap-2">
                <button onClick={() => setComboPick(null)} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">{t('common.cancel')}</button>
                <button onClick={confirmCombo} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">{t('common.add')}</button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Table order picker */}
      {tableOrderPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setTableOrderPicker(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-1">{t('pos.tableOrders')}</h3>
            <p className="text-xs text-gray-500 mb-3">{tableOrderPicker.tableName} — {tableOrderPicker.orders.length} {t('pos.activeOrders')}</p>
            <div className="space-y-2 mb-4 max-h-[50vh] overflow-y-auto">
              {tableOrderPicker.orders.map((o: any) => (
                <button key={o.id} onClick={() => { loadBill(o); setTableOrderPicker(null); setPosView('order'); }}
                  className="w-full text-left px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5 transition">
                  <div className="flex justify-between items-center"><span className="text-sm font-medium">{o.orderNo.slice(-6)}</span><span className="text-sm font-bold">{Number(o.total).toFixed(2)}</span></div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{new Date(o.createdAt).toLocaleTimeString()} · {o.items?.length ?? 0} items · {o.status}</div>
                </button>
              ))}
            </div>
            <button onClick={() => addOrderToTable(tableOrderPicker.tableName)} className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold">+ {t('pos.newOrderForTable')}</button>
          </div>
        </div>
      )}

      {/* Batch selection drawer (Phase 4) */}
      {batchDrawer && (
        <BatchSelectionDrawer
          product={batchDrawer.product}
          batches={batchDrawer.batches}
          onSelect={(batch) => {
            const p = batchDrawer.product;
            const label = batch.batchNumber || '';
            addLine(p, p.salePrice ?? p.costPrice ?? 0, label ? [{ optionId: -1, name: `Lot: ${label}`, priceDelta: 0 }] as any : undefined);
            setBatchDrawer(null);
          }}
          onClose={() => setBatchDrawer(null)}
        />
      )}

      {/* PIN Switch */}
      <PinSwitchModal open={showPinSwitch} onClose={() => setShowPinSwitch(false)} onSwitched={() => window.location.reload()} branchId={branchId} />

      {/* Forced POS Closing Popup */}
      {sessionBlocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">POS Session Still Open</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Please close your POS session (count your cash drawer) before navigating away.</p>
            <div className="flex gap-3">
              <button onClick={sessionCancel} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm">Stay & Close Session</button>
              <button onClick={sessionProceed} className="flex-1 py-2.5 rounded-xl border border-red-300 text-red-600 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-900/20">Leave Anyway</button>
            </div>
          </div>
        </div>
      )}

      <PromptDialog />
      <ConfirmDialog />
    </div>
  );
}
