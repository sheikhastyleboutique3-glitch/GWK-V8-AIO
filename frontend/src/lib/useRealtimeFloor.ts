import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

/**
 * Hook that subscribes to real-time table/order/session events via WebSocket.
 * Automatically invalidates relevant React Query caches so the Waiter floor
 * plan, POS order list, and session bar update instantly without polling.
 *
 * Replaces the 15s polling intervals on WaiterPage/POSPage with <100ms updates.
 * Polling remains as a slow fallback (120s) in case WebSocket can't connect.
 */
export function useRealtimeFloor(branchId?: number) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!branchId) return;

    let socket: Socket | null = null;
    try {
      socket = io('/realtime', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        reconnectionAttempts: 50,
      });

      socket.on('connect', () => {
        socket?.emit('join_branch', { branchId });
      });

      // Table status changes (opened, closed, transferred)
      socket.on('table_changed', () => {
        qc.invalidateQueries({ queryKey: ['waiter-tables'] });
        qc.invalidateQueries({ queryKey: ['waiter-floors'] });
      });

      // Order lifecycle events (created, item_added, completed, voided)
      socket.on('order_changed', () => {
        qc.invalidateQueries({ queryKey: ['waiter-active-orders'] });
        qc.invalidateQueries({ queryKey: ['waiter-order'] });
        qc.invalidateQueries({ queryKey: ['sales-history'] });
        qc.invalidateQueries({ queryKey: ['pos-loaded'] });
      });

      // POS session changes (opened, closed, cash movement)
      socket.on('session_changed', () => {
        qc.invalidateQueries({ queryKey: ['pos-session-current'] });
      });
    } catch {
      // Silent fail — polling fallback remains active
    }

    return () => {
      try {
        socket?.off('table_changed');
        socket?.off('order_changed');
        socket?.off('session_changed');
        socket?.disconnect();
      } catch {}
    };
  }, [branchId, qc]);
}
