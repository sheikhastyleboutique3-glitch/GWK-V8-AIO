/**
 * GWK V8 Theme Engine — Enterprise-grade theme system.
 *
 * 4 Production Presets + 3 Density Modes + OS Sync + Persistence.
 * All values map to CSS custom properties on :root for instant switching.
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

export interface ThemeState {
  theme: ThemeMode;
  density: DensityMode;
  osSync: boolean;
}

export function loadThemeState(): ThemeState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { theme: 'corporate-light', density: 'default', osSync: false };
}

export function saveThemeState(state: ThemeState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Apply theme + density CSS variables to :root */
export function applyThemeToDOM(state: ThemeState) {
  const theme = THEMES.find((t) => t.id === state.theme) || THEMES[0];
  const density = DENSITIES.find((d) => d.id === state.density) || DENSITIES[1];
  const root = document.documentElement;

  // Theme colors
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${camelToKebab(key)}`, value);
  });

  // Density values
  Object.entries(density.values).forEach(([key, value]) => {
    root.style.setProperty(`--density-${camelToKebab(key)}`, value);
  });

  // Set data attributes for Tailwind dark mode + density
  root.setAttribute('data-theme', state.theme);
  root.setAttribute('data-density', state.density);

  // Toggle Tailwind dark class
  if (state.theme === 'deep-slate' || state.theme === 'amoled-pos') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
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
