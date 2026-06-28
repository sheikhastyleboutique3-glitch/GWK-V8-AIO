import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
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
  // Preload ALL critical data into cache (survives offline for entire shift)
  import('./lib/offlineCache').then(({ preloadCriticalData }) => {
    const branchRaw = localStorage.getItem('activeBranch');
    const branchId = branchRaw ? JSON.parse(branchRaw)?.id : undefined;
    preloadCriticalData(branchId).then((data) => {
      // Seed React Query cache with the preloaded data (instant page loads)
      if (data.categories?.length) {
        queryClient.setQueryData(['pos-categories'], data.categories);
      }
      if (data.products?.length) {
        queryClient.setQueryData(['pos-products', undefined, ''], data.products);
        queryClient.setQueryData(['menu-items', '', ''], data.products);
      }
      if (data.modifierGroups?.length) {
        queryClient.setQueryData(['modifier-groups'], data.modifierGroups);
      }
    });
  });

  // Also sync local stock estimates (for offline stock warnings)
  import('./lib/offlineCache').then(({ syncLocalStock }) => {
    const branchRaw = localStorage.getItem('activeBranch');
    const branchId = branchRaw ? JSON.parse(branchRaw)?.id : undefined;
    if (branchId) syncLocalStock(branchId);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
