import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

interface AuthenticatedSocket extends WebSocket {
  accountId?: number;
}

// Map accountId -> tập các socket đang mở của user đó (hỗ trợ nhiều tab/thiết bị)
const userSockets = new Map<number, Set<WebSocket>>();
let globalWss: WebSocketServer | null = null;

export const createWebSocketServer = (httpServer: Server) => {
  const wss = new WebSocketServer({
    server: httpServer,
    path: env.wsPath,
  });
  globalWss = wss;

  wss.on('connection', (socket: AuthenticatedSocket) => {
    console.info(`[ws] Client connected: ${socket.readyState}`);

    socket.on('message', (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());

        // Đăng ký định danh qua Token JWT hoặc accountId
        if (message.type === 'auth' || message.type === 'identify') {
          let accountId: number | undefined;

          if (message.token) {
            try {
              const decoded = jwt.verify(message.token, env.jwt.secret) as { id?: number };
              accountId = decoded?.id ? Number(decoded.id) : undefined;
            } catch {
              console.warn('[ws] Invalid auth token on socket connect');
            }
          } else if (message.account_id) {
            accountId = Number(message.account_id);
          }

          if (accountId) {
            socket.accountId = accountId;
            if (!userSockets.has(accountId)) {
              userSockets.set(accountId, new Set());
            }
            userSockets.get(accountId)!.add(socket);

            socket.send(
              JSON.stringify({
                type: 'auth:success',
                payload: { accountId },
              }),
            );
            console.info(`[ws] Socket identified for Account ID: ${accountId}`);
            return;
          }
        }

        // Mặc định trả ack
        socket.send(
          JSON.stringify({
            type: 'ack',
            payload: {
              received: true,
              message,
            },
          }),
        );
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        console.error('[ws] Invalid JSON received:', messageText);
        socket.send(
          JSON.stringify({
            type: 'error',
            payload: { message: 'Invalid JSON payload.' },
          }),
        );
      }
    });

    socket.on('close', () => {
      if (socket.accountId && userSockets.has(socket.accountId)) {
        const set = userSockets.get(socket.accountId)!;
        set.delete(socket);
        if (set.size === 0) userSockets.delete(socket.accountId);
      }
      console.info(`[ws] Client disconnected`);
    });

    socket.on('error', (error) => {
      console.error('[ws] Socket error:', error.message);
    });
  });

  wss.on('error', (error) => {
    console.error('[ws] WebSocket server error:', error);
  });

  return wss;
};

/**
 * Đẩy tin nhắn / sự kiện tức thì tới một Account cụ thể
 */
export const emitToUser = (accountId: number, type: string, payload: unknown) => {
  const sockets = userSockets.get(accountId);
  if (!sockets || sockets.size === 0) return false;

  const data = JSON.stringify({ type, payload });
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  }
  return true;
};

/**
 * Đẩy tin nhắn / sự kiện tức thì tới danh sách Account
 */
export const emitToUsers = (accountIds: number[], type: string, payload: unknown) => {
  for (const id of accountIds) {
    emitToUser(id, type, payload);
  }
};

/**
 * Phát sóng sự kiện tới toàn bộ client đang online
 */
export const broadcastEvent = (type: string, payload: unknown) => {
  if (!globalWss) return;
  const data = JSON.stringify({ type, payload });
  for (const client of globalWss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
};
