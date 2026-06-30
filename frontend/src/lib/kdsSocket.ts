/**
 * KDS WebSocket Connection — connects to the /kds namespace for real-time
 * kitchen display updates. When an order item changes status (fired, advanced,
 * recalled), the server emits `kds_update` on this namespace.
 *
 * This provides instant refresh for the Kitchen Display page without polling.
 * Falls back to 20s polling interval if the socket can't connect.
 *
 * @param branchId - the branch to listen for updates on
 * @param onUpdate - callback fired when any KDS item changes
 * @param onStatus - optional callback fired with the live socket connection
 *                   state, so the page can tighten its polling fallback when
 *                   the socket is down (avoids tickets sitting unseen).
 * @returns disconnect function
 */
import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

export function connectKds(
  branchId: number | undefined | null,
  onUpdate: () => void,
  onStatus?: (connected: boolean) => void,
): () => void {
  let socket: Socket | null = null;

  try {
    const token = getToken();
    socket = io('/kds', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      auth: token ? { token } : undefined,
    });

    socket.on('connect', () => {
      onStatus?.(true);
      if (branchId != null) {
        socket?.emit('join_branch', { branchId });
      }
    });

    socket.on('disconnect', () => onStatus?.(false));
    socket.on('connect_error', () => onStatus?.(false));

    socket.on('reconnect', () => {
      // Re-send fresh token + re-join room on reconnect
      const freshToken = getToken();
      if (freshToken && socket) {
        (socket.auth as any) = { token: freshToken };
      }
      onStatus?.(true);
      if (branchId != null) {
        socket?.emit('join_branch', { branchId });
      }
    });

    socket.on('kds_update', () => {
      onUpdate();
    });
  } catch {
    /* Silent fail — polling fallback remains active via refetchInterval */
    onStatus?.(false);
  }

  return () => {
    try {
      socket?.off('kds_update');
      socket?.disconnect();
    } catch {
      /* ignore */
    }
  };
}
