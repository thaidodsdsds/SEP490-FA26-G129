import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import { openCertificatePdfApi } from '../../../services/certificate-service.js';
import {
  getSealDetailApi,
  getSealQrBlobApi,
  getSealsApi,
  openSealPdfApi,
} from '../../../services/seal-service.js';
import './customer-records.css';

const EMPTY_SUMMARY = {
  total: 0,
  active: 0,
  expiring_soon: 0,
  expired: 0,
  revoked: 0,
  pending_payment: 0,
};

const STATUS_FILTERS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'Active', label: 'Đang hiệu lực' },
  { key: 'ExpiringSoon', label: 'Sắp hết hạn' },
  { key: 'Expired', label: 'Hết hạn' },
  { key: 'Revoked', label: 'Đã thu hồi' },
  { key: 'PendingPayment', label: 'Chờ thanh toán' },
];

const errorMessage = (error) =>
  error?.response?.data?.error?.message || error?.message || 'Đã xảy ra lỗi khi gọi máy chủ.';

const daysText = (days) => {
  if (days === null || days === undefined || Number.isNaN(Number(days))) return '—';
  const value = Number(days);
  if (value < 0) return `Quá hạn ${Math.abs(value)} ngày`;
  if (value === 0) return 'Hết hạn hôm nay';
  return `Còn ${value} ngày`;
};

const statusClass = (seal) => {
  if (seal?.status === 'Revoked' || seal?.status === 'Expired') return 'cr-badge-red';
  if (seal?.status === 'PendingPayment' || seal?.is_expiring_soon) return 'cr-badge-amber';
  if (seal?.status === 'Active') return 'cr-badge-green';
  return 'cr-badge-slate';
};

const bannerClass = (seal) => {
  if (seal?.status === 'Revoked' || seal?.status === 'Expired') return 'cr-alert cr-alert-error';
  if (seal?.status === 'PendingPayment' || seal?.is_expiring_soon) return 'cr-banner cr-badge-amber';
  return 'cr-banner cr-badge-green';
};

const bannerTitle = (seal) => {
  if (seal?.status === 'Revoked') return '⛔ Tem đã bị thu hồi';
  if (seal?.status === 'Expired') return '⚠ Tem đã hết hạn';
  if (seal?.status === 'PendingPayment') return '◷ Tem đang chờ thanh toán';
  if (seal?.is_expiring_soon) return '◷ Tem sắp hết hạn';
  return '✓ Tem đang hiệu lực';
};

