/**
 * PromptModal — Professional replacement for window.prompt().
 * Renders an inline modal with a text/number input, optional description,
 * and OK/Cancel buttons. Supports keyboard (Enter to confirm, Escape to cancel).
 *
 * Usage:
 *   <PromptModal
 *     open={showPrompt}
 *     title="Enter quantity"
 *     description="How many units?"
 *     defaultValue="1"
 *     type="number"
 *     onConfirm={(value) => { setQty(+value); setShowPrompt(false); }}
 *     onCancel={() => setShowPrompt(false)}
 *   />
 */
import { useEffect, useRef, useState } from 'react';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  defaultValue?: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'select';
  options?: { value: string; label: string }[]; // for type='select'
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function PromptModal({
  open,
  title,
  description,
  defaultValue = '',
  placeholder,
  type = 'text',
  options,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, defaultValue]);

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-5 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{description}</p>}

        {type === 'select' && options ? (
          <select
            ref={inputRef as any}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef as any}
            type={type}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            step={type === 'number' ? 'any' : undefined}
          />
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
