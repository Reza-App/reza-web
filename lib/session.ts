/**
 * Session cookie helpers shared by the route handlers and `proxy.ts`
 * (edge safe: no Node only API).
 */
export const SESSION_COOKIE = 'selia_session';
/** Set when the user ticked « Se souvenir de moi » (keeps the choice on salon switch). */
export const REMEMBER_COOKIE = 'selia_remember';

/** Fallback lifetime when the token carries no `exp` claim. */
const DEFAULT_MAX_AGE_S = 60 * 60 * 24 * 7;

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

/**
 * Reads the `exp` claim of a JWT WITHOUT verifying it. Only used to size the
 * cookie and to skip obviously expired sessions; the backend stays the only
 * authority on whether a token is valid.
 */
export function readTokenExpiry(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(decodeBase64Url(parts[1])) as { exp?: unknown };
    return typeof claims.exp === 'number' ? claims.exp : null;
  } catch {
    return null;
  }
}

/**
 * Reads the `role` claim WITHOUT verifying it: only used to route a signed in
 * user to the right area (platform or salon). Every API call is still checked
 * by the backend.
 */
export function readTokenRole(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const claims = JSON.parse(decodeBase64Url(parts[1])) as { role?: unknown };
    return typeof claims.role === 'string' ? claims.role : null;
  } catch {
    return null;
  }
}

/** Unverified claims of a JWT (routing and display only, never authorization). */
export function readTokenClaims(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const claims: unknown = JSON.parse(decodeBase64Url(parts[1]));
    return claims && typeof claims === 'object' ? (claims as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Public client site (separate app): discovery, booking and client accounts. */
export const CLIENT_SITE_URL = (process.env.NEXT_PUBLIC_CLIENT_URL ?? 'http://localhost:3100').replace(/\/+$/, '');

/** Platform administrators work in /plateforme, salons in /dashboard. */
export const PLATFORM_HOME = '/plateforme';
export const SALON_HOME = '/dashboard/rendez-vous';

export function homeForRole(role: string | null | undefined): string {
  return role === 'SUPER_ADMIN' ? PLATFORM_HOME : SALON_HOME;
}

export function isTokenUsable(token: string | undefined, nowMs = Date.now()): boolean {
  if (!token) return false;
  const exp = readTokenExpiry(token);
  if (exp === null) return token.split('.').length === 3;
  return exp * 1000 > nowMs;
}

export function sessionMaxAge(token: string, nowMs = Date.now()): number {
  const exp = readTokenExpiry(token);
  if (exp === null) return DEFAULT_MAX_AGE_S;
  return Math.max(0, Math.floor(exp - nowMs / 1000));
}

/**
 * Persistent cookie (lifetime of the token) when the user asked to be
 * remembered, otherwise a browser session cookie, gone when it closes.
 */
export function sessionCookieOptions(token: string, persistent = true) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    ...(persistent ? { maxAge: sessionMaxAge(token) } : {}),
  };
}

/** Renew the token when less than this remains (sliding session). */
export const REFRESH_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

export function shouldRefresh(token: string, nowMs = Date.now()): boolean {
  const exp = readTokenExpiry(token);
  return exp !== null && exp * 1000 - nowMs < REFRESH_WINDOW_MS && exp * 1000 > nowMs;
}
