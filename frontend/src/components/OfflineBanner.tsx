/**
 * OfflineBanner — Persistent top bar showing offline status + pending sync count.
 * Designed for POS environments where network interruptions must be clearly
 * communicated to the cashier without blocking the workflow.
 */
import { useOnlineStatus } from '../lib/useOnlineStatus';

export default function OfflineBanner() {
  const { isOnline, isSyncing, pendingCount } = useOnlineStatus();

  // Fully online with nothing pending — render nothing
  if (isOnline && !isSyncing && pendingCount === 0) return null;

  // Syncing state
  if (isSyncing) {
    return (
      <div className="fixed top-0 inset-x-0 z-[200] bg-blue-600 text-white text-center py-1.5 px-4 text-xs font-medium flex items-center justify-center gap-2 shadow-md animate-fade-in">
        <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        Syncing {pendingCount} pending transaction{pendingCount !== 1 ? 's' : ''}…
      </div>
    );
  }

  // Online but has pending items (shouldn't happen often — brief flash during replay)
  if (isOnline && pendingCount > 0) {
    return (
      <div className="fixed top-0 inset-x-0 z-[200] bg-amber-500 text-white text-center py-1.5 px-4 text-xs font-medium flex items-center justify-center gap-2 shadow-md animate-fade-in">
        <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        {pendingCount} transaction{pendingCount !== 1 ? 's' : ''} pending sync
      </div>
    );
  }

  // Offline
  return (
    <div className="fixed top-0 inset-x-0 z-[200] bg-red-600 text-white text-center py-1.5 px-4 text-xs font-medium flex items-center justify-center gap-2 shadow-md animate-fade-in">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
      </svg>
      Offline mode — orders will sync automatically when connection returns
      {pendingCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]">{pendingCount} queued</span>}
    </div>
  );
}
