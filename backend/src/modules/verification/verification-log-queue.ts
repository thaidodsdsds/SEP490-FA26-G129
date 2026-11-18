import {
  recordVerificationLogs,
  type RecordVerificationLogInput,
} from './verification.service.js';

/**
 * Hàng đợi log tra cứu công khai.
 *
 * - API trả response ngay, log được đẩy vào đây thay vì viết thẳng DB.
 * - Một timer trong server.ts flush định kỳ; lúc graceful shutdown flush nốt
 *   để log không bị mất khi restart (FR-F11 / NFR hiệu năng tra cứu).
 */
const MAX_PENDING_LOGS = 1000;
const pending: RecordVerificationLogInput[] = [];
let draining: Promise<void> | null = null;

export const enqueueVerificationLog = (input: RecordVerificationLogInput): void => {
  if (pending.length >= MAX_PENDING_LOGS) {
    console.warn('[verification] Hàng đợi log tra cứu đầy, bỏ log cũ nhất.');
    pending.shift();
  }
  pending.push(input);
};

export const getPendingVerificationLogCount = (): number => pending.length;

/**
 * Ghi toàn bộ log đang chờ xuống DB. Nếu lỗi thì đưa batch trở lại đầu hàng đợi
 * để lần flush sau (hoặc shutdown) thử lại. Chỉ có 1 lần flush chạy cùng lúc.
 */
export const flushVerificationLogs = async (): Promise<void> => {
  if (draining) return draining;
  if (pending.length === 0) return;

  const batch = pending.splice(0, pending.length);
  draining = recordVerificationLogs(batch)
    .catch((error: unknown) => {
      pending.unshift(...batch);
      throw error;
    })
    .finally(() => {
      draining = null;
    });

  return draining;
};
