import apiClient from '../../services/api-client.js';

export const createCustomer = async (customer) => {
  const response = await apiClient.post('/customers', customer);
  return response.data.data;
};
