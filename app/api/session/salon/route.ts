import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  backendUnavailable,
  callBackend,
  isTrustedMutation,
  jsonError,
  readJson,
  setSessionCookie,
} from '@/lib/server/backend';
import { REMEMBER_COOKIE, SESSION_COOKIE } from '@/lib/session';

export const dynamic = 'force-dynamic';

/** Switch the active salon: the backend issues a token scoped to it. */
export async function POST(request: NextRequest) {
  if (!isTrustedMutation(request)) return jsonError(403, 'Forbidden', 'Requête refusée.');

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return jsonError(401, 'Unauthorized', 'Aucune session active.');

  const body = (await request.json().catch(() => null)) as { tenantId?: unknown } | null;
  const tenantId = typeof body?.tenantId === 'string' ? body.tenantId.trim() : '';
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(tenantId)) {
    return jsonError(400, 'Validation error', 'Salon invalide.');
  }

  let upstream: Response;
  try {
    upstream = await callBackend({
      method: 'POST',
      path: 'auth/switch-salon',
      token,
      body: JSON.stringify({ tenantId }),
      contentType: 'application/json',
    });
  } catch {
    return backendUnavailable();
  }

  const data = await readJson(upstream);
  if (!upstream.ok || !data || typeof data.token !== 'string') {
    return NextResponse.json(data ?? {}, { status: upstream.ok ? 502 : upstream.status });
  }

  const { token: next, ...session } = data;
  const response = NextResponse.json(session);
  setSessionCookie(response, next as string, request.cookies.get(REMEMBER_COOKIE)?.value === '1');
  return response;
}
