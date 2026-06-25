import { useEffect, useRef } from 'react';

/**
 * Detects barcode scanner input (rapid keystrokes ending with Enter).
 * Barcode scanners emulate a keyboard — they type the barcode string very fast
 * (typically < 50ms between characters) then press Enter.
 *
 * @param onScan Called with the scanned string when a barcode is detected
 * @param options.minLength Minimum barcode length (default 3)
 * @param options.maxDelay Max ms between keystrokes to count as scanner (default 50)
 */
export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  options?: { minLength?: number; maxDelay?: number; enabled?: boolean },
) {
  const buffer = useRef('');
  const lastKeyTime = useRef(0);
  const enabled = options?.enabled !== false;
  const minLength = options?.minLength ?? 3;
  const maxDelay = options?.maxDelay ?? 80;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        // Allow barcode scan even in search input if it ends with Enter quickly
        if (e.key !== 'Enter') return;
        // If buffer has content from rapid typing, it's a scan
        if (buffer.current.length < minLength) {
          buffer.current = '';
          return;
        }
      }

      const now = Date.now();
      if (e.key === 'Enter') {
        if (buffer.current.length >= minLength) {
          e.preventDefault();
          e.stopPropagation();
          onScan(buffer.current.trim());
        }
        buffer.current = '';
        return;
      }

      // Single printable character
      if (e.key.length === 1) {
        if (now - lastKeyTime.current > maxDelay) {
          // Gap too large — reset buffer (user typing normally)
          buffer.current = '';
        }
        buffer.current += e.key;
        lastKeyTime.current = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [onScan, enabled, minLength, maxDelay]);
}
