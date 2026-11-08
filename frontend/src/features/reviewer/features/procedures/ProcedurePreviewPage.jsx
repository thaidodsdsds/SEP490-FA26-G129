import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  cloneProcedureApi,
  getProcedureDetailApi,
  publishProcedureApi,
} from '../../../../services/procedure-service.js';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function ProcedurePreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [procedure, setProcedure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const data = await getProcedureDetailApi(id);
      setProcedure(data);
    } catch {
      setError('Không thể tải dữ liệu quy trình.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePublish = async () => {
    if (
      !window.confirm(
        `Xác nhận phát hành phiên bản "${procedure.version}" của "${procedure.service_type?.name}" thành ACTIVE?\nLưu ý: Mọi phiên bản Active cũ của loại dịch vụ này sẽ tự động chuyển sang Obsolete.`
      )
    ) {
      return;
    }

    setPublishing(true);
    setError('');
    try {
      const result = await publishProcedureApi(id);
      setFeedback(`Đã phát hành thành công quy trình phiên bản ${result.version} (Active).`);
      loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Có lỗi xảy ra khi phát hành quy trình.');
    } finally {
      setPublishing(false);
    }
  };

  const handleClone = async () => {
    try {
      const cloned = await cloneProcedureApi(id);
      setFeedback(`Đã tạo bản nháp mới ${cloned.version} từ quy trình này.`);
      navigate(`/internal/head-of-tech/procedures/${cloned.id}/edit`);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Lỗi khi nhân bản quy trình.');
    }
  };

  const isDraft = procedure?.status === 'Draft';
  const isActive = procedure?.status === 'Active';

  return (
    <ReviewerPageShell
      description="Bước 4: Xem trước biểu mẫu thực hiện đo lường động theo ISO/IEC 17025 và phê duyệt phát hành phiên bản Active."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      title={`Xem trước biểu mẫu đo: ${procedure?.service_type?.name || ''} (${procedure?.version || ''})`}
    >
      <section className="reviewer-card" style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Navigation Step Breadcrumbs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #e3edf2', paddingBottom: 12 }}>
          {isDraft ? (
            <>
              <Link to={`/internal/head-of-tech/procedures/${id}/edit`}>1. Thông tin chung</Link>
              <span>→</span>
              <Link to={`/internal/head-of-tech/procedures/${id}/steps`}>2. Bước quy trình</Link>
              <span>→</span>
              <Link to={`/internal/head-of-tech/procedures/${id}/parameters`}>3. Thông số & Điểm đo</Link>
              <span>→</span>
              <span style={{ fontWeight: 700, color: '#1f6e8c' }}>4. Xem trước & Phát hành</span>
            </>
          ) : (
            <>
              <Link to="/internal/head-of-tech/procedures">← Danh sách quy trình</Link>
              <span>|</span>
              <span style={{ fontWeight: 700 }}>Trạng thái: <StatusPill>{procedure?.status}</StatusPill></span>
            </>
          )}
        </div>

        {error && <div className="reviewer-feedback error" style={{ marginBottom: 14 }}>{error}</div>}

        {loading ? (
          <p>Đang tổng hợp dữ liệu biểu mẫu đo...</p>
        ) : (
          <div>
            {/* THÔNG TIN PHÁP LÝ & MÔI TRƯỜNG */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#1e293b' }}>
                    {procedure.service_type?.name} · Phiên bản {procedure.version}
                  </h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                    Mã tiêu chuẩn: <strong>{procedure.service_type?.standard_code}</strong> · Loại hình:{' '}
                    <strong>{procedure.service_type?.kind === 'Verification' ? 'Kiểm định' : 'Hiệu chuẩn'}</strong>
                  </p>
                </div>
                <StatusPill tone={isActive ? 'success' : isDraft ? 'neutral' : 'warning'}>
                  {procedure.status}
                </StatusPill>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14, fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Yêu cầu môi trường đo:</span>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    Nhiệt độ: {procedure.environment_requirement?.temperature || '—'} · Độ ẩm:{' '}
                    {procedure.environment_requirement?.humidity || '—'}
                  </div>
                  {procedure.environment_requirement?.notes && (
                    <small style={{ color: '#475569' }}>{procedure.environment_requirement.notes}</small>
                  )}
                </div>

                <div>
                  <span style={{ color: '#64748b' }}>Thiết bị / Chuẩn đối chứng bắt buộc:</span>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    {procedure.required_equipment?.description || 'Theo danh mục chuẩn đối chứng còn hạn'}
                  </div>
                </div>
              </div>
            </div>

            {/* MÔ PHỎNG PHẦN 1: CÁC BƯỚC QUY TRÌNH (PROCEDURE STEPS) */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ borderBottom: '2px solid #0284c7', paddingBottom: 6, color: '#0369a1', margin: '0 0 12px' }}>
                Phần 1: Trình tự các bước thao tác kỹ thuật
              </h4>
              <div style={{ display: 'grid', gap: 8 }}>
                {(procedure.steps || []).map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                    }}
                  >
                    <input disabled type="checkbox" />
                    <span style={{ fontWeight: 700, color: '#0369a1' }}>Bước {s.step_no}:</span>
                    <span style={{ flex: 1, fontSize: '0.85rem' }}>{s.instruction}</span>
                    {s.requires_evidence && (
                      <span className="dash-meta-chip" style={{ fontSize: '0.7rem', color: '#c2410c' }}>
                        📷 Cần ảnh minh chứng
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* MÔ PHỎNG PHẦN 2: BIỂU MẪU ĐO SỐ LIỆU ĐỘNG (MEASUREMENT FORM) */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ borderBottom: '2px solid #0284c7', paddingBottom: 6, color: '#0369a1', margin: '0 0 12px' }}>
                Phần 2: Biểu mẫu ghi số liệu đo lường (Sinh động từ thông số & điểm đo)
              </h4>

              {(procedure.parameters || []).map((param) => (
                <div key={param.id} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                      Thông số: {param.name} ({param.unit})
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Đo lặp: {param.repeat_count} lần · Hàm tính: <code>{param.calculation_method}</code>
                    </span>
                  </div>

                  <table className="dash-table" style={{ fontSize: '0.78rem', width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Điểm đo danh định</th>
                        <th>Dung sai cho phép</th>
                        {Array.from({ length: param.repeat_count }, (_, i) => (
                          <th key={i}>Lần {i + 1}</th>
                        ))}
                        <th>Giá trị TB / Tính toán</th>
                        <th>Sai số (Deviation)</th>
                        <th>Đánh giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(param.test_points || []).map((tp) => (
                        <tr key={tp.id}>
                          <td><strong>{tp.nominal_value} {param.unit}</strong></td>
                          <td>{tp.tolerance !== null ? `± ${tp.tolerance}` : '—'}</td>
                          {Array.from({ length: param.repeat_count }, (_, i) => (
                            <td key={i}>
                              <input
                                disabled
                                placeholder={`... ${param.unit}`}
                                style={{ width: 75, padding: '3px 6px', fontSize: '0.75rem', background: '#f8fafc' }}
                              />
                            </td>
                          ))}
                          <td style={{ color: '#0369a1', fontWeight: 600 }}>Tự động tính</td>
                          <td style={{ color: '#475569' }}>Δ = đo - chuẩn</td>
                          <td>
                            <span className="dash-badge neutral">Chờ đo</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {/* HÀNH ĐỘNG PHÁT HÀNH / NHÂN BẢN */}
            <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              {isDraft ? (
                <>
                  <button
                    className="button button-secondary"
                    onClick={() => navigate(`/internal/head-of-tech/procedures/${id}/parameters`)}
                    type="button"
                  >
                    ← Bước 3: Sửa thông số & điểm đo
                  </button>

                  <button
                    className="button button-primary"
                    disabled={publishing || (procedure.steps || []).length === 0}
                    onClick={handlePublish}
                    style={{ background: '#16a34a', borderColor: '#16a34a', padding: '0 20px', minHeight: 42 }}
                    type="button"
                  >
                    {publishing ? 'Đang phát hành...' : '✓ Phê duyệt & Phát hành Active'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="button button-secondary"
                    onClick={() => navigate('/internal/head-of-tech/procedures')}
                    type="button"
                  >
                    ← Về danh sách quy trình
                  </button>

                  <button
                    className="button button-primary"
                    onClick={handleClone}
                    type="button"
                  >
                    Nhân bản tạo phiên bản mới (Draft mới)
                  </button>
                </>
              )}
            </footer>
          </div>
        )}
      </section>
    </ReviewerPageShell>
  );
}

export default ProcedurePreviewPage;
