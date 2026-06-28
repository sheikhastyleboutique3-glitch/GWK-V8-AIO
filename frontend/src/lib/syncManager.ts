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

import { getPending, remove, markFailed, getPendingCount, purgeStaleEntries } from './offlineQueue';

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
  const now = Date.now();

  for (const req of pending) {
    // Respect exponential backoff — skip if not yet time to retry
    if ((req as any).nextRetryAt && (req as any).nextRetryAt > now) {
      continue;
    }
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
        // Log conflict details for 400/404 so the user can investigate
        if (response.status === 400 || response.status === 404) {
          let errorMsg = 'Unknown conflict';
          try { const body = await response.json(); errorMsg = body?.message || body?.error || errorMsg; } catch {}
          addConflict({ id: req.id!, url: req.url, method: req.method, error: errorMsg, status: response.status, at: new Date().toISOString() });
        }
      } else if (response.status === 409) {
        // Conflict (item unavailable, price changed, stock depleted) — remove + record
        await remove(req.id!);
        let errorMsg = 'Conflict: data changed while offline';
        try { const body = await response.json(); errorMsg = body?.message || errorMsg; } catch {}
        addConflict({ id: req.id!, url: req.url, method: req.method, error: errorMsg, status: 409, at: new Date().toISOString() });
        failed++;
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

  // Purge stale offline entries older than 24 hours (orders with old prices are dangerous)
  purgeStaleEntries(24 * 60 * 60 * 1000).then((purged) => {
    if (purged > 0) console.log(`[SyncManager] Purged ${purged} stale offline entries (>24h old)`);
  }).catch(() => {});

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


// ═══════════════════════════════════════════════════════════════════════════════
// OFFLINE CONFLICT TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export interface SyncConflict {
  id: string;
  url: string;
  method: string;
  error: string;
  status: number;
  at: string;
}

const CONFLICTS_KEY = 'gwk_sync_conflicts';

/** Record a sync conflict for user review. */
function addConflict(conflict: SyncConflict): void {
  const conflicts = getConflicts();
  conflicts.push(conflict);
  // Keep only last 50 conflicts
  if (conflicts.length > 50) conflicts.splice(0, conflicts.length - 50);
  localStorage.setItem(CONFLICTS_KEY, JSON.stringify(conflicts));
}

/** Get all recorded sync conflicts. */
export function getConflicts(): SyncConflict[] {
  try {
    return JSON.parse(localStorage.getItem(CONFLICTS_KEY) || '[]');
  } catch {
    return [];
  }
}

/** Clear all recorded conflicts (after user acknowledges them). */
export function clearConflicts(): void {
  localStorage.removeItem(CONFLICTS_KEY);
}

/** Get count of unresolved conflicts. */
export function getConflictCount(): number {
  return getConflicts().length;
}
