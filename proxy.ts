import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  CLIENT_HOME,
  CLIENT_LOGIN,
  CLIENT_SESSION_COOKIE,
  homeForRole,
  isTokenUsable,
  PLATFORM_HOME,
  readTokenRole,
  SESSION_COOKIE,
} from '@/lib/session';

const AUTH_PAGES = ['/login'];
const PRIVATE_AREAS = ['/dashboard', PLATFORM_HOME];

const inArea = (pathname: string, area: string) => pathname === area || pathname.startsWith(`${area}/`);

/** Client area pages that need a signed in client (discovery and salon pages stay public). */
const CLIENT_PRIVATE = ['/client/rendez-vous', '/client/favoris', '/client/proches', '/client/profil'];
const BOOKING_RE = /^\/client\/salon\/[^/]+\/reserver\/?$/;
function isClientPrivate(pathname: string): boolean {
  return CLIENT_PRIVATE.some((area) => inArea(pathname, area)) || BOOKING_RE.test(pathname);
}

/**
 * Server side route guard: private areas are never rendered without a
 * session cookie, a signed in user skips the login page, and each profile is
 * sent to its own area (platform administrator: /plateforme, salon team:
 * /dashboard). The role is read without verification, for routing only: the
 * backend checks the token and the role on every API call.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Client area: its own session cookie, independent from the salon team one.
  if (inArea(pathname, CLIENT_HOME)) {
    const clientSignedIn = isTokenUsable(request.cookies.get(CLIENT_SESSION_COOKIE)?.value);
    if (isClientPrivate(pathname) && !clientSignedIn) {
      const url = new URL(CLIENT_LOGIN, request.url);
      url.searchParams.set('next', `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
    if (inArea(pathname, CLIENT_LOGIN) && clientSignedIn) return NextResponse.redirect(new URL(CLIENT_HOME, request.url));
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const signedIn = isTokenUsable(token);
  const home = homeForRole(readTokenRole(token));

  if (PRIVATE_AREAS.some((area) => inArea(pathname, area)) && !signedIn) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', `${pathname}${search}`);
    const response = NextResponse.redirect(url);
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (signedIn) {
    const platformUser = home === PLATFORM_HOME;
    if (platformUser && inArea(pathname, '/dashboard')) return NextResponse.redirect(new URL(PLATFORM_HOME, request.url));
    if (!platformUser && inArea(pathname, PLATFORM_HOME)) return NextResponse.redirect(new URL(home, request.url));
  }

  if (AUTH_PAGES.includes(pathname) && signedIn) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL(signedIn ? home : '/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/dashboard/:path*', '/plateforme', '/plateforme/:path*', '/client', '/client/:path*'],
};
