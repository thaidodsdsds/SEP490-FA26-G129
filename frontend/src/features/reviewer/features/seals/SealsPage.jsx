import { useCallback, useEffect, useMemo, useState } from 'react';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import { useAppContext } from '../../../../app/providers.jsx';
import { openCertificatePdfApi } from '../../../../services/certificate-service.js';
import {
  createSealApi,
  decideSealRevocationApi,
  getEligibleCertificatesApi,
  getSealDetailApi,
  getSealsApi,
  openSealPdfApi,
  requestSealRevocationApi,
} from '../../../../services/seal-service.js';
import DataTable from '../../shared/DataTable.jsx';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';
import CreateSealModal from './CreateSealModal.jsx';
import RevocationModal from './RevocationModal.jsx';
import SealDetailModal from './SealDetailModal.jsx';

const normalizeRole = (value) => String(value || '').toLowerCase().replace(/[^a-z]/g, '');

const MANAGER_ROLES = ['reviewer', 'headtechnician', 'labmanager', 'headoftech', 'admin', 'ceo'];
const DECISION_ROLES = ['ceo', 'admin'];

const EMPTY_SUMMARY = {
  total: 0,
  active: 0,
  pending_payment: 0,
  expired: 0,
  revoked: 0,
  expiring_soon: 0,
};

const errorMessage = (error) =>
  error?.response?.data?.error?.message || error?.message || 'Đã xảy ra lỗi khi gọi máy chủ.';

const daysTone = (seal) => {
  if (seal.status === 'Expired' || seal.status === 'Revoked') return '#b91c1c';
  if (seal.is_expiring_soon) return '#b45309';
  return '#047857';
};

const daysLabel = (seal) => {
  const days = seal.days_remaining;
  if (days === null || days === undefined) return '—';
  const value = Number(days);
  if (Number.isNaN(value)) return '—';
  if (value < 0) return `Quá hạn ${Math.abs(value)} ngày`;
  if (value === 0) return 'Hết hạn hôm nay';
  return `Còn ${value} ngày`;
};

