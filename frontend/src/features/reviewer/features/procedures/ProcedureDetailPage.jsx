import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  cloneProcedureApi,
  getProcedureDetailApi,
  getProceduresApi,
} from '../../../../services/procedure-service.js';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

function ProcedureDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [procedure, setProcedure] = useState(null);
  const [historyVersions, setHistoryVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const data = await getProcedureDetailApi(id);
      setProcedure(data);

      if (data.service_type_id) {
        const allVersions = await getProceduresApi({ service_type_id: data.service_type_id });
        setHistoryVersions(Array.isArray(allVersions) ? allVersions : []);
      }
    } catch {
      setError('Không thể tải thông tin quy trình.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClone = async () => {
    try {
      const cloned = await cloneProcedureApi(id);
      navigate(`/internal/head-of-tech/procedures/${cloned.id}/edit`);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Lỗi khi nhân bản quy trình.');
    }
  };

  return (
    <ReviewerPageShell
      description="Xem chi tiết toàn bộ cấu trúc quy trình kỹ thuật, các bước đo kiểm, thông số và lịch sử phiên bản."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      title={`Chi tiết quy trình: ${procedure?.service_type?.name || ''} (${procedure?.version || ''})`}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 20 }}>
        {/* CỘT CHÍNH: CHI TIẾT QUY TRÌNH */}
        <section className="reviewer-card">
          {error && <div className="reviewer-feedback error">{error}</div>}

          {loading ? (
            <p>Đang tải dữ liệu quy trình...</p>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h2 style={{ margin: 0 }}>{procedure.service_type?.name}</h2>
                  <p style={{ margin: '4px 0 0', color: '#64748b' }}>
                    Mã tiêu chuẩn: <strong>{procedure.service_type?.standard_code}</strong> · Lĩnh vực: <strong>{procedure.service_type?.field}</strong>
                  </p>
                </div>
                <StatusPill>{procedure.status}</StatusPill>
              </div>

              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, margin: '14px 0', fontSize: '0.85rem' }}>
                <p style={{ margin: '0 0 6px' }}>
                  <strong>Phiên bản:</strong> {procedure.version} · <strong>Hiệu lực từ:</strong> {procedure.effective_from || 'Chưa công bố'}
                </p>
                <p style={{ margin: '0 0 6px' }}>
                  <strong>Môi trường:</strong> {procedure.environment_requirement?.temperature || '—'} ; {procedure.environment_requirement?.humidity || '—'}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Chuẩn đối chứng:</strong> {procedure.required_equipment?.description || 'Theo danh mục chuẩn phòng Lab'}
                </p>
              </div>

              {/* BƯỚC ĐO */}
              <h4 style={{ color: '#0369a1', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                1. Trình tự các bước thao tác ({procedure.steps?.length || 0} bước)
              </h4>
              <div style={{ display: 'grid', gap: 8, margin: '12px 0 20px' }}>
                {(procedure.steps || []).map((s) => (
                  <div key={s.id} style={{ display: 'flex', gap: 10, padding: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                    <strong style={{ color: '#0369a1' }}>#{s.step_no}</strong>
                    <span style={{ flex: 1, fontSize: '0.85rem' }}>{s.instruction}</span>
                    {s.requires_evidence && <span className="dash-meta-chip" style={{ color: '#c2410c' }}>Minh chứng ảnh</span>}
                  </div>
                ))}
              </div>

              {/* THÔNG SỐ VÀ ĐIỂM ĐO */}
              <h4 style={{ color: '#0369a1', borderBottom: '1px solid #e2e8f0', paddingBottom: 6 }}>
                2. Thông số & Điểm đo ({procedure.parameters?.length || 0} thông số)
              </h4>
              {(procedure.parameters || []).map((param) => (
                <div key={param.id} style={{ margin: '12px 0 16px', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>{param.name} ({param.unit})</strong>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Lặp: {param.repeat_count} lần · Hàm tính: <code>{param.calculation_method}</code>
                    </span>
                  </div>
                  <table className="dash-table" style={{ fontSize: '0.75rem', width: '100%' }}>
                    <thead>
                      <tr>
                        <th>Điểm #</th>
                        <th>Giá trị danh định ({param.unit})</th>
                        <th>Dung sai cho phép</th>
                        <th>Độ KĐB tối đa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(param.test_points || []).map((tp) => (
                        <tr key={tp.id}>
                          <td>#{tp.point_no}</td>
                          <td><strong>{tp.nominal_value}</strong></td>
                          <td>{tp.tolerance !== null ? `± ${tp.tolerance}` : '—'}</td>
                          <td>{tp.max_uncertainty !== null ? `≤ ${tp.max_uncertainty}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* CỘT PHỤ: LỊCH SỬ PHIÊN BẢN */}
        <aside className="reviewer-card" style={{ height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>Lịch sử phiên bản</h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 14px' }}>
            Các phiên bản đã ban hành của loại dịch vụ này theo chuẩn truy vết ISO 17025.
          </p>

          <div style={{ display: 'grid', gap: 8 }}>
            {historyVersions.map((v) => (
              <div
                key={v.id}
                onClick={() => navigate(`/internal/head-of-tech/procedures/${v.id}`)}
                style={{
                  padding: 10,
                  borderRadius: 6,
                  border: `1px solid ${String(v.id) === String(id) ? '#0284c7' : '#e2e8f0'}`,
                  background: String(v.id) === String(id) ? '#f0f9ff' : '#fff',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Phiên bản {v.version}</strong>
                  <StatusPill>{v.status}</StatusPill>
                </div>
                <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>
                  Hiệu lực: {v.effective_from || '—'}
                </small>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              className="button button-primary"
              onClick={handleClone}
              style={{ width: '100%', fontSize: '0.78rem' }}
              type="button"
            >
              + Nhân bản bản nháp mới
            </button>
            <Link
              className="button button-secondary"
              to="/internal/head-of-tech/procedures"
              style={{ width: '100%', textAlign: 'center', marginTop: 8, display: 'block', fontSize: '0.78rem' }}
            >
              Quay lại danh sách
            </Link>
          </div>
        </aside>
      </div>
    </ReviewerPageShell>
  );
}

export default ProcedureDetailPage;
