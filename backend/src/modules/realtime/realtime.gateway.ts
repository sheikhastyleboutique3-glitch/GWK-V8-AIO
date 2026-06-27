import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { KDS_CHANGED, KdsChangedEvent } from '../kds/kds.gateway';
import {
  ORDER_CREATED,
  ORDER_UPDATED,
  ORDER_FIRED,
  ORDER_COMPLETED,
  ORDER_VOIDED,
  OrderChangedEvent,
  OrderCompletedEvent,
} from '../../common/events/order-events';

/**
 * Unified Real-Time Gateway
 *
 * All POS, Waiter, and KDS clients connect to the `/realtime` namespace.
 * They join a branch room and receive instant push events for ALL order
 * changes — eliminating the need for polling.
 *
 * Events emitted to clients:
 *   - order:changed  → any order mutation (create/update/fire/complete/void)
 *   - kds:update     → kitchen board changed (redundant with order:changed but
 *                       allows KDS to subscribe to just kitchen events)
 *
 * This replaces the old polling-based sync (5-15s delays) with < 50ms pushes.
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'realtime',
  path: '/socket.io',
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private connectedClients = 0;

  handleConnection() {
    this.connectedClients++;
  }

  handleDisconnect() {
    this.connectedClients--;
  }

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { branchId: number }) {
    if (data?.branchId != null) {
      client.join(`branch_${data.branchId}`);
    }
    // Also join a global room for cross-branch events (e.g. transfers)
    client.join('global');
    return { ok: true, branch: data?.branchId };
  }

  @SubscribeMessage('ping')
  handlePing() {
    return { pong: Date.now() };
  }

  // ─── Event listeners (from EventEmitter2) ─────────────────────────────

  @OnEvent(ORDER_CREATED)
  onOrderCreated(evt: OrderChangedEvent) {
    this.broadcast(evt);
  }

  @OnEvent(ORDER_UPDATED)
  onOrderUpdated(evt: OrderChangedEvent) {
    this.broadcast(evt);
  }

  @OnEvent(ORDER_FIRED)
  onOrderFired(evt: OrderChangedEvent) {
    this.broadcast(evt);
  }

  @OnEvent(ORDER_COMPLETED)
  onOrderCompleted(evt: OrderCompletedEvent) {
    if (!this.server || !evt?.branchId) return;
    this.server.to(`branch_${evt.branchId}`).emit('order:changed', {
      orderId: evt.orderId,
      orderNo: evt.orderNo,
      branchId: evt.branchId,
      action: 'completed',
      at: Date.now(),
    });
  }

  @OnEvent(ORDER_VOIDED)
  onOrderVoided(evt: OrderChangedEvent) {
    this.broadcast(evt);
  }

  @OnEvent(KDS_CHANGED)
  onKdsChanged(evt: KdsChangedEvent) {
    if (!this.server || evt?.branchId == null) return;
    this.server.to(`branch_${evt.branchId}`).emit('kds:update', {
      branchId: evt.branchId,
      at: Date.now(),
    });
  }

  private broadcast(evt: OrderChangedEvent) {
    if (!this.server || !evt?.branchId) return;
    this.server.to(`branch_${evt.branchId}`).emit('order:changed', {
      orderId: evt.orderId,
      orderNo: evt.orderNo,
      branchId: evt.branchId,
      action: evt.action,
      tableName: evt.tableName,
      channel: evt.channel,
      at: Date.now(),
    });
  }
}
