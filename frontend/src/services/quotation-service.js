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
 * Gửi báo giá bản nháp ('Draft'):
 * - Với Sales: chuyển sang 'PendingApproval' (Trình HeadSales duyệt) kèm ghi chú giải trình (nếu có)
 * - Với HeadSales/Admin: chuyển sang 'Sent' (Gửi khách hàng)
 */
export const sendDraftQuotationApi = async (quotationId, { sales_submission_note } = {}) => {
  const response = await apiClient.patch(`/quotations/${quotationId}/send`, {
    sales_submission_note,
  });
  return response.data?.data;
};

/**
 * Thu hồi báo giá đang ở trạng thái 'PendingApproval' quay về 'Draft'
 */
export const recallQuotationApi = async (quotationId) => {
  const response = await apiClient.patch(`/quotations/${quotationId}/recall`);
  return response.data?.data;
};

/**
 * Trưởng phòng Kinh doanh (HeadSales) phê duyệt ('approve') hoặc yêu cầu chỉnh sửa ('reject') báo giá
 */
export const headSalesReviewQuotationApi = async (quotationId, { decision, note } = {}) => {
  const response = await apiClient.patch(`/quotations/${quotationId}/head-sales-review`, {
    decision,
    note,
  });
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

