/**
 * Server side render and route handler errors of Next: sent to the API, which
 * logs them and forwards them to the error tracker (same place as the API's
 * own errors). Best effort, never throws.
 */
export async function onRequestError(error: unknown, request: { path: string }) {
  try {
    const err = error as Error & { digest?: string };
    const base = (process.env.BACKEND_API_URL ?? 'http://127.0.0.1:5000/api').replace(/\/+$/, '');
    await fetch(`${base}/public/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'server',
        message: String(err?.message ?? error).slice(0, 500),
        stack: err?.stack?.slice(0, 4000),
        path: request.path.split('?')[0],
        digest: err?.digest,
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // The page error itself is already handled by Next.
  }
}
