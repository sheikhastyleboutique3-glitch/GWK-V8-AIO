import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { enqueue } from './offlineQueue';
import { requestBackgroundSync } from './syncManager';

export interface ApiError { message: string; statusCode: number; path?: string; timestamp?: string; queued?: boolean; }
interface QueueItem { resolve: (token: string) => void; reject: (err: unknown) => void; }

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((item) => error ? item.reject(error) : item.resolve(token!));
  failedQueue = [];
}

export function getToken(): string | null { return localStorage.getItem('token'); }
export function getRefreshToken(): string | null { return localStorage.getItem('refresh_token'); }
export function clearAuth() { localStorage.removeItem('token'); localStorage.removeItem('refresh_token'); localStorage.removeItem('user'); }

function redirectToLogin() { clearAuth(); if (window.location.pathname !== '/login') window.location.replace('/login'); }

const api: AxiosInstance = axios.create({ baseURL: '/api', timeout: 15_000, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

// ── MUTATION METHODS that should be queued when offline ──
const QUEUEABLE_METHODS = ['post', 'patch', 'put', 'delete'];

// ── Paths that should NEVER be queued (auth, reads disguised as POST) ──
const NON_QUEUEABLE_PATHS = ['/auth/', '/upload'];

function isQueueable(config: any): boolean {
  if (!config) return false;
  const method = (config.method || '').toLowerCase();
  if (!QUEUEABLE_METHODS.includes(method)) return false;
  const url = config.url || '';
  if (NON_QUEUEABLE_PATHS.some(p => url.includes(p))) return false;
  return true;
}

function isNetworkError(error: AxiosError): boolean {
  // No response at all = network failure (ERR_NETWORK, timeout, DNS failure)
  return !error.response && !!error.request;
}

api.interceptors.response.use((response) => response, async (error: AxiosError<ApiError>) => {
  const originalRequest = error.config as any;
  if (axios.isCancel(error)) return Promise.reject(error);

  // ── OFFLINE AUTO-QUEUE: intercept network errors on mutations ──────────
  if (isNetworkError(error) && isQueueable(originalRequest)) {
    try {
      const fullUrl = originalRequest.baseURL
        ? `${originalRequest.baseURL}${originalRequest.url}`
        : originalRequest.url || '/api/unknown';
      const body = originalRequest.data ? (typeof originalRequest.data === 'string' ? JSON.parse(originalRequest.data) : originalRequest.data) : undefined;
      const method = (originalRequest.method || 'post').toUpperCase() as any;

      // Build a human-readable description for the queue UI
      const pathParts = (originalRequest.url || '').split('/').filter(Boolean);
      const description = `${method} ${pathParts.slice(0, 3).join('/')}`;

      await enqueue({
        url: fullUrl,
        method,
        body,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': originalRequest.headers?.Authorization || `Bearer ${getToken()}`,
        },
        description,
      });

      // Request Background Sync so the OS replays when connectivity returns
      requestBackgroundSync();

      // Return a synthetic "queued" response so the UI can show a toast
      const queuedError: ApiError = {
        message: 'Request queued for sync (offline)',
        statusCode: 0,
        queued: true,
      };
      return Promise.reject(queuedError);
    } catch (queueError) {
      // If queuing itself fails, fall through to normal error handling
      console.error('[OfflineQueue] Failed to queue request:', queueError);
    }
  }

  // ── REFRESH TOKEN FLOW (unchanged) ────────────────────────────────────
  if (error.response?.status !== 401 || originalRequest._retry) return Promise.reject(normaliseError(error));
  if (originalRequest.url?.includes('/auth/refresh')) { redirectToLogin(); return Promise.reject(normaliseError(error)); }
  originalRequest._retry = true;
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => { failedQueue.push({ resolve, reject }); })
      .then((newToken) => { if (originalRequest.headers) originalRequest.headers['Authorization'] = `Bearer ${newToken}`; return api(originalRequest); })
      .catch((err) => Promise.reject(err));
  }
  isRefreshing = true;
  const refreshToken = getRefreshToken();
  if (!refreshToken) { isRefreshing = false; processQueue(new Error('No refresh token'), null); redirectToLogin(); return Promise.reject(normaliseError(error)); }
  try {
    const { data } = await axios.post<{ success: boolean; data: { access_token: string } }>('/api/auth/refresh', { refresh_token: refreshToken });
    const newToken = data.data.access_token;
    localStorage.setItem('token', newToken);
    if (originalRequest.headers) originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
    processQueue(null, newToken);
    return api(originalRequest);
  } catch (refreshError) { processQueue(refreshError, null); redirectToLogin(); return Promise.reject(refreshError); }
  finally { isRefreshing = false; }
});

function normaliseError(error: AxiosError<ApiError>): ApiError {
  if (error.response?.data) {
    const d = error.response.data;
    return { message: typeof d.message === 'string' ? d.message : Array.isArray(d.message) ? (d.message as string[]).join(', ') : 'An error occurred', statusCode: error.response.status, path: d.path, timestamp: d.timestamp };
  }
  if (error.request) return { message: 'Network error — request queued', statusCode: 0 };
  return { message: error.message ?? 'Unknown error', statusCode: -1 };
}

/**
 * Authenticated CSV download helper.
 * Uses the axios instance (with JWT) instead of window.open(),
 * which would send an unauthenticated browser request and get 401.
 */
export async function downloadCsv(path: string, filename: string): Promise<void> {
  const response = await api.get(path, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default api;
