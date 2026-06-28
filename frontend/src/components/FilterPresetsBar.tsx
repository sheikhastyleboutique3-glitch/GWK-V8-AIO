/**
 * Filter Presets Bar — Odoo-style saved filters UI.
 * Shows saved filter buttons + "Save Current" option.
 */
import { useState } from 'react';
import { useFilterPresets, FilterPreset } from '../lib/useFilterPresets';
import toast from 'react-hot-toast';

interface Props {
  pageKey: string;
  currentFilters: Record<string, any>;
  onApply: (filters: Record<string, any>) => void;
}

export default function FilterPresetsBar({ pageKey, currentFilters, onApply }: Props) {
  const { presets, activePreset, save, load, remove, setActivePreset } = useFilterPresets(pageKey);
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState('');

  const handleSave = () => {
    if (!saveName.trim()) return;
    save(saveName.trim(), currentFilters);
    toast.success(`Filter "${saveName}" saved`);
    setSaveName('');
    setShowSave(false);
  };

  const handleLoad = (preset: FilterPreset) => {
    const filters = load(preset.id);
    if (filters) onApply(filters);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Saved presets as pills */}
      {presets.map((p) => (
        <div key={p.id} className="flex items-center gap-0.5">
          <button
            onClick={() => handleLoad(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activePreset === p.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            ⭐ {p.name}
          </button>
          <button
            onClick={() => { remove(p.id); toast.success('Filter removed'); }}
            className="text-gray-400 hover:text-red-500 text-xs px-1"
            title="Remove"
          >
            ✕
          </button>
        </div>
      ))}

      {/* Save current filter */}
      {showSave ? (
        <div className="flex items-center gap-1">
          <input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSave(false); }}
            placeholder="Filter name..."
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs w-32"
            autoFocus
          />
          <button onClick={handleSave} className="px-2 py-1 rounded bg-primary text-white text-xs">Save</button>
          <button onClick={() => setShowSave(false)} className="text-xs text-gray-400">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setShowSave(true)}
          className="px-3 py-1.5 rounded-lg text-xs border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-primary hover:text-primary transition-colors"
        >
          + Save Filter
        </button>
      )}

      {/* Clear active */}
      {activePreset && (
        <button
          onClick={() => { setActivePreset(null); onApply({}); }}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Clear
        </button>
      )}
    </div>
  );
}
