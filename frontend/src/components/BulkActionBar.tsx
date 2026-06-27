/**
 * Bulk Action Bar (Odoo-style mass actions).
 *
 * Shows a floating bar at the bottom when items are selected.
 * Provides common actions: delete, archive, change category, export.
 */
import { useTranslation } from 'react-i18next';

export interface BulkAction {
  label: string;
  icon?: string;
  variant?: 'danger' | 'default' | 'primary';
  onClick: (selectedIds: number[]) => void;
}

interface Props {
  selectedIds: number[];
  totalCount: number;
  onClear: () => void;
  onSelectAll?: () => void;
  actions: BulkAction[];
}

export default function BulkActionBar({ selectedIds, totalCount, onClear, onSelectAll, actions }: Props) {
  const { t } = useTranslation();
  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-2xl border border-gray-700 px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom">
      {/* Selection info */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {selectedIds.length} {t('common.selected', 'selected')}
        </span>
        {onSelectAll && selectedIds.length < totalCount && (
          <button onClick={onSelectAll} className="text-xs text-primary hover:underline">
            Select all {totalCount}
          </button>
        )}
        <button onClick={onClear} className="text-xs text-gray-400 hover:text-white ms-1">
          Clear
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-600" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => action.onClick(selectedIds)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              action.variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : action.variant === 'primary'
                ? 'bg-primary hover:bg-primary/90 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            }`}
          >
            {action.icon && <span className="me-1">{action.icon}</span>}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Hook: manage bulk selection state for a list of items.
 */
export function useBulkSelect<T extends { id: number }>(items: T[]) {
  const { useState } = require('react');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggle = (id: number) => {
    setSelectedIds((prev: number[]) =>
      prev.includes(id) ? prev.filter((x: number) => x !== id) : [...prev, id]
    );
  };

  const isSelected = (id: number) => selectedIds.includes(id);

  const selectAll = () => setSelectedIds(items.map((i) => i.id));
  const clear = () => setSelectedIds([]);

  const toggleAll = () => {
    if (selectedIds.length === items.length) clear();
    else selectAll();
  };

  return { selectedIds, toggle, isSelected, selectAll, clear, toggleAll, setSelectedIds };
}
