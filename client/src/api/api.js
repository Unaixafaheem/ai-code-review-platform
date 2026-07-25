import axios from 'axios';

const rawBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
const baseURL = rawBase || '/api';

if (import.meta.env.PROD && (!rawBase || rawBase.startsWith('/'))) {
  console.error(
    '[config] VITE_API_URL must be your Render API URL ending in /api, e.g. https://your-api.onrender.com/api'
  );
}

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    if (status === 405) {
      err.message =
        'API returned 405 — VITE_API_URL is missing or wrong. Set it on Vercel to https://YOUR-RENDER-URL.onrender.com/api and redeploy.';
    } else if (!err.response) {
      err.message =
        err.message ||
        'Cannot reach API. Is the Render backend awake? Free tier may take ~30s on first request.';
    }
    return Promise.reject(err);
  }
);

export default api;
export { baseURL as apiBaseURL };
