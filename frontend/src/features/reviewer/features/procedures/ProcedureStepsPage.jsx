import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  addProcedureStepApi,
  deleteProcedureStepApi,
  getProcedureDetailApi,
  updateProcedureStepApi,
} from '../../../../services/procedure-service.js';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';
import ProcedureStepTracker from './ProcedureStepTracker.jsx';

function ProcedureStepsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [procedure, setProcedure] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const [newInstruction, setNewInstruction] = useState('');
  const [newRequiresEvidence, setNewRequiresEvidence] = useState(false);
  const [editingStepId, setEditingStepId] = useState(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [editEvidence, setEditEvidence] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getProcedureDetailApi(id);
      setProcedure(data);
      setSteps(data.steps || []);
    } catch {
      setError('Không thể tải các bước của quy trình.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddStep = async (e) => {
    e.preventDefault();
    if (!newInstruction.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      const nextNo = steps.length > 0 ? Math.max(...steps.map((s) => s.step_no)) + 1 : 1;
      await addProcedureStepApi(id, {
        step_no: nextNo,
        instruction: newInstruction.trim(),
        requires_evidence: newRequiresEvidence,
      });
      setNewInstruction('');
      setNewRequiresEvidence(false);
      setFeedback('Đã thêm bước thao tác mới vào quy trình.');
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Lỗi khi thêm bước thao tác.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (step) => {
    setEditingStepId(step.id);
    setEditInstruction(step.instruction);
    setEditEvidence(step.requires_evidence);
  };

  const handleSaveEdit = async (stepId) => {
    if (!editInstruction.trim()) {
      setError('Hướng dẫn thao tác không được để trống.');
      return;
    }
    setError('');
    try {
      await updateProcedureStepApi(stepId, {
        instruction: editInstruction.trim(),
        requires_evidence: editEvidence,
      });
      setEditingStepId(null);
      setFeedback('Đã cập nhật bước thao tác.');
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Lỗi khi sửa bước.');
    }
  };

  const handleDeleteStep = async (stepId, stepNo) => {
    if (!window.confirm(`Bạn có chắc muốn xóa bước thao tác #${stepNo}?`)) return;
    setError('');
    try {
      await deleteProcedureStepApi(stepId);
      setFeedback(`Đã xóa bước thao tác #${stepNo}.`);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Lỗi khi xóa bước.');
    }
  };

  const isDraft = procedure?.status === 'Draft';

  return (
    <ReviewerPageShell
      description="Bước 2/4: Cấu hình trình tự các bước thao tác kỹ thuật và yêu cầu đính kèm minh chứng hình ảnh/biên bản theo ISO/IEC 17025."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      title={procedure?.service_type?.name ? `Bước thao tác: ${procedure.service_type.name}` : 'Bước thao tác quy trình'}
    >
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* Step Progress Tracker */}
        <ProcedureStepTracker currentStep={2} procedureId={id} />

        {/* Procedure Summary Card */}
        {procedure && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
                    {procedure.service_type?.name}
                  </h3>
                  <span
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      padding: '2px 8px',
                      borderRadius: 6,
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    Phiên bản: {procedure.version}
                  </span>
                  <StatusPill tone={isDraft ? 'neutral' : procedure.status === 'Active' ? 'success' : 'warning'}>
                    {procedure.status}
                  </StatusPill>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4 }}>
                  Mã chuẩn: <strong style={{ color: '#334155' }}>{procedure.service_type?.standard_code || '—'}</strong>
                  {' · '}
                  Lĩnh vực: <strong style={{ color: '#334155' }}>{procedure.service_type?.field || '—'}</strong>
                  {' · '}
                  Loại hình:{' '}
                  <strong style={{ color: '#334155' }}>
                    {procedure.service_type?.kind === 'Verification' ? 'Kiểm định' : 'Hiệu chuẩn'}
                  </strong>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'right' }}>
              <div>
                Nhiệt độ: <strong style={{ color: '#0f172a' }}>{procedure.environment_requirement?.temperature || '—'}</strong>
              </div>
              <div>
                Độ ẩm: <strong style={{ color: '#0f172a' }}>{procedure.environment_requirement?.humidity || '—'}</strong>
              </div>
            </div>
          </div>
        )}

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
            Đang tải dữ liệu các bước thao tác...
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            {/* Read-only Alert if not draft */}
            {!isDraft && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: '0.88rem',
                  color: '#475569',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                <span>
                  Quy trình này đang ở trạng thái <strong>{procedure?.status}</strong> (Chỉ đọc). Để sửa đổi các bước, vui lòng nhân bản tạo phiên bản mới ở Bước 4.
                </span>
              </div>
            )}

            {/* Steps List Card */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#fafbfc',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>
                    Trình tự các bước đo kiểm (Operating Sequence)
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Kỹ thuật viên sẽ thực hiện tuần tự từ bước đầu tiên đến bước cuối cùng.
                  </p>
                </div>
                <span
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    padding: '4px 10px',
                    borderRadius: 20,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {steps.length} bước thao tác
                </span>
              </div>

              <div style={{ padding: 20 }}>
                {steps.length === 0 ? (
                  <div
                    style={{
                      padding: '36px 20px',
                      textAlign: 'center',
                      color: '#64748b',
                      background: '#f8fafc',
                      borderRadius: 10,
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>📋</div>
                    <strong style={{ display: 'block', color: '#334155', fontSize: '0.95rem' }}>
                      Chưa có bước thao tác nào
                    </strong>
                    <span style={{ fontSize: '0.82rem', marginTop: 4, display: 'block' }}>
                      Hãy thêm bước đầu tiên (VD: Chuẩn bị thiết bị, ổn định nhiệt độ, kiểm tra ngoại quan) vào biểu mẫu bên dưới.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 12 }}>
                    {steps.map((step) => {
                      const isEditing = editingStepId === step.id;

                      return (
                        <div
                          key={step.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 14,
                            padding: '14px 16px',
                            borderRadius: 10,
                            border: isEditing ? '2px solid #2563eb' : '1px solid #e2e8f0',
                            background: isEditing ? '#eff6ff' : '#ffffff',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                          }}
                        >
                          {/* Step Number Circle */}
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: '#2563eb',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            {step.step_no}
                          </div>

                          {/* Content or Edit Form */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {isEditing ? (
                              <div style={{ display: 'grid', gap: 10 }}>
                                <textarea
                                  rows={3}
                                  value={editInstruction}
                                  onChange={(e) => setEditInstruction(e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    border: '1px solid #93c5fd',
                                    fontSize: '0.88rem',
                                    background: '#ffffff',
                                    color: '#0f172a',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box',
                                  }}
                                  placeholder="Nhập hướng dẫn thao tác chi tiết..."
                                />

                                <label
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    fontSize: '0.82rem',
                                    color: '#334155',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={editEvidence}
                                    onChange={(e) => setEditEvidence(e.target.checked)}
                                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                                  />
                                  <span>
                                    <strong>Bắt buộc đính kèm ảnh chụp / biên bản minh chứng (FR-E6)</strong>
                                  </span>
                                </label>

                                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                  <button
                                    onClick={() => handleSaveEdit(step.id)}
                                    type="button"
                                    style={{
                                      padding: '6px 14px',
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      borderRadius: 6,
                                      border: 'none',
                                      background: '#2563eb',
                                      color: '#fff',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Lưu thay đổi
                                  </button>
                                  <button
                                    onClick={() => setEditingStepId(null)}
                                    type="button"
                                    style={{
                                      padding: '6px 14px',
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      borderRadius: 6,
                                      border: '1px solid #cbd5e1',
                                      background: '#ffffff',
                                      color: '#475569',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p
                                  style={{
                                    margin: 0,
                                    color: '#1e293b',
                                    fontSize: '0.92rem',
                                    lineHeight: 1.5,
                                    fontWeight: 500,
                                  }}
                                >
                                  {step.instruction}
                                </p>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                                  {step.requires_evidence ? (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        background: '#fff7ed',
                                        color: '#c2410c',
                                        border: '1px solid #ffedd5',
                                        padding: '2px 8px',
                                        borderRadius: 6,
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                      }}
                                    >
                                      📸 Bắt buộc minh chứng ảnh/tệp (FR-E6)
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                      Không bắt buộc ảnh
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          {isDraft && !isEditing && (
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button
                                onClick={() => handleStartEdit(step)}
                                type="button"
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  color: '#2563eb',
                                  background: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                                title="Chỉnh sửa bước này"
                              >
                                ✎ Sửa
                              </button>
                              <button
                                onClick={() => handleDeleteStep(step.id, step.step_no)}
                                type="button"
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  color: '#dc2626',
                                  background: '#fef2f2',
                                  border: '1px solid #fecaca',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                                title="Xóa bước này"
                              >
                                ✕ Xóa
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Add Step Form Card (Draft Only) */}
            {isDraft && (
              <form
                onSubmit={handleAddStep}
                style={{
                  background: '#ffffff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 12,
                  boxShadow: '0 2px 6px rgba(37,99,235,0.06)',
                  padding: 20,
                  display: 'grid',
                  gap: 14,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    +
                  </span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#1e40af', fontWeight: 700 }}>
                      Thêm bước thao tác tiếp theo (Bước #{steps.length + 1})
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Mô tả hành động kỹ thuật viên cần tuân thủ khi hiệu chuẩn hoặc đo kiểm.
                    </span>
                  </div>
                </div>

                <div>
                  <textarea
                    required
                    placeholder="Ví dụ: Kiểm tra ngoại quan thiết bị, bảo đảm không nứt vỡ rỉ sét; Bật nguồn và ổn định nhiệt độ 30 phút; Nối cáp đo chuẩn vào cực âm..."
                    rows={3}
                    value={newInstruction}
                    onChange={(e) => setNewInstruction(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      lineHeight: 1.5,
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                      outline: 'none',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                    onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                  />
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    padding: '12px 14px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={newRequiresEvidence}
                      onChange={(e) => setNewRequiresEvidence(e.target.checked)}
                      style={{ width: 17, height: 17, marginTop: 2, cursor: 'pointer' }}
                    />
                    <div>
                      <strong style={{ color: '#0f172a', display: 'block' }}>
                        Bắt buộc đính kèm bằng chứng ảnh chụp hoặc biên bản (FR-E6)
                      </strong>
                      <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                        Khi bật tùy chọn này, kỹ thuật viên không thể hoàn thành bước nếu chưa chụp/tải lên tệp minh chứng thực địa.
                      </span>
                    </div>
                  </label>
                </div>

                <div>
                  <button
                    disabled={submitting || !newInstruction.trim()}
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: submitting || !newInstruction.trim() ? 'not-allowed' : 'pointer',
                      opacity: submitting || !newInstruction.trim() ? 0.6 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 1px 3px rgba(37,99,235,0.2)',
                    }}
                  >
                    {submitting ? 'Đang thêm...' : '+ Thêm bước vào quy trình'}
                  </button>
                </div>
              </form>
            )}

            {/* Navigation Footer */}
            <footer
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 8,
                marginTop: 10,
              }}
            >
              <button
                onClick={() => navigate(`/internal/head-of-tech/procedures/${id}/edit`)}
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
                ← Quay lại Bước 1: Thông tin chung
              </button>

              <button
                onClick={() => navigate(`/internal/head-of-tech/procedures/${id}/parameters`)}
                type="button"
                style={{
                  padding: '10px 22px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
                }}
              >
                Tiếp tục sang Bước 3: Thông số & Điểm đo →
              </button>
            </footer>
          </div>
        )}
      </div>
    </ReviewerPageShell>
  );
}

export default ProcedureStepsPage;
