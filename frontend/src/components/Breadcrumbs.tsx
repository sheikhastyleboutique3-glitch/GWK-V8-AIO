import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

/**
 * Breadcrumbs — Shows navigation path for deep pages.
 * Auto-generates crumbs from the current URL path. Supports:
 * - Static segment labels from the nav i18n keys
 * - Dynamic segments (IDs) shown as "#ID" or custom labels via props
 * - Home icon for root
 *
 * Usage:
 *   <Breadcrumbs />                     // Auto from URL
 *   <Breadcrumbs items={[...]} />       // Custom override
 */

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
}

// Map URL segments to human-readable labels
const SEGMENT_LABELS: Record<string, string> = {
  'pos': 'POS',
  'kds': 'Kitchen Display',
  'waiter': 'Waiter',
  'menu': 'Menu / 86',
  'catalog': 'Product Catalog',
  'inventory': 'Inventory',
  'stock-count': 'Stock Count',
  'production': 'Production',
  'requisitions': 'Requisitions',
  'purchase-orders': 'Purchase Orders',
  'transfers': 'Transfers',
  'wastage': 'Wastage',
  'suppliers': 'Suppliers',
  'customers': 'Customers',
  'deliveries': 'Deliveries',
  'sales-history': 'Order History',
  'sales-orders': 'Sales Orders',
  'sales-dashboard': 'Sales Dashboard',
  'pos-reports': 'POS Reports',
  'sessions': 'Sessions',
  'reports': 'Reports',
  'alerts': 'Alerts',
  'notifications': 'Notifications',
  'audit': 'Audit Log',
  'settings': 'Settings',
  'admin': 'Admin',
  'branches': 'Branches',
  'users': 'Users',
  'permissions': 'Permissions',
  'categories': 'Categories',
  'recipes': 'Recipes',
  'modifiers': 'Modifiers',
  'promotions': 'Promotions',
  'pricing': 'Pricing',
  'tables': 'Tables',
  'bookings': 'Bookings',
  'staff-tasks': 'Staff Tasks',
  'receivables': 'Receivables',
  'payables': 'Payables',
  'loyalty': 'Loyalty',
  'printers': 'Printers',
  'discount-rules': 'Discount Rules',
  'delivery-platforms': 'Delivery Platforms',
  'order-presets': 'Order Presets',
  'payment-methods': 'Payment Methods',
  'payment-terminals': 'Payment Terminals',
  'cash-roundings': 'Cash Rounding',
  'fiscal-positions': 'Fiscal Positions',
  'pricelists': 'Pricelists',
  'combos': 'Combos',
  'product-attributes': 'Attributes',
  'iot-devices': 'IoT Devices',
  'self-order': 'Self-Ordering',
  'qr-codes': 'QR Codes',
  'new': 'New',
};

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const location = useLocation();
  const { t } = useTranslation();

  const crumbs: BreadcrumbItem[] = items || (() => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length <= 1) return []; // Don't show for top-level pages

    const result: BreadcrumbItem[] = [];
    let pathSoFar = '';

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      pathSoFar += `/${seg}`;

      // Try to get a human label
      const label = SEGMENT_LABELS[seg] ||
        (seg.match(/^\d+$/) ? `#${seg}` : seg.replace(/-/g, ' '));

      result.push({
        label,
        path: i < segments.length - 1 ? pathSoFar : undefined, // Last crumb is current (no link)
      });
    }

    return result;
  })();

  if (!crumbs.length) return null;

  return (
    <nav className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2 overflow-x-auto" aria-label="Breadcrumb">
      <Link to="/" className="hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0">
        <HomeIcon className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1 flex-shrink-0">
          <ChevronRightIcon className="w-3 h-3 text-gray-300 dark:text-gray-600" />
          {crumb.path ? (
            <Link to={crumb.path} className="hover:text-gray-700 dark:hover:text-gray-200 capitalize">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-gray-700 dark:text-gray-200 font-medium capitalize">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
