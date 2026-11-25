import { useEffect, useState } from 'react';
import Modal from '../../shared/Modal.jsx';
import { getEligibleCalibrationRecordsApi } from '../../../../services/certificate-service.js';

const errorMessage = (error) =>
  error?.response?.data?.error?.message || error?.message || 'Không thể tải dữ liệu.';

function IssueCertificateModal({ onClose, onIssue }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadEligibleRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await getEligibleCalibrationRecordsApi();
      setRecords(Array.isArray(list) ? list : []);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEligibleRecords();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedId) return;
    setSubmitting(true);
    setError('');
    try {
      await onIssue(selectedId);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal eyebrow="Certificate" onClose={onClose} title="Cấp chứng nhận hiệu chuẩn">
      <div className="modal-hint">
        Chỉ hồ sơ đã được soát xét (Approved) và đạt yêu cầu (Pass) mới đủ điều kiện cấp chứng nhận. Chứng nhận được tạo ở
        trạng thái <strong>Draft</strong> và cần ký phát hành để chuyển sang <strong>Released</strong>.
      </div>

      {loading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          Đang tải danh sách hồ sơ đủ điều kiện...
        </div>
      ) : records.length === 0 && !error ? (
        <div
          style={{
            marginTop: '14px',
            padding: '22px',
            borderRadius: '10px',
            border: '1px dashed #cbd5e1',
            background: '#f8fafc',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.8rem',
          }}
        >
          <strong style={{ display: 'block', color: '#334155', marginBottom: '4px' }}>
            Không có hồ sơ nào đủ điều kiện
          </strong>
          Tất cả hồ sơ đã duyệt đều đã có chứng nhận, hoặc chưa có hồ sơ đạt yêu cầu.
        </div>
      ) : (
        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '340px',
            overflowY: 'auto',
          }}
        >
          {records.map((record) => {
            const checked = selectedId === record.record_id;
            return (
              <label
                key={record.record_id}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'flex-start',
                  padding: '10px 12px',
                  borderRadius: '9px',
                  border: checked ? '1px solid #0284c7' : '1px solid #e2e8f0',
                  background: checked ? '#f0f9ff' : '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <input
                  checked={checked}
                  name="calibration-record"
                  onChange={() => setSelectedId(record.record_id)}
                  style={{ marginTop: '3px' }}
                  type="radio"
                  value={record.record_id}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>
                      {record.device_name || `Thiết bị #${record.device_id}`}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#0369a1', fontWeight: 700 }}>
                      {record.record_code}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                    {record.customer_name || 'Chưa xác định khách hàng'}
                    {record.model ? ` · Model: ${record.model}` : ''}
                    {record.serial_number ? ` · SN: ${record.serial_number}` : ''}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '4px' }}>
                    {record.service_name || 'Dịch vụ hiệu chuẩn'}
                    {record.procedure_version ? ` · Quy trình ${record.procedure_version}` : ''}
                    {record.reviewed_at_formatted ? ` · Duyệt: ${record.reviewed_at_formatted}` : ''}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {error && (
        <p className="reviewer-inline-error" role="alert" style={{ marginTop: '10px' }}>
          {error}
        </p>
      )}

      <div className="modal-actions" style={{ marginTop: '18px' }}>
        <button className="button button-secondary" disabled={submitting} onClick={onClose} type="button">
          Hủy
        </button>
        <button
          className="button button-secondary"
          disabled={loading || submitting}
          onClick={loadEligibleRecords}
          type="button"
        >
          ↻ Tải lại
        </button>
        <button
          className="button button-primary"
          disabled={!selectedId || submitting || loading}
          onClick={handleSubmit}
          type="button"
        >
          {submitting ? 'Đang cấp...' : '✓ Cấp chứng nhận'}
        </button>
      </div>
    </Modal>
  );
}

export default IssueCertificateModal;
