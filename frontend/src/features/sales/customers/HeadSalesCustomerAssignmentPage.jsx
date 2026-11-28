import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Toast from '../../../components/ui/Toast.jsx';
import {
  assignCustomerToSalesApi,
  bulkAssignCustomersToSalesApi,
  getSalesAssignmentsApi,
} from '../../../services/customer-service.js';
import { extractApiErrorMessage } from '../../../services/service-request-service.js';
import './sales-customers.css';

export default function HeadSalesCustomerAssignmentPage() {
  const [salesStaff, setSalesStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({
    total_customers: 0,
    assigned_customers: 0,
    unassigned_customers: 0,
    total_sales_staff: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | UNASSIGNED | ASSIGNED
  const [salesFilter, setSalesFilter] = useState('ALL'); // ALL | sales_id
  const [showWorkloadModal, setShowWorkloadModal] = useState(false);

  // Row & Bulk assignment states
  const [savingCustomerId, setSavingCustomerId] = useState(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [bulkSalesId, setBulkSalesId] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSalesAssignmentsApi();
      setSalesStaff(Array.isArray(data.sales_staff) ? data.sales_staff : []);
      setCustomers(Array.isArray(data.customers) ? data.customers : []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      setError(
        extractApiErrorMessage(
          err,
          'Không thể tải dữ liệu phân công khách hàng. Vui lòng thử lại.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (statusFilter === 'UNASSIGNED' && c.assigned_sales_id !== null) return false;
      if (statusFilter === 'ASSIGNED' && c.assigned_sales_id === null) return false;
      if (
        salesFilter !== 'ALL'
        && String(c.assigned_sales_id || '') !== String(salesFilter)
      ) {
        return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const text = `${c.company_name || ''} ${c.tax_code || ''} ${c.address || ''} ${c.industry || ''} ${c.assigned_sales_name || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [customers, search, statusFilter, salesFilter]);

  const handleAssignSingle = async (customer, nextSalesIdRaw) => {
    const nextSalesId = nextSalesIdRaw ? Number(nextSalesIdRaw) : null;
    if ((customer.assigned_sales_id ?? null) === nextSalesId) return;

    setSavingCustomerId(customer.id);
    try {
      const updated = await assignCustomerToSalesApi(customer.id, nextSalesId);
      const salesObj = salesStaff.find((s) => s.id === nextSalesId);
      setToast({
        message: nextSalesId
          ? `Đã gán khách hàng "${customer.company_name}" cho nhân viên Sales ${updated?.assigned_sales_name || salesObj?.full_name || `#${nextSalesId}`}.`
          : `Đã gỡ phân công nhân viên Sales khỏi khách hàng "${customer.company_name}".`,
        tone: 'success',
      });
      await fetchAssignments();
    } catch (err) {
      setToast({
        message: extractApiErrorMessage(err, 'Không thể cập nhật phân công khách hàng.'),
        tone: 'danger',
      });
    } finally {
      setSavingCustomerId(null);
    }
  };

  const handleToggleSelectCustomer = (customerId) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId],
    );
  };

  const handleToggleSelectAllVisible = () => {
    const visibleIds = filteredCustomers.map((c) => c.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedCustomerIds.includes(id));

    if (allSelected) {
      setSelectedCustomerIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedCustomerIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleBulkAssign = async () => {
    if (selectedCustomerIds.length === 0) return;
    setBulkSubmitting(true);
    try {
      const targetSalesId =
        bulkSalesId === '__UNASSIGN__' || bulkSalesId === '' ? null : Number(bulkSalesId);
      const res = await bulkAssignCustomersToSalesApi(selectedCustomerIds, targetSalesId);
      setToast({
        message: targetSalesId
          ? `Đã gán ${res?.updated_count || selectedCustomerIds.length} khách hàng cho ${res?.assigned_sales_name || 'nhân viên Sales'}.`
          : `Đã gỡ phân công Sales cho ${selectedCustomerIds.length} khách hàng.`,
        tone: 'success',
      });
      setSelectedCustomerIds([]);
      await fetchAssignments();
    } catch (err) {
      setToast({
        message: extractApiErrorMessage(err, 'Không thể phân công khách hàng hàng loạt.'),
        tone: 'danger',
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <div className="sales-cust-page">
      {toast && (
        <Toast
          message={toast.message}
          onClose={() => setToast(null)}
          tone={toast.tone}
        />
      )}

      <PageHeader
        actions={(
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="button button-secondary"
              disabled={loading}
              onClick={fetchAssignments}
              type="button"
            >
              ↻ Làm mới dữ liệu
            </button>
            <Link className="button button-primary" to="/internal/sales/quotation-approvals">
              ✓ Duyệt báo giá chờ trình →
            </Link>
          </div>
        )}
        description="Mỗi khách hàng được gán cho 1 nhân viên Sales phụ trách chính. Nhân viên Sales chỉ được phép tạo phiếu yêu cầu dịch vụ và lập báo giá cho các khách hàng được phân công."
        eyebrow="HEAD OF SALES · CUSTOMER ASSIGNMENT"
        title="Phân công khách hàng cho nhân viên Sales"
      />

      {/* Summary KPI Strip */}
      <div className="sales-cust-stats">
        <div
          className="sales-cust-stat-card"
          onClick={() => {
            setStatusFilter('ALL');
            setSalesFilter('ALL');
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="sales-cust-stat-icon">🏢</div>
          <div className="sales-cust-stat-info">
            <span className="sales-cust-stat-num">{summary.total_customers}</span>
            <span className="sales-cust-stat-label">Tổng khách hàng</span>
          </div>
        </div>

        <div
          className="sales-cust-stat-card"
          onClick={() => setStatusFilter('ASSIGNED')}
          style={{ cursor: 'pointer' }}
        >
          <div className="sales-cust-stat-icon contracts">✓</div>
          <div className="sales-cust-stat-info">
            <span className="sales-cust-stat-num" style={{ color: '#057a55' }}>
              {summary.assigned_customers}
            </span>
            <span className="sales-cust-stat-label">Đã gán Sales phụ trách</span>
          </div>
        </div>

        <div
          className="sales-cust-stat-card"
          onClick={() => setStatusFilter('UNASSIGNED')}
          style={{ cursor: 'pointer' }}
        >
          <div className="sales-cust-stat-icon requests">⚠</div>
          <div className="sales-cust-stat-info">
            <span className="sales-cust-stat-num" style={{ color: '#d97706' }}>
              {summary.unassigned_customers}
            </span>
            <span className="sales-cust-stat-label">Chưa phân công Sales</span>
          </div>
        </div>

        <div
          className="sales-cust-stat-card"
          onClick={() => setShowWorkloadModal(true)}
          style={{ cursor: 'pointer' }}
          title="Nhấn để xem bảng phân bổ tải công việc chi tiết của đội ngũ Sales"
        >
          <div className="sales-cust-stat-icon devices">👥</div>
          <div className="sales-cust-stat-info">
            <span className="sales-cust-stat-num">{summary.total_sales_staff}</span>
            <span className="sales-cust-stat-label">
              Nhân viên Sales hoạt động
              <span style={{ display: 'block', fontSize: '0.72rem', color: '#1a56db', fontWeight: 600, marginTop: 2 }}>
                Xem tải công việc ↗
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="sales-cust-toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="sales-cust-filters" style={{ flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
          <input
            className="sales-cust-search-input"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Tìm tên công ty, MST, địa chỉ, tên Sales..."
            type="text"
            value={search}
          />

          <select
            className="sales-cust-select"
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
          >
            <option value="ALL">Tất cả trạng thái gán</option>
            <option value="UNASSIGNED">⚠ Chưa gán Sales</option>
            <option value="ASSIGNED">✓ Đã gán Sales</option>
          </select>

          <select
            className="sales-cust-select"
            onChange={(e) => setSalesFilter(e.target.value)}
            value={salesFilter}
          >
            <option value="ALL">Tất cả nhân viên Sales ({salesStaff.length})</option>
            {salesStaff.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.full_name} — {s.assigned_customers_count} khách ({s.service_requests_count || 0} đơn YC)
              </option>
            ))}
          </select>

          {salesFilter !== 'ALL' && (
            <button
              className="button button-sm button-secondary"
              onClick={() => setSalesFilter('ALL')}
              style={{ fontSize: '0.75rem', height: 38, padding: '0 12px' }}
              title="Bỏ lọc theo nhân viên Sales"
              type="button"
            >
              ✕ Bỏ lọc Sales
            </button>
          )}
        </div>

        {/* Bulk Assignment Action Bar */}
        {selectedCustomerIds.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 10,
            }}
          >
            <strong style={{ fontSize: '0.84rem', color: '#1e40af' }}>
              Đã chọn {selectedCustomerIds.length} khách hàng:
            </strong>
            <select
              className="sales-cust-select"
              onChange={(e) => setBulkSalesId(e.target.value)}
              style={{ minWidth: 210, height: 34 }}
              value={bulkSalesId}
            >
              <option value="">-- Chọn nhân viên Sales để gán --</option>
              {salesStaff.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  👤 {s.full_name} ({s.email})
                </option>
              ))}
              <option value="__UNASSIGN__">✕ Gỡ phân công Sales</option>
            </select>
            <button
              className="button button-primary"
              disabled={!bulkSalesId || bulkSubmitting}
              onClick={handleBulkAssign}
              style={{ height: 34, padding: '0 14px', fontSize: '0.82rem' }}
              type="button"
            >
              {bulkSubmitting ? 'Đang lưu...' : 'Áp dụng phân công'}
            </button>
            <button
              className="button button-secondary"
              onClick={() => setSelectedCustomerIds([])}
              style={{ height: 34, padding: '0 10px', fontSize: '0.8rem' }}
              type="button"
            >
              Bỏ chọn
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="sales-cust-table-card">
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#64748b' }}>
            <p>Đang tải danh sách phân công khách hàng...</p>
          </div>
        ) : error ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#dc2626' }}>
            <p>⚠ {error}</p>
            <button
              className="sales-cust-btn-secondary"
              onClick={fetchAssignments}
              type="button"
            >
              Thử lại
            </button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="sales-cust-empty">
            <div className="sales-cust-empty-icon">📂</div>
            <h4 className="sales-cust-empty-title">Không có khách hàng nào khớp bộ lọc</h4>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="sales-cust-table">
              <thead>
                <tr>
                  <th style={{ width: 42, textAlign: 'center' }}>
                    <input
                      checked={
                        filteredCustomers.length > 0
                        && filteredCustomers.every((c) => selectedCustomerIds.includes(c.id))
                      }
                      onChange={handleToggleSelectAllVisible}
                      title="Chọn tất cả"
                      type="checkbox"
                    />
                  </th>
                  <th>Khách hàng &amp; Mã số thuế</th>
                  <th>Lĩnh vực &amp; Địa chỉ</th>
                  <th style={{ textAlign: 'center' }}>Thiết bị / Đơn YC</th>
                  <th style={{ minWidth: 260 }}>Nhân viên Sales phụ trách (1-1)</th>
                  <th>Lịch sử phân công</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => {
                  const isAssigned = Boolean(c.assigned_sales_id);
                  const isSaving = savingCustomerId === c.id;
                  return (
                    <tr key={c.id}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          checked={selectedCustomerIds.includes(c.id)}
                          onChange={() => handleToggleSelectCustomer(c.id)}
                          type="checkbox"
                        />
                      </td>
                      <td>
                        <div className="sales-cust-title-cell">
                          <Link
                            style={{ color: '#1a4ea6', textDecoration: 'none' }}
                            to={`/internal/sales/customers/${c.id}`}
                          >
                            {c.company_name}
                          </Link>
                        </div>
                        <div className="sales-cust-sub-cell">
                          <span className="sales-cust-badge sales-cust-badge--code">
                            MST: {c.tax_code || 'Chưa cập nhật'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="sales-cust-badge sales-cust-badge--industry">
                          {c.industry || 'Chưa phân loại'}
                        </span>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: '#64748b',
                            marginTop: 4,
                            maxWidth: 260,
                          }}
                        >
                          {c.address}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="sales-cust-pill-count" title="Số thiết bị">
                          ⚙ {c.devices_count ?? 0}
                        </span>{' '}
                        <span className="sales-cust-pill-count" title="Số phiếu yêu cầu">
                          📋 {c.service_requests_count ?? 0}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <select
                            className="sales-cust-select"
                            disabled={isSaving}
                            onChange={(e) => handleAssignSingle(c, e.target.value)}
                            style={{
                              width: '100%',
                              borderColor: isAssigned ? '#86efac' : '#fcd34d',
                              background: isAssigned ? '#f0fdf4' : '#fffbeb',
                              fontWeight: 600,
                              color: isAssigned ? '#166534' : '#92400e',
                            }}
                            value={c.assigned_sales_id ? String(c.assigned_sales_id) : ''}
                          >
                            <option value="">-- ⚠ Chưa gán Sales phụ trách --</option>
                            {salesStaff.map((s) => (
                              <option key={s.id} value={String(s.id)}>
                                ✓ {s.full_name} ({s.email})
                              </option>
                            ))}
                          </select>
                          {isSaving && (
                            <span style={{ fontSize: '0.78rem', color: '#1a56db' }}>⏳</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {isAssigned ? (
                          <div>
                            <div>
                              Phụ trách: <strong style={{ color: '#0f172a' }}>{c.assigned_sales_name}</strong>
                            </div>
                            {c.assigned_at && (
                              <div>
                                Gán lúc: {new Date(c.assigned_at).toLocaleString('vi-VN')}
                                {c.assigned_by_name ? ` bởi ${c.assigned_by_name}` : ''}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#b45309', fontWeight: 600 }}>
                            Chưa có Sales phụ trách
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal chi tiết tải công việc đội ngũ Sales */}
      {showWorkloadModal && (
        <div
          className="sales-cust-modal-backdrop"
          onClick={() => setShowWorkloadModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            className="sales-cust-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 760,
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 800 }}>
                  👥 Bảng phân bổ tải công việc của đội ngũ Sales
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Hệ thống ghi nhận {salesStaff.length} nhân viên Sales đang hoạt động
                </p>
              </div>
              <button
                className="sales-cust-modal-close"
                onClick={() => setShowWorkloadModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 4,
                }}
                type="button"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Nhân viên Sales</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700 }}>Email</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Số khách phụ trách</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'center' }}>Số đơn YC</th>
                    <th style={{ padding: '10px 12px', color: '#475569', fontWeight: 700, textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {salesStaff.map((staff) => (
                    <tr
                      key={staff.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: String(salesFilter) === String(staff.id) ? '#eff6ff' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '12px', fontWeight: 600, color: '#0f172a' }}>
                        👤 {staff.full_name}
                      </td>
                      <td style={{ padding: '12px', color: '#64748b' }}>
                        {staff.email}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: 999,
                            background: '#dbeafe',
                            color: '#1e40af',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                          }}
                        >
                          {staff.assigned_customers_count} khách
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>
                        {staff.service_requests_count || 0}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <button
                          className="button button-sm button-secondary"
                          onClick={() => {
                            setSalesFilter(String(staff.id));
                            setShowWorkloadModal(false);
                          }}
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                          type="button"
                        >
                          Lọc khách hàng 🔍
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                background: '#f8fafc',
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
              }}
            >
              <button
                className="button button-secondary"
                onClick={() => setShowWorkloadModal(false)}
                type="button"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

