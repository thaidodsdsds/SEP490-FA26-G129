import apiClient from './api-client.js';

const toNumericId = (value) => String(value ?? '').replace(/[^0-9]/g, '');

/**
 * Lấy danh sách chứng nhận hiệu chuẩn (phân trang + thống kê trạng thái)
 * @param {Object} params
 * @param {string} [params.status='all'] - 'Draft' | 'Released' | 'all'
 * @param {string} [params.q='']
 * @param {number} [params.page=1]
 * @param {number} [params.limit=50]
 */
export const getCertificatesApi = async (params = {}) => {
  const response = await apiClient.get('/certificates', { params });
  return (
    response.data?.data ?? {
      items: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
      summary: { total: 0, draft: 0, released: 0 },
    }
  );
};

/**
 * Lấy danh sách hồ sơ hiệu chuẩn đã duyệt, đạt và chưa có chứng nhận
 */
export const getEligibleCalibrationRecordsApi = async () => {
  const response = await apiClient.get('/certificates/eligible-records');
  return response.data?.data ?? [];
};

/**
 * Lấy chi tiết chứng nhận: thông tin hồ sơ, kết quả đo, chữ ký số
 * @param {number|string} certificateId
 */
export const getCertificateDetailApi = async (certificateId) => {
  const id = toNumericId(certificateId);
  const response = await apiClient.get(`/certificates/${id}`);
  return response.data?.data;
};

/**
 * Cấp chứng nhận (Draft) từ hồ sơ hiệu chuẩn đã duyệt
 * @param {{ calibration_record_id: number }} payload
 */
export const issueCertificateApi = async (payload) => {
  const response = await apiClient.post('/certificates', payload);
  return response.data?.data;
};

/**
 * Ký phát hành chứng nhận (Draft -> Released) và cập nhật PDF có chữ ký số
 * @param {number|string} certificateId
 */
export const signCertificateApi = async (certificateId) => {
  const id = toNumericId(certificateId);
  const response = await apiClient.post(`/certificates/${id}/sign`, {});
  return response.data?.data;
};

/**
 * Tải file PDF chứng nhận dưới dạng Blob (có kèm JWT)
 * @param {number|string} certificateId
 */
export const getCertificatePdfBlobApi = async (certificateId) => {
  const id = toNumericId(certificateId);
  const response = await apiClient.get(`/certificates/${id}/file`, {
    responseType: 'blob',
    timeout: 60000,
  });
  return response.data;
};

/**
 * Mở PDF chứng nhận trong tab mới (fetch blob để gửi kèm token)
 * @param {number|string} certificateId
 */
export const openCertificatePdfApi = async (certificateId) => {
  const newWindow = typeof window !== 'undefined' ? window.open('', '_blank') : null;
  try {
    const blobData = await getCertificatePdfBlobApi(certificateId);
    const blob = blobData instanceof Blob ? blobData : new Blob([blobData], { type: 'application/pdf' });
    const typedBlob = new Blob([blob], { type: 'application/pdf' });
    const url = URL.createObjectURL(typedBlob);

    if (newWindow) {
      newWindow.location.href = url;
    } else if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener');
    }

    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return url;
  } catch (error) {
    if (newWindow) newWindow.close();
    throw error;
  }
};
