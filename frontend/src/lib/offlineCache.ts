/**
 * Offline Data Cache — Persists critical POS data to localStorage so the system
 * works even if the internet drops for an entire shift.
 *
 * Cached entities (refreshed on login + every 5 minutes while online):
 * - Products (menu items with prices, categories, modifiers)
 * - Categories (with icons, station assignments)
 * - Tables (floor plan positions)
 * - Printers (IP addresses for KOT routing)
 * - Branches (for offline branch switching)
 * - Modifier groups (product options)
 *
 * Cache is stored in localStorage (survives browser refresh) and synced to
 * React Query's in-memory cache on boot. If the API call fails (offline),
 * the last cached version is used instead.
 */

import api from './api';

const CACHE_PREFIX = 'gwk_cache_';
const CACHE_TS_KEY = 'gwk_cache_timestamp';

export interface CachedData {
  products: any[];
  categories: any[];
  tables: any[];
  printers: any[];
  branches: any[];
  modifierGroups: any[];
}

/** Save data to localStorage cache with timestamp. */
function saveToCache(key: string, data: any): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
    localStorage.setItem(CACHE_TS_KEY, new Date().toISOString());
  } catch {
    // localStorage full — clear old entries
    clearOldCache();
    try {
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(data));
    } catch { /* give up */ }
  }
}

/** Load data from localStorage cache. */
function loadFromCache(key: string): any | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Get the timestamp of last cache update. */
export function getLastCacheTime(): string | null {
  return localStorage.getItem(CACHE_TS_KEY);
}

/** Get how many minutes ago the cache was last updated. */
export function getCacheAgeMinutes(): number {
  const ts = getLastCacheTime();
  if (!ts) return Infinity;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

/** Clear cache entries older than the threshold. */
function clearOldCache(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
  // Keep only the most recent 6 entries
  if (keys.length > 10) {
    keys.slice(0, keys.length - 6).forEach(k => localStorage.removeItem(k));
  }
}

/**
 * Preload all critical data from the API and cache it locally.
 * Called on login and periodically while online.
 * Returns cached data (even if API fails).
 */
export async function preloadCriticalData(branchId?: number): Promise<CachedData> {
  const results: CachedData = {
    products: loadFromCache('products') || [],
    categories: loadFromCache('categories') || [],
    tables: loadFromCache('tables') || [],
    printers: loadFromCache('printers') || [],
    branches: loadFromCache('branches') || [],
    modifierGroups: loadFromCache('modifierGroups') || [],
  };

  // Only fetch if online
  if (!navigator.onLine) return results;

  const fetchers = [
    {
      key: 'products' as const,
      fn: () => api.get('/products', { params: { sellable: true, available: true, productType: 'MENU' } }).then(r => r.data.data),
    },
    {
      key: 'categories' as const,
      fn: () => api.get('/categories', { params: { posVisible: true } }).then(r => r.data.data),
    },
    {
      key: 'tables' as const,
      fn: () => api.get('/tables', { params: branchId ? { branchId } : {} }).then(r => r.data.data),
    },
    {
      key: 'printers' as const,
      fn: () => api.get('/printers').then(r => r.data.data),
    },
    {
      key: 'branches' as const,
      fn: () => api.get('/branches').then(r => r.data.data),
    },
    {
      key: 'modifierGroups' as const,
      fn: () => api.get('/modifiers/groups').then(r => r.data.data),
    },
  ];

  // Fetch all in parallel — any that fail use cached version
  await Promise.allSettled(
    fetchers.map(async ({ key, fn }) => {
      try {
        const data = await fn();
        if (data && (Array.isArray(data) ? data.length > 0 : true)) {
          results[key] = data;
          saveToCache(key, data);
        }
      } catch {
        // API failed (offline or error) — keep cached version
      }
    })
  );

  return results;
}

/**
 * Get cached products (for offline order taking).
 * Returns the locally cached product list even when offline.
 */
export function getCachedProducts(): any[] {
  return loadFromCache('products') || [];
}

/** Get cached categories. */
export function getCachedCategories(): any[] {
  return loadFromCache('categories') || [];
}

/** Get cached branches (for offline branch switching). */
export function getCachedBranches(): any[] {
  return loadFromCache('branches') || [];
}

/** Get cached tables. */
export function getCachedTables(): any[] {
  return loadFromCache('tables') || [];
}

/** Get cached modifier groups. */
export function getCachedModifierGroups(): any[] {
  return loadFromCache('modifierGroups') || [];
}

/**
 * Local stock tracking — decrements product stock estimate when an offline order is placed.
 * This is an ESTIMATE only (actual stock is on the server). Used to warn cashiers
 * when an item might be out of stock during offline operation.
 */
const STOCK_KEY = 'gwk_local_stock';

export function initLocalStock(inventory: Record<number, number>): void {
  localStorage.setItem(STOCK_KEY, JSON.stringify(inventory));
}

export function getLocalStock(): Record<number, number> {
  try {
    return JSON.parse(localStorage.getItem(STOCK_KEY) || '{}');
  } catch {
    return {};
  }
}

export function decrementLocalStock(productId: number, qty: number): number {
  const stock = getLocalStock();
  const current = stock[productId] ?? Infinity;
  const newVal = current - qty;
  stock[productId] = newVal;
  localStorage.setItem(STOCK_KEY, JSON.stringify(stock));
  return newVal;
}

export function getProductLocalStock(productId: number): number | null {
  const stock = getLocalStock();
  return stock[productId] ?? null;
}

/** Sync local stock from the server inventory (replaces estimates with real values). */
export async function syncLocalStock(branchId: number): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const res = await api.get('/inventory/grouped', { params: { branchId } });
    const data = res.data.data || [];
    const stock: Record<number, number> = {};
    for (const row of data) {
      stock[row.productId] = (stock[row.productId] || 0) + row.quantity;
    }
    initLocalStock(stock);
  } catch { /* offline or error — keep existing estimates */ }
}
