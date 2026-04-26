import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  getProfile: () => api.get('/api/auth/profile'),
};

export const testsAPI = {
  getAll: () => api.get('/api/tests'),
  getById: (id) => api.get(`/api/tests/${id}`),
  getQuestions: (id) => api.get(`/api/tests/${id}/questions`),
  getManageQuestions: (id) => api.get(`/api/tests/${id}/questions/manage`),
  create: (data) => api.post('/api/tests', data),
  update: (id, data) => api.put(`/api/tests/${id}`, data),
  delete: (id) => api.delete(`/api/tests/${id}`),
  submit: (id, data) => api.post(`/api/tests/${id}/submit`, data),
  createQuestion: (id, data) => api.post(`/api/tests/${id}/questions`, data),
  updateQuestion: (id, questionId, data) => api.put(`/api/tests/${id}/questions/${questionId}`, data),
  deleteQuestion: (id, questionId) => api.delete(`/api/tests/${id}/questions/${questionId}`),
};

export const resultsAPI = {
  save: (data) => api.post('/api/results', data),
  getMy: () => api.get('/api/results/my'),
  getStats: (testId) => api.get(`/api/results/test/${testId}/stats`),
};

export default api;
