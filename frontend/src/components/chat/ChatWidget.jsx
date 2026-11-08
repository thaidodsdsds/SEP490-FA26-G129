import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../app/providers.jsx';
import {
  createChatThreadApi,
  getChatThreadDetailApi,
  getMyChatThreadsApi,
  sendChatMessageApi,
} from '../../services/chat-service.js';
import createWebSocketClient from '../../services/websocket-client.js';

const THREAD_TYPE_LABELS = {
  CustomerSupport: 'Hỗ trợ khách hàng',
  ServiceRequestDiscussion: 'Trao đổi đơn hàng',
  CalibrationDispute: 'Tranh chấp / Bất thường đo',
};

function ChatWidget() {
  const { user } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [activeThreadDetail, setActiveThreadDetail] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form create thread
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('CustomerSupport');
  const [newInitialMsg, setNewInitialMsg] = useState('');

  // Input chat message
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [attachUrl, setAttachUrl] = useState('');
  const [showAttachInput, setShowAttachInput] = useState(false);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch threads
  const loadThreads = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMyChatThreadsApi();
      setThreads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load chat threads', err);
    }
  }, [user]);

  // Fetch active thread detail
  const loadActiveThread = useCallback(async (id) => {
    try {
      const data = await getChatThreadDetailApi(id);
      setActiveThreadDetail(data);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error('Failed to load active thread', err);
    }
  }, []);

  // WebSocket instant push listener
  useEffect(() => {
    if (!user) return;

    loadThreads();

    const token = localStorage.getItem('isocal_token');
    const wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3000/ws`;

    const client = createWebSocketClient({
      url: wsUrl,
      onOpen: (_e, socket) => {
        if (token) {
          socket.send(JSON.stringify({ type: 'auth', token }));
        } else if (user?.id) {
          socket.send(JSON.stringify({ type: 'identify', account_id: user.id }));
        }
      },
      onMessage: (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'chat:message' && data.payload) {
            const incoming = data.payload;

            // If active thread is receiving the message, append directly
            setActiveThreadDetail((prev) => {
              if (prev && prev.id === incoming.chat_thread_id) {
                // Check if message already exists
                const exists = prev.messages.some((m) => m.id === incoming.id);
                if (!exists) {
                  const updatedMessages = [...prev.messages, incoming];
                  setTimeout(scrollToBottom, 50);
                  return { ...prev, messages: updatedMessages };
                }
              }
              return prev;
            });

            // Refresh thread list summary
            loadThreads();
          }
        } catch (e) {
          // ignore non-json
        }
      },
    });

    socketRef.current = client;

    return () => {
      client.close();
    };
  }, [user, loadThreads]);

  // When activeThreadId changes, fetch thread details
  useEffect(() => {
    if (activeThreadId) {
      loadActiveThread(activeThreadId);
    } else {
      setActiveThreadDetail(null);
    }
  }, [activeThreadId, loadActiveThread]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() && !attachUrl.trim()) return;
    if (!activeThreadId) return;

    let fullContent = messageText.trim();
    if (attachUrl.trim()) {
      fullContent += `\n[Tệp đính kèm]: ${attachUrl.trim()}`;
    }

    try {
      setSending(true);
      const sent = await sendChatMessageApi(activeThreadId, fullContent);
      setMessageText('');
      setAttachUrl('');
      setShowAttachInput(false);

      // Append optimistic / received message
      setActiveThreadDetail((prev) => {
        if (!prev) return prev;
        const exists = prev.messages.some((m) => m.id === sent.id);
        if (exists) return prev;
        return {
          ...prev,
          messages: [...prev.messages, sent],
        };
      });
      setTimeout(scrollToBottom, 50);
      loadThreads();
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Không thể gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await createChatThreadApi({
        title: newTitle.trim(),
        thread_type: newType,
        initial_message: newInitialMsg.trim() || undefined,
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewInitialMsg('');
      await loadThreads();
      if (created?.id) {
        setActiveThreadId(created.id);
      }
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Không thể tạo cuộc trò chuyện.');
    }
  };

  const totalUnread = threads.reduce((acc, t) => acc + (t.unread_count || 0), 0);

  const filteredThreads = threads.filter((t) => {
    if (filterType === 'all') return true;
    return t.thread_type === filterType;
  });

  if (!user) return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Floating launcher button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            loadThreads();
          }}
          aria-label="Mở hộp thoại hỗ trợ trực tuyến"
          style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            backgroundColor: '#2563eb',
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.45)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            position: 'relative',
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          💬
          {totalUnread > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                backgroundColor: '#ef4444',
                color: '#fff',
                borderRadius: 99,
                fontSize: '0.75rem',
                fontWeight: 700,
                minWidth: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                border: '2px solid #fff',
              }}
            >
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </button>
      )}

      {/* Expanded Chat Box */}
      {isOpen && (
        <div
          style={{
            width: 390,
            height: 540,
            backgroundColor: '#ffffff',
            borderRadius: 14,
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#1e3a8a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {activeThreadId && (
                <button
                  onClick={() => {
                    setActiveThreadId(null);
                    loadThreads();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    padding: 0,
                    lineHeight: 1,
                  }}
                  title="Quay lại danh sách"
                >
                  &larr;
                </button>
              )}
              <div>
                <strong style={{ fontSize: '0.95rem', display: 'block', maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeThreadDetail ? activeThreadDetail.title : 'ISOCAL Chat & Hỗ trợ'}
                </strong>
                <small style={{ fontSize: '0.75rem', opacity: 0.85 }}>
                  {activeThreadDetail
                    ? (THREAD_TYPE_LABELS[activeThreadDetail.thread_type] || activeThreadDetail.thread_type)
                    : `${threads.length} cuộc trò chuyện`}
                </small>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!activeThreadId && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: '#fff',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  + Mới
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: '0 4px',
                }}
                title="Thu nhỏ"
              >
                &times;
              </button>
            </div>
          </div>

          {/* Body */}
          {activeThreadId ? (
            /* MÀN 16: CỬA SỔ CHAT CHI TIẾT */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
              {/* Message scroll area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activeThreadDetail?.messages?.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto', fontSize: '0.88rem' }}>
                    Chưa có tin nhắn nào trong hội thoại này.<br />Hãy gửi lời chào đầu tiên!
                  </div>
                ) : (
                  activeThreadDetail?.messages?.map((msg) => {
                    const isMe = msg.sender_account_id === user.id;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '82%',
                        }}
                      >
                        {!isMe && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 2, paddingLeft: 4 }}>
                            {msg.sender_name || `Người dùng #${msg.sender_account_id}`}
                          </div>
                        )}
                        <div
                          style={{
                            padding: '9px 13px',
                            borderRadius: 12,
                            backgroundColor: isMe ? '#2563eb' : '#ffffff',
                            color: isMe ? '#ffffff' : '#1e293b',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                            border: isMe ? 'none' : '1px solid #e2e8f0',
                            fontSize: '0.88rem',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {msg.content}
                        </div>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: '#94a3b8',
                            marginTop: 2,
                            textAlign: isMe ? 'right' : 'left',
                            paddingRight: isMe ? 4 : 0,
                            paddingLeft: !isMe ? 4 : 0,
                          }}
                        >
                          {msg.sent_at ? new Date(msg.sent_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachment URL prompt */}
              {showAttachInput && (
                <div style={{ padding: '6px 12px', background: '#e0e7ff', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="url"
                    placeholder="Dán link tài liệu/hình ảnh (https://...)"
                    value={attachUrl}
                    onChange={(e) => setAttachUrl(e.target.value)}
                    style={{ flex: 1, padding: '4px 8px', borderRadius: 4, border: '1px solid #c7d2fe', fontSize: '0.8rem' }}
                  />
                  <button
                    onClick={() => setShowAttachInput(false)}
                    style={{ background: 'none', border: 'none', color: '#4338ca', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} style={{ padding: '10px 12px', backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowAttachInput((v) => !v)}
                  title="Đính kèm liên kết file / ảnh"
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    color: attachUrl ? '#2563eb' : '#64748b',
                    padding: '0 4px',
                  }}
                >
                  📎
                </button>
                <input
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 20,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || (!messageText.trim() && !attachUrl.trim())}
                  style={{
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 20,
                    padding: '8px 14px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    opacity: sending || (!messageText.trim() && !attachUrl.trim()) ? 0.5 : 1,
                  }}
                >
                  Gửi
                </button>
              </form>
            </div>
          ) : (
            /* MÀN 15: DANH SÁCH HỘI THOẠI (CHAT INBOX) */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', overflow: 'hidden' }}>
              {/* Type filter chips */}
              <div style={{ padding: '8px 12px', display: 'flex', gap: 6, borderBottom: '1px solid #f1f5f9', overflowX: 'auto' }}>
                {[
                  { key: 'all', label: 'Tất cả' },
                  { key: 'CustomerSupport', label: 'Hỗ trợ' },
                  { key: 'ServiceRequestDiscussion', label: 'Đơn hàng' },
                  { key: 'CalibrationDispute', label: 'Tranh chấp' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilterType(f.key)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 99,
                      border: '1px solid',
                      borderColor: filterType === f.key ? '#2563eb' : '#e2e8f0',
                      backgroundColor: filterType === f.key ? '#eff6ff' : '#f8fafc',
                      color: filterType === f.key ? '#1d4ed8' : '#64748b',
                      fontSize: '0.78rem',
                      fontWeight: filterType === f.key ? 600 : 400,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Thread list */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {filteredThreads.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94a3b8', fontSize: '0.88rem' }}>
                    Không có hội thoại nào.<br />Bấm <strong>+ Mới</strong> để bắt đầu trao đổi.
                  </div>
                ) : (
                  filteredThreads.map((thread) => (
                    <div
                      key={thread.id}
                      onClick={() => setActiveThreadId(thread.id)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        backgroundColor: thread.unread_count > 0 ? '#f0fdf4' : '#ffffff',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = thread.unread_count > 0 ? '#f0fdf4' : '#ffffff')}
                    >
                      <div style={{ flex: 1, marginRight: 8, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: '#e0e7ff',
                              color: '#3730a3',
                            }}
                          >
                            {THREAD_TYPE_LABELS[thread.thread_type] || thread.thread_type}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {thread.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
                          {thread.last_message?.content || 'Chưa có tin nhắn...'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {thread.created_at ? new Date(thread.created_at).toLocaleDateString('vi-VN') : ''}
                        </span>
                        {thread.unread_count > 0 && (
                          <span
                            style={{
                              backgroundColor: '#16a34a',
                              color: '#fff',
                              borderRadius: 99,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                            }}
                          >
                            {thread.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Modal Tạo cuộc trò chuyện mới */}
          {showCreateModal && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: 16 }}>
              <div style={{ backgroundColor: '#fff', borderRadius: 10, padding: 20, width: '100%', maxWidth: 340, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: '#1e293b' }}>Tạo cuộc trao đổi mới</h3>
                <form onSubmit={handleCreateThread}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Loại hội thoại</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                      <option value="CustomerSupport">Hỗ trợ khách hàng</option>
                      <option value="ServiceRequestDiscussion">Trao đổi theo Đơn hàng</option>
                      <option value="CalibrationDispute">Tranh chấp kết quả đo</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Tiêu đề chủ đề</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Hỏi đáp hiệu chuẩn đồng hồ Fluke 87V"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>Tin nhắn mở đầu</label>
                    <textarea
                      placeholder="Nhập nội dung cần hỗ trợ hoặc thảo luận..."
                      value={newInitialMsg}
                      onChange={(e) => setNewInitialMsg(e.target.value)}
                      rows={3}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Bắt đầu chat
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ChatWidget;
