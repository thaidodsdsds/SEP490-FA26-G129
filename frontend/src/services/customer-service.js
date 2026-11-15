import apiClient from './api-client.js';

/**
 * Lấy danh sách chi tiết khách hàng có tìm kiếm, lọc và phân trang
 */
export const listCustomersDetailedApi = async ({ search = '', industry = '', page = 1, limit = 10 } = {}) => {
  const params = {
    detailed: true,
    page,
    limit,
  };
  if (search?.trim()) params.search = search.trim();
  if (industry?.trim()) params.industry = industry.trim();

  const response = await apiClient.get('/customers', { params });
  return response.data?.data ?? { customers: [], total: 0, page: 1, limit: 10, totalPages: 1 };
};

/**
 * Lấy chi tiết toàn diện của một khách hàng:
 * thông tin công ty, accounts, devices, contracts, service_requests
 */
export const getCustomerDetailApi = async (customerId) => {
  const response = await apiClient.get(`/customers/${customerId}`);
  return response.data?.data;
};

/**
 * Tạo mới một khách hàng (kèm tài khoản người liên hệ ban đầu nếu có)
 */
export const createCustomerApi = async (payload) => {
  const response = await apiClient.post('/customers', payload);
  return response.data?.data;
};

/**
 * Cập nhật thông tin khách hàng
 */
export const updateCustomerApi = async (customerId, payload) => {
  const response = await apiClient.put(`/customers/${customerId}`, payload);
  return response.data?.data;
};

/**
 * Thêm tài khoản người dùng cho khách hàng
 */
export const createCustomerAccountApi = async (customerId, payload) => {
  const response = await apiClient.post(`/customers/${customerId}/accounts`, payload);
  return response.data?.data;
};

/**
 * Thêm thiết bị mới cho khách hàng
 */
export const createCustomerDeviceApi = async (customerId, payload) => {
  const response = await apiClient.post(`/customers/${customerId}/devices`, payload);
  return response.data?.data;
};

/**
 * Lấy danh sách thiết bị của khách hàng
 */
export const getCustomerDevicesApi = async (customerId) => {
  const response = await apiClient.get(`/customers/${customerId}/devices`);
  return response.data?.data ?? [];
};

