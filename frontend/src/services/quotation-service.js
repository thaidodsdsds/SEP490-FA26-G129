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

/**
 * Lấy chi tiết báo giá theo quotationId
 */
export const getQuotationDetailApi = async (quotationId) => {
  const response = await apiClient.get(`/quotations/${quotationId}`);
  return response.data?.data;
};

/**
 * Khách hàng chấp thuận báo giá
 */
export const approveQuotationApi = async (quotationId) => {
  const response = await apiClient.patch(`/quotations/${quotationId}/approve`);
  return response.data?.data;
};

/**
 * Khách hàng từ chối báo giá kèm lý do
 */
export const rejectQuotationApi = async (quotationId, reason) => {
  const response = await apiClient.patch(`/quotations/${quotationId}/reject`, { reason });
  return response.data?.data;
};

/**
 * Lấy danh sách báo giá
 */
export const listQuotationsApi = async () => {
  const response = await apiClient.get('/quotations');
  return response.data?.data ?? [];
};

export { extractApiErrorMessage };

