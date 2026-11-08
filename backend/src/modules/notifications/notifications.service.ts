import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import dataSource from '../../database/dataSource.js';
import { Notification } from '../../database/entities.js';
import { emitToUser } from '../../websocket/wsServer.js';

export const listNotifications = async (accountId: number, unreadOnly = false) => {
  const repo = dataSource.getRepository(Notification);
  const qb = repo
    .createQueryBuilder('n')
    .where('n.account_id = :accId', { accId: accountId })
    .orderBy('n.created_at', 'DESC')
    .take(50);

  if (unreadOnly) {
    qb.andWhere('n.is_read = false');
  }

  const items = await qb.getMany();
  const unreadCount = await repo.count({
    where: { account_id: accountId, is_read: false },
  });

  return {
    items,
    unread_count: unreadCount,
  };
};

export const markAsRead = async (notificationId: number, accountId: number) => {
  const repo = dataSource.getRepository(Notification);
  const notification = await repo.findOne({
    where: { id: notificationId, account_id: accountId },
  });

  if (!notification) {
    throw new AppError('Notification not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  notification.is_read = true;
  notification.read_at = new Date();
  return await repo.save(notification);
};

export const markAllAsRead = async (accountId: number) => {
  const repo = dataSource.getRepository(Notification);
  await repo
    .createQueryBuilder()
    .update(Notification)
    .set({ is_read: true, read_at: new Date() })
    .where('account_id = :accId AND is_read = false', { accId: accountId })
    .execute();

  return { success: true };
};

/**
 * Hàm dùng chung cho toàn hệ thống: Tạo thông báo & Đẩy tức thì qua WebSocket
 */
export const createNotification = async (
  accountId: number,
  type: 'InspectionFail' | 'Quotation' | 'Payment' | 'DueDate' | 'ChatMessage' | 'System',
  title: string,
  content: string,
) => {
  const repo = dataSource.getRepository(Notification);
  const notice = repo.create({
    account_id: accountId,
    type,
    title: title.trim(),
    content: content.trim(),
    is_read: false,
  });

  const saved = await repo.save(notice);

  // Đẩy tức thì qua WebSocket tới tài khoản người nhận
  emitToUser(accountId, 'notification:push', saved);

  return saved;
};
