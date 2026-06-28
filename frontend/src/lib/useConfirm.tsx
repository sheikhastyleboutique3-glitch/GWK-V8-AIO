/**
 * useConfirm — Hook that replaces window.confirm() with a professional modal.
 *
 * Returns [confirmFn, ModalComponent]:
 *   - confirmFn(opts) → Promise<boolean> (resolves true on OK, false on cancel)
 *   - ModalComponent — render this anywhere in your JSX (invisible until called)
 *
 * Usage:
 *   const [confirm, ConfirmDialog] = useConfirm();
 *
 *   const handleDelete = async () => {
 *     const ok = await confirm({ title: 'Delete item?', description: 'This cannot be undone.' });
 *     if (!ok) return;
 *     doDelete();
 *   };
 *
 *   return <>{...}<ConfirmDialog /></>;
 */
import { useCallback, useRef, useState } from 'react';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
}

type ConfirmResolver = (value: boolean) => void;

export function useConfirm(): [(opts: ConfirmOptions) => Promise<boolean>, () => JSX.Element | null] {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<ConfirmResolver | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState(opts);
    });
  }, []);

  const handleConfirm = () => {
    resolverRef.current?.(true);
    resolverRef.current = null;
    setState(null);
  };

  const handleCancel = () => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    setState(null);
  };

  const Dialog = () => {
    if (!state) return null;
    const isDanger = state.variant === 'danger';
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
        onMouseDown={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
      >
        <div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-5 animate-fade-in"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">{state.title}</h3>
          {state.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 whitespace-pre-line">{state.description}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {state.cancelLabel || 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 rounded-xl text-sm font-medium text-white ${
                isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {state.confirmLabel || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return [confirm, Dialog];
}
