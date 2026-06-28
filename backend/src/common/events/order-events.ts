/**
 * Domain events emitted by the sales engine. Consumers subscribe via
 * `@OnEvent(ORDER_COMPLETED)` to run NON-BLOCKING side effects (analytics
 * logs, dashboard stat refresh, notifications) without coupling them to the
 * critical, transactional checkout path.
 */
export const ORDER_COMPLETED = 'order.completed';
export const ORDER_CREATED = 'order.created';
export const ORDER_UPDATED = 'order.updated';
export const ORDER_FIRED = 'order.fired';
export const ORDER_VOIDED = 'order.voided';

export interface OrderCompletedEvent {
  orderId: number;
  orderNo: string;
  branchId: number;
  channel: string;
  total: number;
  foodCost: number;
  grossProfit: number;
  customerId?: number | null;
  completedAt: Date;
}

export interface OrderChangedEvent {
  orderId: number;
  orderNo: string;
  branchId: number;
  channel?: string;
  tableName?: string | null;
  action: 'created' | 'updated' | 'fired' | 'completed' | 'voided' | 'item_added' | 'item_removed' | 'split' | 'merged';
}
