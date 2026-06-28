/**
 * Offline Order Creation — Creates orders locally when the network is unavailable.
 *
 * Strategy:
 * - When offline, orders are saved to IndexedDB with a temporary local ID
 * - A local order number is generated (OFFLINE-{timestamp}-{random})
 * - When connectivity returns, the SyncManager replays creation via the API
 * - The server assigns the real order number and session binding
 * - The local order is replaced with the server response
 *
 * The POS can continue operating without internet:
 * - Cart items → local order → queued for sync
 * - Payments are recorded locally (cash only — card terminals need network)
 * - Print receipts from local data (with "OFFLINE" watermark)
 * - On reconnection, all orders sync in FIFO order
 */

import { addToQueue } from './offlineQueue';

export interface OfflineOrder {
  localId: string;
  localOrderNo: string;
  branchId: number;
  channel: string;
  tableName?: string;
  items: Array<{
    productId: number;
    name: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    modifiers?: any[];
  }>;
  payments: Array<{
    method: string;
    amount: number;
  }>;
  total: number;
  subtotal: number;
  notes?: string;
  customerId?: number;
  createdAt: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  serverOrderId?: number;
  serverOrderNo?: string;
}

const OFFLINE_ORDERS_KEY = 'gwk_offline_orders';

/** Generate a local order number for offline use. */
export function generateOfflineOrderNo(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `OFFLINE-${ts}-${rand}`;
}

/** Save an order locally for later sync. */
export function saveOfflineOrder(order: OfflineOrder): void {
  const orders = getOfflineOrders();
  orders.push(order);
  localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(orders));

  // Also queue the API request for the sync manager
  addToQueue({
    url: '/api/sales/orders',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      branchId: order.branchId,
      channel: order.channel,
      tableName: order.tableName,
      items: order.items.map(i => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
        modifiers: i.modifiers,
      })),
      notes: order.notes ? `[OFFLINE] ${order.notes}` : '[OFFLINE ORDER]',
      customerId: order.customerId,
      idempotencyKey: order.localId, // Prevents duplicates on retry
    },
  });
}

/** Get all offline orders (pending sync). */
export function getOfflineOrders(): OfflineOrder[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_ORDERS_KEY) || '[]');
  } catch {
    return [];
  }
}

/** Mark an offline order as synced (after server confirms). */
export function markOrderSynced(localId: string, serverOrderId: number, serverOrderNo: string): void {
  const orders = getOfflineOrders();
  const updated = orders.map(o =>
    o.localId === localId
      ? { ...o, syncStatus: 'synced' as const, serverOrderId, serverOrderNo }
      : o
  );
  localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(updated));
}

/** Remove synced orders older than 24h (cleanup). */
export function cleanupSyncedOrders(): void {
  const orders = getOfflineOrders();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const kept = orders.filter(o =>
    o.syncStatus !== 'synced' || new Date(o.createdAt).getTime() > cutoff
  );
  localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(kept));
}

/** Get count of pending (unsynced) offline orders. */
export function getPendingOfflineCount(): number {
  return getOfflineOrders().filter(o => o.syncStatus === 'pending').length;
}
