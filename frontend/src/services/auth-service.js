import apiClient from './api-client.js';

/**
 * Login with email and password.
 * Returns { token, account } on success.
 */
export const loginApi = async (email, password) => {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data.data; // { token, account }
};

/**
 * Register a new customer account.
 * Returns { message, account } on success.
 */
export const registerApi = async (full_name, email, password) => {
  const response = await apiClient.post('/auth/register', { full_name, email, password });
  return response.data.data;
};

/**
 * Request a password reset email.
 */
export const forgotPasswordApi = async (email) => {
  const response = await apiClient.post('/auth/forgot-password', { email });
  return response.data.data;
};
