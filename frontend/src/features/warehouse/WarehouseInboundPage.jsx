import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createInboundApi, getWarehouseDevicesApi } from '../../services/warehouse-service.js';

function WarehouseInboundPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [formData, setFormData] = useState({
    device_id: '',
    service_request_item_id: '',
    condition_status: 'Nguyên vẹn',
    accessories: 'Đầy đủ dây nguồn & tài liệu',
    visual_inspection: 'Mặt kính màn hình không trầy xước, thân máy nguyên seal, ốc vít không dấu cạy mở.',
    storage_bin: 'Kệ A-02 (Khu vực chờ kiểm định In-lab)',
    photo_url: '',
    receiver_notes: '',
  });

  useEffect(() => {
    const loadDevices = async () => {
      try {
        setLoading(true);
        const data = await getWarehouseDevicesApi();
        setDevices(data);
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, device_id: String(data[0].id) }));
        }
      } catch (err) {
        setFeedback({ type: 'error', message: 'Không thể tải danh sách thiết bị lưu trữ.' });
      } finally {
        setLoading(false);
      }
    };
    loadDevices();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectedDevice = devices.find((d) => String(d.id) === String(formData.device_id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.device_id) {
      setFeedback({ type: 'error', message: 'Vui lòng chọn thiết bị tiếp nhận vào kho.' });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const conditionSummary = `[${formData.condition_status}] ${formData.visual_inspection}. Phụ kiện: ${formData.accessories}. Vị trí lưu kho: ${formData.storage_bin}. ${formData.receiver_notes ? `Ghi chú thêm: ${formData.receiver_notes}` : ''}`.trim();

      await createInboundApi({
        device_id: Number(formData.device_id),
        service_request_item_id: formData.service_request_item_id ? Number(formData.service_request_item_id) : null,
        condition_note: conditionSummary,
        photo_url: formData.photo_url.trim() || null,
      });

      setFeedback({
        type: 'success',
        message: `Đã lập phiếu nhập kho thành công cho thiết bị ${selectedDevice?.name || ''} (S/N: ${selectedDevice?.serial_number || ''}).`,
      });

      // Reset form
      setFormData((prev) => ({
        ...prev,
        receiver_notes: '',
        photo_url: '',
      }));
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tạo phiếu nhập kho.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <button
            onClick={() => navigate('/internal/warehouse/transactions')}
            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, fontSize: '0.9rem', marginBottom: 6 }}
          >
            &larr; Xem lịch sử giao dịch kho
          </button>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>
            Lập phiếu nhập kho thiết bị (Inbound)
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Quy trình tiếp nhận thiết bị từ khách hàng gửi đo In-lab, kiểm tra tình trạng ngoại quan ban đầu và niêm phong theo ISO/IEC 17025.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 8,
            marginBottom: 20,
            background: feedback.type === 'error' ? '#fee2e2' : '#dcfce7',
            color: feedback.type === 'error' ? '#991b1b' : '#166534',
            border: `1px solid ${feedback.type === 'error' ? '#ef4444' : '#22c55e'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: 'inherit' }}
          >
            &times;
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
          1. Thông tin thiết bị & Khách hàng
        </h3>

        {loading ? (
          <p style={{ color: '#64748b' }}>Đang tải danh mục thiết bị...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
                Chọn thiết bị nhận kho <span style={{ color: 'red' }}>*</span>
              </label>
              <select
                name="device_id"
                value={formData.device_id}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
              >
                {devices.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.name} (S/N: {dev.serial_number}) - {dev.customer?.company_name || 'Khách vãng lai'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
                Mã dòng yêu cầu (Service Request Item ID - Tùy chọn)
              </label>
              <input
                type="number"
                name="service_request_item_id"
                value={formData.service_request_item_id}
                onChange={handleChange}
                placeholder="Ví dụ: 101"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
              />
            </div>
          </div>
        )}

        {selectedDevice && (
          <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: 8, marginBottom: 24, border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div><strong>Thiết bị:</strong> {selectedDevice.name}</div>
              <div><strong>Model / Hãng:</strong> {selectedDevice.model || 'N/A'} - {selectedDevice.manufacturer || 'N/A'}</div>
              <div><strong>Serial No:</strong> {selectedDevice.serial_number}</div>
              <div><strong>Chủ sở hữu:</strong> {selectedDevice.customer?.company_name || 'Khách hàng'}</div>
            </div>
          </div>
        )}

        <h3 style={{ margin: '24px 0 16px', fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
          2. Biên bản kiểm tra ngoại quan & Tiếp nhận (ISO/IEC 17025 Điều 7.4)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
              Tình trạng ngoại quan tổng thể
            </label>
            <select
              name="condition_status"
              value={formData.condition_status}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
            >
              <option value="Nguyên vẹn">Nguyên vẹn (Bình thường, sẵn sàng hiệu chuẩn)</option>
              <option value="Trầy xước nhẹ vỏ ngoài">Trầy xước nhẹ vỏ ngoài (Không ảnh hưởng đo)</option>
              <option value="Nứt vỡ / Thiếu ốc / Biến dạng">Nứt vỡ / Biến dạng cơ học (Cần xác nhận khách)</option>
              <option value="Mất nguồn / Lỗi hiển thị">Mất nguồn / Lỗi hiển thị (Lập biên bản bất thường)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
              Vị trí lưu kho / Kệ gán tạm thời
            </label>
            <input
              name="storage_bin"
              value={formData.storage_bin}
              onChange={handleChange}
              placeholder="Ví dụ: Kệ A-01, Ngăn 3"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
            Phụ kiện bàn giao đi kèm
          </label>
          <input
            name="accessories"
            value={formData.accessories}
            onChange={handleChange}
            placeholder="Dây nguồn, que đo, cáp giao tiếp, vali chuyên dụng, adaptor..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
            Chi tiết ngoại quan & ghi chú bất thường
          </label>
          <textarea
            name="visual_inspection"
            value={formData.visual_inspection}
            onChange={handleChange}
            rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.95rem', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
            Đường dẫn ảnh chụp tiếp nhận thực tế (Photo URL - Tùy chọn)
          </label>
          <input
            name="photo_url"
            value={formData.photo_url}
            onChange={handleChange}
            placeholder="https://storage.isocal.vn/inbound/photos/2026/dev-1234.jpg"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
          />
          <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: 4 }}>
            Ảnh chụp ngoại quan máy và phụ kiện làm bằng chứng kiểm tra ban đầu chống tranh chấp sau khi trả hàng.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 20 }}>
          <button
            type="button"
            onClick={() => navigate('/internal/warehouse/transactions')}
            style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: 500 }}
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            {submitting ? 'Đang tạo phiếu...' : '✓ Xác nhận nhập kho & In nhãn mã vạch'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default WarehouseInboundPage;
