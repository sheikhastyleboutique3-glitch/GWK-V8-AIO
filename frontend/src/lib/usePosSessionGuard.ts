/**
 * Forced POS Closing Popup (Odoo parity).
 *
 * Prevents navigating away from the POS page when a session is open without
 * counting. Uses both `beforeunload` (browser tab close/refresh) and a React
 * Router blocker to block in-app navigation.
 *
 * The guard shows a warning dialog when the user attempts to leave while a
 * POS session is still OPEN. They must explicitly close/count the session
 * or dismiss the warning.
 */
import { useEffect, useCallback, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

interface UsePosSessionGuardOptions {
  /** Whether a POS session is currently open (OPEN status). */
  sessionOpen: boolean;
  /** Optional callback when blocked navigation is attempted. */
  onBlocked?: () => void;
}

/**
 * Hook that blocks navigation and tab close when POS session is open.
 * Returns { blocked, proceed, cancel } for the route guard dialog.
 */
export function usePosSessionGuard({ sessionOpen, onBlocked }: UsePosSessionGuardOptions) {
  const onBlockedRef = useRef(onBlocked);
  onBlockedRef.current = onBlocked;

  // ── Browser beforeunload event: block tab close / page refresh ──────────
  useEffect(() => {
    if (!sessionOpen) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = 'You have an open POS session. Please close it (count cash) before leaving.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [sessionOpen]);

  // ── React Router blocker: block in-app navigation ───────────────────────
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) => {
        if (!sessionOpen) return false;
        // Allow navigation within the POS page itself
        if (nextLocation.pathname.startsWith('/pos')) return false;
        // Block navigation away from POS when session is open
        onBlockedRef.current?.();
        return true;
      },
      [sessionOpen],
    ),
  );

  return {
    /** Whether navigation is currently blocked by an active session. */
    blocked: blocker.state === 'blocked',
    /** Allow the blocked navigation to proceed (user acknowledged). */
    proceed: () => blocker.state === 'blocked' && blocker.proceed(),
    /** Cancel the blocked navigation (user wants to stay). */
    cancel: () => blocker.state === 'blocked' && blocker.reset(),
  };
}
