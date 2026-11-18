import { useCallback, useEffect, useState } from 'react';
import {
  createMasterStandardApi,
  getMasterStandardsApi,
  updateMasterStandardApi,
} from '../../../../services/master-standard-service.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';
import StandardModal from './StandardModal.jsx';

function StandardsPage() {
  const [standards, setStandards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [onlyExpiring, setOnlyExpiring] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('success');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStandard, setEditingStandard] = useState(null);

  const fetchStandards = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMasterStandardsApi({
        status: filter,
        search: query,
        expiring_soon: onlyExpiring ? true : undefined,
      });
      setStandards(Array.isArray(data) ? data : []);
    } catch (err) {
      setFeedback('Không thể tải danh sách chuẩn đối chứng.');
      setFeedbackType('error');
    } finally {
      setLoading(false);
    }
  }, [filter, query, onlyExpiring]);

  useEffect(() => {
    fetchStandards();
  }, [fetchStandards]);

  const handleSaveStandard = async (payload) => {
    if (editingStandard) {
      await updateMasterStandardApi(editingStandard.id, payload);
      setFeedback(`Đã cập nhật chuẩn "${payload.name}" thành công.`);
      setFeedbackType('success');
    } else {
      await createMasterStandardApi(payload);
      setFeedback(`Đã thêm mới chuẩn "${payload.name}" thành công.`);
      setFeedbackType('success');
    }
    await fetchStandards();
  };

  const expiredCount = standards.filter((s) => s.is_expired).length;
  const expiringSoonCount = standards.filter((s) => s.expiring_soon).length;

  return (
    <ReviewerPageShell
      title="Quản lý Chuẩn đối chứng (Master Standard)"
      description="Quản lý danh mục chuẩn đo lường, theo dõi hạn hiệu chuẩn theo yêu cầu ISO/IEC 17025 mục 6.4."
      query={query}
      onSearchChange={setQuery}
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
    >
      {(expiredCount > 0 || expiringSoonCount > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
          {expiredCount > 0 && (
            <div style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: 8, padding: '14px 18px', color: '#991b1b' }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                <span>{expiredCount} chuẩn đã quá hạn hiệu chuẩn</span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>
                Các chuẩn này đã tự động bị khóa và KHÔNG được phép chọn khi phân công kỹ thuật viên thực hiện hiệu chuẩn.
              </p>
            </div>
          )}
          {expiringSoonCount > 0 && (
            <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8, padding: '14px 18px', color: '#92400e' }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.2rem' }}>⏳</span>
                <span>{expiringSoonCount} chuẩn sắp hết hạn (&le; 30 ngày)</span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>
                Cần gửi chuẩn đi liên kết chuẩn (traceability) tại Viện Đo lường hoặc phòng thử nghiệm được công nhận.
              </p>
            </div>
          )}
        </div>
      )}

      <section className="reviewer-card">
        <div className="reviewer-card-heading">
          <div>
            <h2>Danh mục Thiết bị chuẩn ({standards.length})</h2>
            <p>Hệ thống tự động kiểm tra liên kết chuẩn và hạn hiệu chuẩn theo thời gian thực.</p>
          </div>
          <button
            className="button button-primary"
            onClick={() => {
              setEditingStandard(null);
              setModalOpen(true);
            }}
            type="button"
          >
            + Thêm chuẩn mới
          </button>
        </div>

        <div className="filter-row reviewer-filter" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {['all', 'Active', 'Inactive', 'Expired'].map((status) => (
              <button
                key={status}
                aria-pressed={filter === status}
                className={`filter-chip${filter === status ? ' selected' : ''}`}
                onClick={() => setFilter(status)}
                type="button"
              >
                {status === 'all' ? 'Tất cả trạng thái' : status}
              </button>
            ))}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={onlyExpiring}
              onChange={(e) => setOnlyExpiring(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <span>Chỉ xem chuẩn sắp hết hạn (&le; 30 ngày)</span>
          </label>
        </div>

        {loading ? (
          <div style={{ padding: '40px text-center', textAlign: 'center', color: '#64748b' }}>Đang tải danh sách chuẩn...</div>
        ) : (
          <DataTable
            columns={[
              {
                key: 'serial_number',
                label: 'Số Serial',
                render: (row) => <code>{row.serial_number}</code>,
              },
              {
                key: 'name',
                label: 'Tên chuẩn đối chứng',
                render: (row) => (
                  <div>
                    <strong>{row.name}</strong>
                    {row.accuracy_class && (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
                        Cấp chính xác: {row.accuracy_class}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'calibration_expiry',
                label: 'Hạn hiệu chuẩn',
                render: (row) => {
                  const dateStr = row.calibration_expiry ? new Date(row.calibration_expiry).toLocaleDateString('vi-VN') : '—';
                  if (row.is_expired) {
                    return (
                      <div>
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>{dateStr}</span>
                        <div style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 500 }}>
                          Quá hạn {Math.abs(row.days_until_expiry)} ngày
                        </div>
                      </div>
                    );
                  }
                  if (row.expiring_soon) {
                    return (
                      <div>
                        <span style={{ color: '#d97706', fontWeight: 600 }}>{dateStr}</span>
                        <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 500 }}>
                          Còn {row.days_until_expiry} ngày
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div>
                      <span>{dateStr}</span>
                      <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>
                        Còn {row.days_until_expiry} ngày
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'status',
                label: 'Trạng thái',
                render: (row) => {
                  if (row.is_expired || row.status === 'Expired') {
                    return <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600 }}>Hết hạn</span>;
                  }
                  if (row.status === 'Active') {
                    return <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 600 }}>Hoạt động</span>;
                  }
                  return <StatusPill>{row.status}</StatusPill>;
                },
              },
              {
                key: 'action',
                label: 'Thao tác',
                render: (row) => (
                  <button
                    className="small-action"
                    onClick={() => {
                      setEditingStandard(row);
                      setModalOpen(true);
                    }}
                    type="button"
                  >
                    Chỉnh sửa
                  </button>
                ),
              },
            ]}
            rows={standards}
          />
        )}

        <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 6, fontSize: '0.85rem', color: '#475569' }}>
          <strong>Quy tắc ISO/IEC 17025 mục 6.4:</strong> Thiết bị chuẩn phải có chuỗi liên kết chuẩn đo lường (metrological traceability). Ngày hết hạn của chuẩn cần bao phủ toàn bộ khoảng thời gian thực hiện hiệu chuẩn (<code>scheduled_end</code>) của phân công kỹ thuật viên.
        </div>
      </section>

      {modalOpen && (
        <StandardModal
          standard={editingStandard}
          onClose={() => {
            setModalOpen(false);
            setEditingStandard(null);
          }}
          onSave={handleSaveStandard}
        />
      )}
    </ReviewerPageShell>
  );
}

export default StandardsPage;
