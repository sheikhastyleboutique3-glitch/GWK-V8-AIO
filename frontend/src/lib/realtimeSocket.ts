import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

/**
 * Connect to the /realtime WebSocket namespace for live product changes.
 * Used by MenuPage (internal 86-toggle) and KioskPage (public digital menu)
 * to receive instant updates when items are toggled, edited, or archived.
 *
 * Replaces 30s polling with <100ms live sync.
 *
 * RELIABILITY: Uses infinite reconnection (matching useSocket.ts pattern)
 * and sends JWT auth token on handshake for security.
 *
 * @param onProductChanged - callback fired when any product changes
 * @param branchId - optional: join a specific branch room for targeted events
 * @returns disconnect function
 */
export function connectRealtime(
  onProductChanged: (data: { productId: number; action: string; data?: any }) => void,
  opts?: { branchId?: number; joinPublic?: boolean },
): () => void {
  let socket: Socket | null = null;
  try {
    const token = getToken();
    socket = io('/realtime', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity, // Never give up — matches useSocket.ts
      auth: token ? { token } : undefined,
    });

    socket.on('connect', () => {
      if (opts?.branchId != null) {
        socket?.emit('join_branch', { branchId: opts.branchId });
      }
      if (opts?.joinPublic) {
        socket?.emit('join_public');
      }
    });

    // Re-send auth token on reconnect (token may have refreshed)
    socket.on('reconnect', () => {
      const freshToken = getToken();
      if (freshToken && socket) {
        (socket.auth as any) = { token: freshToken };
      }
      if (opts?.branchId != null) {
        socket?.emit('join_branch', { branchId: opts.branchId });
      }
      if (opts?.joinPublic) {
        socket?.emit('join_public');
      }
    });

    socket.on('product_changed', (payload) => {
      onProductChanged(payload);
    });
  } catch {
    /* Silent fail — polling fallback remains active */
  }

  return () => {
    try {
      socket?.off('product_changed');
      socket?.disconnect();
    } catch {
      /* ignore */
    }
  };
}
