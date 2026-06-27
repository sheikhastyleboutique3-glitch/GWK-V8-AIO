/**
 * POS Keyboard Shortcuts (Odoo-style)
 *
 * Shortcuts:
 *   Enter       → Validate/Pay (opens payment or confirms)
 *   Escape      → Back (close payment, close modal, back to floor)
 *   Alt+P       → Open Payment screen
 *   Alt+B       → Back to floor plan
 *   Alt+O       → Orders list view
 *   Alt+N       → New order
 *   Alt+D       → Apply discount to selected line
 *   Delete/Bksp → Remove selected item
 *   +/-         → Increase/decrease qty of selected item
 *   0-9         → Type numpad digits (when numpad mode active)
 *   F2          → Search products
 *   F5          → Fire to kitchen
 */
import { useEffect, useRef } from 'react';

export interface PosHotkeyActions {
  onPay?: () => void;
  onBack?: () => void;
  onFloor?: () => void;
  onOrders?: () => void;
  onNewOrder?: () => void;
  onDelete?: () => void;
  onQtyUp?: () => void;
  onQtyDown?: () => void;
  onNumpadDigit?: (digit: string) => void;
  onSearch?: () => void;
  onFire?: () => void;
  onDiscount?: () => void;
  enabled?: boolean;
}

export function usePosHotkeys(actions: PosHotkeyActions) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    if (actionsRef.current.enabled === false) return;

    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs/textareas
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const a = actionsRef.current;

      // Enter → Pay / Validate
      if (e.key === 'Enter' && !e.altKey && !e.ctrlKey) {
        e.preventDefault();
        a.onPay?.();
        return;
      }

      // Escape → Back
      if (e.key === 'Escape') {
        e.preventDefault();
        a.onBack?.();
        return;
      }

      // Alt+P → Payment
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        a.onPay?.();
        return;
      }

      // Alt+B → Back to floor
      if (e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        a.onFloor?.();
        return;
      }

      // Alt+O → Orders view
      if (e.altKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        a.onOrders?.();
        return;
      }

      // Alt+N → New order
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        a.onNewOrder?.();
        return;
      }

      // Alt+D → Discount
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        a.onDiscount?.();
        return;
      }

      // Delete / Backspace → Remove selected
      if (e.key === 'Delete' || (e.key === 'Backspace' && !e.altKey && !e.ctrlKey)) {
        e.preventDefault();
        a.onDelete?.();
        return;
      }

      // + → Qty up
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        a.onQtyUp?.();
        return;
      }

      // - → Qty down
      if (e.key === '-') {
        e.preventDefault();
        a.onQtyDown?.();
        return;
      }

      // 0-9 → Numpad digit
      if (/^[0-9.]$/.test(e.key) && !e.altKey && !e.ctrlKey) {
        e.preventDefault();
        a.onNumpadDigit?.(e.key);
        return;
      }

      // F2 → Focus search
      if (e.key === 'F2') {
        e.preventDefault();
        a.onSearch?.();
        return;
      }

      // F5 → Fire to kitchen
      if (e.key === 'F5') {
        e.preventDefault();
        a.onFire?.();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
