/**
 * #9 — Form View / Detail Panel (Odoo-style side panel)
 *
 * Slides in from the right when a record is clicked in a list.
 * Shows full record details without navigating away from the list.
 *
 * Usage:
 *   <DetailPanel open={!!selectedId} onClose={() => setSelectedId(null)} title="Order Details">
 *     <OrderDetailContent id={selectedId} />
 *   </DetailPanel>
 */
import { useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: string; // e.g. 'w-96' or 'w-[500px]'
  children: React.ReactNode;
}

export default function DetailPanel({ open, onClose, title, width = 'w-96', children }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`fixed top-0 right-0 z-50 h-full ${width} bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col animate-in slide-in-from-right duration-200`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h2 className="font-bold text-gray-900 dark:text-gray-100 truncate">
            {title || 'Details'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </>
  );
}
