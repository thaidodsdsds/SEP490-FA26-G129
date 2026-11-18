import axios from 'axios';

const resolveApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // Use relative '/api/v1' so Vite proxy handles forwarding to backend port 3000
  // on both desktop (localhost:5173) and mobile devices over LAN (192.168.x.x:5173)
  if (typeof window !== 'undefined') {
    return '/api/v1';
  }
  return 'http://localhost:3000/api/v1';
};

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage on every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('isocal_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept responses for auth errors (401 Unauthorized & 403 Forbidden)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.error?.message;
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if (status === 401 && !isLoginRequest) {
      // Clear expired / invalid token
      localStorage.removeItem('isocal_token');

      // Dispatch global session expired event for modal and state management
      window.dispatchEvent(
        new CustomEvent('isocal:session-expired', {
          detail: {
            message: serverMessage || 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ.',
            isExpired: true,
          },
        }),
      );
    } else if (status === 403) {
      window.dispatchEvent(
        new CustomEvent('isocal:access-denied', {
          detail: {
            message: serverMessage || 'Tài khoản không có quyền thực hiện thao tác này.',
          },
        }),
      );
    }

    return Promise.reject(error);
  },
);

export const getHealthStatus = async () => {
  const response = await apiClient.get('/health');
  return response.data;
};

export default apiClient;
