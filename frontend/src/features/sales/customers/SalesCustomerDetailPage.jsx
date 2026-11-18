import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import Toast from '../../../components/ui/Toast.jsx';
import { getCustomerDetailApi } from '../../../services/customer-service.js';
import CustomerAccountModal from './CustomerAccountModal.jsx';
import CustomerDeviceModal from './CustomerDeviceModal.jsx';
import CustomerFormModal from './CustomerFormModal.jsx';
import './sales-customers.css';

const formatCurrency = (val) => {
  if (typeof val !== 'number' || Number.isNaN(val)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  } catch {
    return String(dateStr);
  }
};

const getQuotationStatusBadge = (status) => {
  switch (status) {
    case 'Approved':
      return <StatusBadge label="Đã cam kết (Approved)" tone="success" />;
    case 'Sent':
      return <StatusBadge label="Đã gửi khách (Sent)" tone="info" />;
    case 'Draft':
      return <StatusBadge label="Bản thảo (Draft)" tone="neutral" />;
    case 'Rejected':
      return <StatusBadge label="Từ chối (Rejected)" tone="danger" />;
    default:
      return <StatusBadge label={status || 'Draft'} tone="neutral" />;
  }
};

const getDeviceStatusBadge = (status) => {
  switch (status) {
    case 'Active':
      return <StatusBadge label="Hoạt động" tone="success" />;
    case 'ExpiringSoon':
      return <StatusBadge label="Sắp đến hạn" tone="warning" />;
    case 'Expired':
      return <StatusBadge label="Hết hạn HC" tone="danger" />;
    case 'InRepair':
      return <StatusBadge label="Đang sửa chữa" tone="info" />;
    default:
      return <StatusBadge label={status || 'Active'} tone="neutral" />;
  }
};

const getRequestStatusBadge = (status) => {
  switch (status) {
    case 'New':
      return <StatusBadge label="Mới tạo" tone="info" />;
    case 'Quoted':
      return <StatusBadge label="Đã báo giá" tone="warning" />;
    case 'Confirmed':
      return <StatusBadge label="Đã xác nhận" tone="primary" />;
    case 'InProgress':
      return <StatusBadge label="Đang thực hiện" tone="primary" />;
    case 'Completed':
      return <StatusBadge label="Hoàn tất" tone="success" />;
    case 'Cancelled':
      return <StatusBadge label="Đã hủy" tone="danger" />;
    default:
      return <StatusBadge label={status || 'New'} tone="neutral" />;
  }
};

