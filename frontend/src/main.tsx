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

// Register service worker for offline support + detect updates.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check for updates every 30 minutes
      setInterval(() => reg.update(), 30 * 60_000);
      // If a new SW is waiting, prompt user to refresh
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
            // New version available — the lazyRetry mechanism handles this
            // but we can also show a subtle banner
            import('react-hot-toast').then(({ default: toast }) => {
              toast('New version available. Refresh for updates.', { icon: '🔄', duration: 10000 });
            });
          }
        });
      });
    }).catch(() => {});
  });
}

// Initialize offline sync manager.
initSyncManager();

// ── GLOBAL ERROR SAFETY NET (catches async errors that escape React) ──
window.addEventListener('unhandledrejection', (event) => {
  // Don't show errors for cancelled requests or offline queue events
  const msg = event.reason?.message || String(event.reason || '');
  if (msg.includes('queued') || msg.includes('cancel') || msg.includes('AbortError')) return;
  // Show a non-intrusive toast for unexpected errors
  import('react-hot-toast').then(({ default: toast }) => {
    toast.error(`Unexpected error: ${msg.slice(0, 80)}`, { duration: 5000, id: 'global-error' });
  });
});


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 1000,
      staleTime: 0, // Always refetch on mount/navigate — instant fresh data on every page open.
                     // WebSocket invalidation handles between-navigation freshness.
      gcTime: 5 * 60_000, // Keep unused cache 5min (instant back-nav, still revalidates in bg)
      refetchOnWindowFocus: true, // Refetch when user tabs back (cheap, catches stale data)
      refetchOnReconnect: true,
      // Show previous data instantly while background refetch happens
      placeholderData: (prev: any) => prev,
    },
    mutations: {
      retry: false,
    },
  },
});

// ─── Prefetch critical data on app boot (pages load instantly from cache) ───
let token: string | null = null;
try { token = localStorage.getItem('token'); } catch { /* private browsing */ }
if (token) {
  // Preload ALL critical data into cache (survives offline for entire shift)
  import('./lib/offlineCache').then(({ preloadCriticalData }) => {
    const branchRaw = localStorage.getItem('activeBranch');
    const branchId = branchRaw ? JSON.parse(branchRaw)?.id : undefined;
    preloadCriticalData(branchId).then((data) => {
      // Seed React Query cache with the preloaded data (instant page loads)
      if (data.categories?.length) {
        queryClient.setQueryData(['pos-categories'], data.categories);
        queryClient.setQueryData(['all-categories'], data.categories);
        queryClient.setQueryData(['catalog-categories'], data.categories);
      }
      if (data.products?.length) {
        queryClient.setQueryData(['pos-products', undefined, ''], data.products);
        queryClient.setQueryData(['menu-items', '', ''], data.products);
        queryClient.setQueryData(['warehouse-items', '', ''], data.products);
      }
      if (data.modifierGroups?.length) {
        queryClient.setQueryData(['modifier-groups'], data.modifierGroups);
      }
      if (data.branches?.length) {
        queryClient.setQueryData(['branches-switcher'], data.branches);
        queryClient.setQueryData(['branches-qr'], data.branches);
      }
    });
  });

  // Prefetch common API data in background (non-blocking)
  setTimeout(() => {
    import('./lib/api').then(({ default: api }) => {
      const branchRaw = localStorage.getItem('activeBranch');
      const branchId = branchRaw ? JSON.parse(branchRaw)?.id : undefined;
      // Prefetch suppliers, units, customers — common across many pages
      api.get('/suppliers').then(r => queryClient.setQueryData(['suppliers'], r.data.data)).catch(() => {});
      api.get('/units').then(r => queryClient.setQueryData(['units'], r.data.data)).catch(() => {});
      api.get('/delivery-platforms').then(r => queryClient.setQueryData(['delivery-platforms'], r.data.data)).catch(() => {});
      api.get('/discount-rules', { params: { activeOnly: true } }).then(r => queryClient.setQueryData(['discount-rules-active'], r.data.data)).catch(() => {});
      if (branchId) {
        api.get('/floors', { params: { branchId } }).then(r => {
          queryClient.setQueryData(['pos-floors', branchId], r.data.data);
          queryClient.setQueryData(['waiter-floors', branchId], r.data.data);
        }).catch(() => {});
      }
    });
  }, 500); // 500ms delay — let the UI render first

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
