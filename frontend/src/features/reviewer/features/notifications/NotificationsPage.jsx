import { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../../../../app/providers.jsx';
import {
  getMyNotificationsApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '../../../../services/notification-service.js';
import createWebSocketClient from '../../../../services/websocket-client.js';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function NotificationsPage() {
  const { user } = useAppContext();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyNotificationsApi(unreadOnly);
      setNotifications(res.items || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      console.error(err);
      setFeedback('Không thể tải danh sách thông báo.');
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // WebSocket instant notification push
  useEffect(() => {
    if (!user) return;

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
          if (data.type === 'notification:push' && data.payload) {
            const newNotif = data.payload;
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((c) => c + 1);
          }
        } catch (e) {
          // ignore
        }
      },
    });

    return () => {
      client.close();
    };
  }, [user]);

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationReadApi(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      setFeedback('Không thể đánh dấu thông báo.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsReadApi();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() })),
      );
      setUnreadCount(0);
      setFeedback('Đã đánh dấu tất cả thông báo là đã đọc.');
    } catch (err) {
      setFeedback('Không thể đánh dấu tất cả thông báo.');
    }
  };

  const filtered = notifications.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.message?.toLowerCase().includes(q) ||
      item.type?.toLowerCase().includes(q)
    );
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'StandardExpiry':
      case 'Alert':
        return '⚠️';
      case 'ProcedurePublished':
      case 'Procedure':
        return '📑';
      case 'InboundWarehouse':
      case 'OutboundWarehouse':
        return '📦';
      case 'ReviewApproved':
        return '✓';
      default:
        return '🔔';
    }
  };

  return (
    <ReviewerPageShell
      title="Trung tâm Thông báo (Notification Center)"
      description="Cập nhật các nhắc việc kiểm định, phân công quy trình và cảnh báo hạn chuẩn đo lường thời gian thực."
      query={query}
      onSearchChange={setQuery}
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
    >
      <section className="reviewer-card">
        <div className="reviewer-card-heading">
          <div>
            <h2>Hộp thư thông báo {unreadCount > 0 && <span style={{ color: '#ef4444' }}>({unreadCount} chưa đọc)</span>}</h2>
            <p>Hệ thống tự động đồng bộ và đẩy thông báo tức thì qua WebSocket.</p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {unreadCount > 0 && (
              <button
                className="button button-secondary"
                onClick={handleMarkAllAsRead}
                type="button"
              >
                ✓ Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
        </div>

        <div className="filter-row reviewer-filter" style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button
            aria-pressed={!unreadOnly}
            className={`filter-chip${!unreadOnly ? ' selected' : ''}`}
            onClick={() => setUnreadOnly(false)}
            type="button"
          >
            Tất cả thông báo
          </button>
          <button
            aria-pressed={unreadOnly}
            className={`filter-chip${unreadOnly ? ' selected' : ''}`}
            onClick={() => setUnreadOnly(true)}
            type="button"
          >
            Chỉ thông báo chưa đọc ({unreadCount})
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748b' }}>Đang tải thông báo...</div>
        ) : filtered.length === 0 ? (
          <div className="reviewer-empty">Không có thông báo nào.</div>
        ) : (
          <div className="notification-list" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((item) => (
              <article
                className={`notification-row${item.is_read ? '' : ' unread'}`}
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: 8,
                  border: '1px solid',
                  borderColor: item.is_read ? '#e2e8f0' : '#bfdbfe',
                  backgroundColor: item.is_read ? '#ffffff' : '#f0f9ff',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{getNotificationIcon(item.type)}</span>
                  <div>
                    <div style={{ fontWeight: item.is_read ? 600 : 700, color: '#1e293b', fontSize: '0.95rem' }}>
                      {item.title}
                    </div>
                    {item.message && (
                      <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '0.88rem', whiteSpace: 'pre-wrap' }}>
                        {item.message}
                      </p>
                    )}
                    <small style={{ color: '#94a3b8', fontSize: '0.78rem', display: 'block', marginTop: 6 }}>
                      {item.type || 'Hệ thống'} · {item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : ''}
                    </small>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {item.is_read ? (
                    <StatusPill>Đã đọc</StatusPill>
                  ) : (
                    <button
                      className="small-action"
                      onClick={() => handleMarkAsRead(item.id)}
                      type="button"
                      style={{
                        padding: '5px 12px',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </ReviewerPageShell>
  );
}

export default NotificationsPage;