export default function SalesCustomerDetailPage() {
  const { id } = useParams();
  const customerId = Number(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Active tab: 'accounts' | 'devices' | 'contracts' | 'requests'
  const [activeTab, setActiveTab] = useState('accounts');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!customerId || Number.isNaN(customerId)) {
      setError('Mã khách hàng không hợp lệ.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await getCustomerDetailApi(customerId);
      setData(res);
    } catch (err) {
      console.error('Error loading customer detail:', err);
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.error?.message;
      let displayMsg = 'Không thể tải chi tiết khách hàng. Vui lòng thử lại sau.';
      if (status === 401) {
        displayMsg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (apiMsg) {
        displayMsg = apiMsg;
      } else if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        displayMsg = 'Không thể kết nối đến máy chủ backend (http://localhost:3000). Vui lòng đảm bảo backend đang chạy.';
      }
      setError(displayMsg);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleActionSuccess = (_res, msg) => {
    setToast({ message: msg, tone: 'success' });
    fetchDetail();
  };

  if (loading) {
    return (
      <div className="sales-cust-page" style={{ padding: '60px 0', textAlign: 'center' }}>
        <span className="auth-spinner" style={{ borderColor: '#1a4ea6', borderTopColor: 'transparent', width: 28, height: 28 }} />
        <p style={{ marginTop: 14, color: '#64748b', fontSize: 15 }}>
          Đang tải hồ sơ khách hàng #{customerId}...
        </p>
      </div>
    );
  }

  if (error || !data?.customer) {
    return (
      <div className="sales-cust-page">
        <Link to="/internal/sales/customers" className="sales-cust-back-btn">
          ← Quay lại danh sách khách hàng
        </Link>
        <div className="sales-cust-table-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠</div>
          <h3 style={{ margin: 0, color: '#dc2626' }}>{error || 'Khách hàng không tồn tại'}</h3>
          <p style={{ color: '#64748b', marginTop: 8 }}>
            Hồ sơ khách hàng có thể đã bị xóa hoặc liên kết không chính xác.
          </p>
          <Link to="/internal/sales/customers" className="sales-cust-btn-primary" style={{ marginTop: 16 }}>
            Về danh sách khách hàng
          </Link>
        </div>
      </div>
    );
  }

  const { customer, accounts = [], devices = [], contracts = [], service_requests = [] } = data;

  return (
    <div className="sales-cust-page">
      {toast && (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      )}

      {/* Back button */}
      <Link to="/internal/sales/customers" className="sales-cust-back-btn">
        ← Quay lại danh sách khách hàng
      </Link>

      {/* Customer Header Card */}
      <div className="sales-cust-detail-header-card">
        <div className="sales-cust-detail-top">
          <div>
            <h2 className="sales-cust-detail-name">{customer.company_name}</h2>
            <div className="sales-cust-detail-meta">
              {customer.tax_code ? (
                <span className="sales-cust-badge sales-cust-badge--code">
                  MST: {customer.tax_code}
                </span>
              ) : (
                <span style={{ color: '#94a3b8' }}>Chưa đăng ký MST</span>
              )}
              <span className="sales-cust-badge sales-cust-badge--industry">
                {customer.industry || 'Lĩnh vực khác'}
              </span>
              <span>• Ngày tạo: {formatDate(customer.created_at)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="sales-cust-btn-secondary"
              onClick={() => setIsEditModalOpen(true)}
            >
              ✎ Sửa thông tin
            </button>
            <button
              type="button"
              className="sales-cust-btn-primary"
              onClick={() => navigate(`/internal/sales/service-requests/new?customerId=${customer.id}`)}
            >
              ＋ Tạo đơn dịch vụ mới
            </button>
          </div>
        </div>

        <div className="sales-cust-detail-grid">
          <div className="sales-cust-info-item">
            <span className="sales-cust-info-item__label">Địa chỉ trụ sở / nhà máy</span>
            <span className="sales-cust-info-item__val">{customer.address || '—'}</span>
          </div>

          <div className="sales-cust-info-item">
            <span className="sales-cust-info-item__label">Người liên hệ chính</span>
            <span className="sales-cust-info-item__val">
              {accounts.length > 0 ? `${accounts[0].full_name} (${accounts[0].email})` : 'Chưa có tài khoản liên hệ'}
            </span>
          </div>

          <div className="sales-cust-info-item">
            <span className="sales-cust-info-item__label">Số điện thoại liên hệ</span>
            <span className="sales-cust-info-item__val">
              {accounts.find((a) => a.phone)?.phone || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Summary Strip */}
      <div className="sales-cust-stats">
        <div
          className="sales-cust-stat-card"
          style={{ cursor: 'pointer', border: activeTab === 'accounts' ? '2px solid #1a4ea6' : undefined }}
          onClick={() => setActiveTab('accounts')}
        >
          <div className="sales-cust-stat-icon">👥</div>
          <div className="sales-cust-stat-info">
            <span className="sales-cust-stat-num">{accounts.length}</span>
            <span className="sales-cust-stat-label">Tài khoản người dùng</span>
          </div>
        </div>

        <div
          className="sales-cust-stat-card"
          style={{ cursor: 'pointer', border: activeTab === 'devices' ? '2px solid #1a4ea6' : undefined }}
          onClick={() => setActiveTab('devices')}
        >
          <div className="sales-cust-stat-icon devices">⚙</div>
          <div className="sales-cust-stat-info">
            <span className="sales-cust-stat-num">{devices.length}</span>
            <span className="sales-cust-stat-label">Thiết bị sở hữu</span>
          </div>
        </div>

        <div
          className="sales-cust-stat-card"
          style={{ cursor: 'pointer', border: activeTab === 'contracts' ? '2px solid #1a4ea6' : undefined }}
          onClick={() => setActiveTab('contracts')}
        >
          <div className="sales-cust-stat-icon contracts">▤</div>
          <div className="sales-cust-stat-info">
            <span className="sales-cust-stat-num">{contracts.length}</span>
            <span className="sales-cust-stat-label">Hợp đồng &amp; Báo giá</span>
          </div>
        </div>

        <div
          className="sales-cust-stat-card"
          style={{ cursor: 'pointer', border: activeTab === 'requests' ? '2px solid #1a4ea6' : undefined }}
          onClick={() => setActiveTab('requests')}
        >
          <div className="sales-cust-stat-icon requests">📋</div>
          <div className="sales-cust-stat-info">
            <span className="sales-cust-stat-num">{service_requests.length}</span>
            <span className="sales-cust-stat-label">Yêu cầu dịch vụ</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="sales-cust-tabs">
        <button
          type="button"
          className={`sales-cust-tab${activeTab === 'accounts' ? ' active' : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          <span>👥 Account người dùng</span>
          <span className="sales-cust-tab-count">{accounts.length}</span>
        </button>

        <button
          type="button"
          className={`sales-cust-tab${activeTab === 'devices' ? ' active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          <span>⚙ Device (Thiết bị)</span>
          <span className="sales-cust-tab-count">{devices.length}</span>
        </button>

        <button
          type="button"
          className={`sales-cust-tab${activeTab === 'contracts' ? ' active' : ''}`}
          onClick={() => setActiveTab('contracts')}
        >
          <span>▤ Contract (Hợp đồng &amp; Báo giá)</span>
          <span className="sales-cust-tab-count">{contracts.length}</span>
        </button>

        <button
          type="button"
          className={`sales-cust-tab${activeTab === 'requests' ? ' active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <span>📋 Service Request (Đơn dịch vụ)</span>
          <span className="sales-cust-tab-count">{service_requests.length}</span>
        </button>
      </div>

      {/* Tab 1: Account người dùng */}
      {activeTab === 'accounts' && (
        <div className="sales-cust-tab-content">
          <div className="sales-cust-tab-header">
            <div>
              <h3 className="sales-cust-tab-title">Danh sách tài khoản người dùng của khách hàng</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                Các cá nhân thuộc doanh nghiệp có quyền truy cập vào cổng thông tin ISOCAL Customer Portal.
              </p>
            </div>
            <button
              type="button"
              className="sales-cust-btn-primary"
              onClick={() => setIsAccountModalOpen(true)}
            >
              ＋ Thêm tài khoản người dùng
            </button>
          </div>

          {accounts.length === 0 ? (
            <div className="sales-cust-empty">
              <div className="sales-cust-empty-icon">👥</div>
              <h4 className="sales-cust-empty-title">Chưa có tài khoản người dùng</h4>
              <p className="sales-cust-empty-desc">
                Tạo tài khoản đại diện để khách hàng có thể đăng nhập tra cứu chứng nhận và thiết bị.
              </p>
              <button
                type="button"
                className="sales-cust-btn-primary"
                onClick={() => setIsAccountModalOpen(true)}
              >
                ＋ Thêm tài khoản người dùng
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sales-cust-table">
                <thead>
                  <tr>
                    <th>Họ và tên</th>
                    <th>Email đăng nhập</th>
                    <th>Số điện thoại</th>
                    <th>Vai trò</th>
                    <th style={{ textAlign: 'center' }}>Bảo mật 2FA</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái tài khoản</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr key={acc.id}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{acc.full_name}</td>
                      <td>
                        <a href={`mailto:${acc.email}`} style={{ color: '#1a4ea6', textDecoration: 'none' }}>
                          {acc.email}
                        </a>
                      </td>
                      <td style={{ color: '#475569' }}>{acc.phone || '—'}</td>
                      <td>
                        <span className="sales-cust-badge" style={{ background: '#e0edff', color: '#1a4ea6' }}>
                          {acc.role || 'Customer'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {acc.is_2fa_enabled ? (
                          <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.8rem' }}>✓ Đã bật</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Chưa bật</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {acc.failed_login_attempts >= 5 ? (
                          <StatusBadge label="Tạm khóa" tone="danger" />
                        ) : (
                          <StatusBadge label="Bình thường" tone="success" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Device */}
      {activeTab === 'devices' && (
        <div className="sales-cust-tab-content">
          <div className="sales-cust-tab-header">
            <div>
              <h3 className="sales-cust-tab-title">Danh mục thiết bị &amp; Phương tiện đo</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                Hồ sơ theo dõi thiết bị đo lường cần hiệu chuẩn / kiểm định định kỳ của khách hàng.
              </p>
            </div>
            <button
              type="button"
              className="sales-cust-btn-primary"
              onClick={() => setIsDeviceModalOpen(true)}
            >
              ＋ Đăng ký thiết bị mới
            </button>
          </div>

          {devices.length === 0 ? (
            <div className="sales-cust-empty">
              <div className="sales-cust-empty-icon">⚙</div>
              <h4 className="sales-cust-empty-title">Chưa có thiết bị nào</h4>
              <p className="sales-cust-empty-desc">
                Đăng ký thiết bị đo của khách hàng để tạo yêu cầu hiệu chuẩn và theo dõi chu kỳ kiểm định.
              </p>
              <button
                type="button"
                className="sales-cust-btn-primary"
                onClick={() => setIsDeviceModalOpen(true)}
              >
                ＋ Đăng ký thiết bị mới
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sales-cust-table">
                <thead>
                  <tr>
                    <th>Mã nội bộ</th>
                    <th>Tên thiết bị</th>
                    <th>Hãng SX / Model</th>
                    <th>Số Serial</th>
                    <th>Dải đo</th>
                    <th>Hạn HC tiếp theo</th>
                    <th style={{ textAlign: 'center' }}>Nhóm 2</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((dev) => (
                    <tr key={dev.id}>
                      <td>
                        <span className="sales-cust-badge sales-cust-badge--code">
                          {dev.internal_code}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{dev.name}</td>
                      <td style={{ color: '#475569' }}>
                        {dev.manufacturer || dev.model
                          ? `${dev.manufacturer || '—'} / ${dev.model || '—'}`
                          : '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#334155' }}>
                        {dev.serial_number || '—'}
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.82rem' }}>
                        {dev.measuring_range || '—'}
                      </td>
                      <td style={{ color: '#334155', fontWeight: 600 }}>
                        {formatDate(dev.next_due_date)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {dev.is_group2 ? (
                          <span className="sales-cust-badge" style={{ background: '#fef3c7', color: '#b45309' }}>
                            Nhóm 2
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Không</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {getDeviceStatusBadge(dev.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Contract (Hợp đồng & Báo giá cam kết) */}
      {activeTab === 'contracts' && (
        <div className="sales-cust-tab-content">
          <div className="sales-cust-tab-header">
            <div>
              <h3 className="sales-cust-tab-title">Hợp đồng &amp; Báo giá cam kết dịch vụ</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                Các báo giá chính thức và hợp đồng thỏa thuận dịch vụ hiệu chuẩn của khách hàng.
              </p>
            </div>
            <Link
              to={`/internal/sales/service-requests/new?customerId=${customer.id}`}
              className="sales-cust-btn-primary"
            >
              ＋ Lập báo giá mới
            </Link>
          </div>

          {contracts.length === 0 ? (
            <div className="sales-cust-empty">
              <div className="sales-cust-empty-icon">▤</div>
              <h4 className="sales-cust-empty-title">Chưa có hợp đồng hoặc báo giá nào</h4>
              <p className="sales-cust-empty-desc">
                Tạo đơn dịch vụ mới để lập báo giá và hoàn thiện hợp đồng cam kết với khách hàng.
              </p>
              <Link
                to={`/internal/sales/service-requests/new?customerId=${customer.id}`}
                className="sales-cust-btn-primary"
              >
                ＋ Tạo đơn dịch vụ ngay
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sales-cust-table">
                <thead>
                  <tr>
                    <th>Mã Báo giá / Hợp đồng</th>
                    <th>Đơn dịch vụ liên kết</th>
                    <th style={{ textAlign: 'right' }}>Tạm tính</th>
                    <th style={{ textAlign: 'right' }}>Chiết khấu</th>
                    <th style={{ textAlign: 'right' }}>Tổng thanh toán</th>
                    <th>Ngày dự kiến</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái cam kết</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((con) => (
                    <tr key={con.id}>
                      <td>
                        <Link
                          to={`/internal/sales/quotations/${con.id}`}
                          style={{ fontWeight: 700, color: '#1a4ea6', textDecoration: 'none' }}
                        >
                          BG-{con.id.toString().padStart(5, '0')}
                        </Link>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {con.line_items_count} dịch vụ mục
                        </div>
                      </td>
                      <td>
                        <Link
                          to={`/internal/sales/service-requests/${con.service_request_id}`}
                          style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                        >
                          {con.service_request_code}
                        </Link>
                      </td>
                      <td style={{ textAlign: 'right', color: '#475569' }}>
                        {formatCurrency(con.subtotal)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#dc2626' }}>
                        {con.discount_amount > 0 ? `-${formatCurrency(con.discount_amount)}` : '0 ₫'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 750, color: '#0f172a' }}>
                        {formatCurrency(con.total_amount)}
                      </td>
                      <td style={{ color: '#334155' }}>
                        {formatDate(con.estimated_completion_date)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {getQuotationStatusBadge(con.status)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          to={`/internal/sales/quotations/${con.id}`}
                          className="sales-cust-btn-secondary"
                          style={{ height: 30, padding: '0 10px', fontSize: '0.78rem' }}
                        >
                          👁 Xem báo giá
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Service Request */}
      {activeTab === 'requests' && (
        <div className="sales-cust-tab-content">
          <div className="sales-cust-tab-header">
            <div>
              <h3 className="sales-cust-tab-title">Lịch sử yêu cầu dịch vụ (Service Requests)</h3>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                Tổng hợp tất cả đơn đề nghị hiệu chuẩn &amp; kiểm định do khách hàng hoặc Sales khởi tạo.
              </p>
            </div>
            <Link
              to={`/internal/sales/service-requests/new?customerId=${customer.id}`}
              className="sales-cust-btn-primary"
            >
              ＋ Tạo yêu cầu dịch vụ
            </Link>
          </div>

          {service_requests.length === 0 ? (
            <div className="sales-cust-empty">
              <div className="sales-cust-empty-icon">📋</div>
              <h4 className="sales-cust-empty-title">Chưa có yêu cầu dịch vụ nào</h4>
              <p className="sales-cust-empty-desc">
                Khách hàng này chưa có đơn đề nghị hiệu chuẩn nào. Tạo đơn dịch vụ đầu tiên ngay!
              </p>
              <Link
                to={`/internal/sales/service-requests/new?customerId=${customer.id}`}
                className="sales-cust-btn-primary"
              >
                ＋ Tạo yêu cầu dịch vụ
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="sales-cust-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Hình thức thực hiện</th>
                    <th>Ngày mong muốn</th>
                    <th style={{ textAlign: 'center' }}>Số thiết bị</th>
                    <th>Người khởi tạo</th>
                    <th>Ngày tạo</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {service_requests.map((sr) => (
                    <tr key={sr.id}>
                      <td>
                        <Link
                          to={`/internal/sales/service-requests/${sr.id}`}
                          style={{ fontWeight: 700, color: '#1a4ea6', textDecoration: 'none' }}
                        >
                          {sr.request_code || `SR-${sr.id}`}
                        </Link>
                      </td>
                      <td>
                        <span
                          className="sales-cust-badge"
                          style={{
                            background: sr.location_type === 'On-site' ? '#fef3c7' : '#eff6ff',
                            color: sr.location_type === 'On-site' ? '#92400e' : '#1d4ed8',
                          }}
                        >
                          {sr.location_type === 'On-site' ? '📍 Tại hiện trường' : '🔬 Tại Lab'}
                        </span>
                      </td>
                      <td style={{ color: '#334155', fontWeight: 600 }}>
                        {formatDate(sr.preferred_date)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="sales-cust-pill-count">{sr.items_count}</span>
                      </td>
                      <td style={{ color: '#475569' }}>{sr.created_by_name}</td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        {formatDate(sr.created_at)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {getRequestStatusBadge(sr.status)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          to={`/internal/sales/service-requests/${sr.id}`}
                          className="sales-cust-btn-secondary"
                          style={{ height: 30, padding: '0 10px', fontSize: '0.78rem' }}
                        >
                          👁 Xem đơn
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CustomerFormModal
        isOpen={isEditModalOpen}
        customer={customer}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleActionSuccess}
      />

      <CustomerAccountModal
        isOpen={isAccountModalOpen}
        customerId={customer.id}
        onClose={() => setIsAccountModalOpen(false)}
        onSuccess={handleActionSuccess}
      />

      <CustomerDeviceModal
        isOpen={isDeviceModalOpen}
        customerId={customer.id}
        onClose={() => setIsDeviceModalOpen(false)}
        onSuccess={handleActionSuccess}
      />
    </div>
  );
}

