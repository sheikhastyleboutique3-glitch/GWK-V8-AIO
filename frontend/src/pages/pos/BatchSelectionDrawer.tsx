import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Batch {
  id?: number;
  batchNumber: string;
  availableQuantity: number;
  expiryDate?: string | null;
  receivedAt?: string;
  costPrice?: number;
}

interface BatchSelectionDrawerProps {
  product: any;
  batches: Batch[];
  onSelect: (batch: Batch) => void;
  onClose: () => void;
}

/**
 * Phase 4: Serial/Lot Selection Drawer
 * Replaces the old prompt-based batch selection with a proper drawer UI
 * showing available batches with FEFO info (expiry, qty, batch number).
 */
const BatchSelectionDrawer = React.memo(function BatchSelectionDrawer({
  product,
  batches,
  onSelect,
  onClose,
}: BatchSelectionDrawerProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filteredBatches = batches.filter((b) =>
    !search.trim() || b.batchNumber?.toLowerCase().includes(search.toLowerCase())
  );

  // Sort by expiry date (FEFO: first expiry first out)
  const sortedBatches = [...filteredBatches].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });

  const isExpiringSoon = (date: string | null | undefined) => {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // 7 days
  };

  const isExpired = (date: string | null | undefined) => {
    if (!date) return false;
    return new Date(date).getTime() < Date.now();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              📦 Select Batch
            </h3>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-700">✕</button>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            {product.name} — {batches.length} batch{batches.length !== 1 ? 'es' : ''} available (FEFO order)
          </p>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batch number..."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm"
            autoFocus
          />
        </div>

        {/* Batch list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
          {sortedBatches.map((batch, i) => {
            const expired = isExpired(batch.expiryDate);
            const expiringSoon = isExpiringSoon(batch.expiryDate);
            return (
              <button
                key={batch.id ?? batch.batchNumber ?? i}
                onClick={() => onSelect(batch)}
                disabled={expired}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all hover:shadow-sm active:scale-[0.98] ${
                  expired
                    ? 'border-red-200 bg-red-50 dark:bg-red-900/20 opacity-60 cursor-not-allowed'
                    : expiringSoon
                    ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:border-amber-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {batch.batchNumber || 'N/A'}
                  </span>
                  <span className={`text-sm font-bold ${batch.availableQuantity <= 2 ? 'text-red-600' : 'text-emerald-600'}`}>
                    Qty: {batch.availableQuantity}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">
                    {batch.expiryDate ? (
                      <>
                        Expires: {new Date(batch.expiryDate).toLocaleDateString()}
                        {expired && <span className="ms-1 text-red-600 font-bold">EXPIRED</span>}
                        {expiringSoon && !expired && <span className="ms-1 text-amber-600 font-bold">EXPIRING SOON</span>}
                      </>
                    ) : (
                      'No expiry'
                    )}
                  </span>
                  {batch.receivedAt && (
                    <span className="text-[10px] text-gray-400">
                      Received: {new Date(batch.receivedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {!sortedBatches.length && (
            <div className="text-center py-8 text-gray-400 text-sm">
              {search ? 'No batches match your search.' : 'No batches available.'}
            </div>
          )}
        </div>

        {/* Footer: Auto-FEFO option */}
        <div className="px-5 pb-5 pt-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => onSelect(sortedBatches[0] || batches[0])}
            disabled={!batches.length}
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition-transform"
          >
            ✓ Auto-select (FEFO — oldest expiry first)
          </button>
        </div>
      </div>
    </div>
  );
});

export default BatchSelectionDrawer;
