import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOutboundApi, getWarehouseDevicesApi } from '../../services/warehouse-service.js';

function WarehouseOutboundPage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showHandoverPreview, setShowHandoverPreview] = useState(false);

  const [formData, setFormData] = useState({
    device_id: '',
    service_request_item_id: '',
    recipient_name: 'Nguyễn Văn Đại diện',
    recipient_phone: '0908123456',
    recipient_id_card: '001095012345',
    destination: 'Khách hàng nhận trực tiếp tại quầy kho',
    cert_status: 'Đã dán tem hiệu chuẩn & bàn giao Giấy chứng nhận gốc',
    outbound_condition: 'Thiết bị hoạt động tốt, vệ sinh sạch sẽ, đầy đủ phụ kiện bàn giao ban đầu.',
    photo_url: '',
    notes: '',
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
      setFeedback({ type: 'error', message: 'Vui lòng chọn thiết bị xuất kho bàn giao.' });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const conditionSummary = `[Xuất kho bàn giao] Người nhận: ${formData.recipient_name} (SĐT: ${formData.recipient_phone}, CCCD: ${formData.recipient_id_card}). Tình trạng: ${formData.outbound_condition}. Chứng chỉ: ${formData.cert_status}. Hình thức: ${formData.destination}. ${formData.notes ? `Ghi chú: ${formData.notes}` : ''}`.trim();

      await createOutboundApi({
        device_id: Number(formData.device_id),
        service_request_item_id: formData.service_request_item_id ? Number(formData.service_request_item_id) : null,
        condition_note: conditionSummary,
        photo_url: formData.photo_url.trim() || null,
      });

      setFeedback({
        type: 'success',
        message: `Đã lập phiếu xuất kho và hoàn tất biên bản bàn giao thiết bị ${selectedDevice?.name || ''} (S/N: ${selectedDevice?.serial_number || ''}).`,
      });

      setShowHandoverPreview(true);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi tạo phiếu xuất kho.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
            Lập phiếu xuất kho & Biên bản bàn giao (Outbound)
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Bàn giao thiết bị sau hiệu chuẩn kèm Giấy chứng nhận và Tem hiệu chuẩn theo ISO/IEC 17025.
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

      {showHandoverPreview ? (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #cbd5e1', padding: 32, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: 16, marginBottom: 24 }}>
            <h2 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
            <p style={{ margin: '4px 0 16px', fontStyle: 'italic' }}>Độc lập – Tự do – Hạnh phúc</p>
            <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#1e3a8a' }}>BIÊN BẢN BÀN GIAO THIẾT BỊ VÀ KẾT QUẢ HIỆU CHUẨN</h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#64748b' }}>Hệ thống Quản lý Hiệu chuẩn ISOCAL - Chuẩn ISO/IEC 17025:2017</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24, fontSize: '0.95rem' }}>
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '1rem', color: '#1e293b' }}>BÊN GIAO (ISOCAL LAB):</h3>
              <p style={{ margin: '4px 0' }}><strong>Đơn vị:</strong> Trung tâm Đo lường & Hiệu chuẩn ISOCAL</p>
              <p style={{ margin: '4px 0' }}><strong>Địa chỉ:</strong> Khu Công nghệ cao, TP. Hà Nội</p>
              <p style={{ margin: '4px 0' }}><strong>Đại diện bàn giao:</strong> Thủ kho ISOCAL</p>
            </div>
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '1rem', color: '#1e293b' }}>BÊN NHẬN (KHÁCH HÀNG):</h3>
              <p style={{ margin: '4px 0' }}><strong>Đơn vị:</strong> {selectedDevice?.customer?.company_name || 'Khách hàng'}</p>
              <p style={{ margin: '4px 0' }}><strong>Họ tên người nhận:</strong> {formData.recipient_name}</p>
              <p style={{ margin: '4px 0' }}><strong>SĐT liên hệ:</strong> {formData.recipient_phone} | <strong>Số CCCD:</strong> {formData.recipient_id_card}</p>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                <th style={{ padding: 10 }}>STT</th>
                <th style={{ padding: 10 }}>Tên thiết bị & Model</th>
                <th style={{ padding: 10 }}>Số Serial (S/N)</th>
                <th style={{ padding: 10 }}>Tình trạng ngoại quan bàn giao</th>
                <th style={{ padding: 10 }}>Chứng nhận kèm theo</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: 10 }}>1</td>
                <td style={{ padding: 10 }}><strong>{selectedDevice?.name}</strong> ({selectedDevice?.model || 'Tiêu chuẩn'})</td>
                <td style={{ padding: 10 }}><code>{selectedDevice?.serial_number}</code></td>
                <td style={{ padding: 10 }}>{formData.outbound_condition}</td>
                <td style={{ padding: 10 }}>{formData.cert_status}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 40, textAlign: 'center' }}>
            <div>
              <strong>ĐẠI DIỆN BÊN NHẬN</strong>
              <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#64748b', margin: '4px 0 60px' }}>(Ký và ghi rõ họ tên)</p>
              <p><strong>{formData.recipient_name}</strong></p>
            </div>
            <div>
              <strong>ĐẠI DIỆN BÊN GIAO (THỦ KHO)</strong>
              <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: '#64748b', margin: '4px 0 60px' }}>(Ký và ghi rõ họ tên)</p>
              <p><strong>Nhân viên kho vận ISOCAL</strong></p>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32, borderTop: '1px solid #cbd5e1', paddingTop: 20 }}>
            <button
              onClick={() => setShowHandoverPreview(false)}
              style={{ padding: '10px 20px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
            >
              Lập phiếu khác
            </button>
            <button
              onClick={handlePrint}
              style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              🖨️ In Biên bản bàn giao (Print / PDF)
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
            1. Chọn thiết bị xuất kho hoàn trả
          </h3>

          {loading ? (
            <p style={{ color: '#64748b' }}>Đang tải danh mục thiết bị...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
                  Thiết bị cần bàn giao <span style={{ color: 'red' }}>*</span>
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

          <h3 style={{ margin: '24px 0 16px', fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
            2. Thông tin người nhận bàn giao (Khách hàng / Đơn vị giao nhận)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
                Họ và tên người nhận <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                name="recipient_name"
                value={formData.recipient_name}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
                Số điện thoại liên hệ <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                name="recipient_phone"
                value={formData.recipient_phone}
                onChange={handleChange}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
                Số CCCD / CMND người nhận
              </label>
              <input
                name="recipient_id_card"
                value={formData.recipient_id_card}
                onChange={handleChange}
                placeholder="001095012345"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          <h3 style={{ margin: '24px 0 16px', fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
            3. Kiểm tra tình trạng tem, chứng nhận & Ngoại quan khi xuất kho
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
                Tình trạng Giấy chứng nhận & Tem
              </label>
              <select
                name="cert_status"
                value={formData.cert_status}
                onChange={handleChange}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
              >
                <option value="Đã dán tem hiệu chuẩn & bàn giao Giấy chứng nhận gốc">
                  Đã dán tem hiệu chuẩn & bàn giao Giấy chứng nhận gốc
                </option>
                <option value="Chỉ dán tem hiệu chuẩn (chứng nhận điện tử gửi qua email/portal)">
                  Chỉ dán tem hiệu chuẩn (chứng nhận gửi qua portal)
                </option>
                <option value="Không dán tem (Thiết bị không đạt - kèm Báo cáo kiểm định không đạt)">
                  Thiết bị không đạt (Kèm phiếu báo không đạt)
                </option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
                Hình thức giao nhận
              </label>
              <input
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                placeholder="Khách nhận tại quầy hoặc Đơn vị CPN (Viettel Post, GHTK...)"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>
              Tình trạng thiết bị khi bàn giao
            </label>
            <textarea
              name="outbound_condition"
              value={formData.outbound_condition}
              onChange={handleChange}
              rows={2}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.95rem', fontFamily: 'inherit' }}
            />
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
              style={{ padding: '10px 24px', borderRadius: 6, border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
            >
              {submitting ? 'Đang tạo phiếu...' : '✓ Xác nhận xuất kho & Xem biên bản bàn giao'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default WarehouseOutboundPage;
