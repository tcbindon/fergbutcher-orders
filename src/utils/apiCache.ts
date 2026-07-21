// Simple localStorage-backed cache for stale-while-revalidate data fetching.
// Hydrates state instantly on app open, then a background fetch updates if newer.

const PREFIX = 'fergbutcher_cache_';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    return entry.data;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // Ignore quota or serialization errors — cache is best-effort
  }
}

export function clearCache(key?: string): void {
  try {
    if (key) {
      localStorage.removeItem(PREFIX + key);
    } else {
      Object.keys(localStorage)
        .filter(k => k.startsWith(PREFIX))
        .forEach(k => localStorage.removeItem(k));
    }
  } catch {
    // Ignore
  }
}
