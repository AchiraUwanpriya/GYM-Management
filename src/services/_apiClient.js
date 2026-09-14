// ============================================================
//  services/_apiClient.js
//  Shared Axios instance + form helper used by all service files
// ============================================================
import axios from 'axios';
import { API_BASE_URL } from '../../index';

// ✅ CRITICAL: baseURL is set to production API
// All requests are directed to the production server
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT token from localStorage on every request + handle Content-Type
apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem('dts_gym_user');
  if (raw) {
    try {
      const u = JSON.parse(raw);
      const token = u.token || u.Token || u.accessToken || u.jwtToken;
      if (token)  config.headers['Authorization'] = `Bearer ${token}`;
      if (u.userId) config.headers['X-User-Id']      = u.userId;
    } catch { /* ignore */ }
  }
  
  // Set Content-Type for form data if not already set
  if (config.data && typeof config.data === 'string' && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }
  
  if (config.url?.includes('ParQ')) {
    console.log('[ParQ Request]', config.method.toUpperCase(), config.url, config.data);
  }
  
  return config;
});

// Log responses for ParQ endpoints
apiClient.interceptors.response.use(
  (response) => {
    if (response.config.url?.includes('ParQ')) {
      console.log('[ParQ Response]', response.status, response.data);
    }
    return response;
  },
  (error) => {
    if (error.config?.url?.includes('ParQ')) {
      console.log('[ParQ Error]', error.response?.status, error.response?.data);
    }

    // The backend's SubscriptionGateFilter returns this shape for any Member
    // whose subscription has expired, on every endpoint except the small
    // renew/login/profile whitelist. Broadcast it so any mounted component
    // (MemberDashboard's banner) can react immediately, even if it was
    // triggered from a page other than the dashboard.
    const data = error.response?.data;
    if (error.response?.status === 402 || data?.Result === 'SUBSCRIPTION_EXPIRED') {
      window.dispatchEvent(new CustomEvent('gym:subscription-expired', { detail: data }));
    }

    return Promise.reject(error);
  }
);

/** Convert a plain object to URL-encoded form string */
export const toForm = (obj) => {
  const params = new URLSearchParams();
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v !== null && v !== undefined) params.append(k, v);
  });
  return params.toString();
};