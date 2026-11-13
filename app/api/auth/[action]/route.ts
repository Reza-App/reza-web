import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  backendUnavailable,
  callBackend,
  clientIpOf,
  isTrustedMutation,
  jsonError,
  readJson,
} from '@/lib/server/backend';

export const dynamic = 'force-dynamic';

/** Unauthenticated account flows the web app is allowed to reach. */
const PUBLIC_ACTIONS = new Set([
  'register',
  'forgot-password',
  'reset-password',
  'verify-email',
  'resend-verification',
]);

const MAX_BODY_BYTES = 16 * 1024;

export async function POST(request: NextRequest, ctx: { params: Promise<{ action: string }> }) {
  const { action } = await ctx.params;
  if (!PUBLIC_ACTIONS.has(action)) return jsonError(404, 'Not found', 'Action inconnue.');
  if (!isTrustedMutation(request)) return jsonError(403, 'Forbidden', 'Requête refusée.');

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return jsonError(413, 'Payload too large', 'Requête trop volumineuse.');

  let upstream: Response;
  try {
    upstream = await callBackend({
      method: 'POST',
      path: `auth/${action}`,
      body: raw,
      contentType: 'application/json',
      clientIp: clientIpOf(request),
    });
  } catch {
    return backendUnavailable();
  }

  const data = await readJson(upstream);
  // Never hand a token to the browser: a verified account signs in normally.
  if (data && 'token' in data) delete data.token;
  return NextResponse.json(data ?? {}, { status: upstream.status });
}
