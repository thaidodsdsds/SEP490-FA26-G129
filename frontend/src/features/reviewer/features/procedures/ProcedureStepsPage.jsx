import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  addProcedureStepApi,
  deleteProcedureStepApi,
  getProcedureDetailApi,
  updateProcedureStepApi,
} from '../../../../services/procedure-service.js';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';

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

    try {
      const nextNo = steps.length > 0 ? Math.max(...steps.map((s) => s.step_no)) + 1 : 1;
      await addProcedureStepApi(id, {
        step_no: nextNo,
        instruction: newInstruction.trim(),
        requires_evidence: newRequiresEvidence,
      });
      setNewInstruction('');
      setNewRequiresEvidence(false);
      setFeedback('Đã thêm bước thao tác mới.');
      loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Lỗi khi thêm bước.');
    }
  };

  const handleStartEdit = (step) => {
    setEditingStepId(step.id);
    setEditInstruction(step.instruction);
    setEditEvidence(step.requires_evidence);
  };

  const handleSaveEdit = async (stepId) => {
    try {
      await updateProcedureStepApi(stepId, {
        instruction: editInstruction.trim(),
        requires_evidence: editEvidence,
      });
      setEditingStepId(null);
      setFeedback('Đã cập nhật bước thao tác.');
      loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Lỗi khi sửa bước.');
    }
  };

  const handleDeleteStep = async (stepId) => {
    if (!window.confirm('Bạn có chắc muốn xóa bước thao tác này?')) return;
    try {
      await deleteProcedureStepApi(stepId);
      setFeedback('Đã xóa bước thao tác.');
      loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Lỗi khi xóa bước.');
    }
  };

  const isDraft = procedure?.status === 'Draft';

  return (
    <ReviewerPageShell
      description="Bước 2: Cấu hình trình tự các bước thao tác kỹ thuật và yêu cầu đính kèm minh chứng hình ảnh/biên bản."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      title={`Cấu hình các bước quy trình: ${procedure?.service_type?.name || ''} (${procedure?.version || ''})`}
    >
      <section className="reviewer-card" style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Navigation Step Breadcrumbs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #e3edf2', paddingBottom: 12 }}>
          <Link to={`/internal/head-of-tech/procedures/${id}/edit`}>1. Thông tin chung</Link>
          <span>→</span>
          <span style={{ fontWeight: 700, color: '#1f6e8c' }}>2. Bước quy trình</span>
          <span>→</span>
          <Link to={`/internal/head-of-tech/procedures/${id}/parameters`}>3. Thông số & Điểm đo</Link>
          <span>→</span>
          <Link to={`/internal/head-of-tech/procedures/${id}/preview`}>4. Xem trước & Phát hành</Link>
        </div>

        {error && <div className="reviewer-feedback error" style={{ marginBottom: 14 }}>{error}</div>}

        {loading ? (
          <p>Đang tải danh sách các bước...</p>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Danh sách các bước thao tác (Procedure Steps)</h3>
              <span className="demo-pill">Tổng số: {steps.length} bước</span>
            </div>

            {/* Danh sách các bước */}
            <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
              {steps.map((step) => (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid #dce5eb',
                    background: '#fff',
                  }}
                >
                  <span
                    style={{
                      background: '#1f6e8c',
                      color: '#fff',
                      fontWeight: 700,
                      borderRadius: '50%',
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      flexShrink: 0,
                    }}
                  >
                    {step.step_no}
                  </span>

                  <div style={{ flex: 1 }}>
                    {editingStepId === step.id ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <textarea
                          rows={2}
                          value={editInstruction}
                          onChange={(e) => setEditInstruction(e.target.value)}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                          <input
                            type="checkbox"
                            checked={editEvidence}
                            onChange={(e) => setEditEvidence(e.target.checked)}
                          />
                          Bắt buộc đính kèm ảnh/biên bản minh chứng (requires_evidence)
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="button button-primary"
                            onClick={() => handleSaveEdit(step.id)}
                            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            type="button"
                          >
                            Lưu
                          </button>
                          <button
                            className="button button-secondary"
                            onClick={() => setEditingStepId(null)}
                            style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            type="button"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#1f3a4d' }}>{step.instruction}</p>
                        {step.requires_evidence && (
                          <span className="dash-meta-chip" style={{ color: '#d9480f', fontWeight: 700 }}>
                            📸 Bắt buộc minh chứng ảnh/tệp (FR-E6)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {isDraft && editingStepId !== step.id && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="button button-secondary"
                        onClick={() => handleStartEdit(step)}
                        style={{ padding: '2px 8px', fontSize: '0.72rem', minHeight: 24 }}
                        type="button"
                      >
                        Sửa
                      </button>
                      <button
                        className="button button-secondary"
                        onClick={() => handleDeleteStep(step.id)}
                        style={{ padding: '2px 8px', fontSize: '0.72rem', minHeight: 24, color: '#c92a2a' }}
                        type="button"
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {steps.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: '#6a7d8d', background: '#f8fafc', borderRadius: 8 }}>
                  Chưa có bước thao tác nào được thêm vào quy trình này.
                </div>
              )}
            </div>

            {/* Form thêm bước mới (chỉ hiện khi Draft) */}
            {isDraft && (
              <form
                onSubmit={handleAddStep}
                style={{
                  background: '#f8fafc',
                  border: '1px dashed #228be6',
                  borderRadius: 8,
                  padding: 16,
                  display: 'grid',
                  gap: 12,
                }}
              >
                <h4 style={{ margin: 0, color: '#1c7ed6' }}>+ Thêm bước thao tác tiếp theo (Bước #{steps.length + 1})</h4>
                <textarea
                  required
                  placeholder="Nhập hướng dẫn thao tác (VD: Kiểm tra ngoại quan, ổn định nhiệt độ 30 phút, đo điện áp...)"
                  rows={2}
                  value={newInstruction}
                  onChange={(e) => setNewInstruction(e.target.value)}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newRequiresEvidence}
                    onChange={(e) => setNewRequiresEvidence(e.target.checked)}
                  />
                  <span>Bắt buộc đính kèm bằng chứng ảnh chụp hoặc biên bản (FR-E6)</span>
                </label>
                <div>
                  <button className="button button-primary" type="submit">
                    + Thêm bước vào quy trình
                  </button>
                </div>
              </form>
            )}

            <footer style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button
                className="button button-secondary"
                onClick={() => navigate(`/internal/head-of-tech/procedures/${id}/edit`)}
                type="button"
              >
                ← Bước 1: Thông tin chung
              </button>
              <button
                className="button button-primary"
                onClick={() => navigate(`/internal/head-of-tech/procedures/${id}/parameters`)}
                type="button"
              >
                Tiếp tục sang Bước 3: Thông số & Điểm đo →
              </button>
            </footer>
          </div>
        )}
      </section>
    </ReviewerPageShell>
  );
}

export default ProcedureStepsPage;
