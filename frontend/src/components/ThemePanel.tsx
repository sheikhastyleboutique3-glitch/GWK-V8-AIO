/**
 * ThemePanel — Visual theme selector with preview cards + density toggle.
 * Opens as a popover from the Layout sidebar/header.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  THEMES, DENSITIES, ThemeMode, DensityMode, ThemeState,
  loadThemeState, saveThemeState, applyThemeToDOM, listenOSScheme,
} from '../lib/themes';

export default function ThemePanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [state, setState] = useState<ThemeState>(loadThemeState());

  useEffect(() => {
    applyThemeToDOM(state);
    saveThemeState(state);
  }, [state]);

  // OS sync listener
  useEffect(() => {
    if (!state.osSync) return;
    const unsub = listenOSScheme((isDark) => {
      setState((s) => ({ ...s, theme: isDark ? 'deep-slate' : 'corporate-light' }));
    });
    return unsub;
  }, [state.osSync]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-[var(--color-surface-elevated)] rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Theme & Display</h2>
          <button onClick={onClose} className="text-xl opacity-50 hover:opacity-100">✕</button>
        </div>

        {/* Theme Grid */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-muted)' }}>Visual Theme</h3>
          <div className="grid grid-cols-2 gap-3">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setState({ ...state, theme: theme.id, osSync: false })}
                className={`relative rounded-xl border-2 p-3 text-left transition-all ${state.theme === theme.id ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20' : 'border-transparent hover:border-gray-300'}`}
                style={{ backgroundColor: theme.colors.surface }}
              >
                {/* Mini preview */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}>
                    {theme.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: theme.colors.text }}>{theme.name}</div>
                    <div className="text-[10px]" style={{ color: theme.colors.textMuted }}>{theme.description}</div>
                  </div>
                </div>
                {/* Color swatches */}
                <div className="flex gap-1">
                  {[theme.colors.primary, theme.colors.success, theme.colors.danger, theme.colors.warning, theme.colors.background].map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                  ))}
                </div>
                {state.theme === theme.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white" style={{ backgroundColor: theme.colors.primary }}>✓</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Density Selector */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--color-text-muted)' }}>Layout Density</h3>
          <div className="flex gap-2">
            {DENSITIES.map((d) => (
              <button
                key={d.id}
                onClick={() => setState({ ...state, density: d.id })}
                className={`flex-1 rounded-xl border-2 p-3 text-center transition-all ${state.density === d.id ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <div className="text-lg mb-1">{d.icon}</div>
                <div className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{d.name}</div>
                <div className="text-[10px]" style={{ color: 'var(--color-text-subtle)' }}>{d.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* OS Sync */}
        <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Sync with OS</div>
            <div className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Auto-switch light/dark with system schedule</div>
          </div>
          <label className="relative inline-flex cursor-pointer">
            <input
              type="checkbox"
              checked={state.osSync}
              onChange={(e) => setState({ ...state, osSync: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-5 rounded-full bg-gray-300 peer-checked:bg-[var(--color-primary)] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
          </label>
        </div>
      </div>
    </div>
  );
}
