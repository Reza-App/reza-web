import { describe, expect, it } from 'vitest';
import { isAllowedPath } from '@/lib/server/allowlist';
import { isTokenUsable, readTokenExpiry, sessionMaxAge } from '@/lib/session';
import { safeNextPath } from '@/lib/validation';
import { safeInternalLink } from '@/lib/api/services/notification.service';

function fakeJwt(claims: Record<string, unknown>): string {
  const encode = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode(claims)}.signature`;
}

describe('BFF allowlist', () => {
  it('accepts dashboard resources', () => {
    expect(isAllowedPath(['clients'])).toBe(true);
    expect(isAllowedPath(['stats', 'occupation', 'vue-ensemble'])).toBe(true);
    expect(isAllowedPath(['auth', 'me'])).toBe(true);
  });

  it('refuses unknown roots and login routes', () => {
    expect(isAllowedPath([])).toBe(false);
    expect(isAllowedPath(['auth', 'login'])).toBe(false);
    expect(isAllowedPath(['auth', 'me', 'extra'])).toBe(false);
    expect(isAllowedPath(['public', 'tenants'])).toBe(false);
  });

  it('lets the platform area reach superadmin routes (the API checks the SUPER_ADMIN role)', () => {
    expect(isAllowedPath(['superadmin', 'accounts'])).toBe(true);
    expect(isAllowedPath(['auth', 'socket-ticket'])).toBe(true);
  });

  it('refuses path traversal and odd characters', () => {
    expect(isAllowedPath(['clients', '..', 'superadmin'])).toBe(false);
    expect(isAllowedPath(['clients', 'a/b'])).toBe(false);
    expect(isAllowedPath(['clients', 'x?y=1'])).toBe(false);
  });
});

describe('session token helpers', () => {
  const now = Date.UTC(2026, 10, 13, 12);

  it('reads the exp claim', () => {
    expect(readTokenExpiry(fakeJwt({ exp: 123 }))).toBe(123);
    expect(readTokenExpiry('not-a-jwt')).toBeNull();
  });

  it('treats expired tokens as unusable', () => {
    expect(isTokenUsable(fakeJwt({ exp: now / 1000 - 10 }), now)).toBe(false);
    expect(isTokenUsable(fakeJwt({ exp: now / 1000 + 10 }), now)).toBe(true);
    expect(isTokenUsable(undefined, now)).toBe(false);
    expect(isTokenUsable('garbage', now)).toBe(false);
  });

  it('sizes the cookie on the token lifetime', () => {
    expect(sessionMaxAge(fakeJwt({ exp: now / 1000 + 3600 }), now)).toBe(3600);
    expect(sessionMaxAge(fakeJwt({ exp: now / 1000 - 5 }), now)).toBe(0);
  });
});

describe('redirect safety', () => {
  it('only follows internal dashboard paths after login', () => {
    expect(safeNextPath('/dashboard/caisse')).toBe('/dashboard/caisse');
    expect(safeNextPath('https://evil.example')).toBe('/dashboard/rendez-vous');
    expect(safeNextPath('//evil.example/dashboard')).toBe('/dashboard/rendez-vous');
    expect(safeNextPath('/dashboard\\..\\x')).toBe('/dashboard/rendez-vous');
    expect(safeNextPath(null)).toBe('/dashboard/rendez-vous');
  });

  it('only follows same app notification links', () => {
    expect(safeInternalLink('/dashboard/clients')).toBe('/dashboard/clients');
    expect(safeInternalLink('https://evil.example')).toBeNull();
    expect(safeInternalLink('//evil.example')).toBeNull();
    expect(safeInternalLink('javascript:alert(1)')).toBeNull();
  });
});

describe('remember me', () => {
  it('uses a browser session cookie unless the user asked to be remembered', async () => {
    const { sessionCookieOptions } = await import('@/lib/session');
    const token = fakeJwt({ exp: Date.now() / 1000 + 3600 });
    expect(sessionCookieOptions(token, false)).not.toHaveProperty('maxAge');
    expect(sessionCookieOptions(token, true).maxAge).toBeGreaterThan(3500);
    expect(sessionCookieOptions(token, true).httpOnly).toBe(true);
  });
});

describe('sliding session', () => {
  it('refreshes only tokens close to expiry and still valid', async () => {
    const { shouldRefresh } = await import('@/lib/session');
    const now = Date.UTC(2026, 10, 13);
    const day = 24 * 3600;
    expect(shouldRefresh(fakeJwt({ exp: now / 1000 + 6 * day }), now)).toBe(false);
    expect(shouldRefresh(fakeJwt({ exp: now / 1000 + day }), now)).toBe(true);
    expect(shouldRefresh(fakeJwt({ exp: now / 1000 - 10 }), now)).toBe(false);
  });
});
