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
  const [cloning, setCloning] = useState(false);
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
    setCloning(true);
    try {
      const cloned = await cloneProcedureApi(id);
      navigate(`/internal/head-of-tech/procedures/${cloned.id}/edit`);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Lỗi khi nhân bản quy trình.');
    } finally {
      setCloning(false);
    }
  };

  const isDraft = procedure?.status === 'Draft';
  const isActive = procedure?.status === 'Active';

  return (
    <ReviewerPageShell
      description="Xem chi tiết toàn bộ cấu trúc quy trình kỹ thuật, các bước đo kiểm, thông số và lịch sử phiên bản theo ISO/IEC 17025."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      title={procedure?.service_type?.name ? `Chi tiết quy trình: ${procedure.service_type.name}` : 'Chi tiết quy trình'}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {error && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 8,
              background: '#fee2e2',
              border: '1px solid #ef4444',
              color: '#991b1b',
              marginBottom: 20,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 40,
              textAlign: 'center',
              color: '#64748b',
            }}
          >
            <div style={{ fontSize: '1.2rem', marginBottom: 8 }}>⏳</div>
            Đang tải dữ liệu quy trình...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 20, alignItems: 'start' }}>
            {/* CỘT CHÍNH: CHI TIẾT QUY TRÌNH */}
            <section style={{ display: 'grid', gap: 20 }}>
              {/* Header Dossier */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '20px 24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 12,
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: 16,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 750 }}>
                        {procedure.service_type?.name}
                      </h2>
                      <span
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          padding: '3px 10px',
                          borderRadius: 6,
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        Phiên bản: {procedure.version}
                      </span>
                      <StatusPill tone={isActive ? 'success' : isDraft ? 'neutral' : 'warning'}>
                        {procedure.status}
                      </StatusPill>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 6 }}>
                      Mã tiêu chuẩn: <strong style={{ color: '#1e293b' }}>{procedure.service_type?.standard_code}</strong>
                      {' · '}
                      Lĩnh vực: <strong style={{ color: '#1e293b' }}>{procedure.service_type?.field}</strong>
                      {' · '}
                      Loại hình:{' '}
                      <strong style={{ color: '#1e293b' }}>
                        {procedure.service_type?.kind === 'Verification' ? 'Kiểm định' : 'Hiệu chuẩn'}
                      </strong>
                      {procedure.effective_from && (
                        <>
                          {' · '}
                          Hiệu lực từ: <strong style={{ color: '#1e293b' }}>{procedure.effective_from}</strong>
                        </>
                      )}
                    </div>
                  </div>

                  {isDraft && (
                    <Link
                      to={`/internal/head-of-tech/procedures/${id}/edit`}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        background: '#2563eb',
                        color: '#ffffff',
                        fontWeight: 600,
                        fontSize: '0.84rem',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      ✎ Mở Wizard chỉnh sửa →
                    </Link>
                  )}
                </div>

                {/* Điều kiện môi trường & Chuẩn */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: 14,
                    marginTop: 16,
                  }}
                >
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: '0.84rem',
                    }}
                  >
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Điều kiện môi trường thao tác
                    </span>
                    <div style={{ marginTop: 4, fontWeight: 600, color: '#0f172a' }}>
                      Nhiệt độ: {procedure.environment_requirement?.temperature || '—'}
                      {' · '}
                      Độ ẩm: {procedure.environment_requirement?.humidity || '—'}
                    </div>
                    {procedure.environment_requirement?.notes && (
                      <div style={{ marginTop: 4, fontSize: '0.78rem', color: '#475569' }}>
                        {procedure.environment_requirement.notes}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: '0.84rem',
                    }}
                  >
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Chuẩn đối chứng & Thiết bị phụ trợ
                    </span>
                    <div style={{ marginTop: 4, fontWeight: 600, color: '#0f172a' }}>
                      {procedure.required_equipment?.description || 'Theo danh mục chuẩn phòng Lab'}
                    </div>
                  </div>
                </div>
              </div>

              {/* BƯỚC THAO TÁC */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '14px 20px',
                    background: '#fafbfc',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '0.98rem', color: '#0f172a', fontWeight: 700 }}>
                    1. Trình tự các bước thao tác ({procedure.steps?.length || 0} bước)
                  </h3>
                  <span
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 10,
                    }}
                  >
                    ISO 17025
                  </span>
                </div>

                <div style={{ padding: 18 }}>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {(procedure.steps || []).map((s) => (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '10px 14px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                        }}
                      >
                        <span
                          style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            fontWeight: 700,
                            fontSize: '0.76rem',
                            padding: '2px 8px',
                            borderRadius: 4,
                            flexShrink: 0,
                          }}
                        >
                          Bước #{s.step_no}
                        </span>
                        <span style={{ flex: 1, fontSize: '0.88rem', color: '#1e293b' }}>{s.instruction}</span>
                        {s.requires_evidence && (
                          <span
                            style={{
                              background: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #ffedd5',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '0.74rem',
                              fontWeight: 600,
                            }}
                          >
                            📷 Minh chứng ảnh
                          </span>
                        )}
                      </div>
                    ))}
                    {(!procedure.steps || procedure.steps.length === 0) && (
                      <p style={{ textAlign: 'center', color: '#94a3b8', margin: '10px 0' }}>
                        Chưa có bước thao tác nào.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* THÔNG SỐ VÀ ĐIỂM ĐO */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '14px 20px',
                    background: '#fafbfc',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '0.98rem', color: '#0f172a', fontWeight: 700 }}>
                    2. Thông số & Điểm đo lường ({procedure.parameters?.length || 0} thông số)
                  </h3>
                </div>

                <div style={{ padding: 18, display: 'grid', gap: 16 }}>
                  {(procedure.parameters || []).map((param) => (
                    <div
                      key={param.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          background: '#f8fafc',
                          padding: '10px 14px',
                          borderBottom: '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{param.name}</strong>
                          <span
                            style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontSize: '0.74rem',
                              fontWeight: 600,
                            }}
                          >
                            {param.unit}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                          Lặp: <strong>{param.repeat_count} lần</strong> · Hàm tính:{' '}
                          <code>{param.calculation_method}</code>
                        </div>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ background: '#fafbfc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                              <th style={{ padding: '8px 10px', fontWeight: 600 }}>Điểm #</th>
                              <th style={{ padding: '8px 10px', fontWeight: 600 }}>Giá trị danh định</th>
                              <th style={{ padding: '8px 10px', fontWeight: 600 }}>Dung sai cho phép</th>
                              <th style={{ padding: '8px 10px', fontWeight: 600 }}>Độ KĐB tối đa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(param.test_points || []).map((tp) => (
                              <tr key={tp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 10px', fontWeight: 700, color: '#2563eb' }}>#{tp.point_no}</td>
                                <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                                  {tp.nominal_value} {param.unit}
                                </td>
                                <td style={{ padding: '8px 10px', color: '#334155' }}>
                                  {tp.tolerance !== null ? `± ${tp.tolerance} ${param.unit}` : '— (Theo dõi)'}
                                </td>
                                <td style={{ padding: '8px 10px', color: '#334155' }}>
                                  {tp.max_uncertainty !== null ? `≤ ${tp.max_uncertainty} ${param.unit}` : '—'}
                                </td>
                              </tr>
                            ))}
                            {(!param.test_points || param.test_points.length === 0) && (
                              <tr>
                                <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: 14 }}>
                                  Chưa có điểm đo danh định nào.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* CỘT PHỤ: LỊCH SỬ PHIÊN BẢN */}
            <aside style={{ display: 'grid', gap: 16 }}>
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 18,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
              >
                <h3 style={{ margin: '0 0 6px', fontSize: '0.96rem', color: '#0f172a', fontWeight: 700 }}>
                  Lịch sử phiên bản
                </h3>
                <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '0 0 14px' }}>
                  Chuỗi truy vết các phiên bản đã ban hành theo ISO/IEC 17025.
                </p>

                <div style={{ display: 'grid', gap: 8 }}>
                  {historyVersions.map((v) => {
                    const isSelected = String(v.id) === String(id);

                    return (
                      <div
                        key={v.id}
                        onClick={() => navigate(`/internal/head-of-tech/procedures/${v.id}`)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: `1.5px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: isSelected ? '#1d4ed8' : '#0f172a' }}>
                            {isSelected ? '▶ ' : ''}Phiên bản {v.version}
                          </strong>
                          <StatusPill tone={v.status === 'Active' ? 'success' : v.status === 'Draft' ? 'neutral' : 'warning'}>
                            {v.status}
                          </StatusPill>
                        </div>
                        <small style={{ color: '#64748b', display: 'block', marginTop: 4, fontSize: '0.74rem' }}>
                          Hiệu lực: {v.effective_from || '—'}
                        </small>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 20, display: 'grid', gap: 8 }}>
                  <button
                    disabled={cloning}
                    onClick={handleClone}
                    type="button"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.84rem',
                      cursor: cloning ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 3px rgba(37,99,235,0.2)',
                    }}
                  >
                    {cloning ? 'Đang tạo...' : '+ Nhân bản bản nháp mới'}
                  </button>

                  <Link
                    to="/internal/head-of-tech/procedures"
                    style={{
                      width: '100%',
                      textAlign: 'center',
                      display: 'block',
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    ← Về danh sách quy trình
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </ReviewerPageShell>
  );
}

export default ProcedureDetailPage;
