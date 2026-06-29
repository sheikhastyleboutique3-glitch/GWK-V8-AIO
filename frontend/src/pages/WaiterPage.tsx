import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import ModifierModal, { ModGroup, ChosenModifier } from '../components/ModifierModal';
import { printKot } from '../lib/thermalPrint';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import { usePosSessionGuard } from '../lib/usePosSessionGuard';
import PinSwitchModal from '../components/PinSwitchModal';
import OfflineBanner from '../components/OfflineBanner';
import { useRealtimeFloor } from '../lib/useRealtimeFloor';

interface TableRow { id: number; name: string; seats: number; status: string; branchId: number; isActive: boolean }
interface OrderRow { id: number; orderNo: string; status: string; tableName?: string | null; total: number }

// Floor-plan tile tone per table status.
const statusTone: Record<string, string> = {
  AVAILABLE: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10',
  OCCUPIED: 'border-amber-300 bg-amber-50 dark:bg-amber-500/10',
  BILL_REQUESTED: 'border-red-300 bg-red-50 dark:bg-red-500/10',
  RESERVED: 'border-sky-300 bg-sky-50 dark:bg-sky-500/10',
};
const statusDot: Record<string, string> = {
  AVAILABLE: 'bg-emerald-500',
  OCCUPIED: 'bg-amber-500',
  BILL_REQUESTED: 'bg-red-500',
  RESERVED: 'bg-sky-500',
};

