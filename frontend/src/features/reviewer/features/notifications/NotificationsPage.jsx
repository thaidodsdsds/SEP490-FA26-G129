import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function NotificationsPage() {
  const { alerts, matches, query, setQuery, feedback, setFeedback, markNotificationRead } = useReviewerWorkspace();
  const visible = alerts.filter((item) => matches(`${item.title} ${item.type}`));
  return (
    <ReviewerPageShell title="Thông báo" description="Theo dõi các nhắc việc và cập nhật trong hệ thống." query={query} onSearchChange={setQuery} feedback={feedback} onFeedbackDismiss={() => setFeedback('')}>
      <section className="reviewer-card">
        <div className="reviewer-card-heading"><div><h2>Notification center</h2><p>Thông báo công việc, quy trình và hạn chuẩn.</p></div></div>
        <div className="notification-list">
          {visible.map((alert) => (
            <article className={`notification-row${alert.read ? '' : ' unread'}`} key={alert.id}>
              <span className="notification-symbol">{alert.type === 'Review' ? '✓' : alert.type === 'Procedure' ? '≡' : '◷'}</span>
              <div><strong>{alert.title}</strong><small>{alert.type} · {alert.time}</small></div>
              {alert.read ? <StatusPill>Đã đọc</StatusPill> : <button className="small-action" onClick={() => markNotificationRead(alert.id)} type="button">Đánh dấu đã đọc</button>}
            </article>
          ))}
          {!visible.length && <div className="reviewer-empty">Không có thông báo phù hợp.</div>}
        </div>
      </section>
    </ReviewerPageShell>
  );
}

export default NotificationsPage;
