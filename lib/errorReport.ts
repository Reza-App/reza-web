/**
 * Sends a browser crash to the API, which logs it and forwards it to the error
 * tracker. Best effort: never throws, at most 5 reports per page load, and the
 * same message only once. Only the path is sent (no query string, no data).
 */
const sent = new Set<string>();
let count = 0;

export function reportError(error: unknown, extra: { digest?: string } = {}): void {
  if (typeof window === 'undefined') return;
  const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Erreur inconnue');
  const key = `${err.message}|${window.location.pathname}`;
  if (sent.has(key) || count >= 5) return;
  sent.add(key);
  count++;
  try {
    void fetch('/api/client/api/client-errors', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', 'x-selia-request': '1' },
      body: JSON.stringify({
        source: 'browser',
        message: err.message.slice(0, 500),
        stack: err.stack?.slice(0, 4000),
        path: window.location.pathname,
        digest: extra.digest,
      }),
    }).catch(() => undefined);
  } catch {
    // Reporting must never break the page.
  }
}
