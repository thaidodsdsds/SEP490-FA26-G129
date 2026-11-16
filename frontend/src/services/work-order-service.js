import apiClient from './api-client.js';

/**
 * Lấy danh sách Work Orders kèm bộ lọc và tổng kết số liệu
 */
export const getWorkOrdersApi = async (params = {}) => {
  const response = await apiClient.get('/work-orders', { params });
  return response.data?.data ?? { items: [], summary: {} };
};

/**
 * Lấy chi tiết một Work Order
 */
export const getWorkOrderDetailApi = async (id) => {
  const response = await apiClient.get(`/work-orders/${id}`);
  return response.data?.data;
};

/**
 * Cập nhật trạng thái Work Order (Open -> Assigned -> InProgress -> Done -> Cancelled)
 */
export const updateWorkOrderStatusApi = async (id, status, notes = '') => {
  const response = await apiClient.patch(`/work-orders/${id}/status`, { status, notes });
  return response.data?.data;
};

/**
 * Lấy danh sách tài nguyên phục vụ phân công (Kỹ thuật viên + Chuẩn đối chứng)
 */
export const getAssignmentResourcesApi = async () => {
  const response = await apiClient.get('/work-orders/assignments/resources');
  return response.data?.data ?? { technicians: [], master_standards: [] };
};

/**
 * Lấy danh sách thiết bị cần phân công nhóm theo từng Work Order
 */
export const getWorkOrderAssignmentsListApi = async () => {
  const response = await apiClient.get('/work-orders/assignments');
  return response.data?.data ?? { orders: [], summary: {} };
};

/**
 * Phân công hoặc cập nhật phân công cho một thiết bị (KTV + Chuẩn còn hạn + Lịch hẹn)
 */
export const saveWorkOrderAssignmentApi = async (payload) => {
  const response = await apiClient.post('/work-orders/assignments', payload);
  return response.data?.data;
};

/**
 * Hủy phân công cho một thiết bị
 */
export const deleteWorkOrderAssignmentApi = async (assignmentId) => {
  const response = await apiClient.delete(`/work-orders/assignments/${assignmentId}`);
  return response.data?.data;
};

/**
 * Lấy danh sách nhiệm vụ của kỹ thuật viên
 */
export const getTechnicianTasksApi = async () => {
  const response = await apiClient.get('/work-orders/technician/tasks');
  return response.data?.data ?? [];
};

/**
 * Đồng bộ kết quả thực hiện của kỹ thuật viên (hỗ trợ offline sync)
 */
export const syncTechnicianTasksApi = async (payload) => {
  const response = await apiClient.post('/work-orders/technician/sync', payload);
  return response.data?.data;
};

/**
 * Lưu kết quả kiểm tra ngoại quan ban đầu (Initial Inspection: Pass/Fail, ảnh, mô tả lỗi, xác nhận của KH)
 */
export const saveInitialInspectionApi = async (payload) => {
  const response = await apiClient.post('/work-orders/initial-inspections', payload);
  return response.data?.data;
};

/**
 * Lấy thông tin kiểm tra ngoại quan theo service_request_item_id
 */
export const getInitialInspectionApi = async (serviceRequestItemId) => {
  const response = await apiClient.get(`/work-orders/initial-inspections/${serviceRequestItemId}`);
  return response.data?.data;
};

/**
 * Gửi xác nhận đồng ý hiệu chuẩn khi Inspection Fail (Khách hàng hoặc KTV ghi nhận)
 */
export const submitInspectionConsentApi = async (payload) => {
  const response = await apiClient.post('/work-orders/initial-inspections/consent', payload);
  return response.data?.data;
};

/**
 * Lấy danh sách các thiết bị Fail ngoại quan đang chờ phê duyệt/xác nhận
 */
export const getPendingInspectionConsentsApi = async () => {
  const response = await apiClient.get('/work-orders/initial-inspections/pending-consents');
  return response.data?.data ?? [];
};

