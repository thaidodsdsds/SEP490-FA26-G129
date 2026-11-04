import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  approveQuotationApi,
  extractApiErrorMessage,
  getQuotationDetailApi,
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
  const { id } = useParams();
  const navigate = useNavigate();
  const isSales = role === 'sales';

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Modals
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
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
    setActionLoading(true);
    setActionError('');
    try {
      const updated = await sendDraftQuotationApi(quotation.id);
      setQuotation((prev) => ({ ...prev, ...updated, status: 'Sent' }));
      setSendConfirmOpen(false);
      showToast('Đã phát hành và gửi báo giá chính thức cho khách hàng.');
    } catch (err) {
      setActionError(extractApiErrorMessage(err, 'Không thể gửi báo giá.'));
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
    Sent: 'qd-status-ribbon--sent',
    Approved: 'qd-status-ribbon--approved',
    Rejected: 'qd-status-ribbon--rejected',
  }[quotation.status] || 'qd-status-ribbon--sent';

  const statusLabel = {
    Draft: 'Bản nháp (Draft)',
    Sent: 'Đã gửi khách hàng (Sent)',
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
          {isSales && quotation.can_send && (
            <button
              className="button button-primary"
              onClick={() => {
                setActionError('');
                setSendConfirmOpen(true);
              }}
              type="button"
            >
              ✉ Gửi báo giá cho khách hàng
            </button>
          )}

          {isSales && (quotation.status === 'Draft' || quotation.status === 'Sent') && (
            <Link
              className="button button-secondary"
              to={`/internal/sales/quotations?requestId=${quotation.service_request_id}`}
            >
              ✎ Cập nhật báo giá
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

      {/* Formal Document Sheet */}
      <article className="qd-document">
        {/* Document Header */}
        <header className="qd-doc-header">
          <div className="qd-brand-block">
            <h2>TRUNG TÂM ĐO LƯỜNG & HIỆU CHUẨN ISOCAL</h2>
            <div className="qd-brand-sub">HỆ THỐNG PHÒNG THỬ NGHIỆM ĐẠT CHUẨN ISO/IEC 17025:2017</div>
            <div className="qd-brand-meta">
              <div>📍 Tầng 1, Khu Công nghệ cao, TP. Thủ Đức, TP. Hồ Chí Minh</div>
              <div>📞 Hotline: 1900 6868 · ✉ Email: kinhdoanh@isocal.vn · Mã số thuế: 0316889988</div>
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
              <div>MST: <strong>0316889988</strong></div>
              <div>Địa chỉ: Khu Công nghệ cao, TP. Thủ Đức, TP.HCM</div>
              <div>Số tài khoản: <strong>1188.8888.6868</strong> tại Ngân hàng TMCP Quân Đội (MBBank)</div>
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

      {/* Modal: Sales Send Draft Confirmation */}
      {sendConfirmOpen && (
        <div className="sr-modal-overlay" role="dialog" aria-modal="true">
          <div className="sr-modal-box">
            <div className="sr-modal-header">
              <div>
                <h3>Xác nhận gửi báo giá cho khách hàng</h3>
                <p>Mã báo giá: <strong>{quotation.quotation_code}</strong></p>
              </div>
            </div>
            <div className="sr-modal-body">
              <p className="sr-modal-desc">
                Báo giá sẽ được chuyển sang trạng thái <strong>Đã gửi (Sent)</strong> và hiển thị tới khách hàng <strong>{quotation.customer?.company_name}</strong> để xem xét và phản hồi.
              </p>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem' }}>
                Tổng giá trị: <strong style={{ color: '#1a56db' }}>{formatCurrency(quotation.total_amount)}</strong>
              </div>
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
                disabled={actionLoading}
                onClick={handleSendDraft}
                type="button"
              >
                {actionLoading ? 'Đang gửi...' : 'Xác nhận gửi'}
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

