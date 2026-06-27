/**
 * usePrompt — Hook that replaces window.prompt() with a professional modal.
 *
 * Returns [promptFn, ModalComponent]:
 *   - promptFn(opts) → Promise<string | null> (resolves on OK, null on cancel)
 *   - ModalComponent — render this anywhere in your JSX (it's invisible until called)
 *
 * Usage:
 *   const [prompt, PromptDialog] = usePrompt();
 *
 *   const handleClick = async () => {
 *     const value = await prompt({ title: 'Enter weight', defaultValue: '1', type: 'number' });
 *     if (value === null) return; // cancelled
 *     doSomething(value);
 *   };
 *
 *   return <>{...}<PromptDialog /></>;
 */
import { useCallback, useRef, useState } from 'react';

interface PromptOptions {
  title: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[];
  confirmLabel?: string;
  cancelLabel?: string;
}

type PromptResolver = (value: string | null) => void;

export function usePrompt(): [(opts: PromptOptions) => Promise<string | null>, () => JSX.Element | null] {
  const [state, setState] = useState<PromptOptions | null>(null);
  const [value, setValue] = useState('');
  const resolverRef = useRef<PromptResolver | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const prompt = useCallback((opts: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState(opts);
      setValue(opts.defaultValue || '');
      setTimeout(() => inputRef.current?.focus(), 80);
    });
  }, []);

  const handleConfirm = () => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState(null);
  };

  const handleCancel = () => {
    resolverRef.current?.(null);
    resolverRef.current = null;
    setState(null);
  };

  const Dialog = () => {
    if (!state) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) handleCancel(); }}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-5 animate-fade-in" onMouseDown={(e) => e.stopPropagation()}>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">{state.title}</h3>
          {state.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 whitespace-pre-line">{state.description}</p>}

          {state.type === 'select' && state.options ? (
            <select
              ref={inputRef as any}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') handleCancel(); }}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            >
              {state.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input
              ref={inputRef as any}
              type={state.type || 'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); if (e.key === 'Escape') handleCancel(); }}
              placeholder={state.placeholder}
              step={state.type === 'number' ? 'any' : undefined}
              autoFocus
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
          )}

          <div className="flex gap-2 justify-end">
            <button onClick={handleCancel} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
              {state.cancelLabel || 'Cancel'}
            </button>
            <button onClick={handleConfirm} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
              {state.confirmLabel || 'OK'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return [prompt, Dialog];
}
