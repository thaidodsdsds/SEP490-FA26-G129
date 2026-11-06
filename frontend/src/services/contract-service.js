import apiClient from './api-client.js';
import { extractApiErrorMessage } from './service-request-service.js';

export const listContractsApi = async () => {
  const response = await apiClient.get('/contracts');
  return response.data?.data ?? [];
};

export const getContractDetailApi = async (contractId) => {
  const response = await apiClient.get(`/contracts/${contractId}`);
  return response.data?.data;
};

export const getNextContractCodeApi = async () => {
  const response = await apiClient.get('/contracts/next-code');
  return response.data?.data?.contract_code;
};

export const getCompanyProfileApi = async () => {
  const response = await apiClient.get('/contracts/company-profile');
  return response.data?.data;
};

export const listAvailableQuotationsApi = async () => {
  const response = await apiClient.get('/contracts/available-quotations');
  return response.data?.data ?? [];
};

export const getContractPrefillApi = async (quotationId) => {
  const response = await apiClient.get(`/contracts/prefill/${quotationId}`);
  return response.data?.data;
};

export const createContractApi = async (payload) => {
  const response = await apiClient.post('/contracts', payload);
  return response.data?.data;
};

export const updateContractApi = async (contractId, payload) => {
  const response = await apiClient.patch(`/contracts/${contractId}`, payload);
  return response.data?.data;
};

export const submitContractApi = async (contractId) => {
  const response = await apiClient.post(`/contracts/${contractId}/submit`);
  return response.data?.data;
};

export const approveContractApi = async (contractId) => {
  const response = await apiClient.post(`/contracts/${contractId}/approve`);
  return response.data?.data;
};

export const cancelContractApi = async (contractId) => {
  const response = await apiClient.post(`/contracts/${contractId}/cancel`);
  return response.data?.data;
};

export const liquidateContractApi = async (contractId) => {
  const response = await apiClient.post(`/contracts/${contractId}/liquidate`);
  return response.data?.data;
};

export { extractApiErrorMessage };
