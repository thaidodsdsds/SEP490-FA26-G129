import apiClient from './api-client.js';

/**
 * Lấy hàng chờ soát xét hồ sơ hiệu chuẩn (CalibrationRecord Review Queue)
 * @param {Object} params
 * @param {string} [params.status='Pending'] - 'Pending' | 'Approved' | 'Rejected' | 'all'
 * @param {string} [params.q=''] - Tìm kiếm theo tên thiết bị, khách hàng, KTV, mã hồ sơ...
 */
export const getReviewQueueApi = async (params = {}) => {
  const response = await apiClient.get('/calibration-records/review-queue', {
    params,
  });
  return response.data?.data ?? [];
};

/**
 * Lấy chi tiết hồ sơ đo kiểm và lịch sử soát xét (ReviewLog)
 * @param {number|string} recordId
 */
export const getCalibrationRecordDetailApi = async (recordId) => {
  const id = String(recordId).replace(/^CR-/, '');
  const response = await apiClient.get(`/calibration-records/${id}`);
  return response.data?.data;
};

/**
 * Thực hiện soát xét: Approve hoặc Reject
 * @param {number|string} recordId
 * @param {Object} payload
 * @param {'Approve'|'Reject'} payload.action
 * @param {string} [payload.reject_reason] - Bắt buộc khi Reject
 * @param {string} [payload.comment] - Ghi chú tùy chọn
 */
export const reviewCalibrationRecordApi = async (recordId, payload) => {
  const id = String(recordId).replace(/^CR-/, '');
  const response = await apiClient.post(`/calibration-records/${id}/review`, payload);
  return response.data?.data;
};

