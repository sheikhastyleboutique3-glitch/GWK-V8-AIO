/**
 * ThemePanel — Visual theme selector with preview cards + density toggle + schedule.
 * Opens as a popover from the Layout sidebar/header.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  THEMES, DENSITIES, ThemeMode, DensityMode, ThemeState, ThemeSchedule,
  loadThemeState, saveThemeState, applyThemeToDOM, listenOSScheme,
  startScheduleWatcher, isTouchDevice, syncThemeToBackend,
} from '../lib/themes';

export default function ThemePanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [state, setState] = useState<ThemeState>(loadThemeState());
  const [touchDetected] = useState(isTouchDevice());

  useEffect(() => {
    applyThemeToDOM(state);
    saveThemeState(state);
    // Best-effort backend sync (non-blocking)
    const token = localStorage.getItem('token');
    if (token) {
      const base = window.location.origin.includes('localhost')
        ? `${window.location.protocol}//${window.location.hostname}:3000`
        : '';
      syncThemeToBackend(state, base, token);
    }
  }, [state]);

  // OS sync listener
  useEffect(() => {
    if (!state.osSync) return;
    const unsub = listenOSScheme((isDark) => {
      setState((s) => ({ ...s, theme: isDark ? 'deep-slate' : 'corporate-light' }));
    });
    return unsub;
  }, [state.osSync]);

  // Schedule watcher
  useEffect(() => {
    const unsub = startScheduleWatcher(state, (theme) => {
      setState((s) => ({ ...s, theme }));
    });
    return unsub;
  }, [state.schedule.enabled, state.schedule.lightStart, state.schedule.darkStart]);

  const updateSchedule = (patch: Partial<ThemeSchedule>) => {
    setState((s) => ({ ...s, schedule: { ...s.schedule, ...patch }, osSync: false }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Theme & Display</h2>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">✕</button>
        </div>

        {/* ─── Theme Grid ─────────────────────────────────────────────────────── */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Visual Theme</h3>
          <div className="grid grid-cols-2 gap-3">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setState({ ...state, theme: theme.id, osSync: false, schedule: { ...state.schedule, enabled: false } })}
                className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                  state.theme === theme.id
                    ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                style={{ backgroundColor: theme.colors.surface }}
              >
                {/* Mini preview */}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: theme.colors.background, border: `1px solid ${theme.colors.border}` }}
                  >
                    {theme.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate" style={{ color: theme.colors.text }}>{theme.name}</div>
                    <div className="text-[10px] truncate" style={{ color: theme.colors.textMuted }}>{theme.description}</div>
                  </div>
                </div>
                {/* Color swatches */}
                <div className="flex gap-1">
                  {[theme.colors.primary, theme.colors.success, theme.colors.danger, theme.colors.warning, theme.colors.background].map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: c }} />
                  ))}
                </div>
                {state.theme === theme.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white bg-blue-500 shadow">✓</div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ─── Density Selector ───────────────────────────────────────────────── */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Layout Density</h3>
          <div className="flex gap-2">
            {DENSITIES.map((d) => (
              <button
                key={d.id}
                onClick={() => setState({ ...state, density: d.id, autoDensity: false })}
                disabled={state.autoDensity}
                className={`flex-1 rounded-xl border-2 p-3 text-center transition-all ${
                  !state.autoDensity && state.density === d.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                } ${state.autoDensity ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-lg mb-1">{d.icon}</div>
                <div className="text-xs font-medium text-gray-900 dark:text-gray-100">{d.name}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">{d.description}</div>
              </button>
            ))}
          </div>

          {/* Auto-density toggle */}
          <div className="flex items-center justify-between mt-3 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div>
              <div className="text-xs font-medium text-gray-900 dark:text-gray-100">Auto-detect device</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                {touchDetected ? '🖐 Touch device detected → Spacious' : '🖱 Desktop detected → Default'}
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer">
              <input
                type="checkbox"
                checked={state.autoDensity}
                onChange={(e) => setState({ ...state, autoDensity: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 rounded-full bg-gray-300 dark:bg-gray-600 peer-checked:bg-blue-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          </div>
        </section>

        {/* ─── Automation Section ─────────────────────────────────────────────── */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Automation</h3>

          {/* OS Sync */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 p-3">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Sync with OS</div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">Auto-switch light/dark with system</div>
            </div>
            <label className="relative inline-flex cursor-pointer">
              <input
                type="checkbox"
                checked={state.osSync}
                onChange={(e) => setState({ ...state, osSync: e.target.checked, schedule: { ...state.schedule, enabled: false } })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 rounded-full bg-gray-300 dark:bg-gray-600 peer-checked:bg-blue-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          </div>

          {/* Schedule */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Time-based schedule</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">Auto-switch at set times</div>
              </div>
              <label className="relative inline-flex cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.schedule.enabled}
                  onChange={(e) => updateSchedule({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 rounded-full bg-gray-300 dark:bg-gray-600 peer-checked:bg-blue-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
              </label>
            </div>
            {state.schedule.enabled && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">☀️ Light starts</label>
                  <input
                    type="time"
                    value={state.schedule.lightStart}
                    onChange={(e) => updateSchedule({ lightStart: e.target.value })}
                    className="w-full mt-0.5 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">🌙 Dark starts</label>
                  <input
                    type="time"
                    value={state.schedule.darkStart}
                    onChange={(e) => updateSchedule({ darkStart: e.target.value })}
                    className="w-full mt-0.5 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
