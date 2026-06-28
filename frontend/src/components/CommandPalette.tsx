import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useDebounce } from '../lib/useDebounce';

interface SearchResult {
  id: string;
  type: 'page' | 'order' | 'product' | 'customer';
  title: string;
  subtitle?: string;
  icon: string;
  path?: string;
}

// Static page index for instant navigation
const PAGES: SearchResult[] = [
  { id: 'p-pos', type: 'page', title: 'POS', subtitle: 'Point of Sale', icon: '🏪', path: '/pos' },
  { id: 'p-kds', type: 'page', title: 'Kitchen Display', subtitle: 'KDS Board', icon: '👨‍🍳', path: '/kds' },
  { id: 'p-waiter', type: 'page', title: 'Waiter', subtitle: 'Floor Plan & Orders', icon: '🍽️', path: '/waiter' },
  { id: 'p-menu', type: 'page', title: 'Menu / 86', subtitle: 'Toggle item availability', icon: '📋', path: '/menu' },
  { id: 'p-inventory', type: 'page', title: 'Inventory', subtitle: 'Stock levels & batches', icon: '📦', path: '/inventory' },
  { id: 'p-sales', type: 'page', title: 'Sales History', subtitle: 'Order history & refunds', icon: '📊', path: '/sales-history' },
  { id: 'p-customers', type: 'page', title: 'Customers', subtitle: 'CRM & loyalty', icon: '👥', path: '/customers' },
  { id: 'p-reports', type: 'page', title: 'Reports', subtitle: 'Analytics & insights', icon: '📈', path: '/reports' },
  { id: 'p-catalog', type: 'page', title: 'Product Catalog', subtitle: 'All products', icon: '🛒', path: '/catalog' },
  { id: 'p-requisitions', type: 'page', title: 'Requisitions', subtitle: 'Branch requests', icon: '📝', path: '/requisitions' },
  { id: 'p-suppliers', type: 'page', title: 'Suppliers', subtitle: 'Vendor management', icon: '🚚', path: '/suppliers' },
  { id: 'p-purchase', type: 'page', title: 'Purchase Orders', subtitle: 'Procurement', icon: '📄', path: '/purchase-orders' },
  { id: 'p-production', type: 'page', title: 'Production', subtitle: 'Central kitchen', icon: '🔥', path: '/production' },
  { id: 'p-settings', type: 'page', title: 'Settings', subtitle: 'System configuration', icon: '⚙️', path: '/settings' },
  { id: 'p-users', type: 'page', title: 'Users', subtitle: 'Staff management', icon: '👤', path: '/users' },
  { id: 'p-branches', type: 'page', title: 'Branches', subtitle: 'Locations', icon: '🏢', path: '/branches' },
  { id: 'p-alerts', type: 'page', title: 'Alerts', subtitle: 'Stock & expiry warnings', icon: '🔔', path: '/alerts' },
  { id: 'p-deliveries', type: 'page', title: 'Deliveries', subtitle: 'Dispatch & drivers', icon: '🚗', path: '/deliveries' },
  { id: 'p-loyalty', type: 'page', title: 'Loyalty & eWallet', subtitle: 'Programs & cards', icon: '💳', path: '/loyalty' },
  { id: 'p-qr', type: 'page', title: 'QR Codes', subtitle: 'Generate menu & table QR', icon: '📱', path: '/qr-codes' },
  { id: 'p-printers', type: 'page', title: 'Printers', subtitle: 'KOT & receipt printers', icon: '🖨️', path: '/printers' },
  { id: 'p-sessions', type: 'page', title: 'Sessions / Cash', subtitle: 'POS cash control', icon: '💰', path: '/sessions' },
  { id: 'p-audit', type: 'page', title: 'Audit Log', subtitle: 'Activity trail', icon: '🔍', path: '/audit' },
  { id: 'p-notif', type: 'page', title: 'Notifications', subtitle: 'WhatsApp & email config', icon: '💬', path: '/notifications' },
];

/**
 * CommandPalette — Global search overlay (Ctrl+K / Cmd+K).
 * Searches across pages, orders, products, and customers in one unified input.
 * Rendered at the Layout level so it's always available.
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Open on Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIdx(0);
    }
  }, [open]);

  // Search orders by number (only when query looks like an order number)
  const { data: orderResults } = useQuery({
    queryKey: ['cmd-orders', debouncedQuery],
    queryFn: () => api.get('/sales/orders', { params: { search: debouncedQuery, take: 5 } }).then(r => r.data.data),
    enabled: open && debouncedQuery.length >= 3,
  });

  // Search products
  const { data: productResults } = useQuery({
    queryKey: ['cmd-products', debouncedQuery],
    queryFn: () => api.get('/products', { params: { search: debouncedQuery } }).then(r => r.data.data),
    enabled: open && debouncedQuery.length >= 2,
  });

  // Search customers
  const { data: customerResults } = useQuery({
    queryKey: ['cmd-customers', debouncedQuery],
    queryFn: () => api.get('/customers', { params: { search: debouncedQuery } }).then(r => r.data.data),
    enabled: open && debouncedQuery.length >= 2,
  });

  // Combine results
  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim();
    if (!q) return PAGES.slice(0, 8); // Show popular pages when empty

    const out: SearchResult[] = [];

    // Page matches
    const pageMatches = PAGES.filter(
      (p) => p.title.toLowerCase().includes(q) || (p.subtitle?.toLowerCase().includes(q))
    );
    out.push(...pageMatches.slice(0, 5));

    // Order matches
    if (orderResults?.length) {
      for (const o of orderResults.slice(0, 3)) {
        out.push({
          id: `o-${o.id}`,
          type: 'order',
          title: o.orderNo,
          subtitle: `${o.status} · ${o.tableName || o.channel} · ${Number(o.total).toFixed(2)}`,
          icon: '🧾',
          path: '/sales-history',
        });
      }
    }

    // Product matches
    if (productResults?.length) {
      for (const p of productResults.slice(0, 3)) {
        out.push({
          id: `pr-${p.id}`,
          type: 'product',
          title: p.name,
          subtitle: `${p.sku} · ${Number(p.salePrice).toFixed(2)} QAR`,
          icon: '🍽️',
          path: '/menu',
        });
      }
    }

    // Customer matches
    if (customerResults?.length) {
      for (const c of customerResults.slice(0, 3)) {
        out.push({
          id: `c-${c.id}`,
          type: 'customer',
          title: c.name,
          subtitle: c.phone || c.email || '',
          icon: '👤',
          path: '/customers',
        });
      }
    }

    return out;
  }, [query, orderResults, productResults, customerResults]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault();
      const r = results[selectedIdx];
      if (r.path) navigate(r.path);
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <span className="text-gray-400">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, orders, products, customers..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 dark:text-gray-100"
            autoComplete="off"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-500 font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 && query && (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No results for "{query}"</div>
          )}
          {results.map((r, i) => (
            <button
              key={r.id}
              onClick={() => { if (r.path) navigate(r.path); setOpen(false); }}
              onMouseEnter={() => setSelectedIdx(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === selectedIdx ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <span className="text-lg flex-shrink-0">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{r.title}</div>
                {r.subtitle && <div className="text-xs text-gray-500 truncate">{r.subtitle}</div>}
              </div>
              <span className="text-[10px] text-gray-400 uppercase flex-shrink-0">{r.type}</span>
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-[10px] text-gray-400">
          <span><kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">↵</kbd> open</span>
          <span><kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
