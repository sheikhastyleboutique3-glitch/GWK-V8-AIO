import { useCallback } from 'react';
import { decrementLocalStock, getProductLocalStock, getLocalStock } from './offlineCache';
import { useOnlineStatus } from './useOnlineStatus';

/**
 * useLocalStock — Hook for offline stock estimation.
 *
 * When online: stock checks happen on the server (real FEFO inventory).
 * When offline: uses locally-tracked estimates to warn cashiers about
 * potentially out-of-stock items before they try to complete an order.
 *
 * The local stock is:
 * - Initialized from server inventory on login/reconnect
 * - Decremented locally each time an offline order includes the product
 * - Reset to real values when internet returns (syncLocalStock)
 *
 * This is a BEST-EFFORT warning — not a hard block. The server will
 * do the real stock check when the offline order syncs.
 */
export function useLocalStock() {
  const { isOnline } = useOnlineStatus();

  /** Check if a product might be out of stock (offline estimate). */
  const checkStock = useCallback((productId: number, neededQty = 1): {
    available: boolean;
    estimatedQty: number | null;
    isEstimate: boolean;
  } => {
    if (isOnline) {
      // Online: server handles stock checks — always allow
      return { available: true, estimatedQty: null, isEstimate: false };
    }

    // Offline: use local estimate
    const qty = getProductLocalStock(productId);
    if (qty === null) {
      // No local data for this product — allow (might be new or never synced)
      return { available: true, estimatedQty: null, isEstimate: true };
    }

    return {
      available: qty >= neededQty,
      estimatedQty: qty,
      isEstimate: true,
    };
  }, [isOnline]);

  /** Decrement local stock after adding to an offline order. */
  const deduct = useCallback((productId: number, qty: number) => {
    if (!isOnline) {
      return decrementLocalStock(productId, qty);
    }
    return null; // Online — server handles it
  }, [isOnline]);

  /** Get all products with low local stock (< 3 units). */
  const getLowStockProducts = useCallback((): Array<{ productId: number; qty: number }> => {
    if (isOnline) return []; // Not needed when online
    const stock = getLocalStock();
    return Object.entries(stock)
      .filter(([, qty]) => qty <= 3 && qty >= 0)
      .map(([id, qty]) => ({ productId: Number(id), qty }));
  }, [isOnline]);

  return { checkStock, deduct, getLowStockProducts, isOffline: !isOnline };
}
