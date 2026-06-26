/**
 * ThemePanel — Unified enterprise theme engine.
 * Combines brand color presets + manual color picker + dark/light mode +
 * density selector + OS sync + time-based schedule + font picker.
 *
 * Single access point: sidebar 🎨 icon OR Settings page.
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import {
  THEME_PRESETS, FONT_STACKS, ThemeState, ThemeFont, BrandRamp,
  loadThemeLocal, saveThemeLocal, applyTheme, resolveRamp, hexToRamp, themeToSettings,
} from '../lib/theme';
import {
  DENSITIES, DensityMode, DensityConfig,
  loadThemeState, saveThemeState, applyThemeToDOM,
  listenOSScheme, isTouchDevice, ThemeSchedule,
} from '../lib/themes';

interface CombinedState {
  // Brand / color
  mode: 'preset' | 'manual';
  preset: string;
  primary: string;
  font: ThemeFont;
  dark: boolean;
  // Density & automation
  density: DensityMode;
  autoDensity: boolean;
  osSync: boolean;
  schedule: ThemeSchedule;
}

function loadCombined(): CombinedState {
  const brand = loadThemeLocal();
  const display = loadThemeState();
  return {
    mode: brand.mode,
    preset: brand.preset,
    primary: brand.primary,
    font: brand.font,
    dark: brand.dark,
    density: display.density,
    autoDensity: display.autoDensity,
    osSync: display.osSync,
    schedule: display.schedule,
  };
}

function saveCombined(state: CombinedState) {
  // Save brand part
  saveThemeLocal({ mode: state.mode, preset: state.preset, primary: state.primary, font: state.font, dark: state.dark });
  applyTheme({ mode: state.mode, preset: state.preset, primary: state.primary, font: state.font, dark: state.dark });
  // Save density part
  saveThemeState({ theme: state.dark ? 'deep-slate' : 'corporate-light', density: state.density, osSync: state.osSync, autoDensity: state.autoDensity, schedule: state.schedule });
  applyThemeToDOM({ theme: state.dark ? 'deep-slate' : 'corporate-light', density: state.density, osSync: state.osSync, autoDensity: state.autoDensity, schedule: state.schedule });
}

export default function ThemePanel({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const qc = useQueryClient();
  const [state, setState] = useState<CombinedState>(loadCombined());
  const [touchDetected] = useState(isTouchDevice());
  const [tab, setTab] = useState<'appearance' | 'density' | 'automation'>('appearance');

  const update = (patch: Partial<CombinedState>) => {
    const next = { ...state, ...patch };
    setState(next);
    saveCombined(next);
  };

  // OS sync
  useEffect(() => {
    if (!state.osSync) return;
    const unsub = listenOSScheme((isDark) => update({ dark: isDark }));
    return unsub;
  }, [state.osSync]);

  // Save to backend
  const saveMut = useMutation({
    mutationFn: () => api.post('/settings/bulk', { settings: themeToSettings({ mode: state.mode, preset: state.preset, primary: state.primary, font: state.font, dark: state.dark }) }),
    onSuccess: () => { toast.success('Theme saved to server'); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: () => toast.error('Failed to save'),
  });

  const ramp = resolveRamp({ mode: state.mode, preset: state.preset, primary: state.primary, font: state.font, dark: state.dark });

  const fonts: { id: ThemeFont; label: string }[] = [
    { id: 'inter', label: 'Inter' },
    { id: 'cairo', label: 'Cairo (عربي)' },
    { id: 'system', label: 'System UI' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">🎨 Theme & Display</h2>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6">
          {(['appearance', 'density', 'automation'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${tab === t ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'appearance' ? '🎨 Appearance' : t === 'density' ? '📐 Density' : '⚙️ Automation'}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          {/* ═══ APPEARANCE TAB ═══ */}
          {tab === 'appearance' && (
            <>
              {/* Dark / Light toggle */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Mode</label>
                <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 p-1">
                  {([['light', '☀️ Light'], ['dark', '🌙 Dark']] as const).map(([m, label]) => (
                    <button key={m} onClick={() => update({ dark: m === 'dark', osSync: false })}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition ${state.dark === (m === 'dark') ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset / Manual toggle */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Color Scheme</label>
                <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 p-1 mb-3">
                  {(['preset', 'manual'] as const).map((m) => (
                    <button key={m} onClick={() => update({ mode: m })}
                      className={`px-4 py-1.5 text-sm font-medium rounded-lg transition ${state.mode === m ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                      {m === 'preset' ? 'Presets' : 'Custom Color'}
                    </button>
                  ))}
                </div>

                {/* Preset grid */}
                {state.mode === 'preset' && (
                  <div className="grid grid-cols-3 gap-2">
                    {THEME_PRESETS.map((p) => (
                      <button key={p.id} onClick={() => update({ preset: p.id })}
                        className={`rounded-xl border-2 p-2.5 text-start transition ${state.preset === p.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'}`}>
                        <div className="flex gap-0.5 mb-1.5">
                          {[300, 500, 600, 800].map((s) => (
                            <span key={s} className="h-4 flex-1 rounded-sm" style={{ background: p.ramp[s] }} />
                          ))}
                        </div>
                        <div className="text-xs font-medium text-gray-800 dark:text-gray-200">{isRTL ? p.nameAr : p.name}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Manual color picker */}
                {state.mode === 'manual' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input type="color" value={state.primary} onChange={(e) => update({ primary: e.target.value })}
                        className="w-12 h-12 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer" />
                      <input value={state.primary} onChange={(e) => update({ primary: e.target.value })}
                        className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm font-mono bg-white dark:bg-gray-800" />
                    </div>
                    <div className="flex gap-0.5 rounded-lg overflow-hidden">
                      {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((s) => (
                        <div key={s} className="flex-1 h-7" title={`${s}`} style={{ background: ramp[s] }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Font selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Font</label>
                <div className="flex flex-wrap gap-2">
                  {fonts.map((f) => (
                    <button key={f.id} onClick={() => update({ font: f.id })}
                      style={{ fontFamily: FONT_STACKS[f.id] }}
                      className={`px-4 py-2 rounded-xl border text-sm transition ${state.font === f.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live preview */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Preview</div>
                <div className="flex flex-wrap items-center gap-2">
                  <button className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-sm font-medium">Button</button>
                  <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-xs font-medium">Badge</span>
                  <a className="text-brand-600 text-sm font-medium underline cursor-pointer">Link</a>
                  <span className="border-2 border-brand-600 text-brand-600 px-3 py-1.5 rounded-xl text-sm">Outline</span>
                </div>
              </div>
            </>
          )}

          {/* ═══ DENSITY TAB ═══ */}
          {tab === 'density' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Layout Density</label>
                <div className="grid grid-cols-3 gap-3">
                  {DENSITIES.map((d) => (
                    <button key={d.id} onClick={() => update({ density: d.id, autoDensity: false })}
                      disabled={state.autoDensity}
                      className={`rounded-xl border-2 p-3 text-center transition ${!state.autoDensity && state.density === d.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'} ${state.autoDensity ? 'opacity-50' : ''}`}>
                      <div className="text-xl mb-1">{d.icon}</div>
                      <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{d.name}</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">{d.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-detect */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Auto-detect device</div>
                  <div className="text-[10px] text-gray-500">{touchDetected ? '🖐 Touch → Spacious' : '🖱 Desktop → Default'}</div>
                </div>
                <label className="relative inline-flex cursor-pointer">
                  <input type="checkbox" checked={state.autoDensity} onChange={(e) => update({ autoDensity: e.target.checked })} className="sr-only peer" />
                  <div className="w-10 h-5 rounded-full bg-gray-300 dark:bg-gray-600 peer-checked:bg-blue-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
                </label>
              </div>
            </>
          )}

          {/* ═══ AUTOMATION TAB ═══ */}
          {tab === 'automation' && (
            <>
              {/* OS sync */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Sync with OS</div>
                  <div className="text-[10px] text-gray-500">Auto-switch light/dark with system</div>
                </div>
                <label className="relative inline-flex cursor-pointer">
                  <input type="checkbox" checked={state.osSync} onChange={(e) => update({ osSync: e.target.checked, schedule: { ...state.schedule, enabled: false } })} className="sr-only peer" />
                  <div className="w-10 h-5 rounded-full bg-gray-300 dark:bg-gray-600 peer-checked:bg-blue-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
                </label>
              </div>

              {/* Schedule */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Time-based schedule</div>
                    <div className="text-[10px] text-gray-500">Auto-switch at set times</div>
                  </div>
                  <label className="relative inline-flex cursor-pointer">
                    <input type="checkbox" checked={state.schedule.enabled} onChange={(e) => update({ schedule: { ...state.schedule, enabled: e.target.checked }, osSync: false })} className="sr-only peer" />
                    <div className="w-10 h-5 rounded-full bg-gray-300 dark:bg-gray-600 peer-checked:bg-blue-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5" />
                  </label>
                </div>
                {state.schedule.enabled && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase">☀️ Light starts</label>
                      <input type="time" value={state.schedule.lightStart} onChange={(e) => update({ schedule: { ...state.schedule, lightStart: e.target.value } })}
                        className="w-full mt-0.5 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase">🌙 Dark starts</label>
                      <input type="time" value={state.schedule.darkStart} onChange={(e) => update({ schedule: { ...state.schedule, darkStart: e.target.value } })}
                        className="w-full mt-0.5 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800" />
                    </div>
                  </div>
                )}
              </div>

              {/* Save to server */}
              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50">
                {saveMut.isPending ? 'Saving...' : '💾 Save to Server (sync across devices)'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