function CustomerSealsPage() {
  const [data, setData] = useState({ items: [], summary: EMPTY_SUMMARY });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detail, setDetail] = useState({
    open: false,
    loading: false,
    error: '',
    seal: null,
  });
  const [qr, setQr] = useState({ url: '', loading: false, error: '' });
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [certPdfLoadingId, setCertPdfLoadingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const loadSeals = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await getSealsApi({ status: 'all', limit: 100 });
      setData({
        items: Array.isArray(result?.items) ? result.items : [],
        summary: result?.summary ?? EMPTY_SUMMARY,
      });
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSeals();
  }, [loadSeals]);

  const closeDetail = useCallback(() => {
    setDetail({ open: false, loading: false, error: '', seal: null });
    setActionError('');
  }, []);

  useEffect(() => {
    if (!detail.open) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') closeDetail();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [detail.open, closeDetail]);

  useEffect(() => {
    const sealId = detail.seal?.id;
    if (!detail.open || !sealId) {
      setQr({ url: '', loading: false, error: '' });
      return undefined;
    }

    let cancelled = false;
    let objectUrl = '';
    setQr({ url: '', loading: true, error: '' });

    getSealQrBlobApi(sealId)
      .then((blobData) => {
        if (cancelled) return;
        const blob =
          blobData instanceof Blob ? blobData : new Blob([blobData], { type: 'image/png' });
        objectUrl = URL.createObjectURL(new Blob([blob], { type: 'image/png' }));
        setQr({ url: objectUrl, loading: false, error: '' });
      })
      .catch((error) => {
        if (!cancelled) setQr({ url: '', loading: false, error: errorMessage(error) });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [detail.open, detail.seal?.id]);

  const stats = useMemo(() => {
    const summary = data.summary ?? EMPTY_SUMMARY;
    return {
      total: summary.total ?? data.items.length,
      active: summary.active ?? 0,
      expiringSoon: summary.expiring_soon ?? 0,
      expired: summary.expired ?? 0,
      revoked: summary.revoked ?? 0,
    };
  }, [data.summary, data.items.length]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.items.filter((item) => {
      if (statusFilter === 'ExpiringSoon') {
        if (!item.is_expiring_soon) return false;
      } else if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      if (!term) return true;
      return [
        item.seal_code,
        item.certificate_no,
        item.device,
        item.device_name,
        item.serial_number,
        item.internal_code,
        item.service_name,
        item.status_label,
        item.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [data.items, search, statusFilter]);

  const openDetail = async (row) => {
    setActionError('');
    setDetail({ open: true, loading: true, error: '', seal: row });
    try {
      const seal = await getSealDetailApi(row.id);
      setDetail({ open: true, loading: false, error: '', seal });
    } catch (error) {
      setDetail((current) => ({
        ...current,
        loading: false,
        error: errorMessage(error),
      }));
    }
  };

  const handleOpenSealPdf = async (seal) => {
    setActionError('');
    setPdfLoadingId(seal.id);
    try {
      await openSealPdfApi(seal.id);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleOpenCertificatePdf = async (seal) => {
    if (!seal.certificate_id) {
      setActionError('Tem này chưa liên kết với chứng nhận nào.');
      return;
    }
    setActionError('');
    setCertPdfLoadingId(seal.id);
    try {
      await openCertificatePdfApi(seal.certificate_id);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setCertPdfLoadingId(null);
    }
  };

  const seal = detail.seal;

  return (
    <div className="cr-page">
      <PageHeader
        actions={(
          <div className="cr-header-actions">
            <Link className="cr-btn cr-btn-soft" to="/internal/customer/certificates">
              ← Xem chứng nhận
            </Link>
            <button
              className="cr-btn cr-btn-ghost"
              disabled={loading}
              onClick={loadSeals}
              type="button"
            >
              ↻ Tải lại
            </button>
          </div>
        )}
        description="Theo dõi tem hiệu chuẩn, hạn hiệu lực và tra cứu công khai qua mã tem. Trang này chỉ đọc."
        eyebrow="TEM HIỆU CHUẨN CỦA TÔI"
        title="Tem hiệu chuẩn"
      />

      {loadError ? (
        <div className="cr-alert cr-alert-error" role="alert">
          {loadError}
          <button onClick={loadSeals} type="button">Thử lại</button>
        </div>
      ) : null}

      <section aria-label="Thống kê tem" className="cr-stats">
        <article className="cr-stat">
          <span className="cr-stat-icon cr-badge-blue">▦</span>
          <div>
            <span className="cr-stat-value">{stats.total}</span>
            <span className="cr-stat-label">Tổng số tem</span>
          </div>
        </article>
        <article className="cr-stat">
          <span className="cr-stat-icon cr-badge-green">✓</span>
          <div>
            <span className="cr-stat-value">{stats.active}</span>
            <span className="cr-stat-label">Đang hiệu lực</span>
          </div>
        </article>
        <article className="cr-stat">
          <span className="cr-stat-icon cr-badge-amber">◷</span>
          <div>
            <span className="cr-stat-value">{stats.expiringSoon}</span>
            <span className="cr-stat-label">Sắp hết hạn</span>
          </div>
        </article>
        <article className="cr-stat">
          <span className="cr-stat-icon cr-badge-red">⚠</span>
          <div>
            <span className="cr-stat-value">{stats.expired + stats.revoked}</span>
            <span className="cr-stat-label">Hết hạn / Thu hồi</span>
          </div>
        </article>
      </section>

      <section className="cr-card">
        <div className="cr-card-head">
          <div>
            <h2>Danh sách tem hiệu chuẩn</h2>
            <p>Chọn một tem để xem QR, ngày hiệu lực và liên kết tra cứu công khai.</p>
          </div>
          <label className="cr-search">
            <span aria-hidden="true">🔍</span>
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm mã tem, chứng nhận, thiết bị..."
              type="search"
              value={search}
            />
          </label>
        </div>

        <div aria-label="Lọc theo trạng thái" className="cr-filters">
          {STATUS_FILTERS.map((filter) => (
            <button
              className={`cr-chip ${statusFilter === filter.key ? 'is-active' : ''}`}
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="cr-loading">Đang tải tem từ máy chủ...</div>
        ) : filteredItems.length === 0 ? (
          <div className="cr-empty">
            {search.trim() || statusFilter !== 'all'
              ? 'Không tìm thấy tem phù hợp với bộ lọc.'
              : 'Chưa có tem hiệu chuẩn nào được phát hành cho doanh nghiệp của bạn.'}
          </div>
        ) : (
          <div className="cr-table-wrap">
            <table className="cr-table">
              <thead>
                <tr>
                  <th>Mã tem</th>
                  <th>Thiết bị</th>
                  <th>Chứng nhận</th>
                  <th>Ngày hiệu chuẩn</th>
                  <th>Hạn hiệu lực</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openDetail(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') openDetail(item);
                    }}
                    tabIndex={0}
                  >
                    <td>
                      <span className="cr-code">{item.seal_code}</span>
                      <span className="cr-sub">{item.service_name || 'Hiệu chuẩn'}</span>
                    </td>
                    <td>
                      <span>{item.device_name || '—'}</span>
                      <span className="cr-sub">{item.serial_number || item.internal_code || '—'}</span>
                    </td>
                    <td>{item.certificate_no || '—'}</td>
                    <td>{item.cal_date_formatted || '—'}</td>
                    <td>
                      <span>{item.due_date_formatted || '—'}</span>
                      <span className="cr-sub">{daysText(item.days_remaining)}</span>
                    </td>
                    <td>
                      <span className={`cr-badge ${statusClass(item)}`}>
                        {item.status_label || item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detail.open ? (
        <div
          className="cr-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetail();
          }}
        >
          <div aria-modal="true" className="cr-modal" role="dialog">
            <header className="cr-modal-head">
              <div>
                <h2>{seal?.seal_code || 'Chi tiết tem hiệu chuẩn'}</h2>
                <p>{seal?.certificate_no || 'Chưa liên kết chứng nhận'} · Chế độ xem (chỉ đọc)</p>
              </div>
              <button
                aria-label="Đóng chi tiết"
                className="cr-modal-close"
                onClick={closeDetail}
                type="button"
              >
                ×
              </button>
            </header>

            <div className="cr-modal-body">
              {detail.loading ? (
                <div className="cr-loading">Đang tải chi tiết tem...</div>
              ) : detail.error ? (
                <div className="cr-alert cr-alert-error" role="alert">{detail.error}</div>
              ) : seal ? (
                <>
                  <div className={bannerClass(seal)}>
                    <strong>{bannerTitle(seal)}</strong>
                    {seal.status_label || seal.status} · {daysText(seal.days_remaining)}
                    {seal.due_date_formatted ? ` · Hạn ${seal.due_date_formatted}` : ''}
                    {seal.revocation?.reason ? ` · Lý do thu hồi: ${seal.revocation.reason}` : ''}
                  </div>

                  <div className="cr-detail-grid">
                    <div className="cr-detail-item">
                      <small>Mã QR tem</small>
                      {qr.loading ? (
                        <div className="cr-qr-placeholder">Đang tải QR...</div>
                      ) : qr.url ? (
                        <img alt={`QR tem ${seal.seal_code}`} className="cr-qr" src={qr.url} />
                      ) : (
                        <div className="cr-qr-placeholder">{qr.error || 'Không có QR'}</div>
                      )}
                    </div>
                    <div className="cr-detail-item">
                      <small>Mã tem</small>
                      <strong>{seal.seal_code || '—'}</strong>
                      <small style={{ marginTop: '10px' }}>Trạng thái</small>
                      <strong>
                        <span className={`cr-badge ${statusClass(seal)}`}>
                          {seal.status_label || seal.status}
                        </span>
                      </strong>
                      <small style={{ marginTop: '10px' }}>Ngày hiệu chuẩn</small>
                      <strong>{seal.cal_date_formatted || '—'}</strong>
                      <small style={{ marginTop: '10px' }}>Hạn hiệu lực</small>
                      <strong>{seal.due_date_formatted || '—'}</strong>
                    </div>
                    <div className="cr-detail-item">
                      <small>Thiết bị</small>
                      <strong>{seal.device || seal.device_name || '—'}</strong>
                      <small style={{ marginTop: '10px' }}>Mã quản lý / Serial</small>
                      <strong>
                        {seal.internal_code || '—'} / {seal.serial_number || '—'}
                      </strong>
                      <small style={{ marginTop: '10px' }}>Dịch vụ</small>
                      <strong>{seal.service_name || '—'}</strong>
                    </div>
                    <div className="cr-detail-item">
                      <small>Chứng nhận</small>
                      <strong>{seal.certificate_no || '—'}</strong>
                      <small style={{ marginTop: '10px' }}>Người ký chứng nhận</small>
                      <strong>{seal.signer_name || '—'}</strong>
                      <small style={{ marginTop: '10px' }}>Thời gian ký</small>
                      <strong>{seal.signed_at_formatted || '—'}</strong>
                    </div>
                  </div>

                  {actionError ? (
                    <div className="cr-alert cr-alert-error" role="alert">{actionError}</div>
                  ) : null}

                  <p className="cr-help">
                    Mã tem công khai: <strong>{seal.seal_code}</strong>. Bất kỳ ai có mã này đều tra cứu
                    được trạng thái tem tại trang công khai.
                  </p>

                  <div className="cr-modal-actions">
                    <button
                      className="cr-btn cr-btn-primary"
                      disabled={pdfLoadingId === seal.id}
                      onClick={() => handleOpenSealPdf(seal)}
                      type="button"
                    >
                      {pdfLoadingId === seal.id ? 'Đang mở PDF...' : '🖨 Mở PDF tem'}
                    </button>
                    <button
                      className="cr-btn cr-btn-ghost"
                      disabled={!seal.certificate_id || certPdfLoadingId === seal.id}
                      onClick={() => handleOpenCertificatePdf(seal)}
                      type="button"
                    >
                      {certPdfLoadingId === seal.id ? 'Đang mở...' : '📄 Chứng nhận PDF'}
                    </button>
                    <a
                      className="cr-btn cr-btn-soft"
                      href={`/verify/${encodeURIComponent(seal.seal_code || '')}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      🔎 Tra cứu công khai
                    </a>
                    <button className="cr-btn cr-btn-ghost" onClick={closeDetail} type="button">
                      Đóng
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CustomerSealsPage;
