import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  addProcedureParameterApi,
  addProcedureTestPointApi,
  deleteProcedureParameterApi,
  deleteProcedureTestPointApi,
  getProcedureDetailApi,
  updateProcedureParameterApi,
  updateProcedureTestPointApi,
} from '../../../../services/procedure-service.js';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';

const CALCULATION_METHODS = [
  { value: 'mean', label: 'mean (Trung bình cộng các lần đo lặp)' },
  { value: 'stdev', label: 'stdev (Độ lệch chuẩn thực nghiệm)' },
  { value: 'max', label: 'max (Giá trị lớn nhất)' },
  { value: 'min', label: 'min (Giá trị nhỏ nhất)' },
  { value: 'max(readings) - min(readings)', label: 'max - min (Độ biến động / phân bố nhiệt độ)' },
  { value: 'reading - load', label: 'reading - load (Sai số chỉ thị theo tải - Cân/Lực)' },
  { value: 'display_value - mean(readings)', label: 'display - mean (Sai số chỉ thị tủ nhiệt/nhiệt kế)' },
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

  // State thêm điểm đo cho một thông số cụ thể
  const [activeParamForPoint, setActiveParamForPoint] = useState(null);
  const [pointNominal, setPointNominal] = useState('');
  const [pointTolerance, setPointTolerance] = useState('');
  const [pointUncertainty, setPointUncertainty] = useState('');

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

    try {
      await addProcedureParameterApi(id, {
        name: paramName.trim(),
        unit: paramUnit.trim(),
        repeat_count: Number(paramRepeat) || 1,
        calculation_method: paramMethod,
      });
      setParamName('');
      setFeedback('Đã thêm thông số đo lường mới.');
      loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Lỗi khi thêm thông số.');
    }
  };

  const handleDeleteParameter = async (paramId) => {
    if (!window.confirm('Xóa thông số này sẽ xóa toàn bộ các điểm đo thuộc thông số. Bạn có chắc không?')) return;
    try {
      await deleteProcedureParameterApi(paramId);
      setFeedback('Đã xóa thông số đo lường.');
      loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Lỗi khi xóa thông số.');
    }
  };

  const handleAddTestPoint = async (e, paramId) => {
    e.preventDefault();
    if (pointNominal === '') return;

    const param = parameters.find((p) => p.id === paramId);
    const existingPoints = param?.test_points || [];
    const nextPointNo = existingPoints.length > 0 ? Math.max(...existingPoints.map((tp) => tp.point_no)) + 1 : 1;

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
      setFeedback(`Đã thêm điểm đo danh định ${pointNominal} cho thông số.`);
      loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Lỗi khi thêm điểm đo.');
    }
  };

  const handleDeleteTestPoint = async (pointId) => {
    try {
      await deleteProcedureTestPointApi(pointId);
      setFeedback('Đã xóa điểm đo.');
      loadData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Lỗi khi xóa điểm đo.');
    }
  };

  const isDraft = procedure?.status === 'Draft';

  return (
    <ReviewerPageShell
      description="Bước 3: Định nghĩa các thông số đo lường (unit, repeat_count, hàm tính) và các điểm đo danh định (nominal_value, tolerance, max_uncertainty)."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      title={`Cấu hình Thông số & Điểm đo: ${procedure?.service_type?.name || ''} (${procedure?.version || ''})`}
    >
      <section className="reviewer-card" style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Navigation Step Breadcrumbs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #e3edf2', paddingBottom: 12 }}>
          <Link to={`/internal/head-of-tech/procedures/${id}/edit`}>1. Thông tin chung</Link>
          <span>→</span>
          <Link to={`/internal/head-of-tech/procedures/${id}/steps`}>2. Bước quy trình</Link>
          <span>→</span>
          <span style={{ fontWeight: 700, color: '#1f6e8c' }}>3. Thông số & Điểm đo</span>
          <span>→</span>
          <Link to={`/internal/head-of-tech/procedures/${id}/preview`}>4. Xem trước & Phát hành</Link>
        </div>

        {error && <div className="reviewer-feedback error" style={{ marginBottom: 14 }}>{error}</div>}

        {loading ? (
          <p>Đang tải danh sách thông số và điểm đo...</p>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3>Danh sách thông số đo (Procedure Parameters)</h3>
              <span className="demo-pill">{parameters.length} thông số</span>
            </div>

            {/* Danh sách thông số */}
            <div style={{ display: 'grid', gap: 16, marginBottom: 28 }}>
              {parameters.map((param) => (
                <div
                  key={param.id}
                  style={{
                    border: '1px solid #dce5eb',
                    borderRadius: 8,
                    padding: 16,
                    background: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h4 style={{ margin: 0, color: '#1f3a4d', fontSize: '1rem' }}>
                        {param.name} <span style={{ color: '#1f6e8c', fontWeight: 600 }}>({param.unit})</span>
                      </h4>
                      <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#627d98' }}>
                        Lặp: <strong>{param.repeat_count} lần</strong> · Hàm tính: <code>{param.calculation_method}</code>
                      </p>
                    </div>

                    {isDraft && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="button button-secondary"
                          onClick={() => setActiveParamForPoint(activeParamForPoint === param.id ? null : param.id)}
                          style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                          type="button"
                        >
                          + Thêm điểm đo
                        </button>
                        <button
                          className="button button-secondary"
                          onClick={() => handleDeleteParameter(param.id)}
                          style={{ padding: '3px 10px', fontSize: '0.75rem', color: '#c92a2a' }}
                          type="button"
                        >
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bảng các điểm đo của thông số này */}
                  <table className="dash-table" style={{ fontSize: '0.78rem', width: '100%', marginBottom: 10 }}>
                    <thead>
                      <tr>
                        <th>Điểm #</th>
                        <th>Giá trị danh định ({param.unit})</th>
                        <th>Dung sai cho phép (±)</th>
                        <th>Độ không đảm bảo tối đa</th>
                        {isDraft && <th style={{ width: 60 }}>Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(param.test_points || []).map((tp) => (
                        <tr key={tp.id}>
                          <td><strong>#{tp.point_no}</strong></td>
                          <td><strong>{tp.nominal_value}</strong> {param.unit}</td>
                          <td>{tp.tolerance !== null ? `± ${tp.tolerance} ${param.unit}` : '— (Theo dõi)'}</td>
                          <td>{tp.max_uncertainty !== null ? `≤ ${tp.max_uncertainty} ${param.unit}` : '—'}</td>
                          {isDraft && (
                            <td>
                              <button
                                onClick={() => handleDeleteTestPoint(tp.id)}
                                style={{ background: 'none', border: 'none', color: '#c92a2a', cursor: 'pointer' }}
                                title="Xóa điểm đo"
                                type="button"
                              >
                                ×
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {(!param.test_points || param.test_points.length === 0) && (
                        <tr>
                          <td colSpan={isDraft ? 5 : 4} style={{ textAlign: 'center', color: '#8292a0', padding: 12 }}>
                            Chưa có điểm đo danh định nào cho thông số này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Form thêm điểm đo nhanh nếu đang chọn thông số này */}
                  {isDraft && activeParamForPoint === param.id && (
                    <form
                      onSubmit={(e) => handleAddTestPoint(e, param.id)}
                      style={{
                        background: '#f1f7fa',
                        padding: 12,
                        borderRadius: 6,
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr auto',
                        gap: 10,
                        alignItems: 'end',
                        marginTop: 10,
                      }}
                    >
                      <label className="field-block" style={{ margin: 0 }}>
                        <span style={{ fontSize: '0.72rem' }}>Giá trị danh định ({param.unit}) *</span>
                        <input
                          required
                          type="number"
                          step="any"
                          value={pointNominal}
                          onChange={(e) => setPointNominal(e.target.value)}
                          placeholder="VD: 10.0"
                        />
                      </label>
                      <label className="field-block" style={{ margin: 0 }}>
                        <span style={{ fontSize: '0.72rem' }}>Dung sai cho phép (±)</span>
                        <input
                          type="number"
                          step="any"
                          value={pointTolerance}
                          onChange={(e) => setPointTolerance(e.target.value)}
                          placeholder="VD: 0.05"
                        />
                      </label>
                      <label className="field-block" style={{ margin: 0 }}>
                        <span style={{ fontSize: '0.72rem' }}>Độ KĐB tối đa (≤)</span>
                        <input
                          type="number"
                          step="any"
                          value={pointUncertainty}
                          onChange={(e) => setPointUncertainty(e.target.value)}
                          placeholder="VD: 0.02"
                        />
                      </label>
                      <button className="button button-primary" style={{ height: 36 }} type="submit">
                        Lưu điểm
                      </button>
                    </form>
                  )}
                </div>
              ))}

              {parameters.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: '#6a7d8d', background: '#f8fafc', borderRadius: 8 }}>
                  Chưa có thông số đo lường nào. Hãy thêm thông số bên dưới.
                </div>
              )}
            </div>

            {/* Form thêm thông số mới */}
            {isDraft && (
              <form
                onSubmit={handleAddParameter}
                style={{
                  background: '#f8fafc',
                  border: '1px dashed #228be6',
                  borderRadius: 8,
                  padding: 16,
                  display: 'grid',
                  gap: 14,
                }}
              >
                <h4 style={{ margin: 0, color: '#1c7ed6' }}>+ Thêm thông số đo lường mới (Procedure Parameter)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
                  <label className="field-block">
                    <span>Tên thông số đo *</span>
                    <input
                      required
                      placeholder="VD: Điện áp DC, Sai số chỉ thị, Độ lặp lại..."
                      value={paramName}
                      onChange={(e) => setParamName(e.target.value)}
                    />
                  </label>
                  <label className="field-block">
                    <span>Đơn vị đo (unit) *</span>
                    <input
                      required
                      placeholder="VD: V, kg, °C, mm, %..."
                      value={paramUnit}
                      onChange={(e) => setParamUnit(e.target.value)}
                    />
                  </label>
                  <label className="field-block">
                    <span>Số lần đo lặp (repeat_count)</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={paramRepeat}
                      onChange={(e) => setParamRepeat(e.target.value)}
                    />
                  </label>
                </div>

                <label className="field-block">
                  <span>Hàm tính toán kết quả (calculation_method - FR-A8 whitelist)</span>
                  <select
                    value={paramMethod}
                    onChange={(e) => setParamMethod(e.target.value)}
                  >
                    {CALCULATION_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </label>

                <div>
                  <button className="button button-primary" type="submit">
                    + Thêm thông số vào quy trình
                  </button>
                </div>
              </form>
            )}

            <footer style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button
                className="button button-secondary"
                onClick={() => navigate(`/internal/head-of-tech/procedures/${id}/steps`)}
                type="button"
              >
                ← Bước 2: Bước quy trình
              </button>
              <button
                className="button button-primary"
                onClick={() => navigate(`/internal/head-of-tech/procedures/${id}/preview`)}
                type="button"
              >
                Tiếp tục sang Bước 4: Xem trước & Phát hành Active →
              </button>
            </footer>
          </div>
        )}
      </section>
    </ReviewerPageShell>
  );
}

export default ProcedureParametersPage;
