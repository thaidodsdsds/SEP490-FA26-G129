import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../../app/providers.jsx';
import { isHeadSalesAccount } from '../../../app/role-routing.js';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Toast from '../../../components/ui/Toast.jsx';
import { listCustomersDetailedApi } from '../../../services/customer-service.js';
import CustomerFormModal from './CustomerFormModal.jsx';
import './sales-customers.css';

const COMMON_INDUSTRIES = [
  'Tất cả lĩnh vực',
  'Sản xuất & Chế tạo (Manufacturing)',
  'Cơ khí chính xác (Mechanical Engineering)',
  'Điện & Điện tử (Electronics)',
  'Y tế & Thiết bị y tế (Medical Equipment)',
  'Chế biến thực phẩm (Food Processing)',
  'Dược phẩm & Mỹ phẩm (Pharmaceuticals)',
  'Hóa chất & Vật liệu (Chemicals)',
  'Dầu khí & Năng lượng (Oil & Energy)',
  'Môi trường & Xử lý nước (Environmental)',
  'Dệt may & Da giày (Textiles)',
];

export default function SalesCustomerListPage() {
  const { session } = useAppContext() || {};
  const isHeadSales = isHeadSalesAccount(session?.user);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const fetchCustomers = useCallback(async (targetPage = 1, searchQuery = '', ind = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await listCustomersDetailedApi({
        search: searchQuery,
        industry: ind === 'Tất cả lĩnh vực' ? '' : ind,
        page: targetPage,
        limit: 10,
      });

      setCustomers(data.customers || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
      setPage(data.page || 1);
    } catch (err) {
      console.error('Error fetching customers:', err);
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.error?.message;
      let displayMsg = 'Không thể tải danh sách khách hàng. Vui lòng thử lại sau.';
      if (status === 401) {
        displayMsg = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (apiMsg) {
        displayMsg = apiMsg;
      } else if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error')) {
        displayMsg = 'Không thể kết nối đến máy chủ backend (http://localhost:3000). Vui lòng kiểm tra backend server đã chạy chưa.';
      }
      setError(displayMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers(page, search, industryFilter);
  }, [fetchCustomers, page, search, industryFilter]);

  const handleOpenAdd = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cust) => {
    setSelectedCustomer(cust);
    setIsModalOpen(true);
  };

  const handleSuccess = (_result, message) => {
    setToast({ message, tone: 'success' });
    fetchCustomers(page, search, industryFilter);
  };

  // Aggregate stats
  const totalDevices = customers.reduce((sum, c) => sum + (c.devices_count || 0), 0);
  const totalRequests = customers.reduce((sum, c) => sum + (c.service_requests_count || 0), 0);
  const totalAccounts = customers.reduce((sum, c) => sum + (c.accounts_count || 0), 0);

  return (
    <div className="sales-cust-page">
      {toast && (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      )}

      <PageHeader
        title={isHeadSales ? 'Quản lý toàn bộ khách hàng' : 'Khách hàng được phân công phụ trách'}
        description={
          isHeadSales
            ? 'Tra cứu toàn bộ doanh nghiệp, phân công nhân viên Sales phụ trách (1-1) và quản lý hồ sơ thiết bị, hợp đồng.'
            : 'Danh sách khách hàng do bạn trực tiếp phụ trách theo phân công của Trưởng phòng Kinh doanh (HeadSales).'
        }
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            {isHeadSales && (
              <Link
                to="/internal/sales/customer-assignments"
                className="sales-cust-btn-secondary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span>👥</span> Phân công khách cho Sales
              </Link>
            )}
            <button
              type="button"
              className="sales-cust-btn-primary"
              onClick={handleOpenAdd}
            >
              <span>＋</span> Thêm khách hàng mới
            </button>
          </div>
        }
      />

      {/* Stats strip */}
      <div className="sales-cust-stats">
        <div className="sales-cust-stat-card">
          <div className="sales-cust-stat-icon">🏢</div>
          <div className="sales-cust-stat-info">
            <span className="sales-cust-stat-num">{totalCount}</span>
            <span className="sales-cust-stat-label">Tổng khách hàng</span>
          </div>
        </div>

        <div className="sales-cust-stat-card">
          <div className="sales-cust-stat-icon devices">⚙</div>
          <div className="sales-cust-stat-info">
            <span className="sales-cust-stat-num">{totalDevices}</span>
            <span className="sales-cust-stat-label">Thiết bị đăng ký (Trang)</span>
          </div>
        </div>

        <div className="sales-cust-stat-card">
          <div className="sales-cust-stat-icon requests">📋</div>
          <div className="sales-cust-stat-info">
            <span className="sales-cust-stat-num">{totalRequests}</span>
            <span className="sales-cust-stat-label">Đơn dịch vụ (Trang)</span>
          </div>
        </div>

        <div className="sales-cust-stat-card">
          <div className="sales-cust-stat-icon contracts">👥</div>
          <div className="sales-cust-stat-info">
            <span className="sales-cust-stat-num">{totalAccounts}</span>
            <span className="sales-cust-stat-label">Tài khoản liên hệ (Trang)</span>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="sales-cust-toolbar">
        <div className="sales-cust-filters">
          <input
            type="text"
            className="sales-cust-search-input"
            placeholder="🔍 Tìm tên doanh nghiệp, MST, địa chỉ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <select
            className="sales-cust-select"
            value={industryFilter}
            onChange={(e) => {
              setIndustryFilter(e.target.value);
              setPage(1);
            }}
          >
            {COMMON_INDUSTRIES.map((ind) => (
              <option key={ind} value={ind === 'Tất cả lĩnh vực' ? '' : ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="sales-cust-table-card">
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#64748b' }}>
            <span className="auth-spinner" style={{ borderColor: '#1a4ea6', borderTopColor: 'transparent', width: 24, height: 24 }} />
            <p style={{ marginTop: 12, fontSize: 14 }}>Đang tải danh sách khách hàng...</p>
          </div>
        ) : error ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#dc2626' }}>
            <p>⚠ {error}</p>
            <div style={{ display: 'inline-flex', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="sales-cust-btn-secondary"
                onClick={() => fetchCustomers(page, search, industryFilter)}
              >
                Thử lại
              </button>
              {error.includes('đăng nhập') && (
                <Link to="/staff-login" className="sales-cust-btn-primary" style={{ textDecoration: 'none' }}>
                  Đăng nhập lại
                </Link>
              )}
            </div>
          </div>
        ) : customers.length === 0 ? (
          <div className="sales-cust-empty">
            <div className="sales-cust-empty-icon">📂</div>
            <h4 className="sales-cust-empty-title">Không tìm thấy khách hàng nào</h4>
            <p className="sales-cust-empty-desc">
              {search || industryFilter
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc lĩnh vực.'
                : 'Chưa có thông tin khách hàng nào trên hệ thống. Hãy thêm khách hàng đầu tiên!'}
            </p>
            <button
              type="button"
              className="sales-cust-btn-primary"
              onClick={handleOpenAdd}
            >
              ＋ Thêm khách hàng mới
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="sales-cust-table">
              <thead>
                <tr>
                  <th>Tên Doanh nghiệp &amp; MST</th>
                  <th>Lĩnh vực</th>
                  <th>Sales phụ trách</th>
                  <th>Địa chỉ trụ sở</th>
                  <th style={{ textAlign: 'center' }}>Tài khoản</th>
                  <th style={{ textAlign: 'center' }}>Thiết bị</th>
                  <th style={{ textAlign: 'center' }}>Đơn dịch vụ</th>
                  <th>Ngày tạo</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="sales-cust-title-cell">
                        <Link
                          to={`/internal/sales/customers/${c.id}`}
                          style={{ color: '#1a4ea6', textDecoration: 'none' }}
                        >
                          {c.company_name}
                        </Link>
                      </div>
                      <div className="sales-cust-sub-cell">
                        {c.tax_code ? (
                          <span className="sales-cust-badge sales-cust-badge--code">
                            MST: {c.tax_code}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Chưa có MST</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="sales-cust-badge sales-cust-badge--industry">
                        {c.industry || 'Chưa phân loại'}
                      </span>
                    </td>
                    <td>
                      {c.assigned_sales_name ? (
                        <div>
                          <strong style={{ color: '#166534', fontSize: '0.82rem' }}>
                            👤 {c.assigned_sales_name}
                          </strong>
                          {c.assigned_sales_email && (
                            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                              {c.assigned_sales_email}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: '#fef3c7',
                            color: '#92400e',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          ⚠ Chưa phân công
                        </span>
                      )}
                    </td>
                    <td style={{ maxWidth: 280, color: '#475569' }}>
                      <span title={c.address}>{c.address}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="sales-cust-pill-count">{c.accounts_count ?? 0}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="sales-cust-pill-count">{c.devices_count ?? 0}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="sales-cust-pill-count">{c.service_requests_count ?? 0}</span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <Link
                          to={`/internal/sales/customers/${c.id}`}
                          className="sales-cust-btn-secondary"
                          style={{ height: 30, padding: '0 10px', fontSize: '0.78rem' }}
                        >
                          👁 Chi tiết
                        </Link>
                        <button
                          type="button"
                          className="sales-cust-btn-secondary"
                          style={{ height: 30, padding: '0 10px', fontSize: '0.78rem' }}
                          onClick={() => handleOpenEdit(c)}
                        >
                          ✎ Sửa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
          <button
            type="button"
            className="sales-cust-btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ height: 32, padding: '0 12px' }}
          >
            ‹ Trước
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '0.85rem', color: '#64748b' }}>
            Trang {page} / {totalPages} (Tổng {totalCount} khách hàng)
          </span>
          <button
            type="button"
            className="sales-cust-btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{ height: 32, padding: '0 12px' }}
          >
            Sau ›
          </button>
        </div>
      )}

      {/* Modal Add / Edit */}
      <CustomerFormModal
        isOpen={isModalOpen}
        customer={selectedCustomer}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

