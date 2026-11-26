import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';
import DashboardFetchNotice from '../../../../components/ui/DashboardFetchNotice.jsx';
import useDashboardOverview from '../../../../hooks/useDashboardOverview.js';

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
  const { records } = useReviewerWorkspace();
  const { data, error, loading, reload } = useDashboardOverview();
  const reviewer = data.reviewer ?? {};
  const attention = reviewer.attention ?? [];
  const pendingRecords = records.filter((record) => record.status === 'Pending');

  return (
    <ReviewerPageShell
      badge="Dữ liệu thực tế"
      description="Tình hình soát xét và vận hành phòng kỹ thuật."
      hideSearch
      title="Dashboard Reviewer (Head of Tech)"
    >
      <DashboardFetchNotice error={error} loading={loading} onRetry={reload} />
      <div className="reviewer-overview">
        <div className="operations-stats">
          <MetricCard
            icon="▤"
            label="Work Order đang chạy"
            note={reviewer.workOrdersNote ?? 'Open · Assigned · InProgress'}
            toneName="blue"
            value={reviewer.workOrdersRunning ?? 0}
          />
          <MetricCard
            icon="◷"
            label="Tem gần đến hạn"
            note={`${reviewer.sealsActive ?? 0} tem đang hoạt động · trong 60 ngày tới`}
            toneName="amber"
            value={reviewer.sealsDueSoon ?? 0}
          />
          <MetricCard
            icon="◇"
            label="Chuẩn sắp hết hạn"
            note={`${reviewer.standardsActive ?? 0} chuẩn đang hoạt động`}
            toneName="amber"
            value={reviewer.standardsExpiring ?? 0}
          />
          <MetricCard
            icon="✓"
            label="Hồ sơ chờ soát xét"
            note="CalibrationRecord Pending"
            toneName="green"
            value={reviewer.pendingRecords ?? pendingRecords.length}
          />
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
              {attention.length > 0 ? attention.map((item) => (
                <div
                  className={`attention-item attention-${item.tone === 'warning' ? 'warning' : item.tone === 'info' ? 'info' : 'neutral'}`}
                  key={item.id}
                >
                  <span>{item.tone === 'warning' ? '!' : '≡'}</span>
                  <div>
                    <strong>{item.text}</strong>
                  </div>
                </div>
              )) : (
                <p className="reviewer-empty">Không có cảnh báo cần xử lý.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </ReviewerPageShell>
  );
}

export default ReviewerDashboardPage;
