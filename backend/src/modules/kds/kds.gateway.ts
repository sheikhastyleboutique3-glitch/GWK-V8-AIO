import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { createWsAuthMiddleware } from '../../common/guards/ws-auth.middleware';

export const KDS_CHANGED = 'kds.changed';
export interface KdsChangedEvent {
  branchId: number;
}

/**
 * Real-time Kitchen Display sync. Clients join their branch room and receive a
 * lightweight `kds_update` ping whenever an order/item changes, so the board
 * refetches instantly instead of polling.
 *
 * SECURITY: JWT authentication required. Kitchen staff must be logged in.
 */
@WebSocketGateway({ namespace: 'kds', path: '/socket.io', cors: true })
@Injectable()
export class KdsGateway implements OnGatewayInit {
  @WebSocketServer() server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    server.use(createWsAuthMiddleware(this.jwtService, this.configService, false));
  }

  @SubscribeMessage('join_branch')
  joinBranch(@ConnectedSocket() client: Socket, @MessageBody() data: { branchId: number }) {
    if (data?.branchId != null) client.join(`branch_${data.branchId}`);
    return { joined: data?.branchId };
  }

  @OnEvent(KDS_CHANGED)
  onKdsChanged(evt: KdsChangedEvent) {
    if (!this.server || evt?.branchId == null) return;
    this.server.to(`branch_${evt.branchId}`).emit('kds_update', { branchId: evt.branchId, at: Date.now() });
  }
}
