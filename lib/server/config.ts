import 'server-only';

/**
 * Server side configuration. Read once, validated, never sent to the browser
 * (no NEXT_PUBLIC_ prefix on purpose).
 */
function readBackendUrl(): string {
  const raw = process.env.BACKEND_API_URL ?? 'http://127.0.0.1:5000/api';
  const url = new URL(raw);
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:' && url.hostname !== '127.0.0.1') {
    throw new Error('BACKEND_API_URL must use https in production');
  }
  return url.toString().replace(/\/+$/, '');
}

export const serverConfig = {
  backendUrl: readBackendUrl(),
  /** Shared with the backend so it trusts the forwarded client IP (rate limits). */
  bffSecret: process.env.BFF_SHARED_SECRET ?? '',
  backendTimeoutMs: 25_000,
} as const;
