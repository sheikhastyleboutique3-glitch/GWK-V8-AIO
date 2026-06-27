import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { bootstrapTheme } from './lib/theme';
import { initSyncManager } from './lib/syncManager';
import { loadThemeState, applyThemeToDOM } from './lib/themes';
import './i18n';
import './index.css';

// Apply the saved theme synchronously before first paint (prevents color flash).
bootstrapTheme();

// Apply theme engine (colors + density) on boot.
applyThemeToDOM(loadThemeState());

// Register service worker for offline support.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Initialize offline sync manager.
initSyncManager();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 30_000, // 30s — general queries don't refetch if fresh
      gcTime: 10 * 60_000, // 10min — keep in cache even if unused
      refetchOnWindowFocus: false, // Disabled — WebSocket handles real-time sync
      refetchOnReconnect: true,
      // Keep previous data visible while refetching — prevents "flash of empty"
      placeholderData: (prev: any) => prev,
    },
    mutations: {
      // Mutations should not retry by default (avoid double-charge, etc.)
      retry: false,
    },
  },
});

// ─── Prefetch critical POS data on app boot (products/categories load instantly) ───
const token = localStorage.getItem('token');
if (token) {
  // Products & categories are static during a shift — prefetch once, cache long
  queryClient.prefetchQuery({
    queryKey: ['pos-categories'],
    queryFn: () =>
      fetch('/api/categories?posVisible=true', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => d.data),
    staleTime: 5 * 60_000, // 5min — categories almost never change mid-shift
  });
  queryClient.prefetchQuery({
    queryKey: ['pos-products', undefined, ''],
    queryFn: () =>
      fetch('/api/products?sellable=true&available=true&productType=MENU', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => d.data),
    staleTime: 2 * 60_000, // 2min — products rarely change mid-shift
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
