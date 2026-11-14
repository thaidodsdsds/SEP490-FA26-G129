import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import Toast from '../../../components/ui/Toast.jsx';
import {
  extractApiErrorMessage,
  headSalesReviewQuotationApi,
  listQuotationsApi,
} from '../../../services/quotation-service.js';
import { formatCurrency } from '../../../utils/formatters.js';
import '../customers/sales-customers.css';

const STATUS_META = {
  PendingApproval: {
    label: '⏳ Chờ HeadSales duyệt',
    bg: '#fef3c7',
    color: '#92400e',
    border: '#fcd34d',
  },
  Draft: {
    label: '✎ Bản nháp (Draft)',
    bg: '#f1f5f9',
    color: '#334155',
    border: '#cbd5e1',
  },
  Sent: {
    label: '✉ Đã duyệt & Gửi khách (Sent)',
    bg: '#dbeafe',
    color: '#1e40af',
    border: '#93c5fd',
  },
  Approved: {
    label: '✓ Khách đã chấp thuận (Approved)',
    bg: '#dcfce7',
    color: '#166534',
    border: '#86efac',
  },
  Rejected: {
    label: '✕ Khách từ chối (Rejected)',
    bg: '#fee2e2',
    color: '#991b1b',
    border: '#fca5a5',
  },
};

