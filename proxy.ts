import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  homeForRole,
  isTokenUsable,
  PLATFORM_HOME,
  readTokenRole,
  SESSION_COOKIE,
} from '@/lib/session';

const AUTH_PAGES = ['/login'];
const PRIVATE_AREAS = ['/dashboard', PLATFORM_HOME];

const inArea = (pathname: string, area: string) => pathname === area || pathname.startsWith(`${area}/`);

/**
 * Server side route guard: private areas are never rendered without a
 * session cookie, a signed in user skips the login page, and each profile is
 * sent to its own area (platform administrator: /plateforme, salon team:
 * /dashboard). The role is read without verification, for routing only: the
 * backend checks the token and the role on every API call.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

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
  matcher: ['/', '/login', '/dashboard/:path*', '/plateforme', '/plateforme/:path*'],
};
