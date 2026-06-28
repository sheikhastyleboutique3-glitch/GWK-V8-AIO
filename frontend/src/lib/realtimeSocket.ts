import { io, Socket } from 'socket.io-client';

/**
 * Connect to the /realtime WebSocket namespace for live product changes.
 * Used by MenuPage (internal 86-toggle) and KioskPage (public digital menu)
 * to receive instant updates when items are toggled, edited, or archived.
 *
 * Replaces 30s polling with <100ms live sync.
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
    socket = io('/realtime', {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 20,
    });

    socket.on('connect', () => {
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
