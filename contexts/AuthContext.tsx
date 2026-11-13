'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { sessionService } from '@/lib/api/services/session.service';
import type { SalonSummary, Session, SessionUser } from '@/lib/types/session';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: SessionUser | null;
  salons: SalonSummary[];
  activeSalon: SalonSummary | null;
  isAuthenticated: boolean;
  /** Signs in and returns the new session (its role decides the landing page). */
  login: (email: string, password: string, remember?: boolean) => Promise<Session>;
  logout: () => Promise<void>;
  switchSalon: (tenantId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Holds the signed in staff session. The token itself lives in an httpOnly
 * cookie handled by the BFF; this context only keeps the public profile.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const refresh = useCallback(async () => {
    try {
      const current = await sessionService.current();
      setSession(current);
      setStatus('authenticated');
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        setSession(null);
        setStatus('anonymous');
        return;
      }
      throw error;
    }
  }, []);

  // Initial session check (state only changes once the request resolves).
  useEffect(() => {
    let active = true;
    sessionService
      .current()
      .then((current) => {
        if (!active) return;
        setSession(current);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setStatus('anonymous');
      });
    return () => {
      active = false;
    };
  }, []);

  // Any 401 from the API means the session is gone: go back to the login page.
  useEffect(
    () =>
      api.onUnauthorized(() => {
        setSession(null);
        setStatus('anonymous');
        const next = `${window.location.pathname}${window.location.search}`;
        if (window.location.pathname.startsWith('/dashboard') || window.location.pathname.startsWith('/plateforme')) {
          router.replace(`/login?next=${encodeURIComponent(next)}`);
        }
      }),
    [router],
  );

  const login = useCallback(async (email: string, password: string, remember = false) => {
    const next = await sessionService.login(email, password, remember);
    setSession(next);
    setStatus('authenticated');
    return next;
  }, []);

  const logout = useCallback(async () => {
    try {
      await sessionService.logout();
    } finally {
      setSession(null);
      setStatus('anonymous');
      router.replace('/login');
      router.refresh();
    }
  }, [router]);

  const switchSalon = useCallback(
    async (tenantId: string) => {
      await sessionService.switchSalon(tenantId);
      await refresh();
      router.refresh();
    },
    [refresh, router],
  );

  const value = useMemo<AuthContextValue>(() => {
    const salons = session?.salons ?? [];
    return {
      status,
      user: session?.user ?? null,
      salons,
      activeSalon: salons.find((s) => s.id === session?.activeTenantId) ?? null,
      isAuthenticated: status === 'authenticated',
      login,
      logout,
      switchSalon,
      refresh,
    };
  }, [session, status, login, logout, switchSalon, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
