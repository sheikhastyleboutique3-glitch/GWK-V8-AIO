/**
 * React hook for online/offline status + pending sync count.
 */
import { useEffect, useState } from 'react';
import { onSyncStatus, type SyncStatus } from './syncManager';

export function useOnlineStatus() {
  const [status, setStatus] = useState<SyncStatus>(navigator.onLine ? 'online' : 'offline');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onSyncStatus((s, count) => {
      setStatus(s);
      setPendingCount(count);
    });
    return unsubscribe;
  }, []);

  return { status, isOnline: status !== 'offline', isSyncing: status === 'syncing', pendingCount };
}
