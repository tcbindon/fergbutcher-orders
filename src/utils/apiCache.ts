// src/utils/apiCache.ts
// Stale-while-revalidate cache for API responses.
// Hydrates from localStorage instantly, then fetches fresh data in the background.

const PREFIX = 'fergbutcher_cache_';

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { data: T; ts: number };
    return entry.data;
  } catch {
    return null;
  }
}

export function setCached<T>(key: string, data: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // localStorage full or unavailable — skip caching
  }
}

export async function staleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  onStale: (data: T) => void,
  onFresh: (data: T) => void
): Promise<void> {
  const cached = getCached<T>(key);
  if (cached) onStale(cached);

  try {
    const fresh = await fetcher();
    setCached(key, fresh);
    onFresh(fresh);
  } catch (err) {
    if (!cached) throw err;
    // If we have cached data, swallow the fetch error — UI stays responsive
    console.warn(`[apiCache] Background fetch failed for ${key}, using stale data`, err);
  }
}
