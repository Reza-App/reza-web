import 'server-only';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { CSRF_HEADER } from '@/lib/api/constants';
import { REMEMBER_COOKIE, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';
import { serverConfig } from './config';

export interface BackendCall {
  method: string;
  path: string;
  search?: string;
  token?: string;
  body?: BodyInit;
  contentType?: string | null;
  extraHeaders?: Record<string, string>;
  clientIp?: string | null;
}

/** First address of X-Forwarded-For, i.e. the real browser IP. */
export function clientIpOf(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim() || null;
  return request.headers.get('x-real-ip');
}

/** Server to server call to the Express API. */
export async function callBackend(call: BackendCall): Promise<Response> {
  // Same id in the web and API logs for one user action.
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Request-Id': crypto.randomUUID(), ...call.extraHeaders };
  if (call.contentType) headers['Content-Type'] = call.contentType;
  if (call.token) headers.Authorization = `Bearer ${call.token}`;
  if (serverConfig.bffSecret && call.clientIp) {
    headers['X-BFF-Secret'] = serverConfig.bffSecret;
    headers['X-Client-IP'] = call.clientIp;
  }

  return fetch(`${serverConfig.backendUrl}/${call.path.replace(/^\/+/, '')}${call.search ?? ''}`, {
    method: call.method,
    headers,
    body: call.body,
    cache: 'no-store',
    redirect: 'manual',
    signal: AbortSignal.timeout(serverConfig.backendTimeoutMs),
  });
}

export function jsonError(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

export function backendUnavailable() {
  return jsonError(502, 'Bad gateway', 'Le serveur est momentanément indisponible.');
}

/**
 * Same origin guard for state changing calls: the custom header can only be
 * set by our own scripts (a cross site form or image can not add it), and the
 * Origin, when present, must be ours.
 */
export function isTrustedMutation(request: NextRequest): boolean {
  if (request.headers.get(CSRF_HEADER) !== '1') return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get('host');
  } catch {
    return false;
  }
}

export function setSessionCookie(response: NextResponse, token: string, remember: boolean) {
  const options = sessionCookieOptions(token, remember);
  response.cookies.set(SESSION_COOKIE, token, options);
  if (remember) response.cookies.set(REMEMBER_COOKIE, '1', options);
  else response.cookies.set(REMEMBER_COOKIE, '', { ...options, maxAge: 0 });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(''), maxAge: 0 });
  response.cookies.set(REMEMBER_COOKIE, '', { ...sessionCookieOptions(''), maxAge: 0 });
}

export async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const data: unknown = await response.json();
    return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
