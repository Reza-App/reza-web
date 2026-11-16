import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { backendUnavailable, callBackend, clientIpOf, isTrustedMutation, jsonError } from '@/lib/server/backend';
import { isAllowedClientPath, requiresClientSession, resolveClientPath } from '@/lib/server/clientAllowlist';
import { clearClientCookie } from '@/lib/server/clientSession';
import { CLIENT_SESSION_COOKIE, readClientEmail } from '@/lib/session';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 8 * 1024 * 1024;

/** BFF of the client area: allowlisted /api/public routes, client token from its cookie. */
async function forward(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const method = request.method.toUpperCase();
  if (!isAllowedClientPath(path, method)) return jsonError(404, 'Not found', 'Ressource inconnue.');
  if (method !== 'GET' && !isTrustedMutation(request)) return jsonError(403, 'Forbidden', 'Requête refusée.');

  const token = request.cookies.get(CLIENT_SESSION_COOKIE)?.value;
  const email = readClientEmail(token);
  if (requiresClientSession(path, method) && (!token || !email)) {
    return jsonError(401, 'Unauthorized', 'Connectez vous pour continuer.');
  }
  const resolved = resolveClientPath(path, email);
  if (!resolved) return jsonError(401, 'Unauthorized', 'Connectez vous pour continuer.');

  let body: ArrayBuffer | undefined;
  if (method !== 'GET') {
    const declared = Number(request.headers.get('content-length') ?? 0);
    if (declared > MAX_BODY_BYTES) return jsonError(413, 'Payload too large', 'Le fichier envoyé est trop volumineux.');
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) return jsonError(413, 'Payload too large', 'Le fichier envoyé est trop volumineux.');
    if (body.byteLength === 0) body = undefined;
  }

  let upstream: Response;
  try {
    upstream = await callBackend({
      method,
      path: ['public', ...resolved].map(encodeURIComponent).join('/'),
      search: request.nextUrl.search,
      token: email ? token : undefined,
      body,
      contentType: body ? request.headers.get('content-type') : null,
      clientIp: clientIpOf(request),
    });
  } catch {
    return backendUnavailable();
  }

  const headers = new Headers({ 'cache-control': 'no-store' });
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const response = new NextResponse(upstream.status === 204 ? null : upstream.body, { status: upstream.status, headers });
  if (upstream.status === 401 && email) clearClientCookie(response);
  return response;
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
