import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  backendUnavailable,
  callBackend,
  clearSessionCookie,
  clientIpOf,
  isTrustedMutation,
  jsonError,
  readJson,
  setSessionCookie,
} from '@/lib/server/backend';
import { REMEMBER_COOKIE, SESSION_COOKIE, shouldRefresh } from '@/lib/session';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Current session: profile, salons and subscription of the signed in user. */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return jsonError(401, 'Unauthorized', 'Aucune session active.');

  let upstream: Response;
  try {
    upstream = await callBackend({ method: 'GET', path: 'auth/me', token });
  } catch {
    return backendUnavailable();
  }

  const data = await readJson(upstream);
  const response = NextResponse.json(data ?? {}, { status: upstream.status });
  if (upstream.status === 401) {
    clearSessionCookie(response);
    return response;
  }

  // Sliding session: an active user near expiry gets a fresh token.
  if (upstream.ok && shouldRefresh(token)) {
    const renewed = await callBackend({ method: 'POST', path: 'auth/refresh', token })
      .then(readJson)
      .catch(() => null);
    if (renewed && typeof renewed.token === 'string') {
      setSessionCookie(response, renewed.token, request.cookies.get(REMEMBER_COOKIE)?.value === '1');
    }
  }
  return response;
}

/** Sign in: the token is stored in an httpOnly cookie and never returned. */
export async function POST(request: NextRequest) {
  if (!isTrustedMutation(request)) return jsonError(403, 'Forbidden', 'Requête refusée.');

  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown; remember?: unknown } | null;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!EMAIL_RE.test(email) || email.length > 254 || !password || password.length > 256) {
    return jsonError(400, 'Validation error', 'Email ou mot de passe invalide.');
  }

  let upstream: Response;
  try {
    upstream = await callBackend({
      method: 'POST',
      path: 'auth/login',
      body: JSON.stringify({ email, password }),
      contentType: 'application/json',
      clientIp: clientIpOf(request),
    });
  } catch {
    return backendUnavailable();
  }

  const data = await readJson(upstream);
  if (!upstream.ok || !data || typeof data.token !== 'string') {
    return NextResponse.json(data ?? { error: 'Login failed' }, { status: upstream.ok ? 502 : upstream.status });
  }

  const { token, ...session } = data;
  const response = NextResponse.json(session);
  setSessionCookie(response, token as string, body?.remember === true);
  return response;
}

/** Sign out: tell the backend (best effort) and drop the cookie. */
export async function DELETE(request: NextRequest) {
  if (!isTrustedMutation(request)) return jsonError(403, 'Forbidden', 'Requête refusée.');

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await callBackend({ method: 'POST', path: 'auth/logout', token }).catch(() => undefined);
  }
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookie(response);
  return response;
}
