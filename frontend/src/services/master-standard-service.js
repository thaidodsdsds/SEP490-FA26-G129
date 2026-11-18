import apiClient from './api-client.js';

export const getMasterStandardsApi = async (params = {}) => {
  const response = await apiClient.get('/master-standards', { params });
  return response.data?.data ?? [];
};

export const getMasterStandardByIdApi = async (id) => {
  const response = await apiClient.get(`/master-standards/${id}`);
  return response.data?.data;
};

export const createMasterStandardApi = async (payload) => {
  const response = await apiClient.post('/master-standards', payload);
  return response.data?.data;
};

export const updateMasterStandardApi = async (id, payload) => {
  const response = await apiClient.put(`/master-standards/${id}`, payload);
  return response.data?.data;
};
