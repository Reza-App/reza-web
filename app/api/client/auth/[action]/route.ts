import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { backendUnavailable, callBackend, clientIpOf, isTrustedMutation, jsonError, readJson } from '@/lib/server/backend';

export const dynamic = 'force-dynamic';

/** Public client account flows (no session needed). */
const ACTIONS: Record<string, { method: 'GET' | 'POST'; path: string }> = {
  register: { method: 'POST', path: 'public/auth/client-register' },
  'check-email': { method: 'GET', path: 'public/auth/check-email' },
  'forgot-code': { method: 'POST', path: 'public/auth/client-forgot-code' },
  reset: { method: 'POST', path: 'public/auth/client-reset-password' },
  verify: { method: 'POST', path: 'public/auth/client-verify-email' },
  'resend-verification': { method: 'POST', path: 'public/auth/client-resend-verification' },
};

async function handle(request: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  const target = ACTIONS[action];
  if (!target || target.method !== request.method) return jsonError(404, 'Not found', 'Action inconnue.');
  if (request.method !== 'GET' && !isTrustedMutation(request)) return jsonError(403, 'Forbidden', 'Requête refusée.');

  const raw = request.method === 'GET' ? '' : await request.text();
  if (raw.length > 10_000) return jsonError(413, 'Payload too large', 'Requête trop volumineuse.');

  let upstream: Response;
  try {
    upstream = await callBackend({
      method: target.method,
      path: target.path,
      search: request.method === 'GET' ? request.nextUrl.search : undefined,
      body: raw || undefined,
      contentType: raw ? 'application/json' : null,
      clientIp: clientIpOf(request),
    });
  } catch {
    return backendUnavailable();
  }
  const data = await readJson(upstream);
  // A token in the answer (some flows sign in at once) is never handed to scripts.
  if (data && 'token' in data) delete data.token;
  return NextResponse.json(data ?? {}, { status: upstream.status });
}

export { handle as GET, handle as POST };
