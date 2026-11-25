import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../app/providers.jsx';
import { isHeadSalesAccount } from '../../../app/role-routing.js';
import {
  approveQuotationApi,
  extractApiErrorMessage,
  getQuotationDetailApi,
  headSalesReviewQuotationApi,
  rejectQuotationApi,
  sendDraftQuotationApi,
} from '../../../services/quotation-service.js';
import './quotation-detail.css';

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
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Convert number to Vietnamese text representation for formal quotations
const convertNumberToWords = (num) => {
  if (typeof num !== 'number' || Number.isNaN(num) || num <= 0) return '';
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const units = ['', 'nghìn', 'triệu', 'tỷ'];

  let s = Math.round(num).toString();
  let groups = [];
  while (s.length > 0) {
    groups.unshift(s.slice(-3));
    s = s.slice(0, -3);
  }

  const readThree = (group) => {
    let n = parseInt(group, 10);
    let h = Math.floor(n / 100);
    let t = Math.floor((n % 100) / 10);
    let u = n % 10;
    let res = '';
    if (h > 0 || group.length === 3) {
      res += digits[h] + ' trăm ';
    }
    if (t > 1) {
      res += digits[t] + ' mươi ';
      if (u === 1) res += 'mốt ';
      else if (u === 5) res += 'lăm ';
      else if (u > 0) res += digits[u] + ' ';
    } else if (t === 1) {
      res += 'mười ';
      if (u === 5) res += 'lăm ';
      else if (u > 0) res += digits[u] + ' ';
    } else if (t === 0 && u > 0) {
      if (h > 0 || group.length === 3) res += 'lẻ ';
      res += digits[u] + ' ';
    }
    return res.trim();
  };

  let result = '';
  for (let i = 0; i < groups.length; i++) {
    let gVal = parseInt(groups[i], 10);
    if (gVal > 0) {
      let gText = readThree(groups[i]);
      let uIdx = groups.length - 1 - i;
      result += gText + ' ' + (units[uIdx] ? units[uIdx] + ' ' : '');
    }
  }

  result = result.trim();
  if (!result) return '';
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng chẵn.';
};

