import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  cloneProcedureApi,
  getProcedureDetailApi,
  publishProcedureApi,
} from '../../../../services/procedure-service.js';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';
import ProcedureStepTracker from './ProcedureStepTracker.jsx';

function ProcedurePreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [procedure, setProcedure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [cloning, setCloning] = useState(false);
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
        `Xác nhận phê duyệt & phát hành phiên bản "${procedure.version}" của "${procedure.service_type?.name}" thành ACTIVE?\n\nLưu ý: Mọi phiên bản Active cũ của loại dịch vụ này sẽ tự động chuyển sang Obsolete theo quy định ISO/IEC 17025.`
      )
    ) {
      return;
    }

    setPublishing(true);
    setError('');
    try {
      const result = await publishProcedureApi(id);
      setFeedback(`Đã phát hành thành công quy trình phiên bản ${result.version} (Active).`);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Có lỗi xảy ra khi phát hành quy trình.');
    } finally {
      setPublishing(false);
    }
  };

  const handleClone = async () => {
    setCloning(true);
    setError('');
    try {
      const cloned = await cloneProcedureApi(id);
      setFeedback(`Đã tạo bản nháp mới ${cloned.version} từ quy trình này.`);
      navigate(`/internal/head-of-tech/procedures/${cloned.id}/edit`);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Lỗi khi nhân bản quy trình.');
    } finally {
      setCloning(false);
    }
  };

  const isDraft = procedure?.status === 'Draft';
  const isActive = procedure?.status === 'Active';
  const isObsolete = procedure?.status === 'Obsolete';

  const steps = procedure?.steps || [];
  const parameters = procedure?.parameters || [];
  const totalPoints = parameters.reduce((acc, p) => acc + (p.test_points?.length || 0), 0);

  const canPublish = isDraft && steps.length > 0 && parameters.length > 0;

  return (
    <ReviewerPageShell
      description="Bước 4/4: Xem trước toàn bộ biểu mẫu đo lường kỹ thuật viên sẽ điền thực tế và phê duyệt ban hành phiên bản Active theo ISO/IEC 17025."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      title={procedure?.service_type?.name ? `Xem trước biểu mẫu: ${procedure.service_type.name}` : 'Xem trước & Ban hành'}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Step Progress Tracker */}
        <ProcedureStepTracker currentStep={4} procedureId={id} />

        {/* Error notification */}
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
            Đang tổng hợp dữ liệu biểu mẫu đo lường...
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            {/* Procedure Dossier Header Card */}
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
                  gap: 16,
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

                {!isDraft && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      disabled={cloning}
                      onClick={handleClone}
                      type="button"
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: '1px solid #bfdbfe',
                        background: '#eff6ff',
                        color: '#2563eb',
                        fontWeight: 600,
                        fontSize: '0.82rem',
                        cursor: cloning ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {cloning ? 'Đang tạo bản nháp...' : '+ Nhân bản sang Draft mới'}
                    </button>
                  </div>
                )}
              </div>

              {/* Conditions & Standard Requirements */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 16,
                  marginTop: 16,
                }}
              >
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '14px 16px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Yêu cầu điều kiện môi trường (ISO/IEC 17025 Điều 6.3)
                  </span>
                  <div style={{ marginTop: 6, fontSize: '0.86rem', color: '#0f172a', fontWeight: 600 }}>
                    Nhiệt độ: {procedure.environment_requirement?.temperature || '—'}
                    {' · '}
                    Độ ẩm: {procedure.environment_requirement?.humidity || '—'}
                  </div>
                  {procedure.environment_requirement?.notes && (
                    <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#475569' }}>
                      Ghi chú: {procedure.environment_requirement.notes}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    padding: '14px 16px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Chuẩn đối chứng & Thiết bị phụ trợ yêu cầu
                  </span>
                  <div style={{ marginTop: 6, fontSize: '0.86rem', color: '#0f172a', fontWeight: 600 }}>
                    {procedure.required_equipment?.description || 'Theo danh mục chuẩn đối chứng còn hạn hiệu chuẩn.'}
                  </div>
                </div>
              </div>
            </div>

            {/* PART 1: OPERATIONAL STEPS CHECKLIST PREVIEW */}
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
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', color: '#0f172a', fontWeight: 700 }}>
                    Phần 1: Trình tự các bước thao tác kỹ thuật (Checklist)
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Kỹ thuật viên sẽ đánh dấu hoàn thành từng bước khi thao tác thực địa.
                  </p>
                </div>
                <span
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 12,
                  }}
                >
                  {steps.length} bước
                </span>
              </div>

              <div style={{ padding: 18 }}>
                {steps.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: '0.86rem' }}>
                    Chưa có bước thao tác nào.{' '}
                    {isDraft && (
                      <Link to={`/internal/head-of-tech/procedures/${id}/steps`} style={{ color: '#2563eb' }}>
                        Quay lại Bước 2 để thêm bước
                      </Link>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {steps.map((step) => (
                      <div
                        key={step.id}
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
                        <input disabled type="checkbox" style={{ width: 16, height: 16, cursor: 'not-allowed' }} />
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
                          Bước {step.step_no}
                        </span>
                        <span style={{ flex: 1, fontSize: '0.88rem', color: '#1e293b' }}>
                          {step.instruction}
                        </span>
                        {step.requires_evidence && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              background: '#fff7ed',
                              color: '#c2410c',
                              border: '1px solid #ffedd5',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              flexShrink: 0,
                            }}
                          >
                            📷 Cần ảnh minh chứng
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* PART 2: DYNAMIC MEASUREMENT SHEET PREVIEW */}
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
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', color: '#0f172a', fontWeight: 700 }}>
                    Phần 2: Biểu mẫu ghi số liệu đo lường động (Dynamic Measurement Protocol)
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Biểu mẫu được tự động sinh dựa trên các thông số, số lần đo lặp và điểm danh định đã cấu hình.
                  </p>
                </div>
                <span
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 12,
                  }}
                >
                  {parameters.length} thông số · {totalPoints} điểm đo
                </span>
              </div>

              <div style={{ padding: 18 }}>
                {parameters.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: '0.86rem' }}>
                    Chưa có thông số đo lường nào.{' '}
                    {isDraft && (
                      <Link to={`/internal/head-of-tech/procedures/${id}/parameters`} style={{ color: '#2563eb' }}>
                        Quay lại Bước 3 để thêm thông số
                      </Link>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 20 }}>
                    {parameters.map((param) => (
                      <div
                        key={param.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 8,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Parameter Sub-Header */}
                        <div
                          style={{
                            background: '#f8fafc',
                            padding: '10px 14px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 8,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                              Thông số: {param.name}
                            </strong>
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
                              Đơn vị: {param.unit}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            Đo lặp: <strong>{param.repeat_count} lần</strong>
                            {' · '}
                            Hàm tính: <code style={{ color: '#0f172a' }}>{param.calculation_method}</code>
                          </div>
                        </div>

                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                          <table
                            style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              fontSize: '0.8rem',
                              textAlign: 'left',
                            }}
                          >
                            <thead>
                              <tr style={{ background: '#fafbfc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Điểm đo danh định</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Dung sai cho phép</th>
                                {Array.from({ length: param.repeat_count }, (_, i) => (
                                  <th key={i} style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'center' }}>
                                    Lần {i + 1}
                                  </th>
                                ))}
                                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Giá trị tính toán</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600 }}>Sai số (Δ)</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'center' }}>Đánh giá</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(param.test_points || []).map((tp) => (
                                <tr
                                  key={tp.id}
                                  style={{
                                    borderBottom: '1px solid #f1f5f9',
                                    background: '#ffffff',
                                  }}
                                >
                                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                                    #{tp.point_no} — {tp.nominal_value} {param.unit}
                                  </td>
                                  <td style={{ padding: '8px 10px', color: '#475569' }}>
                                    {tp.tolerance !== null ? `± ${tp.tolerance} ${param.unit}` : '— (Theo dõi)'}
                                  </td>
                                  {Array.from({ length: param.repeat_count }, (_, i) => (
                                    <td key={i} style={{ padding: '8px 10px', textAlign: 'center' }}>
                                      <input
                                        disabled
                                        placeholder={`... ${param.unit}`}
                                        style={{
                                          width: 75,
                                          padding: '4px 6px',
                                          fontSize: '0.76rem',
                                          background: '#f8fafc',
                                          border: '1px solid #e2e8f0',
                                          borderRadius: 4,
                                          textAlign: 'center',
                                          color: '#94a3b8',
                                          cursor: 'not-allowed',
                                        }}
                                      />
                                    </td>
                                  ))}
                                  <td style={{ padding: '8px 10px', color: '#2563eb', fontWeight: 600 }}>
                                    ƒ({param.calculation_method})
                                  </td>
                                  <td style={{ padding: '8px 10px', color: '#64748b' }}>
                                    Δ = đo - chuẩn
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                    <span
                                      style={{
                                        background: '#f1f5f9',
                                        color: '#64748b',
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: 4,
                                        border: '1px solid #e2e8f0',
                                      }}
                                    >
                                      Chờ đo
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {(!param.test_points || param.test_points.length === 0) && (
                                <tr>
                                  <td
                                    colSpan={4 + param.repeat_count}
                                    style={{
                                      textAlign: 'center',
                                      color: '#94a3b8',
                                      padding: '16px',
                                      background: '#fafbfc',
                                    }}
                                  >
                                    Chưa có điểm đo danh định nào cho thông số này.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* PUBLISH OR COMPLIANCE ACTION SECTION */}
            {isDraft ? (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #bbf7d0',
                  borderRadius: 12,
                  padding: 24,
                  boxShadow: '0 2px 8px rgba(22,163,74,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: '1.4rem' }}>🛡️</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: '#166534', fontWeight: 750 }}>
                      Phê duyệt & Ban hành Quy trình Kỹ thuật (ISO/IEC 17025)
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: '#15803d' }}>
                      Xác nhận các bước thao tác và thông số đo lường đã đáp ứng đầy đủ tiêu chuẩn trước khi đưa vào vận hành.
                    </span>
                  </div>
                </div>

                {/* Validation checklist */}
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #dcfce7',
                    borderRadius: 8,
                    padding: '12px 16px',
                    marginBottom: 16,
                    fontSize: '0.84rem',
                    display: 'grid',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{steps.length > 0 ? '✅' : '❌'}</span>
                    <span style={{ color: steps.length > 0 ? '#166534' : '#991b1b', fontWeight: 600 }}>
                      Các bước thao tác kỹ thuật: {steps.length > 0 ? `Đã cấu hình ${steps.length} bước` : 'Chưa có bước thao tác nào'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{parameters.length > 0 ? '✅' : '❌'}</span>
                    <span style={{ color: parameters.length > 0 ? '#166534' : '#991b1b', fontWeight: 600 }}>
                      Thông số đo lường: {parameters.length > 0 ? `Đã cấu hình ${parameters.length} thông số` : 'Chưa có thông số đo nào'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{totalPoints > 0 ? '✅' : '⚠️'}</span>
                    <span style={{ color: totalPoints > 0 ? '#166534' : '#854d0e', fontWeight: 600 }}>
                      Điểm đo danh định: {totalPoints > 0 ? `Tổng cộng ${totalPoints} điểm đo` : 'Khuyến nghị bổ sung ít nhất 1 điểm đo'}
                    </span>
                  </div>
                </div>

                {/* ISO warning note */}
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fef3c7',
                    borderRadius: 8,
                    padding: '12px 16px',
                    marginBottom: 20,
                    fontSize: '0.82rem',
                    color: '#92400e',
                    lineHeight: 1.5,
                  }}
                >
                  <strong>⚠️ Lưu ý về tính bất biến dữ liệu (Immutability):</strong> Khi quy trình được ban hành thành{' '}
                  <strong>ACTIVE</strong>, hệ thống sẽ sử dụng biểu mẫu này cho mọi đơn kiểm định/hiệu chuẩn mới. Các phiên bản Active cũ của loại dịch vụ này sẽ tự động chuyển thành Obsolete. Quy trình Active sẽ bị khóa chỉnh sửa để đảm bảo tính toàn vẹn pháp lý.
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <button
                    onClick={() => navigate(`/internal/head-of-tech/procedures/${id}/parameters`)}
                    type="button"
                    style={{
                      padding: '10px 18px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#334155',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    ← Quay lại Bước 3: Thông số & Điểm đo
                  </button>

                  <button
                    disabled={!canPublish || publishing}
                    onClick={handlePublish}
                    type="button"
                    style={{
                      padding: '12px 28px',
                      borderRadius: 8,
                      border: 'none',
                      background: canPublish ? '#16a34a' : '#94a3b8',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      cursor: canPublish && !publishing ? 'pointer' : 'not-allowed',
                      boxShadow: canPublish ? '0 2px 6px rgba(22,163,74,0.3)' : 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {publishing ? 'Đang phát hành...' : '✓ Phê duyệt & Ban hành Quy trình (Active)'}
                  </button>
                </div>
              </div>
            ) : (
              /* Already Active or Obsolete */
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    Trạng thái quy trình: <StatusPill tone={isActive ? 'success' : 'warning'}>{procedure.status}</StatusPill>
                  </span>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    {isActive
                      ? 'Quy trình đang được áp dụng chính thức cho các hoạt động kiểm định/hiệu chuẩn.'
                      : 'Quy trình đã hết hiệu lực do đã có phiên bản thay thế.'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => navigate('/internal/head-of-tech/procedures')}
                    type="button"
                    style={{
                      padding: '10px 18px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#334155',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                    }}
                  >
                    ← Về danh sách quy trình
                  </button>

                  <button
                    disabled={cloning}
                    onClick={handleClone}
                    type="button"
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: cloning ? 'not-allowed' : 'pointer',
                      boxShadow: '0 1px 3px rgba(37,99,235,0.2)',
                    }}
                  >
                    {cloning ? 'Đang tạo...' : '+ Nhân bản tạo phiên bản mới (Draft)'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ReviewerPageShell>
  );
}

export default ProcedurePreviewPage;
