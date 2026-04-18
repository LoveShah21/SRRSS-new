import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Send httpOnly cookies with requests
});

// Response interceptor — handle 401 globally with automatic refresh
let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = () => {
  refreshSubscribers.forEach((cb) => cb());
  refreshSubscribers = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';
    const isAuthBootstrapRequest = [
      '/auth/me',
      '/auth/login',
      '/auth/register',
      '/auth/verify',
      '/auth/resend-verification',
    ].some((path) => requestUrl.includes(path));
    const isPublicPath = ['/', '/login', '/register'].includes(window.location.pathname)
      || window.location.pathname.startsWith('/verify-email/');

    // Public/auth bootstrap requests should not force browser redirect.
    if (error.response?.status === 401 && isAuthBootstrapRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          await axios.post('/api/auth/refresh', {}, {
            timeout: 5000,
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
          });
          onTokenRefreshed();
        } catch {
          if (!isPublicPath) {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise((resolve) => {
        subscribeTokenRefresh(() => {
          resolve(api(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);
// ─── Auth ────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  refresh: (data) => api.post('/auth/refresh', data),
  verifyEmail: () => api.post('/auth/verify-email'),
  verifyToken: (token) => api.get(`/auth/verify/${token}`),
  resendVerification: (data) => api.post('/auth/resend-verification', data),
};

// ─── Jobs ────────────────────────────────────────────
export const jobsAPI = {
  list: (params) => api.get('/jobs', { params }),
  getAll: (params) => api.get('/jobs', { params }),
  get: (id) => api.get(`/jobs/${id}`),
  getById: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
};

// ─── Applications ────────────────────────────────────
export const applicationsAPI = {
  apply: (data) => api.post('/applications', data),
  myApplications: () => api.get('/applications/me'),
  getMyApplications: () => api.get('/applications/me'),
  getById: (id) => api.get(`/applications/${id}`),
  forJob: (jobId, params) => api.get(`/applications/job/${jobId}`, { params }),
  rank: (jobId) => api.post(`/applications/job/${jobId}/rank`),
  reveal: (id) => api.post(`/applications/${id}/reveal`),
  updateStatus: (id, data) => api.patch(`/applications/${id}/status`, data),
  scheduleInterview: (id, data) => api.patch(`/applications/${id}/interview`, data),
};

// ─── Resume / Profile ────────────────────────────────
export const resumeAPI = {
  upload: (formData, config = {}) => api.post('/resume/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...config,
  }),
  download: () => api.get('/resume/download'),
  getProfile: () => api.get('/resume/profile'),
  updateProfile: (data) => api.patch('/resume/profile', data),
};

// ─── Interviews ──────────────────────────────────────
export const interviewsAPI = {
  list: (params) => api.get('/interviews', { params }),
  get: (id) => api.get(`/interviews/${id}`),
  create: (data) => api.post('/interviews', data),
  update: (id, data) => api.patch(`/interviews/${id}`, data),
  cancel: (id) => api.delete(`/interviews/${id}`),
};

// ─── Candidates (Recruiter Filter) ──────────────────
export const candidatesAPI = {
  list: (params) => api.get('/candidates', { params }),
};

// ─── Reports ─────────────────────────────────────────
export const reportsAPI = {
  candidates: (params) => api.get('/reports/candidates', { params }),
  candidateDetail: (id) => api.get(`/reports/candidates/${id}`),
  overview: () => api.get('/reports/overview'),
  downloadCSV: (params) => api.get('/reports/candidates', {
    params: { ...params, format: 'csv' },
    responseType: 'blob',
  }),
};

// ─── Admin ───────────────────────────────────────────
export const adminAPI = {
  analytics: () => api.get('/admin/analytics'),
  dashboard: () => api.get('/reports/overview'),
  getBiMetrics: () => api.get('/reports/bi-metrics'),
  users: (params) => api.get('/admin/users', { params }),
  updateRole: (id, data) => api.patch(`/admin/users/${id}/role`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

// ─── Recruiter Analytics ─────────────────────────────
export const recruiterAPI = {
  analytics: () => api.get('/recruiter/analytics'),
  getSettings: () => api.get('/recruiter/settings'),
  updateSettings: (data) => api.patch('/recruiter/settings', data),
};

// ─── Audit Logs ──────────────────────────────────────
export const auditLogsAPI = {
  list: (params) => api.get('/audit-logs', { params }),
  create: (data) => api.post('/audit-logs', data),
};

export default api;