function QuotationDetailPage({ role = 'sales' }) {
  const { session } = useAppContext() || {};
  const isHeadSales = isHeadSalesAccount(session?.user);
  const { id } = useParams();
  const navigate = useNavigate();
  const isSales = role === 'sales';

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Modals
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [submissionNote, setSubmissionNote] = useState('');
  const [recallConfirmOpen, setRecallConfirmOpen] = useState(false);
  const [headSalesModal, setHeadSalesModal] = useState(null); // 'approve' | 'reject' | null
  const [headSalesNote, setHeadSalesNote] = useState('');
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchQuotation = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getQuotationDetailApi(id);
      setQuotation(data);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Không thể tải chi tiết báo giá.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // Actions
  const handleSendDraft = async () => {
    if (quotation.head_sales_decision === 'Rejected') {
      if (!submissionNote.trim() || submissionNote.trim().length < 5) {
        setActionError('Vui lòng nhập ghi chú giải trình (tối thiểu 5 ký tự) nêu rõ các thay đổi bạn đã thực hiện theo yêu cầu của Trưởng phòng.');
        return;
      }
    }
    setActionLoading(true);
    setActionError('');
    try {
      const updated = await sendDraftQuotationApi(quotation.id, {
        sales_submission_note: submissionNote.trim() || undefined,
      });
      setQuotation((prev) => ({ ...prev, ...updated, status: updated.status || 'PendingApproval' }));
      setSendConfirmOpen(false);
      setSubmissionNote('');
      showToast(
        updated.status === 'Sent'
          ? 'Đã phê duyệt và phát hành gửi báo giá chính thức cho khách hàng.'
          : 'Đã trình báo giá lên Trưởng phòng Kinh doanh (HeadSales) phê duyệt.',
      );
    } catch (err) {
      setActionError(extractApiErrorMessage(err, 'Không thể gửi báo giá.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecall = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const updated = await recallQuotationApi(quotation.id);
      setQuotation(updated);
      setRecallConfirmOpen(false);
      showToast('Đã thu hồi báo giá về trạng thái Nháp (Draft). Bạn có thể tiếp tục chỉnh sửa.');
    } catch (err) {
      setActionError(extractApiErrorMessage(err, 'Không thể thu hồi báo giá.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleHeadSalesReview = async () => {
    if (!headSalesModal) return;
    if (headSalesModal === 'reject' && !headSalesNote.trim()) {
      setActionError('Vui lòng nhập lý do từ chối hoặc yêu cầu chỉnh sửa cho nhân viên Sales.');
      return;
    }
    setActionLoading(true);
    setActionError('');
    try {
      const updated = await headSalesReviewQuotationApi(quotation.id, {
        decision: headSalesModal,
        note: headSalesNote.trim() || undefined,
      });
      setQuotation(updated);
      setHeadSalesModal(null);
      setHeadSalesNote('');
      showToast(
        headSalesModal === 'approve'
          ? 'HeadSales đã đồng ý duyệt! Báo giá đã được phát hành tới tay khách hàng (Sent).'
          : 'Đã trả báo giá về trạng thái Nháp (Draft) để nhân viên Sales chỉnh sửa lại.',
      );
    } catch (err) {
      setActionError(extractApiErrorMessage(err, 'Không thể thực hiện phê duyệt báo giá.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const updated = await approveQuotationApi(quotation.id);
      setQuotation(updated);
      setApproveConfirmOpen(false);
      showToast('Bạn đã chấp thuận báo giá. Yêu cầu dịch vụ đã chuyển sang trạng thái Xác nhận (Confirmed).');
    } catch (err) {
      setActionError(extractApiErrorMessage(err, 'Không thể chấp thuận báo giá.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const updated = await rejectQuotationApi(quotation.id, rejectReason.trim() || undefined);
      setQuotation(updated);
      setRejectModalOpen(false);
      showToast('Đã ghi nhận từ chối báo giá.');
    } catch (err) {
      setActionError(extractApiErrorMessage(err, 'Không thể từ chối báo giá.'));
    } finally {
      setActionLoading(false);
    }
  };

  const backLink = isSales
    ? (quotation?.service_request_id ? `/internal/sales/service-requests/${quotation.service_request_id}` : '/internal/sales/service-requests')
    : (quotation?.service_request_id ? `/internal/customer/service-requests/${quotation.service_request_id}` : '/internal/customer/service-requests');

  if (loading) {
    return (
      <div className="quotation-detail-page" style={{ paddingTop: '50px' }}>
        <div className="csr-empty-box" style={{ padding: '40px' }}>
          <div className="csr-company-icon" style={{ margin: '0 auto 12px' }}>⏳</div>
          <h3>Đang tải thông tin báo giá #{id}...</h3>
          <p>Vui lòng đợi giây lát.</p>
        </div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="quotation-detail-page" style={{ paddingTop: '40px' }}>
        <div className="csr-inline-error" style={{ marginBottom: '16px' }}>
          {error || 'Không tìm thấy thông tin báo giá.'}
        </div>
        <Link className="button button-secondary" to={backLink}>
          ← Quay lại
        </Link>
      </div>
    );
  }

  const lineItems = Array.isArray(quotation.line_items) ? quotation.line_items : [];
  const statusClass = {
    Draft: 'qd-status-ribbon--draft',
    PendingApproval: 'qd-status-ribbon--draft',
    Sent: 'qd-status-ribbon--sent',
    Approved: 'qd-status-ribbon--approved',
    Rejected: 'qd-status-ribbon--rejected',
  }[quotation.status] || 'qd-status-ribbon--sent';

  const statusLabel = {
    Draft: 'Bản nháp (Draft)',
    PendingApproval: 'Chờ HeadSales duyệt (PendingApproval)',
    Sent: 'Đã duyệt & Gửi khách hàng (Sent)',
    Approved: 'Khách hàng chấp thuận (Approved)',
    Rejected: 'Khách hàng từ chối (Rejected)',
  }[quotation.status] || quotation.status;

  const srPath = isSales
    ? `/internal/sales/service-requests/${quotation.service_request_id}`
    : `/internal/customer/service-requests/${quotation.service_request_id}`;

  return (
    <div className="quotation-detail-page">
      {/* Top Action Bar */}
      <div className="qd-action-bar">
        <div className="qd-action-left">
          <Link className="qd-back-link" to={backLink}>
            ← Quay lại
          </Link>
          <span className={`qd-status-ribbon ${statusClass}`}>
            ● {statusLabel}
          </span>
        </div>

        <div className="qd-action-right">
          <button
            className="button button-secondary"
            onClick={() => window.print()}
            title="In báo giá hoặc lưu PDF"
            type="button"
          >
            🖨 In / Xuất PDF
          </button>

          {/* Sales actions */}
          {isSales && !isHeadSales && quotation.status === 'Draft' && (
            <button
              className="button button-primary"
              onClick={() => {
                setActionError('');
                setSendConfirmOpen(true);
              }}
              type="button"
            >
              📤 Trình HeadSales phê duyệt
            </button>
          )}

          {isSales && !isHeadSales && quotation.status === 'PendingApproval' && (
            <button
              className="button button-secondary"
              onClick={() => {
                setActionError('');
                setRecallConfirmOpen(true);
              }}
              style={{ borderColor: '#f59e0b', color: '#b45309' }}
              type="button"
            >
              ↩ Thu hồi về bản nháp
            </button>
          )}

          {/* HeadSales approval actions */}
          {isSales && isHeadSales && (quotation.status === 'PendingApproval' || quotation.status === 'Draft') && (
            <>
              <button
                className="button button-success"
                onClick={() => {
                  setActionError('');
                  setHeadSalesNote(quotation.head_sales_note || '');
                  setHeadSalesModal('approve');
                }}
                type="button"
              >
                ✓ Duyệt &amp; Gửi khách hàng
              </button>
              {quotation.status === 'PendingApproval' && (
                <button
                  className="button button-danger"
                  onClick={() => {
                    setActionError('');
                    setHeadSalesNote('');
                    setHeadSalesModal('reject');
                  }}
                  type="button"
                >
                  ✕ Yêu cầu Sales chỉnh sửa
                </button>
              )}
            </>
          )}

          {isSales && quotation.status === 'Approved' && (
            <Link
              className="button button-primary"
              to={`/internal/sales/contracts/new?quotationId=${quotation.id}`}
            >
              ▤ Tạo hợp đồng
            </Link>
          )}

          {isSales && (quotation.status === 'Draft' || quotation.status === 'PendingApproval') && (
            <Link
              className="button button-primary"
              to={`/internal/sales/quotations?requestId=${quotation.service_request_id}`}
            >
              {quotation.head_sales_decision === 'Rejected'
                ? '✎ Chỉnh sửa theo yêu cầu của HeadSales & Trình duyệt lại'
                : '✎ Cập nhật & Chỉnh sửa báo giá'}
            </Link>
          )}

          {isSales && quotation.status === 'Rejected' && (
            <Link
              className="button button-primary"
              to={`/internal/sales/quotations?requestId=${quotation.service_request_id}`}
            >
              ₫ Lập báo giá mới cho đơn này (Báo giá lại)
            </Link>
          )}

          {/* Customer actions */}
          {!isSales && quotation.can_approve && (
            <button
              className="button button-success"
              onClick={() => {
                setActionError('');
                setApproveConfirmOpen(true);
              }}
              type="button"
            >
              ✓ Chấp thuận báo giá
            </button>
          )}

          {!isSales && quotation.can_reject && (
            <button
              className="button button-danger"
              onClick={() => {
                setActionError('');
                setRejectModalOpen(true);
              }}
              type="button"
            >
              ✕ Từ chối báo giá
            </button>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="csr-receipt-card" style={{ marginBottom: '20px' }}>
          <div className="csr-receipt-icon">✓</div>
          <div className="csr-receipt-body">
            <strong>Thông báo:</strong> {toastMessage}
          </div>
        </div>
      )}

      {isSales && quotation.status === 'PendingApproval' && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '10px',
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            color: '#92400e',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <strong>⏳ Đang chờ Trưởng phòng Kinh doanh (HeadSales) phê duyệt:</strong> Báo giá này đã được nhân viên Sales trình duyệt nội bộ
            {quotation.submission_count > 1 ? ` (Lần trình #${quotation.submission_count})` : ''}. Sau khi HeadSales đồng ý duyệt, báo giá sẽ tự động chuyển sang trạng thái <strong>Sent</strong> và hiển thị bên phía Khách hàng.
            {quotation.sales_submission_note && (
              <div style={{ marginTop: '6px', fontStyle: 'italic', color: '#78350f' }}>
                &ldquo;Giải trình của Sales: {quotation.sales_submission_note}&rdquo;
              </div>
            )}
          </div>
          {!isHeadSales && (
            <button
              className="button button-secondary"
              onClick={() => {
                setActionError('');
                setRecallConfirmOpen(true);
              }}
              style={{ flexShrink: 0, fontSize: '0.82rem', padding: '6px 12px', borderColor: '#f59e0b', color: '#b45309' }}
              type="button"
            >
              ↩ Thu hồi về bản nháp
            </button>
          )}
        </div>
      )}

      {quotation.sales_submission_note && quotation.status !== 'PendingApproval' && quotation.status !== 'Rejected' && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 18px',
            borderRadius: '10px',
            background: '#f0fdfa',
            border: '1px solid #99f6e4',
            color: '#115e59',
            fontSize: '0.88rem',
          }}
        >
          <strong>📝 Giải trình của Sales {quotation.submission_count > 1 ? `(Lần nộp #${quotation.submission_count})` : ''}:</strong>{' '}
          &ldquo;{quotation.sales_submission_note}&rdquo;
        </div>
      )}

      {isSales && quotation.status === 'Draft' && quotation.head_sales_decision === 'Rejected' && quotation.head_sales_note && (
        <div
          style={{
            marginBottom: '20px',
            padding: '16px 20px',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1.5px solid #f87171',
            color: '#991b1b',
            fontSize: '0.88rem',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <strong>⚠ Báo giá bị HeadSales ({quotation.head_sales_reviewer_name || 'Trưởng phòng KD'}) trả về yêu cầu sửa:</strong>
              <p style={{ margin: '6px 0 0', fontWeight: 600 }}>
                &ldquo;{quotation.head_sales_note}&rdquo;
              </p>
            </div>
            <Link
              className="button button-primary"
              style={{ flexShrink: 0, fontSize: '0.82rem', padding: '7px 14px' }}
              to={`/internal/sales/quotations?requestId=${quotation.service_request_id}`}
            >
              ✎ Chỉnh sửa &amp; Trình duyệt lại
            </Link>
          </div>
        </div>
      )}

      {quotation.status === 'Rejected' && quotation.customer_reject_reason && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '10px',
            background: '#fff1f2',
            border: '1px solid #fda4af',
            color: '#9f1239',
            fontSize: '0.88rem',
          }}
        >
          <strong>✕ Khách hàng đã từ chối báo giá này:</strong>{' '}
          &ldquo;{quotation.customer_reject_reason}&rdquo;
          {quotation.customer_responded_at && (
            <span style={{ fontSize: '0.8rem', color: '#be123c', marginLeft: '8px' }}>
              ({formatDate(quotation.customer_responded_at)})
            </span>
          )}
        </div>
      )}

      {/* Formal Document Sheet */}
      <article className="qd-document">
        {/* Document Header */}
        <header className="qd-doc-header">
          <div className="qd-brand-block">
            <h2>TRUNG TÂM ĐO LƯỜNG &amp; HIỆU CHUẨN ISOCAL</h2>
            <div className="qd-brand-sub">HỆ THỐNG PHÒNG THỬ NGHIỆM ĐẠT CHUẨN ISO/IEC 17025:2017</div>
            <div className="qd-brand-meta">
              <div>📍 Trụ sở chính: Tầng 1, Tòa nhà Hoa Sơn, Thôn Đoài, Xã Hoàn Sơn, Huyện Tiên Du, Tỉnh Bắc Ninh</div>
              <div>📞 Hotline: 1900 6868 · ✉ Email: kinhdoanh@isocal.vn · Mã số thuế: 2301146239</div>
            </div>
          </div>

          <div className="qd-doc-title-block">
            <h1>BẢNG BÁO GIÁ DỊCH VỤ</h1>
            <div className="qd-doc-code">{quotation.quotation_code || `QT-${quotation.id}`}</div>
            <div className="qd-doc-date">Ngày phát hành: {formatDate(quotation.created_at || new Date())}</div>
          </div>
        </header>

        {/* Two-column Parties Info */}
        <div className="qd-parties-grid">
          <div className="qd-party-col">
            <h4>ĐƠN VỊ CUNG CẤP DỊCH VỤ (BÊN A)</h4>
            <div className="qd-party-name">CÔNG TY CỔ PHẦN ĐO LƯỜNG ISOCAL</div>
            <div className="qd-party-details">
              <div>Mã số thuế: <strong>2301146239</strong></div>
              <div>Trụ sở chính: Tầng 1, Tòa nhà Hoa Sơn, Thôn Đoài, Xã Hoàn Sơn, Huyện Tiên Du, Tỉnh Bắc Ninh</div>
              <div>Người phụ trách kinh doanh: Bộ phận Dịch vụ khách hàng ISOCAL</div>
            </div>
          </div>

          <div className="qd-party-col">
            <h4>ĐƠN VỊ YÊU CẦU DỊCH VỤ (BÊN B - KHÁCH HÀNG)</h4>
            <div className="qd-party-name">{quotation.customer?.company_name || 'Khách hàng'}</div>
            <div className="qd-party-details">
              <div>Mã số thuế: <strong>{quotation.customer?.tax_code || 'Chưa cung cấp'}</strong></div>
              <div>Địa chỉ: {quotation.customer?.address || '—'}</div>
              <div>Hồ sơ khách hàng ID: #{quotation.customer?.id}</div>
            </div>
          </div>
        </div>

        {/* Linked Service Request Banner */}
        <div className="qd-sr-banner">
          <div>
            Kèm theo Phiếu yêu cầu dịch vụ: <strong>{quotation.service_request?.request_code || `#${quotation.service_request_id}`}</strong>
            {' · '}
            Hình thức: <strong>{quotation.service_request?.location_type === 'On-site' ? 'Tận nơi tại Nhà máy (On-site)' : 'Tại phòng Lab ISOCAL (In-lab)'}</strong>
            {' · '}
            {quotation.service_request?.preferred_date && (
              <span>Ngày hẹn tiếp nhận: <strong>{formatDate(quotation.service_request.preferred_date)}</strong></span>
            )}
          </div>
          <Link to={srPath}>
            Xem chi tiết phiếu yêu cầu →
          </Link>
        </div>

        {/* Line Items Table */}
        <section className="qd-table-section">
          <table className="qd-table">
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                <th style={{ width: '28%' }}>Thiết bị</th>
                <th style={{ width: '22%' }}>Dịch vụ kỹ thuật</th>
                <th>Mô tả / Phạm vi thực hiện</th>
                <th style={{ textAlign: 'right', width: '13%' }}>Đơn giá</th>
                <th style={{ textAlign: 'right', width: '11%' }}>Chiết khấu</th>
                <th style={{ textAlign: 'right', width: '14%' }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td style={{ textAlign: 'center', color: '#718096' }}>{idx + 1}</td>
                  <td>
                    <div className="qd-device-title">{item.device?.name || `Thiết bị #${item.service_request_item_id}`}</div>
                    <div className="qd-device-sub">
                      {item.device?.manufacturer && <span>Hãng: {item.device.manufacturer} </span>}
                      {item.device?.model && <span>· Mod: {item.device.model} </span>}
                      {item.device?.serial_number && <span>· SN: {item.device.serial_number}</span>}
                    </div>
                  </td>
                  <td>
                    <strong>{item.service_type?.name || 'Hiệu chuẩn thiết bị'}</strong>
                    <div>
                      <span className="qd-service-badge">
                        {item.service_type?.kind === 'Calibration' ? 'Hiệu chuẩn' : (item.service_type?.kind || 'Hiệu chuẩn')}
                      </span>
                    </div>
                    {item.service_type?.standard_code && (
                      <small style={{ display: 'block', color: '#718096', marginTop: '3px' }}>
                        {item.service_type.standard_code}
                      </small>
                    )}
                  </td>
                  <td style={{ color: '#4a5568', lineHeight: 1.45 }}>
                    {item.description || 'Hiệu chuẩn chuẩn theo quy trình kỹ thuật ISO/IEC 17025'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td style={{ textAlign: 'right', color: item.discount_amount > 0 ? '#c53030' : '#718096' }}>
                    {item.discount_amount > 0 ? `-${formatCurrency(item.discount_amount)}` : '0 ₫'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#1a202c' }}>
                    {formatCurrency(item.final_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Financial Totals Breakdown */}
        <div className="qd-totals-container">
          <div className="qd-totals-box">
            <div className="qd-total-row">
              <span>Cộng tiền dịch vụ (Subtotal):</span>
              <strong>{formatCurrency(quotation.subtotal)}</strong>
            </div>

            {quotation.discount_amount > 0 && (
              <div className="qd-total-row qd-total-row--discount">
                <span>Tổng tiền chiết khấu (Discount):</span>
                <strong>-{formatCurrency(quotation.discount_amount)}</strong>
              </div>
            )}

            {quotation.travel_fee > 0 && (
              <div className="qd-total-row">
                <span>Phí di chuyển & hiện trường (Travel fee):</span>
                <strong>+{formatCurrency(quotation.travel_fee)}</strong>
              </div>
            )}

            <div className="qd-total-row qd-total-row--grand">
              <span>TỔNG CỘNG THANH TOÁN:</span>
              <span style={{ color: '#1a56db' }}>{formatCurrency(quotation.total_amount)}</span>
            </div>

            <div className="qd-amount-in-words">
              <strong>Bằng chữ:</strong> {convertNumberToWords(quotation.total_amount)}
            </div>
          </div>
        </div>

        {/* Technical & Logistics Notes */}
        {(quotation.service_request?.special_notes || quotation.service_request?.accessories_note) && (
          <div className="qd-notes-block">
            <h4>GHI CHÚ KỸ THUẬT & PHỤ KIỆN BÀN GIAO KÈM THEO:</h4>
            {quotation.service_request?.special_notes && (
              <p>🎯 <strong>Yêu cầu điểm hiệu chuẩn:</strong> {quotation.service_request.special_notes}</p>
            )}
            {quotation.service_request?.accessories_note && (
              <p>📦 <strong>Phụ kiện bàn giao:</strong> {quotation.service_request.accessories_note}</p>
            )}
          </div>
        )}

        {/* Terms & Conditions */}
        <section className="qd-terms">
          <h4>ĐIỀU KHOẢN VÀ ĐIỀU KIỆN THƯƠNG MẠI:</h4>
          <ol>
            <li><strong>Thời hạn hiệu lực của báo giá:</strong> Báo giá có giá trị trong vòng 30 ngày kể từ ngày phát hành.</li>
            <li><strong>Thời gian hoàn thành dự kiến:</strong> {formatDate(quotation.estimated_completion_date)} (kể từ ngày bàn giao thiết bị hoặc hoàn tất đo đạc tại hiện trường).</li>
            <li><strong>Tiêu chuẩn & Chứng nhận:</strong> Giấy chứng nhận hiệu chuẩn và tem hiệu chuẩn được phát hành theo tiêu chuẩn ISO/IEC 17025:2017, truy nguyên chuẩn quốc gia và quốc tế.</li>
            <li><strong>Phương thức thanh toán:</strong> Chuyển khoản ngân hàng vào tài khoản bên A trong vòng 15 ngày kể từ ngày nghiệm thu bàn giao chứng nhận và hóa đơn GTGT.</li>
          </ol>
        </section>

        {/* Signatures Grid */}
        <footer className="qd-signatures-grid">
          <div className="qd-sig-box">
            <div className="qd-sig-title">ĐẠI DIỆN KHÁCH HÀNG (BÊN B)</div>
            <div className="qd-sig-sub">Xác nhận chấp thuận báo giá & ký tên</div>
            <div className="qd-sig-placeholder">
              {quotation.status === 'Approved' ? (
                <span style={{ color: '#057a55', fontWeight: 800 }}>✓ ĐÃ CHẤP THUẬN QUA HỆ THỐNG</span>
              ) : quotation.status === 'Rejected' ? (
                <span style={{ color: '#c53030', fontWeight: 800 }}>✕ ĐÃ TỪ CHỐI BÁO GIÁ</span>
              ) : (
                'Ký, đóng dấu (hoặc duyệt trực tuyến)'
              )}
            </div>
            <div className="qd-sig-name">{quotation.customer?.company_name}</div>
          </div>

          <div className="qd-sig-box">
            <div className="qd-sig-title">ĐẠI DIỆN TRUNG TÂM ISOCAL (BÊN A)</div>
            <div className="qd-sig-sub">Phòng Kinh doanh & Dịch vụ khách hàng</div>
            <div className="qd-sig-placeholder">
              <span style={{ color: '#1a56db', fontWeight: 800 }}>ISOCAL CALIBRATION CENTER</span>
            </div>
            <div className="qd-sig-name">Nguyễn Hoàng Nam · Sales Dept</div>
          </div>
        </footer>
      </article>

      {/* Modal: Sales Submit Draft to HeadSales Confirmation */}
      {sendConfirmOpen && (
        <div className="sr-modal-overlay" role="dialog" aria-modal="true">
          <div className="sr-modal-box">
            <div className="sr-modal-header">
              <div>
                <h3>Trình báo giá cho Trưởng phòng KD (HeadSales) duyệt</h3>
                <p>Mã báo giá: <strong>{quotation.quotation_code}</strong></p>
              </div>
            </div>
            <div className="sr-modal-body">
              <p className="sr-modal-desc">
                Báo giá sẽ được chuyển sang trạng thái <strong>Chờ HeadSales duyệt (PendingApproval)</strong>. Sau khi Trưởng phòng Kinh doanh đồng ý phê duyệt, hệ thống sẽ chính thức gửi báo giá tới khách hàng <strong>{quotation.customer?.company_name}</strong>.
              </p>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem' }}>
                Tổng giá trị: <strong style={{ color: '#1a56db' }}>{formatCurrency(quotation.total_amount)}</strong>
              </div>

              {quotation.head_sales_decision === 'Rejected' && (
                <div style={{ marginTop: '12px' }}>
                  {quotation.last_rejected_total != null && (
                    <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.82rem', color: '#991b1b', marginBottom: '10px' }}>
                      <strong>Lần từ chối trước:</strong> Tổng tiền {formatCurrency(quotation.last_rejected_total)} · Chiết khấu: {formatCurrency(quotation.last_rejected_discount || 0)}
                      {Math.abs(Number(quotation.total_amount) - Number(quotation.last_rejected_total)) < 0.01 &&
                       Math.abs(Number(quotation.total_discount_amount || 0) - Number(quotation.last_rejected_discount || 0)) < 0.01 && (
                        <div style={{ marginTop: '4px', fontWeight: 600, color: '#dc2626' }}>
                          ⚠️ Cảnh báo: Bạn chưa thay đổi tổng tiền hoặc chiết khấu so với lúc bị từ chối! Vui lòng vào Chỉnh sửa báo giá cập nhật lại trước khi trình duyệt.
                        </div>
                      )}
                    </div>
                  )}

                  <label className="csr-field" style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 600 }}>Ghi chú giải trình chỉnh sửa (Bắt buộc) *</span>
                    <textarea
                      disabled={actionLoading}
                      onChange={(e) => setSubmissionNote(e.target.value)}
                      placeholder="Nêu rõ các thay đổi bạn đã thực hiện theo yêu cầu của Trưởng phòng..."
                      rows={3}
                      value={submissionNote}
                    />
                  </label>
                </div>
              )}

              {actionError && <div className="csr-inline-error" style={{ marginTop: '12px' }}>{actionError}</div>}
            </div>
            <div className="sr-modal-actions">
              <button
                className="button button-secondary"
                disabled={actionLoading}
                onClick={() => setSendConfirmOpen(false)}
                type="button"
              >
                Hủy bỏ
              </button>
              <button
                className="button button-primary"
                disabled={
                  actionLoading ||
                  (quotation.head_sales_decision === 'Rejected' &&
                   quotation.last_rejected_total != null &&
                   Math.abs(Number(quotation.total_amount) - Number(quotation.last_rejected_total)) < 0.01 &&
                   Math.abs(Number(quotation.total_discount_amount || 0) - Number(quotation.last_rejected_discount || 0)) < 0.01)
                }
                onClick={handleSendDraft}
                type="button"
              >
                {actionLoading ? 'Đang trình duyệt...' : '📤 Xác nhận trình HeadSales duyệt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sales Recall Pending Submission */}
      {recallConfirmOpen && (
        <div className="sr-modal-overlay" role="dialog" aria-modal="true">
          <div className="sr-modal-box">
            <div className="sr-modal-header">
              <div>
                <h3 style={{ color: '#b45309' }}>↩ Thu hồi báo giá về bản nháp</h3>
                <p>Mã báo giá: <strong>{quotation.quotation_code}</strong></p>
              </div>
            </div>
            <div className="sr-modal-body">
              <p className="sr-modal-desc">
                Báo giá đang trong hàng chờ HeadSales duyệt. Bạn có chắc chắn muốn thu hồi về trạng thái <strong>Bản nháp (Draft)</strong> để tiếp tục chỉnh sửa không?
              </p>
              {actionError && <div className="csr-inline-error" style={{ marginTop: '12px' }}>{actionError}</div>}
            </div>
            <div className="sr-modal-actions">
              <button
                className="button button-secondary"
                disabled={actionLoading}
                onClick={() => setRecallConfirmOpen(false)}
                type="button"
              >
                Hủy bỏ
              </button>
              <button
                className="button button-secondary"
                disabled={actionLoading}
                onClick={handleRecall}
                style={{ borderColor: '#f59e0b', color: '#b45309', fontWeight: 600 }}
                type="button"
              >
                {actionLoading ? 'Đang thu hồi...' : '↩ Xác nhận thu hồi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: HeadSales Approve / Reject */}
      {headSalesModal && (
        <div className="sr-modal-overlay" role="dialog" aria-modal="true">
          <div className="sr-modal-box">
            <div className="sr-modal-header">
              <div>
                <h3 style={{ color: headSalesModal === 'approve' ? '#065f46' : '#991b1b' }}>
                  {headSalesModal === 'approve'
                    ? '✓ Phê duyệt & Gửi báo giá cho Khách hàng'
                    : '✕ Yêu cầu nhân viên Sales chỉnh sửa lại báo giá'}
                </h3>
                <p>Mã báo giá: <strong>{quotation.quotation_code}</strong></p>
              </div>
            </div>
            <div className="sr-modal-body">
              <p className="sr-modal-desc">
                {headSalesModal === 'approve'
                  ? `Xác nhận đồng ý phương án giá cho khách hàng "${quotation.customer?.company_name}". Báo giá sẽ chuyển sang trạng thái Đã gửi (Sent) để khách hàng xem xét và phản hồi.`
                  : 'Báo giá sẽ được chuyển về trạng thái Nháp (Draft) kèm ghi chú yêu cầu chỉnh sửa để nhân viên Sales điều chỉnh lại.'}
              </p>

              {quotation.sales_submission_note && (
                <div style={{ marginBottom: 12, padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: '0.85rem' }}>
                  <strong style={{ color: '#1e40af' }}>
                    📝 Ghi chú giải trình của Sales {quotation.submission_count > 1 ? `(Lần nộp #${quotation.submission_count})` : ''}:
                  </strong>
                  <p style={{ margin: '4px 0 0', color: '#1e3a8a', whiteSpace: 'pre-line' }}>
                    {quotation.sales_submission_note}
                  </p>
                </div>
              )}

              <label className="csr-field" style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                <span>
                  {headSalesModal === 'approve'
                    ? 'Ghi chú phê duyệt (Tùy chọn)'
                    : 'Lý do từ chối / Hướng dẫn chỉnh sửa cho Sales *'}
                </span>
                <textarea
                  disabled={actionLoading}
                  onChange={(e) => setHeadSalesNote(e.target.value)}
                  placeholder={
                    headSalesModal === 'approve'
                      ? 'VD: Đã duyệt đơn giá và chiết khấu...'
                      : 'VD: Giảm mức chiết khấu dòng 1 xuống tối đa 10%...'
                  }
                  rows={3}
                  value={headSalesNote}
                />
              </label>
              {actionError && <div className="csr-inline-error" style={{ marginTop: '12px' }}>{actionError}</div>}
            </div>
            <div className="sr-modal-actions">
              <button
                className="button button-secondary"
                disabled={actionLoading}
                onClick={() => setHeadSalesModal(null)}
                type="button"
              >
                Hủy bỏ
              </button>
              <button
                className={`button ${headSalesModal === 'approve' ? 'button-success' : 'button-danger'}`}
                disabled={actionLoading}
                onClick={handleHeadSalesReview}
                type="button"
              >
                {actionLoading
                  ? 'Đang xử lý...'
                  : headSalesModal === 'approve'
                    ? '✓ Đồng ý duyệt & Gửi khách hàng'
                    : '✕ Trả về Sales chỉnh sửa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Customer Approve Confirmation */}
      {approveConfirmOpen && (
        <div className="sr-modal-overlay" role="dialog" aria-modal="true">
          <div className="sr-modal-box">
            <div className="sr-modal-header">
              <div>
                <h3 style={{ color: '#065f46' }}>Xác nhận chấp thuận báo giá</h3>
                <p>Mã báo giá: <strong>{quotation.quotation_code}</strong></p>
              </div>
            </div>
            <div className="sr-modal-body">
              <p className="sr-modal-desc">
                Quý khách đồng ý với chi phí và các điều khoản trong báo giá này. Phiếu yêu cầu sẽ được chuyển sang trạng thái <strong>Đã xác nhận (Confirmed)</strong> để trung tâm chuẩn bị tiếp nhận thiết bị.
              </p>
              <div style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '0.9rem' }}>
                Tổng thanh toán: <strong style={{ color: '#15803d' }}>{formatCurrency(quotation.total_amount)}</strong>
              </div>
              {actionError && <div className="csr-inline-error" style={{ marginTop: '12px' }}>{actionError}</div>}
            </div>
            <div className="sr-modal-actions">
              <button
                className="button button-secondary"
                disabled={actionLoading}
                onClick={() => setApproveConfirmOpen(false)}
                type="button"
              >
                Đóng
              </button>
              <button
                className="button button-success"
                disabled={actionLoading}
                onClick={handleApprove}
                type="button"
              >
                {actionLoading ? 'Đang xác nhận...' : 'Đồng ý chấp thuận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Customer Reject with reason */}
      {rejectModalOpen && (
        <div className="sr-modal-overlay" role="dialog" aria-modal="true">
          <div className="sr-modal-box sr-modal-box--danger">
            <div className="sr-modal-header">
              <div className="sr-modal-danger-icon">⚠️</div>
              <div>
                <h3>Từ chối báo giá dịch vụ</h3>
                <p>Mã báo giá: <strong>{quotation.quotation_code}</strong></p>
              </div>
            </div>
            <div className="sr-modal-body">
              <p className="sr-modal-desc">
                Vui lòng cung cấp lý do từ chối để bộ phận kinh doanh ISOCAL có thể liên hệ hỗ trợ hoặc điều chỉnh báo giá phù hợp hơn.
              </p>
              <label className="csr-field">
                <span>Lý do từ chối (Tùy chọn)</span>
                <textarea
                  disabled={actionLoading}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="VD: Chi phí vượt ngân sách, cần thay đổi thời gian hoàn thành, chưa cần hiệu chuẩn thiết bị này..."
                  rows={3}
                  value={rejectReason}
                />
              </label>
              {actionError && <div className="csr-inline-error" style={{ marginTop: '12px' }}>{actionError}</div>}
            </div>
            <div className="sr-modal-actions">
              <button
                className="button button-secondary"
                disabled={actionLoading}
                onClick={() => setRejectModalOpen(false)}
                type="button"
              >
                Hủy bỏ
              </button>
              <button
                className="button button-danger"
                disabled={actionLoading}
                onClick={handleReject}
                type="button"
              >
                {actionLoading ? 'Đang gửi...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuotationDetailPage;

