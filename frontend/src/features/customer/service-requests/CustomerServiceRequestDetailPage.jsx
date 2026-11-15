import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { extractApiErrorMessage, getServiceRequestDetailApi } from '../../../services/service-request-service.js';
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

const WORKFLOW_STEPS = [
  { key: 'New', label: '1. Tiếp nhận' },
  { key: 'Quoted', label: '2. Báo giá' },
  { key: 'Confirmed', label: '3. Xác nhận' },
  { key: 'InProgress', label: '4. Thực hiện' },
  { key: 'Completed', label: '5. Hoàn thành' },
];

function CustomerServiceRequestDetailPage({ role = 'customer' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isSales = role === 'sales';

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

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
            ) : (quotation?.status === 'Rejected' && !allQuotations.some((q) => q.status === 'Draft' || q.status === 'Sent' || q.status === 'Approved')) ? (
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
                      <th>Tiêu chuẩn</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
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
                          <span style={{ fontSize: '0.78rem', color: '#4a5568' }}>
                            {item.standard_code || 'Tiêu chuẩn ISO/IEC 17025'}
                          </span>
                        </td>
                        <td>
                          <span className="sr-meta-tag" style={{ background: '#edf2f7', color: '#2d3748' }}>
                            {item.status === 'Pending' ? 'Chờ nhận mẫu' : item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
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
                {attachments.map((file) => (
                  <div className="sr-attachment-card" key={file.id}>
                    <span className="sr-attachment-icon" aria-hidden="true">📄</span>
                    <div className="sr-attachment-info">
                      <strong title={file.file_name}>{file.file_name}</strong>
                      <small>Đã tải lên: {formatDate(file.uploaded_at)}</small>
                    </div>
                    {file.file_url && (
                      <a
                        className="sr-btn-action"
                        href={file.file_url}
                        rel="noreferrer"
                        target="_blank"
                        title="Tải xuống / Xem tệp"
                      >
                        Mở
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section: Báo giá */}
          <section className="sr-card" aria-labelledby="heading-quotation">
            <h2 className="sr-card-title" id="heading-quotation">
              Thông tin Báo giá (Quotation)
            </h2>

            {quotation ? (
              <div>
                {quotation.status === 'Rejected' && (
                  <div style={{ background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                    <div style={{ fontWeight: 600, color: '#cf1322', marginBottom: '4px' }}>
                      ✕ Báo giá {quotation.quotation_code} đã bị Khách hàng từ chối
                    </div>
                    <div style={{ fontSize: '0.86rem', color: '#595959' }}>
                      {isSales
                        ? 'Khách hàng chưa đồng ý với phương án báo giá này. Bạn có thể tạo bản ghi báo giá mới (cho đợt báo giá lại) với ID yêu cầu này.'
                        : 'Bạn đã từ chối báo giá này. Nhân viên kinh doanh ISOCAL sẽ xây dựng phương án báo giá mới phù hợp hơn và gửi lại cho bạn.'}
                    </div>
                    {isSales && !allQuotations.some((q) => q.status === 'Draft') && (
                      <div style={{ marginTop: '10px' }}>
                        <Link
                          className="button button-primary"
                          style={{ fontSize: '0.82rem', padding: '6px 14px' }}
                          to={`/internal/sales/quotations?requestId=${detail.id}`}
                        >
                          + Lập báo giá mới cho yêu cầu này
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                <div className="sr-quotation-summary">
                  <div className="sr-quotation-top">
                    <div>
                      <strong>{quotation.quotation_code || `Báo giá #${quotation.id}`}</strong>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: quotation.status === 'Approved' ? '#389e0d' : quotation.status === 'Rejected' ? '#cf1322' : quotation.status === 'Sent' ? '#096dd9' : '#8c8c8c',
                        }}
                      >
                        Trạng thái: <b>{quotation.status === 'Sent' ? 'Đã gửi khách hàng' : quotation.status === 'Approved' ? 'Đã chấp thuận' : quotation.status === 'Rejected' ? 'Đã từ chối' : 'Bản nháp'}</b>
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Link
                        className="button button-primary"
                        style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                        to={isSales ? `/internal/sales/quotations/${quotation.id}` : `/internal/customer/quotations/${quotation.id}`}
                      >
                        Xem chi tiết báo giá →
                      </Link>
                      {isSales && quotation.status === 'Draft' && (
                        <Link
                          className="button button-secondary"
                          style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                          to={`/internal/sales/quotations?requestId=${detail.id}`}
                        >
                          Sửa bản nháp
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="sr-quotation-breakdown">
                    <div>
                      <span>Tiền dịch vụ (Subtotal):</span>
                      <strong>{formatCurrency(quotation.subtotal)}</strong>
                    </div>
                    <div>
                      <span>Chiết khấu (Discount):</span>
                      <strong>{formatCurrency(quotation.discount_amount)}</strong>
                    </div>
                    <div>
                      <span>Phí đi lại (Travel fee):</span>
                      <strong>{formatCurrency(quotation.travel_fee)}</strong>
                    </div>
                    <div>
                      <span>Ngày dự kiến hoàn thành:</span>
                      <strong>{formatDate(quotation.estimated_completion_date)}</strong>
                    </div>
                  </div>

                  <div className="sr-quotation-total">
                    <span>Tổng thanh toán:</span>
                    <span>{formatCurrency(quotation.total_amount)}</span>
                  </div>
                </div>

                {/* Bảng Lịch sử các lần báo giá (nếu có nhiều hơn 1 báo giá) */}
                {allQuotations.length > 1 && (
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#2d3748', margin: 0 }}>
                        Lịch sử các lần báo giá ({allQuotations.length} phiên bản)
                      </h4>
                      <small style={{ color: '#718096' }}>Sắp xếp từ mới nhất đến cũ nhất</small>
                    </div>

                    <div className="sr-table-responsive">
                      <table className="sr-table" style={{ fontSize: '0.84rem' }}>
                        <thead>
                          <tr>
                            <th>Phiên bản</th>
                            <th>Mã báo giá</th>
                            <th>Ngày dự kiến</th>
                            <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                            <th>Trạng thái</th>
                            <th style={{ textAlign: 'center' }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allQuotations.map((q, idx) => {
                            const versionNum = allQuotations.length - idx;
                            const isCurrent = q.id === quotation.id;
                            return (
                              <tr key={q.id || idx} style={isCurrent ? { background: '#f8fafc', fontWeight: 600 } : {}}>
                                <td>
                                  Lần {versionNum}
                                  {isCurrent && (
                                    <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#3182ce' }}>
                                      (Hiện tại)
                                    </span>
                                  )}
                                </td>
                                <td><strong>{q.quotation_code || `QT-${q.id}`}</strong></td>
                                <td>{formatDate(q.estimated_completion_date)}</td>
                                <td style={{ textAlign: 'right' }}>{formatCurrency(q.total_amount)}</td>
                                <td>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontSize: '0.74rem',
                                      fontWeight: 600,
                                      background: q.status === 'Approved' ? '#f6ffed' : q.status === 'Rejected' ? '#fff1f0' : q.status === 'Sent' ? '#e6f7ff' : '#f5f5f5',
                                      color: q.status === 'Approved' ? '#389e0d' : q.status === 'Rejected' ? '#cf1322' : q.status === 'Sent' ? '#096dd9' : '#595959',
                                    }}
                                  >
                                    {q.status === 'Approved' ? 'Đã duyệt' : q.status === 'Rejected' ? 'Đã từ chối' : q.status === 'Sent' ? 'Đã gửi khách' : 'Bản nháp'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <Link
                                    style={{ color: '#3182ce', textDecoration: 'none', fontWeight: 600 }}
                                    to={isSales ? `/internal/sales/quotations/${q.id}` : `/internal/customer/quotations/${q.id}`}
                                  >
                                    Xem chi tiết →
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="csr-empty-box">
                <p style={{ margin: '0 0 10px' }}>
                  Đơn dịch vụ hiện chưa có báo giá chính thức.
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
                    Nhân viên kinh doanh ISOCAL đang tính toán định mức và sẽ gửi báo giá sớm nhất tới bạn.
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
                    Trung tâm Hiệu chuẩn ISOCAL — Quầy nhận mẫu, Tầng 1, Khu Công nghệ cao, TP. Thủ Đức, TP.HCM
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
    </div>
  );
}

export default CustomerServiceRequestDetailPage;

