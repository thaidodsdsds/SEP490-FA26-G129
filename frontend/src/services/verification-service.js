import apiClient from './api-client.js';

/**
 * Tra cứu công khai tem theo seal_code (không cần đăng nhập).
 * @param {string} sealCode
 */
export const verifySealApi = async (sealCode) => {
  const code = String(sealCode ?? '').trim();
  const response = await apiClient.get(`/verify/${encodeURIComponent(code)}`);
  return response.data?.data;
};

/**
 * Danh sách lượt tra cứu cho màn hình nội bộ (Admin, Reviewer).
 * @param {{ q?: string, page?: number, limit?: number }} params
 */
export const getVerificationLogsApi = async (params = {}) => {
  const response = await apiClient.get('/seals/verification-logs', { params });
  return (
    response.data?.data ?? {
      items: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
    }
  );
};
