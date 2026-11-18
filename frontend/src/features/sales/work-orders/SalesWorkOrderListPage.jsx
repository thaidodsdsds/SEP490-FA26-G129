import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getWorkOrdersApi } from '../../../services/work-order-service.js';
import './sales-work-orders.css';

const STATUS_CONFIG = {
  Open: {
    label: 'Chờ điều phối',
    badgeClass: 'sales-wo-badge-open',
    dot: '●',
  },
  Assigned: {
    label: 'Đã phân công KTV',
    badgeClass: 'sales-wo-badge-assigned',
    dot: '●',
  },
  InProgress: {
    label: 'Đang đo kiểm trong Lab',
    badgeClass: 'sales-wo-badge-inprogress',
    dot: '●',
  },
  Done: {
    label: 'Hoàn thành kỹ thuật',
    badgeClass: 'sales-wo-badge-done',
    dot: '✓',
  },
  Cancelled: {
    label: 'Đã hủy',
    badgeClass: 'sales-wo-badge-cancelled',
    dot: '✕',
  },
};

const formatCurrency = (val) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

function SalesWorkOrderListPage() {
  const navigate = useNavigate();

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

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchWorkOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWorkOrdersApi({
        search: search.trim() || undefined,
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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWorkOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Calculate total revenue tracked
  const totalRevenue = useMemo(() => {
    return workOrders.reduce((sum, item) => sum + (item.sales_info?.revenue_amount || 0), 0);
  }, [workOrders]);

  return (
    <div className="sales-wo-page">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="sales-wo-header">
        <div>
          <h1>Lệnh thực hiện (Work Orders)</h1>
          <p>
            Theo dõi tiến độ đo kiểm thực tế, kiểm soát ngày hẹn trả thiết bị cho khách hàng và chuẩn bị bàn giao - thanh toán.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="sales-wo-action-btn"
            onClick={fetchWorkOrders}
            title="Làm mới dữ liệu"
            type="button"
          >
            <span>↻</span> Làm mới
          </button>
          <Link
            className="sales-wo-action-btn"
            style={{ background: '#2563eb', color: '#ffffff', borderColor: '#2563eb' }}
            to="/internal/sales/contracts"
          >
            <span>▤</span> Quản lý Hợp đồng
          </Link>
        </div>
      </div>

      {/* ─── Metric Cards ──────────────────────────────────────── */}
      <div className="sales-wo-metrics">
        <div
          className={`sales-wo-metric-card ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          <div className="sales-wo-metric-label">TỔNG LỆNH THEO DÕI</div>
          <div className="sales-wo-metric-val">{summary.total}</div>
          <div className="sales-wo-metric-desc">Tất cả lệnh dịch vụ của khách hàng</div>
        </div>

        <div
          className={`sales-wo-metric-card ${statusFilter === 'InProgress' ? 'active' : ''}`}
          onClick={() => setStatusFilter('InProgress')}
        >
          <div className="sales-wo-metric-label" style={{ color: '#0284c7' }}>
            ĐANG ĐO KIỂM KỸ THUẬT
          </div>
          <div className="sales-wo-metric-val" style={{ color: '#0369a1' }}>
            {summary.in_progress + summary.assigned}
          </div>
          <div className="sales-wo-metric-desc">Phòng Lab đang thực hiện đo kiểm</div>
        </div>

        <div
          className={`sales-wo-metric-card ${statusFilter === 'Done' ? 'active' : ''}`}
          onClick={() => setStatusFilter('Done')}
        >
          <div className="sales-wo-metric-label" style={{ color: '#16a34a' }}>
            SẴN SÀNG BÀN GIAO
          </div>
          <div className="sales-wo-metric-val" style={{ color: '#15803d' }}>
            {summary.done}
          </div>
          <div className="sales-wo-metric-desc">Đã xong · Xuất chứng chỉ & nghiệm thu</div>
        </div>

        <div className="sales-wo-metric-card" style={{ cursor: 'default' }}>
          <div className="sales-wo-metric-label" style={{ color: '#7c3aed' }}>
            TỔNG GIÁ TRỊ THEO DÕI
          </div>
          <div className="sales-wo-metric-val" style={{ color: '#6d28d9', fontSize: '1.4rem' }}>
            {formatCurrency(totalRevenue)}
          </div>
          <div className="sales-wo-metric-desc">Doanh số gắn liền với các lệnh</div>
        </div>
      </div>

      {/* ─── Filter Bar ───────────────────────────────────────── */}
      <div className="sales-wo-filter-bar">
        <div className="sales-wo-search-wrap">
          <span className="sales-wo-search-icon" aria-hidden="true">
            ⌕
          </span>
          <input
            className="sales-wo-search-input"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã WO, tên khách hàng, mã HĐ, tên thiết bị, serial..."
            type="search"
            value={search}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            className="sales-wo-filter-select"
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Open">Chờ điều phối (Open)</option>
            <option value="Assigned">Đã phân công (Assigned)</option>
            <option value="InProgress">Đang đo kiểm (InProgress)</option>
            <option value="Done">Hoàn thành (Done)</option>
            <option value="Cancelled">Đã hủy (Cancelled)</option>
          </select>

          <select
            className="sales-wo-filter-select"
            onChange={(e) => setLocationFilter(e.target.value)}
            value={locationFilter}
          >
            <option value="all">Tất cả địa điểm</option>
            <option value="In-lab">Tại phòng Lab ISOCAL</option>
            <option value="On-site">Tại hiện trường khách hàng</option>
          </select>
        </div>
      </div>

      {/* ─── Table ────────────────────────────────────────────── */}
      <div className="sales-wo-table-card">
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            Đang tải danh sách Lệnh thực hiện...
          </div>
        ) : error ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#dc2626' }}>
            {error}
            <div style={{ marginTop: '12px' }}>
              <button className="sales-wo-action-btn" onClick={fetchWorkOrders} type="button">
                Thử lại
              </button>
            </div>
          </div>
        ) : workOrders.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            Không tìm thấy Work Order nào phù hợp với bộ lọc tìm kiếm.
          </div>
        ) : (
          <div className="sales-wo-table-wrap">
            <table className="sales-wo-table">
              <thead>
                <tr>
                  <th>Mã Work Order</th>
                  <th>Khách hàng & Liên hệ</th>
                  <th>Hợp đồng & Báo giá</th>
                  <th>Giá trị đơn (VNĐ)</th>
                  <th>Địa điểm & Thiết bị</th>
                  <th>Tiến độ thương mại</th>
                  <th>Hẹn trả thiết bị</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.map((row) => {
                  const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.Open;
                  return (
                    <tr key={row.id}>
                      {/* Work Order Code */}
                      <td>
                        <button
                          className="sales-wo-link"
                          onClick={() => setSelectedOrder(row)}
                          title="Bấm xem chi tiết Work Order"
                          type="button"
                        >
                          {row.work_order_code}
                        </button>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px' }}>
                          Tạo: {new Date(row.created_at).toLocaleDateString('vi-VN')}
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#1e293b' }}>{row.customer.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                          {row.customer.tax_code ? `MST: ${row.customer.tax_code}` : 'Khách hàng thân thiết'}
                          {row.customer.phone ? ` · SĐT: ${row.customer.phone}` : ''}
                        </div>
                      </td>

                      {/* Contract & Quotation Links */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {row.contract ? (
                            <Link
                              className="sales-wo-link"
                              style={{ fontSize: '0.78rem' }}
                              to={`/internal/sales/contracts/${row.contract.id}`}
                            >
                              📄 {row.contract.code}
                            </Link>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Chưa ký HĐ</span>
                          )}

                          {row.quotation && (
                            <Link
                              className="sales-wo-link"
                              style={{ fontSize: '0.74rem', color: '#475569' }}
                              to={`/internal/sales/quotations/${row.quotation.id}`}
                            >
                              ₫ {row.quotation.code}
                            </Link>
                          )}
                        </div>
                      </td>

                      {/* Revenue */}
                      <td>
                        <span style={{ fontWeight: 800, color: '#0f172a' }}>
                          {formatCurrency(row.sales_info?.revenue_amount)}
                        </span>
                      </td>

                      {/* Location & Devices */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '8px',
                              fontSize: '0.67rem',
                              fontWeight: 700,
                              background: row.location_type === 'In-lab' ? '#eef7ee' : '#fdf3e7',
                              color: row.location_type === 'In-lab' ? '#2e7d32' : '#b25e09',
                            }}
                          >
                            {row.location_type === 'In-lab' ? 'Lab ISOCAL' : 'On-site'}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>
                            {row.devices_count} thiết bị
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: '#64748b',
                            marginTop: '2px',
                            maxWidth: '220px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={row.devices_summary}
                        >
                          {row.devices_summary}
                        </div>
                      </td>

                      {/* Commercial Progress */}
                      <td>
                        <span className={`sales-wo-badge ${cfg.badgeClass}`}>
                          <span>{cfg.dot}</span> {cfg.label}
                        </span>
                        <div style={{ fontSize: '0.69rem', color: '#64748b', marginTop: '3px' }}>
                          {row.sales_info?.commercialStatus}
                        </div>
                      </td>

                      {/* Due Date */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#334155' }}>
                          {row.due_date ? new Date(row.due_date).toLocaleDateString('vi-VN') : '—'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          {row.sales_info?.handover_status}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="sales-wo-action-btn"
                          onClick={() => setSelectedOrder(row)}
                          type="button"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Sales Detail Modal ───────────────────────────────── */}
      {selectedOrder && (
        <div className="sales-wo-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="sales-wo-modal-card" onClick={(e) => e.stopPropagation()}>
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
                  THÔNG TIN KINH DOANH · WORK ORDER
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

            {/* Commercial Progress Highlight Banner */}
            <div
              style={{
                background: selectedOrder.status === 'Done' ? '#f0fdf4' : '#f8fafc',
                border: `1.5px solid ${selectedOrder.status === 'Done' ? '#86efac' : '#e2e8f0'}`,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    TIẾN ĐỘ THỰC HIỆN KỸ THUẬT
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {selectedOrder.sales_info?.commercialStatus}
                  </div>
                </div>
                <div>
                  <span
                    className={`sales-wo-badge ${
                      STATUS_CONFIG[selectedOrder.status]?.badgeClass || 'sales-wo-badge-open'
                    }`}
                    style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                  >
                    {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                  </span>
                </div>
              </div>
              <div
                style={{
                  marginTop: '10px',
                  paddingTop: '10px',
                  borderTop: '1px solid #e2e8f0',
                  fontSize: '0.75rem',
                  color: '#475569',
                  display: 'flex',
                  gap: '24px',
                }}
              >
                <div>
                  <strong>Tình trạng bàn giao:</strong> {selectedOrder.sales_info?.handover_status}
                </div>
                <div>
                  <strong>Hạn hoàn thành (SLA):</strong>{' '}
                  {selectedOrder.due_date
                    ? new Date(selectedOrder.due_date).toLocaleDateString('vi-VN')
                    : 'Tiêu chuẩn 7 ngày'}
                </div>
              </div>
            </div>

            {/* Financial & Contract Links */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '14px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px',
                  background: '#ffffff',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>HỢP ĐỒNG LIÊN QUAN</div>
                {selectedOrder.contract ? (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>
                      {selectedOrder.contract.code}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      {selectedOrder.contract.title}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <Link
                        className="sales-wo-link"
                        style={{ fontSize: '0.75rem' }}
                        to={`/internal/sales/contracts/${selectedOrder.contract.id}`}
                      >
                        Mở chi tiết Hợp đồng ↗
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                    Chưa tạo hợp đồng chính thức
                  </div>
                )}
              </div>

              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px',
                  background: '#ffffff',
                }}
              >
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>BÁO GIÁ LIÊN QUAN</div>
                {selectedOrder.quotation ? (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>
                      {selectedOrder.quotation.code}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                      Tổng tiền: <strong>{formatCurrency(selectedOrder.quotation.total_amount)}</strong>
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <Link
                        className="sales-wo-link"
                        style={{ fontSize: '0.75rem' }}
                        to={`/internal/sales/quotations/${selectedOrder.quotation.id}`}
                      >
                        Mở chi tiết Báo giá ↗
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                    Không có thông tin báo giá
                  </div>
                )}
              </div>
            </div>

            {/* Devices & Pricing List */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', color: '#1e293b', fontWeight: 700 }}>
                Hạng mục thiết bị & Giá dịch vụ ({selectedOrder.devices.length})
              </h4>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Thiết bị</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left' }}>Dịch vụ</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>SL</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.devices.map((dev, idx) => (
                      <tr key={dev.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <strong style={{ color: '#1e293b' }}>{dev.name}</strong>
                          {dev.model && (
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Model: {dev.model}</div>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{dev.service_name}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>{dev.quantity || 1}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {formatCurrency(dev.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                      <td colSpan="3" style={{ padding: '10px 12px', textAlign: 'right', color: '#334155' }}>
                        TỔNG GIÁ TRỊ DOANH THU:
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#2563eb', fontSize: '0.85rem' }}>
                        {formatCurrency(selectedOrder.sales_info?.revenue_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Customer Details */}
            <div
              style={{
                background: '#f8fafc',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                fontSize: '0.75rem',
                color: '#475569',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px 14px',
                marginBottom: '20px',
              }}
            >
              <div><strong>Đơn vị khách hàng:</strong> {selectedOrder.customer.name}</div>
              <div><strong>Mã số thuế:</strong> {selectedOrder.customer.tax_code || 'Chưa cập nhật'}</div>
              <div><strong>Địa chỉ:</strong> {selectedOrder.customer.address || 'Chưa cập nhật'}</div>
              <div><strong>Điện thoại:</strong> {selectedOrder.customer.phone || 'Chưa cập nhật'}</div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="sales-wo-action-btn"
                onClick={() => setSelectedOrder(null)}
                style={{ padding: '8px 18px' }}
                type="button"
              >
                Đóng
              </button>
              {selectedOrder.contract && (
                <button
                  onClick={() => {
                    const cId = selectedOrder.contract.id;
                    setSelectedOrder(null);
                    navigate(`/internal/sales/contracts/${cId}`);
                  }}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  type="button"
                >
                  Xem Hợp đồng liên quan ↗
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesWorkOrderListPage;

