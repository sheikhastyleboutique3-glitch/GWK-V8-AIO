import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectRealtime } from './realtimeSocket';

/**
 * Hook that subscribes to real-time product change events via WebSocket.
 * Automatically invalidates relevant React Query caches when products are
 * updated, so the UI refreshes instantly (<100ms) instead of waiting for the
 * next poll cycle (30s).
 *
 * Use in any page that displays products: MenuPage, POSPage, KioskPage.
 *
 * @param opts.branchId - join a specific branch room (for POS/internal pages)
 * @param opts.joinPublic - join the public menu room (for kiosk/digital menu)
 * @param opts.queryKeys - additional query keys to invalidate on change
 */
export function useRealtimeProducts(opts?: {
  branchId?: number;
  joinPublic?: boolean;
  queryKeys?: string[][];
}) {
  const qc = useQueryClient();

  useEffect(() => {
    const disconnect = connectRealtime(
      (_payload) => {
        // Invalidate common product-related queries
        qc.invalidateQueries({ queryKey: ['menu-items'] });
        qc.invalidateQueries({ queryKey: ['pos-categories'] });
        qc.invalidateQueries({ queryKey: ['kiosk-menu'] });
        qc.invalidateQueries({ queryKey: ['products'] });
        qc.invalidateQueries({ queryKey: ['pos-products'] });
        // Invalidate any custom keys passed in
        if (opts?.queryKeys) {
          opts.queryKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
        }
      },
      { branchId: opts?.branchId, joinPublic: opts?.joinPublic },
    );

    return disconnect;
  }, [opts?.branchId, opts?.joinPublic, qc]);
}
