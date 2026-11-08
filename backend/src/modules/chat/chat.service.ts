import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import dataSource from '../../database/dataSource.js';
import {
  Account,
  ChatMessage,
  ChatParticipant,
  ChatThread,
} from '../../database/entities.js';
import { emitToUsers } from '../../websocket/wsServer.js';

export interface CreateThreadInput {
  thread_type: 'CustomerSupport' | 'ServiceRequestDiscussion' | 'CalibrationDispute';
  title: string;
  service_request_id?: number | null;
  customer_id?: number | null;
  participant_ids?: number[];
  initial_message?: string;
}

export const listUserThreads = async (accountId: number) => {
  const partRepo = dataSource.getRepository(ChatParticipant);
  const participations = await partRepo.find({
    where: { account_id: accountId },
    relations: {
      chat_thread: {
        participants: { account: true },
        messages: { sender: true },
      },
    },
    order: {
      chat_thread: {
        created_at: 'DESC',
      },
    },
  });

  return participations.map((p) => {
    const thread = p.chat_thread;
    const sortedMessages = (thread.messages || []).sort(
      (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime(),
    );
    const lastMessage = sortedMessages[0] || null;

    // Đếm tin nhắn gửi sau thời điểm last_read_at
    const unreadCount = (thread.messages || []).filter(
      (m) =>
        m.sender_account_id !== accountId &&
        new Date(m.sent_at).getTime() > new Date(p.last_read_at).getTime(),
    ).length;

    return {
      id: thread.id,
      title: thread.title,
      thread_type: thread.thread_type,
      service_request_id: thread.service_request_id,
      customer_id: thread.customer_id,
      status: thread.status,
      created_at: thread.created_at,
      last_message: lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            sent_at: lastMessage.sent_at,
            sender_name: lastMessage.sender?.full_name || 'Người dùng',
          }
        : null,
      unread_count: unreadCount,
      participants: (thread.participants || []).map((tp) => ({
        account_id: tp.account_id,
        full_name: tp.account?.full_name,
        email: tp.account?.email,
      })),
    };
  });
};

export const getThreadDetails = async (threadId: number, accountId: number) => {
  const threadRepo = dataSource.getRepository(ChatThread);
  const partRepo = dataSource.getRepository(ChatParticipant);
  const msgRepo = dataSource.getRepository(ChatMessage);

  const thread = await threadRepo.findOne({
    where: { id: threadId },
    relations: {
      participants: { account: true },
    },
  });

  if (!thread) {
    throw new AppError('Chat thread not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  // Cập nhật last_read_at của người đang đọc
  const participation = await partRepo.findOne({
    where: { chat_thread_id: threadId, account_id: accountId },
  });
  if (participation) {
    participation.last_read_at = new Date();
    await partRepo.save(participation);
  }

  const messages = await msgRepo.find({
    where: { chat_thread_id: threadId },
    relations: { sender: true },
    order: { sent_at: 'ASC' },
  });

  return {
    thread: {
      id: thread.id,
      title: thread.title,
      thread_type: thread.thread_type,
      service_request_id: thread.service_request_id,
      customer_id: thread.customer_id,
      status: thread.status,
      created_at: thread.created_at,
      participants: (thread.participants || []).map((tp) => ({
        account_id: tp.account_id,
        full_name: tp.account?.full_name,
        email: tp.account?.email,
      })),
    },
    messages: messages.map((m) => ({
      id: m.id,
      chat_thread_id: m.chat_thread_id,
      sender_account_id: m.sender_account_id,
      sender_name: m.sender?.full_name || 'Người dùng',
      content: m.content,
      sent_at: m.sent_at,
      is_me: m.sender_account_id === accountId,
    })),
  };
};

export const createThread = async (input: CreateThreadInput, creatorId: number) => {
  const threadRepo = dataSource.getRepository(ChatThread);
  const partRepo = dataSource.getRepository(ChatParticipant);
  const msgRepo = dataSource.getRepository(ChatMessage);

  const newThread = threadRepo.create({
    thread_type: input.thread_type,
    title: input.title.trim(),
    service_request_id: input.service_request_id || null,
    customer_id: input.customer_id || null,
    created_by: creatorId,
    status: 'Open',
  });
  const savedThread = await threadRepo.save(newThread);

  // Tập hợp danh sách thành viên (bắt buộc gồm người tạo)
  const participantIds = new Set<number>([creatorId, ...(input.participant_ids || [])]);
  const parts: ChatParticipant[] = [];

  for (const accId of participantIds) {
    parts.push(
      partRepo.create({
        chat_thread_id: savedThread.id,
        account_id: accId,
        last_read_at: new Date(),
      }),
    );
  }
  await partRepo.save(parts);

  // Tạo tin nhắn mở đầu nếu có
  if (input.initial_message && input.initial_message.trim()) {
    const msg = msgRepo.create({
      chat_thread_id: savedThread.id,
      sender_account_id: creatorId,
      content: input.initial_message.trim(),
    });
    await msgRepo.save(msg);
  }

  return await getThreadDetails(savedThread.id, creatorId);
};

export const sendMessage = async (
  threadId: number,
  senderId: number,
  content: string,
) => {
  if (!content || !content.trim()) {
    throw new AppError('Message content cannot be empty.', 400, ERROR_CODES.BAD_REQUEST);
  }

  const threadRepo = dataSource.getRepository(ChatThread);
  const partRepo = dataSource.getRepository(ChatParticipant);
  const msgRepo = dataSource.getRepository(ChatMessage);
  const accountRepo = dataSource.getRepository(Account);

  const thread = await threadRepo.findOne({ where: { id: threadId } });
  if (!thread) {
    throw new AppError('Chat thread not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  // Tự động tham gia nếu chưa là participant
  let part = await partRepo.findOne({
    where: { chat_thread_id: threadId, account_id: senderId },
  });
  if (!part) {
    part = partRepo.create({
      chat_thread_id: threadId,
      account_id: senderId,
      last_read_at: new Date(),
    });
    await partRepo.save(part);
  } else {
    part.last_read_at = new Date();
    await partRepo.save(part);
  }

  const sender = await accountRepo.findOne({ where: { id: senderId } });
  const message = msgRepo.create({
    chat_thread_id: threadId,
    sender_account_id: senderId,
    content: content.trim(),
  });
  const savedMessage = await msgRepo.save(message);

  const payload = {
    id: savedMessage.id,
    chat_thread_id: threadId,
    sender_account_id: senderId,
    sender_name: sender?.full_name || 'Người dùng',
    content: savedMessage.content,
    sent_at: savedMessage.sent_at,
  };

  // Lấy danh sách participants của thread để đẩy tin nhắn qua WebSocket
  const allParticipants = await partRepo.find({ where: { chat_thread_id: threadId } });
  const targetIds = allParticipants.map((p) => p.account_id);

  emitToUsers(targetIds, 'chat:message', payload);

  return payload;
};
