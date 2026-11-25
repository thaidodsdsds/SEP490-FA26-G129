import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import { extractApiErrorMessage, getServiceRequestsApi } from '../../../services/service-request-service.js';
import ServiceRequestCancelModal from './components/ServiceRequestCancelModal.jsx';
import ServiceRequestEditModal from './components/ServiceRequestEditModal.jsx';
import ServiceRequestStatusBadge from './components/ServiceRequestStatusBadge.jsx';
import './service-requests-manage.css';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return String(dateString).slice(0, 10);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(dateString);
  }
};

const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

function CustomerServiceRequestListPage({ role = 'customer' }) {
  const navigate = useNavigate();
  const isSales = role === 'sales';

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');

  // Modals state
  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [editModalItem, setEditModalItem] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getServiceRequestsApi();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Không thể tải danh sách phiếu yêu cầu dịch vụ.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const showToast = (message) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // KPI calculations
  const stats = useMemo(() => {
    const total = requests.length;
    const newCount = requests.filter((r) => r.status === 'New').length;
    const quotedCount = requests.filter((r) => r.status === 'Quoted').length;
    const inProgressCount = requests.filter((r) => ['Confirmed', 'InProgress'].includes(r.status)).length;
    const completedCount = requests.filter((r) => r.status === 'Completed').length;
    const cancelledCount = requests.filter((r) => r.status === 'Cancelled').length;

    return { total, newCount, quotedCount, inProgressCount, completedCount, cancelledCount };
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'IN_PROGRESS') {
          if (!['Confirmed', 'InProgress'].includes(req.status)) return false;
        } else if (req.status !== statusFilter) {
          return false;
        }
      }

      // Location filter
      if (locationFilter !== 'ALL' && req.location_type !== locationFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const code = (req.request_code || '').toLowerCase();
        const company = (req.customer?.company_name || '').toLowerCase();
        const itemsText = (req.items || [])
          .map((i) => `${i.device_name || ''} ${i.service_type_name || ''}`)
          .join(' ')
          .toLowerCase();

        if (!code.includes(term) && !company.includes(term) && !itemsText.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [requests, statusFilter, locationFilter, searchTerm]);

  const handleCancelSuccess = (updated) => {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
    showToast(`Đã hủy thành công phiếu yêu cầu ${updated.request_code || `#${updated.id}`}`);
  };

  const handleEditSuccess = (updated) => {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
    showToast(`Đã cập nhật phiếu yêu cầu ${updated.request_code || `#${updated.id}`}`);
  };

  const detailBasePath = isSales ? '/internal/sales/service-requests' : '/internal/customer/service-requests';
  const newRequestPath = isSales ? '/internal/sales/service-requests/new' : '/internal/customer/service-requests/new';

  return (
    <div className="sr-manage-page">
      <PageHeader
        actions={(
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="button button-secondary"
              disabled={loading}
              onClick={fetchRequests}
              type="button"
            >
              ↻ Tải lại
            </button>
            <Link className="button button-primary" to={newRequestPath}>
              + Tạo yêu cầu mới
            </Link>
          </div>
        )}
        description={
          isSales
            ? 'Theo dõi, thẩm định và phát hành báo giá các yêu cầu hiệu chuẩn từ khách hàng toàn hệ thống.'
            : 'Danh sách và trạng thái các phiếu gửi mẫu hiệu chuẩn, thử nghiệm thiết bị của doanh nghiệp.'
        }
        eyebrow={isSales ? 'QUẢN LÝ KINH DOANH' : 'DỊCH VỤ CỦA TÔI'}
        title="Danh sách phiếu yêu cầu dịch vụ"
      />

      {successToast && (
        <div className="csr-receipt-card" style={{ marginBottom: '16px' }}>
          <div className="csr-receipt-icon">✓</div>
          <div className="csr-receipt-body">
            <strong>Thông báo:</strong> {successToast}
          </div>
        </div>
      )}

      {error && <div className="csr-inline-error" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* KPI Cards */}
      <section aria-label="Chỉ số yêu cầu" className="sr-stat-grid">
        <button
          className={`sr-stat-card ${statusFilter === 'ALL' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('ALL')}
          type="button"
        >
          <span className="sr-stat-label">Tất cả yêu cầu</span>
          <span className="sr-stat-value">{stats.total}</span>
          <span className="sr-stat-desc">Toàn bộ hồ sơ</span>
        </button>

        <button
          className={`sr-stat-card ${statusFilter === 'New' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('New')}
          type="button"
        >
          <span className="sr-stat-label">Mới tiếp nhận</span>
          <span className="sr-stat-value" style={{ color: '#057a55' }}>{stats.newCount}</span>
          <span className="sr-stat-desc">Chờ xử lý báo giá</span>
        </button>

        <button
          className={`sr-stat-card ${statusFilter === 'Quoted' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('Quoted')}
          type="button"
        >
          <span className="sr-stat-label">Đã báo giá</span>
          <span className="sr-stat-value" style={{ color: '#b06000' }}>{stats.quotedCount}</span>
          <span className="sr-stat-desc">Chờ khách xác nhận</span>
        </button>

        <button
          className={`sr-stat-card ${statusFilter === 'IN_PROGRESS' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('IN_PROGRESS')}
          type="button"
        >
          <span className="sr-stat-label">Đang thực hiện</span>
          <span className="sr-stat-value" style={{ color: '#1a56db' }}>{stats.inProgressCount}</span>
          <span className="sr-stat-desc">Hiệu chuẩn & kiểm tra</span>
        </button>

        <button
          className={`sr-stat-card ${statusFilter === 'Completed' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('Completed')}
          type="button"
        >
          <span className="sr-stat-label">Hoàn thành</span>
          <span className="sr-stat-value" style={{ color: '#03543f' }}>{stats.completedCount}</span>
          <span className="sr-stat-desc">Đã cấp chứng nhận</span>
        </button>

        <button
          className={`sr-stat-card ${statusFilter === 'Cancelled' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('Cancelled')}
          type="button"
        >
          <span className="sr-stat-label">Đã hủy</span>
          <span className="sr-stat-value" style={{ color: '#c5221f' }}>{stats.cancelledCount}</span>
          <span className="sr-stat-desc">Đơn đã dừng</span>
        </button>
      </section>

      {/* Toolbar & Filters */}
      <div className="sr-toolbar">
        <div className="sr-search-group">
          <span className="sr-search-icon" aria-hidden="true">🔍</span>
          <input
            className="sr-search-input"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              isSales
                ? 'Tìm mã đơn (SR-...), công ty, thiết bị...'
                : 'Tìm mã yêu cầu (SR-...), thiết bị...'
            }
            type="text"
            value={searchTerm}
          />
        </div>

        <div className="sr-filter-group">
          <select
            className="sr-select"
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="New">Mới tiếp nhận (New)</option>
            <option value="Quoted">Đã báo giá (Quoted)</option>
            <option value="IN_PROGRESS">Đang xử lý (Confirmed / InProgress)</option>
            <option value="Completed">Hoàn thành (Completed)</option>
            <option value="Cancelled">Đã hủy (Cancelled)</option>
          </select>

          <select
            className="sr-select"
            onChange={(e) => setLocationFilter(e.target.value)}
            value={locationFilter}
          >
            <option value="ALL">Tất cả hình thức</option>
            <option value="In-lab">Tại phòng Lab (In-lab)</option>
            <option value="On-site">Tận nơi (On-site)</option>
          </select>

          {(searchTerm || statusFilter !== 'ALL' || locationFilter !== 'ALL') && (
            <button
              className="button button-secondary"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setLocationFilter('ALL');
              }}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              type="button"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="sr-table-card">
        {loading ? (
          <div className="sr-empty-state">
            <div className="csr-company-icon" style={{ margin: '0 auto 12px' }}>⏳</div>
            <h3>Đang tải danh sách yêu cầu dịch vụ...</h3>
            <p>Vui lòng đợi hệ thống kiểm tra dữ liệu.</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="sr-empty-state">
            <div className="sr-empty-icon" aria-hidden="true">📋</div>
            <h3>Không tìm thấy phiếu yêu cầu dịch vụ nào</h3>
            <p>
              {searchTerm || statusFilter !== 'ALL' || locationFilter !== 'ALL'
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc đang chọn.'
                : 'Hiện chưa có đơn dịch vụ nào được ghi nhận trên hệ thống.'}
            </p>
            <Link className="button button-primary" to={newRequestPath}>
              + Tạo phiếu yêu cầu đầu tiên
            </Link>
          </div>
        ) : (
          <div className="sr-table-wrapper">
            <table className="sr-table">
              <thead>
                <tr>
                  <th>Mã yêu cầu</th>
                  {isSales && <th>Khách hàng</th>}
                  <th>Hình thức</th>
                  <th>Ngày dự kiến</th>
                  <th>Hạng mục thiết bị</th>
                  <th>Báo giá</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((req) => {
                  const itemCount = Array.isArray(req.items) ? req.items.length : 0;
                  const itemPreview = Array.isArray(req.items) && req.items.length > 0
                    ? req.items.map((i) => i.device_name).filter(Boolean).slice(0, 2).join(', ')
                    : 'Chưa có thiết bị';

                  const canEdit = req.status === 'New';
                  const canCancel = ['New', 'Quoted'].includes(req.status);
                  const quotation = req.latest_quotation;

                  return (
                    <tr key={req.id}>
                      <td>
                        <Link className="sr-code-link" to={`${detailBasePath}/${req.id}`}>
                          {req.request_code || `SR-2026-${String(req.id).padStart(3, '0')}`}
                        </Link>
                      </td>

                      {isSales && (
                        <td>
                          <strong>{req.customer?.company_name || '—'}</strong>
                          {req.customer?.tax_code && (
                            <div style={{ fontSize: '0.74rem', color: '#687f92' }}>
                              MST: {req.customer.tax_code}
                            </div>
                          )}
                        </td>
                      )}

                      <td>
                        <span className={`sr-location-badge ${req.location_type === 'On-site' ? 'sr-location-badge--onsite' : ''}`}>
                          {req.location_type === 'On-site' ? '⌖ On-site' : '⚲ In-lab'}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                          {formatDate(req.preferred_date)}
                        </span>
                      </td>

                      <td>
                        <div className="sr-items-summary">
                          <strong>{itemCount} thiết bị</strong>
                          <small title={itemPreview}>{itemPreview}</small>
                        </div>
                      </td>

                      <td>
                        {quotation ? (
                          <div style={{ fontSize: '0.82rem' }}>
                            <strong style={{ color: '#237804' }}>{formatCurrency(quotation.total_amount)}</strong>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {quotation.quotation_code || `QT-${quotation.id}`}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#8c9ba5', fontSize: '0.78rem' }}>Chưa báo giá</span>
                        )}
                      </td>

                      <td>
                        <ServiceRequestStatusBadge status={req.status} />
                      </td>

                      <td style={{ color: '#627686', fontSize: '0.8rem' }}>
                        {formatDate(req.created_at)}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="sr-actions-cell" style={{ justifyContent: 'flex-end' }}>
                          <Link
                            className="sr-btn-action"
                            title="Xem chi tiết"
                            to={`${detailBasePath}/${req.id}`}
                          >
                            Chi tiết
                          </Link>

                          {isSales && req.status === 'New' && (
                            <Link
                              className="sr-btn-action sr-btn-action--quote"
                              title="Tạo báo giá cho đơn này"
                              to={`/internal/sales/quotations?requestId=${req.id}`}
                            >
                              ₫ Báo giá
                            </Link>
                          )}

                          {canEdit && (
                            <button
                              className="sr-btn-action"
                              onClick={() => setEditModalItem(req)}
                              title="Chỉnh sửa yêu cầu"
                              type="button"
                            >
                              Sửa
                            </button>
                          )}

                          {canCancel && (
                            <button
                              className="sr-btn-action sr-btn-action--danger"
                              onClick={() => setCancelModalItem(req)}
                              title="Hủy phiếu yêu cầu"
                              type="button"
                            >
                              Hủy
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      <ServiceRequestCancelModal
        isOpen={Boolean(cancelModalItem)}
        onClose={() => setCancelModalItem(null)}
        onSuccess={handleCancelSuccess}
        serviceRequest={cancelModalItem}
      />

      {/* Edit Modal */}
      <ServiceRequestEditModal
        isOpen={Boolean(editModalItem)}
        onClose={() => setEditModalItem(null)}
        onSuccess={handleEditSuccess}
        serviceRequest={editModalItem}
      />
    </div>
  );
}

export default CustomerServiceRequestListPage;

