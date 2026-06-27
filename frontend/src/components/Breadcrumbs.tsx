/**
 * Breadcrumb navigation (Odoo-style).
 * Shows the current path: Dashboard > Inventory > Product X
 * Each segment is clickable to go back.
 */
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Route label mapping
const ROUTE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  'catalog': 'Products',
  'inventory': 'Inventory',
  'customers': 'Customers',
  'suppliers': 'Suppliers',
  'purchase-orders': 'Purchase Orders',
  'requisitions': 'Requisitions',
  'transfers': 'Transfers',
  'wastage': 'Wastage',
  'reports': 'Reports',
  'pos-reports': 'POS Reports',
  'pos-dashboard': 'POS Dashboard',
  'sales-dashboard': 'Sales Dashboard',
  'sales-orders': 'Sales Orders',
  'sales-history': 'Sales History',
  'sessions': 'Sessions',
  'settings': 'Settings',
  'branches': 'Branches',
  'users': 'Users',
  'categories': 'Categories',
  'alerts': 'Alerts',
  'audit-log': 'Audit Log',
  'tables': 'Tables & Floors',
  'bookings': 'Reservations',
  'deliveries': 'Deliveries',
  'promotions': 'Promotions',
  'discount-rules': 'Discount Rules',
  'printers': 'Printers',
  'loyalty': 'Loyalty',
  'recipes': 'Recipes',
  'modifiers': 'Modifiers',
  'combos': 'Combos',
  'pricelists': 'Pricelists',
  'menu': 'Menu',
  'stock-count': 'Stock Count',
  'production': 'Production',
  'staff-tasks': 'Staff Tasks',
  'receivables': 'Receivables',
  'payables': 'Payables',
  'delivery-platforms': 'Delivery Platforms',
  'order-presets': 'Order Presets',
  'payment-methods': 'Payment Methods',
  'payment-terminals': 'Payment Terminals',
  'cash-roundings': 'Cash Roundings',
  'fiscal-positions': 'Fiscal Positions',
  'iot-devices': 'IoT Devices',
  'self-order': 'Self-Order',
  'product-attributes': 'Product Attributes',
  'pricing': 'Pricing',
  'notifications': 'Notifications',
};

export default function Breadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs on dashboard or single-level pages
  if (segments.length === 0) return null;

  const crumbs: Array<{ label: string; path: string }> = [
    { label: t('nav.dashboard', 'Dashboard'), path: '/' },
  ];

  let pathSoFar = '';
  segments.forEach((seg, i) => {
    pathSoFar += `/${seg}`;
    const label = ROUTE_LABELS[seg] || seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    crumbs.push({ label, path: pathSoFar });
  });

  return (
    <nav className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3 overflow-x-auto">
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="flex items-center gap-1.5 whitespace-nowrap">
          {i > 0 && <span className="text-gray-300 dark:text-gray-600">/</span>}
          {i < crumbs.length - 1 ? (
            <Link
              to={crumb.path}
              className="hover:text-primary transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="font-medium text-gray-700 dark:text-gray-200">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
