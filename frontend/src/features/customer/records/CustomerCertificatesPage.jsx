import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import {
  getCertificateDetailApi,
  getCertificatesApi,
  openCertificatePdfApi,
} from '../../../services/certificate-service.js';
import './customer-records.css';

const STATUS_LABEL = {
  Draft: 'Bản nháp',
  PendingPayment: 'Chờ thanh toán',
  Released: 'Đã phát hành',
};

const errorMessage = (error) =>
  error?.response?.data?.error?.message || error?.message || 'Đã xảy ra lỗi khi gọi máy chủ.';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const numberText = (value, unit) => {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  const text = Number.isNaN(numeric)
    ? String(value)
    : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(numeric);
  return unit ? `${text} ${unit}` : text;
};

const statusClass = (status) => {
  if (status === 'Released') return 'cr-badge-green';
  if (status === 'PendingPayment') return 'cr-badge-amber';
  if (status === 'Draft') return 'cr-badge-slate';
  return 'cr-badge-slate';
};

function CustomerCertificatesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState({
    open: false,
    loading: false,
    error: '',
    certificate: null,
  });
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const loadCertificates = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await getCertificatesApi({ status: 'Released', limit: 100 });
      setItems(Array.isArray(result?.items) ? result.items : []);
    } catch (error) {
      setLoadError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  const closeDetail = useCallback(() => {
    setDetail({ open: false, loading: false, error: '', certificate: null });
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

  const stats = useMemo(() => {
    const withSeal = items.filter((item) => Boolean(item.seal?.id)).length;
    return {
      total: items.length,
      withSeal,
      withoutSeal: items.length - withSeal,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [
        item.certificate_no,
        item.record_code,
        item.device,
        item.device_name,
        item.serial_number,
        item.service_name,
        item.seal?.seal_code,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [items, search]);

  const openDetail = async (row) => {
    setActionError('');
    setDetail({ open: true, loading: true, error: '', certificate: row });
    try {
      const certificate = await getCertificateDetailApi(row.id);
      setDetail({ open: true, loading: false, error: '', certificate });
    } catch (error) {
      setDetail((current) => ({
        ...current,
        loading: false,
        error: errorMessage(error),
      }));
    }
  };

  const handleOpenPdf = async (certificate) => {
    setActionError('');
    setPdfLoadingId(certificate.id);
    try {
      await openCertificatePdfApi(certificate.id);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setPdfLoadingId(null);
    }
  };

  const certificate = detail.certificate;
  const measurements = certificate?.measurements ?? [];
  const signatures = certificate?.signatures ?? [];
  const canDownloadPdf =
    certificate?.status === 'Released' || Boolean(certificate?.file_url);

  return (
    <div className="cr-page">
      <PageHeader
        actions={(
          <div className="cr-header-actions">
            <Link className="cr-btn cr-btn-soft" to="/internal/customer/seals">
              Xem tem hiệu chuẩn →
            </Link>
            <button
              className="cr-btn cr-btn-ghost"
              disabled={loading}
              onClick={loadCertificates}
              type="button"
            >
              ↻ Tải lại
            </button>
          </div>
        )}
        description="Tra cứu các chứng nhận hiệu chuẩn đã được ký phát hành cho thiết bị của doanh nghiệp. Trang này chỉ đọc."
        eyebrow="CHỨNG NHẬN CỦA TÔI"
        title="Chứng nhận hiệu chuẩn"
      />

      {loadError ? (
        <div className="cr-alert cr-alert-error" role="alert">
          {loadError}
          <button onClick={loadCertificates} type="button">Thử lại</button>
        </div>
      ) : null}

      <section aria-label="Thống kê chứng nhận" className="cr-stats">
        <article className="cr-stat">
          <span className="cr-stat-icon cr-badge-blue">▤</span>
          <div>
            <span className="cr-stat-value">{stats.total}</span>
            <span className="cr-stat-label">Chứng nhận đã phát hành</span>
          </div>
        </article>
        <article className="cr-stat">
          <span className="cr-stat-icon cr-badge-green">✓</span>
          <div>
            <span className="cr-stat-value">{stats.withSeal}</span>
            <span className="cr-stat-label">Đã có tem hiệu chuẩn</span>
          </div>
        </article>
        <article className="cr-stat">
          <span className="cr-stat-icon cr-badge-amber">◷</span>
          <div>
            <span className="cr-stat-value">{stats.withoutSeal}</span>
            <span className="cr-stat-label">Chưa phát hành tem</span>
          </div>
        </article>
      </section>

      <section className="cr-card">
        <div className="cr-card-head">
          <div>
            <h2>Danh sách chứng nhận</h2>
            <p>Chọn một chứng nhận để xem chi tiết kết quả đo và chữ ký số.</p>
          </div>
          <label className="cr-search">
            <span aria-hidden="true">🔍</span>
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm số chứng nhận, thiết bị, SN..."
              type="search"
              value={search}
            />
          </label>
        </div>

        {loading ? (
          <div className="cr-loading">Đang tải chứng nhận từ máy chủ...</div>
        ) : filteredItems.length === 0 ? (
          <div className="cr-empty">
            {search.trim()
              ? 'Không tìm thấy chứng nhận phù hợp với từ khóa.'
              : 'Chưa có chứng nhận nào được phát hành cho doanh nghiệp của bạn.'}
          </div>
        ) : (
          <div className="cr-table-wrap">
            <table className="cr-table">
              <thead>
                <tr>
                  <th>Số chứng nhận</th>
                  <th>Thiết bị</th>
                  <th>Dịch vụ / Quy trình</th>
                  <th>Ngày phát hành</th>
                  <th>Tem</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openDetail(item)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') openDetail(item);
                    }}
                  >
                    <td>
                      <span className="cr-code">{item.certificate_no}</span>
                      <span className="cr-sub">{item.record_code}</span>
                    </td>
                    <td>
                      <span>{item.device_name || '—'}</span>
                      <span className="cr-sub">{item.serial_number || item.internal_code || '—'}</span>
                    </td>
                    <td>{item.service_name || item.procedure || '—'}</td>
                    <td>{item.issued_at_formatted || formatDate(item.issued_at)}</td>
                    <td>
                      {item.seal?.seal_code ? (
                        <span className="cr-badge cr-badge-blue">{item.seal.seal_code}</span>
                      ) : (
                        <span className="cr-sub">Chưa có</span>
                      )}
                    </td>
                    <td>
                      <span className={`cr-badge ${statusClass(item.status)}`}>
                        {STATUS_LABEL[item.status] || item.status}
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
                <h2>{certificate?.certificate_no || 'Chi tiết chứng nhận'}</h2>
                <p>{certificate?.record_code} · Chế độ xem (chỉ đọc)</p>
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
                <div className="cr-loading">Đang tải chi tiết chứng nhận...</div>
              ) : detail.error ? (
                <div className="cr-alert cr-alert-error" role="alert">{detail.error}</div>
              ) : certificate ? (
                <>
                  <div className="cr-banner cr-badge-green">
                    <strong>✓ Chứng nhận đã được ký phát hành</strong>
                    {certificate.release_signature?.signer_name
                      ? `Người ký: ${certificate.release_signature.signer_name}. `
                      : ''}
                    {certificate.issued_at_formatted || formatDate(certificate.issued_at)}
                  </div>

                  <div className="cr-detail-grid">
                    <div className="cr-detail-item">
                      <small>Số chứng nhận</small>
                      <strong>{certificate.certificate_no || '—'}</strong>
                    </div>
                    <div className="cr-detail-item">
                      <small>Hồ sơ hiệu chuẩn</small>
                      <strong>{certificate.record_code || '—'}</strong>
                    </div>
                    <div className="cr-detail-item">
                      <small>Thiết bị</small>
                      <strong>{certificate.device || certificate.device_name || '—'}</strong>
                    </div>
                    <div className="cr-detail-item">
                      <small>Khách hàng</small>
                      <strong>{certificate.customer_name || '—'}</strong>
                    </div>
                    <div className="cr-detail-item">
                      <small>Dịch vụ / Quy trình</small>
                      <strong>{certificate.procedure || certificate.service_name || '—'}</strong>
                    </div>
                    <div className="cr-detail-item">
                      <small>Chuẩn đo lường</small>
                      <strong>
                        {certificate.standard_name || '—'}
                        {certificate.standard_serial ? ` · SN ${certificate.standard_serial}` : ''}
                      </strong>
                    </div>
                    <div className="cr-detail-item">
                      <small>Điều kiện môi trường</small>
                      <strong>{certificate.environment || '—'}</strong>
                    </div>
                    <div className="cr-detail-item">
                      <small>Kỹ thuật viên / Soát xét</small>
                      <strong>
                        {certificate.technician_name || '—'} / {certificate.reviewer_name || '—'}
                      </strong>
                    </div>
                    <div className="cr-detail-item">
                      <small>Hợp đồng</small>
                      <strong>{certificate.contract_code || '—'}</strong>
                    </div>
                    <div className="cr-detail-item">
                      <small>Tem liên kết</small>
                      <strong>{certificate.seal?.seal_code || 'Chưa có'}</strong>
                    </div>
                  </div>

                  <div className="cr-section-wrap">
                    <h3 className="cr-section-title">Kết quả đo kiểm ({measurements.length} điểm)</h3>
                    <div className="cr-table-wrap">
                      <table className="cr-table">
                        <thead>
                          <tr>
                            <th>Thông số</th>
                            <th>Danh định</th>
                            <th>Giá trị đo</th>
                            <th>Sai lệch</th>
                            <th>Độ KĐB</th>
                            <th>Đánh giá</th>
                          </tr>
                        </thead>
                        <tbody>
                          {measurements.length === 0 ? (
                            <tr>
                              <td className="cr-empty" colSpan="6">
                                Chưa có điểm đo được ghi nhận.
                              </td>
                            </tr>
                          ) : (
                            measurements.map((row) => (
                              <tr key={row.id}>
                                <td>
                                  {row.parameter_name || '—'}
                                  {row.point_no !== null && row.point_no !== undefined
                                    ? ` · Điểm ${row.point_no}`
                                    : ''}
                                </td>
                                <td>{numberText(row.nominal_value, row.unit)}</td>
                                <td>{numberText(row.measured_value, row.unit)}</td>
                                <td>{numberText(row.deviation, row.unit)}</td>
                                <td>{numberText(row.uncertainty, row.unit)}</td>
                                <td>
                                  <span
                                    className={`cr-badge ${
                                      row.pass_fail === false ? 'cr-badge-red' : 'cr-badge-green'
                                    }`}
                                  >
                                    {row.pass_fail === false ? 'Không đạt' : 'Đạt'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="cr-section-wrap">
                    <h3 className="cr-section-title">Chữ ký số ({signatures.length})</h3>
                    <div className="cr-table-wrap">
                      <table className="cr-table">
                        <thead>
                          <tr>
                            <th>Mục đích</th>
                            <th>Người ký</th>
                            <th>Giao dịch</th>
                            <th>Thời gian</th>
                          </tr>
                        </thead>
                        <tbody>
                          {signatures.length === 0 ? (
                            <tr>
                              <td className="cr-empty" colSpan="4">
                                Chưa có chữ ký số được ghi nhận.
                              </td>
                            </tr>
                          ) : (
                            signatures.map((row) => (
                              <tr key={row.id}>
                                <td>{row.purpose || '—'}</td>
                                <td>{row.signer_name || '—'}</td>
                                <td>{row.provider_transaction_id || row.provider || '—'}</td>
                                <td>{row.signed_at_formatted || formatDate(row.signed_at)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {actionError ? (
                    <div className="cr-alert cr-alert-error" role="alert">{actionError}</div>
                  ) : null}

                  <div className="cr-modal-actions">
                    <button
                      className="cr-btn cr-btn-primary"
                      disabled={!canDownloadPdf || pdfLoadingId === certificate.id}
                      onClick={() => handleOpenPdf(certificate)}
                      type="button"
                    >
                      {pdfLoadingId === certificate.id ? 'Đang mở PDF...' : '📄 Mở PDF chứng nhận'}
                    </button>
                    {certificate.seal?.seal_code ? (
                      <Link className="cr-btn cr-btn-ghost" to="/internal/customer/seals">
                        Xem tem {certificate.seal.seal_code} →
                      </Link>
                    ) : null}
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

export default CustomerCertificatesPage;