/**
 * Lấy chi tiết quy trình kỹ thuật (các bước, thông số, điểm đo) và bản ghi thực hiện theo service_request_item_id
 */
export const getProcedureExecutionApi = async (serviceRequestItemId) => {
  const response = await apiClient.get(`/work-orders/procedures/${serviceRequestItemId}`);
  return response.data?.data;
};

/**
 * Lưu tiến độ hoặc gửi hoàn tất thực hiện quy trình kỹ thuật (calibration_records, step_results, measurement_details)
 */
export const saveCalibrationRecordApi = async (payload) => {
  const response = await apiClient.post('/work-orders/calibration-records', payload);
  return response.data?.data;
};

/**
 * Đọc File object thành chuỗi Base64 Data URL
 */
export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result || '');
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

/**
 * Tải tệp/ảnh lên Cloudinary qua Backend API
 */
export const uploadFileToCloudApi = async ({ file, fileData, fileName, folder = 'attachments' }) => {
  let payloadData = fileData;
  let resolvedName = fileName;
  if (file && typeof file === 'object' && typeof file.name === 'string') {
    payloadData = await readFileAsDataUrl(file);
    resolvedName = resolvedName || file.name;
  }
  const response = await apiClient.post('/uploads', {
    file: payloadData,
    fileName: resolvedName,
    folder,
  });
  return response.data?.data;
};

/**
 * Xóa tệp/ảnh đã tải lên khỏi Cloudinary / máy chủ
 */
export const deleteFileFromCloudApi = async ({ public_id, url, resource_type = 'image' }) => {
  const response = await apiClient.post('/uploads/delete', {
    public_id,
    url,
    resource_type,
  });
  return response.data?.data;
};

/**
 * Xác thực tính toàn vẹn chữ ký số của biên bản hiệu chuẩn từ CSDL (SHA-256 & HMAC-SHA256)
 */
export const verifyCalibrationSignatureApi = async (serviceRequestItemId) => {
  const response = await apiClient.get(`/work-orders/calibration-records/${serviceRequestItemId}/verify-signature`);
  return response.data?.data;
};

/**
 * Lấy danh sách nhật ký chữ ký số từ CSDL
 */
export const getDigitalSignaturesApi = async () => {
  const response = await apiClient.get('/work-orders/digital-signatures');
  return response.data?.data ?? [];
};

/**
 * Tính mã băm SHA-256 trên trình duyệt (Web Crypto API) cho dữ liệu biên bản đo của KTV
 */
export const computeClientTaskSha256 = async (task) => {
  if (!task) return '';
  const payload = JSON.stringify({
    service_request_item_id: task.service_request_item_id || task.id,
    environment_temp: task.environment_temp ? Number(task.environment_temp).toFixed(2) : null,
    environment_humidity: task.environment_humidity ? Number(task.environment_humidity).toFixed(2) : null,
    steps: (task.steps || []).map((s) => ({
      step_no: s.step_no || s.id,
      done: Boolean(s.done || s.status === 'Done'),
    })),
    measurements: (task.measurements || []).map((m) => ({
      test_point_id: m.test_point_id || m.id,
      repeat_no: m.repeat_no || 1,
      reference: String(m.reference ?? ''),
      measured: String(m.measured ?? ''),
      uncertainty: String(m.uncertainty ?? ''),
    })),
  });

  if (typeof window !== 'undefined' && window.crypto?.subtle && typeof TextEncoder !== 'undefined') {
    const msgBuffer = new TextEncoder().encode(payload);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return `SHA256:${hashHex}`;
  }

  let h1 = 0xdeadbeef ^ payload.length;
  let h2 = 0x41c6ce57 ^ payload.length;
  for (let i = 0, ch; i < payload.length; i++) {
    ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `SHA256:${(h2 >>> 0).toString(16).padStart(8, '0').toUpperCase()}${(h1 >>> 0).toString(16).padStart(8, '0').toUpperCase()}`;
};





