import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { PRODUCT_CHANGED, ProductChangedEvent } from '../../common/events/product-events';
import {
  TABLE_CHANGED, TableChangedEvent,
  ORDER_CHANGED, OrderChangedEvent,
  SESSION_CHANGED, SessionChangedEvent,
} from '../../common/events/realtime-events';
import { createWsAuthMiddleware } from '../../common/guards/ws-auth.middleware';

/**
 * General-purpose realtime gateway. Replaces polling with instant WebSocket
 * pushes for: product changes, table status, order lifecycle, POS sessions.
 *
 * SECURITY: JWT authentication required on connection. Clients must send token
 * via auth.token handshake or ?token= query param. Public menu clients use
 * the 'join_public' event (allowPublic flag permits unauthenticated menu viewers).
 */
@WebSocketGateway({ namespace: 'realtime', path: '/socket.io', cors: true })
@Injectable()
export class RealtimeGateway implements OnGatewayInit {
  @WebSocketServer() server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    // Apply JWT auth middleware — allow public for menu displays
    server.use(createWsAuthMiddleware(this.jwtService, this.configService, true));
  }

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
    // Branch-scoped broadcast: if event has branchId, send only to that branch.
    // Otherwise broadcast to all (e.g. price changes affect all branches).
    if ((evt as any).branchId) {
      this.server.to(`branch_${(evt as any).branchId}`).emit('product_changed', payload);
    } else {
      // Global change (price update, archive, new product) — notify all + public menu
      this.server.emit('product_changed', payload);
    }
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
