/**
 * AdvancedFilterBuilder — Odoo-style multi-condition filter UI.
 *
 * Features:
 * - Field picker (from configurable field definitions)
 * - Operator selector (contains, equals, >, <, between, is set/not set)
 * - AND/OR logic (multiple rules)
 * - Date range support (from/to)
 * - Outputs a flat params object for API queries
 *
 * Usage:
 *   <AdvancedFilterBuilder
 *     fields={[{ key: 'status', label: 'Status', type: 'select', options: [...] }, ...]}
 *     onApply={(params) => setFilters(params)}
 *     savedPresets={presets}
 *     onSavePreset={(name, params) => saveToLocalStorage(name, params)}
 *   />
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface FilterField {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[]; // for 'select' type
}

export interface FilterRule {
  id: string;
  field: string;
  operator: string;
  value: string;
  valueTo?: string; // for 'between' operator
}

export interface FilterPreset {
  name: string;
  rules: FilterRule[];
}

const OPERATORS: Record<FieldType, { value: string; label: string }[]> = {
  text: [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'equals' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'not_empty', label: 'is set' },
  ],
  number: [
    { value: 'equals', label: '=' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'gte', label: '>=' },
    { value: 'lte', label: '<=' },
    { value: 'between', label: 'between' },
  ],
  date: [
    { value: 'equals', label: 'is' },
    { value: 'gt', label: 'after' },
    { value: 'lt', label: 'before' },
    { value: 'between', label: 'between' },
    { value: 'today', label: 'today' },
    { value: 'this_week', label: 'this week' },
    { value: 'this_month', label: 'this month' },
  ],
  select: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
  ],
  boolean: [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ],
};

function genId() {
  return Math.random().toString(36).slice(2, 8);
}

interface Props {
  fields: FilterField[];
  onApply: (params: Record<string, string>) => void;
  presets?: FilterPreset[];
  onSavePreset?: (name: string, rules: FilterRule[]) => void;
  onDeletePreset?: (name: string) => void;
}

export default function AdvancedFilterBuilder({ fields, onApply, presets, onSavePreset, onDeletePreset }: Props) {
  const { t } = useTranslation();
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [open, setOpen] = useState(false);

  const addRule = () => {
    const first = fields[0];
    setRules([...rules, { id: genId(), field: first?.key || '', operator: 'contains', value: '' }]);
    if (!open) setOpen(true);
  };

  const removeRule = (id: string) => setRules(rules.filter((r) => r.id !== id));

  const updateRule = (id: string, patch: Partial<FilterRule>) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const applyFilters = () => {
    const params: Record<string, string> = {};
    for (const rule of rules) {
      if (!rule.field || !rule.value) continue;
      const field = fields.find((f) => f.key === rule.field);
      if (!field) continue;

      // Map rule to a query param the backend understands
      if (field.type === 'date') {
        if (rule.operator === 'between' || rule.operator === 'gt' || rule.operator === 'equals') {
          params['from'] = rule.value;
          if (rule.valueTo) params['to'] = rule.valueTo;
          else if (rule.operator === 'equals') params['to'] = rule.value;
        } else if (rule.operator === 'lt') {
          params['to'] = rule.value;
        } else if (rule.operator === 'today') {
          const today = new Date().toISOString().slice(0, 10);
          params['from'] = today;
          params['to'] = today;
        } else if (rule.operator === 'this_week') {
          const now = new Date();
          const mon = new Date(now);
          mon.setDate(now.getDate() - now.getDay() + 1);
          params['from'] = mon.toISOString().slice(0, 10);
          params['to'] = now.toISOString().slice(0, 10);
        } else if (rule.operator === 'this_month') {
          const now = new Date();
          params['from'] = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
          params['to'] = now.toISOString().slice(0, 10);
        }
      } else if (field.type === 'select') {
        params[rule.field] = rule.value;
      } else if (field.type === 'number') {
        if (rule.operator === 'between') {
          params[`${rule.field}From`] = rule.value;
          if (rule.valueTo) params[`${rule.field}To`] = rule.valueTo;
        } else {
          params[rule.field] = rule.value;
        }
      } else {
        // text — use 'search' param
        params['search'] = rule.value;
      }
    }
    onApply(params);
  };

  const clearAll = () => {
    setRules([]);
    onApply({});
  };

  const loadPreset = (preset: FilterPreset) => {
    setRules(preset.rules.map((r) => ({ ...r, id: genId() })));
    setOpen(true);
  };

  const saveCurrentAsPreset = () => {
    if (!rules.length) return;
    const name = window.prompt('Save filter as:', '');
    if (name?.trim() && onSavePreset) {
      onSavePreset(name.trim(), rules);
    }
  };

  return (
    <div className="mb-3">
      {/* Compact bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={addRule} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800">
          + {t('filter.addRule', 'Add filter')}
        </button>
        {rules.length > 0 && (
          <>
            <span className="text-xs text-gray-500">{rules.length} {t('filter.active', 'active')}</span>
            <button onClick={applyFilters} className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium">
              {t('filter.apply', 'Apply')}
            </button>
            <button onClick={clearAll} className="px-2 py-1 text-xs text-gray-500 hover:text-red-600">
              {t('filter.clear', 'Clear all')}
            </button>
          </>
        )}
        {(presets?.length ?? 0) > 0 && (
          <select
            onChange={(e) => {
              const p = presets?.find((pr) => pr.name === e.target.value);
              if (p) loadPreset(p);
              e.currentTarget.value = '';
            }}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs"
          >
            <option value="">{t('filter.loadPreset', 'Load saved...')}</option>
            {presets?.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
        )}
        {rules.length > 0 && onSavePreset && (
          <button onClick={saveCurrentAsPreset} className="px-2 py-1 text-xs text-primary hover:underline">
            {t('filter.save', 'Save')}
          </button>
        )}
        {open && (
          <button onClick={() => setOpen(false)} className="ms-auto text-xs text-gray-400">
            {t('filter.collapse', 'Collapse')}
          </button>
        )}
      </div>

      {/* Expanded rule rows */}
      {open && rules.length > 0 && (
        <div className="mt-2 space-y-2 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          {rules.map((rule, idx) => {
            const fieldDef = fields.find((f) => f.key === rule.field);
            const ops = fieldDef ? OPERATORS[fieldDef.type] : OPERATORS.text;
            return (
              <div key={rule.id} className="flex flex-wrap items-center gap-2">
                {idx > 0 && <span className="text-[10px] text-gray-400 font-bold uppercase w-8">AND</span>}
                {idx === 0 && <span className="w-8" />}
                {/* Field picker */}
                <select
                  value={rule.field}
                  onChange={(e) => {
                    const f = fields.find((ff) => ff.key === e.target.value);
                    updateRule(rule.id, { field: e.target.value, operator: f ? OPERATORS[f.type][0]?.value || 'contains' : 'contains', value: '', valueTo: undefined });
                  }}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs min-w-[100px]"
                >
                  {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
                {/* Operator */}
                <select
                  value={rule.operator}
                  onChange={(e) => updateRule(rule.id, { operator: e.target.value })}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs"
                >
                  {ops.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {/* Value input */}
                {fieldDef?.type === 'select' ? (
                  <select
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                    className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs min-w-[100px]"
                  >
                    <option value="">—</option>
                    {fieldDef.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : fieldDef?.type === 'date' ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={rule.value}
                      onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                      className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs"
                    />
                    {rule.operator === 'between' && (
                      <>
                        <span className="text-xs text-gray-400">to</span>
                        <input
                          type="date"
                          value={rule.valueTo || ''}
                          onChange={(e) => updateRule(rule.id, { valueTo: e.target.value })}
                          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs"
                        />
                      </>
                    )}
                  </div>
                ) : fieldDef?.type === 'number' ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={rule.value}
                      onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                      className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs w-20"
                      placeholder="Value"
                    />
                    {rule.operator === 'between' && (
                      <>
                        <span className="text-xs text-gray-400">to</span>
                        <input
                          type="number"
                          value={rule.valueTo || ''}
                          onChange={(e) => updateRule(rule.id, { valueTo: e.target.value })}
                          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs w-20"
                          placeholder="Max"
                        />
                      </>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                    className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs min-w-[120px]"
                    placeholder="Value..."
                  />
                )}
                {/* Remove */}
                <button onClick={() => removeRule(rule.id)} className="text-red-500 text-sm hover:text-red-700">✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
