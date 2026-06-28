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
import {
  TABLE_CHANGED, TableChangedEvent,
  ORDER_CHANGED, OrderChangedEvent,
  SESSION_CHANGED, SessionChangedEvent,
} from '../../common/events/realtime-events';

/**
 * General-purpose realtime gateway. Replaces polling with instant WebSocket
 * pushes for: product changes, table status, order lifecycle, POS sessions.
 *
 * Clients join a branch room via `join_branch` and receive targeted events
 * scoped to their branch. Public clients join `public_menu` for menu updates.
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

  // ── Product Changes (86 toggle, price updates, new items) ─────────────────

  @OnEvent(PRODUCT_CHANGED)
  onProductChanged(evt: ProductChangedEvent) {
    if (!this.server) return;
    const payload = {
      productId: evt.productId,
      action: evt.action,
      data: evt.data,
      at: Date.now(),
    };
    this.server.emit('product_changed', payload);
  }

  // ── Table Status Changes (opened, closed, transferred) ────────────────────

  @OnEvent(TABLE_CHANGED)
  onTableChanged(evt: TableChangedEvent) {
    if (!this.server || !evt.branchId) return;
    this.server.to(`branch_${evt.branchId}`).emit('table_changed', {
      tableId: evt.tableId,
      tableName: evt.tableName,
      status: evt.status,
      action: evt.action,
      at: Date.now(),
    });
  }

  // ── Order Lifecycle (created, updated, completed, voided) ─────────────────

  @OnEvent(ORDER_CHANGED)
  onOrderChanged(evt: OrderChangedEvent) {
    if (!this.server || !evt.branchId) return;
    this.server.to(`branch_${evt.branchId}`).emit('order_changed', {
      orderId: evt.orderId,
      orderNo: evt.orderNo,
      action: evt.action,
      tableName: evt.tableName,
      at: Date.now(),
    });
  }

  // ── POS Session Changes (opened, closed, cash movements) ──────────────────

  @OnEvent(SESSION_CHANGED)
  onSessionChanged(evt: SessionChangedEvent) {
    if (!this.server || !evt.branchId) return;
    this.server.to(`branch_${evt.branchId}`).emit('session_changed', {
      sessionId: evt.sessionId,
      action: evt.action,
      at: Date.now(),
    });
  }
}
