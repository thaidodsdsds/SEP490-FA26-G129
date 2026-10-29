import { useRef } from 'react';

const formatFileSize = (bytes) => {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function CustomerAttachmentStep({
  attachments,
  specialNotes,
  accessoriesNote,
  onAddFiles,
  onRemoveAttachment,
  onSpecialNotesChange,
  onAccessoriesNoteChange,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const fileList = Array.from(event.target.files || []);
    if (fileList.length > 0) {
      onAddFiles(fileList);
    }
    event.target.value = '';
  };

  return (
    <section className="csr-card" aria-labelledby="csr-step3-heading">
      <div className="csr-step-header">
        <span className="csr-step-badge">3</span>
        <div>
          <h2 id="csr-step3-heading">Tài liệu đính kèm & Ghi chú kỹ thuật (Tùy chọn)</h2>
          <p>
            Đính kèm hình ảnh tem nhãn máy, danh sách điểm đo yêu cầu đặc biệt hoặc phụ kiện bàn giao đi kèm thiết bị.
          </p>
        </div>
      </div>

      <div className="csr-notes-grid">
        <label className="csr-field">
          <span>Điểm hiệu chuẩn / Yêu cầu kỹ thuật cụ thể</span>
          <textarea
            onChange={(event) => onSpecialNotesChange(event.target.value)}
            placeholder="VD: Hiệu chuẩn tại các điểm nhiệt độ 20°C, 25°C, 30°C; xuất chứng nhận song ngữ Việt – Anh..."
            rows={3}
            value={specialNotes}
          />
        </label>

        <label className="csr-field">
          <span>Phụ kiện đi kèm khi bàn giao (dây đo, nguồn, đầu dò...)</span>
          <textarea
            onChange={(event) => onAccessoriesNoteChange(event.target.value)}
            placeholder="VD: 01 bộ que đo Fluke TL175, 01 túi đựng máy, 01 adapter nguồn 24VDC..."
            rows={3}
            value={accessoriesNote}
          />
        </label>
      </div>

      <div className="csr-upload-zone">
        <input
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          hidden
          multiple
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
        <div className="csr-upload-content">
          <span className="csr-upload-icon" aria-hidden="true">📎</span>
          <div>
            <strong>Tải lên tệp đính kèm (Attachments)</strong>
            <p>Hỗ trợ PDF, Excel, Word, ảnh chụp nhãn thiết bị (.jpg, .png) — tối đa 10 MB/tệp</p>
          </div>
          <button
            className="button button-secondary"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            + Chọn tệp từ máy tính
          </button>
        </div>

        {attachments.length > 0 && (
          <ul className="csr-attachment-list" aria-label="Danh sách tệp đã chọn">
            {attachments.map((file) => (
              <li className="csr-attachment-item" key={file.id}>
                <div className="csr-attachment-name">
                  <span aria-hidden="true">📄</span>
                  <div>
                    <strong>{file.file_name}</strong>
                    <small>{formatFileSize(file.size)}</small>
                  </div>
                </div>
                <button
                  aria-label={`Xóa tệp ${file.file_name}`}
                  className="csr-remove-file-btn"
                  onClick={() => onRemoveAttachment(file.id)}
                  type="button"
                >
                  Xóa
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default CustomerAttachmentStep;

