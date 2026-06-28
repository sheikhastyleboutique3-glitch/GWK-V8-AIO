import { useEffect, useState } from 'react';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import { getCacheAgeMinutes, getLastCacheTime } from '../lib/offlineCache';

/**
 * SyncIndicator — Shows connection status + how fresh the cached data is.
 * 
 * Displayed in the Layout header so staff always knows:
 * - Green dot: Online, data is fresh
 * - Amber dot: Online, data is X minutes old (stale)
 * - Red dot: Offline, showing cached data from X minutes ago
 *
 * Compact design — doesn't distract from POS operations.
 */
export default function SyncIndicator() {
  const { isOnline, isSyncing, pendingCount } = useOnlineStatus();
  const [ageMin, setAgeMin] = useState(getCacheAgeMinutes());

  // Update age every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setAgeMin(getCacheAgeMinutes()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Refresh age when status changes
  useEffect(() => {
    setAgeMin(getCacheAgeMinutes());
  }, [isOnline]);

  if (isSyncing) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400" title="Syncing offline orders...">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span className="hidden sm:inline">Syncing{pendingCount > 0 ? ` (${pendingCount})` : ''}...</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400" title={`Offline — using cached data${ageMin < Infinity ? ` from ${ageMin} min ago` : ''}`}>
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="hidden sm:inline">
          Offline{ageMin < Infinity ? ` · ${ageMin}m ago` : ''}
        </span>
        {pendingCount > 0 && (
          <span className="px-1 py-0.5 bg-red-100 dark:bg-red-900/30 rounded text-[10px] font-medium">
            {pendingCount} queued
          </span>
        )}
      </div>
    );
  }

  // Online
  if (ageMin > 5) {
    // Data is stale (> 5 min since last sync)
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400" title={`Last synced ${ageMin} minutes ago`}>
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span className="hidden sm:inline">{ageMin}m ago</span>
      </div>
    );
  }

  // Fresh and online
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400" title="Connected — data is fresh">
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      <span className="hidden sm:inline">Live</span>
    </div>
  );
}
