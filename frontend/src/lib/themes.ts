/**
 * GWK V8 Theme Engine — Enterprise-grade theme system (DENSITY + SCHEDULING layer).
 *
 * This file handles: 4 visual presets, 3 density modes, OS sync, schedule, auto-touch.
 * For BRAND COLORS (preset ramp + dark mode), see ./theme.ts
 *
 * Architecture:
 *   theme.ts  → brand color ramp, dark mode toggle, font family (used by App.tsx, Layout.tsx)
 *   themes.ts → density, visual presets, OS sync, scheduling (used by ThemePanel.tsx, main.tsx)
 *
 * Both work together: theme.ts sets CSS color variables, themes.ts sets spacing/density variables.
 * They share localStorage persistence but are complementary, not duplicative.
 */

export type ThemeMode = 'corporate-light' | 'deep-slate' | 'amoled-pos' | 'accessibility';
export type DensityMode = 'compact' | 'default' | 'spacious';

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  icon: string;
  description: string;
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    border: string;
    borderLight: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    primary: string;
    primaryHover: string;
    primaryLight: string;
    success: string;
    danger: string;
    warning: string;
    info: string;
  };
}

export interface DensityConfig {
  id: DensityMode;
  name: string;
  icon: string;
  description: string;
  values: {
    baseFontSize: string;
    rowHeight: string;
    paddingX: string;
    paddingY: string;
    gap: string;
    borderRadius: string;
    inputHeight: string;
    buttonHeight: string;
  };
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'corporate-light',
    name: 'Classic Corporate',
    icon: '☀️',
    description: 'Clean, high-contrast white for back-office',
    colors: {
      background: '#ffffff',
      surface: '#f8fafc',
      surfaceElevated: '#ffffff',
      border: '#e2e8f0',
      borderLight: '#f1f5f9',
      text: '#0f172a',
      textMuted: '#475569',
      textSubtle: '#94a3b8',
      primary: '#1a56db',
      primaryHover: '#1e40af',
      primaryLight: '#eff6ff',
      success: '#059669',
      danger: '#dc2626',
      warning: '#d97706',
      info: '#0284c7',
    },
  },
  {
    id: 'deep-slate',
    name: 'Deep Slate Midnight',
    icon: '🌙',
    description: 'Dark slate for warehouse & low-light',
    colors: {
      background: '#0f172a',
      surface: '#1e293b',
      surfaceElevated: '#334155',
      border: '#334155',
      borderLight: '#1e293b',
      text: '#f1f5f9',
      textMuted: '#94a3b8',
      textSubtle: '#64748b',
      primary: '#60a5fa',
      primaryHover: '#93c5fd',
      primaryLight: '#1e3a5f',
      success: '#34d399',
      danger: '#f87171',
      warning: '#fbbf24',
      info: '#38bdf8',
    },
  },
  {
    id: 'amoled-pos',
    name: 'High-Performance POS',
    icon: '🚨',
    description: 'AMOLED black for hardware registers',
    colors: {
      background: '#000000',
      surface: '#0a0a0a',
      surfaceElevated: '#171717',
      border: '#262626',
      borderLight: '#171717',
      text: '#fafafa',
      textMuted: '#a3a3a3',
      textSubtle: '#525252',
      primary: '#22c55e',
      primaryHover: '#4ade80',
      primaryLight: '#052e16',
      success: '#22c55e',
      danger: '#ef4444',
      warning: '#f59e0b',
      info: '#06b6d4',
    },
  },
  {
    id: 'accessibility',
    name: 'Accessibility Mode',
    icon: '👁️',
    description: 'WCAG AAA high-contrast for visibility',
    colors: {
      background: '#ffffff',
      surface: '#f5f5f5',
      surfaceElevated: '#ffffff',
      border: '#000000',
      borderLight: '#666666',
      text: '#000000',
      textMuted: '#333333',
      textSubtle: '#555555',
      primary: '#0000cc',
      primaryHover: '#0000ff',
      primaryLight: '#e6e6ff',
      success: '#006600',
      danger: '#cc0000',
      warning: '#cc6600',
      info: '#0066cc',
    },
  },
];

export const DENSITIES: DensityConfig[] = [
  {
    id: 'compact',
    name: 'Compact',
    icon: '📊',
    description: 'Maximum data density for back-office',
    values: {
      baseFontSize: '12px',
      rowHeight: '32px',
      paddingX: '8px',
      paddingY: '4px',
      gap: '4px',
      borderRadius: '4px',
      inputHeight: '32px',
      buttonHeight: '32px',
    },
  },
  {
    id: 'default',
    name: 'Default',
    icon: '📋',
    description: 'Balanced for general use',
    values: {
      baseFontSize: '14px',
      rowHeight: '40px',
      paddingX: '12px',
      paddingY: '8px',
      gap: '8px',
      borderRadius: '8px',
      inputHeight: '40px',
      buttonHeight: '40px',
    },
  },
  {
    id: 'spacious',
    name: 'Spacious',
    icon: '👆',
    description: 'Large touch targets for POS screens',
    values: {
      baseFontSize: '16px',
      rowHeight: '52px',
      paddingX: '16px',
      paddingY: '12px',
      gap: '12px',
      borderRadius: '12px',
      inputHeight: '48px',
      buttonHeight: '48px',
    },
  },
];

const STORAGE_KEY = 'gwk-theme-config';

export interface ThemeSchedule {
  enabled: boolean;
  lightStart: string; // HH:mm (e.g., "06:00")
  darkStart: string;  // HH:mm (e.g., "18:00")
}

export interface ThemeState {
  theme: ThemeMode;
  density: DensityMode;
  osSync: boolean;
  autoDensity: boolean; // auto-detect touch → spacious
  schedule: ThemeSchedule;
}

