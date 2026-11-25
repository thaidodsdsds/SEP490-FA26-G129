import apiClient from './api-client.js';

export const getWarehouseTransactionsApi = async (params = {}) => {
  const response = await apiClient.get('/warehouse/transactions', { params });
  return response.data?.data ?? [];
};

export const getWarehouseDevicesApi = async () => {
  const response = await apiClient.get('/warehouse/devices');
  return response.data?.data ?? [];
};

export const createInboundApi = async (payload) => {
  const response = await apiClient.post('/warehouse/inbound', payload);
  return response.data?.data;
};

export const createOutboundApi = async (payload) => {
  const response = await apiClient.post('/warehouse/outbound', payload);
  return response.data?.data;
};

export const getWarehouseInventorySummaryApi = async () => {
  const response = await apiClient.get('/warehouse/inventory');
  return response.data?.data;
};
