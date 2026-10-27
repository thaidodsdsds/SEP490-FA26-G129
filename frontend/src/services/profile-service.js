import apiClient from './api-client.js';

/**
 * Fetch the current user's profile.
 */
export const getProfileApi = async () => {
  const response = await apiClient.get('/profile');
  return response.data.data;
};

/**
 * Update basic profile info (full_name, phone).
 */
export const updateProfileApi = async ({ full_name, phone }) => {
  const response = await apiClient.put('/profile', { full_name, phone });
  return response.data.data;
};

/**
 * Change password — allowed for all authenticated users.
 */
export const changePasswordApi = async ({ current_password, new_password }) => {
  const response = await apiClient.put('/profile/change-password', {
    current_password,
    new_password,
  });
  return response.data.data;
};
