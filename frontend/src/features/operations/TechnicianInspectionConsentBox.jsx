import { useRef, useState } from 'react';
import {
  deleteFileFromCloudApi,
  readFileAsDataUrl,
  uploadFileToCloudApi,
} from '../../services/work-order-service.js';

export default function TechnicianInspectionConsentBox({
  task,
  disabled = false,
  onSubmitConsent,
  isMobile = false,
}) {
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [signerName, setSignerName] = useState(task.customer || '');
  const [consentMethod, setConsentMethod] = useState('WrittenDocument');
  const [note, setNote] = useState('');
  const [consentFile, setConsentFile] = useState('');
  const [consentFileName, setConsentFileName] = useState('');
  const [consentFilePublicId, setConsentFilePublicId] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [techConfirmed, setTechConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  if (!task || task.inspection !== 'Fail') return null;

  const isApproved = task.consentStatus === 'Approved';
  const isRejected = task.consentStatus === 'Rejected';

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
        // Fallback to base64 when offline
      }
      setConsentFile(finalUrl);
      setConsentFileName(file.name);
      setConsentFilePublicId(publicId);
    } catch {
      setError('Không thể đọc tệp đã chọn.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = async () => {
    const oldUrl = consentFile;
    const oldPublicId = consentFilePublicId;
    setConsentFile('');
    setConsentFileName('');
    setConsentFilePublicId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (oldPublicId || /^https?:\/\//i.test(oldUrl) || oldUrl.startsWith('/uploads/')) {
      try {
        await deleteFileFromCloudApi({ public_id: oldPublicId, url: oldUrl });
      } catch {
        // ignore
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!techConfirmed) {
      setError('Vui lòng tích xác nhận bạn đã nhận được sự đồng ý của khách hàng.');
      return;
    }
    if (!signerName.trim()) {
      setError('Vui lòng nhập tên người đại diện khách hàng.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSubmitConsent({
        signerName: signerName.trim(),
        consentMethod,
        note: note.trim(),
        consentFile,
      });
      setIsOpenForm(false);
    } catch (err) {
      setError(err?.message || 'Lỗi khi lưu xác nhận. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Case 1: Customer has Approved
  if (isApproved) {
    return (
      <div
        style={{
          marginTop: '12px',
          padding: isMobile ? '12px' : '14px',
          borderRadius: '10px',
          background: '#f0fdf4',
          border: '1px solid #86efac',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>🟢</span>
          <strong style={{ color: '#166534', fontSize: isMobile ? '0.78rem' : '0.84rem' }}>
            Khách hàng ĐÃ ĐỒNG Ý tiếp tục hiệu chuẩn (Approved)
          </strong>
        </div>
        <div style={{ fontSize: isMobile ? '0.72rem' : '0.76rem', color: '#1e293b', display: 'grid', gap: '4px' }}>
          <div>
            <strong>Người xác nhận: </strong>
            {task.consentSignerName || task.customer || 'Đại diện Khách hàng'}
          </div>
          <div>
            <strong>Phương thức: </strong>
            {task.consentMethod === 'OnlinePortal'
              ? '🌐 Cổng khách hàng trực tuyến (Online Portal)'
              : task.consentMethod === 'DirectSign'
              ? '✍️ Ký xác nhận trực tiếp tại hiện trường'
              : task.consentMethod === 'RemoteConfirmation'
              ? '📞 Xác nhận qua Điện thoại / Email'
              : '📄 Văn bản ủy quyền / Phiếu xác nhận giấy'}
          </div>
          {task.consentedAt && (
            <div>
              <strong>Thời gian: </strong>
              {new Date(task.consentedAt).toLocaleString('vi-VN')}
            </div>
          )}
          {task.consentNote && (
            <div>
              <strong>Ghi chú: </strong>
              {task.consentNote}
            </div>
          )}
          {task.consentFile && (
            <div style={{ marginTop: '6px' }}>
              <div style={{ fontWeight: 600, color: '#166534' }}>Văn bản đính kèm:</div>
              <img
                alt="Văn bản đính kèm"
                src={task.consentFile}
                style={{
                  maxHeight: '100px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  marginTop: '4px',
                }}
              />
            </div>
          )}
          <div style={{ marginTop: '6px', color: '#15803d', fontWeight: 700 }}>
            ✓ Đã mở khóa Bước 2 và Bước 3 cho kỹ thuật viên tiếp tục thực hiện đo.
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Customer has Rejected
  if (isRejected) {
    return (
      <div
        style={{
          marginTop: '12px',
          padding: isMobile ? '12px' : '14px',
          borderRadius: '10px',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '1.2rem' }}>🔴</span>
          <strong style={{ color: '#991b1b', fontSize: isMobile ? '0.78rem' : '0.84rem' }}>
            Khách hàng TỪ CHỐI hiệu chuẩn (Rejected)
          </strong>
        </div>
        <p style={{ margin: '4px 0', fontSize: isMobile ? '0.72rem' : '0.76rem', color: '#7f1d1d' }}>
          Khách hàng không đồng ý hiệu chuẩn thiết bị này vì khiếm khuyết ngoại quan. Các bước đo kiểm bị khóa. Vui lòng chuyển thiết bị sang khu vực đóng gói bàn giao hoàn trả.
        </p>
        {task.consentNote && (
          <div style={{ fontSize: isMobile ? '0.72rem' : '0.76rem', color: '#991b1b', marginTop: '4px' }}>
            <strong>Lý do từ khách hàng: </strong> {task.consentNote}
          </div>
        )}
      </div>
    );
  }

  // Case 3: Pending Customer Consent
  return (
    <div
      style={{
        marginTop: '12px',
        padding: isMobile ? '12px' : '14px',
        borderRadius: '10px',
        background: '#fffbeb',
        border: '1px solid #fde68a',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '1.2rem' }}>🟡</span>
        <strong style={{ color: '#92400e', fontSize: isMobile ? '0.78rem' : '0.84rem' }}>
          Trạng thái Consent: Đang chờ xác nhận từ Khách hàng
        </strong>
      </div>

      <p style={{ margin: '4px 0 10px', fontSize: isMobile ? '0.72rem' : '0.76rem', color: '#78350f', lineHeight: 1.4 }}>
        Thiết bị không đạt kiểm tra ngoại quan. Cần văn bản cam kết của khách hàng để mở khóa các bước tiếp theo:
      </p>

      <ul style={{ margin: '0 0 12px 18px', padding: 0, fontSize: isMobile ? '0.7rem' : '0.74rem', color: '#78350f' }}>
        <li>Khách hàng có thể đăng nhập Cổng khách hàng (Online Portal) để xem ảnh lỗi và bấm Duyệt.</li>
        <li>Hoặc Kỹ thuật viên có thể trực tiếp ghi nhận văn bản ủy quyền / ký nhận tại chỗ dưới đây.</li>
      </ul>

      {!isOpenForm ? (
        <button
          className="button button-secondary"
          disabled={disabled}
          onClick={() => setIsOpenForm(true)}
          style={{
            width: '100%',
            padding: isMobile ? '8px 12px' : '8px 16px',
            fontSize: isMobile ? '0.75rem' : '0.78rem',
            fontWeight: 700,
            background: '#ffffff',
            borderColor: '#f59e0b',
            color: '#b45309',
          }}
          type="button"
        >
          ✍️ Ghi nhận Văn bản ủy quyền của Khách hàng tại chỗ (KTV)
        </button>
      ) : (
        <form
          onSubmit={handleFormSubmit}
          style={{
            marginTop: '10px',
            padding: '12px',
            borderRadius: '8px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <strong style={{ fontSize: isMobile ? '0.76rem' : '0.8rem', color: '#1e293b' }}>
              Biên bản Ủy quyền / Xác nhận Trực tiếp
            </strong>
            <button
              onClick={() => setIsOpenForm(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
              type="button"
            >
              ✕ Hủy
            </button>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Người đại diện khách hàng ký xác nhận *
            </label>
            <input
              disabled={disabled}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="VD: Nguyễn Văn A (Quản lý thiết bị)"
              required
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.75rem',
              }}
              type="text"
              value={signerName}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Hình thức xác nhận
            </label>
            <select
              disabled={disabled}
              onChange={(e) => setConsentMethod(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.75rem',
                background: '#ffffff',
              }}
              value={consentMethod}
            >
              <option value="WrittenDocument">📄 Văn bản ủy quyền / Phiếu xác nhận giấy</option>
              <option value="DirectSign">✍️ Ký xác nhận trực tiếp tại hiện trường</option>
              <option value="RemoteConfirmation">📞 Xác nhận qua Điện thoại / Email</option>
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Ghi chú thỏa thuận / Điều kiện của khách
            </label>
            <textarea
              disabled={disabled}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Khách hàng đồng ý bỏ qua vết nứt vỏ, chỉ yêu cầu đo dải 0-10V..."
              rows={2}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.75rem',
              }}
              value={note}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Chụp ảnh / Tải lên biên bản giấy có chữ ký
            </label>
            <input
              accept="image/*,.pdf"
              capture="environment"
              disabled={disabled || uploadingFile}
              onChange={handleFileUpload}
              ref={fileInputRef}
              style={{ fontSize: '0.72rem' }}
              type="file"
            />
            {uploadingFile && (
              <div style={{ marginTop: '6px', fontSize: '0.7rem', color: '#0284c7', fontWeight: 600 }}>
                ☁️ Đang tải ảnh/tệp lên Cloudinary...
              </div>
            )}
            {consentFile && !uploadingFile && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {!consentFile.toLowerCase().endsWith('.pdf') && (
                    <a href={consentFile} rel="noreferrer" target="_blank" title="Xem ảnh đầy đủ">
                      <img
                        alt="Ảnh biên bản"
                        src={consentFile}
                        style={{
                          height: '56px',
                          width: '56px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          border: '1px solid #94a3b8',
                        }}
                      />
                    </a>
                  )}
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 700 }}>
                      ✓ Đã tải lên: {consentFileName || 'Biên bản đính kèm'}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                      Đã lưu URL trên Cloudinary
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleRemoveFile}
                  style={{
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    color: '#dc2626',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  type="button"
                >
                  🗑 Xóa ảnh
                </button>
              </div>
            )}
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
              fontSize: '0.72rem',
              color: '#334155',
              marginBottom: '12px',
              cursor: 'pointer',
            }}
          >
            <input
              checked={techConfirmed}
              disabled={disabled}
              onChange={(e) => setTechConfirmed(e.target.checked)}
              style={{ marginTop: '2px' }}
              type="checkbox"
            />
            <span>
              Tôi xác nhận đã nhận được sự đồng ý của khách hàng và chịu trách nhiệm ghi nhận vào hệ thống.
            </span>
          </label>

          {error && (
            <div
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.72rem',
                marginBottom: '10px',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              className="button button-secondary"
              disabled={submitting}
              onClick={() => setIsOpenForm(false)}
              style={{ padding: '6px 12px', fontSize: '0.74rem' }}
              type="button"
            >
              Hủy
            </button>
            <button
              className="button button-primary"
              disabled={submitting || !techConfirmed}
              style={{
                padding: '6px 14px',
                fontSize: '0.74rem',
                fontWeight: 700,
                background: '#16a34a',
                borderColor: '#15803d',
              }}
              type="submit"
            >
              {submitting ? 'Đang lưu...' : '✓ Xác nhận & Mở khóa bước hiệu chuẩn'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

