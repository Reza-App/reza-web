import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { backendUnavailable, callBackend, clientIpOf, isTrustedMutation, jsonError } from '@/lib/server/backend';
import { isAllowedClientPath } from '@/lib/server/clientAllowlist';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 64 * 1024;

/** Public relay: legal identity and browser error reports, no session involved. */
async function forward(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const method = request.method.toUpperCase();
  if (!isAllowedClientPath(path, method)) return jsonError(404, 'Not found', 'Ressource inconnue.');
  if (method !== 'GET' && !isTrustedMutation(request)) return jsonError(403, 'Forbidden', 'Requête refusée.');

  let body: string | undefined;
  if (method !== 'GET') {
    body = await request.text();
    if (body.length > MAX_BODY_BYTES) return jsonError(413, 'Payload too large', 'Requête trop volumineuse.');
  }

  let upstream: Response;
  try {
    upstream = await callBackend({
      method,
      path: `public/${path.map(encodeURIComponent).join('/')}`,
      search: request.nextUrl.search,
      body: body || undefined,
      contentType: body ? 'application/json' : null,
      clientIp: clientIpOf(request),
    });
  } catch {
    return backendUnavailable();
  }
  const headers = new Headers({ 'cache-control': 'no-store' });
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  return new NextResponse(upstream.status === 204 ? null : upstream.body, { status: upstream.status, headers });
}

export { forward as GET, forward as POST };
