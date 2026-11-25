import http from 'http';
import app from './app.js';
import env from './config/env.js';
import { initializeDatabase } from './database/databaseService.js';
import { expireOverdueSeals } from './modules/seals/seals.service.js';
import { flushVerificationLogs } from './modules/verification/verification-log-queue.js';
import { createWebSocketServer } from './websocket/wsServer.js';

const SEAL_EXPIRATION_INTERVAL_MS = 60 * 60 * 1000; // FR-F8: 1 giờ/lần
const VERIFICATION_LOG_FLUSH_INTERVAL_MS = 5 * 1000; // FR-F11: flush log sau 5s

const server = http.createServer(app);
let shutdownInitiated = false;
let sealExpirationTimer: NodeJS.Timeout | null = null;
let verificationLogFlushTimer: NodeJS.Timeout | null = null;
let sealExpirationTask: Promise<void> | null = null;
let verificationLogFlushTask: Promise<void> | null = null;

/** Chạy dọn tem quá hạn; nếu lần trước còn chạy thì dùng luôn promise đó. */
const runSealExpiration = async (): Promise<void> => {
  if (sealExpirationTask) return sealExpirationTask;

  sealExpirationTask = expireOverdueSeals()
    .catch((error: unknown) => {
      console.error('[seals] Không thể cập nhật tem quá hạn:', error);
    })
    .finally(() => {
      sealExpirationTask = null;
    });

  return sealExpirationTask;
};

/** Đẩy log tra cứu tồn đọng xuống DB; chỉ 1 lần flush chạy cùng lúc. */
const runVerificationLogFlush = async (): Promise<void> => {
  if (verificationLogFlushTask) return verificationLogFlushTask;

  verificationLogFlushTask = flushVerificationLogs()
    .catch((error: unknown) => {
      console.error('[verification] Không thể ghi log tra cứu:', error);
    })
    .finally(() => {
      verificationLogFlushTask = null;
    });

  return verificationLogFlushTask;
};

const startBackgroundTasks = async () => {
  // Chạy ngay khi startup để DB không bị stale sau một lần restart dài.
  await runSealExpiration();

  sealExpirationTimer = setInterval(() => {
    void runSealExpiration();
  }, SEAL_EXPIRATION_INTERVAL_MS);
  sealExpirationTimer.unref?.();

  verificationLogFlushTimer = setInterval(() => {
    void runVerificationLogFlush();
  }, VERIFICATION_LOG_FLUSH_INTERVAL_MS);
  verificationLogFlushTimer.unref?.();
};

const stopBackgroundTasks = () => {
  if (sealExpirationTimer) {
    clearInterval(sealExpirationTimer);
    sealExpirationTimer = null;
  }
  if (verificationLogFlushTimer) {
    clearInterval(verificationLogFlushTimer);
    verificationLogFlushTimer = null;
  }
};

const startServer = async () => {
  try {
    await initializeDatabase();
    await startBackgroundTasks();
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
  stopBackgroundTasks();

  await new Promise<void>((resolve) => {
    server.close(() => {
      console.info('HTTP server closed.');
      resolve();
    });
  });

  // Đợi task đang chạy xong rồi flush nốt log trước khi process kết thúc.
  if (sealExpirationTask) await sealExpirationTask;
  await runVerificationLogFlush();
  console.info('Verification logs flushed. Graceful shutdown complete.');
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();
