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
      staleTime: 30_000, // 30s — don't refetch if data is fresh
      gcTime: 10 * 60_000, // 10min — keep in cache even if unused
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // Keep previous data visible while refetching — prevents "flash of empty"
      placeholderData: (prev: any) => prev,
    },
  },
});

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
