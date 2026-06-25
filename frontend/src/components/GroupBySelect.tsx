/**
 * GroupBySelect — Odoo-style "Group By" dropdown for list views.
 *
 * Supports multi-layer grouping. When active, data is displayed in
 * collapsible sections with subtotals per group.
 *
 * Usage:
 *   <GroupBySelect
 *     fields={[{ key: 'channel', label: 'Channel' }, { key: 'status', label: 'Status' }]}
 *     value={groupByFields}
 *     onChange={setGroupByFields}
 *   />
 *
 * Then in the data display, use groupData(items, groupByFields) to structure the data.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface GroupByField {
  key: string;
  label: string;
}

interface Props {
  fields: GroupByField[];
  value: string[];
  onChange: (fields: string[]) => void;
}

export default function GroupBySelect({ fields, value, onChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const toggle = (key: string) => {
    if (value.includes(key)) {
      onChange(value.filter((k) => k !== key));
    } else {
      onChange([...value, key]);
    }
  };

  const clear = () => onChange([]);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${value.length > 0 ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
      >
        {t('filter.groupBy', 'Group by')}{value.length > 0 ? ` (${value.length})` : ''}
      </button>

      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg p-2 min-w-[160px]">
          {fields.map((f) => (
            <label key={f.key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={value.includes(f.key)}
                onChange={() => toggle(f.key)}
                className="rounded border-gray-300"
              />
              <span className="text-xs">{f.label}</span>
            </label>
          ))}
          {value.length > 0 && (
            <button onClick={clear} className="w-full mt-1 px-2 py-1 text-[10px] text-red-500 hover:underline text-left">
              {t('filter.clearGroupBy', 'Clear grouping')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Utility: Group an array of items by specified fields (multi-level).
 * Returns a nested structure: { key, label, items, subtotal, children? }
 */
export interface GroupedData {
  key: string;
  label: string;
  items: any[];
  count: number;
  total: number; // sum of 'total' field if present
  children?: GroupedData[];
}

export function groupData(items: any[], fields: string[], totalField = 'total'): GroupedData[] {
  if (!fields.length || !items.length) return [];

  const [field, ...rest] = fields;
  const groups = new Map<string, any[]>();

  for (const item of items) {
    const val = String(item[field] ?? 'Unknown');
    if (!groups.has(val)) groups.set(val, []);
    groups.get(val)!.push(item);
  }

  return [...groups.entries()].map(([key, groupItems]) => ({
    key,
    label: key,
    items: groupItems,
    count: groupItems.length,
    total: groupItems.reduce((s, i) => s + (Number(i[totalField]) || 0), 0),
    children: rest.length ? groupData(groupItems, rest, totalField) : undefined,
  }));
}
