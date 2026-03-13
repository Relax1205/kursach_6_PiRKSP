import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  getProfile: () => api.get('/api/auth/profile'),
};

// Tests API
export const testsAPI = {
  getAll: () => api.get('/api/tests'),
  getById: (id) => api.get(`/api/tests/${id}`),
  getQuestions: (id) => api.get(`/api/tests/${id}/questions`),
  create: (data) => api.post('/api/tests', data),
  update: (id, data) => api.put(`/api/tests/${id}`, data),
  delete: (id) => api.delete(`/api/tests/${id}`),
};

// Results API
export const resultsAPI = {
  save: (data) => api.post('/api/results', data),
  getMy: () => api.get('/api/results/my'),
  getStats: (testId) => api.get(`/api/results/test/${testId}/stats`),
};

export default api;