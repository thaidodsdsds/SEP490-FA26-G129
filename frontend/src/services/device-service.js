import apiClient from './api-client.js';

/**
 * Lấy danh sách thiết bị có phân trang và bộ lọc:
 * - customer_id: Lọc theo khách hàng (dành cho nhân viên nội bộ)
 * - is_group2: true | false (Nhóm 2 bắt buộc kiểm định)
 * - due_status: 'all' | 'expired' | 'expiring_soon' | 'valid'
 * - status: 'Active' | 'ExpiringSoon' | 'Expired' | 'InRepair'
 * - search: Tìm theo tên, model, serial, mã nội bộ
 * - page, limit
 */
export const fetchDevicesApi = async ({
  customerId = '',
  isGroup2 = '',
  dueStatus = '',
  status = '',
  search = '',
  page = 1,
  limit = 10,
} = {}) => {
  const params = {
    page,
    limit,
  };

  if (customerId) params.customer_id = customerId;
  if (isGroup2 === 'true' || isGroup2 === true) params.is_group2 = 'true';
  if (isGroup2 === 'false' || isGroup2 === false) params.is_group2 = 'false';
  if (dueStatus && dueStatus !== 'all') params.due_status = dueStatus;
  if (status && status !== 'all') params.status = status;
  if (search?.trim()) params.search = search.trim();

  const response = await apiClient.get('/devices', { params });
  return response.data?.data ?? { items: [], total: 0, page: 1, limit: 10, totalPages: 1 };
};

/**
 * Lấy chi tiết toàn diện của một thiết bị:
 * Thông số kỹ thuật, khách hàng sở hữu, Lịch sử Seal, Lịch sử hiệu chuẩn, Kết quả đo, Chứng chỉ
 */
export const fetchDeviceDetailApi = async (deviceId) => {
  const response = await apiClient.get(`/devices/${deviceId}`);
  return response.data?.data;
};

/**
 * Thêm mới thiết bị:
 * Tự sinh internal_code khi thiếu serial_number hoặc internal_code
 */
export const createDeviceApi = async (payload) => {
  const response = await apiClient.post('/devices', payload);
  return response.data?.data;
};

/**
 * Cập nhật thông tin thiết bị:
 * - Customer: sửa thông tin nhận dạng cơ bản. Đổi serial sẽ có cảnh báo xác minh.
 * - Sales: không được chỉnh sửa (API sẽ chặn với 403).
 */
export const updateDeviceApi = async (deviceId, payload) => {
  const response = await apiClient.put(`/devices/${deviceId}`, payload);
  return response.data?.data;
};

