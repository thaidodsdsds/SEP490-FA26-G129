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
