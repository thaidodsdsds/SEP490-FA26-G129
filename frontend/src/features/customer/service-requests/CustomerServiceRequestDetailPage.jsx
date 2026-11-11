import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../app/providers.jsx';
import { extractApiErrorMessage, getServiceRequestDetailApi } from '../../../services/service-request-service.js';
import CustomerInspectionConsentModal from './components/CustomerInspectionConsentModal.jsx';
import ServiceRequestCancelModal from './components/ServiceRequestCancelModal.jsx';
import ServiceRequestEditModal from './components/ServiceRequestEditModal.jsx';
import ServiceRequestStatusBadge from './components/ServiceRequestStatusBadge.jsx';
import './service-requests-manage.css';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return String(dateString).slice(0, 10);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(dateString);
  }
};

const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const extractRejectionReason = (specialNotes, quotationCode) => {
  if (!specialNotes || typeof specialNotes !== 'string') return '';
  if (quotationCode) {
    const regex = new RegExp(`\\[Khách từ chối báo giá ${quotationCode}:\\s*([^\\]]+)\\]`, 'i');
    const match = specialNotes.match(regex);
    if (match) return match[1].trim();
  }
  const genericMatch = specialNotes.match(/\[Khách từ chối báo giá[^:]*:\s*([^\]]+)\]/i);
  return genericMatch ? genericMatch[1].trim() : '';
};

const WORKFLOW_STEPS = [
  { key: 'New', label: '1. Tiếp nhận' },
  { key: 'Quoted', label: '2. Báo giá' },
  { key: 'Confirmed', label: '3. Xác nhận' },
  { key: 'InProgress', label: '4. Thực hiện' },
  { key: 'Completed', label: '5. Hoàn thành' },
];