export function loadThemeState(): ThemeState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate old state format (no schedule/autoDensity fields)
      return {
        theme: parsed.theme || 'corporate-light',
        density: parsed.density || 'default',
        osSync: parsed.osSync ?? false,
        autoDensity: parsed.autoDensity ?? false,
        schedule: parsed.schedule || { enabled: false, lightStart: '06:00', darkStart: '18:00' },
      };
    }
  } catch {}
  return {
    theme: 'corporate-light',
    density: 'default',
    osSync: false,
    autoDensity: false,
    schedule: { enabled: false, lightStart: '06:00', darkStart: '18:00' },
  };
}

export function saveThemeState(state: ThemeState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Detect if the device is a touch-primary device (tablet/POS terminal). */
export function isTouchDevice(): boolean {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  );
}

/** Auto-select density based on device type. */
export function getAutoDetectedDensity(): DensityMode {
  if (!isTouchDevice()) return 'default';
  // Touch device → spacious for larger tap targets
  const width = window.innerWidth;
  if (width <= 768) return 'spacious'; // Mobile / small POS
  if (width <= 1280) return 'spacious'; // Tablet / POS terminal
  return 'default'; // Large touch display — still comfortable
}

/** Determine theme based on schedule. */
export function getScheduledTheme(schedule: ThemeSchedule): ThemeMode | null {
  if (!schedule.enabled) return null;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [lh, lm] = schedule.lightStart.split(':').map(Number);
  const [dh, dm] = schedule.darkStart.split(':').map(Number);
  const lightMinutes = lh * 60 + lm;
  const darkMinutes = dh * 60 + dm;

  if (lightMinutes < darkMinutes) {
    // Normal: light during day, dark during night
    return currentMinutes >= lightMinutes && currentMinutes < darkMinutes
      ? 'corporate-light'
      : 'deep-slate';
  } else {
    // Inverted: dark during day (unusual but supported)
    return currentMinutes >= darkMinutes && currentMinutes < lightMinutes
      ? 'deep-slate'
      : 'corporate-light';
  }
}

/** Apply theme + density CSS variables to :root */
export function applyThemeToDOM(state: ThemeState) {
  // Determine effective theme (schedule > osSync > manual)
  let effectiveTheme = state.theme;
  if (state.schedule.enabled) {
    const scheduled = getScheduledTheme(state.schedule);
    if (scheduled) effectiveTheme = scheduled;
  }

  // Determine effective density (autoDensity > manual)
  let effectiveDensity = state.density;
  if (state.autoDensity) {
    effectiveDensity = getAutoDetectedDensity();
  }

  const theme = THEMES.find((t) => t.id === effectiveTheme) || THEMES[0];
  const density = DENSITIES.find((d) => d.id === effectiveDensity) || DENSITIES[1];
  const root = document.documentElement;

  // Density values (this engine's real contribution to the DOM).
  Object.entries(density.values).forEach(([key, value]) => {
    root.style.setProperty(`--density-${camelToKebab(key)}`, value);
  });

  // Set data attributes for Tailwind dark mode + density
  root.setAttribute('data-theme', effectiveTheme);
  root.setAttribute('data-density', effectiveDensity);

  // NOTE: The `.dark` class is the SINGLE switch that flips the entire palette
  // (--bg / --surface / --fg / --primary / --accent ... in index.css). It is
  // owned EXCLUSIVELY by theme.ts, driven by the user's dark toggle (persisted
  // as `theme_dark`). This density/preset engine must NOT toggle `.dark` too —
  // doing so caused the two engines to fight: the header dark toggle (theme.ts)
  // was reverted on the next boot by this function's default 'corporate-light'
  // preset. Density + data-attributes above are this engine's only DOM effects.
  // (The per-theme `--color-*` palette is intentionally NOT written here —
  //  Tailwind binds to `--bg`/`--primary`/etc., never `--color-background`, so
  //  those writes were dead. `theme` is kept only for the data-theme attribute.)
  void theme;
}

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/** OS color scheme listener for auto-sync */
export function listenOSScheme(callback: (isDark: boolean) => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}

/** Schedule interval that checks time every minute and applies theme switch. */
export function startScheduleWatcher(
  state: ThemeState,
  onThemeChange: (theme: ThemeMode) => void,
): () => void {
  if (!state.schedule.enabled) return () => {};
  let lastTheme: ThemeMode | null = null;

  const check = () => {
    const scheduled = getScheduledTheme(state.schedule);
    if (scheduled && scheduled !== lastTheme) {
      lastTheme = scheduled;
      onThemeChange(scheduled);
    }
  };

  check(); // Immediate check
  const interval = setInterval(check, 60_000); // Check every minute
  return () => clearInterval(interval);
}

/** Sync theme state to the backend user profile. */
export async function syncThemeToBackend(state: ThemeState, apiBase: string, token: string): Promise<void> {
  try {
    await fetch(`${apiBase}/users/me/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(state),
    });
  } catch {
    // Silent fail — localStorage is the primary source
  }
}

/** Load theme state from backend user profile. Falls back to localStorage. */
export async function loadThemeFromBackend(apiBase: string, token: string): Promise<ThemeState | null> {
  try {
    const res = await fetch(`${apiBase}/users/me/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      const prefs = data?.data || data;
      if (prefs && prefs.theme) {
        return {
          theme: prefs.theme,
          density: prefs.density || 'default',
          osSync: prefs.osSync ?? false,
          autoDensity: prefs.autoDensity ?? false,
          schedule: prefs.schedule || { enabled: false, lightStart: '06:00', darkStart: '18:00' },
        };
      }
    }
  } catch {}
  return null;
}
