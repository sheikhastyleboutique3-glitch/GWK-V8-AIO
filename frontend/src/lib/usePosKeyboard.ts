import { useEffect } from 'react';

/**
 * POS Keyboard Shortcuts — global key bindings for the cashier terminal.
 *
 * Shortcuts:
 *   F2  → Pay (open payment panel)
 *   F3  → Hold order
 *   F4  → Print bill / receipt
 *   F5  → Send to kitchen (fire)
 *   F8  → Clear cart / new order
 *   F9  → Open orders list
 *   Esc → Close modal / cancel payment
 *   +/- → Increase/decrease quantity of selected line
 *
 * Only active when the POS page is mounted. Disabled when a modal/prompt is open
 * (checks for .z-\\[200\\] overlay elements).
 */
export function usePosKeyboard(handlers: {
  onPay?: () => void;
  onHold?: () => void;
  onPrint?: () => void;
  onFire?: () => void;
  onClear?: () => void;
  onOrders?: () => void;
  onEscape?: () => void;
  onQtyUp?: () => void;
  onQtyDown?: () => void;
}) {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        // Allow Escape to still work even in inputs
        if (e.key !== 'Escape') return;
      }

      // Don't intercept if a modal overlay is visible (usePrompt / useConfirm z-[200])
      if (document.querySelector('[class*="z-[200]"]')) {
        if (e.key === 'Escape') {
          // Let the modal handle its own Escape
          return;
        }
        return;
      }

      switch (e.key) {
        case 'F2':
          e.preventDefault();
          handlers.onPay?.();
          break;
        case 'F3':
          e.preventDefault();
          handlers.onHold?.();
          break;
        case 'F4':
          e.preventDefault();
          handlers.onPrint?.();
          break;
        case 'F5':
          e.preventDefault();
          handlers.onFire?.();
          break;
        case 'F8':
          e.preventDefault();
          handlers.onClear?.();
          break;
        case 'F9':
          e.preventDefault();
          handlers.onOrders?.();
          break;
        case 'Escape':
          e.preventDefault();
          handlers.onEscape?.();
          break;
        case '+':
          if (tag !== 'INPUT') {
            e.preventDefault();
            handlers.onQtyUp?.();
          }
          break;
        case '-':
          if (tag !== 'INPUT') {
            e.preventDefault();
            handlers.onQtyDown?.();
          }
          break;
      }
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [handlers]);
}
