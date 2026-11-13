import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  backendUnavailable,
  callBackend,
  clearSessionCookie,
  isTrustedMutation,
  jsonError,
} from '@/lib/server/backend';
import { isAllowedPath } from '@/lib/server/allowlist';
import { SESSION_COOKIE } from '@/lib/session';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 20 * 1024 * 1024;
const FORWARDED_REQUEST_HEADERS = ['x-salon-ids'];

async function forward(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  if (!isAllowedPath(path)) return jsonError(404, 'Not found', 'Ressource inconnue.');

  const method = request.method.toUpperCase();
  if (method !== 'GET' && !isTrustedMutation(request)) {
    return jsonError(403, 'Forbidden', 'Requête refusée.');
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return jsonError(401, 'Unauthorized', 'Votre session a expiré. Merci de vous reconnecter.');

  let body: ArrayBuffer | undefined;
  if (method !== 'GET') {
    const declared = Number(request.headers.get('content-length') ?? 0);
    if (declared > MAX_BODY_BYTES) return jsonError(413, 'Payload too large', 'Le fichier envoyé est trop volumineux.');
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) return jsonError(413, 'Payload too large', 'Le fichier envoyé est trop volumineux.');
    if (body.byteLength === 0) body = undefined;
  }

  const extraHeaders: Record<string, string> = {};
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) extraHeaders[name] = value;
  }

  let upstream: Response;
  try {
    upstream = await callBackend({
      method,
      path: path.map(encodeURIComponent).join('/'),
      search: request.nextUrl.search,
      token,
      body,
      contentType: body ? request.headers.get('content-type') : null,
      extraHeaders,
    });
  } catch {
    return backendUnavailable();
  }

  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const disposition = upstream.headers.get('content-disposition');
  if (disposition) headers.set('content-disposition', disposition);
  headers.set('cache-control', 'no-store');

  const response = new NextResponse(upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
  if (upstream.status === 401) clearSessionCookie(response);
  return response;
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
