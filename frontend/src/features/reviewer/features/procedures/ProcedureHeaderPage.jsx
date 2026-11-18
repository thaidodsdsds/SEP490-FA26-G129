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
      setError('Vui lòng chọn loại dịch vụ áp dụng.');
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

  const selectedServiceType = serviceTypes.find((s) => String(s.id) === String(formData.service_type_id));

  return (
    <ReviewerPageShell
      description="Bước 1/4: Thiết lập loại dịch vụ, mã phiên bản, ngày hiệu lực và các điều kiện phòng đo tiêu chuẩn theo ISO/IEC 17025."
      feedback={feedback}
      onFeedbackDismiss={() => setFeedback('')}
      title={isEditing ? `Chỉnh sửa quy trình: #${id}` : 'Tạo mới phiên bản Quy trình Kỹ thuật'}
    >
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* Step Progress Tracker */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            padding: '16px 24px',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#2563eb',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              1
            </span>
            <div>
              <strong style={{ fontSize: '0.92rem', color: '#1e293b', display: 'block' }}>Thông tin chung</strong>
              <small style={{ color: '#2563eb', fontSize: '0.78rem', fontWeight: 600 }}>Đang thực hiện</small>
            </div>
          </div>

          <span style={{ color: '#cbd5e1', fontSize: '1.2rem' }}>→</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: isEditing ? 1 : 0.45 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#f1f5f9',
                color: '#64748b',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              2
            </span>
            <div>
              {isEditing ? (
                <Link to={`/internal/head-of-tech/procedures/${id}/steps`} style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.92rem', textDecoration: 'none' }}>
                  Bước thao tác
                </Link>
              ) : (
                <span style={{ fontSize: '0.92rem', color: '#64748b', fontWeight: 600 }}>Bước thao tác</span>
              )}
              <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem' }}>Thao tác & bằng chứng</small>
            </div>
          </div>

          <span style={{ color: '#cbd5e1', fontSize: '1.2rem' }}>→</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: isEditing ? 1 : 0.45 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#f1f5f9',
                color: '#64748b',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              3
            </span>
            <div>
              {isEditing ? (
                <Link to={`/internal/head-of-tech/procedures/${id}/parameters`} style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.92rem', textDecoration: 'none' }}>
                  Thông số & Điểm đo
                </Link>
              ) : (
                <span style={{ fontSize: '0.92rem', color: '#64748b', fontWeight: 600 }}>Thông số & Điểm đo</span>
              )}
              <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem' }}>Dung sai & công thức</small>
            </div>
          </div>

          <span style={{ color: '#cbd5e1', fontSize: '1.2rem' }}>→</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: isEditing ? 1 : 0.45 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#f1f5f9',
                color: '#64748b',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              4
            </span>
            <div>
              {isEditing ? (
                <Link to={`/internal/head-of-tech/procedures/${id}/preview`} style={{ color: '#1e293b', fontWeight: 600, fontSize: '0.92rem', textDecoration: 'none' }}>
                  Xem trước & Ban hành
                </Link>
              ) : (
                <span style={{ fontSize: '0.92rem', color: '#64748b', fontWeight: 600 }}>Xem trước & Ban hành</span>
              )}
              <small style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem' }}>Preview form đo</small>
            </div>
          </div>
        </div>

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
          <div style={{ background: '#fff', borderRadius: 12, padding: '40px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
            Đang tải thông tin quy trình...
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              padding: '28px 32px',
            }}
          >
            {/* Section 1: Dịch vụ & Phiên bản */}
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: 20, marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
                1. Loại hình dịch vụ & Phiên bản quy chuẩn
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>
                Liên kết quy trình kỹ thuật với Danh mục dịch vụ chuẩn ISO/IEC 17025.
              </p>
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              {/* Chọn ServiceType */}
              <div className="admin-field">
                <label className="admin-label">
                  Loại dịch vụ áp dụng (ServiceType) <span className="admin-required">*</span>
                </label>
                <select
                  className="admin-input admin-select"
                  disabled={isEditing}
                  required
                  value={formData.service_type_id}
                  onChange={(e) => setFormData({ ...formData, service_type_id: e.target.value })}
                >
                  <option value="">-- Chọn loại dịch vụ cần xây dựng quy trình --</option>
                  {serviceTypes.map((st) => (
                    <option key={st.id} value={st.id}>
                      [{st.standard_code}] {st.name} — {st.kind} ({st.field})
                    </option>
                  ))}
                </select>
                {selectedServiceType && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '10px 14px',
                      marginTop: 8,
                      fontSize: '0.82rem',
                      color: '#475569',
                      display: 'flex',
                      gap: 20,
                    }}
                  >
                    <span><strong>Mã chuẩn:</strong> {selectedServiceType.standard_code}</span>
                    <span><strong>Loại hình:</strong> {selectedServiceType.kind}</span>
                    <span><strong>Lĩnh vực:</strong> {selectedServiceType.field}</span>
                    {selectedServiceType.measuring_range && (
                      <span><strong>Dải đo:</strong> {selectedServiceType.measuring_range}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Phiên bản & Ngày hiệu lực */}
              <div className="admin-form-row two">
                <div className="admin-field" style={{ flex: 1 }}>
                  <label className="admin-label">
                    Mã phiên bản quy trình (Version Code) <span className="admin-required">*</span>
                  </label>
                  <input
                    className="admin-input"
                    required
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="VD: V1.0, V2.1"
                  />
                  <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                    Mỗi phiên bản gắn liền với một bộ bước đo và thông số kiểm định riêng biệt.
                  </small>
                </div>

                <div className="admin-field" style={{ flex: 1 }}>
                  <label className="admin-label">
                    Ngày có hiệu lực dự kiến
                  </label>
                  <input
                    className="admin-input"
                    type="date"
                    value={formData.effective_from}
                    onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                  />
                  <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                    Ngày bắt đầu áp dụng quy trình vào kiểm định thực tế.
                  </small>
                </div>
              </div>

              {/* Section 2: Yêu cầu môi trường */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '20px 22px',
                  marginTop: 6,
                }}
              >
                <div style={{ marginBottom: 14 }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', color: '#1e293b', fontWeight: 700 }}>
                    2. Yêu cầu môi trường thao tác (ISO/IEC 17025 Điều 6.3)
                  </h4>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>
                    Điều kiện nhiệt độ, độ ẩm nghiêm ngặt bắt buộc kỹ thuật viên ghi nhận trước khi đo.
                  </p>
                </div>

                <div className="admin-form-row two" style={{ marginBottom: 14 }}>
                  <div className="admin-field" style={{ flex: 1 }}>
                    <label className="admin-label">Khoảng nhiệt độ cho phép (°C)</label>
                    <input
                      className="admin-input"
                      value={formData.temp_range}
                      onChange={(e) => setFormData({ ...formData, temp_range: e.target.value })}
                      placeholder="VD: 20 – 26 °C hoặc 23 ± 2 °C"
                    />
                  </div>

                  <div className="admin-field" style={{ flex: 1 }}>
                    <label className="admin-label">Khoảng độ ẩm cho phép (%RH)</label>
                    <input
                      className="admin-input"
                      value={formData.humidity_range}
                      onChange={(e) => setFormData({ ...formData, humidity_range: e.target.value })}
                      placeholder="VD: 30 – 70 %RH"
                    />
                  </div>
                </div>

                <div className="admin-field">
                  <label className="admin-label">Điều kiện phòng đo khác (Ánh sáng, chống rung, áp suất...)</label>
                  <input
                    className="admin-input"
                    value={formData.other_env}
                    onChange={(e) => setFormData({ ...formData, other_env: e.target.value })}
                    placeholder="VD: Mặt đặt cân bằng thủy chuẩn, không khí lưu thông dưới 0.2 m/s, không có từ trường mạnh..."
                  />
                </div>
              </div>

              {/* Section 3: Thiết bị chuẩn & Phụ trợ */}
              <div className="admin-field">
                <label className="admin-label">
                  3. Chuẩn đối chứng & Thiết bị phụ trợ yêu cầu
                </label>
                <textarea
                  className="admin-input"
                  rows={3}
                  style={{ fontFamily: 'inherit', resize: 'vertical' }}
                  value={formData.required_equipment}
                  onChange={(e) => setFormData({ ...formData, required_equipment: e.target.value })}
                  placeholder="VD: Máy chuẩn đa năng Fluke 5522A, que đo cao tần, dây đo bọc chống nhiễu, hộp điện trở chuẩn..."
                />
                <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                  Danh sách trang thiết bị bắt buộc kỹ thuật viên chuẩn bị trước khi tiến hành thực hiện quy trình.
                </small>
              </div>

              {/* Action buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #f1f5f9',
                  paddingTop: 20,
                  marginTop: 10,
                }}
              >
                <button
                  className="button button-secondary"
                  onClick={() => navigate('/internal/head-of-tech/procedures')}
                  type="button"
                >
                  ← Hủy & Quay lại
                </button>

                <button
                  className="button button-primary"
                  disabled={saving}
                  type="submit"
                  style={{ padding: '10px 24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {saving ? 'Đang lưu quy trình...' : 'Lưu & Tiếp tục sang Bước đo (Step 2) →'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </ReviewerPageShell>
  );
}

export default ProcedureHeaderPage;
