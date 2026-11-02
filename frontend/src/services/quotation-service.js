import apiClient from './api-client.js';
import { extractApiErrorMessage } from './service-request-service.js';

/**
 * Lấy danh sách phiếu yêu cầu dịch vụ (ServiceRequest) kèm thông tin khách hàng và hạng mục
 */
export const getServiceRequestsForQuotationApi = async () => {
  const response = await apiClient.get('/service-requests');
  return response.data?.data ?? [];
};

/**
 * Tạo báo giá mới (status: 'Draft' | 'Sent')
 */
export const createQuotationApi = async (payload) => {
  const response = await apiClient.post('/quotations', payload);
  return response.data?.data;
};

/**
 * Gửi báo giá bản nháp ('Draft') cho khách hàng -> chuyển sang 'Sent'
 */
export const sendDraftQuotationApi = async (quotationId) => {
  const response = await apiClient.patch(`/quotations/${quotationId}/send`);
  return response.data?.data;
};

export { extractApiErrorMessage };

