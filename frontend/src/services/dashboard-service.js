import apiClient from './api-client.js';

/**
 * Lấy dữ liệu tổng quan theo vai trò của người đang đăng nhập.
 * Backend trả về đúng cấu trúc từng dashboard nên các trang chỉ cần đọc giá trị.
 */
export const getDashboardOverviewApi = async (role) => {
  const response = await apiClient.get('/dashboard/overview', {
    params: role ? { role } : undefined,
  });
  return response.data?.data ?? {};
};
