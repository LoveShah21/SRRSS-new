import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('srrss_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('srrss_token');
      localStorage.removeItem('srrss_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ─── Jobs ────────────────────────────────────────────
export const jobsAPI = {
  list: (params) => api.get('/jobs', { params }),
  get: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
};

// ─── Applications ────────────────────────────────────
export const applicationsAPI = {
  apply: (data) => api.post('/applications', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  myApplications: () => api.get('/applications/my'),
  forJob: (jobId) => api.get(`/applications/job/${jobId}`),
  get: (id) => api.get(`/applications/${id}`),
  updateStatus: (id, data) => api.patch(`/applications/${id}/status`, data),
  rank: (jobId) => api.post(`/applications/rank/${jobId}`),
};

// ─── Resume ──────────────────────────────────────────
export const resumeAPI = {
  parse: (formData) => api.post('/resume/parse', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  score: (data) => api.post('/resume/score', data),
  bias: (data) => api.post('/resume/bias', data),
};

// ─── Admin ───────────────────────────────────────────
export const adminAPI = {
  dashboard: () => api.get('/admin/dashboard'),
  users: (params) => api.get('/admin/users', { params }),
  updateRole: (id, data) => api.patch(`/admin/users/${id}/role`, data),
  activityLog: () => api.get('/admin/activity-log'),
};

export default api;
