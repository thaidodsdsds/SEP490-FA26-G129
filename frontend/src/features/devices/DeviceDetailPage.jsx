import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchDeviceDetailApi } from '../../services/device-service.js';
import DeviceModalForm from './DeviceModalForm.jsx';
import Toast from '../../components/ui/Toast.jsx';
import './devices.css';

export default function DeviceDetailPage({ role = 'customer', basePath = '' }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const isCustomerRole = role?.toLowerCase() === 'customer';
  const isSalesRole = role?.toLowerCase() === 'sales';

  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('specs'); // 'specs', 'seals', 'calibration', 'measurements', 'certificates'
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const loadDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchDeviceDetailApi(id);
      setDevice(data);
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        'Không thể tải thông tin chi tiết thiết bị.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleBack = () => {
    if (basePath) {
      navigate(basePath);
    } else {
      navigate(-1);
    }
  };

  const formatDueDate = (dateStr) => {
    if (!dateStr) return { label: 'Chưa xác định', className: '' };
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 3600 * 24));
    const formatted = date.toLocaleDateString('vi-VN');

    if (diffDays < 0) {
      return { label: `⚠ Quá hạn (${formatted})`, className: 'badge-due-expired' };
    }
    if (diffDays <= 30) {
      return { label: `⚡ Sắp hết hạn (${formatted})`, className: 'badge-due-warning' };
    }
    return { label: `✓ Còn hạn (${formatted})`, className: 'badge-due-valid' };
  };

  if (loading) {
    return (
      <div className="devices-container">
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
          Đang tải thông tin thiết bị...
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="devices-container">
        <div className="device-detail-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔒</div>
          <h2 style={{ color: '#b91c1c', margin: '0 0 10px 0' }}>Không thể truy cập thiết bị</h2>
          <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto 24px auto' }}>
            {error || 'Thiết bị không tồn tại hoặc bạn không có quyền truy cập.'}
          </p>
          <button type="button" className="devices-btn-primary" onClick={handleBack}>
            ← Quay lại danh sách thiết bị
          </button>
        </div>
      </div>
    );
  }

  const dueInfo = formatDueDate(device.next_due_date);

  return (
    <div className="devices-container">
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      {/* Navigation Breadcrumb */}
      <div className="device-detail-nav">
        <button type="button" onClick={handleBack}>
          ← Danh sách thiết bị
        </button>
        <span>/</span>
        <span style={{ color: '#0f172a', fontWeight: 600 }}>{device.internal_code}</span>
      </div>

      {/* Main Detail Header Card */}
      <div className="device-detail-card">
        <div className="device-detail-top">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {device.name}
              </h1>
              <span className="badge-code">{device.internal_code}</span>
              {device.is_group2 && <span className="badge-group2">⚖ Thiết bị Nhóm 2</span>}
            </div>

            <div className="device-detail-badges">
              <span style={{ fontSize: '0.88rem', color: '#64748b' }}>
                {device.manufacturer || 'Hãng chưa cập nhật'} · Model: <strong>{device.model || 'Chưa rõ'}</strong>
              </span>
              <span>·</span>
              <span className={dueInfo.className}>{dueInfo.label}</span>
              <span>·</span>
              <span
                className={`badge-status ${
                  device.status === 'Active'
                    ? 'badge-status-active'
                    : device.status === 'ExpiringSoon'
                      ? 'badge-status-expiring'
                      : device.status === 'Expired'
                        ? 'badge-status-expired'
                        : 'badge-status-repair'
                }`}
              >
                {device.status}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {!isSalesRole ? (
              <button
                type="button"
                className="devices-btn-primary"
                onClick={() => setModalOpen(true)}
              >
                ✎ Chỉnh sửa thông tin
              </button>
            ) : (
              <span
                style={{
                  fontSize: '0.84rem',
                  color: '#64748b',
                  background: '#f1f5f9',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontWeight: 500,
                }}
              >
                👁 Chế độ xem chi tiết (Kinh doanh)
              </span>
            )}
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="device-tabs">
          <button
            type="button"
            className={`device-tab-btn ${activeTab === 'specs' ? 'active' : ''}`}
            onClick={() => setActiveTab('specs')}
          >
            📋 Thông số kỹ thuật
          </button>
          <button
            type="button"
            className={`device-tab-btn ${activeTab === 'seals' ? 'active' : ''}`}
            onClick={() => setActiveTab('seals')}
          >
            🏷 Lịch sử Seal & Tem ({device.seal_history?.length || 0})
          </button>
          <button
            type="button"
            className={`device-tab-btn ${activeTab === 'calibration' ? 'active' : ''}`}
            onClick={() => setActiveTab('calibration')}
          >
            ⏱ Lịch sử Hiệu chuẩn ({device.calibration_history?.length || 0})
          </button>
          <button
            type="button"
            className={`device-tab-btn ${activeTab === 'measurements' ? 'active' : ''}`}
            onClick={() => setActiveTab('measurements')}
          >
            📊 Kết quả đo lường ({device.measurement_results?.length || 0})
          </button>
          <button
            type="button"
            className={`device-tab-btn ${activeTab === 'certificates' ? 'active' : ''}`}
            onClick={() => setActiveTab('certificates')}
          >
            📜 Giấy chứng nhận ({device.certificates?.length || 0})
          </button>
        </div>

        {/* Tab 1: Specifications */}
        {activeTab === 'specs' && (
          <div className="device-tab-content">
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 16px 0', color: '#1e293b' }}>
              Thông tin nhận dạng & Quản lý kỹ thuật
            </h3>
            <div className="specs-grid">
              <div className="specs-item">
                <span className="specs-label">Mã quản lý nội bộ (Internal Code)</span>
                <span className="specs-value" style={{ fontFamily: 'monospace' }}>
                  {device.internal_code}
                </span>
              </div>

              <div className="specs-item">
                <span className="specs-label">Số Serial (Serial Number)</span>
                <span className="specs-value" style={{ fontFamily: 'monospace' }}>
                  {device.serial_number || (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>
                      Chưa có serial (Quản lý qua mã nội bộ)
                    </span>
                  )}
                </span>
              </div>

              <div className="specs-item">
                <span className="specs-label">Tên thiết bị</span>
                <span className="specs-value">{device.name}</span>
              </div>

              <div className="specs-item">
                <span className="specs-label">Model</span>
                <span className="specs-value">{device.model || '—'}</span>
              </div>

              <div className="specs-item">
                <span className="specs-label">Hãng sản xuất</span>
                <span className="specs-value">{device.manufacturer || '—'}</span>
              </div>

              <div className="specs-item">
                <span className="specs-label">Dải đo & Độ chính xác</span>
                <span className="specs-value">{device.measuring_range || '—'}</span>
              </div>

              <div className="specs-item">
                <span className="specs-label">Phân loại Phương tiện đo</span>
                <span className="specs-value">
                  {device.is_group2 ? (
                    <span style={{ color: '#b45309' }}>
                      ⚖ Nhóm 2 (Bắt buộc kiểm định nhà nước / QCVN)
                    </span>
                  ) : (
                    <span>Nhóm 1 (Thiết bị đo lường thông thường)</span>
                  )}
                </span>
              </div>

              <div className="specs-item">
                <span className="specs-label">Hạn hiệu chuẩn kế tiếp</span>
                <span className="specs-value">
                  {device.next_due_date
                    ? new Date(device.next_due_date).toLocaleDateString('vi-VN')
                    : 'Chưa xác định'}
                </span>
              </div>
            </div>

            {/* Owner Customer Card */}
            {device.customer && (
              <div
                style={{
                  marginTop: '24px',
                  padding: '18px 20px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                }}
              >
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#334155' }}>
                  🏢 Doanh nghiệp sở hữu thiết bị
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Tên công ty:</span>{' '}
                    <strong>{device.customer.company_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Mã số thuế:</span>{' '}
                    <strong>{device.customer.tax_code || 'Chưa cập nhật'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Lĩnh vực hoạt động:</span>{' '}
                    <strong>{device.customer.industry || '—'}</strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#64748b' }}>Địa chỉ:</span> {device.customer.address}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Seal History */}
        {activeTab === 'seals' && (
          <div className="device-tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', margin: '0 0 4px 0', color: '#1e293b' }}>
                  Hồ sơ Tem điện tử & Lịch sử dán Seal
                </h3>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b' }}>
                  Mã Seal QR niêm phong chống giả mạo, liên kết trực tiếp với kết quả đo lường và giấy chứng nhận.
                </p>
              </div>
            </div>

            {device.seal_history && device.seal_history.length > 0 ? (
              <table className="device-subtable">
                <thead>
                  <tr>
                    <th>Mã Seal</th>
                    <th>Seal Code QR</th>
                    <th>Ngày dán</th>
                    <th>Hạn hiệu lực</th>
                    <th>Chứng chỉ kèm theo</th>
                    <th>Người dán tem</th>
                    <th>Trạng thái tem</th>
                  </tr>
                </thead>
                <tbody>
                  {device.seal_history.map((seal, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{seal.id}</td>
                      <td>
                        <span className="badge-code">{seal.code}</span>
                      </td>
                      <td>{seal.calibrated_at}</td>
                      <td>
                        <strong style={{ color: seal.status === 'Expired' ? '#dc2626' : '#16a34a' }}>
                          {seal.due_date}
                        </strong>
                      </td>
                      <td>
                        <span style={{ color: '#2563eb', fontWeight: 500 }}>{seal.certificate_no}</span>
                      </td>
                      <td>{seal.sealed_by}</td>
                      <td>
                        <span
                          className={`badge-status ${
                            seal.status === 'Active'
                              ? 'badge-status-active'
                              : seal.status === 'Expired'
                                ? 'badge-status-expired'
                                : 'badge-status-repair'
                          }`}
                        >
                          {seal.status === 'Active' ? 'Đang hiệu lực' : seal.status === 'Expired' ? 'Hết hạn' : 'Đã thu hồi'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>Chưa có thông tin tem cho thiết bị này.</p>
            )}
          </div>
        )}

        {/* Tab 3: Calibration History */}
        {activeTab === 'calibration' && (
          <div className="device-tab-content">
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 4px 0', color: '#1e293b' }}>
              Lịch sử các đợt Hiệu chuẩn & Kiểm định
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#64748b' }}>
              Theo dõi toàn bộ các chu kỳ hiệu chuẩn, quy trình áp dụng và kỹ thuật viên phụ trách.
            </p>

            {device.calibration_history && device.calibration_history.length > 0 ? (
              <table className="device-subtable">
                <thead>
                  <tr>
                    <th>Mã đợt / Đơn</th>
                    <th>Dịch vụ thực hiện</th>
                    <th>Tiêu chuẩn áp dụng</th>
                    <th>Ngày yêu cầu</th>
                    <th>Kỹ thuật viên</th>
                    <th>Trạng thái đơn</th>
                    <th>Kết quả tổng thể</th>
                  </tr>
                </thead>
                <tbody>
                  {device.calibration_history.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.request_code}</td>
                      <td>{item.service_name}</td>
                      <td>
                        <span className="badge-code">{item.standard_code}</span>
                      </td>
                      <td>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString('vi-VN')
                          : '—'}
                      </td>
                      <td>{item.technician}</td>
                      <td>
                        <span className="badge-status badge-status-active">{item.status}</span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            color: item.result.includes('Đạt') ? '#16a34a' : '#dc2626',
                          }}
                        >
                          {item.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>Chưa có lịch sử hiệu chuẩn nào.</p>
            )}
          </div>
        )}

        {/* Tab 4: Measurement Results */}
        {activeTab === 'measurements' && (
          <div className="device-tab-content">
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 4px 0', color: '#1e293b' }}>
              Biên bản đo lường & Độ không đảm bảo đo (Measurement Results)
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#64748b' }}>
              Dữ liệu thực nghiệm thu thập từ chuẩn đo lường và thiết bị kiểm tra tại phòng lab.
            </p>

            <table className="device-subtable">
              <thead>
                <tr>
                  <th>Điểm kiểm tra (Test Point)</th>
                  <th>Giá trị chuẩn (Standard Ref)</th>
                  <th>Giá trị đo được (Measured)</th>
                  <th>Độ lệch (Deviation)</th>
                  <th>Độ KĐBĐ mở rộng (Uncertainty)</th>
                  <th>Đánh giá kết quả</th>
                </tr>
              </thead>
              <tbody>
                {device.measurement_results?.map((res, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{res.point}</td>
                    <td>{res.reference_value}</td>
                    <td style={{ fontWeight: 600 }}>{res.measured_value}</td>
                    <td style={{ color: res.deviation.startsWith('-') ? '#2563eb' : '#059669' }}>
                      {res.deviation}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                      {res.expanded_uncertainty}
                    </td>
                    <td>
                      <span className="badge-due-valid">{res.result}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 5: Certificates */}
        {activeTab === 'certificates' && (
          <div className="device-tab-content">
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 4px 0', color: '#1e293b' }}>
              Hồ sơ Giấy chứng nhận Hiệu chuẩn (Certificate)
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#64748b' }}>
              Chứng nhận chính thức được ký số bởi Đại diện lãnh đạo Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng.
            </p>

            {device.certificates?.map((cert, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '20px',
                  background: '#f8fafc',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Số giấy chứng nhận
                    </span>
                    <h4 style={{ margin: 0, fontSize: '1.25rem', color: '#2563eb', fontWeight: 700 }}>
                      {cert.certificate_number}
                    </h4>
                  </div>
                  <span className="badge-status badge-status-active">
                    Trạng thái: {cert.status === 'Released' ? 'Đã phát hành chính thức' : cert.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '0.88rem', marginBottom: '16px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Ngày cấp:</span> <strong>{cert.issue_date}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Hạn hiệu lực:</span>{' '}
                    <strong style={{ color: '#16a34a' }}>{cert.due_date}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Tiêu chuẩn quy trình:</span>{' '}
                    <strong>{cert.standard_procedure}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Người ký duyệt:</span> <strong>{cert.signatory}</strong>
                  </div>
                </div>

                {/* Digital signature block */}
                {cert.digital_signature && (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div style={{ fontSize: '1.5rem', color: '#2563eb' }}>🔏</div>
                    <div style={{ fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 600, color: '#1e40af' }}>
                        Chứng thư số hợp lệ (VNPT-CA / ISOCAL Digital Signature)
                      </div>
                      <div style={{ color: '#64748b', fontFamily: 'monospace' }}>
                        Chữ ký số: {cert.digital_signature.hash} · Ký lúc: {cert.digital_signature.signed_at}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal Form */}
      <DeviceModalForm
        isOpen={modalOpen}
        device={device}
        role={role}
        onClose={() => setModalOpen(false)}
        onSuccess={(updated, msg) => {
          setToast({ show: true, message: msg, type: 'success' });
          loadDetail();
        }}
      />
    </div>
  );
}

