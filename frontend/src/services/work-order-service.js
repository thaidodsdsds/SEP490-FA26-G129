import apiClient from './api-client.js';
import { extractApiErrorMessage } from './service-request-service.js';

export const listWorkOrdersApi = async () => {
  const response = await apiClient.get('/work-orders');
  return response.data?.data ?? [];
};

export const getWorkOrderDetailApi = async (workOrderId) => {
  const response = await apiClient.get(`/work-orders/${workOrderId}`);
  return response.data?.data;
};

export const getWorkOrderLookupsApi = async () => {
  const response = await apiClient.get('/work-orders/lookups');
  return response.data?.data;
};

export const updateWorkOrderAssignmentApi = async (workOrderId, assignmentId, payload) => {
  const response = await apiClient.patch(
    `/work-orders/${workOrderId}/assignments/${assignmentId}`,
    payload,
  );
  return response.data?.data;
};

export { extractApiErrorMessage };
