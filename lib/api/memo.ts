/**
 * Short lived in-memory cache for reference data that several components
 * load at the same time (employees, services...). Concurrent callers share
 * one request; mutations call `invalidate` so the next read is fresh.
 */
interface Entry {
  at: number;
  promise: Promise<unknown>;
}

const store = new Map<string, Entry>();

export function memoize<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise as Promise<T>;

  const promise = load().catch((error: unknown) => {
    store.delete(key);
    throw error;
  });
  store.set(key, { at: Date.now(), promise });
  return promise;
}

export function invalidate(prefix = ''): void {
  for (const key of [...store.keys()]) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
