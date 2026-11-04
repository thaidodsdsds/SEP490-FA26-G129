import apiClient from './api-client.js';

/**
 * Lấy thông tin hồ sơ người dùng đang đăng nhập kèm thông tin công ty (customer)
 */
export const getMyProfileApi = async () => {
  const response = await apiClient.get('/profile');
  return response.data?.data ?? null;
};

/**
 * Tạo hoặc cập nhật thông tin doanh nghiệp liên kết với tài khoản khách hàng hiện tại
 */
export const upsertMyCompanyApi = async (payload) => {
  const response = await apiClient.put('/profile/company', payload);
  return response.data?.data ?? null;
};

/**
 * Lấy danh sách khách hàng (id, company_name)
 */
export const getCustomersApi = async () => {
  const response = await apiClient.get('/customers');
  return response.data?.data ?? [];
};

/**
 * Lấy danh sách thiết bị thuộc về một khách hàng
 */
export const getCustomerDevicesApi = async (customerId) => {
  const response = await apiClient.get(`/customers/${customerId}/devices`);
  return response.data?.data ?? [];
};

/**
 * Thêm thiết bị mới vào danh mục của khách hàng
 */
export const createCustomerDeviceApi = async (customerId, payload) => {
  const response = await apiClient.post(`/customers/${customerId}/devices`, payload);
  return response.data?.data;
};

/**
 * Lấy danh sách tất cả loại dịch vụ kèm trạng thái kiểm tra quy trình & Active
 */
export const getServiceTypesApi = async () => {
  const response = await apiClient.get('/service-types');
  return response.data?.data ?? [];
};

/**
 * Tạo mới phiếu yêu cầu dịch vụ (Service Request)
 */
export const createServiceRequestApi = async (payload) => {
  const response = await apiClient.post('/service-requests', payload);
  return response.data?.data;
};

/**
 * Lấy danh sách phiếu yêu cầu dịch vụ (Service Requests)
 */
export const getServiceRequestsApi = async () => {
  const response = await apiClient.get('/service-requests');
  return response.data?.data ?? [];
};

/**
 * Lấy chi tiết phiếu yêu cầu dịch vụ theo ID
 */
export const getServiceRequestDetailApi = async (id) => {
  const response = await apiClient.get(`/service-requests/${id}`);
  return response.data?.data;
};

/**
 * Cập nhật thông tin phiếu yêu cầu dịch vụ
 */
export const updateServiceRequestApi = async (id, payload) => {
  const response = await apiClient.put(`/service-requests/${id}`, payload);
  return response.data?.data;
};

/**
 * Hủy phiếu yêu cầu dịch vụ
 */
export const cancelServiceRequestApi = async (id, reason) => {
  const response = await apiClient.patch(`/service-requests/${id}/cancel`, { reason });
  return response.data?.data;
};

/**
 * Trích xuất thông báo lỗi dễ đọc từ phản hồi API
 */
export const extractApiErrorMessage = (error, fallbackMessage = 'Đã xảy ra lỗi khi xử lý yêu cầu.') => {
  const serverMessage = error?.response?.data?.error?.message;
  if (typeof serverMessage === 'string' && serverMessage.trim()) {
    return serverMessage;
  }
  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return fallbackMessage;
};