function CustomerServiceRequestDetailPage({ role = 'customer' }) {
  const { user } = useAppContext() || {};
  const { id } = useParams();
  const navigate = useNavigate();
  const isSales = role === 'sales';

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedConsentItem, setSelectedConsentItem] = useState(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getServiceRequestDetailApi(id);
      setDetail(data);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Không thể tải thông tin chi tiết phiếu yêu cầu.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleEditSuccess = (updated) => {
    setDetail(updated);
    showToast('Đã lưu các thay đổi cho phiếu yêu cầu.');
  };

  const handleCancelSuccess = (updated) => {
    setDetail(updated);
    showToast('Đã hủy phiếu yêu cầu thành công.');
  };

  const listPath = isSales ? '/internal/sales/service-requests' : '/internal/customer/service-requests';

  if (loading) {
    return (
      <div className="sr-manage-page" style={{ paddingTop: '40px' }}>
        <div className="sr-empty-state">
          <div className="csr-company-icon" style={{ margin: '0 auto 12px' }}>⏳</div>
          <h3>Đang tải chi tiết phiếu yêu cầu #{id}...</h3>
          <p>Vui lòng đợi giây lát.</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="sr-manage-page" style={{ paddingTop: '40px' }}>
        <div className="csr-inline-error" style={{ marginBottom: '16px' }}>
          {error || 'Không tìm thấy phiếu yêu cầu dịch vụ.'}
        </div>
        <Link className="button button-secondary" to={listPath}>
          ← Quay lại danh sách đơn
        </Link>
      </div>
    );
  }

  const isCancelled = detail.status === 'Cancelled';
  const currentStepIndex = WORKFLOW_STEPS.findIndex((s) => s.key === detail.status);
  const items = Array.isArray(detail.items) ? detail.items : [];
  const failedInspectionItems = items.filter(
    (item) => item.initial_inspection?.result === 'Fail',
  );
  const attachments = Array.isArray(detail.attachments) ? detail.attachments : [];
  const quotation = detail.latest_quotation;
  const allQuotations = Array.isArray(detail.quotations)
    ? detail.quotations
    : (quotation ? [quotation] : []);

  return (
    <div className="sr-manage-page">
      {/* Breadcrumb & Navigation */}
      <nav aria-label="Đường dẫn" className="sr-breadcrumb">
        <Link to={listPath}>← Danh sách đơn dịch vụ</Link>
        <span aria-hidden="true">/</span>
        <span>{detail.request_code || `SR-${detail.id}`}</span>
      </nav>

      {/* Header */}
      <header className="sr-detail-header">
        <div>
          <div className="sr-title-row">
            <h1>{detail.request_code || `SR-2026-${String(detail.id).padStart(3, '0')}`}</h1>
            <ServiceRequestStatusBadge status={detail.status} />
            <span className={`sr-location-badge ${detail.location_type === 'On-site' ? 'sr-location-badge--onsite' : ''}`}>
              {detail.location_type === 'On-site' ? '⌖ Tận nơi (On-site)' : '⚲ Tại Lab (In-lab)'}
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: '#687f92', marginTop: '6px' }}>
            Ngày tạo: <strong>{formatDate(detail.created_at)}</strong> · Khách hàng: <strong>{detail.customer?.company_name}</strong>
          </div>
        </div>

        <div className="sr-header-btns">
          {isSales && (
            (detail.status === 'New' && !quotation) ? (
              <Link
                className="button button-primary"
                to={`/internal/sales/quotations?requestId=${detail.id}`}
              >
                ₫ Lập báo giá cho đơn này
              </Link>
            ) : (quotation?.status === 'Rejected' && !allQuotations.some((q) => q.status === 'Draft' || q.status === 'PendingApproval' || q.status === 'Sent' || q.status === 'Approved')) ? (
              <Link
                className="button button-primary"
                to={`/internal/sales/quotations?requestId=${detail.id}`}
              >
                ₫ Lập báo giá mới (báo giá lại)
              </Link>
            ) : quotation?.status === 'Draft' ? (
              <Link
                className="button button-secondary"
                to={`/internal/sales/quotations?requestId=${detail.id}`}
              >
                ✎ Tiếp tục sửa bản nháp
              </Link>
            ) : null
          )}

          {detail.can_edit && (
            <button
              className="button button-secondary"
              onClick={() => setEditModalOpen(true)}
              type="button"
            >
              ✎ Chỉnh sửa
            </button>
          )}

          {detail.can_cancel && (
            <button
              className="button button-danger"
              onClick={() => setCancelModalOpen(true)}
              type="button"
            >
              ✕ Hủy đơn
            </button>
          )}
        </div>
      </header>

      {toastMessage && (
        <div className="csr-receipt-card" style={{ marginBottom: '20px' }}>
          <div className="csr-receipt-icon">✓</div>
          <div className="csr-receipt-body">
            <strong>Thành công:</strong> {toastMessage}
          </div>
        </div>
      )}

      {/* Workflow Progress Tracker */}
      {isCancelled ? (
        <div className="sr-cancelled-alert">
          <span style={{ fontSize: '1.4rem' }} aria-hidden="true">✕</span>
          <div>
            <strong>Phiếu yêu cầu này đã được hủy</strong>
            <p style={{ margin: 0 }}>
              Tiến trình đã dừng lại và đơn không thể chỉnh sửa thêm. Nếu có nhầm lẫn, vui lòng liên hệ bộ phận chăm sóc khách hàng hoặc tạo phiếu mới.
            </p>
          </div>
        </div>
      ) : (
        <section aria-label="Tiến trình xử lý" className="sr-workflow-tracker">
          {WORKFLOW_STEPS.map((step, idx) => {
            const isDone = currentStepIndex > idx;
            const isActive = currentStepIndex === idx;

            return (
              <div
                className={`sr-step-node ${isDone ? 'is-done' : ''} ${isActive ? 'is-active' : ''}`}
                key={step.key}
              >
                <div className="sr-step-circle">{isDone ? '✓' : idx + 1}</div>
                <div className="sr-step-text">{step.label}</div>
              </div>
            );
          })}
        </section>
      )}

      {/* Main Grid */}
      <div className="sr-detail-grid">
        {/* Left Column */}
        <div className="sr-detail-main">
          {/* Banner Cảnh báo Kiểm tra Ngoại quan không đạt */}
          {failedInspectionItems.length > 0 && (
            <div
              style={{
                marginBottom: '20px',
                padding: '16px 20px',
                borderRadius: '12px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', color: '#92400e', fontWeight: 700 }}>
                    Yêu cầu Xác nhận: Có {failedInspectionItems.length} thiết bị không đạt kiểm tra ngoại quan ban đầu
                  </h3>
                  <p style={{ margin: '6px 0 12px', fontSize: '0.82rem', color: '#78350f', lineHeight: 1.5 }}>
                    Kỹ thuật viên phòng đo ISOCAL đã phát hiện khuyết tật ngoại quan (móp méo, nứt vỡ hoặc trầy xước bề mặt) trên thiết bị.
                    Để đảm bảo độ tin cậy và quyền lợi của Quý khách, vui lòng xem ảnh chụp thực tế và đưa ra quyết định xác nhận tiếp tục hiệu chuẩn hoặc yêu cầu gửi trả thiết bị.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {failedInspectionItems.map((fi) => {
                      const isApproved =
                        fi.initial_inspection?.customer_consent_status === 'Approved';
                      const isRejected =
                        fi.initial_inspection?.customer_consent_status === 'Rejected';
                      const isPending = !isApproved && !isRejected;

                      return (
                        <button
                          key={fi.id}
                          className="button"
                          onClick={() => setSelectedConsentItem(fi)}
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            borderRadius: '20px',
                            background: isPending ? '#f59e0b' : isApproved ? '#16a34a' : '#dc2626',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                          type="button"
                        >
                          <span>{isPending ? '⚠️ Cần duyệt: ' : isApproved ? '✓ Đã đồng ý: ' : '✕ Đã từ chối: '}</span>
                          <span>{fi.device_name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Danh mục thiết bị & dịch vụ */}
          <section className="sr-card" aria-labelledby="heading-items">
            <h2 className="sr-card-title" id="heading-items">
              <span>Thiết bị & Dịch vụ yêu cầu ({items.length})</span>
              <span className="sr-badge-count">{items.length} thiết bị</span>
            </h2>

            {items.length === 0 ? (
              <div className="csr-empty-box">Chưa có thiết bị nào trong phiếu yêu cầu.</div>
            ) : (
              <div className="sr-table-wrapper">
                <table className="sr-detail-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Tên thiết bị</th>
                      <th>Hãng & Model</th>
                      <th>Số Serial / Mã nội bộ</th>
                      <th>Dịch vụ yêu cầu</th>
                      <th>Kiểm tra ngoại quan</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const insp = item.initial_inspection;
                      const isApproved = insp?.customer_consent_status === 'Approved';
                      const isRejected = insp?.customer_consent_status === 'Rejected';

                      return (
                        <tr key={item.id || idx}>
                          <td style={{ color: '#8c9ba5', fontWeight: 600 }}>{idx + 1}</td>
                          <td className="sr-device-row">
                            <strong>{item.device_name}</strong>
                          </td>
                          <td>
                            <span>{item.manufacturer || '—'}</span>
                            {item.model && <small style={{ display: 'block', color: '#687f92' }}>Mod: {item.model}</small>}
                          </td>
                          <td>
                            <div className="sr-device-tags">
                              {item.serial_number && <span className="sr-meta-tag">SN: {item.serial_number}</span>}
                              {item.internal_code && <span className="sr-meta-tag">Mã: {item.internal_code}</span>}
                              {!item.serial_number && !item.internal_code && <span style={{ color: '#a0aec0' }}>—</span>}
                            </div>
                          </td>
                          <td>
                            <strong>{item.service_type_name}</strong>
                            <span style={{ display: 'block', fontSize: '0.74rem', color: '#2b6cb0' }}>
                              {item.service_kind === 'Calibration' ? 'Hiệu chuẩn' : item.service_kind}
                            </span>
                          </td>
                          <td>
                            {insp ? (
                              insp.result === 'Pass' ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    background: '#f0fdf4',
                                    color: '#166534',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    border: '1px solid #bbf7d0',
                                  }}
                                >
                                  ✓ Ngoại quan: Đạt
                                </span>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 8px',
                                      borderRadius: '10px',
                                      background: isApproved
                                        ? '#f0fdf4'
                                        : isRejected
                                        ? '#fef2f2'
                                        : '#fffbeb',
                                      color: isApproved
                                        ? '#166534'
                                        : isRejected
                                        ? '#991b1b'
                                        : '#b45309',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      border: `1px solid ${
                                        isApproved
                                          ? '#bbf7d0'
                                          : isRejected
                                          ? '#fecaca'
                                          : '#fde68a'
                                      }`,
                                    }}
                                  >
                                    {isApproved
                                      ? '✓ Đã duyệt tiếp tục'
                                      : isRejected
                                      ? '✕ Từ chối hiệu chuẩn'
                                      : '⚠️ Không đạt (Cần xác nhận)'}
                                  </span>
                                  <button
                                    onClick={() => setSelectedConsentItem(item)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      padding: 0,
                                      color: '#1a56db',
                                      fontSize: '0.72rem',
                                      cursor: 'pointer',
                                      textDecoration: 'underline',
                                      fontWeight: 500,
                                    }}
                                    type="button"
                                  >
                                    Xem chi tiết lỗi & Quyết định
                                  </button>
                                </div>
                              )
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.74rem' }}>Chưa kiểm tra</span>
                            )}
                          </td>
                          <td>
                            <span className="sr-meta-tag" style={{ background: '#edf2f7', color: '#2d3748' }}>
                              {item.status === 'Pending' ? 'Chờ nhận mẫu' : item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Section: Yêu cầu kỹ thuật & Phụ kiện */}
          <section className="sr-card" aria-labelledby="heading-specs">
            <h2 className="sr-card-title" id="heading-specs">
              Ghi chú kỹ thuật & Phụ kiện bàn giao
            </h2>

            <div className="sr-notes-box">
              <div className="sr-note-item">
                <h4>🎯 Điểm hiệu chuẩn / Yêu cầu kỹ thuật cụ thể</h4>
                <p>
                  {detail.special_notes?.trim()
                    ? detail.special_notes
                    : 'Không có yêu cầu kỹ thuật đặc biệt. Thực hiện theo quy trình chuẩn của phòng đo.'}
                </p>
              </div>

              <div className="sr-note-item">
                <h4>📦 Phụ kiện đi kèm khi bàn giao</h4>
                <p>
                  {detail.accessories_note?.trim()
                    ? detail.accessories_note
                    : 'Không bàn giao phụ kiện kèm theo thiết bị.'}
                </p>
              </div>
            </div>
          </section>

          {/* Section: Tệp đính kèm */}
          <section className="sr-card" aria-labelledby="heading-attachments">
            <h2 className="sr-card-title" id="heading-attachments">
              <span>Tệp đính kèm ({attachments.length})</span>
              <span className="sr-badge-count">{attachments.length} tệp</span>
            </h2>

            {attachments.length === 0 ? (
              <div className="csr-empty-box">Không có tệp đính kèm nào được tải lên cho phiếu này.</div>
            ) : (
              <div className="sr-attachments-grid">
                {attachments.map((file) => {
                  const isViewableUrl =
                    file.file_url &&
                    (/^https?:\/\//i.test(file.file_url) ||
                      file.file_url.startsWith('/uploads/') ||
                      file.file_url.startsWith('data:'));
                  const isImageFile =
                    isViewableUrl &&
                    (/\.(png|jpe?g|webp|gif|bmp)$/i.test(file.file_name || '') ||
                      /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.file_url || '') ||
                      file.file_url.startsWith('data:image/'));
                  return (
                    <div className="sr-attachment-card" key={file.id}>
                      {isImageFile ? (
                        <a href={file.file_url} rel="noreferrer" target="_blank" title="Bấm để xem ảnh lớn">
                          <img
                            alt={file.file_name}
                            src={file.file_url}
                            style={{
                              width: '48px',
                              height: '48px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              flexShrink: 0,
                            }}
                          />
                        </a>
                      ) : (
                        <span className="sr-attachment-icon" aria-hidden="true">📄</span>
                      )}
                      <div className="sr-attachment-info">
                        <strong title={file.file_name}>{file.file_name}</strong>
                        <small>Đã tải lên: {formatDate(file.uploaded_at)}</small>
                      </div>
                      {isViewableUrl && (
                        <a
                          className="sr-btn-action"
                          href={file.file_url}
                          rel="noreferrer"
                          target="_blank"
                          title="Tải xuống / Xem tệp"
                        >
                          Xem
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section: Báo giá */}
          <section className="sr-card" aria-labelledby="heading-quotation">
            <h2 className="sr-card-title" id="heading-quotation">
              {isSales ? 'Quản lý Báo giá (Sales Quotation)' : 'Thông tin Báo giá (Quotation)'}
            </h2>

            {quotation ? (
              <div>
                {/* ────────────────────────────────────────────────────────── */}
                {/* GIAO DIỆN PHÍA KHÁCH HÀNG (CUSTOMER)                       */}
                {/* ────────────────────────────────────────────────────────── */}
                {!isSales && (
                  <div className={`sr-quote-card sr-quote-card--${quotation.status?.toLowerCase() || 'sent'}`}>
                    <div className="sr-quote-card-header">
                      <div className="sr-quote-title-group">
                        <span className="sr-quote-code">{quotation.quotation_code || `QT-${quotation.id}`}</span>
                        {quotation.status === 'Sent' && (
                          <span className="sr-quote-status-badge sr-quote-status-badge--sent">
                            ● Chờ Quý khách phản hồi
                          </span>
                        )}
                        {quotation.status === 'Approved' && (
                          <span className="sr-quote-status-badge sr-quote-status-badge--approved">
                            ✓ Quý khách đã chấp thuận
                          </span>
                        )}
                        {quotation.status === 'Rejected' && (
                          <span className="sr-quote-status-badge sr-quote-status-badge--rejected">
                            ✕ Quý khách đã từ chối
                          </span>
                        )}
                      </div>

                      <div className="sr-quote-header-actions">
                        <Link
                          className="button button-primary"
                          style={{ fontSize: '0.84rem', padding: '6px 14px' }}
                          to={`/internal/customer/quotations/${quotation.id}`}
                        >
                          📄 Xem chi tiết bảng báo giá →
                        </Link>
                      </div>
                    </div>

                    {/* Customer Status Alerts */}
                    {quotation.status === 'Sent' && (
                      <div className="sr-quote-alert sr-quote-alert--info">
                        <div>
                          <strong>Báo giá chính thức đã sẵn sàng:</strong> Quý khách vui lòng bấm vào <strong>"Xem chi tiết bảng báo giá"</strong> để kiểm tra từng hạng mục thiết bị và tiến hành chấp thuận hoặc gửi yêu cầu điều chỉnh.
                        </div>
                      </div>
                    )}
                    {quotation.status === 'Approved' && (
                      <div className="sr-quote-alert sr-quote-alert--success">
                        <div>
                          <strong>✓ Quý khách đã chấp thuận báo giá này:</strong> Phòng kỹ thuật ISOCAL đang chuẩn bị các công tác tiếp nhận thiết bị để tiến hành đo lường hiệu chuẩn.
                        </div>
                      </div>
                    )}
                    {quotation.status === 'Rejected' && (
                      <div className="sr-quote-alert sr-quote-alert--danger">
                        <div>
                          <strong>✕ Quý khách đã từ chối báo giá này</strong>
                          {extractRejectionReason(detail.special_notes, quotation.quotation_code) && (
                            <p style={{ margin: '4px 0 0', fontStyle: 'italic' }}>
                              Lý do phản hồi: "{extractRejectionReason(detail.special_notes, quotation.quotation_code)}"
                            </p>
                          )}
                          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                            Đội ngũ kinh doanh ISOCAL đang chuẩn bị phương án điều chỉnh phù hợp hơn và sẽ gửi lại sớm nhất.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Customer Final Payment Box */}
                    <div className="sr-quote-customer-hero">
                      <div className="sr-quote-customer-amount-group">
                        <span>Tổng chi phí thanh toán (Bao gồm VAT &amp; Chiết khấu)</span>
                        <strong>{formatCurrency(quotation.total_amount)}</strong>
                        {quotation.discount_amount > 0 && (
                          <span className="sr-quote-customer-discount-tag">
                            ✓ Đã áp dụng ưu đãi giảm giá: -{formatCurrency(quotation.discount_amount)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Customer Commercial Specs Grid */}
                    <div className="sr-quote-customer-specs">
                      <div className="sr-quote-spec-box">
                        <span>Thời gian hoàn thành dự kiến</span>
                        <strong>{formatDate(quotation.estimated_completion_date)}</strong>
                      </div>
                      <div className="sr-quote-spec-box">
                        <span>Hình thức thực hiện</span>
                        <strong>{detail.location_type === 'On-site' ? '⌖ Tận nơi tại nhà máy (On-site)' : '⚲ Tại phòng Lab ISOCAL (In-lab)'}</strong>
                      </div>
                      <div className="sr-quote-spec-box">
                        <span>Quy mô báo giá</span>
                        <strong>{quotation.line_items?.length || detail.items?.length || 0} thiết bị / dịch vụ</strong>
                      </div>
                      <div className="sr-quote-spec-box">
                        <span>Cam kết chất lượng</span>
                        <strong>Chuẩn ISO/IEC 17025 &amp; Tem kiểm định</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* ────────────────────────────────────────────────────────── */}
                {/* GIAO DIỆN PHÍA SALES (KINH DOANH)                          */}
                {/* ────────────────────────────────────────────────────────── */}
                {isSales && (
                  <div className={`sr-quote-card sr-quote-card--${quotation.status?.toLowerCase() || 'sent'}`}>
                    <div className="sr-quote-card-header">
                      <div className="sr-quote-title-group">
                        <span className="sr-quote-code">{quotation.quotation_code || `QT-${quotation.id}`}</span>
                        {quotation.status === 'Draft' && (
                          <span className="sr-quote-status-badge sr-quote-status-badge--draft">
                            ✏ Bản nháp nội bộ (Draft)
                          </span>
                        )}
                        {quotation.status === 'PendingApproval' && (
                          <span className="sr-quote-status-badge sr-quote-status-badge--draft" style={{ background: '#fff7ed', color: '#c2410c', borderColor: '#fdba74' }}>
                            ⏳ Chờ HeadSales phê duyệt
                          </span>
                        )}
                        {quotation.status === 'Sent' && (
                          <span className="sr-quote-status-badge sr-quote-status-badge--sent">
                            ✉ Đã gửi khách (Chờ phản hồi)
                          </span>
                        )}
                        {quotation.status === 'Approved' && (
                          <span className="sr-quote-status-badge sr-quote-status-badge--approved">
                            ★ Khách đã chốt duyệt (Won)
                          </span>
                        )}
                        {quotation.status === 'Rejected' && (
                          <span className="sr-quote-status-badge sr-quote-status-badge--rejected">
                            ✕ Khách từ chối (Lost)
                          </span>
                        )}
                      </div>

                      <div className="sr-quote-header-actions">
                        <Link
                          className="button button-secondary"
                          style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                          to={`/internal/sales/quotations/${quotation.id}`}
                        >
                          📄 Chi tiết &amp; In PDF
                        </Link>
                        {quotation.status === 'Draft' && (
                          <Link
                            className="button button-primary"
                            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                            to={`/internal/sales/quotations?requestId=${detail.id}`}
                          >
                            {quotation.head_sales_decision === 'Rejected'
                              ? '✎ Chỉnh sửa theo ý kiến HeadSales & Trình duyệt lại'
                              : '✎ Chỉnh sửa bản nháp'}
                          </Link>
                        )}
                        {quotation.status === 'Rejected' && !allQuotations.some((q) => q.status === 'Draft') && (
                          <Link
                            className="button button-primary"
                            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                            to={`/internal/sales/quotations?requestId=${detail.id}`}
                          >
                            ₫ Lập báo giá mới cho đơn này
                          </Link>
                        )}
                        {quotation.status === 'Approved' && (
                          <Link
                            className="button button-primary"
                            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                            to={`/internal/sales/contracts/new?quotationId=${quotation.id}`}
                          >
                            ▤ Tạo hợp đồng
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Sales Alerts */}
                    {quotation.status === 'Draft' && (
                      <div className="sr-quote-alert sr-quote-alert--warning">
                        <div>
                          <strong>Bản ghi đang ở trạng thái Nháp (Draft):</strong> Khách hàng chưa thể thấy báo giá này. Hãy kiểm tra định mức tài chính và trình Trưởng phòng Kinh doanh (HeadSales) phê duyệt trước khi gửi khách hàng.
                          {quotation.head_sales_decision === 'Rejected' && quotation.head_sales_note && (
                            <p style={{ margin: '6px 0 0', color: '#991b1b', fontWeight: 600 }}>
                              Ghi chú trả về từ HeadSales: &ldquo;{quotation.head_sales_note}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {quotation.status === 'PendingApproval' && (
                      <div className="sr-quote-alert sr-quote-alert--warning">
                        <div>
                          <strong>⏳ Đang chờ Trưởng phòng Kinh doanh (HeadSales) phê duyệt:</strong> Báo giá đã được trình duyệt. Sau khi HeadSales đồng ý, báo giá sẽ tự động chuyển sang trạng thái Đã gửi (Sent) để khách hàng xem và phản hồi.
                        </div>
                      </div>
                    )}
                    {quotation.status === 'Rejected' && (
                      <div className="sr-quote-alert sr-quote-alert--danger">
                        <div>
                          <strong>✕ Khách hàng đã từ chối báo giá này</strong>
                          {(quotation.customer_reject_reason || extractRejectionReason(detail.special_notes, quotation.quotation_code)) && (
                            <p style={{ margin: '4px 0 6px', fontWeight: 600 }}>
                              Lý do từ chối: "{quotation.customer_reject_reason || extractRejectionReason(detail.special_notes, quotation.quotation_code)}"
                            </p>
                          )}
                          <div style={{ marginTop: '8px' }}>
                            <Link
                              className="button button-primary"
                              style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                              to={`/internal/sales/quotations?requestId=${detail.id}`}
                            >
                              + Lập bản ghi báo giá mới (báo giá lại)
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                    {quotation.status === 'Approved' && (
                      <div className="sr-quote-alert sr-quote-alert--success">
                        <div>
                          <strong>★ Deal thành công (Approved):</strong> Khách hàng đã đồng ý phương án giá. Bạn có thể tiến hành tạo Hợp đồng dịch vụ và bàn giao lệnh cho phòng kỹ thuật.
                        </div>
                      </div>
                    )}

                    {/* Sales Financial KPIs Grid */}
                    <div className="sr-quote-sales-kpis">
                      <div className="sr-quote-sales-kpi-card sr-quote-sales-kpi-card--highlight">
                        <span>Doanh thu thực thu (Total)</span>
                        <strong>{formatCurrency(quotation.total_amount)}</strong>
                      </div>
                      <div className="sr-quote-sales-kpi-card">
                        <span>Giá niêm yết (Subtotal)</span>
                        <strong>{formatCurrency(quotation.subtotal)}</strong>
                      </div>
                      <div className="sr-quote-sales-kpi-card">
                        <span>Chiết khấu (Discount)</span>
                        <strong style={{ color: quotation.discount_amount > 0 ? '#b91c1c' : '#475569' }}>
                          {quotation.discount_amount > 0 ? `-${formatCurrency(quotation.discount_amount)}` : '0 ₫'}
                          {quotation.subtotal > 0 && quotation.discount_amount > 0 && (
                            <small style={{ fontSize: '0.72rem', marginLeft: '4px', color: '#64748b' }}>
                              ({Math.round((quotation.discount_amount / quotation.subtotal) * 100)}%)
                            </small>
                          )}
                        </strong>
                      </div>
                      <div className="sr-quote-sales-kpi-card">
                        <span>Phí di chuyển On-site</span>
                        <strong>{formatCurrency(quotation.travel_fee)}</strong>
                      </div>
                    </div>

                    {/* Sales Operational Metadata */}
                    <div className="sr-quote-sales-meta">
                      <div><span>Hạn hoàn thành:</span> <strong>{formatDate(quotation.estimated_completion_date)}</strong></div>
                      <div><span>Quy mô:</span> <strong>{quotation.line_items?.length || detail.items?.length || 0} thiết bị</strong></div>
                      <div><span>Địa điểm:</span> <strong>{detail.location_type === 'On-site' ? 'Tận nơi (On-site)' : 'Tại Lab (In-lab)'}</strong></div>
                      <div><span>Tiến độ khách:</span> <strong>{quotation.status === 'Sent' ? 'Chờ khách duyệt' : quotation.status === 'Approved' ? 'Đã duyệt' : quotation.status === 'Rejected' ? 'Bị từ chối' : quotation.status === 'PendingApproval' ? 'Chờ HeadSales duyệt' : 'Chưa gửi'}</strong></div>
                    </div>
                  </div>
                )}

                {/* ────────────────────────────────────────────────────────── */}
                {/* PHẦN LỊCH SỬ BÁO GIÁ (ROLE-SPECIFIC QUOTATION HISTORY)    */}
                {/* ────────────────────────────────────────────────────────── */}
                {allQuotations.length > 1 && (
                  <div className="sr-quote-history-card">
                    <div className="sr-quote-history-header">
                      <div>
                        <h4>
                          {isSales
                            ? `📊 Lịch sử & Các phiên bản báo giá (${allQuotations.length} phiên bản)`
                            : `📋 Lịch sử các lần gửi báo giá từ ISOCAL (${allQuotations.length} đợt)`}
                        </h4>
                        <p>
                          {isSales
                            ? 'Theo dõi quá trình thương thảo giá và các phiên bản đã lập cho khách hàng (sắp xếp mới nhất trước)'
                            : 'Danh sách các đợt phát hành báo giá chính thức mà ISOCAL đã gửi tới Quý khách'}
                        </p>
                      </div>
                    </div>

                    <div className="sr-quote-history-table-wrapper">
                      {isSales ? (
                        /* ── BẢNG LỊCH SỬ DÀNH CHO SALES ── */
                        <table className="sr-quote-history-table">
                          <thead>
                            <tr>
                              <th>Phiên bản</th>
                              <th>Mã báo giá</th>
                              <th style={{ textAlign: 'right' }}>Giá niêm yết</th>
                              <th style={{ textAlign: 'right' }}>Chiết khấu</th>
                              <th style={{ textAlign: 'right' }}>Doanh thu thực</th>
                              <th>Hạn hoàn thành</th>
                              <th>Trạng thái khách</th>
                              <th>Phản hồi / Ghi chú</th>
                              <th style={{ textAlign: 'center' }}>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allQuotations.map((q, idx) => {
                              const versionNum = allQuotations.length - idx;
                              const isCurrent = q.id === quotation.id;
                              const reason = extractRejectionReason(detail.special_notes, q.quotation_code);
                              return (
                                <tr key={q.id || idx} className={isCurrent ? 'is-current' : ''}>
                                  <td>
                                    Revision #{versionNum}
                                    {isCurrent && (
                                      <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#1677ff', fontWeight: 700 }}>
                                        (Đang áp dụng)
                                      </span>
                                    )}
                                  </td>
                                  <td><strong>{q.quotation_code || `QT-${q.id}`}</strong></td>
                                  <td style={{ textAlign: 'right' }}>{formatCurrency(q.subtotal)}</td>
                                  <td style={{ textAlign: 'right', color: q.discount_amount > 0 ? '#cf1322' : 'inherit' }}>
                                    {q.discount_amount > 0 ? `-${formatCurrency(q.discount_amount)}` : '0 ₫'}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(q.total_amount)}</td>
                                  <td>{formatDate(q.estimated_completion_date)}</td>
                                  <td>
                                    <span className={`sr-quote-history-badge sr-quote-history-badge--${q.status?.toLowerCase() || 'sent'}`}>
                                      {q.status === 'Approved' ? 'Khách đã duyệt' : q.status === 'Rejected' ? 'Khách từ chối' : q.status === 'Sent' ? 'Đã gửi khách' : 'Bản nháp'}
                                    </span>
                                  </td>
                                  <td>
                                    {q.status === 'Rejected' && reason ? (
                                      <span className="sr-quote-reason-subtext">↳ {reason}</span>
                                    ) : (
                                      <span style={{ color: '#94a3b8' }}>—</span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                      <Link
                                        className="sr-code-link"
                                        style={{ fontSize: '0.8rem' }}
                                        to={`/internal/sales/quotations/${q.id}`}
                                      >
                                        Chi tiết
                                      </Link>
                                      {q.status === 'Draft' && (
                                        <Link
                                          style={{ fontSize: '0.8rem', color: '#096dd9' }}
                                          to={`/internal/sales/quotations?requestId=${detail.id}`}
                                        >
                                          Sửa
                                        </Link>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        /* ── BẢNG LỊCH SỬ DÀNH CHO KHÁCH HÀNG ── */
                        <table className="sr-quote-history-table">
                          <thead>
                            <tr>
                              <th>Đợt gửi</th>
                              <th>Mã báo giá</th>
                              <th>Thời gian hoàn thành</th>
                              <th style={{ textAlign: 'right' }}>Ưu đãi giảm giá</th>
                              <th style={{ textAlign: 'right' }}>Tổng thanh toán</th>
                              <th>Phản hồi của bạn</th>
                              <th>Ghi chú phản hồi</th>
                              <th style={{ textAlign: 'center' }}>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allQuotations.map((q, idx) => {
                              const versionNum = allQuotations.length - idx;
                              const isCurrent = q.id === quotation.id;
                              const reason = extractRejectionReason(detail.special_notes, q.quotation_code);
                              return (
                                <tr key={q.id || idx} className={isCurrent ? 'is-current' : ''}>
                                  <td>
                                    Lần {versionNum}
                                    {isCurrent && (
                                      <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#1677ff', fontWeight: 700 }}>
                                        (Mới nhất)
                                      </span>
                                    )}
                                  </td>
                                  <td><strong>{q.quotation_code || `QT-${q.id}`}</strong></td>
                                  <td>{formatDate(q.estimated_completion_date)}</td>
                                  <td style={{ textAlign: 'right', color: q.discount_amount > 0 ? '#389e0d' : 'inherit' }}>
                                    {q.discount_amount > 0 ? `-${formatCurrency(q.discount_amount)}` : '—'}
                                  </td>
                                  <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatCurrency(q.total_amount)}</td>
                                  <td>
                                    <span className={`sr-quote-history-badge sr-quote-history-badge--${q.status?.toLowerCase() || 'sent'}`}>
                                      {q.status === 'Approved' ? 'Đã chấp thuận' : q.status === 'Rejected' ? 'Đã từ chối' : 'Chờ bạn phản hồi'}
                                    </span>
                                  </td>
                                  <td>
                                    {q.status === 'Rejected' && reason ? (
                                      <span className="sr-quote-reason-subtext">↳ {reason}</span>
                                    ) : (
                                      <span style={{ color: '#94a3b8' }}>—</span>
                                    )}
                                  </td>
                                  <td style={{ textAlign: 'center' }}>
                                    <Link
                                      className="sr-code-link"
                                      style={{ fontSize: '0.8rem' }}
                                      to={`/internal/customer/quotations/${q.id}`}
                                    >
                                      Xem báo giá →
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="csr-empty-box">
                <p style={{ margin: '0 0 10px' }}>
                  {isSales
                    ? 'Phiếu yêu cầu này hiện chưa có báo giá nào được lập.'
                    : 'Đơn dịch vụ hiện chưa có báo giá chính thức từ ISOCAL.'}
                </p>
                {isSales ? (
                  <Link
                    className="button button-primary"
                    to={`/internal/sales/quotations?requestId=${detail.id}`}
                  >
                    + Lập báo giá ngay
                  </Link>
                ) : (
                  <small style={{ color: '#718096' }}>
                    Nhân viên kinh doanh ISOCAL đang tính toán định mức và sẽ gửi báo giá sớm nhất tới Quý khách.
                  </small>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Right Sidebar */}
        <aside className="sr-detail-sidebar">
          {/* Card: Thông tin đơn vị */}
          <div className="sr-side-info-card">
            <h4>Doanh nghiệp yêu cầu</h4>
            <div className="sr-side-list">
              <div className="sr-side-item">
                <span>Tên công ty:</span>
                <strong>{detail.customer?.company_name || '—'}</strong>
              </div>
              <div className="sr-side-item">
                <span>Mã số thuế:</span>
                <strong>{detail.customer?.tax_code || '—'}</strong>
              </div>
              <div className="sr-side-item">
                <span>Địa chỉ trụ sở:</span>
                <p style={{ margin: 0, color: '#4a5568' }}>{detail.customer?.address || '—'}</p>
              </div>
            </div>
          </div>

          {/* Card: Hình thức & Địa điểm */}
          <div className="sr-side-info-card">
            <h4>Hình thức & Tiến độ</h4>
            <div className="sr-side-list">
              <div className="sr-side-item">
                <span>Phương thức thực hiện:</span>
                <strong>
                  {detail.location_type === 'On-site'
                    ? 'Tận nơi tại Nhà máy / Cơ sở (On-site)'
                    : 'Tại phòng Lab ISOCAL (In-lab)'}
                </strong>
              </div>
              <div className="sr-side-item">
                <span>{detail.location_type === 'On-site' ? 'Ngày mong muốn thực hiện:' : 'Ngày dự kiến gửi thiết bị:'}</span>
                <strong style={{ color: '#1a56db' }}>{formatDate(detail.preferred_date)}</strong>
              </div>
              {detail.location_type === 'In-lab' ? (
                <div className="sr-side-item">
                  <span>Địa chỉ nhận mẫu:</span>
                  <p style={{ margin: 0, color: '#4a5568', fontSize: '0.8rem' }}>
                    Trung tâm Hiệu chuẩn ISOCAL — Quầy nhận mẫu, Tầng 1, Tòa nhà Hoa Sơn, Thôn Đoài, Xã Hoàn Sơn, Huyện Tiên Du, Tỉnh Bắc Ninh
                  </p>
                </div>
              ) : (
                <div className="sr-side-item">
                  <span>Địa chỉ On-site:</span>
                  <p style={{ margin: 0, color: '#4a5568', fontSize: '0.8rem' }}>
                    Theo địa chỉ nhà máy của khách hàng ({detail.customer?.address})
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card: Hotline trợ giúp */}
          <div className="sr-side-info-card" style={{ background: '#f8fbff', borderColor: '#cbe0f5' }}>
            <h4 style={{ color: '#1a56db' }}>Hỗ trợ khách hàng</h4>
            <p style={{ fontSize: '0.82rem', color: '#4a5568', margin: '0 0 10px', lineHeight: 1.45 }}>
              Nếu cần bổ sung yêu cầu đặc biệt hoặc đổi lịch bàn giao thiết bị, quý khách vui lòng liên hệ:
            </p>
            <div style={{ fontSize: '0.84rem', color: '#1a202c' }}>
              <div>📞 Hotline: <b>1900 6868</b> (08:00 – 17:30)</div>
              <div style={{ marginTop: '4px' }}>✉ Email: <b>support@isocal.vn</b></div>
            </div>
          </div>
        </aside>
      </div>

      {/* Cancel Modal */}
      <ServiceRequestCancelModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onSuccess={handleCancelSuccess}
        serviceRequest={detail}
      />

      {/* Edit Modal */}
      <ServiceRequestEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        serviceRequest={detail}
      />

      {/* Customer Inspection Consent Modal */}
      <CustomerInspectionConsentModal
        defaultSignerName={user?.full_name || detail.customer?.company_name || ''}
        isOpen={Boolean(selectedConsentItem)}
        item={selectedConsentItem}
        onClose={() => setSelectedConsentItem(null)}
        onSuccess={() => {
          fetchDetail();
          showToast('Đã lưu quyết định xác nhận ngoại quan thành công.');
        }}
      />
    </div>
  );
}

export default CustomerServiceRequestDetailPage;

