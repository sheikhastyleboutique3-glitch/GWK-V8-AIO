/**
 * useSocket — Unified real-time hook for instant POS/Waiter/KDS sync.
 *
 * Connects once per app lifecycle to the `/realtime` Socket.IO namespace.
 * Joins the active branch room and invalidates React Query caches the moment
 * any order event arrives — zero polling delay.
 *
 * Events consumed:
 *   - order:changed → invalidates orders, pending bills, loaded order, POS session
 *   - kds:update   → invalidates KDS board
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

// Singleton socket — shared across all components. Only one connection per tab.
let socket: Socket | null = null;
let currentBranchId: number | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io('/realtime', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: true,
    });
  }
  return socket;
}

export interface OrderChangedPayload {
  orderId: number;
  orderNo: string;
  branchId: number;
  action: string;
  tableName?: string | null;
  channel?: string;
  at: number;
}

/**
 * Hook: subscribes to real-time order events and auto-invalidates queries.
 * Call this ONCE per page (POS, Waiter, KDS) — it's idempotent.
 *
 * @param opts.onOrderChanged - optional callback for custom handling (e.g. toast, sound)
 */
export function useSocket(opts?: {
  onOrderChanged?: (payload: OrderChangedPayload) => void;
  onKdsUpdate?: () => void;
}) {
  const { activeBranch } = useAuth();
  const qc = useQueryClient();
  const branchId = activeBranch?.id;
  const callbackRef = useRef(opts);
  callbackRef.current = opts;

  useEffect(() => {
    const sock = getSocket();

    // Join branch room (re-join on reconnect too)
    const joinBranch = () => {
      if (branchId != null) {
        sock.emit('join', { branchId });
        currentBranchId = branchId;
      }
    };

    // Switch room if branch changed
    if (branchId !== currentBranchId) {
      joinBranch();
    }

    sock.on('connect', joinBranch);

    // ─── order:changed → instant cache invalidation ───
    const handleOrderChanged = (payload: OrderChangedPayload) => {
      // Invalidate all order-related queries instantly
      qc.invalidateQueries({ queryKey: ['pos-pending'] });
      qc.invalidateQueries({ queryKey: ['waiter-active-orders'] });
      qc.invalidateQueries({ queryKey: ['pos-loaded'] });
      qc.invalidateQueries({ queryKey: ['pos-session-current'] });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });

      // Custom callback (sounds, toasts, etc.)
      callbackRef.current?.onOrderChanged?.(payload);
    };

    // ─── kds:update → instant KDS board refresh ───
    const handleKdsUpdate = () => {
      qc.invalidateQueries({ queryKey: ['kds-board'] });
      callbackRef.current?.onKdsUpdate?.();
    };

    sock.on('order:changed', handleOrderChanged);
    sock.on('kds:update', handleKdsUpdate);

    return () => {
      sock.off('connect', joinBranch);
      sock.off('order:changed', handleOrderChanged);
      sock.off('kds:update', handleKdsUpdate);
    };
  }, [branchId, qc]);
}

/**
 * Returns the raw socket for advanced use (e.g. emitting custom events).
 * Most pages should just use `useSocket()` instead.
 */
export function getRawSocket(): Socket {
  return getSocket();
}
