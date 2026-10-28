import apiClient from './api-client.js';

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

