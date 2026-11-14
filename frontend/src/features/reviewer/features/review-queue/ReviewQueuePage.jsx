import { useMemo, useState } from 'react';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function ReviewQueuePage() {
  const {
    records,
    loadingRecords,
    recordsError,
    loadReviewQueue,
    matches,
    query,
    setQuery,
    feedback,
    setFeedback,
    setModal,
  } = useReviewerWorkspace();

  const [statusFilter, setStatusFilter] = useState('Pending'); // 'Pending' | 'Approved' | 'Rejected' | 'all'

  // Summary counts
  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const r of records) {
      if (r.status === 'Pending') pending++;
      else if (r.status === 'Approved') approved++;
      else if (r.status === 'Rejected') rejected++;
    }
    return {
      total: records.length,
      pending,
      approved,
      rejected,
    };
  }, [records]);

  // Filtered records based on search and status
  const filteredRecords = useMemo(() => {
    return records
      .filter((item) => {
        if (statusFilter === 'all') return true;
        return item.status === statusFilter;
      })
      .filter((item) =>
        matches(
          `${item.id} ${item.device} ${item.customer} ${item.technician} ${item.procedure || ''} ${item.work_order_code || ''}`,
        ),
      );
  }, [records, statusFilter, matches]);

  return (
    <ReviewerPageShell
      description="Kiểm tra hồ sơ đo kiểm, đối chiếu chuẩn, môi trường và từng điểm đo trước khi phê duyệt hoặc từ chối."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      onSearchChange={setQuery}
      query={query}
      title="Hàng chờ soát xét"
    >
      {/* ─── Top Stats Summary ─────────────────────────────────── */}
      <div className="operations-stats" style={{ marginBottom: '18px' }}>
        <article
          className="stat-card"
          onClick={() => setStatusFilter('all')}
          style={{ cursor: 'pointer', border: statusFilter === 'all' ? '2px solid #3b82f6' : undefined }}
        >
          <span aria-hidden="true" className="stat-icon blue">
            ▤
          </span>
          <div>
            <span>Tổng hồ sơ</span>
            <strong>{counts.total}</strong>
          </div>
          <small>Hồ sơ hiệu chuẩn trong hệ thống</small>
        </article>

        <article
          className="stat-card"
          onClick={() => setStatusFilter('Pending')}
          style={{ cursor: 'pointer', border: statusFilter === 'Pending' ? '2px solid #f59e0b' : undefined }}
        >
          <span aria-hidden="true" className="stat-icon amber">
            ◷
          </span>
          <div>
            <span>Chờ soát xét</span>
            <strong style={{ color: '#d97706' }}>{counts.pending}</strong>
          </div>
          <small>Cần xem xét và duyệt/từ chối</small>
        </article>

        <article
          className="stat-card"
          onClick={() => setStatusFilter('Approved')}
          style={{ cursor: 'pointer', border: statusFilter === 'Approved' ? '2px solid #10b981' : undefined }}
        >
          <span aria-hidden="true" className="stat-icon green">
            ✓
          </span>
          <div>
            <span>Đã phê duyệt</span>
            <strong style={{ color: '#16a34a' }}>{counts.approved}</strong>
          </div>
          <small>Đạt yêu cầu &amp; sẵn sàng cấp chứng chỉ</small>
        </article>

        <article
          className="stat-card"
          onClick={() => setStatusFilter('Rejected')}
          style={{ cursor: 'pointer', border: statusFilter === 'Rejected' ? '2px solid #ef4444' : undefined }}
        >
          <span aria-hidden="true" className="stat-icon red">
            ✕
          </span>
          <div>
            <span>Đã từ chối</span>
            <strong style={{ color: '#dc2626' }}>{counts.rejected}</strong>
          </div>
          <small>Yêu cầu hiệu chuẩn lại</small>
        </article>
      </div>

      {/* ─── Main Review Queue Table Panel ─────────────────────── */}
      <section className="reviewer-card">
        <div className="reviewer-card-heading">
          <div>
            <h2>Danh sách hồ sơ hiệu chuẩn (CalibrationRecord)</h2>
            <p>
              Đối chiếu quy trình, môi trường, chuẩn đối chứng và từng điểm đo (MeasurementDetail) để quyết định Approve hoặc Reject.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="queue-counter" style={{ background: statusFilter === 'Pending' ? '#fff5e4' : '#eff6ff', color: statusFilter === 'Pending' ? '#92661d' : '#1d4ed8' }}>
              {filteredRecords.length} hồ sơ hiển thị
            </span>
            <button
              className="button button-secondary button-compact"
              onClick={loadReviewQueue}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title="Tải lại hàng chờ từ máy chủ"
              type="button"
            >
              <span>↻</span> Làm mới
            </button>
          </div>
        </div>

        {/* Filter Chips / Tabs */}
        <div style={{ display: 'flex', gap: '8px', padding: '0 20px 14px', borderBottom: '1px solid #edf1f4', flexWrap: 'wrap' }}>
          {[
            ['Pending', `⏳ Chờ soát xét (${counts.pending})`],
            ['Approved', `✓ Đã duyệt (${counts.approved})`],
            ['Rejected', `✕ Đã từ chối (${counts.rejected})`],
            ['all', `Tất cả (${counts.total})`],
          ].map(([val, label]) => (
            <button
              className={`filter-chip ${statusFilter === val ? 'active' : ''}`}
              key={val}
              onClick={() => setStatusFilter(val)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 600,
                border: statusFilter === val ? '1px solid #0284c7' : '1px solid #cbd5e1',
                background: statusFilter === val ? '#e0f2fe' : '#ffffff',
                color: statusFilter === val ? '#0369a1' : '#475569',
                cursor: 'pointer',
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Loading / Error States */}
        {loadingRecords ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            Đang tải dữ liệu hồ sơ hiệu chuẩn từ máy chủ...
          </div>
        ) : recordsError ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#dc2626' }}>
            <p>{recordsError}</p>
            <button
              className="button button-secondary button-compact"
              onClick={loadReviewQueue}
              style={{ marginTop: '8px' }}
              type="button"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: 'id',
                label: 'Mã hồ sơ',
                render: (row) => (
                  <div>
                    <strong style={{ color: '#0369a1' }}>{row.id}</strong>
                    {row.work_order_code && (
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {row.work_order_code}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'device',
                label: 'Thiết bị & Serial',
                render: (row) => (
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block' }}>
                      {row.device_name || row.device}
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {row.model ? `Model: ${row.model} · ` : ''}
                      {row.serial ? `SN: ${row.serial}` : ''}
                    </span>
                  </div>
                ),
              },
              {
                key: 'customer',
                label: 'Khách hàng',
                render: (row) => (
                  <span style={{ fontWeight: 600, color: '#334155' }}>{row.customer}</span>
                ),
              },
              {
                key: 'technician',
                label: 'Kỹ thuật viên',
                render: (row) => (
                  <div>
                    <span>{row.technician}</span>
                    {row.technician_phone && (
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                        📞 {row.technician_phone}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'procedure',
                label: 'Quy trình & Chuẩn',
                render: (row) => (
                  <div>
                    <span style={{ display: 'block', color: '#0f172a' }}>{row.procedure}</span>
                    {row.standard && (
                      <small style={{ color: '#0284c7', fontSize: '0.67rem' }}>
                        Chuẩn: {row.standard}
                      </small>
                    )}
                  </div>
                ),
              },
              {
                key: 'environmentStatus',
                label: 'Môi trường',
                render: (row) => (
                  <div>
                    <StatusPill>{row.environmentStatus}</StatusPill>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
                      {row.environment}
                    </div>
                  </div>
                ),
              },
              {
                key: 'result_status',
                label: 'Kết quả đo',
                render: (row) => (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background: row.result_status === 'Pass' ? '#dcfce7' : '#fee2e2',
                      color: row.result_status === 'Pass' ? '#15803d' : '#b91c1c',
                      display: 'inline-block',
                    }}
                  >
                    ● {row.result_status === 'Pass' ? 'Đạt (Pass)' : 'Không đạt (Fail)'}
                  </span>
                ),
              },
              {
                key: 'status',
                label: 'Trạng thái',
                render: (row) => (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      background:
                        row.status === 'Approved'
                          ? '#dcfce7'
                          : row.status === 'Rejected'
                          ? '#fee2e2'
                          : '#fef3c7',
                      color:
                        row.status === 'Approved'
                          ? '#166534'
                          : row.status === 'Rejected'
                          ? '#991b1b'
                          : '#92400e',
                      display: 'inline-block',
                    }}
                  >
                    {row.status === 'Approved'
                      ? '✓ Đã duyệt'
                      : row.status === 'Rejected'
                      ? '✕ Từ chối'
                      : '⏳ Chờ soát xét'}
                  </span>
                ),
              },
              {
                key: 'submittedAt',
                label: 'Trình lúc',
                render: (row) => (
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {row.submittedAt}
                  </span>
                ),
              },
              {
                key: 'action',
                label: 'Thao tác',
                render: (row) => (
                  <button
                    className={`button ${row.status === 'Pending' ? 'button-primary' : 'button-secondary'} button-compact`}
                    onClick={() => setModal({ type: 'review', record: row })}
                    style={{ whiteSpace: 'nowrap' }}
                    type="button"
                  >
                    {row.status === 'Pending' ? 'Soát xét' : 'Xem chi tiết'}
                  </button>
                ),
              },
            ]}
            empty="Không tìm thấy hồ sơ hiệu chuẩn nào phù hợp."
            rows={filteredRecords}
          />
        )}

        <p className="mock-note">
          <strong>Lưu ý:</strong> Khi Approve hoặc Reject, hệ thống sẽ tự động ghi nhận vào bảng <code>review_logs</code> để phục vụ đối soát ISO/IEC 17025. Trường hợp Reject bắt buộc phải nhập lý do và bản ghi gốc được lưu giữ nguyên trạng (audit trail).
        </p>
      </section>
    </ReviewerPageShell>
  );
}

export default ReviewQueuePage;
