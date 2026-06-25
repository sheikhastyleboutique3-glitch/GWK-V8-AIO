/**
 * Offline Queue — IndexedDB-based transaction queue for POS offline mode.
 *
 * When the network is down, mutations (create order, add payment, complete)
 * are stored here and replayed automatically when connectivity returns.
 */

const DB_NAME = 'gwk-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pending-requests';

export interface QueuedRequest {
  id?: number; // auto-increment
  url: string;
  method: 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body: any;
  headers: Record<string, string>;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed';
  description: string; // human-readable (e.g., "Complete order ORD-001")
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Add a failed request to the offline queue. */
export async function enqueue(req: Omit<QueuedRequest, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const entry: Omit<QueuedRequest, 'id'> = {
      ...req,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending',
    };
    const request = store.add(entry);
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

/** Get all pending requests in order. */
export async function getPending(): Promise<QueuedRequest[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.getAll('pending');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Get count of pending items. */
export async function getPendingCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.count('pending');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Mark a request as synced (remove from queue). */
export async function remove(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** Mark a request as failed (increment retries). */
export async function markFailed(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const item = getReq.result;
      if (item) {
        item.retries += 1;
        item.status = item.retries >= 5 ? 'failed' : 'pending';
        store.put(item);
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/** Clear all entries (after successful full sync or manual clear). */
export async function clearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
