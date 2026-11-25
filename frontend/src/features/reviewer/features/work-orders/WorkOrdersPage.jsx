import { useEffect, useState, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import {
  getWorkOrdersApi,
} from '../../../../services/work-order-service.js';

const STATUS_LABELS = {
  Open: 'Chờ phân công',
  Assigned: 'Đã phân công',
  InProgress: 'Đang đo kiểm',
  Done: 'Hoàn thành',
  Cancelled: 'Đã hủy',
};

function WorkOrdersPage() {
  const navigate = useNavigate();
  const { normalizedQuery, query, setQuery, feedback, setFeedback } = useReviewerWorkspace();
  const [isPending, startTransition] = useTransition();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workOrders, setWorkOrders] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    assigned: 0,
    in_progress: 0,
    done: 0,
    cancelled: 0,
  });

  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchWorkOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWorkOrdersApi({
        search: query.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        location_type: locationFilter !== 'all' ? locationFilter : undefined,
      });
      setWorkOrders(data.items || []);
      setSummary(data.summary || {});
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Không thể tải danh sách Work Order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, [statusFilter, locationFilter]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWorkOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const formatCode = (id) => `WO-2026-${String(id).padStart(3, '0')}`;

  const columns = [
    {
      key: 'work_order_code',
      label: 'Mã Work Order',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <button
            className="text-action"
            onClick={() => setSelectedOrder(row)}
            style={{ fontWeight: 700, fontSize: '0.8rem', textAlign: 'left' }}
            type="button"
          >
            {row.work_order_code}
          </button>
          <span style={{ fontSize: '0.66rem', color: '#8898aa' }}>
            Tạo: {new Date(row.created_at).toLocaleDateString('vi-VN')}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Khách hàng',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1f2d3d' }}>{row.customer.name}</div>
          {row.customer.tax_code && (
            <div style={{ fontSize: '0.67rem', color: '#687787' }}>MST: {row.customer.tax_code}</div>
          )}
        </div>
      ),
    },
    {
      key: 'devices',
      label: 'Thiết bị & Quy trình áp dụng',
      render: (row) => (
        <div style={{ maxWidth: '280px' }}>
          <div style={{ fontWeight: 600, color: '#2b3f56' }}>
            {row.devices[0]?.name || 'Thiết bị đo lường'}
            {row.devices_count > 1 && (
              <span
                style={{
                  marginLeft: '6px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: '#e9f1fa',
                  color: '#1a56a0',
                  fontSize: '0.64rem',
                  fontWeight: 700,
                }}
              >
                +{row.devices_count - 1} thiết bị
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.67rem', color: '#7c8b9a', marginTop: '2px' }}>
            {row.devices[0]?.model ? `Model: ${row.devices[0].model} · ` : ''}
            Quy trình: {row.reviewer_info.procedure_summary}
          </div>
        </div>
      ),
    },
    {
      key: 'location_type',
      label: 'Hình thức',
      render: (row) => (
        <span
          style={{
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '0.67rem',
            fontWeight: 700,
            background: row.location_type === 'In-lab' ? '#eef7ee' : '#fdf3e7',
            color: row.location_type === 'In-lab' ? '#2e7d32' : '#b25e09',
            border: `1px solid ${row.location_type === 'In-lab' ? '#c8e6c9' : '#ffe0b2'}`,
          }}
        >
          {row.location_type === 'In-lab' ? 'Lab ISOCAL' : 'Tại hiện trường'}
        </span>
      ),
    },
    {
      key: 'technician',
      label: 'Kỹ thuật viên phụ trách',
      render: (row) =>
        row.reviewer_info.needs_assignment ? (
          <span
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.67rem',
              fontWeight: 700,
              background: '#fff4e5',
              color: '#d97706',
              border: '1px solid #fed7aa',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Chờ chỉ định KTV
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#e2e8f0',
                color: '#334155',
                fontSize: '0.62rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              KTV
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1e293b' }}>
              {row.reviewer_info.assigned_technician || 'Chưa chỉ định'}
            </span>
          </div>
        ),
    },
    {
      key: 'due_date',
      label: 'Hạn hoàn thành (SLA)',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#334155' }}>
            {row.due_date ? new Date(row.due_date).toLocaleDateString('vi-VN') : '—'}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#8898aa' }}>
            Ưu tiên: {row.reviewer_info.priority}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => <StatusPill>{STATUS_LABELS[row.status] || row.status}</StatusPill>,
    },
    {
      key: 'action',
      label: 'Thao tác',
      render: (row) => (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            className="small-action"
            onClick={() => setSelectedOrder(row)}
            type="button"
          >
            Chi tiết
          </button>
        </div>
      ),
    },
  ];

  return (
    <ReviewerPageShell
      description="Giám sát tiến độ lệnh hiệu chuẩn, danh mục thiết bị, quy trình chuẩn và phân công kỹ thuật viên."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      onSearchChange={setQuery}
      query={query}
      title="Quản lý Lệnh thực hiện (Work Orders)"
    >
      {/* ─── Metric Cards ────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div
          onClick={() => setStatusFilter('all')}
          style={{
            background: '#ffffff',
            border: `1.5px solid ${statusFilter === 'all' ? '#2563eb' : '#e2e8f0'}`,
            borderRadius: '12px',
            padding: '14px 18px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: statusFilter === 'all' ? '0 4px 12px rgba(37,99,235,0.12)' : 'none',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>TỔNG SỐ LỆNH</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
            {summary.total}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>Tất cả lệnh trong hệ thống</div>
        </div>

        <div
          onClick={() => setStatusFilter('Open')}
          style={{
            background: '#ffffff',
            border: `1.5px solid ${statusFilter === 'Open' ? '#f59e0b' : '#e2e8f0'}`,
            borderRadius: '12px',
            padding: '14px 18px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: statusFilter === 'Open' ? '0 4px 12px rgba(245,158,11,0.15)' : 'none',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 700 }}>CHỜ PHÂN CÔNG (OPEN)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>
            {summary.open}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#d97706', marginTop: '4px' }}>Cần xếp lịch KTV</div>
        </div>

        <div
          onClick={() => setStatusFilter('InProgress')}
          style={{
            background: '#ffffff',
            border: `1.5px solid ${statusFilter === 'InProgress' ? '#0284c7' : '#e2e8f0'}`,
            borderRadius: '12px',
            padding: '14px 18px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: statusFilter === 'InProgress' ? '0 4px 12px rgba(2,132,199,0.15)' : 'none',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 700 }}>ĐANG ĐO KIỂM (IN PROGRESS)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0369a1', marginTop: '2px' }}>
            {summary.in_progress}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#0284c7', marginTop: '4px' }}>KTV đang thực hiện trong Lab</div>
        </div>

        <div
          onClick={() => setStatusFilter('Done')}
          style={{
            background: '#ffffff',
            border: `1.5px solid ${statusFilter === 'Done' ? '#16a34a' : '#e2e8f0'}`,
            borderRadius: '12px',
            padding: '14px 18px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: statusFilter === 'Done' ? '0 4px 12px rgba(22,163,74,0.15)' : 'none',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>HOÀN THÀNH (DONE)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
            {summary.done}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#16a34a', marginTop: '4px' }}>Sẵn sàng trả thiết bị</div>
        </div>
      </div>

      {/* ─── Main Reviewer Card ───────────────────────────────────── */}
      <section className="reviewer-card">
        <div className="reviewer-card-heading">
          <div>
            <h2>Danh sách Work Order kỹ thuật</h2>
            <p>Kiểm soát quy trình hiệu chuẩn, thông số thiết bị và tiến độ thực tế</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              aria-label="Lọc theo hình thức"
              onChange={(e) => setLocationFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.75rem',
                background: '#fff',
                color: '#334155',
                fontWeight: 600,
              }}
              value={locationFilter}
            >
              <option value="all">Tất cả hình thức</option>
              <option value="In-lab">Tại phòng Lab (In-lab)</option>
              <option value="On-site">Tại hiện trường (On-site)</option>
            </select>

            <button
              className="small-action"
              onClick={() => navigate('/internal/head-of-tech/assignments')}
              style={{
                background: '#1e293b',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                padding: '7px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              type="button"
            >
              <span>↗</span> Sang Phân công thiết bị
            </button>
          </div>
        </div>

        {/* Filter Badges Bar */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '0 20px 14px',
            borderBottom: '1px solid #edf1f4',
            overflowX: 'auto',
          }}
        >
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'Open', label: 'Chờ phân công' },
            { key: 'Assigned', label: 'Đã phân công' },
            { key: 'InProgress', label: 'Đang đo kiểm' },
            { key: 'Done', label: 'Hoàn thành' },
            { key: 'Cancelled', label: 'Đã hủy' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.72rem',
                fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                background: statusFilter === tab.key ? '#1e293b' : '#f8fafc',
                color: statusFilter === tab.key ? '#ffffff' : '#64748b',
                borderColor: statusFilter === tab.key ? '#1e293b' : '#e2e8f0',
                transition: 'all 0.12s ease',
              }}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            Đang tải danh sách Work Order...
          </div>
        ) : error ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#ef4444', fontSize: '0.85rem' }}>
            {error}
            <div style={{ marginTop: '10px' }}>
              <button className="small-action" onClick={fetchWorkOrders} type="button">
                Thử lại
              </button>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            empty="Không tìm thấy Work Order nào phù hợp với bộ lọc."
            rows={workOrders}
          />
        )}
      </section>

      {/* ─── Detail Drawer / Modal for Reviewer ───────────────────── */}
      {selectedOrder && (
        <div
          onClick={() => setSelectedOrder(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              padding: '24px 28px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '14px',
                marginBottom: '18px',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#64748b',
                    letterSpacing: '0.05em',
                  }}
                >
                  HỒ SƠ LỆNH THỰC HIỆN KỸ THUẬT
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedOrder.work_order_code} · {selectedOrder.customer.name}
                </h3>
              </div>
              <button
                aria-label="Đóng"
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: '#475569',
                }}
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Quick Status Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Trạng thái hiện tại:</span>
                <StatusPill>{STATUS_LABELS[selectedOrder.status] || selectedOrder.status}</StatusPill>
              </div>
            </div>

            {/* Technical Specifications */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', color: '#1e293b', fontWeight: 700 }}>
                Danh sách thiết bị đo lường & Quy trình hiệu chuẩn ({selectedOrder.devices.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedOrder.devices.map((dev, idx) => (
                  <div
                    key={dev.id || idx}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ fontSize: '0.82rem', color: '#1e293b' }}>
                        {idx + 1}. {dev.name}
                      </strong>
                      <span
                        style={{
                          fontSize: '0.67rem',
                          background: '#e0f2fe',
                          color: '#0369a1',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {dev.service_kind || 'Calibration'}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '6px 14px',
                        marginTop: '8px',
                        fontSize: '0.72rem',
                        color: '#64748b',
                      }}
                    >
                      <div><strong>Model:</strong> {dev.model || 'Chưa có'}</div>
                      <div><strong>Số chế tạo (Serial):</strong> {dev.serial_number || 'Chưa có'}</div>
                      <div><strong>Hãng SX:</strong> {dev.manufacturer || 'ISOCAL Partner'}</div>
                      <div><strong>Mã nội bộ:</strong> {dev.internal_code || `TB-${dev.id}`}</div>
                      <div><strong>Dịch vụ:</strong> {dev.service_name}</div>
                      <div><strong>Quy trình chuẩn:</strong> {dev.procedure_code || 'CAL-GEN-01'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* General Coordination Info */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                background: '#f8fafc',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '0.75rem',
                color: '#475569',
                marginBottom: '20px',
              }}
            >
              <div>
                <strong>Hình thức thực hiện:</strong>{' '}
                {selectedOrder.location_type === 'In-lab' ? 'Tại phòng Lab ISOCAL' : 'Tại hiện trường'}
              </div>
              <div>
                <strong>KTV phụ trách:</strong>{' '}
                {selectedOrder.reviewer_info.assigned_technician || 'Chưa chỉ định'}
              </div>
              <div>
                <strong>Ngày tạo lệnh:</strong>{' '}
                {new Date(selectedOrder.created_at).toLocaleDateString('vi-VN')}
              </div>
              <div>
                <strong>Hạn hoàn thành SLA:</strong>{' '}
                {selectedOrder.due_date
                  ? new Date(selectedOrder.due_date).toLocaleDateString('vi-VN')
                  : 'Tiêu chuẩn 7 ngày'}
              </div>
              {selectedOrder.contract && (
                <div>
                  <strong>Hợp đồng liên quan:</strong> {selectedOrder.contract.code}
                </div>
              )}
              {selectedOrder.quotation && (
                <div>
                  <strong>Báo giá liên quan:</strong> {selectedOrder.quotation.code}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="small-action"
                onClick={() => setSelectedOrder(null)}
                style={{ padding: '8px 16px' }}
                type="button"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  navigate('/internal/head-of-tech/assignments');
                }}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                type="button"
              >
                Chuyển sang Phân công KTV ↗
              </button>
            </div>
          </div>
        </div>
      )}
    </ReviewerPageShell>
  );
}

export default WorkOrdersPage;
