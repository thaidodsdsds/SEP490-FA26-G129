import apiClient from './api-client.js';

const toNumericId = (value) => String(value ?? '').replace(/[^0-9]/g, '');

const EMPTY_SUMMARY = {
  total: 0,
  active: 0,
  pending_payment: 0,
  expired: 0,
  revoked: 0,
  expiring_soon: 0,
};

/**
 * Lấy danh sách tem hiệu chuẩn (phân trang + thống kê trạng thái)
 * @param {Object} params
 * @param {string} [params.status='all'] - 'Active' | 'ExpiringSoon' | 'Expired' | 'Revoked' | 'PendingPayment' | 'all'
 * @param {string} [params.q='']
 * @param {number} [params.page=1]
 * @param {number} [params.limit=100]
 */
export const getSealsApi = async (params = {}) => {
  const response = await apiClient.get('/seals', { params });
  return (
    response.data?.data ?? {
      items: [],
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 0,
      summary: EMPTY_SUMMARY,
    }
  );
};

/**
 * Danh sách chứng nhận đã phát hành, có chữ ký CertificateRelease và chưa có tem
 */
export const getEligibleCertificatesApi = async () => {
  const response = await apiClient.get('/seals/eligible-certificates');
  return response.data?.data ?? [];
};

/**
 * Lấy chi tiết tem: thiết bị, chứng nhận, lịch sử thu hồi và lượt tra cứu
 * @param {number|string} sealId
 */
export const getSealDetailApi = async (sealId) => {
  const id = toNumericId(sealId);
  const response = await apiClient.get(`/seals/${id}`);
  return response.data?.data;
};

/**
 * Phát hành tem cho chứng nhận đã ký phát hành
 * @param {{ certificate_id: number, due_date?: string }} payload
 */
export const createSealApi = async (payload) => {
  const response = await apiClient.post('/seals', payload);
  return response.data?.data;
};

/**
 * Gửi yêu cầu thu hồi tem. Tem chỉ đổi trạng thái sau khi có quyết định được ký số.
 * @param {number|string} sealId
 * @param {{ reason: string, note?: string }} payload
 */
export const requestSealRevocationApi = async (sealId, payload) => {
  const id = toNumericId(sealId);
  const response = await apiClient.post(`/seals/${id}/revocations`, payload);
  return response.data?.data;
};

/**
 * Ký quyết định thu hồi/từ chối. Người ký phải khác người gửi yêu cầu.
 * @param {number|string} sealId
 * @param {number|string} revocationId
 * @param {{ decision: 'Approved'|'Rejected', decision_note?: string }} payload
 */
export const decideSealRevocationApi = async (sealId, revocationId, payload) => {
  const id = toNumericId(sealId);
  const revocation = toNumericId(revocationId);
  const response = await apiClient.post(
    `/seals/${id}/revocations/${revocation}/decision`,
    payload,
  );
  return response.data?.data;
};

/**
 * Tải ảnh QR của tem dưới dạng Blob (có kèm JWT)
 * @param {number|string} sealId
 */
export const getSealQrBlobApi = async (sealId) => {
  const id = toNumericId(sealId);
  const response = await apiClient.get(`/seals/${id}/qr`, {
    responseType: 'blob',
    timeout: 30000,
  });
  return response.data;
};

/**
 * Tải file PDF tem (sticker) dưới dạng Blob (có kèm JWT)
 * @param {number|string} sealId
 */
export const getSealPdfBlobApi = async (sealId) => {
  const id = toNumericId(sealId);
  const response = await apiClient.get(`/seals/${id}/file`, {
    responseType: 'blob',
    timeout: 60000,
  });
  return response.data;
};

/**
 * Mở file PDF tem trong tab mới (fetch blob để gửi kèm token)
 * @param {number|string} sealId
 */
export const openSealPdfApi = async (sealId) => {
  const newWindow = typeof window !== 'undefined' ? window.open('', '_blank') : null;
  try {
    const blobData = await getSealPdfBlobApi(sealId);
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
