import { useCallback, useEffect, useMemo, useState } from 'react';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import { useAppContext } from '../../../../app/providers.jsx';
import {
  getCertificatesApi,
  getCertificateDetailApi,
  getEligibleCalibrationRecordsApi,
  issueCertificateApi,
  openCertificatePdfApi,
  signCertificateApi,
} from '../../../../services/certificate-service.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';
import CertificateDetailModal from './CertificateDetailModal.jsx';
import IssueCertificateModal from './IssueCertificateModal.jsx';

const normalizeRole = (value) => String(value || '').toLowerCase().replace(/[^a-z]/g, '');

// Chỉ HeadTech (và các role soát xét) được cấp chứng nhận; Admin không cấp.
const CAN_ISSUE_ROLES = ['reviewer', 'headtechnician', 'labmanager', 'headoftech'];
// Admin/CEO chỉ xem bản HeadTech đã duyệt và ký phát hành.
const CAN_SIGN_ROLES = ['reviewer', 'labmanager', 'headoftech', 'admin', 'ceo'];

const errorMessage = (error) =>
  error?.response?.data?.error?.message || error?.message || 'Đã xảy ra lỗi khi gọi máy chủ.';

const STATUS_LABEL = {
  Draft: 'Bản nháp',
  PendingPayment: 'Chờ thanh toán',
  Released: 'Đã phát hành',
};

