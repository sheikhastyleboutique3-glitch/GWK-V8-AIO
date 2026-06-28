/**
 * Dashboard Widget Configuration — Per-user customizable dashboard layout.
 *
 * Users can:
 * - Show/hide specific widgets
 * - Reorder widgets (drag-drop or up/down arrows)
 * - Choose widget size (full-width or half-width)
 *
 * Layout is stored in localStorage (instant) + synced to the user's
 * themePreferences on the backend (persists across devices).
 */

export interface DashboardWidget {
  id: string;
  title: string;
  icon: string;
  size: 'full' | 'half';
  visible: boolean;
  order: number;
}

// Default widget list for new users
export const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'sales-today', title: 'Today\'s Sales', icon: '💰', size: 'half', visible: true, order: 0 },
  { id: 'orders-count', title: 'Orders', icon: '🧾', size: 'half', visible: true, order: 1 },
  { id: 'revenue-chart', title: 'Revenue Trend', icon: '📈', size: 'full', visible: true, order: 2 },
  { id: 'best-sellers', title: 'Best Sellers', icon: '⭐', size: 'half', visible: true, order: 3 },
  { id: 'payment-mix', title: 'Payment Methods', icon: '💳', size: 'half', visible: true, order: 4 },
  { id: 'low-stock', title: 'Low Stock Alerts', icon: '📦', size: 'half', visible: true, order: 5 },
  { id: 'expiry-alerts', title: 'Expiry Warnings', icon: '📅', size: 'half', visible: true, order: 6 },
  { id: 'staff-performance', title: 'Staff Performance', icon: '👥', size: 'full', visible: true, order: 7 },
  { id: 'recent-orders', title: 'Recent Orders', icon: '🕐', size: 'full', visible: true, order: 8 },
  { id: 'food-cost', title: 'Food Cost %', icon: '🍽️', size: 'half', visible: true, order: 9 },
  { id: 'active-sessions', title: 'Active Sessions', icon: '💼', size: 'half', visible: true, order: 10 },
];

const STORAGE_KEY = 'gwk_dashboard_layout';

/** Load user's dashboard widget layout. */
export function loadWidgetLayout(): DashboardWidget[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as DashboardWidget[];
      // Merge with defaults (in case new widgets were added since last save)
      const storedIds = new Set(parsed.map(w => w.id));
      const merged = [...parsed];
      for (const dw of DEFAULT_WIDGETS) {
        if (!storedIds.has(dw.id)) {
          merged.push({ ...dw, order: merged.length });
        }
      }
      return merged.sort((a, b) => a.order - b.order);
    }
  } catch {}
  return [...DEFAULT_WIDGETS];
}

/** Save user's dashboard widget layout. */
export function saveWidgetLayout(widgets: DashboardWidget[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

/** Toggle widget visibility. */
export function toggleWidget(widgets: DashboardWidget[], widgetId: string): DashboardWidget[] {
  return widgets.map(w => w.id === widgetId ? { ...w, visible: !w.visible } : w);
}

/** Move a widget up or down in the order. */
export function moveWidget(widgets: DashboardWidget[], widgetId: string, direction: 'up' | 'down'): DashboardWidget[] {
  const idx = widgets.findIndex(w => w.id === widgetId);
  if (idx < 0) return widgets;
  const newIdx = direction === 'up' ? Math.max(0, idx - 1) : Math.min(widgets.length - 1, idx + 1);
  if (newIdx === idx) return widgets;
  const copy = [...widgets];
  [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
  return copy.map((w, i) => ({ ...w, order: i }));
}

/** Change widget size. */
export function resizeWidget(widgets: DashboardWidget[], widgetId: string, size: 'full' | 'half'): DashboardWidget[] {
  return widgets.map(w => w.id === widgetId ? { ...w, size } : w);
}

/** Reset to default layout. */
export function resetWidgetLayout(): DashboardWidget[] {
  localStorage.removeItem(STORAGE_KEY);
  return [...DEFAULT_WIDGETS];
}
