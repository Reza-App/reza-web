import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { backendUnavailable, callBackend, clientIpOf, isTrustedMutation, jsonError, readJson } from '@/lib/server/backend';
import { clearClientCookie, setClientCookie } from '@/lib/server/clientSession';
import { CLIENT_SESSION_COOKIE, readClientEmail } from '@/lib/session';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Signed in client profile. */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(CLIENT_SESSION_COOKIE)?.value;
  const email = readClientEmail(token);
  if (!token || !email) return jsonError(401, 'Unauthorized', 'Aucune session client.');

  let upstream: Response;
  try {
    upstream = await callBackend({ method: 'GET', path: `public/client/${encodeURIComponent(email)}`, token });
  } catch {
    return backendUnavailable();
  }
  const data = await readJson(upstream);
  const response = NextResponse.json(data ?? {}, { status: upstream.status });
  if (upstream.status === 401 || upstream.status === 403) clearClientCookie(response);
  return response;
}

/** Client sign in: the token goes to an httpOnly cookie, never to scripts. */
export async function POST(request: NextRequest) {
  if (!isTrustedMutation(request)) return jsonError(403, 'Forbidden', 'Requête refusée.');
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!EMAIL_RE.test(email) || !password || password.length > 200) {
    return jsonError(400, 'Validation error', 'Email ou mot de passe invalide.');
  }

  let upstream: Response;
  try {
    upstream = await callBackend({
      method: 'POST',
      path: 'public/auth/client-login',
      body: JSON.stringify({ email, password }),
      contentType: 'application/json',
      clientIp: clientIpOf(request),
    });
  } catch {
    return backendUnavailable();
  }
  const data = await readJson(upstream);
  if (!upstream.ok || typeof data?.token !== 'string') {
    return NextResponse.json(data ?? { error: 'Login failed', message: 'Connexion impossible.' }, { status: upstream.ok ? 502 : upstream.status });
  }
  const response = NextResponse.json({ client: data.client ?? null });
  setClientCookie(response, data.token);
  return response;
}

/** Sign out of the client area. */
export async function DELETE(request: NextRequest) {
  if (!isTrustedMutation(request)) return jsonError(403, 'Forbidden', 'Requête refusée.');
  const response = NextResponse.json({ ok: true });
  clearClientCookie(response);
  return response;
}
