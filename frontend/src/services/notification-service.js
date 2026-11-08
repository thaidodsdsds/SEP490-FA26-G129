import apiClient from './api-client.js';

export const getMyNotificationsApi = async (unreadOnly = false) => {
  const response = await apiClient.get('/notifications', {
    params: { unread_only: unreadOnly },
  });
  return response.data?.data ?? { items: [], unread_count: 0 };
};

export const markNotificationReadApi = async (id) => {
  const response = await apiClient.put(`/notifications/${id}/read`);
  return response.data?.data;
};

export const markAllNotificationsReadApi = async () => {
  const response = await apiClient.put('/notifications/read-all');
  return response.data?.data;
};
