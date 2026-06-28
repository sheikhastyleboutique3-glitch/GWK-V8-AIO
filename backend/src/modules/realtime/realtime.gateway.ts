import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { PRODUCT_CHANGED, ProductChangedEvent } from '../../common/events/product-events';

/**
 * General-purpose realtime gateway. Broadcasts product changes (86 toggle,
 * price updates, new items) to all connected POS terminals, the digital menu,
 * and any other live frontend. Clients join a branch room via `join_branch`
 * and receive targeted `product_changed` events for instant UI updates.
 *
 * Also supports a `public` room for unauthenticated digital menu clients.
 */
@WebSocketGateway({ cors: { origin: '*' }, namespace: 'realtime', path: '/socket.io' })
export class RealtimeGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('join_branch')
  joinBranch(@ConnectedSocket() client: Socket, @MessageBody() data: { branchId: number }) {
    if (data?.branchId != null) {
      client.join(`branch_${data.branchId}`);
    }
    return { joined: data?.branchId };
  }

  @SubscribeMessage('join_public')
  joinPublic(@ConnectedSocket() client: Socket) {
    client.join('public_menu');
    return { joined: 'public_menu' };
  }

  /**
   * When a product changes, broadcast to:
   * 1. All branch rooms (POS terminals get instant updates)
   * 2. The public_menu room (digital menu updates without polling)
   */
  @OnEvent(PRODUCT_CHANGED)
  onProductChanged(evt: ProductChangedEvent) {
    if (!this.server) return;
    const payload = {
      productId: evt.productId,
      action: evt.action,
      data: evt.data,
      at: Date.now(),
    };
    // Broadcast to all connected clients (branch-specific + public)
    this.server.emit('product_changed', payload);
  }
}
