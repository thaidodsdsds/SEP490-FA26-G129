import apiClient from './api-client.js';

export const getMyChatThreadsApi = async () => {
  const response = await apiClient.get('/chat/threads');
  return response.data?.data ?? [];
};

export const getChatThreadDetailApi = async (threadId) => {
  const response = await apiClient.get(`/chat/threads/${threadId}`);
  return response.data?.data;
};

export const createChatThreadApi = async (payload) => {
  const response = await apiClient.post('/chat/threads', payload);
  return response.data?.data;
};

export const sendChatMessageApi = async (threadId, content) => {
  const response = await apiClient.post(`/chat/threads/${threadId}/messages`, { content });
  return response.data?.data;
};
