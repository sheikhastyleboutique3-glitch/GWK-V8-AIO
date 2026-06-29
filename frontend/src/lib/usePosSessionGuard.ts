/**
 * Forced POS Closing Popup (Odoo parity).
 *
 * ONLY blocks navigation when the user clicks a sidebar link or navigates
 * AWAY from the POS/Waiter page while a session is open. Does NOT interfere
 * with normal POS operation (floor plan, order, orders tabs are all fine).
 *
 * Uses `beforeunload` for tab close/refresh and a lightweight location
 * watcher for in-app navigation (no monkey-patching, no useBlocker).
 *
 * Compatible with React Router v6 <BrowserRouter>.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface UsePosSessionGuardOptions {
  /** Whether a POS session is currently open (OPEN status). */
  sessionOpen: boolean;
  /** Paths that are considered "inside" the POS area (won't trigger block). */
  allowedPaths?: string[];
}

/**
 * Hook that blocks navigation and tab close when POS session is open.
 * Returns { blocked, proceed, cancel } for the route guard dialog.
 *
 * IMPORTANT: This does NOT monkey-patch history or use useBlocker.
 * It simply watches location changes and shows a modal AFTER navigation,
 * offering to go back. This avoids the "useBlocker must be within data router" crash.
 */
export function usePosSessionGuard({ sessionOpen, allowedPaths = ['/pos', '/kds'] }: UsePosSessionGuardOptions) {
  const [blocked, setBlocked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const intentionalRef = useRef(false); // Flag: user chose "Leave Anyway"

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

  // ── Detect navigation away from allowed paths ──────────────────────────
  useEffect(() => {
    if (!sessionOpen) {
      prevPathRef.current = location.pathname;
      return;
    }

    const wasInAllowed = allowedPaths.some(p => prevPathRef.current.startsWith(p));
    const isInAllowed = allowedPaths.some(p => location.pathname.startsWith(p));

    // Only trigger if we WERE in POS and now we're NOT
    if (wasInAllowed && !isInAllowed && !intentionalRef.current) {
      setBlocked(true);
      // Navigate back to where we were
      navigate(prevPathRef.current, { replace: true });
    } else {
      prevPathRef.current = location.pathname;
      intentionalRef.current = false;
    }
  }, [location.pathname, sessionOpen, allowedPaths, navigate]);

  // Clear blocked state when session closes
  useEffect(() => {
    if (!sessionOpen) {
      setBlocked(false);
    }
  }, [sessionOpen]);

  const proceed = useCallback(() => {
    setBlocked(false);
    intentionalRef.current = true;
    // Navigate to where they were trying to go (use history back since we replaced)
    navigate(-1);
  }, [navigate]);

  const cancel = useCallback(() => {
    setBlocked(false);
  }, []);

  return { blocked, proceed, cancel };
}
