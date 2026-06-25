/**
 * Offline-aware API helper.
 * Wraps mutations (POST/PATCH/DELETE) to queue them in IndexedDB when offline.
 * GET requests fall through to the normal axios instance (SW handles caching).
 */
import api from './api';
import { enqueue } from './offlineQueue';
import { requestBackgroundSync } from './syncManager';
import toast from 'react-hot-toast';

/**
 * Post with offline fallback. If offline, queues the request and returns
 * a synthetic success response so the UI can continue (optimistic).
 */
export async function offlinePost(url: string, body: any, description?: string) {
  if (navigator.onLine) {
    return api.post(url, body);
  }

  // Offline — queue the request
  const token = localStorage.getItem('gwk-token') || '';
  await enqueue({
    url: `/api${url}`,
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    description: description || `POST ${url}`,
  });

  requestBackgroundSync();
  toast('Saved offline — will sync when connected', { icon: '📴' });

  // Return a synthetic response so the caller doesn't error
  return { data: { success: true, data: { id: Date.now(), _offline: true } } };
}

/**
 * Patch with offline fallback.
 */
export async function offlinePatch(url: string, body: any, description?: string) {
  if (navigator.onLine) {
    return api.patch(url, body);
  }

  const token = localStorage.getItem('gwk-token') || '';
  await enqueue({
    url: `/api${url}`,
    method: 'PATCH',
    body,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    description: description || `PATCH ${url}`,
  });

  requestBackgroundSync();
  toast('Saved offline — will sync when connected', { icon: '📴' });
  return { data: { success: true, data: {} } };
}