function SealsPage() {
  const { matches, query, setQuery, feedback, setFeedback } = useReviewerWorkspace();
  const { session } = useAppContext();

  const role = normalizeRole(session?.role);
  const canManage = MANAGER_ROLES.includes(role);
  const canDecide = DECISION_ROLES.includes(role);
  const currentUserId = session?.user?.id;
  const isRevocationAllowed = (seal) =>
    canManage &&
    (seal?.status === 'Active' || seal?.status === 'Expired') &&
    seal?.revocation?.status !== 'Pending';

  const [data, setData] = useState({ items: [], total: 0, summary: EMPTY_SUMMARY });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [eligibleCount, setEligibleCount] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailState, setDetailState] = useState({
    open: false,
    loading: false,
    error: '',
    seal: null,
  });
  const [revocationState, setRevocationState] = useState({
    open: false,
    mode: 'request',
    seal: null,
    pending: null,
  });
  const [revocationSubmitting, setRevocationSubmitting] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [certificatePdfLoadingId, setCertificatePdfLoadingId] = useState(null);

  const loadSeals = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await getSealsApi({ status: 'all', limit: 100 });
      setData({
        items: Array.isArray(result.items) ? result.items : [],
        total: result.total ?? 0,
        summary: result.summary ?? EMPTY_SUMMARY,
      });
    } catch (loadErr) {
      setLoadError(errorMessage(loadErr));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEligibleCount = useCallback(async () => {
    if (!canManage) {
      setEligibleCount(null);
      return;
    }
    try {
      const list = await getEligibleCertificatesApi();
      setEligibleCount(Array.isArray(list) ? list.length : 0);
    } catch {
      setEligibleCount(null);
    }
  }, [canManage]);

  useEffect(() => {
    loadSeals();
    loadEligibleCount();
  }, [loadSeals, loadEligibleCount]);

  const counts = useMemo(() => {
    const summary = data.summary ?? EMPTY_SUMMARY;
    return {
      total: summary.total ?? data.items.length,
      active: summary.active ?? 0,
      expiringSoon: summary.expiring_soon ?? 0,
      expired: summary.expired ?? 0,
      revoked: summary.revoked ?? 0,
      pendingPayment: summary.pending_payment ?? 0,
    };
  }, [data.summary, data.items.length]);

  const rows = useMemo(
    () =>
      data.items
        .filter((item) => {
          if (statusFilter === 'all') return true;
          if (statusFilter === 'Closed') {
            return item.status === 'Expired' || item.status === 'Revoked';
          }
          if (statusFilter === 'ExpiringSoon') return item.is_expiring_soon;
          return item.status === statusFilter;
        })
        .filter((item) =>
          matches(
            `${item.seal_code} ${item.device_name || ''} ${item.internal_code || ''} ${
              item.model || ''
            } ${item.serial_number || ''} ${item.customer_name || ''} ${item.certificate_no || ''} ${
              item.signer_name || ''
            } ${item.service_name || ''} ${item.status_label || ''} ${item.status}`,
          ),
        ),
    [data.items, statusFilter, matches],
  );

  const openDetail = async (row) => {
    setDetailState({ open: true, loading: true, error: '', seal: row });
    try {
      const seal = await getSealDetailApi(row.id);
      setDetailState({ open: true, loading: false, error: '', seal });
    } catch (detailError) {
      setDetailState((current) => ({
        ...current,
        loading: false,
        error: errorMessage(detailError),
      }));
    }
  };

  const closeDetail = () =>
    setDetailState({ open: false, loading: false, error: '', seal: null });

  const openRequestRevocation = (seal) => {
    if (!isRevocationAllowed(seal)) return;
    closeDetail();
    setRevocationState({ open: true, mode: 'request', seal, pending: null });
  };

  const openDecisionRevocation = (seal) => {
    const pending = seal?.pending_revocation ?? null;
    if (!pending) {
      setFeedback('Tem này không có yêu cầu thu hồi đang chờ quyết định.', 'error');
      return;
    }
    closeDetail();
    setRevocationState({ open: true, mode: 'decision', seal, pending });
  };

  const handleRevocationSubmit = async (payload) => {
    const { mode, seal, pending } = revocationState;
    if (!seal) return;

    setRevocationSubmitting(true);
    try {
      const updated =
        mode === 'decision'
          ? await decideSealRevocationApi(seal.id, pending.id, payload)
          : await requestSealRevocationApi(seal.id, payload);

      setRevocationState({ open: false, mode: 'request', seal: null, pending: null });
      setStatusFilter('all');

      if (mode === 'decision') {
        setFeedback(
          payload.decision === 'Approved'
            ? `Đã ký quyết định thu hồi tem ${updated.seal_code}. Tem chuyển sang Revoked và thiết bị được đưa vào kiểm tra.`
            : `Đã ký từ chối yêu cầu thu hồi tem ${updated.seal_code}. Tem giữ nguyên trạng thái ${updated.status}.`,
        );
      } else {
        setFeedback(
          `Đã gửi yêu cầu thu hồi tem ${updated.seal_code}. Chờ người có thẩm quyền ký quyết định.`,
        );
      }

      await loadSeals();
    } catch (revocationError) {
      setFeedback(errorMessage(revocationError), 'error');
      throw revocationError;
    } finally {
      setRevocationSubmitting(false);
    }
  };

  const handleCreate = async (payload) => {
    const created = await createSealApi(payload);
    setCreateOpen(false);
    setStatusFilter('all');
    setFeedback(
      `Đã phát hành tem ${created.seal_code} cho chứng nhận ${created.certificate_no}. Tem có hiệu lực đến ${created.due_date_formatted}.`,
    );
    setDetailState({ open: true, loading: false, error: '', seal: created });
    await Promise.all([loadSeals(), loadEligibleCount()]);
  };

  const handleOpenSealPdf = async (seal) => {
    setPdfLoadingId(seal.id);
    try {
      await openSealPdfApi(seal.id);
    } catch (pdfError) {
      setFeedback(errorMessage(pdfError), 'error');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleOpenCertificatePdf = async (seal) => {
    if (!seal.certificate_id) {
      setFeedback('Tem chưa liên kết với chứng nhận nào.', 'error');
      return;
    }
    setCertificatePdfLoadingId(seal.id);
    try {
      await openCertificatePdfApi(seal.certificate_id);
    } catch (pdfError) {
      setFeedback(errorMessage(pdfError), 'error');
    } finally {
      setCertificatePdfLoadingId(null);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([loadSeals(), loadEligibleCount()]);
  };

  const filterOptions = [
    ['all', `Tất cả (${counts.total})`],
    ['Active', `✓ Đang hiệu lực (${counts.active})`],
    ['ExpiringSoon', `◷ Sắp hết hạn (${counts.expiringSoon})`],
    ['Closed', `⚠ Hết hạn / Thu hồi (${counts.expired + counts.revoked})`],
    ...(counts.pendingPayment > 0
      ? [['PendingPayment', `Chờ thanh toán (${counts.pendingPayment})`]]
      : []),
  ];

  return (
    <ReviewerPageShell
      badge="Dữ liệu máy chủ"
      description="Phát hành tem hiệu chuẩn sau khi chứng nhận được ký số, theo dõi hiệu lực, in tem QR và tra cứu lịch sử xác thực."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      onSearchChange={setQuery}
      query={query}
      title="Tem hiệu chuẩn"
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
            <span>Tổng tem</span>
            <strong>{counts.total}</strong>
          </div>
          <small>Toàn bộ tem đã phát hành</small>
        </article>

        <article
          className="stat-card"
          onClick={() => setStatusFilter('Active')}
          style={{ cursor: 'pointer', border: statusFilter === 'Active' ? '2px solid #10b981' : undefined }}
        >
          <span aria-hidden="true" className="stat-icon green">
            ✓
          </span>
          <div>
            <span>Đang hiệu lực</span>
            <strong style={{ color: '#16a34a' }}>{counts.active}</strong>
          </div>
          <small>Tem còn hạn sử dụng</small>
        </article>

        <article
          className="stat-card"
          onClick={() => setStatusFilter('ExpiringSoon')}
          style={{
            cursor: 'pointer',
            border: statusFilter === 'ExpiringSoon' ? '2px solid #f59e0b' : undefined,
          }}
        >
          <span aria-hidden="true" className="stat-icon amber">
            ◷
          </span>
          <div>
            <span>Sắp hết hạn</span>
            <strong style={{ color: '#d97706' }}>{counts.expiringSoon}</strong>
          </div>
          <small>Hạn hiệu lực trong 30 ngày</small>
        </article>

        <article
          className="stat-card"
          onClick={() => setStatusFilter('Closed')}
          style={{ cursor: 'pointer', border: statusFilter === 'Closed' ? '2px solid #ef4444' : undefined }}
        >
          <span
            aria-hidden="true"
            className="stat-icon amber"
            style={{ background: '#fef2f2', color: '#b91c1c' }}
          >
            ⚠
          </span>
          <div>
            <span>Hết hạn / Thu hồi</span>
            <strong style={{ color: '#dc2626' }}>{counts.expired + counts.revoked}</strong>
          </div>
          <small>{counts.expired} hết hạn · {counts.revoked} thu hồi</small>
        </article>
      </div>

      <section className="reviewer-card">
        <div className="reviewer-card-heading">
          <div>
            <h2>Danh sách tem theo thiết bị</h2>
            <p>
              Tem được phát hành từ chứng nhận Released có chữ ký CertificateRelease, kèm mã QR tra cứu và file
              tem PDF khổ A6.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {eligibleCount !== null ? (
              <span className="queue-counter" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
                {eligibleCount} chứng nhận đủ điều kiện
              </span>
            ) : null}
            <button
              className="button button-secondary button-compact"
              onClick={handleRefresh}
              type="button"
            >
              <span>↻</span> Làm mới
            </button>
            {canManage ? (
              <button
                className="button button-primary button-compact"
                disabled={eligibleCount === 0}
                onClick={() => setCreateOpen(true)}
                title={
                  eligibleCount === 0
                    ? 'Chưa có chứng nhận Released và đã ký phát hành nào chờ cấp tem.'
                    : undefined
                }
                type="button"
              >
                + Phát hành tem
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
          {filterOptions.map(([value, label]) => (
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
            Đang tải danh sách tem từ máy chủ...
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
                key: 'seal_code',
                label: 'Mã tem',
                render: (row) => (
                  <div>
                    <button className="text-action" onClick={() => openDetail(row)} type="button">
                      {row.seal_code}
                    </button>
                    <div style={{ fontSize: '0.66rem', color: '#64748b' }}>
                      {row.issued_at_formatted || '—'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'device',
                label: 'Thiết bị',
                render: (row) => (
                  <div>
                    <strong style={{ display: 'block', color: '#0f172a' }}>
                      {row.device_name || '—'}
                    </strong>
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      {row.internal_code || ''}
                      {row.internal_code && row.serial_number ? ' · ' : ''}
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
                key: 'certificate',
                label: 'Chứng nhận',
                render: (row) => (
                  <div>
                    <span style={{ display: 'block', color: '#0f172a' }}>{row.certificate_no || '—'}</span>
                    <small style={{ color: '#64748b', fontSize: '0.67rem' }}>
                      {row.signer_name ? `Ký: ${row.signer_name}` : '—'}
                    </small>
                  </div>
                ),
              },
              {
                key: 'due_date',
                label: 'Hiệu lực',
                render: (row) => (
                  <div style={{ fontSize: '0.71rem', color: '#475569' }}>
                    <span style={{ display: 'block' }}>
                      {row.cal_date_formatted} → {row.due_date_formatted}
                    </span>
                    <small style={{ color: daysTone(row), fontWeight: 700 }}>{daysLabel(row)}</small>
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
                      {row.status_label || row.status}
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
                      onClick={() => handleOpenSealPdf(row)}
                      type="button"
                    >
                      {pdfLoadingId === row.id ? 'Đang tải...' : 'In tem'}
                    </button>
                    {isRevocationAllowed(row) ? (
                      <button
                        className="small-action"
                        onClick={() => openRequestRevocation(row)}
                        type="button"
                      >
                        Thu hồi
                      </button>
                    ) : null}
                  </div>
                ),
              },
            ]}
            empty="Không tìm thấy tem nào phù hợp."
            rows={rows}
          />
        )}

        <p className="mock-note">
          <strong>Quy trình:</strong> tem chỉ được phát hành khi chứng nhận đã Released và có chữ ký số
          CertificateRelease. Tem mặc định có hiệu lực 12 tháng; khi quá hạn, hệ thống tự chuyển sang Expired và
          đồng bộ trạng thái thiết bị. Yêu cầu thu hồi được ký quyết định bởi người khác người gửi; phê duyệt
          chuyển tem sang Revoked và thiết bị sang InRepair để đo lại.
        </p>
      </section>

      {createOpen ? (
        <CreateSealModal onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
      ) : null}

      {detailState.open ? (
        <SealDetailModal
          canDecideRevocation={canDecide}
          canRequestRevocation={isRevocationAllowed(detailState.seal)}
          certificatePdfLoading={certificatePdfLoadingId === detailState.seal?.id}
          currentUserId={currentUserId}
          error={detailState.error}
          loading={detailState.loading}
          onClose={closeDetail}
          onDecideRevocation={openDecisionRevocation}
          onOpenCertificatePdf={handleOpenCertificatePdf}
          onOpenPdf={handleOpenSealPdf}
          onRequestRevocation={openRequestRevocation}
          pdfLoading={pdfLoadingId === detailState.seal?.id}
          revocationLoading={revocationSubmitting}
          seal={detailState.seal}
        />
      ) : null}

      {revocationState.open ? (
        <RevocationModal
          canDecide={
            Number(currentUserId) !== Number(revocationState.pending?.requested_by)
          }
          mode={revocationState.mode}
          onClose={() =>
            setRevocationState({ open: false, mode: 'request', seal: null, pending: null })
          }
          onSubmit={handleRevocationSubmit}
          pending={revocationState.pending}
          seal={revocationState.seal}
          submitting={revocationSubmitting}
        />
      ) : null}
    </ReviewerPageShell>
  );
}

export default SealsPage;