export default function WaiterPage() {
  const { t } = useTranslation();
  const { activeBranch, user } = useAuth();
  const qc = useQueryClient();
  const branchId = activeBranch?.id;

  const [selectedTable, setSelectedTable] = useState<TableRow | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');
  // Track which order items have already been printed to the kitchen so
  // "Send to kitchen" only fires the new lines.
  const [sentItemIds, setSentItemIds] = useState<Set<number>>(new Set());
  const [splitMode, setSplitMode] = useState(false);
  const [splitQty, setSplitQty] = useState<Record<number, number>>({});
  const seededOrderRef = useRef<number | null>(null);
  // Modifier modal state
  const [modProduct, setModProduct] = useState<{ product: any; groups: ModGroup[] } | null>(null);
  const [showPinSwitch, setShowPinSwitch] = useState(false);

  const waiterName = user ? `${user.firstName} ${user.lastName}` : undefined;

  // ── Session guard: warn waiter when navigating away with active orders ──
  const { blocked: sessionBlocked, proceed: sessionProceed, cancel: sessionCancel } = usePosSessionGuard({
    sessionOpen: !!activeOrderId, // Block when waiter has an active order open
    allowedPaths: ['/waiter', '/pos', '/kds'],
  });

  // Real-time floor updates via WebSocket (replaces 15s polling)
  useRealtimeFloor(branchId);

  // ---- Floor-plan data (slow fallback polling; WebSocket is primary) ----
  const { data: floors } = useQuery({
    queryKey: ['waiter-floors', branchId],
    queryFn: () => api.get('/floors', { params: { branchId } }).then((r) => r.data.data),
    enabled: !!branchId,
    refetchInterval: 120_000,
  });
  const { data: tables, isLoading: tablesLoading } = useQuery({
    queryKey: ['waiter-tables', branchId],
    queryFn: () => api.get('/tables', { params: { branchId } }).then((r) => r.data.data),
    enabled: !!branchId,
    refetchInterval: 120_000,
  });
  const [activeFloorId, setActiveFloorId] = useState<number | null>(null);
  // Filter tables by active floor (if selected)
  const visibleTables = activeFloorId
    ? (tables || []).filter((t: any) => t.floorId === activeFloorId)
    : (tables || []);

  // Open + held orders, so we can show which table is busy and resume bills.
  const { data: activeOrders } = useQuery({
    queryKey: ['waiter-active-orders', branchId],
    queryFn: async () => {
      const [open, held] = await Promise.all([
        api.get('/sales/orders', { params: { branchId, status: 'OPEN' } }).then((r) => r.data.data),
        api.get('/sales/orders', { params: { branchId, status: 'HELD' } }).then((r) => r.data.data),
      ]);
      return [...(open || []), ...(held || [])] as OrderRow[];
    },
    enabled: !!branchId,
    refetchInterval: 120_000,
  });

  const orderForTable = (name: string): OrderRow | undefined =>
    (activeOrders || []).find((o) => o.tableName === name);

  const ordersForTable = (name: string): OrderRow[] =>
    (activeOrders || []).filter((o) => o.tableName === name);

  // Multi-order table picker state
  const [waiterTablePicker, setWaiterTablePicker] = useState<{ table: TableRow; orders: OrderRow[] } | null>(null);

  // ---- Menu data (only needed once a table is open) ----
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories', { params: { posVisible: true } }).then((r) => r.data.data),
    
    enabled: !!selectedTable,
  });
  // ---- Modifier groups (for product options: size, sugar, etc.) ----
  const { data: modifierGroups } = useQuery({
    queryKey: ['modifier-groups'],
    queryFn: () => api.get('/modifiers/groups').then((r) => r.data.data),
    
    enabled: !!selectedTable,
  });
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['waiter-products', categoryId, search],
    queryFn: () =>
      api
        .get('/products', { params: { sellable: true, available: true, productType: 'MENU', ...(categoryId && { categoryId }), ...(search && { search }) } })
        .then((r) => r.data.data),
    
    enabled: !!selectedTable,
  });
  // Map product → its modifier groups using productLinks (same pattern as POSPage).
  const productGroups = useMemo(() => {
    const map = new Map<number, ModGroup[]>();
    if (!modifierGroups) return map;
    (modifierGroups as any[]).forEach((g: any) => {
      (g.productLinks || []).forEach((l: any) => {
        const arr = map.get(l.productId) ?? [];
        arr.push(g);
        map.set(l.productId, arr);
      });
    });
    return map;
  }, [modifierGroups]);
  const { data: stock } = useQuery({
    queryKey: ['waiter-stock', branchId],
    queryFn: () => api.get('/inventory/grouped', { params: { branchId } }).then((r) => r.data.data),
    enabled: !!selectedTable && !!branchId,
    
  });
  const stockMap = useMemo(() => {
    const m = new Map<number, number>();
    (stock || []).forEach((row: any) => m.set(row.productId, row.quantity));
    return m;
  }, [stock]);

  // ---- Current order detail ----
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['waiter-order', activeOrderId],
    queryFn: () => api.get(`/sales/orders/${activeOrderId}`).then((r) => r.data.data),
    enabled: !!activeOrderId,
    refetchInterval: 5_000, // Sync KOT status: pick up fires made by POS or other waiters
  });

  const refreshTablesAndOrders = () => {
    qc.invalidateQueries({ queryKey: ['waiter-tables'] });
    qc.invalidateQueries({ queryKey: ['waiter-active-orders'] });
  };

  // ---- Mutations ----
  const setTableStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.patch(`/tables/${id}`, { status }),
    onSuccess: refreshTablesAndOrders,
  });

  const openTable = useMutation({
    mutationFn: async (table: TableRow) => {
      const tableOrders = ordersForTable(table.name);
      if (tableOrders.length > 1) {
        // Multiple orders — show picker (return null to signal no auto-open)
        setWaiterTablePicker({ table, orders: tableOrders });
        return null;
      }
      // Use atomic claim endpoint to prevent race conditions
      // (two waiters tapping the same table simultaneously)
      const { data } = await api.post(`/tables/${table.id}/claim`, { branchId });
      return data.data.orderId as number;
    },
    onSuccess: (orderId, table) => {
      if (orderId === null) return; // picker is showing, don't navigate
      setSelectedTable(table);
      setActiveOrderId(orderId);
      refreshTablesAndOrders();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || e.message || 'Failed to open table'),
  });

  const addItem = useMutation({
    mutationFn: (p: { product: any; modifiers?: ChosenModifier[]; priceDelta?: number }) =>
      api.post(`/sales/orders/${activeOrderId}/items`, {
        productId: p.product.id,
        quantity: 1,
        unitPrice: (p.product.salePrice ?? p.product.costPrice ?? 0) + (p.priceDelta ?? 0),
        modifiers: p.modifiers,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waiter-order', activeOrderId] });
      qc.invalidateQueries({ queryKey: ['waiter-active-orders'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to add item'),
  });

  const removeItem = useMutation({
    mutationFn: (itemId: number) => api.delete(`/sales/orders/${activeOrderId}/items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['waiter-order', activeOrderId] });
      qc.invalidateQueries({ queryKey: ['waiter-active-orders'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to remove item'),
  });

  const holdOrder = useMutation({
    mutationFn: () => api.patch(`/sales/orders/${activeOrderId}/hold`, {}),
    onSuccess: () => {
      toast.success(t('waiter.held'));
      backToFloor();
      refreshTablesAndOrders();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const requestBill = useMutation({
    mutationFn: async () => {
      if (selectedTable) await api.patch(`/tables/${selectedTable.id}`, { status: 'BILL_REQUESTED' });
    },
    onSuccess: () => {
      toast.success(t('waiter.billRequested'));
      backToFloor();
      refreshTablesAndOrders();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const backToFloor = () => {
    setSelectedTable(null);
    setActiveOrderId(null);
    setSearch('');
    setCategoryId(undefined);
    setSplitMode(false);
    setSplitQty({});
  };

  // Tables other than the current one (for transfer); and those with an active bill (for merge).
  const otherTables = (tables || []).filter((tb: TableRow) => tb.isActive && tb.name !== selectedTable?.name);
  const mergeableOrders = (activeOrders || []).filter((o) => o.id !== activeOrderId && o.tableName);

  const transferMut = useMutation({
    mutationFn: (tableName: string) => api.patch(`/sales/orders/${activeOrderId}/table`, { tableName }),
    onSuccess: (r: any) => {
      toast.success(t('waiter.transferred'));
      setSelectedTable((prev) => (prev ? { ...prev, name: r.data.data.tableName } : prev));
      refreshTablesAndOrders();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const mergeMut = useMutation({
    mutationFn: (fromOrderId: number) => api.post(`/sales/orders/${activeOrderId}/merge`, { fromOrderId }),
    onSuccess: () => {
      toast.success(t('waiter.merged'));
      qc.invalidateQueries({ queryKey: ['waiter-order', activeOrderId] });
      refreshTablesAndOrders();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const splitMut = useMutation({
    mutationFn: () => {
      const itemIds = Object.entries(splitQty)
        .filter(([, qty]) => qty > 0)
        .map(([id]) => Number(id));
      const quantities: Record<number, number> = {};
      Object.entries(splitQty).forEach(([id, qty]) => { if (qty > 0) quantities[Number(id)] = qty; });
      return api.post(`/sales/orders/${activeOrderId}/split`, { itemIds, quantities });
    },
    onSuccess: () => {
      toast.success(t('waiter.splitDone'));
      setSplitMode(false);
      setSplitQty({});
      qc.invalidateQueries({ queryKey: ['waiter-order', activeOrderId] });
      refreshTablesAndOrders();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const orderTotal = useMemo(
    () => (order?.items || []).reduce((s: number, it: any) => s + (it.unitPrice ?? 0) * (it.quantity ?? 0), 0),
    [order],
  );

  // Seed "already sent" items once per opened order so a resumed bill doesn't
  // reprint its existing lines; a fresh ticket starts empty.
  // NOTE: sentItemIds is ONLY for print-dedup within a single Waiter session.
  // The real source of truth for "fired to kitchen" is `firedAt` from the DB.
  useEffect(() => {
    if (order?.id && seededOrderRef.current !== order.id) {
      seededOrderRef.current = order.id;
      // Seed with items that already have firedAt (already sent to kitchen by anyone — POS or Waiter)
      setSentItemIds(new Set(
        (order.items || []).filter((it: any) => it.firedAt).map((it: any) => it.id)
      ));
    }
  }, [order?.id, order?.items]);

  // Items NOT yet fired to kitchen (source of truth = database firedAt field)
  // This ensures if POS or another waiter fires, this waiter sees it too.
  const newItems = useMemo(
    () => (order?.items || []).filter((it: any) => !it.firedAt && !it.isVoided),
    [order],
  );

  const sendToKitchen = async () => {
    if (!order || !activeOrderId) return;

    try {
      // Fire course 1 — sets firedAt on all unfired items in the DB
      const { data: fireResult } = await api.post(`/sales/orders/${activeOrderId}/courses/1/fire`);
      const firedOrder = fireResult.data;

      // Items that are now fired but weren't before = newly sent
      const newlyFired = (firedOrder.items || []).filter(
        (it: any) => it.firedAt && !sentItemIds.has(it.id) && !it.isVoided
      );

      if (newlyFired.length > 0) {
        printKot(firedOrder, { items: newlyFired, waiter: waiterName, splitByStation: true });
        // Mark all fired items as sent
        setSentItemIds((prev) => {
          const next = new Set(prev);
          (firedOrder.items || []).filter((it: any) => it.firedAt).forEach((it: any) => next.add(it.id));
          return next;
        });
        toast.success(`🔥 ${newlyFired.length} item(s) sent to kitchen!`);
      } else {
        toast(t('waiter.nothingNew'));
      }

      qc.invalidateQueries({ queryKey: ['waiter-order', activeOrderId] });
      qc.invalidateQueries({ queryKey: ['kds-board'] });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Kitchen fire failed');
    }
  };

  if (!branchId) {
    return (
      <div>
        <PageHeader title={t('nav.waiter')} />
        <p className="text-sm text-amber-600">{t('waiter.selectBranch')}</p>
      </div>
    );
  }

  // ============ FLOOR PLAN ============
  if (!selectedTable) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <OfflineBanner />
        {/* Top nav bar (full-screen mode) */}
        <div className="bg-gray-900 text-white px-4 py-2 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => window.location.href = '/'} className="text-gray-400 hover:text-white transition text-lg" title="Back">✕</button>
          <span className="font-bold text-sm">{activeBranch?.name || t('nav.waiter')}</span>
          <span className="text-xs text-gray-400">Waiter · {user?.firstName}</span>
          <div className="ms-auto flex items-center gap-2">
            <button onClick={() => setShowPinSwitch(true)} className="px-2 py-1 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white transition text-xs">👤 Switch</button>
          </div>
        </div>
        {/* Floor content — fills remaining space */}
        <div className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-500">
          {['AVAILABLE', 'OCCUPIED', 'BILL_REQUESTED', 'RESERVED'].map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${statusDot[s]}`} />
              {s.replace('_', ' ')}
            </span>
          ))}
        </div>
        {/* Floor/Area tabs */}
        {(floors?.length ?? 0) > 0 && (
          <div className="flex gap-2 mb-3">
            <button onClick={() => setActiveFloorId(null)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${!activeFloorId ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
              All
            </button>
            {(floors || []).map((f: any) => (
              <button key={f.id} onClick={() => setActiveFloorId(f.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeFloorId === f.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                {f.name}
              </button>
            ))}
          </div>
        )}
        {tablesLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 w-full flex-1"
            style={{ background: '#f0fdf4' }}>
            {(visibleTables || []).filter((tb: TableRow) => tb.isActive).map((table: TableRow) => {
              const tableOrders = ordersForTable(table.name);
              const ord = tableOrders[0];
              const isOccupied = table.status === 'OCCUPIED' || tableOrders.length > 0;
              const isBillReq = table.status === 'BILL_REQUESTED';
              const isReserved = table.status === 'RESERVED';
              const bgColor = isBillReq ? 'bg-red-400/80' : isOccupied ? 'bg-amber-400/80' : isReserved ? 'bg-sky-400/80' : 'bg-emerald-400/80';
              const isRound = (table as any).shape === 'ROUND';
              return (
                <button
                  key={table.id}
                  onClick={() => openTable.mutate(table)}
                  disabled={openTable.isPending}
                  className={`absolute flex flex-col items-center justify-center text-white font-bold shadow-lg hover:scale-105 transition-transform disabled:opacity-60 ${bgColor} ${isRound ? 'rounded-full' : 'rounded-xl'}`}
                  style={{ left: (table as any).posX || 0, top: (table as any).posY || 0, width: (table as any).width || 90, height: (table as any).height || 90 }}
                >
                  <span className="text-sm">{table.name}</span>
                  <span className="text-[10px] opacity-80">{table.seats} 👤</span>
                  {tableOrders.length > 1 && <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-white rounded-full flex items-center justify-center text-[9px] font-bold text-gray-900">{tableOrders.length}</span>}
                  {ord && tableOrders.length <= 1 && (
                    <span className="mt-0.5 text-[9px] bg-white/30 rounded px-1">
                      {ord.status === 'HELD' ? '⏸' : `#${ord.orderNo.slice(-4)}`}
                    </span>
                  )}
                </button>
              );
            })}
            {!visibleTables?.length && <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">{t('waiter.noTables')}</div>}
          </div>
        )}

        {/* Table order picker for multi-order tables */}
        {waiterTablePicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setWaiterTablePicker(null)}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-bold mb-1">{t('pos.tableOrders')}</h3>
              <p className="text-xs text-gray-500 mb-3">{waiterTablePicker.table.name} — {waiterTablePicker.orders.length} {t('pos.activeOrders')}</p>
              <div className="space-y-2 mb-4 max-h-[50vh] overflow-y-auto">
                {waiterTablePicker.orders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setSelectedTable(waiterTablePicker.table);
                      setActiveOrderId(o.id);
                      setWaiterTablePicker(null);
                      refreshTablesAndOrders();
                    }}
                    className="w-full text-left px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5 transition"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{o.orderNo.slice(-6)}</span>
                      <span className="text-sm font-bold">{Number(o.total).toFixed(2)}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{o.status}</div>
                  </button>
                ))}
              </div>
              <button
                onClick={async () => {
                  try {
                    const { data } = await api.post('/sales/orders', { branchId, channel: 'DINE_IN', tableName: waiterTablePicker.table.name });
                    setSelectedTable(waiterTablePicker.table);
                    setActiveOrderId(data.data.id);
                    setWaiterTablePicker(null);
                    refreshTablesAndOrders();
                  } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
                }}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold"
              >
                + {t('pos.newOrderForTable')}
              </button>
            </div>
          </div>
        )}
        </div>{/* end flex-1 floor content wrapper */}
      </div>
    );
  }

  // ============ ORDER VIEW ============
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <OfflineBanner />
      <PageHeader title={`${t('waiter.table')} ${selectedTable.name}`} subtitle={order?.orderNo} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Menu grid */}
        <div className="lg:col-span-2">
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={backToFloor} className="px-3 py-2 rounded-lg text-sm bg-gray-100 dark:bg-gray-800">
              ← {t('waiter.floor')}
            </button>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('waiter.searchProducts')}
              className="flex-1 min-w-[160px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
            />
            <button
              onClick={() => setCategoryId(undefined)}
              className={`px-3 py-2 rounded-lg text-sm ${!categoryId ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
            >
              {t('waiter.all')}
            </button>
            {(categories || []).slice(0, 8).map((c: any) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`px-3 py-2 rounded-lg text-sm ${categoryId === c.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          {productsLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {(products || []).map((p: any) => {
                const qty = stockMap.get(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      const groups = productGroups.get(p.id);
                      if (groups && groups.length) {
                        setModProduct({ product: p, groups });
                      } else {
                        addItem.mutate({ product: p });
                      }
                    }}
                    disabled={addItem.isPending}
                    className="text-left rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden hover:border-primary hover:shadow-sm transition disabled:opacity-60"
                  >
                    <div className="h-20 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">🍽️</span>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-2">{p.name}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-semibold text-primary">{Number(p.salePrice || p.costPrice || 0).toFixed(2)}</span>
                        {qty !== undefined && (
                          <span className={`text-[11px] font-medium ${qty <= 0 ? 'text-red-600' : 'text-gray-500'}`}>
                            {t('waiter.stock')}: {qty}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
              {!products?.length && <p className="text-sm text-gray-500 col-span-full">{t('waiter.noProducts')}</p>}
            </div>
          )}
        </div>

        {/* Order ticket */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex flex-col">
          <h3 className="text-sm font-semibold mb-3">{t('waiter.ticket')}</h3>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 -mx-1 min-h-[8rem]">
            {orderLoading ? (
              <LoadingSpinner />
            ) : (
              (order?.items || []).map((it: any) => (
                <div key={it.id} className="px-1 py-2 flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {splitMode && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setSplitQty(p => ({ ...p, [it.id]: Math.max(0, (p[it.id] ?? 0) - 1) }))}
                          disabled={(splitQty[it.id] ?? 0) <= 0}
                          className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 text-xs font-bold disabled:opacity-30"
                        >−</button>
                        <span className="w-5 text-center text-xs font-semibold">{splitQty[it.id] ?? 0}</span>
                        <button
                          onClick={() => setSplitQty(p => ({ ...p, [it.id]: Math.min(it.quantity, (p[it.id] ?? 0) + 1) }))}
                          disabled={(splitQty[it.id] ?? 0) >= it.quantity}
                          className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 text-xs font-bold disabled:opacity-30"
                        >+</button>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                        {it.firedAt ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400" title="Sent to kitchen">🔥</span>
                        ) : (
                          <span className="text-[10px] text-gray-300 dark:text-gray-600" title="Not yet sent">○</span>
                        )}
                        {it.product?.name ?? `#${it.productId}`}
                      </div>
                      {Array.isArray(it.modifiers) && it.modifiers.filter((m: any) => m?.name).length > 0 && (
                        <div className="text-[11px] text-amber-600 dark:text-amber-400 truncate">
                          + {it.modifiers.filter((m: any) => m?.name).map((m: any) => m.name).join(', ')}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {Number(it.unitPrice).toFixed(2)}
                        <span className="ms-2 text-[10px] uppercase tracking-wide text-gray-400">{it.kdsStatus}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!splitMode && (
                      <>
                        <button onClick={() => {
                          if (it.quantity <= 1) { removeItem.mutate(it.id); return; }
                          api.patch(`/sales/orders/${activeOrderId}/items/${it.id}`, { quantity: it.quantity - 1 }).then(() => {
                            qc.invalidateQueries({ queryKey: ['waiter-order', activeOrderId] });
                          });
                        }} className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 text-xs font-bold">−</button>
                        <span className="text-sm font-semibold w-5 text-center">{it.quantity}</span>
                        <button onClick={() => {
                          // Use addItem to increment (triggers merge logic on backend)
                          addItem.mutate({ product: { id: it.productId, salePrice: it.unitPrice }, modifiers: it.modifiers ? it.modifiers.map((m: any) => ({ optionId: m?.optionId, name: m?.name, nameAr: m?.nameAr, priceDelta: 0 })) : undefined, priceDelta: 0 });
                        }} className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-800 text-xs font-bold">+</button>
                        <button onClick={() => removeItem.mutate(it.id)} className="text-red-600 text-sm ms-1" aria-label="Remove">✕</button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            {!orderLoading && !order?.items?.length && (
              <p className="text-sm text-gray-400 py-8 text-center">{t('waiter.tapToAdd')}</p>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 mt-3 pt-3">
            <div className="flex justify-between text-lg font-bold mb-3">
              <span>{t('waiter.total')}</span>
              <span>{orderTotal.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">{t('waiter.kdsNote')}</p>

            {/* Table & bill operations */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                onChange={(e) => { if (e.target.value) transferMut.mutate(e.target.value); e.currentTarget.selectedIndex = 0; }}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 text-xs"
              >
                <option value="">↪ {t('waiter.transferTo')}</option>
                {otherTables.map((tb: TableRow) => <option key={tb.id} value={tb.name}>{tb.name}</option>)}
              </select>
              <select
                onChange={(e) => { if (e.target.value) mergeMut.mutate(parseInt(e.target.value, 10)); e.currentTarget.selectedIndex = 0; }}
                className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 text-xs"
              >
                <option value="">⇄ {t('waiter.mergeFrom')}</option>
                {mergeableOrders.map((o) => <option key={o.id} value={o.id}>{o.tableName}</option>)}
              </select>
            </div>
            {splitMode ? (
              <div className="space-y-2 mb-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Split total: {(order?.items || []).reduce((s: number, it: any) => s + (it.unitPrice ?? 0) * (splitQty[it.id] ?? 0), 0).toFixed(2)}</span>
                  <span>{Object.values(splitQty).filter(q => q > 0).length} item(s)</span>
                </div>
                <button
                  onClick={() => splitMut.mutate()}
                  disabled={!Object.values(splitQty).some(q => q > 0) || splitMut.isPending}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {splitMut.isPending ? 'Splitting...' : `✂ Create separate bill (${Object.values(splitQty).filter(q => q > 0).length})`}
                </button>
                <button onClick={() => { setSplitMode(false); setSplitQty({}); }} className="w-full py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs">
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button onClick={() => setSplitMode(true)} disabled={(order?.items?.length ?? 0) < 2} className="w-full mb-2 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs disabled:opacity-50">
                ✂ {t('waiter.splitBill')}
              </button>
            )}

            <button
              onClick={sendToKitchen}
              disabled={!newItems.length}
              className={`w-full mb-2 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 ${
                newItems.length > 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              } disabled:opacity-70`}
            >
              {newItems.length > 0 ? (
                <>🍳 {t('waiter.sendToKitchen')}</>
              ) : (
                <>✓ All items sent to kitchen</>
              )}
              {newItems.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-white/25 text-xs">
                  {newItems.length}
                </span>
              )}
            </button>
            <button
              onClick={() => order && printKot(order, { waiter: waiterName, splitByStation: true })}
              disabled={!order?.items?.length}
              className="w-full mb-2 py-2 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              🖨 {t('waiter.printKot')}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => holdOrder.mutate()}
                disabled={holdOrder.isPending}
                className="py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium disabled:opacity-50"
              >
                {t('waiter.hold')}
              </button>
              <button
                onClick={() => requestBill.mutate()}
                disabled={requestBill.isPending || !order?.items?.length}
                className="py-2.5 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50"
              >
                {t('waiter.requestBill')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modifier selection modal */}
      {modProduct && (
        <ModifierModal
          product={modProduct.product}
          groups={modProduct.groups}
          onClose={() => setModProduct(null)}
          onConfirm={(mods, delta) => {
            addItem.mutate({ product: modProduct.product, modifiers: mods, priceDelta: delta });
            setModProduct(null);
          }}
        />
      )}

      {/* PIN Switch User Modal */}
      <PinSwitchModal
        open={showPinSwitch}
        onClose={() => setShowPinSwitch(false)}
        onSwitched={() => window.location.reload()}
        branchId={branchId}
      />

      {/* ── Session Guard: blocks leaving with active order ── */}
      {sessionBlocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Active Order Open
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              You have an active order. Please send it to kitchen or close it before navigating away.
            </p>
            <div className="flex gap-3">
              <button onClick={sessionCancel} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm">
                Stay
              </button>
              <button onClick={sessionProceed} className="flex-1 py-2.5 rounded-xl border border-red-300 text-red-600 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-900/20">
                Leave Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
