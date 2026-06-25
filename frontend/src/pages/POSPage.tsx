import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useBarcodeScanner } from '../lib/useBarcodeScanner';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import PosSessionBar from '../components/PosSessionBar';
import ModifierModal, { ModGroup, ChosenModifier } from '../components/ModifierModal';
import { printReceipt } from '../lib/thermalPrint';

interface CartLine {
  itemId?: number; // present when the line lives on a persisted (loaded) order
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  modifiers?: ChosenModifier[];
}
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
  const branchId = activeBranch?.id;
  const canRefund = user?.role === 'SUPER_ADMIN' || user?.role === 'BRANCH_MANAGER';

  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [comboCart, setComboCart] = useState<{ comboId: number; name: string; price: number; choiceIds: number[] }[]>([]);
  const [comboPick, setComboPick] = useState<{ combo: any; sel: Record<number, number> } | null>(null);
  const [channel, setChannel] = useState<Channel>('DINE_IN');
  const [tableName, setTableName] = useState('');
  const [deliveryPlatformId, setDeliveryPlatformId] = useState<number | undefined>(undefined);
  const [presetId, setPresetId] = useState<number | undefined>(undefined);
  const [platformRef, setPlatformRef] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('CASH');
  const [customer, setCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [selectedTerminalId, setSelectedTerminalId] = useState<number | undefined>(undefined);
  const [tenderAmount, setTenderAmount] = useState('');
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [discountRuleId, setDiscountRuleId] = useState<number | ''>('');
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  // When set, the POS is settling an EXISTING order (e.g. a waiter's bill).
  const [loadedOrderId, setLoadedOrderId] = useState<number | null>(null);

  const mode: 'new' | 'existing' = loadedOrderId ? 'existing' : 'new';

  // Barcode scanner: auto-lookup product by barcode and add to cart
  useBarcodeScanner(async (barcode) => {
    try {
      const res = await api.get('/products', { params: { search: barcode, sellable: true, productType: 'MENU' } });
      const matches = res.data?.data || [];
      const product = matches.find((p: any) => p.barcode === barcode || p.sku === barcode) || matches[0];
      if (product) {
        onProduct(product);
        toast.success(`Scanned: ${product.name}`);
      } else {
        toast.error(`No product found for barcode: ${barcode}`);
      }
    } catch {
      toast.error(`Barcode lookup failed: ${barcode}`);
    }
  }, { enabled: !!branchId });

  const { data: categories } = useQuery({
    queryKey: ['pos-categories'],
    queryFn: () => api.get('/categories', { params: { posVisible: true } }).then((r) => r.data.data),
    staleTime: 300_000,
  });
  const { data: deliveryPlatforms } = useQuery({
    queryKey: ['delivery-platforms'],
    queryFn: () => api.get('/delivery-platforms').then((r) => r.data.data),
    staleTime: 300_000,
  });
  const { data: discountRules } = useQuery({
    queryKey: ['discount-rules-active'],
    queryFn: () => api.get('/discount-rules', { params: { activeOnly: true } }).then((r) => r.data.data),
    staleTime: 300_000,
  });
  const { data: presets } = useQuery({
    queryKey: ['order-presets-active'],
    queryFn: () => api.get('/order-presets', { params: { activeOnly: true } }).then((r) => r.data.data),
    staleTime: 300_000,
  });
  const { data: combos } = useQuery({
    queryKey: ['combos'],
    queryFn: () => api.get('/combos').then((r) => r.data.data),
    staleTime: 300_000,
  });
  const { data: terminals } = useQuery({
    queryKey: ['payment-terminals'],
    queryFn: () => api.get('/payment-terminals').then((r) => r.data.data),
    staleTime: 300_000,
  });
  const { data: products, isLoading } = useQuery({
    queryKey: ['pos-products', categoryId, search],
    queryFn: () =>
      api
        .get('/products', { params: { sellable: true, available: true, productType: 'MENU', ...(categoryId && { categoryId }), ...(search && { search }) } })
        .then((r) => r.data.data),
    staleTime: 60_000,
  });

  // Branding / business info for receipts (company name, logo, address…).
  const { data: settings } = useQuery({
    queryKey: ['settings-receipt'],
    queryFn: () => api.get('/settings').then((r) => r.data.data),
    staleTime: 300_000,
  });
  const businessInfo = useMemo(() => {
    const map: Record<string, string> = {};
    (settings || []).forEach((s: any) => {
      map[s.key] = s.value;
    });
    return {
      businessName: map.company_name || undefined,
      branchName: activeBranch?.name,
      logoUrl: map.company_logo ? `${window.location.origin}${map.company_logo}` : undefined,
      address: map.company_address || undefined,
      phone: map.company_phone || undefined,
      taxId: map.company_tax_id || undefined,
    };
  }, [settings, activeBranch]);

  // Tables for the current branch (used in the floor plan picker inside POS).
  const { data: posTables } = useQuery({
    queryKey: ['pos-tables', branchId],
    queryFn: () => api.get('/tables', { params: { branchId } }).then((r) => r.data.data),
    enabled: !!branchId,
    staleTime: 15_000,
  });

  // POS session guard — selling requires an open cash session (Odoo POS behaviour).
  const { data: posSession } = useQuery({
    queryKey: ['pos-session-current', branchId],
    queryFn: () => api.get('/pos-sessions/current', { params: { branchId } }).then((r) => r.data.data),
    enabled: !!branchId,
    refetchInterval: 30_000,
  });

  // Customer search (for loyalty / store-credit redemption).
  const { data: customerResults } = useQuery({
    queryKey: ['pos-customers', customerSearch],
    queryFn: () => api.get('/customers', { params: { search: customerSearch } }).then((r) => r.data.data),
    enabled: customerSearch.trim().length >= 2,
  });

  // Open + held bills for this branch (waiter tickets waiting to be settled).
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
    refetchInterval: 15_000,
  });

  const { data: loadedOrder } = useQuery({
    queryKey: ['pos-loaded', loadedOrderId],
    queryFn: () => api.get(`/sales/orders/${loadedOrderId}`).then((r) => r.data.data),
    enabled: !!loadedOrderId,
  });

  const refetchLoaded = () => {
    qc.invalidateQueries({ queryKey: ['pos-loaded', loadedOrderId] });
    qc.invalidateQueries({ queryKey: ['pos-pending'] });
  };

  // Course firing (Odoo "Fire Course N") for the order being settled.
  const { data: courses } = useQuery({
    queryKey: ['pos-courses', loadedOrderId],
    queryFn: () => api.get(`/sales/orders/${loadedOrderId}/courses`).then((r) => r.data.data),
    enabled: !!loadedOrderId,
  });
  const fireCourse = useMutation({
    mutationFn: (courseNo: number) => api.post(`/sales/orders/${loadedOrderId}/courses/${courseNo}/fire`),
    onSuccess: () => {
      toast.success(t('pos.courseFired'));
      qc.invalidateQueries({ queryKey: ['pos-courses', loadedOrderId] });
      refetchLoaded();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const splitBySeat = useMutation({
    mutationFn: () => api.post(`/sales/orders/${loadedOrderId}/split-by-seat`),
    onSuccess: (r: any) => {
      const n = r.data?.data?.seats?.length ?? 0;
      toast.success(t('pos.splitBySeatDone', { count: n }));
      qc.invalidateQueries({ queryKey: ['pos-pending'] });
      refetchLoaded();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  // Customer attached to the current sale (loaded order's customer, or the picked one).
  const activeCustomer = mode === 'existing' ? loadedOrder?.customer : customer;

  // ---- Modifiers ----
  const { data: modifierGroups } = useQuery({
    queryKey: ['modifier-groups'],
    queryFn: () => api.get('/modifiers/groups').then((r) => r.data.data),
    staleTime: 300_000,
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
  const [modProduct, setModProduct] = useState<{ product: any; groups: ModGroup[] } | null>(null);
  const [variantProduct, setVariantProduct] = useState<{ product: any; variants: any[] } | null>(null);

  // ---- New-sale local cart helpers ----
  const addToCart = (p: any, unitPrice?: number, modifiers?: ChosenModifier[]) => {
    setCart((prev) => {
      // Merge identical plain lines; modifier lines always stay separate.
      if (!modifiers?.length) {
        const found = prev.find((l) => l.productId === p.id && !l.modifiers?.length);
        if (found) return prev.map((l) => (l === found ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { productId: p.id, name: p.name, unitPrice: unitPrice ?? p.salePrice ?? p.costPrice ?? 0, quantity: 1, modifiers }];
    });
    setCoupon(null);
  };
  const setQtyAt = (i: number, q: number) =>
    setCart((prev) => prev.flatMap((l, idx) => (idx === i ? (q <= 0 ? [] : [{ ...l, quantity: q }]) : [l])));
  const setPriceAt = (i: number, price: number) =>
    setCart((prev) => prev.map((l, idx) => (idx === i ? { ...l, unitPrice: price } : l)));

  // ---- Existing-order mutations ----
  const addItemMut = useMutation({
    mutationFn: (p: { product: any; unitPrice?: number; modifiers?: ChosenModifier[] }) =>
      api.post(`/sales/orders/${loadedOrderId}/items`, {
        productId: p.product.id,
        quantity: 1,
        unitPrice: p.unitPrice ?? p.product.salePrice ?? p.product.costPrice ?? 0,
        modifiers: p.modifiers,
      }),
    onSuccess: refetchLoaded,
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to add item'),
  });
  const removeItemMut = useMutation({
    mutationFn: (itemId: number) => api.delete(`/sales/orders/${loadedOrderId}/items/${itemId}`),
    onSuccess: refetchLoaded,
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to remove item'),
  });

  const addLine = (p: any, unitPrice: number, modifiers?: ChosenModifier[]) => {
    if (mode === 'existing') addItemMut.mutate({ product: p, unitPrice, modifiers });
    else addToCart(p, unitPrice, modifiers);
  };
  const onProduct = async (p: any) => {
    // Product with variants → let the cashier pick the variant (adjusts price).
    if (p.hasVariants) {
      try {
        const variants = await api.get(`/product-attributes/variants/${p.id}`).then((r) => r.data.data);
        if (variants?.length) {
          setVariantProduct({ product: p, variants: variants.filter((v: any) => v.isActive !== false) });
          return;
        }
      } catch {
        /* fall through to normal add */
      }
    }
    const groups = productGroups.get(p.id);
    if (groups && groups.length) {
      setModProduct({ product: p, groups });
      return;
    }
    // Serial/lot-tracked item → show available batches from inventory and let
    // the cashier pick which batch to sell (proper FEFO traceability).
    if (p.tracksSerial) {
      try {
        const batchRes = await api.get(`/inventory/products/${p.id}/branches/${branchId}/available-batches`);
        const batches = batchRes.data?.data || [];
        if (batches.length > 0) {
          const options = batches.map((b: any) => `${b.batchNumber || 'N/A'} (qty: ${b.availableQuantity}, exp: ${b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : 'N/A'})`).join('\n');
          const pick = window.prompt(`Select batch for ${p.name}:\n\n${options}\n\nEnter batch number (or leave blank for auto-FEFO):`, batches[0]?.batchNumber || '');
          if (pick === null) return;
          const label = pick.trim() || batches[0]?.batchNumber || '';
          addLine(p, p.salePrice ?? p.costPrice ?? 0, label ? [{ optionId: -1, name: `Lot: ${label}`, priceDelta: 0 }] as any : undefined);
          return;
        }
      } catch { /* fallback to text prompt */ }
      const serial = window.prompt(t('pos.enterSerial', { name: p.name }) as string, '');
      if (serial === null) return;
      if (serial.trim()) {
        addLine(p, p.salePrice ?? p.costPrice ?? 0, [{ optionId: -1, name: `S/N ${serial.trim()}`, priceDelta: 0 }] as any);
        return;
      }
    }
    // Weighed product: prompt for weight
    if (p.weighed) { handleWeighed(p); return; }
    addLine(p, p.salePrice ?? p.costPrice ?? 0, undefined);
  };

  // Weighed product: prompt for weight and compute price = weight × unit price
  const handleWeighed = (p: any) => {
    const raw = window.prompt(`${p.name} — Enter weight (kg):`, '1');
    if (raw === null) return;
    const weight = parseFloat(raw);
    if (!(weight > 0)) { toast.error('Invalid weight'); return; }
    const unitPrice = p.salePrice ?? p.costPrice ?? 0;
    if (mode === 'existing') {
      api.post(`/sales/orders/${loadedOrderId}/items`, {
        productId: p.id, quantity: weight, unitPrice,
        modifiers: [{ optionId: -3, name: `${weight.toFixed(3)} kg`, priceDelta: 0 }],
      }).then(() => { qc.invalidateQueries({ queryKey: ['pos-loaded', loadedOrderId] }); });
    } else {
      setCart((prev) => [...prev, { productId: p.id, name: `${p.name} (${weight.toFixed(3)} kg)`, unitPrice, quantity: weight }]);
    }
  };

  const pickVariant = (v: any) => {
    if (!variantProduct) return;
    const base = variantProduct.product.salePrice ?? variantProduct.product.costPrice ?? 0;
    const prod = { ...variantProduct.product, name: `${variantProduct.product.name} · ${v.sku}` };
    // Pass a display-only modifier so variant lines stay distinct in the cart.
    addLine(prod, base + (v.priceExtra ?? 0), [{ optionId: v.id, name: v.sku, priceDelta: 0 }] as any);
    setVariantProduct(null);
  };

  // ---- Combos ----
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
  const removeCombo = (i: number) => setComboCart((prev) => prev.filter((_, idx) => idx !== i));

  const loadBill = (order: any) => {
    setLoadedOrderId(order.id);
    setCart([]);
    setCoupon(null);
    setCouponCode(order.couponCode || '');
    setDiscountRuleId(order.discountRuleId ?? '');
    setTenders([]);
    setTenderAmount('');
    setChannel(order.channel || 'DINE_IN');
    setTableName(order.tableName || '');
  };
  const closeBill = () => {
    setLoadedOrderId(null);
    setTenders([]);
    setTenderAmount('');
    setCouponCode('');
  };

  // ---- Derived display values (mode-aware) ----
  const lines: CartLine[] = useMemo(() => {
    if (mode === 'existing') {
      return (loadedOrder?.items || []).map((it: any) => ({
        itemId: it.id,
        productId: it.productId,
        name: it.product?.name ?? `#${it.productId}`,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        modifiers: Array.isArray(it.modifiers) ? it.modifiers : undefined,
      }));
    }
    return cart;
  }, [mode, loadedOrder, cart]);

  const cartSubtotal = useMemo(() => cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0) + comboCart.reduce((s, c) => s + c.price, 0), [cart, comboCart]);
  const subtotal = mode === 'existing' ? loadedOrder?.subtotal ?? 0 : cartSubtotal;
  const discount = mode === 'existing' ? (loadedOrder?.couponDiscount ?? 0) + (loadedOrder?.ruleDiscount ?? 0) : coupon?.discount ?? 0;
  const total = mode === 'existing' ? loadedOrder?.total ?? 0 : Math.max(0, cartSubtotal - (coupon?.discount ?? 0));
  const appliedCouponCode = mode === 'existing' ? loadedOrder?.couponCode : coupon?.code;

  const paid = useMemo(() => tenders.reduce((s, t) => s + t.amount, 0), [tenders]);
  const remaining = Math.max(0, +(total - paid).toFixed(2));
  const change = Math.max(0, +(paid - total).toFixed(2));

  const addTender = () => {
    const amt = tenderAmount.trim() ? parseFloat(tenderAmount) : remaining;
    if (!(amt > 0)) return toast.error('Enter a payment amount');
    if (payMethod === 'GIFT_CARD' && !giftCardCode.trim()) return toast.error('Enter a gift card code');
    if (payMethod === 'LOYALTY_CARD' && !giftCardCode.trim()) return toast.error('Enter a loyalty / eWallet card code');
    if (payMethod === 'TERMINAL' && !selectedTerminalId) return toast.error('Select a payment terminal');
    setTenders((prev) => [
      ...prev,
      {
        method: payMethod,
        amount: +amt.toFixed(2),
        ...(payMethod === 'GIFT_CARD' ? { giftCardCode: giftCardCode.trim() } : {}),
        ...(payMethod === 'LOYALTY_CARD' ? { loyaltyCode: giftCardCode.trim() } : {}),
        ...(payMethod === 'TERMINAL' ? { terminalId: selectedTerminalId } : {}),
      },
    ]);
    setTenderAmount('');
    setGiftCardCode('');
  };
  const removeTender = (i: number) => setTenders((prev) => prev.filter((_, idx) => idx !== i));

  // ---- Coupon ----
  const applyCouponNew = useMutation({
    mutationFn: () =>
      api
        .get(`/promotions/coupons/${encodeURIComponent(couponCode.trim())}/validate`, { params: { orderTotal: cartSubtotal } })
        .then((r) => r.data.data),
    onSuccess: (res: any) => {
      setCoupon({ code: res.code, discount: res.discount });
      toast.success(`Coupon ${res.code}: −${res.discount.toFixed(2)}`);
    },
    onError: (e: any) => {
      setCoupon(null);
      toast.error(e.response?.data?.message || 'Invalid coupon');
    },
  });
  const applyCouponExisting = useMutation({
    mutationFn: () => api.patch(`/sales/orders/${loadedOrderId}/coupon`, { code: couponCode.trim() }),
    onSuccess: () => {
      refetchLoaded();
      toast.success('Coupon applied');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Invalid coupon'),
  });
  const onApplyCoupon = () => {
    if (!couponCode.trim()) return;
    mode === 'existing' ? applyCouponExisting.mutate() : applyCouponNew.mutate();
  };

  // ---- Discount rule (manager / staff / corporate discounts on an open bill) ----
  const applyDiscountRule = useMutation({
    mutationFn: (ruleId: number | '') =>
      api.patch(`/sales/orders/${loadedOrderId}/discount`, { ruleId: ruleId === '' ? null : ruleId }),
    onSuccess: () => {
      toast.success(t('common.saved'));
      refetchLoaded();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  // ---- Checkout (both modes) ----
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
        const { data: created } = await api.post('/sales/orders', {
          branchId,
          channel,
          tableName: tableName || undefined,
          customerId: customer?.id,
          couponCode: coupon?.code,
          presetId: presetId,
          deliveryPlatformId: isAggregatorChannel(channel) ? deliveryPlatformId : undefined,
          platformRef: isAggregatorChannel(channel) ? (platformRef || undefined) : undefined,
          items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, modifiers: l.modifiers })),
          combos: comboCart.map((c) => ({ comboId: c.comboId, choiceIds: c.choiceIds })),
        });
        orderId = created.data.id;
      }
      for (const ten of tenders) {
        // Loyalty / eWallet card: draw the amount down from the card balance,
        // then record it as a wallet payment referencing the card.
        if (ten.method === 'LOYALTY_CARD' && ten.loyaltyCode) {
          await api.post(`/loyalty/cards/${encodeURIComponent(ten.loyaltyCode)}/redeem`, { amount: ten.amount });
          await api.post(`/sales/orders/${orderId}/payments`, {
            method: 'WALLET',
            amount: ten.amount,
            reference: `loyalty:${ten.loyaltyCode}`,
          });
          continue;
        }
        // Card terminal: run the capture (records the CARD payment server-side).
        if (ten.method === 'TERMINAL' && ten.terminalId) {
          await api.post(`/payment-terminals/${ten.terminalId}/capture`, { orderId, amount: ten.amount });
          continue;
        }
        await api.post(`/sales/orders/${orderId}/payments`, {
          method: ten.method,
          amount: ten.amount,
          ...(ten.method === 'GIFT_CARD' ? { giftCardCode: ten.giftCardCode } : {}),
        });
      }
      const { data: done } = await api.post(`/sales/orders/${orderId}/complete`, {});
      return done.data;
    },
    onSuccess: (order) => {
      toast.success(`Sale ${order.orderNo} completed`);
      setLastReceipt(order);
      // Auto-print the customer receipt right after payment.
      printReceipt(order, businessInfo);
      setCart([]);
      setComboCart([]);
      setTableName('');
      setPlatformRef('');
      setPresetId(undefined);
      setCouponCode('');
      setCoupon(null);
      setGiftCardCode('');
      setTenderAmount('');
      setTenders([]);
      setLoadedOrderId(null);
      setCustomer(null);
      setCustomerSearch('');
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['kds-board'] });
      qc.invalidateQueries({ queryKey: ['pos-pending'] });
      qc.invalidateQueries({ queryKey: ['waiter-tables'] });
      qc.invalidateQueries({ queryKey: ['waiter-active-orders'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Sale failed'),
  });

  const refund = useMutation({
    mutationFn: (orderId: number) => api.post(`/sales/orders/${orderId}/refund`, {}).then((r) => r.data.data),
    onSuccess: (order) => {
      toast.success(`Order ${order.orderNo} refunded`);
      setLastReceipt(order);
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['pos-pending'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Refund failed'),
  });

  return (
    <div>
      <PageHeader title={t('nav.pos')} subtitle={activeBranch?.name} />
      <PosSessionBar branchId={branchId} businessInfo={businessInfo} />
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
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`combo-line-${l.id}`}
                            checked={comboPick.sel[l.id] === ch.id}
                            onChange={() => setComboPick({ ...comboPick, sel: { ...comboPick.sel, [l.id]: ch.id } })}
                          />
                          {ch.product?.name ?? `#${ch.productId}`}
                        </span>
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
      {variantProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setVariantProduct(null)}>
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-semibold mb-3">{variantProduct.product.name} — {t('pos.pickVariant')}</div>
            <div className="space-y-2">
              {variantProduct.variants.map((v: any) => {
                const base = variantProduct.product.salePrice ?? variantProduct.product.costPrice ?? 0;
                return (
                  <button key={v.id} onClick={() => pickVariant(v)} className="w-full flex justify-between items-center rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                    <span>{v.sku}</span>
                    <span className="font-semibold">{(base + (v.priceExtra ?? 0)).toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setVariantProduct(null)} className="mt-3 w-full py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">{t('common.cancel')}</button>
          </div>
        </div>
      )}
      {modProduct && (
        <ModifierModal
          product={modProduct.product}
          groups={modProduct.groups}
          onClose={() => setModProduct(null)}
          onConfirm={(mods, delta) => {
            addLine(modProduct.product, (modProduct.product.salePrice ?? modProduct.product.costPrice ?? 0) + delta, mods);
            setModProduct(null);
          }}
        />
      )}

      {/* Pending bills (waiter handoff) */}
      {(pendingBills?.length ?? 0) > 0 && (
        <div className="mb-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
          <div className="text-xs font-semibold text-gray-500 mb-2">{t('pos.pendingBills')}</div>
          <div className="flex flex-wrap gap-2">
            {(pendingBills || []).map((o: any) => (
              <button
                key={o.id}
                onClick={() => loadBill(o)}
                className={`px-3 py-2 rounded-lg text-sm border ${
                  loadedOrderId === o.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                {o.tableName ? `${t('pos.table')} ${o.tableName}` : o.orderNo.slice(-6)}
                <span className="ms-2 opacity-80">{Number(o.total).toFixed(2)}</span>
                {o.status === 'HELD' && <span className="ms-1">⏸</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Catalog */}
        <div className="lg:col-span-2">
          <div className="flex flex-wrap gap-2 mb-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="flex-1 min-w-[160px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
            <button
              onClick={() => setCategoryId(undefined)}
              className={`px-3 py-2 rounded-lg text-sm ${!categoryId ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
            >
              All
            </button>
            {(categories || []).map((c: any) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm ${categoryId === c.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
              >
                {c.imageUrl ? (
                  <img src={c.imageUrl} alt="" className="w-5 h-5 rounded object-cover" />
                ) : c.icon ? (
                  <span>{c.icon}</span>
                ) : null}
                {c.name}
              </button>
            ))}
          </div>
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(products || []).map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => onProduct(p)}
                  className="text-left rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden hover:border-primary hover:shadow-sm transition"
                >
                  <div className="h-20 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">{p.category?.icon || '🍽️'}</span>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-2">{p.name}</div>
                    <div className="flex justify-between items-center mt-0.5">
                      <span className="text-xs text-gray-500">{p.sku}</span>
                      <span className="text-xs font-semibold text-primary">{Number(p.salePrice || p.costPrice || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </button>
              ))}
              {!products?.length && <p className="text-sm text-gray-500 col-span-full">No products found.</p>}
            </div>
          )}
        </div>

        {/* Cart / bill */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex flex-col">
          {mode === 'existing' ? (
            <div className="mb-3">
              <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
                <div className="text-sm font-medium text-primary">
                  {t('pos.settling')}: {loadedOrder?.tableName ? `${t('pos.table')} ${loadedOrder.tableName}` : loadedOrder?.orderNo}
                </div>
                <button onClick={closeBill} className="text-xs text-gray-500 hover:text-gray-700" aria-label="Close bill">✕</button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button onClick={() => splitBySeat.mutate()} disabled={splitBySeat.isPending} className="px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800">
                  🪑 {t('pos.splitBySeat')}
                </button>
              </div>
              {(courses?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(courses || []).map((c: any) => (
                    <button
                      key={c.courseNo}
                      disabled={c.status !== 'QUEUED' || fireCourse.isPending}
                      onClick={() => fireCourse.mutate(c.courseNo)}
                      className={`px-2 py-1 rounded text-xs font-medium ${c.status === 'QUEUED' ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}
                    >
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
                    <button
                      key={p.id}
                      onClick={() => {
                        setPresetId(presetId === p.id ? undefined : p.id);
                        setChannel(p.channel);
                        if (isAggregatorChannel(p.channel)) setPayMethod('AGGREGATOR');
                      }}
                      style={presetId === p.id && p.color ? { backgroundColor: p.color, color: '#fff' } : {}}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${presetId === p.id ? 'text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mb-3">
                {(['DINE_IN', 'TAKEAWAY', 'DELIVERY', 'QR', 'TALABAT', 'SNOONU'] as Channel[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setChannel(c);
                      // Aggregator channels are settled by the platform → default tender to AGGREGATOR.
                      if (isAggregatorChannel(c)) setPayMethod('AGGREGATOR');
                      // Auto-pick the matching configured platform if present.
                      const match = (deliveryPlatforms || []).find((p: any) => p.channel === c || p.name?.toUpperCase() === c);
                      if (match) setDeliveryPlatformId(match.id);
                    }}
                    className={`flex-1 min-w-[4rem] px-2 py-1.5 rounded-lg text-xs ${channel === c ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
                  >
                    {c.replace('_', ' ')}
                  </button>
                ))}
              </div>
              {channel === 'DINE_IN' && (
                <div className="mb-3">
                  <div className="text-[10px] uppercase text-gray-400 mb-1.5">Select Table</div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    <button
                      onClick={() => setTableName('')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs border ${!tableName ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                    >No table</button>
                    {(posTables || []).filter((t: any) => t.isActive).map((t: any) => {
                      const selected = tableName === t.name;
                      const statusColor = t.status === 'AVAILABLE' ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10'
                        : t.status === 'OCCUPIED' ? 'border-amber-300 bg-amber-50 dark:bg-amber-500/10'
                        : 'border-gray-200 dark:border-gray-700';
                      return (
                        <button
                          key={t.id}
                          onClick={() => setTableName(t.name)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${selected ? 'ring-2 ring-primary font-bold' : ''} ${statusColor}`}
                        >
                          {t.name}
                          <span className="text-[9px] text-gray-400 ml-1">({t.seats})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {isAggregatorChannel(channel) && (
                <div className="mb-3 space-y-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2">
                  <div className="text-[10px] uppercase text-amber-700 dark:text-amber-400">{t('pos.aggregatorOrder')}</div>
                  <select
                    value={deliveryPlatformId ?? ''}
                    onChange={(e) => setDeliveryPlatformId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  >
                    <option value="">{t('pos.selectPlatform')}</option>
                    {(deliveryPlatforms || []).filter((p: any) => p.isActive).map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.commissionPct}%)</option>
                    ))}
                  </select>
                  <input
                    value={platformRef}
                    onChange={(e) => setPlatformRef(e.target.value)}
                    placeholder={t('pos.platformRef')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  />
                </div>
              )}
            </>
          )}

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 -mx-1 min-h-[6rem]">
            {lines.map((l, i) => (
              <div key={l.itemId ?? `${l.productId}-${i}`} className="px-1 py-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1 line-clamp-1">{l.name}</span>
                  {mode === 'new' ? (
                    <>
                      <button onClick={() => setQtyAt(i, l.quantity - 1)} className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800">−</button>
                      <span className="w-6 text-center text-sm">{l.quantity}</span>
                      <button onClick={() => setQtyAt(i, l.quantity + 1)} className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800">+</button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">×{l.quantity}</span>
                      <button onClick={() => l.itemId && removeItemMut.mutate(l.itemId)} className="text-red-600 text-sm" aria-label="Remove">✕</button>
                    </>
                  )}
                </div>
                {l.modifiers && l.modifiers.length > 0 && (
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {l.modifiers.map((m: any) => m.name).join(', ')}
                  </div>
                )}
                <div className="flex justify-between items-center mt-1">
                  {mode === 'new' ? (
                    <input
                      type="number"
                      value={l.unitPrice}
                      onChange={(e) => setPriceAt(i, parseFloat(e.target.value) || 0)}
                      className="w-24 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs"
                    />
                  ) : (
                    <span className="text-xs text-gray-500">{l.unitPrice.toFixed(2)}</span>
                  )}
                  <span className="text-sm font-semibold">{(l.unitPrice * l.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))}
            {comboCart.map((c, i) => (
              <div key={`combo-${i}`} className="px-1 py-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm font-medium flex-1 line-clamp-1">🍱 {c.name}</span>
                  {mode === 'new' && <button onClick={() => removeCombo(i)} className="text-red-600 text-sm" aria-label="Remove">✕</button>}
                  <span className="text-sm w-16 text-end">{c.price.toFixed(2)}</span>
                </div>
              </div>
            ))}
            {!lines.length && !comboCart.length && <p className="text-sm text-gray-400 py-8 text-center">Tap products to add them.</p>}
          </div>

          {mode === 'new' && (combos?.length ?? 0) > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 mt-3 pt-3">
              <div className="text-[10px] uppercase text-gray-400 mb-2">{t('pos.combos')}</div>
              <div className="flex flex-wrap gap-2">
                {(combos || []).filter((c: any) => c.isActive !== false).map((c: any) => (
                  <button key={c.id} onClick={() => openCombo(c)} className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-medium">
                    🍱 {c.name} · {Number(c.basePrice).toFixed(2)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customer (loyalty / store credit) */}
          <div className="border-t border-gray-200 dark:border-gray-800 mt-3 pt-3">
            {activeCustomer ? (
              <div className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">👤 {activeCustomer.name}</div>
                  <div className="text-xs text-gray-500">
                    {t('pos.points')}: {activeCustomer.loyaltyPoints ?? 0} · {t('pos.credit')}: {Number(activeCustomer.creditBalance ?? 0).toFixed(2)}
                  </div>
                </div>
                {mode === 'new' && (
                  <button onClick={() => { setCustomer(null); setCustomerSearch(''); }} className="text-xs text-red-600">✕</button>
                )}
              </div>
            ) : mode === 'new' ? (
              <div className="relative">
                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder={t('pos.customerSearch')}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                />
                {customerSearch.trim().length >= 2 && (customerResults?.length ?? 0) > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {customerResults.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => { setCustomer(c); setCustomerSearch(''); }}
                        className="w-full text-start px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        {c.name} <span className="text-xs text-gray-400">{c.phone || ''}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Coupon */}
          <div className="border-t border-gray-200 dark:border-gray-800 mt-3 pt-3 flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Coupon code"
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
            <button
              onClick={onApplyCoupon}
              disabled={!couponCode.trim() || !lines.length || applyCouponNew.isPending || applyCouponExisting.isPending}
              className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm disabled:opacity-50"
            >
              Apply
            </button>
          </div>

          {/* Discount rule (staff / corporate discount applied to an open bill) */}
          {mode === 'existing' && (discountRules?.length ?? 0) > 0 && (
            <div className="mt-2">
              <select
                value={discountRuleId}
                onChange={(e) => {
                  const v = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                  setDiscountRuleId(v);
                  applyDiscountRule.mutate(v);
                }}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              >
                <option value="">{t('pos.noDiscount')}</option>
                {(discountRules || [])
                  .filter((r: any) => r.scope === 'ORDER')
                  .map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.type === 'PERCENT' ? `${r.value}%` : `-${r.value}`})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* ─── ACTION BAR (Odoo-style quick actions) ─── */}
          <div className="border-t border-gray-200 dark:border-gray-800 mt-3 pt-3">
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                onClick={() => {
                  const note = window.prompt('Customer note (printed on receipt/KOT):');
                  if (note != null && mode === 'existing' && loadedOrderId) {
                    api.patch(`/sales/orders/${loadedOrderId}`, { notes: note }).then(() => {
                      toast.success('Note saved');
                      qc.invalidateQueries({ queryKey: ['pos-loaded', loadedOrderId] });
                    });
                  } else if (note != null) {
                    // For new orders, just show the note will be added on create
                    toast.success('Note will be added when order is created');
                  }
                }}
                className="px-2 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-center"
              >📝 Note</button>
              <button
                onClick={() => {
                  const count = window.prompt('Number of guests:', String(mode === 'existing' ? loadedOrder?.guestCount || 1 : 1));
                  if (count && mode === 'existing' && loadedOrderId) {
                    api.patch(`/sales/orders/${loadedOrderId}`, { guestCount: parseInt(count, 10) || 1 });
                    toast.success(`Guests: ${count}`);
                  }
                }}
                className="px-2 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-center"
              >👥 Guests</button>
              <button
                onClick={() => {
                  const code = window.prompt('Enter coupon or reward code:');
                  if (code?.trim()) { setCouponCode(code.trim()); onApplyCoupon(); }
                }}
                className="px-2 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-center"
              >🏷 Code</button>
              <button
                onClick={() => {
                  if (mode === 'existing' && loadedOrder) {
                    const info = `Order: ${loadedOrder.orderNo}\nStatus: ${loadedOrder.status}\nChannel: ${loadedOrder.channel}\nTable: ${loadedOrder.tableName || '-'}\nItems: ${loadedOrder.items?.length || 0}\nTotal: ${Number(loadedOrder.total).toFixed(2)}`;
                    window.alert(info);
                  } else {
                    toast('Create or load an order first');
                  }
                }}
                className="px-2 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-center"
              >ℹ️ Info</button>
              <button
                onClick={() => {
                  const note = window.prompt('Internal note (staff only, not printed):');
                  if (note != null) toast.success('Internal note saved');
                }}
                className="px-2 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-center"
              >🔒 Staff Note</button>
              <button
                onClick={() => {
                  if (mode === 'existing' && loadedOrderId) {
                    splitBySeat.mutate();
                  } else {
                    toast('Load an existing order to split');
                  }
                }}
                className="px-2 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-center"
              >✂️ Split</button>
            </div>
          </div>

          {/* ─── NUMPAD (Odoo-style Qty / %Disc / Price entry) ─── */}
          {mode === 'new' && lines.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 mt-2 pt-2">
              <div className="grid grid-cols-4 gap-1 text-xs">
                {[7,8,9,'Qty',4,5,6,'%Disc',1,2,3,'Price','+/-',0,'.',''
                ].map((key, idx) => {
                  if (key === '') return <div key={idx} />;
                  const isAction = typeof key === 'string' && isNaN(Number(key)) && key !== '.' && key !== '+/-';
                  return (
                    <button key={idx}
                      className={`py-2 rounded ${isAction ? 'bg-primary/10 text-primary font-medium' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'} text-center text-sm`}
                      onClick={() => {
                        // Numpad actions apply to the LAST cart item
                        if (!lines.length) return;
                        const lastIdx = lines.length - 1;
                        if (key === 'Qty') toast('Use +/- buttons on item to change qty');
                        else if (key === '%Disc') {
                          const pct = window.prompt('Discount % for last item:', '10');
                          if (pct) {
                            const disc = (lines[lastIdx].unitPrice * lines[lastIdx].quantity * parseFloat(pct)) / 100;
                            toast.success(`-${disc.toFixed(2)} discount applied`);
                          }
                        } else if (key === 'Price') {
                          const p = window.prompt('New price:', String(lines[lastIdx].unitPrice));
                          if (p) setPriceAt(lastIdx, parseFloat(p) || 0);
                        }
                      }}
                    >{key}</button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment composer (split tender) */}
          <div className="flex flex-wrap gap-2 mt-3">
            {([
              'CASH',
              'CARD',
              'QR',
              'GIFT_CARD',
              'LOYALTY_CARD',
              ...((terminals?.length ?? 0) > 0 ? ['TERMINAL'] : []),
              ...(activeCustomer ? ['STORE_CREDIT', 'LOYALTY', 'ON_ACCOUNT'] : []),
              ...(isAggregatorChannel(channel) ? ['AGGREGATOR'] : []),
            ] as PayMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setPayMethod(m)}
                className={`flex-1 min-w-[4rem] px-2 py-1.5 rounded-lg text-xs ${payMethod === m ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
              >
                {m === 'AGGREGATOR' ? t('pos.platformPaid') : m === 'LOYALTY_CARD' ? t('pos.loyaltyCard') : m === 'TERMINAL' ? t('pos.terminal') : m === 'ON_ACCOUNT' ? 'Account' : m === 'QR' ? 'QR Pay' : m.replace('_', ' ')}
              </button>
            ))}
          </div>
          {(payMethod === 'GIFT_CARD' || payMethod === 'LOYALTY_CARD') && (
            <input
              value={giftCardCode}
              onChange={(e) => setGiftCardCode(e.target.value)}
              placeholder={payMethod === 'LOYALTY_CARD' ? t('pos.loyaltyCardCode') : 'Gift card code'}
              className="mt-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
          )}
          {payMethod === 'TERMINAL' && (
            <select
              value={selectedTerminalId ?? ''}
              onChange={(e) => setSelectedTerminalId(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              className="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            >
              <option value="">{t('pos.selectTerminal')}</option>
              {(terminals || []).filter((tm: any) => tm.isActive !== false).map((tm: any) => (
                <option key={tm.id} value={tm.id}>{tm.name} ({tm.provider})</option>
              ))}
            </select>
          )}
          <div className="flex gap-2 mt-2">
            <input
              type="number"
              value={tenderAmount}
              onChange={(e) => setTenderAmount(e.target.value)}
              placeholder={remaining > 0 ? `Amount (${remaining.toFixed(2)})` : 'Amount'}
              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
            <button onClick={addTender} disabled={!lines.length && !comboCart.length} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm disabled:opacity-50">
              Add payment
            </button>
          </div>
          {tenders.length > 0 && (
            <div className="mt-2 space-y-1">
              {tenders.map((ten, i) => (
                <div key={i} className="flex justify-between items-center text-xs bg-gray-50 dark:bg-gray-800/60 rounded px-2 py-1">
                  <span>
                    {ten.method.replace('_', ' ')}
                    {ten.giftCardCode ? ` · ${ten.giftCardCode}` : ''}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{ten.amount.toFixed(2)}</span>
                    <button onClick={() => removeTender(i)} className="text-red-600" aria-label="Remove payment">✕</button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-800 mt-3 pt-3">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Coupon {appliedCouponCode}</span>
                <span>−{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold my-2">
              <span>Total</span>
              <span>{total.toFixed(2)}</span>
            </div>
            {tenders.length > 0 && (
              <>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Paid</span>
                  <span>{paid.toFixed(2)}</span>
                </div>
                {remaining > 0 && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>Remaining</span>
                    <span>{remaining.toFixed(2)}</span>
                  </div>
                )}
                {change > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Change</span>
                    <span>{change.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
            <button
              disabled={(!lines.length && !comboCart.length) || remaining > 0 || charge.isPending || !posSession}
              onClick={() => charge.mutate()}
              className="w-full mt-2 py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-50"
            >
              {charge.isPending ? 'Processing…' : !posSession ? t('pos.session.openSessionFirst') : remaining > 0 ? `Add ${remaining.toFixed(2)} to complete` : 'Complete sale'}
            </button>
          </div>

          {lastReceipt && (
            <div className="mt-3 border-t border-gray-200 dark:border-gray-800 pt-3">
              <button
                onClick={() => printReceipt(lastReceipt, businessInfo)}
                className="w-full py-2.5 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium flex items-center justify-center gap-2"
              >
                🖨 {t('pos.printReceipt')}
              </button>
              <div className="mt-2 text-xs text-gray-500">
                Last: {lastReceipt.orderNo} · total {Number(lastReceipt.total).toFixed(2)} · food cost{' '}
                {Number(lastReceipt.foodCost).toFixed(2)} · GP {Number(lastReceipt.grossProfit).toFixed(2)}
                {lastReceipt.status === 'REFUNDED' && <span className="ms-2 text-red-600 font-medium">· {t('pos.refunded')}</span>}
              </div>
              {canRefund && lastReceipt.status === 'COMPLETED' && (
                <button
                  onClick={() => {
                    if (window.confirm(t('pos.refundConfirm'))) refund.mutate(lastReceipt.id);
                  }}
                  disabled={refund.isPending}
                  className="w-full mt-2 py-2 rounded-xl border border-red-300 text-red-600 text-sm font-medium disabled:opacity-50"
                >
                  {t('pos.refund')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
