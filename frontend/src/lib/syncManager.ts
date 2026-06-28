/**
 * Sync Manager — Replays queued offline requests when connectivity returns.
 *
 * Features:
 * - Listens for online/offline events
 * - Replays pending IndexedDB requests in order (FIFO)
 * - Retries with exponential backoff (max 5 attempts)
 * - Fires callbacks for UI updates (toast notifications)
 * - Registers Background Sync if available
 */

import { getPending, remove, markFailed, getPendingCount } from './offlineQueue';

export type SyncStatus = 'online' | 'offline' | 'syncing';
type SyncListener = (status: SyncStatus, pending: number) => void;

let currentStatus: SyncStatus = navigator.onLine ? 'online' : 'offline';
let isSyncing = false;
const listeners: Set<SyncListener> = new Set();

/** Subscribe to sync status changes. */
export function onSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  // Immediately notify with current state
  getPendingCount().then((count) => listener(currentStatus, count));
  return () => { listeners.delete(listener); };
}

function notifyAll(status: SyncStatus, pending: number) {
  currentStatus = status;
  listeners.forEach((l) => l(status, pending));
}

/** Get current connectivity status. */
export function isOnline(): boolean {
  return navigator.onLine;
}

/** Replay all pending requests in order. */
export async function syncPending(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 };
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  isSyncing = true;
  const pending = await getPending();

  if (!pending.length) {
    isSyncing = false;
    notifyAll('online', 0);
    return { synced: 0, failed: 0 };
  }

  notifyAll('syncing', pending.length);

  let synced = 0;
  let failed = 0;

  for (const req of pending) {
    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body ? JSON.stringify(req.body) : undefined,
      });

      if (response.ok || response.status === 400 || response.status === 404) {
        // Success or client error (won't succeed on retry) — remove from queue
        await remove(req.id!);
        synced++;
      } else if (response.status >= 500) {
        // Server error — retry later
        await markFailed(req.id!);
        failed++;
      } else {
        // Other errors — remove (won't improve)
        await remove(req.id!);
        synced++;
      }
    } catch {
      // Network still down — stop syncing
      await markFailed(req.id!);
      failed++;
      break;
    }
  }

  isSyncing = false;
  const remaining = await getPendingCount();
  notifyAll(navigator.onLine ? 'online' : 'offline', remaining);

  return { synced, failed };
}

/** Initialize the sync manager — call once at app start. */
export function initSyncManager() {
  // Listen for connectivity changes
  window.addEventListener('online', async () => {
    notifyAll('online', await getPendingCount());
    // Auto-sync when coming back online
    const result = await syncPending();
    if (result.synced > 0) {
      console.log(`[SyncManager] Synced ${result.synced} offline transactions`);
    }
    // Refresh offline cache with fresh data from server
    import('./offlineCache').then(({ preloadCriticalData, syncLocalStock }) => {
      const branchRaw = localStorage.getItem('activeBranch');
      const branchId = branchRaw ? JSON.parse(branchRaw)?.id : undefined;
      preloadCriticalData(branchId);
      if (branchId) syncLocalStock(branchId);
    });
  });

  window.addEventListener('offline', async () => {
    notifyAll('offline', await getPendingCount());
  });

  // Register Background Sync if supported
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then((reg) => {
      // Listen for sync messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_REQUESTED') {
          syncPending();
        }
      });
    });
  }

  // Try syncing on init (in case there are stale pending items from a previous session)
  if (navigator.onLine) {
    setTimeout(() => syncPending(), 2000);
  }

  // Periodic cache refresh every 5 minutes while online
  setInterval(() => {
    if (navigator.onLine) {
      import('./offlineCache').then(({ preloadCriticalData }) => {
        const branchRaw = localStorage.getItem('activeBranch');
        const branchId = branchRaw ? JSON.parse(branchRaw)?.id : undefined;
        preloadCriticalData(branchId);
      });
    }
  }, 5 * 60_000);
}

/** Request a background sync (for when we go offline during a mutation). */
export async function requestBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await (reg as any).sync.register('gwk-offline-sync');
    } catch {
      // Background Sync not available — will sync on next online event
    }
  }
}
