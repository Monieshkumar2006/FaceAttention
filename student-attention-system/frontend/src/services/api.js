import axios from 'axios';

const getBaseUrl = () => {
  const envUrl = import.meta.env?.VITE_API_URL || import.meta.env?.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname || 'localhost';
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      return `${protocol}//${hostname}:8000`;
    }
  }
  return 'http://localhost:8000';
};

export const API_BASE_URL = getBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Response interceptor for clear errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(
        new Error(`Cannot connect to backend at ${API_BASE_URL}. Please ensure the FastAPI backend server is running on port 8000.`)
      );
    }
    const message = error.response?.data?.detail || error.message || 'An unexpected API error occurred';
    return Promise.reject(new Error(message));
  }
);

// Health
export const checkHealth = async () => {
  const res = await apiClient.get('/health');
  return res.data;
};

// Sessions
export const createSession = async (payload) => {
  const res = await apiClient.post('/api/sessions', payload);
  return res.data;
};

export const getSessions = async (params = {}) => {
  const res = await apiClient.get('/api/sessions', { params });
  return res.data;
};

export const getSession = async (sessionId) => {
  const res = await apiClient.get(`/api/sessions/${sessionId}`);
  return res.data;
};

export const startSession = async (sessionId) => {
  const res = await apiClient.post(`/api/sessions/${sessionId}/start`);
  return res.data;
};

export const pauseSession = async (sessionId) => {
  const res = await apiClient.post(`/api/sessions/${sessionId}/pause`);
  return res.data;
};

export const resumeSession = async (sessionId) => {
  const res = await apiClient.post(`/api/sessions/${sessionId}/resume`);
  return res.data;
};

export const completeSession = async (sessionId) => {
  const res = await apiClient.post(`/api/sessions/${sessionId}/complete`);
  return res.data;
};

export const getSessionEvents = async (sessionId, limit = 100) => {
  const res = await apiClient.get(`/api/sessions/${sessionId}/events`, { params: { limit } });
  return res.data;
};

// Analytics
export const getAnalytics = async (sessionId) => {
  const res = await apiClient.get(`/api/analytics/${sessionId}`);
  return res.data;
};

// AI Insights
export const getAIInsights = async (sessionId) => {
  const res = await apiClient.get(`/api/ai/${sessionId}`);
  return res.data;
};

export const generateAIInsights = async (sessionId, regenerate = false) => {
  const res = await apiClient.post(`/api/ai/${sessionId}/generate`, { regenerate });
  return res.data;
};

export const evaluateCustomMetrics = async (payload) => {
  const res = await apiClient.post('/api/ai/evaluate-custom', payload);
  return res.data;
};

export const simulateSession = async (payload) => {
  const res = await apiClient.post('/api/sessions/simulate', payload);
  return res.data;
};

// Reports
export const getReportUrl = (sessionId) => {
  return `${API_BASE_URL}/api/reports/${sessionId}`;
};

// Camera / Vision Status
export const checkCameraStatus = async () => {
  const res = await apiClient.get('/api/camera/status');
  return res.data;
};

// System Settings
export const getSettings = async () => {
  const res = await apiClient.get('/api/settings');
  return res.data;
};

export const updateSettings = async (payload) => {
  const res = await apiClient.patch('/api/settings', payload);
  return res.data;
};

export const resetSettings = async () => {
  const res = await apiClient.post('/api/settings/reset');
  return res.data;
};

export default apiClient;


