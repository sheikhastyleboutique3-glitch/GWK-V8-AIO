/**
 * WebSocket Authentication Middleware.
 *
 * Validates JWT token on WebSocket connection. Clients must send the token
 * either as a query parameter (?token=xxx) or in the auth handshake
 * (socket.io auth: { token: 'xxx' }).
 *
 * Unauthenticated connections are disconnected immediately.
 * Public namespaces (e.g. customer display) can bypass by setting
 * allowPublic: true in the gateway options.
 */
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

const logger = new Logger('WsAuth');

// Simple per-IP connection rate limiter for WebSocket
const connectionAttempts = new Map<string, { count: number; firstAt: number }>();
const WS_RATE_WINDOW_MS = 60_000; // 1 minute
const WS_RATE_LIMIT = 20; // max 20 WS connections per minute per IP

export function createWsAuthMiddleware(jwtService: JwtService, configService: ConfigService, allowPublic = false) {
  return (socket: Socket, next: (err?: Error) => void) => {
    // Rate limit WebSocket connections per IP
    const ip = socket.handshake.address || 'unknown';
    const now = Date.now();
    const entry = connectionAttempts.get(ip);
    if (entry && now - entry.firstAt < WS_RATE_WINDOW_MS) {
      entry.count++;
      if (entry.count > WS_RATE_LIMIT) {
        logger.warn(`WS rate limit exceeded: ${ip} (${entry.count} attempts in window)`);
        return next(new Error('Too many connection attempts. Try again later.'));
      }
    } else {
      connectionAttempts.set(ip, { count: 1, firstAt: now });
    }

    // Periodically clean up old entries (prevent memory leak)
    if (connectionAttempts.size > 1000) {
      for (const [key, val] of connectionAttempts) {
        if (now - val.firstAt > WS_RATE_WINDOW_MS) connectionAttempts.delete(key);
      }
    }

    // Extract token from multiple sources (handshake auth, query param, header)
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    // Allow public connections for customer-facing displays (menu board, kiosk)
    if (!token && allowPublic) {
      (socket as any).user = null;
      return next();
    }

    if (!token) {
      logger.warn(`WS connection rejected: no token from ${socket.handshake.address}`);
      return next(new Error('Authentication required. Provide token via auth.token or query.token.'));
    }

    try {
      const secret = configService.get<string>('JWT_SECRET') || 'fallback_secret_dev_only';
      const payload = jwtService.verify(token, { secret });
      (socket as any).user = payload;
      next();
    } catch (err) {
      logger.warn(`WS connection rejected: invalid token from ${socket.handshake.address}`);
      next(new Error('Invalid or expired token.'));
    }
  };
}
