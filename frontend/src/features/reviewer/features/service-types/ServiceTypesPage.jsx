import { useCallback, useEffect, useState } from 'react';
import {
  createServiceTypeApi,
  getServiceTypesApi,
  updateServiceTypeApi,
} from '../../../../services/procedure-service.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';
import ServiceTypeModal, { FIELD_LABELS } from './ServiceTypeModal.jsx';

function ServiceTypesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState('');
  const [fieldFilter, setFieldFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const fetchServiceTypes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getServiceTypesApi({
        field: fieldFilter,
        kind: kindFilter,
        status: statusFilter,
        search: query,
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setFeedback('Không thể tải danh mục dịch vụ từ máy chủ.');
    } finally {
      setLoading(false);
    }
  }, [fieldFilter, kindFilter, statusFilter, query]);

  useEffect(() => {
    fetchServiceTypes();
  }, [fetchServiceTypes]);

  const handleSave = async (payload) => {
    if (editingItem) {
      await updateServiceTypeApi(editingItem.id, payload);
      setFeedback(`Đã cập nhật dịch vụ "${payload.name}" thành công.`);
    } else {
      await createServiceTypeApi(payload);
      setFeedback(`Đã tạo loại dịch vụ mới "${payload.name}".`);
    }
    fetchServiceTypes();
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const columns = [
    { key: 'id', label: 'ID', render: (row) => <strong>ST-{row.id}</strong> },
    {
      key: 'name',
      label: 'Tên dịch vụ & Mã',
      render: (row) => (
        <div>
          <strong>{row.name}</strong>
          <small style={{ display: 'block', color: '#6a7d8d' }}>Mã: {row.standard_code}</small>
        </div>
      ),
    },
    {
      key: 'kind',
      label: 'Loại hình',
      render: (row) => (
        <StatusPill tone={row.kind === 'Verification' ? 'warning' : 'info'}>
          {row.kind === 'Verification' ? 'Kiểm định (Bắt buộc)' : 'Hiệu chuẩn (Tự nguyện)'}
        </StatusPill>
      ),
    },
    {
      key: 'field',
      label: 'Lĩnh vực (1/8)',
      render: (row) => (
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
          {FIELD_LABELS[row.field] || row.field}
        </span>
      ),
    },
    {
      key: 'procedures',
      label: 'Quy trình áp dụng',
      render: (row) => (
        <div>
          {row.active_procedure ? (
            <span style={{ color: '#2b8a3e', fontWeight: 700 }}>
              ✓ Version {row.procedure_version} (Active)
            </span>
          ) : (
            <span style={{ color: '#d9480f', fontSize: '0.78rem' }}>
              ⚠ Chưa có quy trình Active
            </span>
          )}
          <small style={{ display: 'block', color: '#8292a0' }}>
            Tổng số: {row.procedures_count || 0} bản
          </small>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => (
        <StatusPill tone={row.status === 'Active' ? 'success' : 'neutral'}>
          {row.status}
        </StatusPill>
      ),
    },
    {
      key: 'action',
      label: 'Thao tác',
      render: (row) => (
        <button
          className="button button-secondary"
          onClick={() => handleOpenEdit(row)}
          style={{ padding: '3px 8px', fontSize: '0.72rem', minHeight: 26 }}
          type="button"
        >
          Sửa
        </button>
      ),
    },
  ];

  return (
    <ReviewerPageShell
      description="Quản lý danh mục loại hình dịch vụ kỹ thuật phân loại vào 8 Lĩnh vực đo lường theo chuẩn ISO/IEC 17025."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      onSearchChange={setQuery}
      query={query}
      title="Danh mục loại dịch vụ (ServiceType)"
    >
      <section className="reviewer-card">
        <div className="reviewer-card-heading">
          <div>
            <h2>ServiceType (8 Lĩnh vực kỹ thuật)</h2>
            <p>Mỗi loại dịch vụ liên kết với các phiên bản quy trình CalibrationProcedure.</p>
          </div>
          <button className="button button-primary" onClick={handleOpenAdd} type="button">
            + Thêm loại dịch vụ
          </button>
        </div>

        {/* BỘ LỌC */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '14px 0' }}>
          <select
            className="filter-chip"
            onChange={(e) => setFieldFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #dce5eb' }}
            value={fieldFilter}
          >
            <option value="all">Tất cả 8 Lĩnh vực</option>
            {Object.entries(FIELD_LABELS).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>

          <select
            className="filter-chip"
            onChange={(e) => setKindFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #dce5eb' }}
            value={kindFilter}
          >
            <option value="all">Tất cả loại hình</option>
            <option value="Calibration">Hiệu chuẩn</option>
            <option value="Verification">Kiểm định</option>
          </select>

          <select
            className="filter-chip"
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #dce5eb' }}
            value={statusFilter}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <DataTable
          columns={columns}
          emptyText={loading ? 'Đang tải dữ liệu danh mục...' : 'Không có dịch vụ nào phù hợp bộ lọc.'}
          rows={items}
        />
      </section>

      <ServiceTypeModal
        editingItem={editingItem}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </ReviewerPageShell>
  );
}

export default ServiceTypesPage;
