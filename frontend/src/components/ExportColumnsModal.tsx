/**
 * ExportColumnsModal — Column picker before exporting data.
 * Users can select/deselect columns and save the layout as a template.
 * Supports CSV and Excel format selection.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrompt } from '../lib/usePrompt';

export interface ExportColumn {
  key: string;
  label: string;
  default?: boolean; // included by default
}

export type ExportFormat = 'csv' | 'excel';

interface Props {
  columns: ExportColumn[];
  exportType: string;
  onExport: (selectedColumns: string[], format: ExportFormat) => void;
  onClose: () => void;
}

const TEMPLATES_KEY_PREFIX = 'gwk-export-template-';

function loadTemplates(exportType: string): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(`${TEMPLATES_KEY_PREFIX}${exportType}`) || '{}'); } catch { return {}; }
}

function saveTemplates(exportType: string, templates: Record<string, string[]>) {
  localStorage.setItem(`${TEMPLATES_KEY_PREFIX}${exportType}`, JSON.stringify(templates));
}

export default function ExportColumnsModal({ columns, exportType, onExport, onClose }: Props) {
  const { t } = useTranslation();
  const [promptFn, PromptDialog] = usePrompt();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(columns.filter((c) => c.default !== false).map((c) => c.key))
  );
  const [templates, setTemplates] = useState(loadTemplates(exportType));
  const [format, setFormat] = useState<ExportFormat>('csv');

  const toggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const selectAll = () => setSelected(new Set(columns.map((c) => c.key)));
  const selectNone = () => setSelected(new Set());

  const saveAsTemplate = async () => {
    const name = await promptFn({ title: 'Save Template', placeholder: 'Template name...' });
    if (!name?.trim()) return;
    const updated = { ...templates, [name.trim()]: [...selected] };
    setTemplates(updated);
    saveTemplates(exportType, updated);
  };

  const loadTemplate = (name: string) => {
    const cols = templates[name];
    if (cols) setSelected(new Set(cols));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <PromptDialog />
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-5 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold">Export Columns</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg">✕</button>
        </div>

        {/* Format selector */}
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Format:</span>
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setFormat('csv')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${format === 'csv' ? 'bg-primary text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}
            >
              CSV
            </button>
            <button
              onClick={() => setFormat('excel')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${format === 'excel' ? 'bg-primary text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}
            >
              Excel (.xls)
            </button>
          </div>
        </div>

        {/* Template loader */}
        {Object.keys(templates).length > 0 && (
          <div className="mb-3 flex gap-2 flex-wrap">
            {Object.keys(templates).map((name) => (
              <button key={name} onClick={() => loadTemplate(name)} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-xs">
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Select all / none */}
        <div className="flex gap-2 mb-3 text-xs">
          <button onClick={selectAll} className="text-primary hover:underline">Select all</button>
          <button onClick={selectNone} className="text-gray-500 hover:underline">None</button>
          <button onClick={saveAsTemplate} className="ms-auto text-primary hover:underline">Save as template</button>
        </div>

        {/* Column checkboxes */}
        <div className="flex-1 overflow-y-auto space-y-1 mb-4">
          {columns.map((col) => (
            <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(col.key)}
                onChange={() => toggle(col.key)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">{col.label}</span>
            </label>
          ))}
        </div>

        {/* Export button */}
        <button
          onClick={() => onExport([...selected], format)}
          disabled={selected.size === 0}
          className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50"
        >
          Export as {format === 'excel' ? 'Excel' : 'CSV'} ({selected.size} columns)
        </button>
      </div>
    </div>
  );
}