function CertificatesPage() {
  const { matches, query, setQuery, feedback, setFeedback } = useReviewerWorkspace();
  const { session } = useAppContext();

  const role = normalizeRole(session?.role);
  const canIssue = CAN_ISSUE_ROLES.includes(role);
  const canSign = CAN_SIGN_ROLES.includes(role);
  // Admin/CEO chỉ xem hàng HeadTech đã duyệt và ký; không có thao tác cấp chứng nhận.
  const isApprovalQueue = canSign && !canIssue;

  const [data, setData] = useState({
    items: [],
    total: 0,
    summary: { total: 0, draft: 0, pending_payment: 0, released: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [eligibleCount, setEligibleCount] = useState(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [detailState, setDetailState] = useState({
    open: false,
    loading: false,
    error: '',
    certificate: null,
  });
  const [signing, setSigning] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);

  const loadCertificates = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await getCertificatesApi({ status: 'all', limit: 100 });
      setData({
        items: Array.isArray(result.items) ? result.items : [],
        total: result.total ?? 0,
        summary: result.summary ?? { total: 0, draft: 0, pending_payment: 0, released: 0 },
      });
    } catch (loadErr) {
      setLoadError(errorMessage(loadErr));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEligibleCount = useCallback(async () => {
    if (!canIssue) {
      setEligibleCount(null);
      return;
    }
    try {
      const list = await getEligibleCalibrationRecordsApi();
      setEligibleCount(Array.isArray(list) ? list.length : 0);
    } catch {
      setEligibleCount(null);
    }
  }, [canIssue]);

  useEffect(() => {
    loadCertificates();
    loadEligibleCount();
  }, [loadCertificates, loadEligibleCount]);

  const counts = useMemo(() => {
    const summary = data.summary ?? {};
    return {
      total: summary.total ?? data.items.length,
      draft: summary.draft ?? 0,
      pending_payment: summary.pending_payment ?? 0,
      released: summary.released ?? 0,
    };
  }, [data.summary, data.items.length]);

  const rows = useMemo(
    () =>
      data.items
        .filter((item) => statusFilter === 'all' || item.status === statusFilter)
        .filter((item) =>
          matches(
            `${item.certificate_no} ${item.record_code} ${item.device_name || ''} ${item.model || ''} ${
              item.serial_number || ''
            } ${item.customer_name || ''} ${item.service_name || ''} ${item.procedure || ''} ${
              item.technician_name || ''} ${item.reviewer_name || ''} ${item.signer_name || ''} ${
              item.status
            }`,
          ),
        ),
    [data.items, statusFilter, matches],
  );

  const openDetail = async (row) => {
    setDetailState({ open: true, loading: true, error: '', certificate: row });
    try {
      const certificate = await getCertificateDetailApi(row.id);
      setDetailState({ open: true, loading: false, error: '', certificate });
    } catch (detailError) {
      setDetailState((current) => ({
        ...current,
        loading: false,
        error: errorMessage(detailError),
      }));
    }
  };

  const handleIssue = async (calibrationRecordId) => {
    const created = await issueCertificateApi({ calibration_record_id: calibrationRecordId });
    setIssueOpen(false);
    setFeedback(
      `Đã cấp chứng nhận ${created.certificate_no} (Draft). Ký phát hành để chuyển sang Released.`,
    );
    setDetailState({ open: true, loading: false, error: '', certificate: created });
    await Promise.all([loadCertificates(), loadEligibleCount()]);
  };

  const handleSign = async () => {
    const certificateId = detailState.certificate?.id;
    if (!certificateId) return;

    setSigning(true);
    try {
      const updated = await signCertificateApi(certificateId);
      setDetailState((current) => ({ ...current, certificate: updated }));
      setFeedback(
        `Đã ký phát hành chứng nhận ${updated.certificate_no}. Bản PDF đã được cập nhật chữ ký số.`,
      );
      await Promise.all([loadCertificates(), loadEligibleCount()]);
    } catch (signError) {
      setFeedback(errorMessage(signError), 'error');
    } finally {
      setSigning(false);
    }
  };

  const handleOpenPdf = async (certificate) => {
    setPdfLoadingId(certificate.id);
    try {
      await openCertificatePdfApi(certificate.id);
    } catch (pdfError) {
      setFeedback(errorMessage(pdfError), 'error');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadCertificates(), loadEligibleCount()]);
  };

  return (
    <ReviewerPageShell
      badge="Dữ liệu máy chủ"
      description="Cấp, theo dõi và phát hành chứng nhận hiệu chuẩn từ các hồ sơ đã được soát xét, kèm chữ ký số và file PDF."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      onSearchChange={setQuery}
      query={query}
      title="Chứng nhận hiệu chuẩn"
    >
      <div className="operations-stats" style={{ marginBottom: '18px' }}>
        <article
          className="stat-card"
          onClick={() => setStatusFilter('all')}
          style={{ cursor: 'pointer', border: statusFilter === 'all' ? '2px solid #3b82f6' : undefined }}
        >
          <span aria-hidden="true" className="stat-icon blue">
            ▤
          </span>
          <div>
            <span>Tổng chứng nhận</span>
            <strong>{counts.total}</strong>
          </div>
          <small>Toàn bộ chứng nhận đã cấp</small>
        </article>

        <article
          className="stat-card"
          onClick={() => setStatusFilter('Draft')}
          style={{ cursor: 'pointer', border: statusFilter === 'Draft' ? '2px solid #f59e0b' : undefined }}
        >
          <span aria-hidden="true" className="stat-icon amber">
            ◷
          </span>
          <div>
            <span>Bản nháp</span>
            <strong style={{ color: '#d97706' }}>{counts.draft}</strong>
          </div>
          <small>Chờ ký phát hành</small>
        </article>

        <article
          className="stat-card"
          onClick={() => setStatusFilter('Released')}
          style={{ cursor: 'pointer', border: statusFilter === 'Released' ? '2px solid #10b981' : undefined }}
        >
          <span aria-hidden="true" className="stat-icon green">
            ✓
          </span>
          <div>
            <span>Đã phát hành</span>
            <strong style={{ color: '#16a34a' }}>{counts.released}</strong>
          </div>
          <small>Đã ký số và sẵn sàng tra cứu</small>
        </article>
      </div>

      <section className="reviewer-card">
        <div className="reviewer-card-heading">
          <div>
            <h2>Danh sách Certificate</h2>
            <p>
              {isApprovalQueue
                ? 'Chứng nhận đã được HeadTech soát xét, chờ Admin xem và ký phát hành (DigitalSignature).'
                : 'Chứng nhận liên kết hồ sơ hiệu chuẩn đã duyệt, quy trình áp dụng và chữ ký phát hành (DigitalSignature).'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {!isApprovalQueue && eligibleCount !== null ? (
              <span className="queue-counter" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                {eligibleCount} hồ sơ đủ điều kiện
              </span>
            ) : null}
            <button
              className="button button-secondary button-compact"
              onClick={handleRefresh}
              type="button"
            >
              <span>↻</span> Làm mới
            </button>
            {canIssue ? (
              <button
                className="button button-primary button-compact"
                onClick={() => setIssueOpen(true)}
                type="button"
              >
                + Cấp chứng nhận
              </button>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '0 20px 14px',
            borderBottom: '1px solid #edf1f4',
            flexWrap: 'wrap',
          }}
        >
          {[
            ['all', `Tất cả (${counts.total})`],
            ['Draft', `◷ Bản nháp (${counts.draft})`],
            ['PendingPayment', `⏳ Chờ thanh toán (${counts.pending_payment})`],
            ['Released', `✓ Đã phát hành (${counts.released})`],
          ].map(([value, label]) => (
            <button
              className={`filter-chip ${statusFilter === value ? 'active' : ''}`}
              key={value}
              onClick={() => setStatusFilter(value)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 600,
                border: statusFilter === value ? '1px solid #0284c7' : '1px solid #cbd5e1',
                background: statusFilter === value ? '#e0f2fe' : '#ffffff',
                color: statusFilter === value ? '#0369a1' : '#475569',
                cursor: 'pointer',
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            Đang tải danh sách chứng nhận từ máy chủ...
          </div>
        ) : loadError ? (
          <div style={{ padding: '36px', textAlign: 'center', color: '#dc2626' }}>
            <p>{loadError}</p>
            <button className="button button-secondary button-compact" onClick={handleRefresh} type="button">
              Thử lại
            </button>
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: 'certificate_no',
                label: 'Số chứng nhận',
                render: (row) => (
                  <div>
                    <button className="text-action" onClick={() => openDetail(row)} type="button">
                      {row.certificate_no}
                    </button>
                    <div style={{ fontSize: '0.66rem', color: '#64748b' }}>{row.record_code}</div>
                  </div>
                ),
              },
              {
                key: 'device',
                label: 'Thiết bị',
                render: (row) => (
                  <div>
                    <strong style={{ display: 'block', color: '#0f172a' }}>{row.device_name || '—'}</strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      {row.model ? `Model: ${row.model}` : ''}
                      {row.model && row.serial_number ? ' · ' : ''}
                      {row.serial_number ? `SN: ${row.serial_number}` : ''}
                    </span>
                  </div>
                ),
              },
              {
                key: 'customer_name',
                label: 'Khách hàng',
                render: (row) => (
                  <span style={{ fontWeight: 600, color: '#334155' }}>{row.customer_name || '—'}</span>
                ),
              },
              {
                key: 'procedure',
                label: 'Dịch vụ & Quy trình',
                render: (row) => (
                  <div>
                    <span style={{ display: 'block', color: '#0f172a' }}>{row.service_name || '—'}</span>
                    <small style={{ color: '#0284c7', fontSize: '0.67rem' }}>
                      {row.service_code || ''}
                      {row.procedure_version ? ` · ${row.procedure_version}` : ''}
                    </small>
                  </div>
                ),
              },
              {
                key: 'issued_at',
                label: 'Phát hành / Ký',
                render: (row) => (
                  <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                    <span style={{ display: 'block' }}>{row.issued_at_formatted || '—'}</span>
                    {row.signer_name ? (
                      <small style={{ color: '#64748b' }}>{row.signer_name}</small>
                    ) : (
                      <small style={{ color: '#b45309' }}>Chưa ký</small>
                    )}
                  </div>
                ),
              },
              {
                key: 'status',
                label: 'Trạng thái',
                render: (row) => (
                  <div>
                    <StatusPill>{row.status}</StatusPill>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '2px' }}>
                      {STATUS_LABEL[row.status] || row.status}
                    </div>
                  </div>
                ),
              },
              {
                key: 'action',
                label: 'Thao tác',
                render: (row) => (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button className="small-action" onClick={() => openDetail(row)} type="button">
                      Chi tiết
                    </button>
                    <button
                      className="small-action"
                      disabled={pdfLoadingId === row.id}
                      onClick={() => handleOpenPdf(row)}
                      type="button"
                    >
                      {pdfLoadingId === row.id ? 'Đang tải...' : 'PDF'}
                    </button>
                    {canSign && row.status !== 'Released' ? (
                      <button
                        className="small-action"
                        onClick={() => openDetail(row)}
                        type="button"
                      >
                        Ký
                      </button>
                    ) : null}
                  </div>
                ),
              },
            ]}
            empty="Không tìm thấy chứng nhận nào phù hợp."
            rows={rows}
          />
        )}

        <p className="mock-note">
          {isApprovalQueue ? (
            <>
              <strong>Quy trình:</strong> HeadTech soát xét hồ sơ và chuyển sang bản nháp chờ ký. Admin chỉ xem các bản
              này và ký phát hành để chuyển sang Released, cập nhật file PDF có chữ ký số.
            </>
          ) : (
            <>
              <strong>Quy trình:</strong> Hồ sơ hiệu chuẩn phải được soát xét ở trạng thái Approved và đạt yêu cầu trước
              khi cấp chứng nhận. Chứng nhận được tạo ở dạng Draft, sau đó ký phát hành để chuyển sang Released và cập
              nhật file PDF có chữ ký số.
            </>
          )}
        </p>
      </section>

      {issueOpen && canIssue ? (
        <IssueCertificateModal onClose={() => setIssueOpen(false)} onIssue={handleIssue} />
      ) : null}

      {detailState.open ? (
        <CertificateDetailModal
          canSign={canSign}
          certificate={detailState.certificate}
          error={detailState.error}
          loading={detailState.loading}
          onClose={() => setDetailState({ open: false, loading: false, error: '', certificate: null })}
          onOpenPdf={handleOpenPdf}
          onSign={handleSign}
          pdfLoading={pdfLoadingId === detailState.certificate?.id}
          signing={signing}
        />
      ) : null}
    </ReviewerPageShell>
  );
}

export default CertificatesPage;
