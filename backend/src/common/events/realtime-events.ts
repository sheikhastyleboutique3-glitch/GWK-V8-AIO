/**
 * Realtime event constants for WebSocket broadcasting.
 * These events are emitted by services and picked up by the RealtimeGateway
 * to broadcast to connected frontend clients, replacing polling.
 */

// ── Tables ──────────────────────────────────────────────────────────────────
export const TABLE_CHANGED = 'table.changed';
export interface TableChangedEvent {
  branchId: number;
  tableId: number;
  tableName: string;
  status: string;
  action: 'opened' | 'closed' | 'status_changed' | 'transferred';
}

// ── Orders ──────────────────────────────────────────────────────────────────
export const ORDER_CHANGED = 'order.changed';
export interface OrderChangedEvent {
  branchId: number;
  orderId: number;
  orderNo?: string;
  action: 'created' | 'updated' | 'completed' | 'voided' | 'held' | 'resumed' | 'item_added' | 'item_removed';
  tableName?: string;
}

// ── POS Sessions ────────────────────────────────────────────────────────────
export const SESSION_CHANGED = 'session.changed';
export interface SessionChangedEvent {
  branchId: number;
  sessionId: number;
  action: 'opened' | 'closed' | 'cash_movement';
}
