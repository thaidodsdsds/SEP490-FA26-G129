import { useEffect, useState } from 'react';
import Modal from '../../shared/Modal.jsx';
import { getEligibleCertificatesApi } from '../../../../services/seal-service.js';

const errorMessage = (error) =>
  error?.response?.data?.error?.message || error?.message || 'Không thể tải dữ liệu.';

function CreateSealModal({ onClose, onCreate }) {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadEligibleCertificates = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await getEligibleCertificatesApi();
      setCertificates(Array.isArray(list) ? list : []);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEligibleCertificates();
  }, []);

  const selected = certificates.find((item) => item.certificate_id === selectedId) || null;

  const handleSelect = (certificate) => {
    setSelectedId(certificate.certificate_id);
    setDueDate(certificate.default_due_date || '');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selected) return;
    if (!dueDate) {
      setError('Vui lòng chọn hạn hiệu lực cho tem.');
      return;
    }
    if (selected.default_cal_date && dueDate < selected.default_cal_date) {
      setError('Hạn hiệu lực phải sau hoặc bằng ngày hiệu chuẩn.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onCreate({
        certificate_id: selected.certificate_id,
        due_date: dueDate,
      });
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal eyebrow="Calibration seal" onClose={onClose} title="Phát hành tem hiệu chuẩn">
      <div className="modal-hint">
        Chỉ chứng nhận đã <strong>Released</strong> và có chữ ký số <strong>CertificateRelease</strong> mới đủ
        điều kiện phát hành tem. Hạn hiệu lực mặc định là 12 tháng kể từ ngày hiệu chuẩn và có thể điều chỉnh
        theo chu kỳ thực tế của thiết bị.
      </div>

      {loading ? (
        <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
          Đang tải danh sách chứng nhận đủ điều kiện...
        </div>
      ) : certificates.length === 0 && !error ? (
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
            Không có chứng nhận nào đủ điều kiện
          </strong>
          Tất cả chứng nhận đã phát hành đều đã có tem, hoặc chưa có chứng nhận nào được ký phát hành.
        </div>
      ) : (
        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '320px',
            overflowY: 'auto',
          }}
        >
          {certificates.map((certificate) => {
            const checked = selectedId === certificate.certificate_id;
            return (
              <label
                key={certificate.certificate_id}
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
                  name="seal-certificate"
                  onChange={() => handleSelect(certificate)}
                  style={{ marginTop: '3px' }}
                  type="radio"
                  value={certificate.certificate_id}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>
                      {certificate.device_name || `Thiết bị #${certificate.device_id}`}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#0369a1', fontWeight: 700 }}>
                      {certificate.certificate_no}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                    {certificate.customer_name || 'Chưa xác định khách hàng'}
                    {certificate.internal_code ? ` · ${certificate.internal_code}` : ''}
                    {certificate.serial_number ? ` · SN: ${certificate.serial_number}` : ''}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '4px' }}>
                    {certificate.service_name || 'Dịch vụ hiệu chuẩn'}
                    {certificate.signer_name ? ` · Ký bởi ${certificate.signer_name}` : ''}
                  </div>
                  <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: '2px' }}>
                    Hiệu chuẩn {certificate.default_cal_date || '—'} · Mặc định đến{' '}
                    {certificate.default_due_date_formatted || certificate.default_due_date || '—'}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}

      {selected ? (
        <div
          style={{
            marginTop: '14px',
            padding: '12px 14px',
            border: '1px solid #dbeafe',
            borderRadius: '9px',
            background: '#f8fbff',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '10px',
          }}
        >
          <div>
            <small style={{ display: 'block', color: '#64748b', fontSize: '0.66rem' }}>
              Ngày hiệu chuẩn
            </small>
            <strong style={{ fontSize: '0.78rem', color: '#0f172a' }}>
              {selected.default_cal_date || '—'}
            </strong>
          </div>
          <label style={{ display: 'grid', gap: '4px' }}>
            <span style={{ color: '#334155', fontSize: '0.68rem', fontWeight: 700 }}>
              Hạn hiệu lực của tem
            </span>
            <input
              className="form-input"
              min={selected.default_cal_date || undefined}
              onChange={(event) => setDueDate(event.target.value)}
              style={{ padding: '7px 9px', borderRadius: '7px', border: '1px solid #cbd5e1' }}
              type="date"
              value={dueDate}
            />
          </label>
        </div>
      ) : null}

      {error ? (
        <p className="reviewer-inline-error" role="alert" style={{ marginTop: '10px' }}>
          {error}
        </p>
      ) : null}

      <div className="modal-actions" style={{ marginTop: '18px' }}>
        <button className="button button-secondary" disabled={submitting} onClick={onClose} type="button">
          Hủy
        </button>
        <button
          className="button button-secondary"
          disabled={loading || submitting}
          onClick={loadEligibleCertificates}
          type="button"
        >
          ↻ Tải lại
        </button>
        <button
          className="button button-primary"
          disabled={!selected || submitting || loading}
          onClick={handleSubmit}
          type="button"
        >
          {submitting ? 'Đang phát hành...' : '✓ Phát hành tem'}
        </button>
      </div>
    </Modal>
  );
}

export default CreateSealModal;
