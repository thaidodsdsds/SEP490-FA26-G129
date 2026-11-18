import { useRef, useState } from 'react';
import {
  deleteFileFromCloudApi,
  readFileAsDataUrl,
  submitInspectionConsentApi,
  uploadFileToCloudApi,
} from '../../../../services/work-order-service.js';
import { extractApiErrorMessage } from '../../../../services/service-request-service.js';

export default function CustomerInspectionConsentModal({
  isOpen,
  onClose,
  item,
  defaultSignerName = '',
  onSuccess,
}) {
  const [decision, setDecision] = useState('Approved');
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [note, setNote] = useState('');
  const [consentFile, setConsentFile] = useState(null);
  const [consentFileName, setConsentFileName] = useState('');
  const [consentFilePublicId, setConsentFilePublicId] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [previewZoom, setPreviewZoom] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen || !item) return null;

  const inspection = item.initial_inspection;
  const isAlreadyDecided =
    inspection?.customer_consent_status === 'Approved' ||
    inspection?.customer_consent_status === 'Rejected';

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setError('');
    try {
      const base64 = await readFileAsDataUrl(file);
      let finalUrl = base64;
      let publicId = '';
      try {
        const uploaded = await uploadFileToCloudApi({
          fileData: base64,
          fileName: file.name,
          folder: 'consents',
        });
        if (uploaded?.url) {
          finalUrl = uploaded.url;
          publicId = uploaded.public_id || '';
        }
      } catch {
        // Fallback to base64
      }
      setConsentFile(finalUrl);
      setConsentFileName(file.name);
      setConsentFilePublicId(publicId);
    } catch {
      setError('Không thể đọc tệp đính kèm.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveConsentFile = async () => {
    const oldUrl = consentFile;
    const oldPublicId = consentFilePublicId;
    setConsentFile(null);
    setConsentFileName('');
    setConsentFilePublicId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (oldPublicId || /^https?:\/\//i.test(oldUrl || '') || (oldUrl || '').startsWith('/uploads/')) {
      try {
        await deleteFileFromCloudApi({ public_id: oldPublicId, url: oldUrl });
      } catch {
        // ignore
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!confirmed) {
      setError('Vui lòng tích chọn xác nhận cam kết trước khi gửi quyết định.');
      return;
    }
    if (decision === 'Approved' && !signerName.trim()) {
      setError('Vui lòng nhập họ và tên người đại diện ký phê duyệt.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        service_request_item_id: item.service_request_item_id || item.id,
        decision,
        signer_name: signerName.trim() || undefined,
        note: note.trim() || undefined,
        consent_file: consentFile || undefined,
        consent_method: 'OnlinePortal',
      };

      const result = await submitInspectionConsentApi(payload);
      if (onSuccess) onSuccess(result);
      onClose();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Lỗi khi gửi xác nhận. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      aria-modal="true"
      className="modal-backdrop"
      role="dialog"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        className="modal-content"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: isAlreadyDecided
              ? inspection?.customer_consent_status === 'Approved'
                ? '#f0fdf4'
                : '#fef2f2'
              : '#fffbeb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>
              {isAlreadyDecided
                ? inspection?.customer_consent_status === 'Approved'
                  ? '🟢'
                  : '🔴'
                : '⚠️'}
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b' }}>
                Xác nhận Ngoại quan & Quyết định Hiệu chuẩn
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Thiết bị: <strong>{item.device_name}</strong> (SN: {item.serial_number || '—'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              color: '#94a3b8',
            }}
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Inspection Failure Notice */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.2rem' }}>🔍</span>
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#991b1b', fontSize: '0.86rem' }}>
                  Kết quả kiểm tra ban đầu từ Kỹ thuật viên: KHÔNG ĐẠT (Inspection Fail)
                </strong>
                <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#7f1d1d' }}>
                  <strong>Mô tả khuyết tật: </strong>
                  {inspection?.defect_note || 'Không có mô tả chi tiết'}
                </p>
                {inspection?.inspected_at && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#991b1b' }}>
                    Thời gian kiểm tra:{' '}
                    {new Date(inspection.inspected_at).toLocaleString('vi-VN')}
                  </p>
                )}
              </div>
            </div>

            {/* Photo evidence */}
            {inspection?.photo_url && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#991b1b', marginBottom: '6px' }}>
                  Ảnh chụp bằng chứng ngoại quan:
                </div>
                <div
                  onClick={() => setPreviewZoom(!previewZoom)}
                  style={{
                    cursor: 'pointer',
                    display: 'inline-block',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #f87171',
                    maxHeight: previewZoom ? '400px' : '150px',
                    transition: 'all 0.2s',
                  }}
                  title="Bấm để phóng to/thu nhỏ ảnh"
                >
                  <img
                    alt="Ảnh ngoại quan lỗi"
                    src={inspection.photo_url}
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      maxHeight: previewZoom ? '400px' : '150px',
                      objectFit: 'contain',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                  (Bấm vào ảnh để phóng to/thu nhỏ)
                </div>
              </div>
            )}
          </div>

          {/* Already Decided View */}
          {isAlreadyDecided ? (
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                background:
                  inspection.customer_consent_status === 'Approved'
                    ? '#f0fdf4'
                    : '#fef2f2',
                border: `1px solid ${
                  inspection.customer_consent_status === 'Approved'
                    ? '#bbf7d0'
                    : '#fecaca'
                }`,
              }}
            >
              <h4
                style={{
                  margin: '0 0 10px',
                  fontSize: '0.92rem',
                  color:
                    inspection.customer_consent_status === 'Approved'
                      ? '#166534'
                      : '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {inspection.customer_consent_status === 'Approved'
                  ? '✓ Quý khách đã ĐỒNG Ý tiếp tục hiệu chuẩn'
                  : '✕ Quý khách đã TỪ CHỐI hiệu chuẩn & yêu cầu hoàn trả'}
              </h4>
              <div style={{ fontSize: '0.82rem', color: '#334155', display: 'grid', gap: '6px' }}>
                <div>
                  <strong>Người xác nhận / ký: </strong>
                  {inspection.customer_consent_signer_name || 'Đại diện Khách hàng'}
                </div>
                <div>
                  <strong>Hình thức phê duyệt: </strong>
                  {inspection.customer_consent_method === 'OnlinePortal'
                    ? '🌐 Cổng thông tin khách hàng trực tuyến (Online Portal)'
                    : inspection.customer_consent_method === 'DirectSign'
                    ? '✍️ Ký xác nhận trực tiếp tại hiện trường'
                    : '📄 Văn bản ủy quyền / Phiếu xác nhận giấy'}
                </div>
                {inspection.customer_consented_at && (
                  <div>
                    <strong>Thời gian xác nhận: </strong>
                    {new Date(inspection.customer_consented_at).toLocaleString('vi-VN')}
                  </div>
                )}
                {inspection.customer_consent_note && (
                  <div>
                    <strong>Ghi chú / Thỏa thuận: </strong>
                    {inspection.customer_consent_note}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Action Form for Customer Decision */
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Lựa chọn quyết định của Quý khách:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    onClick={() => setDecision('Approved')}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: decision === 'Approved' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                      background: decision === 'Approved' ? '#f0fdf4' : '#ffffff',
                      color: decision === 'Approved' ? '#15803d' : '#475569',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    type="button"
                  >
                    <span style={{ fontSize: '1.2rem' }}>✓</span>
                    <span>Đồng ý Hiệu chuẩn</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 400 }}>Chấp nhận sai lệch ngoại quan</span>
                  </button>

                  <button
                    onClick={() => setDecision('Rejected')}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: decision === 'Rejected' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                      background: decision === 'Rejected' ? '#fef2f2' : '#ffffff',
                      color: decision === 'Rejected' ? '#b91c1c' : '#475569',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    type="button"
                  >
                    <span style={{ fontSize: '1.2rem' }}>✕</span>
                    <span>Từ chối & Hoàn trả</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 400 }}>Dừng dịch vụ & gửi trả thiết bị</span>
                  </button>
                </div>
              </div>

              {/* Form fields based on decision */}
              {decision === 'Approved' ? (
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Họ và tên người phê duyệt / đại diện ký *
                    </label>
                    <input
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="VD: Nguyễn Văn A (Quản lý thiết bị)"
                      required
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                      }}
                      type="text"
                      value={signerName}
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Ghi chú / Điều kiện thỏa thuận bổ sung (nếu có)
                    </label>
                    <textarea
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="VD: Chỉ đo dải 0–50 bar; công ty chấp nhận khiếm khuyết vỏ ngoài..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                      }}
                      value={note}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Đính kèm văn bản / công văn đồng ý (tùy chọn)
                    </label>
                    <input
                      accept="image/*,.pdf,.doc,.docx"
                      disabled={uploadingFile}
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                      style={{ fontSize: '0.8rem' }}
                      type="file"
                    />
                    {uploadingFile && (
                      <div style={{ marginTop: '6px', fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>
                        ☁️ Đang tải tệp lên Cloudinary...
                      </div>
                    )}
                    {consentFile && !uploadingFile && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {!/\.(pdf|doc|docx)$/i.test(consentFileName || consentFile) && (
                            <a href={consentFile} rel="noreferrer" target="_blank" title="Xem ảnh">
                              <img
                                alt="Văn bản đính kèm"
                                src={consentFile}
                                style={{
                                  height: '54px',
                                  width: '54px',
                                  objectFit: 'cover',
                                  borderRadius: '6px',
                                  border: '1px solid #94a3b8',
                                }}
                              />
                            </a>
                          )}
                          <div>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534' }}>
                              ✓ Đã tải lên: {consentFileName || 'Tệp đính kèm'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              Đã lưu trên Cloudinary
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleRemoveConsentFile}
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            color: '#dc2626',
                            borderRadius: '6px',
                            padding: '5px 10px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          type="button"
                        >
                          🗑 Xóa tệp
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Lý do từ chối & Yêu cầu bàn giao hoàn trả
                    </label>
                    <textarea
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="VD: Thiết bị hư hỏng nghiêm trọng, yêu cầu ISOCAL đóng gói gửi trả lại nhà máy."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.85rem',
                      }}
                      value={note}
                    />
                  </div>
                </div>
              )}

              {/* Commitment Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '0.8rem',
                  color: '#334155',
                  marginBottom: '16px',
                  cursor: 'pointer',
                }}
              >
                <input
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  style={{ marginTop: '3px' }}
                  type="checkbox"
                />
                <span>
                  {decision === 'Approved'
                    ? 'Tôi đã xem xét đầy đủ ảnh chụp và mô tả khuyết tật ngoại quan, đồng ý tiếp tục quy trình hiệu chuẩn và chịu trách nhiệm về các giới hạn đo lường liên quan.'
                    : 'Tôi xác nhận từ chối hiệu chuẩn thiết bị này và yêu cầu ISOCAL tiến hành thủ tục hoàn trả.'}
                </span>
              </label>

              {error && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '0.8rem',
                    marginBottom: '14px',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  className="button button-secondary"
                  disabled={submitting}
                  onClick={onClose}
                  type="button"
                >
                  Đóng
                </button>
                <button
                  className={`button ${decision === 'Approved' ? 'button-primary' : 'button-danger'}`}
                  disabled={submitting || !confirmed}
                  style={{
                    minWidth: '160px',
                    background: decision === 'Approved' ? '#16a34a' : '#dc2626',
                    borderColor: decision === 'Approved' ? '#15803d' : '#b91c1c',
                  }}
                  type="submit"
                >
                  {submitting
                    ? 'Đang gửi quyết định...'
                    : decision === 'Approved'
                    ? 'Xác nhận Đồng ý Hiệu chuẩn'
                    : 'Xác nhận Từ chối & Gửi trả'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

