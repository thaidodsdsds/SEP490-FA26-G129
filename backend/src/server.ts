import http from 'http';
import app from './app.js';
import env from './config/env.js';
import { initializeDatabase } from './database/databaseService.js';
import { createWebSocketServer } from './websocket/wsServer.js';

const server = http.createServer(app);
let shutdownInitiated = false;

server.on('error', (error) => {
  console.error('HTTP server failed:', error);
  process.exitCode = 1;
});

const startServer = async () => {
  try {
    await initializeDatabase();
    createWebSocketServer(server);

    server.listen(env.port, () => {
      console.info(`ISOCAL backend running on port ${env.port}`);
      console.info(`Health endpoint: http://localhost:${env.port}/api/v1/health`);
      console.info(`WebSocket endpoint: ws://localhost:${env.port}${env.wsPath}`);
    });
  } catch (error) {
    console.error('Failed to start backend server.');
    console.error(error);

    if (error instanceof Error && error.cause) {
      console.error('Underlying database/driver error:', error.cause);
    }

    process.exitCode = 1;
  }
};

const gracefulShutdown = async (signal: NodeJS.Signals) => {
  if (shutdownInitiated) {
    return;
  }

  shutdownInitiated = true;
  console.info(`Received ${signal}. Shutting down gracefully...`);

  server.close(() => {
    console.info('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();
