import { WebSocketServer } from 'ws';
import type { Server } from 'node:http';
import env from '../config/env.js';

export const createWebSocketServer = (httpServer: Server) => {
  const wss = new WebSocketServer({
    server: httpServer,
    path: env.wsPath,
  });

  wss.on('connection', (socket) => {
    console.info(`[ws] Client connected: ${socket.readyState}`);

    socket.on('message', (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        console.info('[ws] Received message:', message);

        socket.send(JSON.stringify({
          type: 'ack',
          payload: {
            received: true,
            message,
          },
        }));
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        console.error('[ws] Invalid JSON received:', messageText);
        socket.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid JSON payload.' },
        }));
      }
    });

    socket.on('close', () => {
      console.info('[ws] Client disconnected');
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
