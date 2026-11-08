import apiClient from './api-client.js';

// ==================== CONSTANTS ====================

export const ALLOWED_FIELDS = [
  'DIEN',
  'KHOILUONG',
  'DODAI',
  'APSUAT',
  'NHIET',
  'HOA',
  'QUANG',
  'DET',
];

export const ALLOWED_KINDS = ['Calibration', 'Verification', 'Repair'];

// ==================== SERVICE TYPES ====================

export const getServiceTypesApi = async (params = {}) => {
  const response = await apiClient.get('/service-types', { params });
  return response.data?.data ?? [];
};

export const getServiceTypeByIdApi = async (id) => {
  const response = await apiClient.get(`/service-types/${id}`);
  return response.data?.data;
};

export const createServiceTypeApi = async (payload) => {
  const response = await apiClient.post('/service-types', payload);
  return response.data?.data;
};

export const updateServiceTypeApi = async (id, payload) => {
  const response = await apiClient.put(`/service-types/${id}`, payload);
  return response.data?.data;
};

// ==================== PROCEDURES ====================

export const getProceduresApi = async (params = {}) => {
  const response = await apiClient.get('/calibration-procedures', { params });
  return response.data?.data ?? [];
};

export const getProcedureDetailApi = async (id) => {
  const response = await apiClient.get(`/calibration-procedures/${id}`);
  return response.data?.data;
};

export const createProcedureApi = async (payload) => {
  const response = await apiClient.post('/calibration-procedures', payload);
  return response.data?.data;
};

export const updateProcedureApi = async (id, payload) => {
  const response = await apiClient.put(`/calibration-procedures/${id}`, payload);
  return response.data?.data;
};

export const publishProcedureApi = async (id) => {
  const response = await apiClient.post(`/calibration-procedures/${id}/publish`);
  return response.data?.data;
};

export const cloneProcedureApi = async (id, nextVersion) => {
  const response = await apiClient.post(`/calibration-procedures/${id}/clone`, {
    next_version: nextVersion,
  });
  return response.data?.data;
};

// ==================== STEPS ====================

export const addProcedureStepApi = async (procId, payload) => {
  const response = await apiClient.post(`/calibration-procedures/${procId}/steps`, payload);
  return response.data?.data;
};

export const updateProcedureStepApi = async (stepId, payload) => {
  const response = await apiClient.put(`/calibration-procedures/steps/${stepId}`, payload);
  return response.data?.data;
};

export const deleteProcedureStepApi = async (stepId) => {
  const response = await apiClient.delete(`/calibration-procedures/steps/${stepId}`);
  return response.data?.data;
};

// ==================== PARAMETERS ====================

export const addProcedureParameterApi = async (procId, payload) => {
  const response = await apiClient.post(`/calibration-procedures/${procId}/parameters`, payload);
  return response.data?.data;
};

export const updateProcedureParameterApi = async (paramId, payload) => {
  const response = await apiClient.put(`/calibration-procedures/parameters/${paramId}`, payload);
  return response.data?.data;
};

export const deleteProcedureParameterApi = async (paramId) => {
  const response = await apiClient.delete(`/calibration-procedures/parameters/${paramId}`);
  return response.data?.data;
};

// ==================== TEST POINTS ====================

export const addProcedureTestPointApi = async (paramId, payload) => {
  const response = await apiClient.post(`/calibration-procedures/parameters/${paramId}/test-points`, payload);
  return response.data?.data;
};

export const updateProcedureTestPointApi = async (pointId, payload) => {
  const response = await apiClient.put(`/calibration-procedures/test-points/${pointId}`, payload);
  return response.data?.data;
};

export const deleteProcedureTestPointApi = async (pointId) => {
  const response = await apiClient.delete(`/calibration-procedures/test-points/${pointId}`);
  return response.data?.data;
};
