import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addProcedureParameterApi,
  addProcedureTestPointApi,
  deleteProcedureParameterApi,
  deleteProcedureTestPointApi,
  getProcedureDetailApi,
} from '../../../../services/procedure-service.js';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';
import StatusPill from '../../shared/StatusPill.jsx';
import ProcedureStepTracker from './ProcedureStepTracker.jsx';

const CALCULATION_METHODS = [
  { value: 'mean', label: 'mean — Trung bình cộng các lần đo lặp' },
  { value: 'stdev', label: 'stdev — Độ lệch chuẩn thực nghiệm' },
  { value: 'max', label: 'max — Giá trị lớn nhất' },
  { value: 'min', label: 'min — Giá trị nhỏ nhất' },
  { value: 'max(readings) - min(readings)', label: 'max - min — Độ biến động / phân bố nhiệt độ' },
  { value: 'reading - load', label: 'reading - load — Sai số chỉ thị theo tải (Cân/Lực)' },
  { value: 'display_value - mean(readings)', label: 'display - mean — Sai số chỉ thị tủ nhiệt/nhiệt kế' },
];

function ProcedureParametersPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [procedure, setProcedure] = useState(null);
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  // State thêm thông số mới
  const [paramName, setParamName] = useState('');
  const [paramUnit, setParamUnit] = useState('V');
  const [paramRepeat, setParamRepeat] = useState(3);
  const [paramMethod, setParamMethod] = useState('mean');
  const [addingParam, setAddingParam] = useState(false);

  // State thêm điểm đo cho một thông số cụ thể
  const [activeParamForPoint, setActiveParamForPoint] = useState(null);
  const [pointNominal, setPointNominal] = useState('');
  const [pointTolerance, setPointTolerance] = useState('');
  const [pointUncertainty, setPointUncertainty] = useState('');
  const [addingPoint, setAddingPoint] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getProcedureDetailApi(id);
      setProcedure(data);
      setParameters(data.parameters || []);
    } catch {
      setError('Không thể tải danh sách thông số đo lường.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddParameter = async (e) => {
    e.preventDefault();
    if (!paramName.trim()) return;

    setAddingParam(true);
    setError('');
    try {
      await addProcedureParameterApi(id, {
        name: paramName.trim(),
        unit: paramUnit.trim(),
        repeat_count: Number(paramRepeat) || 1,
        calculation_method: paramMethod,
      });
      setParamName('');
      setFeedback(`Đã thêm thông số đo "${paramName.trim()}".`);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Lỗi khi thêm thông số.');
    } finally {
      setAddingParam(false);
    }
  };

  const handleDeleteParameter = async (paramId, name) => {
    if (!window.confirm(`Xóa thông số "${name}" sẽ xóa toàn bộ các điểm đo thuộc thông số này. Bạn có chắc không?`)) {
      return;
    }
    setError('');
    try {
      await deleteProcedureParameterApi(paramId);
      setFeedback(`Đã xóa thông số đo "${name}".`);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Lỗi khi xóa thông số.');
    }
  };

  const handleAddTestPoint = async (e, paramId) => {
    e.preventDefault();
    if (pointNominal === '') return;

    const param = parameters.find((p) => p.id === paramId);
    const existingPoints = param?.test_points || [];
    const nextPointNo = existingPoints.length > 0 ? Math.max(...existingPoints.map((tp) => tp.point_no)) + 1 : 1;

    setAddingPoint(true);
    setError('');
    try {
      await addProcedureTestPointApi(paramId, {
        point_no: nextPointNo,
        nominal_value: Number(pointNominal),
        tolerance: pointTolerance !== '' ? Number(pointTolerance) : null,
        max_uncertainty: pointUncertainty !== '' ? Number(pointUncertainty) : null,
      });
      setPointNominal('');
      setPointTolerance('');
      setPointUncertainty('');
      setActiveParamForPoint(null);
      setFeedback(`Đã thêm điểm đo danh định ${pointNominal} ${param?.unit || ''}.`);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Lỗi khi thêm điểm đo.');
    } finally {
      setAddingPoint(false);
    }
  };

  const handleDeleteTestPoint = async (pointId, pointNo) => {
    if (!window.confirm(`Bạn có chắc muốn xóa điểm đo #${pointNo}?`)) return;
    setError('');
    try {
      await deleteProcedureTestPointApi(pointId);
      setFeedback(`Đã xóa điểm đo #${pointNo}.`);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Lỗi khi xóa điểm đo.');
    }
  };

  const isDraft = procedure?.status === 'Draft';

  return (
    <ReviewerPageShell
      description="Bước 3/4: Định nghĩa các thông số đo lường (unit, repeat_count, hàm tính) và các điểm đo danh định (nominal_value, tolerance, max_uncertainty)."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      title={procedure?.service_type?.name ? `Thông số & Điểm đo: ${procedure.service_type.name}` : 'Cấu hình Thông số & Điểm đo'}
    >
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Step Progress Tracker */}
        <ProcedureStepTracker currentStep={3} procedureId={id} />

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

        {/* Error alert */}
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
            Đang tải dữ liệu thông số và điểm đo...
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
                  Quy trình này đang ở trạng thái <strong>{procedure?.status}</strong> (Chỉ đọc). Để cấu hình thông số và điểm đo, vui lòng nhân bản tạo phiên bản mới.
                </span>
              </div>
            )}

            {/* Parameters List */}
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>
                    Danh sách thông số đo lường (Measurement Parameters)
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Mỗi thông số đại diện cho một đại lượng vật lý cần kiểm tra (điện áp, dòng điện, nhiệt độ, áp suất, khối lượng...).
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
                  {parameters.length} thông số
                </span>
              </div>

              {parameters.length === 0 ? (
                <div
                  style={{
                    padding: '36px 20px',
                    textAlign: 'center',
                    color: '#64748b',
                    background: '#ffffff',
                    borderRadius: 12,
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>📊</div>
                  <strong style={{ display: 'block', color: '#334155', fontSize: '0.95rem' }}>
                    Chưa có thông số đo lường nào
                  </strong>
                  <span style={{ fontSize: '0.82rem', marginTop: 4, display: 'block' }}>
                    Vui lòng thêm ít nhất một thông số đo lường (VD: Điện áp DC, Sai số chỉ thị) ở biểu mẫu bên dưới.
                  </span>
                </div>
              ) : (
                parameters.map((param) => {
                  const isAddingPointHere = activeParamForPoint === param.id;
                  const testPoints = param.test_points || [];

                  return (
                    <div
                      key={param.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Parameter Card Header */}
                      <div
                        style={{
                          padding: '14px 18px',
                          background: '#fafbfc',
                          borderBottom: '1px solid #f1f5f9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: 700 }}>
                            {param.name}
                          </h4>
                          <span
                            style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}
                          >
                            Đơn vị: {param.unit}
                          </span>
                          <span
                            style={{
                              background: '#f8fafc',
                              color: '#475569',
                              border: '1px solid #e2e8f0',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            🔁 Đo lặp: {param.repeat_count} lần
                          </span>
                          <span
                            style={{
                              background: '#f8fafc',
                              color: '#475569',
                              border: '1px solid #e2e8f0',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                              fontFamily: 'monospace',
                            }}
                          >
                            ƒ(x): {param.calculation_method}
                          </span>
                        </div>

                        {isDraft && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => {
                                if (isAddingPointHere) {
                                  setActiveParamForPoint(null);
                                } else {
                                  setActiveParamForPoint(param.id);
                                  setPointNominal('');
                                  setPointTolerance('');
                                  setPointUncertainty('');
                                }
                              }}
                              type="button"
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                color: isAddingPointHere ? '#475569' : '#2563eb',
                                background: isAddingPointHere ? '#f1f5f9' : '#eff6ff',
                                border: `1px solid ${isAddingPointHere ? '#cbd5e1' : '#bfdbfe'}`,
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              {isAddingPointHere ? '✕ Đóng form' : '+ Thêm điểm đo danh định'}
                            </button>
                            <button
                              onClick={() => handleDeleteParameter(param.id, param.name)}
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
                              }}
                              title="Xóa thông số đo này"
                            >
                              ✕ Xóa thông số
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Test Points Table */}
                      <div style={{ padding: '14px 18px' }}>
                        <div style={{ overflowX: 'auto' }}>
                          <table
                            style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              fontSize: '0.84rem',
                              textAlign: 'left',
                            }}
                          >
                            <thead>
                              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                                <th style={{ padding: '8px 10px', fontWeight: 600, width: 70 }}>Điểm #</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600 }}>
                                  Giá trị danh định (Nominal)
                                </th>
                                <th style={{ padding: '8px 10px', fontWeight: 600 }}>
                                  Dung sai cho phép (± Tolerance)
                                </th>
                                <th style={{ padding: '8px 10px', fontWeight: 600 }}>
                                  Độ KĐB tối đa (≤ Max Uncertainty)
                                </th>
                                {isDraft && (
                                  <th style={{ padding: '8px 10px', fontWeight: 600, width: 60, textAlign: 'center' }}>
                                    Xóa
                                  </th>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {testPoints.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={isDraft ? 5 : 4}
                                    style={{
                                      textAlign: 'center',
                                      color: '#94a3b8',
                                      padding: '24px 10px',
                                      background: '#fafbfc',
                                      borderRadius: 6,
                                    }}
                                  >
                                    Chưa có điểm đo danh định nào cho thông số này.{' '}
                                    {isDraft && 'Bấm "+ Thêm điểm đo danh định" ở trên để bổ sung.'}
                                  </td>
                                </tr>
                              ) : (
                                testPoints.map((tp) => (
                                  <tr
                                    key={tp.id}
                                    style={{
                                      borderBottom: '1px solid #f1f5f9',
                                      transition: 'background 0.1s ease',
                                    }}
                                  >
                                    <td style={{ padding: '10px', fontWeight: 700, color: '#2563eb' }}>
                                      #{tp.point_no}
                                    </td>
                                    <td style={{ padding: '10px', fontWeight: 600, color: '#0f172a' }}>
                                      {tp.nominal_value} <span style={{ color: '#64748b', fontWeight: 400 }}>{param.unit}</span>
                                    </td>
                                    <td style={{ padding: '10px', color: '#334155' }}>
                                      {tp.tolerance !== null ? (
                                        <span>
                                          ± {tp.tolerance} <span style={{ color: '#64748b' }}>{param.unit}</span>
                                        </span>
                                      ) : (
                                        <span style={{ color: '#94a3b8' }}>— (Theo dõi số liệu)</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '10px', color: '#334155' }}>
                                      {tp.max_uncertainty !== null ? (
                                        <span>
                                          ≤ {tp.max_uncertainty} <span style={{ color: '#64748b' }}>{param.unit}</span>
                                        </span>
                                      ) : (
                                        <span style={{ color: '#94a3b8' }}>—</span>
                                      )}
                                    </td>
                                    {isDraft && (
                                      <td style={{ padding: '10px', textAlign: 'center' }}>
                                        <button
                                          onClick={() => handleDeleteTestPoint(tp.id, tp.point_no)}
                                          type="button"
                                          style={{
                                            background: '#fef2f2',
                                            border: '1px solid #fecaca',
                                            color: '#dc2626',
                                            borderRadius: 4,
                                            padding: '2px 8px',
                                            cursor: 'pointer',
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                          }}
                                          title="Xóa điểm đo"
                                        >
                                          ✕
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Inline Form Add Test Point */}
                        {isDraft && isAddingPointHere && (
                          <form
                            onSubmit={(e) => handleAddTestPoint(e, param.id)}
                            style={{
                              marginTop: 14,
                              padding: 14,
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: 8,
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) auto',
                              gap: 12,
                              alignItems: 'end',
                            }}
                          >
                            <div>
                              <label
                                style={{
                                  display: 'block',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  color: '#1e40af',
                                  marginBottom: 4,
                                }}
                              >
                                Giá trị danh định ({param.unit}) *
                              </label>
                              <input
                                required
                                type="number"
                                step="any"
                                value={pointNominal}
                                onChange={(e) => setPointNominal(e.target.value)}
                                placeholder="VD: 10.0"
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #93c5fd',
                                  fontSize: '0.84rem',
                                  boxSizing: 'border-box',
                                  background: '#fff',
                                }}
                              />
                            </div>

                            <div>
                              <label
                                style={{
                                  display: 'block',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  color: '#1e40af',
                                  marginBottom: 4,
                                }}
                              >
                                Dung sai cho phép (± {param.unit})
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={pointTolerance}
                                onChange={(e) => setPointTolerance(e.target.value)}
                                placeholder="VD: 0.05"
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #93c5fd',
                                  fontSize: '0.84rem',
                                  boxSizing: 'border-box',
                                  background: '#fff',
                                }}
                              />
                            </div>

                            <div>
                              <label
                                style={{
                                  display: 'block',
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  color: '#1e40af',
                                  marginBottom: 4,
                                }}
                              >
                                Độ KĐB tối đa (≤ {param.unit})
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={pointUncertainty}
                                onChange={(e) => setPointUncertainty(e.target.value)}
                                placeholder="VD: 0.02"
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: 6,
                                  border: '1px solid #93c5fd',
                                  fontSize: '0.84rem',
                                  boxSizing: 'border-box',
                                  background: '#fff',
                                }}
                              />
                            </div>

                            <div>
                              <button
                                disabled={addingPoint || pointNominal === ''}
                                type="submit"
                                style={{
                                  padding: '8px 16px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: '#2563eb',
                                  color: '#fff',
                                  fontWeight: 600,
                                  fontSize: '0.84rem',
                                  cursor: addingPoint || pointNominal === '' ? 'not-allowed' : 'pointer',
                                  height: 38,
                                }}
                              >
                                {addingPoint ? 'Đang lưu...' : '+ Lưu điểm đo'}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Form thêm thông số mới (Draft Only) */}
            {isDraft && (
              <form
                onSubmit={handleAddParameter}
                style={{
                  background: '#ffffff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 12,
                  boxShadow: '0 2px 6px rgba(37,99,235,0.06)',
                  padding: 20,
                  display: 'grid',
                  gap: 16,
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
                      Thêm thông số đo lường mới (Procedure Parameter)
                    </h4>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Thiết lập tên thông số, đơn vị, số lần đo lặp và phương thức tính toán kết quả theo ISO/IEC 17025.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#334155',
                        marginBottom: 6,
                      }}
                    >
                      Tên thông số đo lường *
                    </label>
                    <input
                      required
                      placeholder="VD: Điện áp DC, Sai số chỉ thị, Độ lặp lại..."
                      value={paramName}
                      onChange={(e) => setParamName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#334155',
                        marginBottom: 6,
                      }}
                    >
                      Đơn vị đo (unit) *
                    </label>
                    <input
                      required
                      placeholder="VD: V, mV, °C, kg, mm, %..."
                      value={paramUnit}
                      onChange={(e) => setParamUnit(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#334155',
                        marginBottom: 6,
                      }}
                    >
                      Số lần đo lặp (repeat_count) *
                    </label>
                    <input
                      required
                      type="number"
                      min={1}
                      max={20}
                      value={paramRepeat}
                      onChange={(e) => setParamRepeat(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.88rem',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: 6,
                    }}
                  >
                    Công thức / Phương thức tính toán kết quả (FR-A8 whitelist)
                  </label>
                  <select
                    value={paramMethod}
                    onChange={(e) => setParamMethod(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.88rem',
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                  >
                    {CALCULATION_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <button
                    disabled={addingParam || !paramName.trim()}
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: addingParam || !paramName.trim() ? 'not-allowed' : 'pointer',
                      opacity: addingParam || !paramName.trim() ? 0.6 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 1px 3px rgba(37,99,235,0.2)',
                    }}
                  >
                    {addingParam ? 'Đang thêm...' : '+ Thêm thông số vào quy trình'}
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
                onClick={() => navigate(`/internal/head-of-tech/procedures/${id}/steps`)}
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
                ← Quay lại Bước 2: Bước thao tác
              </button>

              <button
                onClick={() => navigate(`/internal/head-of-tech/procedures/${id}/preview`)}
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
                Tiếp tục sang Bước 4: Xem trước & Ban hành →
              </button>
            </footer>
          </div>
        )}
      </div>
    </ReviewerPageShell>
  );
}

export default ProcedureParametersPage;
