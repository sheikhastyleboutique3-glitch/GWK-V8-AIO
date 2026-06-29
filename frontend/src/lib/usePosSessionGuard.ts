/**
 * Forced POS Closing Popup (Odoo parity).
 *
 * Prevents navigating away from the POS page when a session is open without
 * counting. Uses `beforeunload` (browser tab close/refresh) and monitors
 * in-app navigation attempts via history interception.
 *
 * Compatible with React Router v6 <BrowserRouter> (does NOT require
 * createBrowserRouter / data router — useBlocker is NOT used).
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const [blocked, setBlocked] = useState(false);
  const pendingNavRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // ── Browser beforeunload event: block tab close / page refresh ──────────
  useEffect(() => {
    if (!sessionOpen) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have an open POS session. Please close it (count cash) before leaving.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [sessionOpen]);

  // ── Intercept in-app navigation via history.pushState monkey-patch ──────
  useEffect(() => {
    if (!sessionOpen) return;

    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);

    const intercept = (method: typeof history.pushState) => {
      return function (this: History, data: any, unused: string, url?: string | URL | null) {
        if (url && typeof url === 'string') {
          const targetPath = new URL(url, window.location.origin).pathname;
          // Allow navigation within POS
          if (targetPath.startsWith('/pos')) {
            return method.call(this, data, unused, url);
          }
          // Block navigation away — show confirmation
          pendingNavRef.current = targetPath;
          setBlocked(true);
          onBlockedRef.current?.();
          return; // Don't actually navigate
        }
        return method.call(this, data, unused, url);
      };
    };

    history.pushState = intercept(originalPushState) as typeof history.pushState;
    history.replaceState = intercept(originalReplaceState) as typeof history.replaceState;

    // Also catch popstate (browser back button)
    const handlePopState = () => {
      if (location.pathname.startsWith('/pos')) {
        // Going back from POS — block it
        pendingNavRef.current = null; // can't know where back goes easily
        setBlocked(true);
        onBlockedRef.current?.();
        // Push back to POS to undo the back navigation
        history.pushState(null, '', location.pathname + location.search);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [sessionOpen, location.pathname, location.search]);

  // Clear blocked state when session closes
  useEffect(() => {
    if (!sessionOpen) {
      setBlocked(false);
      pendingNavRef.current = null;
    }
  }, [sessionOpen]);

  const proceed = useCallback(() => {
    setBlocked(false);
    const target = pendingNavRef.current;
    pendingNavRef.current = null;
    if (target) {
      // Temporarily disable the guard to allow navigation through
      navigate(target);
    }
  }, [navigate]);

  const cancel = useCallback(() => {
    setBlocked(false);
    pendingNavRef.current = null;
  }, []);

  return { blocked, proceed, cancel };
}
