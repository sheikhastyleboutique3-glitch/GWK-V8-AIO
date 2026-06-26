/**
 * GroupedTableView — Collapsible accordion UI for multi-level grouped data.
 * Works with the GroupBySelect component's `groupData()` output.
 *
 * Features:
 * - Multi-level collapsible sections with subtotals
 * - Expand/collapse all toggle
 * - Row count + total per group
 * - Smooth open/close animation
 * - Dark mode aware
 *
 * Usage:
 *   const grouped = groupData(items, groupByFields, 'total');
 *   <GroupedTableView
 *     groups={grouped}
 *     columns={[{ key: 'orderNo', label: 'Order' }, { key: 'total', label: 'Total', align: 'right' }]}
 *     renderRow={(item) => <tr>...</tr>}
 *   />
 */
import { useState, useMemo } from 'react';
import { GroupedData } from './GroupBySelect';

export interface Column {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
}

interface Props {
  groups: GroupedData[];
  columns: Column[];
  renderRow: (item: any, index: number) => React.ReactNode;
  totalLabel?: string;
  currency?: string;
  className?: string;
}

export default function GroupedTableView({
  groups,
  columns,
  renderRow,
  totalLabel = 'Total',
  currency = '',
  className = '',
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(groups.map((g) => g.key)));

  const allKeys = useMemo(() => {
    const keys: string[] = [];
    const collectKeys = (gs: GroupedData[], prefix = '') => {
      gs.forEach((g) => {
        const k = prefix + g.key;
        keys.push(k);
        if (g.children) collectKeys(g.children, k + '/');
      });
    };
    collectKeys(groups);
    return keys;
  }, [groups]);

  const allExpanded = expanded.size >= allKeys.length;

  const toggleAll = () => {
    if (allExpanded) {
      setExpanded(new Set());
    } else {
      setExpanded(new Set(allKeys));
    }
  };

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const grandTotal = groups.reduce((s, g) => s + g.total, 0);
  const grandCount = groups.reduce((s, g) => s + g.count, 0);

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          {groups.length} group{groups.length !== 1 ? 's' : ''} · {grandCount} row{grandCount !== 1 ? 's' : ''}
          {grandTotal > 0 && <span className="ml-2 text-primary">{totalLabel}: {currency}{grandTotal.toFixed(2)}</span>}
        </div>
        <button
          onClick={toggleAll}
          className="text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          {allExpanded ? '▼ Collapse all' : '▶ Expand all'}
        </button>
      </div>

      {/* Groups */}
      {groups.map((group) => (
        <GroupSection
          key={group.key}
          group={group}
          prefix=""
          columns={columns}
          renderRow={renderRow}
          expanded={expanded}
          toggle={toggle}
          currency={currency}
          totalLabel={totalLabel}
          depth={0}
        />
      ))}
    </div>
  );
}

function GroupSection({
  group,
  prefix,
  columns,
  renderRow,
  expanded,
  toggle,
  currency,
  totalLabel,
  depth,
}: {
  group: GroupedData;
  prefix: string;
  columns: Column[];
  renderRow: (item: any, index: number) => React.ReactNode;
  expanded: Set<string>;
  toggle: (key: string) => void;
  currency: string;
  totalLabel: string;
  depth: number;
}) {
  const fullKey = prefix + group.key;
  const isOpen = expanded.has(fullKey);

  const depthColors = [
    'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',
    'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800',
    'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800',
  ];
  const colorClass = depthColors[depth % depthColors.length];

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      {/* Group header (clickable) */}
      <button
        onClick={() => toggle(fullKey)}
        className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${colorClass}`}
        style={{ paddingLeft: `${16 + depth * 16}px` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 transition-transform" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            ▶
          </span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {group.label}
          </span>
          <span className="text-[10px] text-gray-500 bg-gray-200 dark:bg-gray-700 rounded-full px-1.5 py-0.5">
            {group.count}
          </span>
        </div>
        {group.total > 0 && (
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {currency}{group.total.toFixed(2)}
          </span>
        )}
      </button>

      {/* Content */}
      {isOpen && (
        <div>
          {/* Sub-groups (children) */}
          {group.children && group.children.length > 0 ? (
            group.children.map((child) => (
              <GroupSection
                key={child.key}
                group={child}
                prefix={fullKey + '/'}
                columns={columns}
                renderRow={renderRow}
                expanded={expanded}
                toggle={toggle}
                currency={currency}
                totalLabel={totalLabel}
                depth={depth + 1}
              />
            ))
          ) : (
            /* Leaf items — render as table rows */
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/30">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-3 py-1.5 text-[10px] uppercase font-semibold text-gray-500 ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {group.items.map((item, idx) => renderRow(item, idx))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
