/**
 * #3 — Drag-and-Drop Dashboard Builder
 *
 * Allows managers to customize their dashboard layout by reordering widget cards.
 * Persists layout in localStorage per user.
 *
 * Available widgets: Revenue, Orders, Avg Ticket, GP%, Low Stock, Top Products,
 * Expiring Soon, Recent Orders, Active Sessions.
 *
 * Usage:
 *   <DashboardBuilder />
 */
import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface DashboardWidget {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
  size: 'sm' | 'md' | 'lg'; // grid column span
}

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'revenue', label: "Today's Revenue", icon: '💰', enabled: true, size: 'sm' },
  { id: 'orders', label: "Today's Orders", icon: '📋', enabled: true, size: 'sm' },
  { id: 'avg-ticket', label: 'Avg Ticket', icon: '🎫', enabled: true, size: 'sm' },
  { id: 'gp', label: 'Gross Profit %', icon: '📈', enabled: true, size: 'sm' },
  { id: 'low-stock', label: 'Low Stock Alerts', icon: '⚠️', enabled: true, size: 'sm' },
  { id: 'top-products', label: 'Top Products', icon: '🏆', enabled: true, size: 'md' },
  { id: 'expiring', label: 'Expiring Soon', icon: '⏰', enabled: true, size: 'md' },
  { id: 'recent-orders', label: 'Recent Orders', icon: '🧾', enabled: true, size: 'lg' },
  { id: 'active-sessions', label: 'Active Sessions', icon: '🟢', enabled: false, size: 'sm' },
  { id: 'wastage', label: 'Wastage Today', icon: '🗑️', enabled: false, size: 'sm' },
];

const STORAGE_KEY = 'gwk_dashboard_layout';

function loadLayout(userId?: number): DashboardWidget[] {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${userId || 'default'}`);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_WIDGETS;
}

function saveLayout(widgets: DashboardWidget[], userId?: number) {
  localStorage.setItem(`${STORAGE_KEY}_${userId || 'default'}`, JSON.stringify(widgets));
}

export function useDashboardLayout() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => loadLayout(user?.id));

  const toggleWidget = useCallback((id: string) => {
    setWidgets(prev => {
      const updated = prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w);
      saveLayout(updated, user?.id);
      return updated;
    });
  }, [user?.id]);

  const reorder = useCallback((fromIdx: number, toIdx: number) => {
    setWidgets(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      saveLayout(updated, user?.id);
      return updated;
    });
  }, [user?.id]);

  const resetLayout = useCallback(() => {
    setWidgets(DEFAULT_WIDGETS);
    saveLayout(DEFAULT_WIDGETS, user?.id);
  }, [user?.id]);

  return { widgets, toggleWidget, reorder, resetLayout, enabledWidgets: widgets.filter(w => w.enabled) };
}

/**
 * Dashboard customization panel.
 * Shows all available widgets with toggles + drag to reorder.
 */
export default function DashboardBuilder({ onClose }: { onClose: () => void }) {
  const { widgets, toggleWidget, reorder, resetLayout } = useDashboardLayout();
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">⚙️ Customize Dashboard</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-xs text-gray-500 mb-3">Toggle widgets on/off. Drag to reorder.</p>
          {widgets.map((w, i) => (
            <div
              key={w.id}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={() => { if (dragIdx !== null && dragIdx !== i) reorder(dragIdx, i); setDragIdx(null); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-grab active:cursor-grabbing ${
                w.enabled
                  ? 'border-primary/30 bg-primary/5'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              } ${dragIdx === i ? 'ring-2 ring-primary scale-[1.02]' : ''}`}
            >
              <span className="text-lg">{w.icon}</span>
              <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">{w.label}</span>
              <label className="relative inline-flex cursor-pointer">
                <input
                  type="checkbox"
                  checked={w.enabled}
                  onChange={() => toggleWidget(w.id)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 rounded-full bg-gray-300 dark:bg-gray-600 peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4" />
              </label>
              <span className="text-gray-300 dark:text-gray-600 text-sm cursor-grab">⋮⋮</span>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex justify-between">
          <button onClick={resetLayout} className="text-xs text-gray-500 hover:text-gray-700">Reset to Default</button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">Done</button>
        </div>
      </div>
    </div>
  );
}
