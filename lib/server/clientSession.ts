import 'server-only';
import type { NextResponse } from 'next/server';
import { CLIENT_SESSION_COOKIE, sessionCookieOptions } from '@/lib/session';

/** httpOnly cookie of the client area; clients stay signed in like in the app. */
export function setClientCookie(response: NextResponse, token: string) {
  response.cookies.set(CLIENT_SESSION_COOKIE, token, sessionCookieOptions(token, true));
}

export function clearClientCookie(response: NextResponse) {
  response.cookies.set(CLIENT_SESSION_COOKIE, '', { ...sessionCookieOptions(''), maxAge: 0 });
}
