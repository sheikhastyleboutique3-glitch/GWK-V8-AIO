/**
 * #4 — Saved Filters / Favorites (Odoo-style)
 *
 * Persists filter presets per page in localStorage.
 * Users can save their current filter state as a named "favorite"
 * and restore it with one click.
 *
 * Usage:
 *   const { presets, activePreset, save, load, remove } = useFilterPresets('inventory');
 */
import { useState, useCallback, useEffect } from 'react';

export interface FilterPreset {
  id: string;
  name: string;
  filters: Record<string, any>;
  createdAt: string;
  isDefault?: boolean;
}

const STORAGE_KEY = 'gwk_filter_presets';

function getAllPresets(): Record<string, FilterPreset[]> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveAllPresets(data: Record<string, FilterPreset[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useFilterPresets(pageKey: string) {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Load presets for this page
  useEffect(() => {
    const all = getAllPresets();
    setPresets(all[pageKey] || []);
  }, [pageKey]);

  const save = useCallback((name: string, filters: Record<string, any>, isDefault = false) => {
    const all = getAllPresets();
    const pagePresets = all[pageKey] || [];
    const preset: FilterPreset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      filters,
      createdAt: new Date().toISOString(),
      isDefault,
    };
    // If marking as default, un-default others
    if (isDefault) {
      pagePresets.forEach(p => { p.isDefault = false; });
    }
    pagePresets.push(preset);
    all[pageKey] = pagePresets;
    saveAllPresets(all);
    setPresets(pagePresets);
    return preset;
  }, [pageKey]);

  const load = useCallback((presetId: string): Record<string, any> | null => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      setActivePreset(presetId);
      return preset.filters;
    }
    return null;
  }, [presets]);

  const remove = useCallback((presetId: string) => {
    const all = getAllPresets();
    const pagePresets = (all[pageKey] || []).filter(p => p.id !== presetId);
    all[pageKey] = pagePresets;
    saveAllPresets(all);
    setPresets(pagePresets);
    if (activePreset === presetId) setActivePreset(null);
  }, [pageKey, activePreset]);

  const getDefault = useCallback((): FilterPreset | undefined => {
    return presets.find(p => p.isDefault);
  }, [presets]);

  return { presets, activePreset, save, load, remove, getDefault, setActivePreset };
}