export default function HeadSalesQuotationApprovalPage() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const [statusFilter, setStatusFilter] = useState('PendingApproval');
  const [search, setSearch] = useState('');

  // Modal state for Approve / Reject
  const [reviewModal, setReviewModal] = useState(null); // { quotation, decision: 'approve' | 'reject' }
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listQuotationsApi();
      const list = Array.isArray(data) ? data : [];
      setQuotations(list);
      // If there are no PendingApproval items on initial load, still keep filter or let user switch easily
    } catch (err) {
      setError(
        extractApiErrorMessage(err, 'Không thể tải danh sách báo giá chờ phê duyệt.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const counts = useMemo(() => {
    return {
      all: quotations.length,
      pendingApproval: quotations.filter((q) => q.status === 'PendingApproval').length,
      sent: quotations.filter((q) => q.status === 'Sent').length,
      approved: quotations.filter((q) => q.status === 'Approved').length,
      draft: quotations.filter((q) => q.status === 'Draft').length,
      rejected: quotations.filter((q) => q.status === 'Rejected').length,
    };
  }, [quotations]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter((q) => {
      if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        const text = `${q.quotation_code || ''} ${q.service_request?.request_code || ''} ${q.customer?.company_name || ''} ${q.created_by_name || ''}`.toLowerCase();
        if (!text.includes(term)) return false;
      }
      return true;
    });
  }, [quotations, search, statusFilter]);

  const handleOpenReview = (quotation, decision) => {
    setReviewModal({ quotation, decision });
    setReviewNote(quotation.head_sales_note || '');
  };

  const handleConfirmReview = async () => {
    if (!reviewModal?.quotation) return;
    if (reviewModal.decision === 'reject' && !reviewNote.trim()) {
      setToast({
        message: 'Vui lòng nhập lý do hoặc ghi chú hướng dẫn Sales chỉnh sửa lại báo giá.',
        tone: 'danger',
      });
      return;
    }

    setSubmitting(true);
    try {
      const updated = await headSalesReviewQuotationApi(reviewModal.quotation.id, {
        decision: reviewModal.decision,
        note: reviewNote.trim() || undefined,
      });

      setToast({
        message:
          reviewModal.decision === 'approve'
            ? `Đã phê duyệt báo giá ${updated.quotation_code} và chính thức gửi tới khách hàng "${updated.customer?.company_name}".`
            : `Đã trả báo giá ${updated.quotation_code} về trạng thái Nháp (Draft) để nhân viên Sales chỉnh sửa.`,
        tone: 'success',
      });
      setReviewModal(null);
      setReviewNote('');
      await fetchQuotations();
    } catch (err) {
      setToast({
        message: extractApiErrorMessage(err, 'Không thể xử lý phê duyệt báo giá.'),
        tone: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sales-cust-page">
      {toast && (
        <Toast
          message={toast.message}
          onClose={() => setToast(null)}
          tone={toast.tone}
        />
      )}

      <PageHeader
        actions={(
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="button button-secondary"
              disabled={loading}
              onClick={fetchQuotations}
              type="button"
            >
              ↻ Làm mới danh sách
            </button>
            <Link className="button button-secondary" to="/internal/sales/customer-assignments">
              👥 Phân công khách hàng
            </Link>
          </div>
        )}
        description="Kiểm soát đơn giá, tỷ lệ chiết khấu và phí di chuyển của các báo giá do nhân viên Sales trình lên. Chỉ khi HeadSales đồng ý duyệt, báo giá mới được gửi tới tay khách hàng."
        eyebrow="HEAD OF SALES · QUOTATION APPROVAL GATE"
        title="Phê duyệt báo giá trước khi gửi khách hàng"
      />

      {/* Filter KPI Cards */}
      <div className="sales-cust-stats">
        <div
          className="sales-cust-stat-card"
          onClick={() => setStatusFilter('PendingApproval')}
          style={{
            cursor: 'pointer',
            border: statusFilter === 'PendingApproval' ? '2px solid #d97706' : undefined,
          }}
        >
          <div className="sales-cust-stat-icon requests">⏳</div>
          <div className="sales-cust-stat-info">
            <span className="sales-cust-stat-num" style={{ color: '#d97706' }}>
              {counts.pendingApproval}
            </span>
            <span className="sales-cust-stat-label">Chờ HeadSales duyệt</span>
          </div>
        </div>

        <div
          className="sales-cust-stat-card"
          onClick={() => setStatusFilter('Sent')}
          style={{
            cursor: 'pointer',
            border: statusFilter === 'Sent' ? '2px solid #1a56db' : undefined,
          }}
        >
          <div className="sales-cust-stat-icon">✉</div>
          <div className="sales-cust-stat-info">
            <span className="sales-cust-stat-num" style={{ color: '#1a56db' }}>
              {counts.sent}
            </span>
            <span className="sales-cust-stat-label">Đã duyệt &amp; Gửi khách</span>
          </div>
        </div>

        <div
          className="sales-cust-stat-card"
          onClick={() => setStatusFilter('Approved')}
          style={{
            cursor: 'pointer',
            border: statusFilter === 'Approved' ? '2px solid #057a55' : undefined,
          }}
        >
          <div className="sales-cust-stat-icon contracts">✓</div>
          <div className="sales-cust-stat-info">
            <span className="sales-cust-stat-num" style={{ color: '#057a55' }}>
              {counts.approved}
            </span>
            <span className="sales-cust-stat-label">Khách đã đồng ý</span>
          </div>
        </div>

        <div
          className="sales-cust-stat-card"
          onClick={() => setStatusFilter('ALL')}
          style={{
            cursor: 'pointer',
            border: statusFilter === 'ALL' ? '2px solid #334155' : undefined,
          }}
        >
          <div className="sales-cust-stat-icon devices">📋</div>
          <div className="sales-cust-stat-info">
            <span className="sales-cust-stat-num">{counts.all}</span>
            <span className="sales-cust-stat-label">Tất cả báo giá</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="sales-cust-toolbar">
        <div className="sales-cust-filters">
          <input
            className="sales-cust-search-input"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Tìm mã báo giá (QT-...), mã đơn (SR-...), tên khách hàng, nhân viên Sales..."
            type="text"
            value={search}
          />

          <select
            className="sales-cust-select"
            onChange={(e) => setStatusFilter(e.target.value)}
            value={statusFilter}
          >
            <option value="PendingApproval">⏳ Chờ HeadSales duyệt ({counts.pendingApproval})</option>
            <option value="ALL">Tất cả trạng thái ({counts.all})</option>
            <option value="Draft">✎ Bản nháp / Trả về sửa ({counts.draft})</option>
            <option value="Sent">✉ Đã duyệt &amp; Gửi khách ({counts.sent})</option>
            <option value="Approved">✓ Khách đã đồng ý ({counts.approved})</option>
            <option value="Rejected">✕ Khách từ chối ({counts.rejected})</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="sales-cust-table-card">
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#64748b' }}>
            <p>Đang tải danh sách báo giá...</p>
          </div>
        ) : error ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#dc2626' }}>
            <p>⚠ {error}</p>
            <button
              className="sales-cust-btn-secondary"
              onClick={fetchQuotations}
              type="button"
            >
              Thử lại
            </button>
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="sales-cust-empty">
            <div className="sales-cust-empty-icon">✓</div>
            <h4 className="sales-cust-empty-title">
              {statusFilter === 'PendingApproval'
                ? 'Hiện không có báo giá nào đang chờ phê duyệt'
                : 'Không tìm thấy báo giá nào khớp bộ lọc'}
            </h4>
            <p className="sales-cust-empty-desc">
              {statusFilter === 'PendingApproval'
                ? 'Tất cả báo giá do nhân viên Sales trình lên đã được xử lý.'
                : 'Bạn có thể chuyển bộ lọc trạng thái sang "Tất cả trạng thái" để tra cứu toàn bộ báo giá.'}
            </p>
            {statusFilter === 'PendingApproval' && counts.all > 0 && (
              <button
                className="sales-cust-btn-secondary"
                onClick={() => setStatusFilter('ALL')}
                type="button"
              >
                Xem tất cả {counts.all} báo giá
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="sales-cust-table">
              <thead>
                <tr>
                  <th>Mã báo giá &amp; Đơn YC</th>
                  <th>Khách hàng</th>
                  <th>Sales lập</th>
                  <th style={{ textAlign: 'right' }}>Tạm tính</th>
                  <th style={{ textAlign: 'right' }}>Chiết khấu</th>
                  <th style={{ textAlign: 'right' }}>Phí On-site</th>
                  <th style={{ textAlign: 'right' }}>Tổng thanh toán</th>
                  <th>Trạng thái duyệt</th>
                  <th style={{ textAlign: 'right' }}>Thao tác phê duyệt</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotations.map((q) => {
                  const meta = STATUS_META[q.status] || STATUS_META.Draft;
                  const discountPct =
                    q.subtotal > 0 ? Math.round((q.discount_amount / q.subtotal) * 100) : 0;

                  return (
                    <tr key={q.id}>
                      <td>
                        <div className="sales-cust-title-cell">
                          <Link
                            style={{ color: '#1a4ea6', textDecoration: 'none' }}
                            to={`/internal/sales/quotations/${q.id}`}
                          >
                            {q.quotation_code}
                          </Link>
                        </div>
                        <div className="sales-cust-sub-cell">
                          <Link
                            style={{ color: '#475569', fontSize: '0.78rem' }}
                            to={`/internal/sales/service-requests/${q.service_request_id}`}
                          >
                            Đơn: {q.service_request?.request_code || `SR-${q.service_request_id}`}
                          </Link>
                        </div>
                      </td>
                      <td>
                        <strong>{q.customer?.company_name}</strong>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                          MST: {q.customer?.tax_code || '—'} · {q.line_items?.length || 0} thiết bị
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {q.created_by_name ? (
                          <strong>{q.created_by_name}</strong>
                        ) : (
                          <span style={{ color: '#64748b' }}>Sales phụ trách</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatCurrency(q.subtotal)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {q.discount_amount > 0 ? (
                          <div>
                            <strong style={{ color: '#dc2626' }}>
                              -{formatCurrency(q.discount_amount)}
                            </strong>
                            <div style={{ fontSize: '0.72rem', color: discountPct >= 15 ? '#dc2626' : '#64748b' }}>
                              ({discountPct}%)
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>0 ₫</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {q.travel_fee > 0 ? `+${formatCurrency(q.travel_fee)}` : '0 ₫'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#1a56db' }}>
                        {formatCurrency(q.total_amount)}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 999,
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            background: meta.bg,
                            color: meta.color,
                            border: `1px solid ${meta.border}`,
                          }}
                        >
                          {meta.label}
                        </span>
                        {q.head_sales_note && (
                          <div
                            style={{
                              fontSize: '0.74rem',
                              color: q.head_sales_decision === 'Rejected' ? '#b91c1c' : '#475569',
                              marginTop: 4,
                              maxWidth: 220,
                            }}
                          >
                            💬 {q.head_sales_note}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <Link
                            className="sales-cust-btn-secondary"
                            style={{ height: 30, padding: '0 10px', fontSize: '0.78rem', textDecoration: 'none' }}
                            to={`/internal/sales/quotations/${q.id}`}
                          >
                            📄 Chi tiết
                          </Link>
                          {(q.status === 'PendingApproval' || q.status === 'Draft') && (
                            <>
                              <button
                                className="button button-primary"
                                onClick={() => handleOpenReview(q, 'approve')}
                                style={{ height: 30, padding: '0 10px', fontSize: '0.78rem' }}
                                type="button"
                              >
                                ✓ Duyệt &amp; Gửi khách
                              </button>
                              {q.status === 'PendingApproval' && (
                                <button
                                  className="button button-danger"
                                  onClick={() => handleOpenReview(q, 'reject')}
                                  style={{ height: 30, padding: '0 10px', fontSize: '0.78rem' }}
                                  type="button"
                                >
                                  ✕ Yêu cầu sửa
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Approve / Reject */}
      {reviewModal && (
        <div className="sr-modal-overlay" role="dialog" aria-modal="true">
          <div className="sr-modal-box">
            <div className="sr-modal-header">
              <div>
                <h3 style={{ color: reviewModal.decision === 'approve' ? '#065f46' : '#991b1b' }}>
                  {reviewModal.decision === 'approve'
                    ? '✓ Phê duyệt & Phát hành báo giá tới Khách hàng'
                    : '✕ Yêu cầu nhân viên Sales chỉnh sửa lại báo giá'}
                </h3>
                <p>
                  Mã báo giá: <strong>{reviewModal.quotation.quotation_code}</strong> · Khách hàng:{' '}
                  <strong>{reviewModal.quotation.customer?.company_name}</strong>
                </p>
              </div>
            </div>

            <div className="sr-modal-body">
              <div
                style={{
                  padding: '12px 14px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  marginBottom: 14,
                  fontSize: '0.86rem',
                }}
              >
                <div>
                  Tạm tính: <b>{formatCurrency(reviewModal.quotation.subtotal)}</b> · Chiết khấu:{' '}
                  <b style={{ color: '#dc2626' }}>
                    -{formatCurrency(reviewModal.quotation.discount_amount)}
                  </b>{' '}
                  · Phí di chuyển: <b>+{formatCurrency(reviewModal.quotation.travel_fee)}</b>
                </div>
                <div style={{ marginTop: 4, fontSize: '0.95rem' }}>
                  Tổng thanh toán:{' '}
                  <strong style={{ color: '#1a56db' }}>
                    {formatCurrency(reviewModal.quotation.total_amount)}
                  </strong>
                </div>
              </div>

              <label className="csr-field" style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  {reviewModal.decision === 'approve'
                    ? 'Ghi chú phê duyệt của HeadSales (Tùy chọn)'
                    : 'Lý do từ chối / Yêu cầu chỉnh sửa cho nhân viên Sales *'}
                </span>
                <textarea
                  disabled={submitting}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder={
                    reviewModal.decision === 'approve'
                      ? 'VD: Đã kiểm tra mức chiết khấu hợp lệ, đồng ý gửi khách hàng...'
                      : 'VD: Chiết khấu vượt khung cho phép, vui lòng giảm chiết khấu dòng 2 xuống tối đa 10%...'
                  }
                  rows={3}
                  style={{
                    width: '100%',
                    padding: 10,
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                  }}
                  value={reviewNote}
                />
              </label>
            </div>

            <div className="sr-modal-actions">
              <button
                className="button button-secondary"
                disabled={submitting}
                onClick={() => setReviewModal(null)}
                type="button"
              >
                Hủy
              </button>
              <button
                className={`button ${
                  reviewModal.decision === 'approve' ? 'button-primary' : 'button-danger'
                }`}
                disabled={submitting}
                onClick={handleConfirmReview}
                type="button"
              >
                {submitting
                  ? 'Đang xử lý...'
                  : reviewModal.decision === 'approve'
                    ? '✓ Đồng ý duyệt & Gửi khách hàng'
                    : '✕ Trả về Sales chỉnh sửa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

