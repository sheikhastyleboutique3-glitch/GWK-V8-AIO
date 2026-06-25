/**
 * useDebounceClick — Prevents double-click/rapid-fire on mutation buttons.
 * Returns a wrapper function that ignores subsequent calls within the cooldown period.
 */
import { useRef, useCallback } from 'react';

export function useDebounceClick(cooldownMs = 500) {
  const lastClick = useRef(0);

  const debounced = useCallback(
    (fn: () => void | Promise<void>) => {
      const now = Date.now();
      if (now - lastClick.current < cooldownMs) return;
      lastClick.current = now;
      fn();
    },
    [cooldownMs],
  );

  return debounced;
}
