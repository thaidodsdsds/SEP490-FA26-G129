import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function MetricCard({ icon, label, value, note, toneName }) {
  return (
    <article className="stat-card">
      <span className={`stat-icon ${toneName}`} aria-hidden="true">{icon}</span>
      <div><span>{label}</span><strong>{value}</strong></div>
      <small>{note}</small>
    </article>
  );
}

function ReviewerDashboardPage() {
  const { procedures, records, standards, seals, alerts } = useReviewerWorkspace();
  const pendingRecords = records.filter((record) => record.status === 'Pending');
  const activeStandards = standards.filter((standard) => standard.status === 'Active');
  const expiringCount = activeStandards.filter((standard) => {
    const days = (new Date(standard.expiry) - new Date('2026-10-21')) / 86400000;
    return days <= 30;
  }).length;
  const sealsDueSoon = seals.filter((seal) => {
    const days = (new Date(seal.dueDate) - new Date('2026-10-21')) / 86400000;
    return seal.status === 'Active' && days <= 60;
  }).length;
  const procedureDrafts = procedures.filter((item) => item.status === 'Draft').length;
  const unreadCount = alerts.filter((item) => !item.read).length;

  return (
    <ReviewerPageShell title="Dashboard Reviewer (Head of Tech)" description="Tình hình soát xét và vận hành phòng kỹ thuật." hideSearch>
      <div className="reviewer-overview">
        <div className="operations-stats">
          <MetricCard icon="▤" label="Work Order đang chạy" value={3} note="Open · Assigned · InProgress" toneName="blue" />
          <MetricCard icon="◷" label="Tem gần đến hạn" value={sealsDueSoon} note="Trong 60 ngày tới" toneName="amber" />
          <MetricCard icon="◇" label="Chuẩn sắp hết hạn" value={expiringCount} note={`${activeStandards.length} chuẩn đang hoạt động`} toneName="amber" />
          <MetricCard icon="✓" label="Hồ sơ chờ soát xét" value={pendingRecords.length} note="CalibrationRecord Pending" toneName="green" />
        </div>
        <div className="reviewer-overview-grid">
          <section className="reviewer-card reviewer-overview-queue">
            <div className="reviewer-card-heading">
              <div><h2>Hồ sơ cần chú ý</h2><p>Ưu tiên soát xét theo thời gian trình</p></div>
              <span className="queue-counter">{pendingRecords.length} hồ sơ</span>
            </div>
            <DataTable
              columns={[
                { key: 'id', label: 'Mã hồ sơ', render: (row) => <strong>{row.id}</strong> },
                { key: 'device', label: 'Thiết bị' },
                { key: 'technician', label: 'Kỹ thuật viên' },
                { key: 'submittedAt', label: 'Thời điểm trình' },
                { key: 'environmentStatus', label: 'Môi trường', render: (row) => <StatusPill>{row.environmentStatus}</StatusPill> },
              ]}
              rows={pendingRecords.slice(0, 4)}
              empty="Không có hồ sơ đang chờ."
            />
          </section>
          <section className="reviewer-card reviewer-attention-card">
            <div className="reviewer-card-heading"><div><h2>Nhắc việc</h2><p>Điểm cần theo dõi trong phòng kỹ thuật</p></div></div>
            <div className="attention-list">
              <div className="attention-item attention-warning"><span>!</span><div><strong>{expiringCount} chuẩn cần theo dõi hạn</strong><small>Buồng nhiệt ẩm ESPEC · hạn 25/10/2026</small></div></div>
              <div className="attention-item attention-info"><span>≡</span><div><strong>{procedureDrafts} quy trình đang ở bản nháp</strong><small>Cân bàn điện tử · cần hoàn thiện điểm đo và phát hành</small></div></div>
              <div className="attention-item attention-neutral"><span>◌</span><div><strong>{unreadCount} trao đổi chưa đọc</strong><small>Có phản hồi mới trong các luồng kỹ thuật</small></div></div>
            </div>
          </section>
        </div>
        <p className="mock-note"><strong>Demo:</strong> Dashboard hiển thị dữ liệu SRS minh họa; các thay đổi chỉ tồn tại trong phiên này.</p>
      </div>
    </ReviewerPageShell>
  );
}

export default ReviewerDashboardPage;
