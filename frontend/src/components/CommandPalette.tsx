/**
 * Global Command Palette (Ctrl+K / Cmd+K)
 *
 * Searches across: pages/navigation, orders, products, customers.
 * Type → instant results → Enter/click to navigate.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';

interface Result {
  id: string;
  type: 'page' | 'order' | 'product' | 'customer';
  icon: string;
  label: string;
  sublabel?: string;
  action: () => void;
}

const NAV_PAGES: Array<{ path: string; label: string; icon: string; keywords: string }> = [
  { path: '/', label: 'Dashboard', icon: '🏠', keywords: 'home main' },
  { path: '/pos-dashboard', label: 'POS Dashboard', icon: '🛒', keywords: 'point of sale session open' },
  { path: '/pos', label: 'POS (Point of Sale)', icon: '💰', keywords: 'cashier sell order' },
  { path: '/waiter', label: 'Waiter', icon: '🍽️', keywords: 'table floor restaurant serve' },
  { path: '/kds', label: 'Kitchen Display', icon: '👨‍🍳', keywords: 'kitchen kds prepare cook' },
  { path: '/catalog', label: 'Products / Catalog', icon: '📦', keywords: 'product item menu catalog' },
  { path: '/inventory', label: 'Inventory', icon: '📊', keywords: 'stock level quantity warehouse' },
  { path: '/customers', label: 'Customers', icon: '👥', keywords: 'client customer loyalty' },
  { path: '/sales-orders', label: 'Sales Orders', icon: '📋', keywords: 'order sale history' },
  { path: '/sales-history', label: 'Sales History', icon: '📜', keywords: 'transaction history past' },
  { path: '/reports', label: 'Reports', icon: '📈', keywords: 'report analytics chart revenue' },
  { path: '/pos-reports', label: 'POS Reports', icon: '📊', keywords: 'session z-report x-report' },
  { path: '/sessions', label: 'POS Sessions', icon: '🕐', keywords: 'session open close cash' },
  { path: '/suppliers', label: 'Suppliers', icon: '🏭', keywords: 'vendor supplier purchase' },
  { path: '/purchase-orders', label: 'Purchase Orders', icon: '📝', keywords: 'po purchase buy' },
  { path: '/requisitions', label: 'Requisitions', icon: '📥', keywords: 'request requisition need' },
  { path: '/transfers', label: 'Transfers', icon: '🔄', keywords: 'transfer move branch' },
  { path: '/wastage', label: 'Wastage', icon: '🗑️', keywords: 'waste expired damage' },
  { path: '/recipes', label: 'Recipes / BOM', icon: '📖', keywords: 'recipe bill of materials ingredient' },
  { path: '/modifiers', label: 'Modifiers / Options', icon: '⚙️', keywords: 'modifier option size sugar' },
  { path: '/categories', label: 'Categories', icon: '🏷️', keywords: 'category group' },
  { path: '/branches', label: 'Branches', icon: '🏢', keywords: 'branch location store' },
  { path: '/users', label: 'Users / Staff', icon: '👤', keywords: 'user employee staff cashier waiter' },
  { path: '/settings', label: 'Settings', icon: '⚙️', keywords: 'settings config preferences' },
  { path: '/printers', label: 'Printers', icon: '🖨️', keywords: 'printer kot receipt print' },
  { path: '/tables', label: 'Tables & Floors', icon: '🪑', keywords: 'table floor plan area' },
  { path: '/bookings', label: 'Reservations', icon: '📅', keywords: 'booking reservation reserve' },
  { path: '/deliveries', label: 'Deliveries', icon: '🚗', keywords: 'delivery driver dispatch' },
  { path: '/promotions', label: 'Promotions', icon: '🎉', keywords: 'promotion coupon discount' },
  { path: '/discount-rules', label: 'Discount Rules', icon: '💸', keywords: 'discount rule auto' },
  { path: '/loyalty', label: 'Loyalty Programs', icon: '⭐', keywords: 'loyalty points reward' },
  { path: '/alerts', label: 'Alerts', icon: '🔔', keywords: 'alert notification warning low stock expiry' },
  { path: '/audit-log', label: 'Audit Log', icon: '📝', keywords: 'audit trail log history who changed' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Open on Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setQuery('');
        setResults([]);
        setSelectedIdx(0);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Search logic
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    const lower = q.toLowerCase();
    const items: Result[] = [];

    // 1. Pages (instant — no API call)
    NAV_PAGES.forEach((p) => {
      if (p.label.toLowerCase().includes(lower) || p.keywords.includes(lower)) {
        items.push({
          id: `page-${p.path}`,
          type: 'page',
          icon: p.icon,
          label: p.label,
          sublabel: p.path,
          action: () => { navigate(p.path); setOpen(false); },
        });
      }
    });

    // 2. API search (products, customers, orders) — debounced
    if (q.length >= 2) {
      setLoading(true);
      try {
        const [products, customers, orders] = await Promise.all([
          api.get('/products', { params: { search: q, sellable: true } }).then(r => r.data.data).catch(() => []),
          api.get('/customers', { params: { search: q } }).then(r => r.data.data).catch(() => []),
          api.get('/sales/orders', { params: { search: q } }).then(r => r.data.data).catch(() => []),
        ]);

        (products || []).slice(0, 5).forEach((p: any) => {
          items.push({
            id: `product-${p.id}`,
            type: 'product',
            icon: '📦',
            label: p.name,
            sublabel: `${p.sku || ''} · ${p.category?.name || ''}`,
            action: () => { navigate('/catalog'); setOpen(false); },
          });
        });

        (customers || []).slice(0, 5).forEach((c: any) => {
          items.push({
            id: `customer-${c.id}`,
            type: 'customer',
            icon: '👤',
            label: c.name,
            sublabel: c.phone || c.email || '',
            action: () => { navigate('/customers'); setOpen(false); },
          });
        });

        (orders || []).slice(0, 5).forEach((o: any) => {
          items.push({
            id: `order-${o.id}`,
            type: 'order',
            icon: '🧾',
            label: o.orderNo,
            sublabel: `${o.status} · ${o.channel?.replace('_', ' ')} · ${Number(o.total).toFixed(2)}`,
            action: () => { navigate('/sales-orders'); setOpen(false); },
          });
        });
      } catch { /* ignore search errors */ }
      setLoading(false);
    }

    setResults(items);
    setSelectedIdx(0);
  }, [navigate]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  // Keyboard navigation within results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault();
      results[selectedIdx].action();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <span className="text-gray-400 text-lg">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('search.placeholder', 'Search pages, orders, products, customers...')}
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-500 font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-xs text-gray-400 text-center">Searching...</div>
          )}
          {!loading && query && results.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500">No results for "{query}"</p>
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={r.id}
              onClick={r.action}
              onMouseEnter={() => setSelectedIdx(i)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                i === selectedIdx ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className="text-lg flex-shrink-0">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{r.label}</div>
                {r.sublabel && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{r.sublabel}</div>}
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 flex-shrink-0">
                {r.type}
              </span>
            </button>
          ))}
          {!query && (
            <div className="px-4 py-4 text-center text-xs text-gray-400">
              <p>Type to search pages, products, orders, or customers</p>
              <p className="mt-1">↑↓ Navigate · Enter Select · Esc Close</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
