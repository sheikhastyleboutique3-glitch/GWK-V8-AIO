/**
 * DataToolbar — Drop-in Odoo-style toolbar for any list/table page.
 * Combines: AdvancedFilterBuilder + GroupBySelect + Export button + Saved Views.
 * 
 * Gives every page instant Odoo-parity search/filter/group/export capabilities
 * with a single component import.
 *
 * Usage:
 *   <DataToolbar
 *     filterFields={[{ key: 'status', label: 'Status', type: 'select', options: [...] }]}
 *     groupByFields={[{ key: 'status', label: 'Status' }, { key: 'channel', label: 'Channel' }]}
 *     onFilterApply={(params) => setFilters(params)}
 *     onGroupByChange={(fields) => setGroupBy(fields)}
 *     groupByValue={groupBy}
 *     onExport={() => handleExport()}
 *     exportLabel="Export CSV"
 *     pageId="inventory"   // for saved view persistence
 *   />
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AdvancedFilterBuilder, { FilterField, FilterPreset, FilterRule } from './AdvancedFilterBuilder';
import GroupBySelect, { GroupByField } from './GroupBySelect';
import SavedViewsMenu from './SavedViewsMenu';
import { SavedView } from '../lib/savedViews';

const PRESETS_PREFIX = 'gwk-toolbar-presets-';

function loadPresets(pageId: string): FilterPreset[] {
  try { return JSON.parse(localStorage.getItem(`${PRESETS_PREFIX}${pageId}`) || '[]'); } catch { return []; }
}
function savePresets(pageId: string, presets: FilterPreset[]) {
  localStorage.setItem(`${PRESETS_PREFIX}${pageId}`, JSON.stringify(presets));
}

interface Props {
  /** Fields available for advanced filtering */
  filterFields: FilterField[];
  /** Fields available for group-by */
  groupByFields?: GroupByField[];
  /** Called when filter rules are applied */
  onFilterApply: (params: Record<string, string>) => void;
  /** Current group-by selection */
  groupByValue?: string[];
  /** Called when group-by changes */
  onGroupByChange?: (fields: string[]) => void;
  /** Export handler (called on click) */
  onExport?: () => void;
  /** Export button label */
  exportLabel?: string;
  /** Whether export is loading */
  exporting?: boolean;
  /** Page identifier for saved presets persistence */
  pageId: string;
  /** Optional class */
  className?: string;
}

export default function DataToolbar({
  filterFields,
  groupByFields,
  onFilterApply,
  groupByValue = [],
  onGroupByChange,
  onExport,
  exportLabel = 'Export CSV',
  exporting = false,
  pageId,
  className = '',
}: Props) {
  const { t } = useTranslation();
  const [presets, setPresets] = useState<FilterPreset[]>(loadPresets(pageId));

  const handleSavePreset = (name: string, rules: FilterRule[]) => {
    const updated = [...presets, { name, rules }];
    setPresets(updated);
    savePresets(pageId, updated);
  };

  const handleDeletePreset = (name: string) => {
    const updated = presets.filter((p) => p.name !== name);
    setPresets(updated);
    savePresets(pageId, updated);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Advanced Filter Builder */}
        <div className="flex-1 min-w-0">
          <AdvancedFilterBuilder
            fields={filterFields}
            onApply={onFilterApply}
            presets={presets}
            onSavePreset={handleSavePreset}
            onDeletePreset={handleDeletePreset}
          />
        </div>

        {/* Group By */}
        {groupByFields && groupByFields.length > 0 && onGroupByChange && (
          <GroupBySelect
            fields={groupByFields}
            value={groupByValue}
            onChange={onGroupByChange}
          />
        )}

        {/* Export */}
        {onExport && (
          <button
            onClick={onExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {exporting ? 'Exporting...' : exportLabel}
          </button>
        )}

        {/* Saved Views */}
        <SavedViewsMenu
          pageId={pageId}
          currentFilters={{}}
          currentGroupBy={groupByValue}
          onLoad={(view: SavedView) => {
            onFilterApply(view.filters);
            if (onGroupByChange) onGroupByChange(view.groupBy);
          }}
        />
      </div>
    </div>
  );
}
