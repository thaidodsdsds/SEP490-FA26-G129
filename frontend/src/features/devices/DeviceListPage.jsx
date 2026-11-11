import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDevicesApi } from '../../services/device-service.js';
import { listCustomersDetailedApi } from '../../services/customer-service.js';
import DeviceModalForm from './DeviceModalForm.jsx';
import TransferOwnershipModal from './TransferOwnershipModal.jsx';
import Toast from '../../components/ui/Toast.jsx';
import './devices.css';

export default function DeviceListPage({ role = 'customer', basePath = '' }) {
  const navigate = useNavigate();
  const isCustomerRole = role?.toLowerCase() === 'customer';
  const isSalesRole = role?.toLowerCase() === 'sales';
  const canTransfer = ['sales', 'admin'].includes(role?.toLowerCase());

  // Filters state
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [isGroup2, setIsGroup2] = useState(''); // '', 'true', 'false'
  const [dueStatus, setDueStatus] = useState('all'); // 'all', 'expired', 'expiring_soon', 'valid'
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Data state
  const [devices, setDevices] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [customersList, setCustomersList] = useState([]);

  // Modal & Toast state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferDevice, setTransferDevice] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Load customer list for internal roles filter
  useEffect(() => {
    if (!isCustomerRole) {
      listCustomersDetailedApi({ limit: 100 })
        .then((data) => {
          setCustomersList(data?.customers || []);
        })
        .catch(() => {});
    }
  }, [isCustomerRole]);

  // Load devices
  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDevicesApi({
        customerId: isCustomerRole ? undefined : customerId,
        isGroup2: isGroup2 === 'true' ? true : isGroup2 === 'false' ? false : undefined,
        dueStatus,
        status,
        search,
        page,
        limit,
      });

      setDevices(data?.items || []);
      setTotal(data?.total || 0);
      setTotalPages(data?.totalPages || 1);
    } catch (err) {
      setToast({
        show: true,
        message: err?.response?.data?.error?.message || 'Không thể tải danh sách thiết bị.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [customerId, dueStatus, isCustomerRole, isGroup2, limit, page, search, status]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Counters
  const group2Count = devices.filter((d) => d.is_group2).length;
  const expiredCount = devices.filter((d) => d.status === 'Expired' || (d.next_due_date && new Date(d.next_due_date) < new Date())).length;
  const activeCount = devices.filter((d) => d.status === 'Active').length;

  const handleOpenCreate = () => {
    setSelectedDevice(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (device, e) => {
    e.stopPropagation();
    if (isSalesRole) {
      setToast({
        show: true,
        message: 'Kinh doanh (Sales) chỉ có quyền xem chi tiết thiết bị, không được chỉnh sửa.',
        type: 'warning',
      });
      return;
    }
    setSelectedDevice(device);
    setModalOpen(true);
  };

  const handleRowClick = (deviceId) => {
    const targetPath = basePath ? `${basePath}/${deviceId}` : `${deviceId}`;
    navigate(targetPath);
  };

  const formatDueDate = (dateStr) => {
    if (!dateStr) return { label: 'Chưa cập nhật', className: '' };
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 3600 * 24));

    const formatted = date.toLocaleDateString('vi-VN');

    if (diffDays < 0) {
      return {
        label: `⚠ Quá hạn (${formatted})`,
        className: 'badge-due-expired',
      };
    }
    if (diffDays <= 30) {
      return {
        label: `⚡ Sắp hết hạn (${formatted})`,
        className: 'badge-due-warning',
      };
    }
    return {
      label: `✓ Còn hạn (${formatted})`,
      className: 'badge-due-valid',
    };
  };

  return (
    <div className="devices-container">
      {/* Toast */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      {/* Header */}
      <div className="devices-header">
        <div>
          <h1 className="devices-header-title">
            <span>🛠</span>
            {isCustomerRole
              ? 'Hồ sơ thiết bị doanh nghiệp'
              : isSalesRole
                ? 'Danh mục thiết bị & Khách hàng'
                : 'Quản lý thiết bị đo & Kiểm chuẩn'}
          </h1>
          <p className="devices-header-subtitle">
            {isCustomerRole
              ? 'Quản lý các thiết bị đo lường của công ty, theo dõi hạn hiệu chuẩn, hồ sơ tem và chứng nhận.'
              : 'Tra cứu danh sách thiết bị, lọc theo khách hàng, phân loại Nhóm 2 và kiểm soát hạn hiệu chuẩn định kỳ.'}
          </p>
        </div>

        <div className="devices-actions">
          {!isSalesRole && (
            <button
              type="button"
              className="devices-btn-primary"
              onClick={handleOpenCreate}
            >
              <span>＋</span> Đăng ký thiết bị mới
            </button>
          )}
          {isSalesRole && (
            <span
              style={{
                fontSize: '0.82rem',
                color: '#64748b',
                background: '#f1f5f9',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
              }}
            >
              👁 Chế độ xem chi tiết thiết bị
            </span>
          )}
        </div>
      </div>

      {/* Stats Counter Cards */}
      <div className="devices-stats-grid">
        <div className="devices-stat-card">
          <div className="devices-stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            ▦
          </div>
          <div>
            <div className="devices-stat-val">{total}</div>
            <div className="devices-stat-lbl">Tổng thiết bị</div>
          </div>
        </div>

        <div className="devices-stat-card">
          <div className="devices-stat-icon" style={{ background: '#fefce8', color: '#d97706' }}>
            ⚖
          </div>
          <div>
            <div className="devices-stat-val">{group2Count} (Trang)</div>
            <div className="devices-stat-lbl">Phương tiện đo Nhóm 2</div>
          </div>
        </div>

        <div className="devices-stat-card">
          <div className="devices-stat-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
            ⏱
          </div>
          <div>
            <div className="devices-stat-val">{expiredCount} (Trang)</div>
            <div className="devices-stat-lbl">Quá hạn / Cần hiệu chuẩn</div>
          </div>
        </div>

        <div className="devices-stat-card">
          <div className="devices-stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
            ✓
          </div>
          <div>
            <div className="devices-stat-val">{activeCount} (Trang)</div>
            <div className="devices-stat-lbl">Đang hoạt động tốt</div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="devices-filter-panel">
        <div className="devices-search-box">
          <span className="devices-search-icon">🔍</span>
          <input
            type="text"
            className="devices-search-input"
            placeholder="Tìm theo tên thiết bị, model, serial, mã nội bộ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="devices-filter-group">
          {/* Customer filter: Hidden for Customer role */}
          {!isCustomerRole && (
            <select
              className="devices-select"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">🏢 Tất cả khách hàng</option>
              {customersList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          )}

          {/* Nhóm 2 filter */}
          <select
            className="devices-select"
            value={isGroup2}
            onChange={(e) => {
              setIsGroup2(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Phân loại Nhóm 2: Tất cả</option>
            <option value="true">⚖ Thuộc Nhóm 2 (Bắt buộc kiểm định)</option>
            <option value="false">⚙ Không thuộc Nhóm 2 (Thông thường)</option>
          </select>

          {/* Hạn next_due_date filter */}
          <select
            className="devices-select"
            value={dueStatus}
            onChange={(e) => {
              setDueStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Thời hạn hiệu chuẩn: Tất cả</option>
            <option value="expired">🔴 Đã quá hạn (Expired)</option>
            <option value="expiring_soon">🟡 Sắp đến hạn (≤ 30 ngày)</option>
            <option value="valid">🟢 Còn hạn hiệu lực</option>
          </select>

          {/* Status filter */}
          <select
            className="devices-select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Trạng thái: Tất cả</option>
            <option value="Active">Hoạt động (Active)</option>
            <option value="ExpiringSoon">Sắp đến hạn (ExpiringSoon)</option>
            <option value="Expired">Quá hạn (Expired)</option>
            <option value="InRepair">Đang sửa chữa (InRepair)</option>
          </select>

          {(search || customerId || isGroup2 || dueStatus !== 'all' || status !== 'all') && (
            <button
              type="button"
              className="devices-btn-secondary"
              onClick={() => {
                setSearch('');
                setCustomerId('');
                setIsGroup2('');
                setDueStatus('all');
                setStatus('all');
                setPage(1);
              }}
            >
              ✕ Đặt lại
            </button>
          )}
        </div>
      </div>

      {/* Devices Table */}
      <div className="devices-table-wrap">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Đang tải dữ liệu thiết bị...
          </div>
        ) : devices.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155' }}>
              Không tìm thấy thiết bị nào phù hợp
            </p>
            <p style={{ fontSize: '0.85rem' }}>
              Thử thay đổi bộ lọc tìm kiếm hoặc thêm mới thiết bị vào hệ thống.
            </p>
          </div>
        ) : (
          <table className="devices-table">
            <thead>
              <tr>
                <th>Mã nội bộ</th>
                <th>Tên thiết bị & Model</th>
                <th>Số Serial</th>
                <th>Phân loại</th>
                {!isCustomerRole && <th>Khách hàng sở hữu</th>}
                <th>Hạn hiệu chuẩn kế tiếp</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => {
                const dueInfo = formatDueDate(device.next_due_date);

                return (
                  <tr
                    key={device.id}
                    onClick={() => handleRowClick(device.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span className="badge-code">{device.internal_code}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{device.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {device.manufacturer || '—'} {device.model ? `· ${device.model}` : ''}
                      </div>
                    </td>
                    <td>
                      {device.serial_number ? (
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {device.serial_number}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>
                          (Tự cấp mã nội bộ)
                        </span>
                      )}
                    </td>
                    <td>
                      {device.is_group2 ? (
                        <span className="badge-group2">⚖ Nhóm 2</span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Thông thường</span>
                      )}
                    </td>
                    {!isCustomerRole && (
                      <td>
                        <div style={{ fontWeight: 500 }}>
                          {device.customer?.company_name || `Khách hàng #${device.customer_id}`}
                        </div>
                        {device.customer?.tax_code && (
                          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            MST: {device.customer.tax_code}
                          </div>
                        )}
                      </td>
                    )}
                    <td>
                      <span className={dueInfo.className}>{dueInfo.label}</span>
                    </td>
                    <td>
                      <span
                        className={`badge-status ${
                          device.status === 'Active'
                            ? 'badge-status-active'
                            : device.status === 'ExpiringSoon'
                              ? 'badge-status-expiring'
                              : device.status === 'Expired'
                                ? 'badge-status-expired'
                                : 'badge-status-repair'
                        }`}
                      >
                        {device.status === 'Active'
                          ? 'Hoạt động'
                          : device.status === 'ExpiringSoon'
                            ? 'Sắp đến hạn'
                            : device.status === 'Expired'
                              ? 'Quá hạn'
                              : 'Đang sửa chữa'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div
                        style={{ display: 'inline-flex', gap: '8px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="devices-btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                          onClick={() => handleRowClick(device.id)}
                        >
                          👁 Chi tiết
                        </button>

                        {canTransfer && (
                          <button
                            type="button"
                            className="devices-btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '0.8rem', color: '#b45309' }}
                            title="Chuyển quyền sở hữu thiết bị"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTransferDevice(device);
                              setTransferModalOpen(true);
                            }}
                          >
                            🔄 Chuyển quyền
                          </button>
                        )}

                        {!isSalesRole && (
                          <button
                            type="button"
                            className="devices-btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                            onClick={(e) => handleOpenEdit(device, e)}
                          >
                            ✎ Sửa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="devices-pagination">
            <div>
              Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)} trên tổng số {total} thiết bị
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="devices-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Trước
              </button>
              <span style={{ padding: '6px 12px', fontSize: '0.82rem', fontWeight: 600 }}>
                Trang {page} / {totalPages}
              </span>
              <button
                type="button"
                className="devices-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Form */}
      <DeviceModalForm
        isOpen={modalOpen}
        device={selectedDevice}
        role={role}
        onClose={() => setModalOpen(false)}
        onSuccess={(saved, msg) => {
          setToast({ show: true, message: msg, type: 'success' });
          loadDevices();
        }}
      />

      {/* Transfer Ownership Modal */}
      <TransferOwnershipModal
        isOpen={transferModalOpen}
        device={transferDevice}
        onClose={() => setTransferModalOpen(false)}
        onSuccess={(result, msg) => {
          setToast({ show: true, message: msg, type: 'success' });
          loadDevices();
        }}
      />
    </div>
  );
}

