import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  createProcedureApi,
  getProcedureDetailApi,
  getServiceTypesApi,
  updateProcedureApi,
} from '../../../../services/procedure-service.js';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';

function ProcedureHeaderPage() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [serviceTypes, setServiceTypes] = useState([]);
  const [formData, setFormData] = useState({
    service_type_id: '',
    version: 'V1.0',
    temp_range: '20 – 26 °C',
    humidity_range: '30 – 70 %RH',
    other_env: '',
    required_equipment: '',
    effective_from: '',
  });
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    getServiceTypesApi().then((data) => setServiceTypes(Array.isArray(data) ? data : []));

    if (isEditing) {
      getProcedureDetailApi(id)
        .then((proc) => {
          if (proc.status !== 'Draft') {
            setError(`Quy trình đang ở trạng thái "${proc.status}". Chỉ quy trình Draft mới được phép chỉnh sửa.`);
          }
          setFormData({
            service_type_id: proc.service_type_id,
            version: proc.version,
            temp_range: proc.environment_requirement?.temperature || '20 – 26 °C',
            humidity_range: proc.environment_requirement?.humidity || '30 – 70 %RH',
            other_env: proc.environment_requirement?.notes || '',
            required_equipment: proc.required_equipment?.description || '',
            effective_from: proc.effective_from || '',
          });
        })
        .catch(() => setError('Không thể tải thông tin quy trình.'))
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.service_type_id) {
      setError('Vui lòng chọn loại dịch vụ.');
      return;
    }
    if (!formData.version.trim()) {
      setError('Vui lòng nhập phiên bản quy trình (VD: V1.0).');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      service_type_id: Number(formData.service_type_id),
      version: formData.version.trim(),
      environment_requirement: {
        temperature: formData.temp_range,
        humidity: formData.humidity_range,
        notes: formData.other_env,
      },
      required_equipment: {
        description: formData.required_equipment,
      },
      effective_from: formData.effective_from || null,
    };

    try {
      if (isEditing) {
        await updateProcedureApi(id, payload);
        setFeedback('Đã cập nhật thông tin chung quy trình.');
        navigate(`/internal/head-of-tech/procedures/${id}/steps`);
      } else {
        const created = await createProcedureApi(payload);
        navigate(`/internal/head-of-tech/procedures/${created.id}/steps`);
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Có lỗi khi lưu quy trình.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ReviewerPageShell
      description="Bước 1: Thiết lập loại dịch vụ, phiên bản, yêu cầu môi trường và thiết bị đối chứng chuẩn."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      title={isEditing ? `Chỉnh sửa thông tin chung quy trình #${id}` : 'Thêm mới phiên bản quy trình kỹ thuật'}
    >
      <section className="reviewer-card" style={{ maxWidth: 780, margin: '0 auto' }}>
        {/* Navigation Step Breadcrumbs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #e3edf2', paddingBottom: 12 }}>
          <span style={{ fontWeight: 700, color: '#1f6e8c' }}>1. Thông tin chung</span>
          {isEditing && (
            <>
              <span>→</span>
              <Link to={`/internal/head-of-tech/procedures/${id}/steps`}>2. Bước quy trình</Link>
              <span>→</span>
              <Link to={`/internal/head-of-tech/procedures/${id}/parameters`}>3. Thông số & Điểm đo</Link>
              <span>→</span>
              <Link to={`/internal/head-of-tech/procedures/${id}/preview`}>4. Xem trước & Phát hành</Link>
            </>
          )}
        </div>

        {error && <div className="reviewer-feedback error" style={{ marginBottom: 14 }}>{error}</div>}

        {loading ? (
          <p>Đang tải thông tin quy trình...</p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <label className="field-block">
              <span>Loại dịch vụ áp dụng (ServiceType) <strong style={{ color: 'red' }}>*</strong></span>
              <select
                disabled={isEditing}
                required
                value={formData.service_type_id}
                onChange={(e) => setFormData({ ...formData, service_type_id: e.target.value })}
              >
                <option value="">-- Chọn loại dịch vụ --</option>
                {serviceTypes.map((st) => (
                  <option key={st.id} value={st.id}>
                    [{st.standard_code}] {st.name} ({st.kind})
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label className="field-block">
                <span>Phiên bản quy trình <strong style={{ color: 'red' }}>*</strong></span>
                <input
                  required
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="VD: V1.0"
                />
              </label>

              <label className="field-block">
                <span>Ngày hiệu lực dự kiến</span>
                <input
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                />
              </label>
            </div>

            <fieldset style={{ border: '1px solid #dce5eb', borderRadius: 8, padding: 14 }}>
              <legend style={{ fontWeight: 700, color: '#334e68' }}>Yêu cầu môi trường thao tác (ISO/IEC 17025)</legend>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                <label className="field-block">
                  <span>Khoảng nhiệt độ (°C)</span>
                  <input
                    value={formData.temp_range}
                    onChange={(e) => setFormData({ ...formData, temp_range: e.target.value })}
                    placeholder="VD: 20 – 26 °C"
                  />
                </label>
                <label className="field-block">
                  <span>Khoảng độ ẩm (%RH)</span>
                  <input
                    value={formData.humidity_range}
                    onChange={(e) => setFormData({ ...formData, humidity_range: e.target.value })}
                    placeholder="VD: 30 – 70 %RH"
                  />
                </label>
              </div>
              <label className="field-block" style={{ marginTop: 10 }}>
                <span>Điều kiện môi trường khác</span>
                <input
                  value={formData.other_env}
                  onChange={(e) => setFormData({ ...formData, other_env: e.target.value })}
                  placeholder="VD: Mặt đặt cân bằng thủy bình, tránh rung lắc và luồng gió trực tiếp..."
                />
              </label>
            </fieldset>

            <label className="field-block">
              <span>Chuẩn đối chứng & Thiết bị phụ trợ yêu cầu</span>
              <textarea
                rows={3}
                value={formData.required_equipment}
                onChange={(e) => setFormData({ ...formData, required_equipment: e.target.value })}
                placeholder="VD: Calibrator Fluke 5522A, que đo cao tần, dây đo cách điện..."
              />
            </label>

            <footer style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
              <button
                className="button button-secondary"
                onClick={() => navigate('/internal/head-of-tech/procedures')}
                type="button"
              >
                ← Quay lại danh sách
              </button>
              <button className="button button-primary" disabled={saving} type="submit">
                {saving ? 'Đang lưu...' : 'Lưu & Tiếp tục sang Bước đo (Step) →'}
              </button>
            </footer>
          </form>
        )}
      </section>
    </ReviewerPageShell>
  );
}

export default ProcedureHeaderPage;
