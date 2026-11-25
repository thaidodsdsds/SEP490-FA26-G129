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
export const registerApi = async (payload) => {
  const response = await apiClient.post('/auth/register', payload);
  return response.data.data;
};

/**
 * Request a password reset email.
 */
export const forgotPasswordApi = async (email) => {
  const response = await apiClient.post('/auth/forgot-password', { email });
  return response.data.data;
};

/**
 * Verify a reset token.
 */
export const verifyResetTokenApi = async (token) => {
  const response = await apiClient.get('/auth/verify-reset-token', {
    params: { token },
  });
  return response.data.data;
};

/**
 * Reset password using token and new password.
 */
export const resetPasswordApi = async ({ token, password }) => {
  const response = await apiClient.post('/auth/reset-password', { token, password });
  return response.data.data;
};

/**
 * Verify 2FA OTP code.
 * Returns { token, account } on success.
 */
export const verify2FAApi = async ({ two_factor_token, otp }) => {
  const response = await apiClient.post('/auth/verify-2fa', { two_factor_token, otp });
  return response.data.data;
};

/**
 * Resend 2FA OTP code.
 * Returns { two_factor_token, email_masked, message }
 */
export const resend2FAApi = async ({ two_factor_token }) => {
  const response = await apiClient.post('/auth/resend-2fa', { two_factor_token });
  return response.data.data;
};
