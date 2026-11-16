'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api/errors';
import { type ClientProfile, clientSession } from '@/lib/api/services/clientArea.service';
import { CLIENT_HOME } from '@/lib/session';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface ClientAuthValue {
  status: Status;
  client: ClientProfile | null;
  login: (email: string, password: string) => Promise<ClientProfile>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setClient: (client: ClientProfile) => void;
}

const ClientAuthContext = createContext<ClientAuthValue | null>(null);

/** Session of the client area (separate from the salon team session). */
export function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  const refresh = useCallback(async () => {
    try {
      setClient(await clientSession.me());
      setStatus('authenticated');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setClient(null);
        setStatus('anonymous');
        return;
      }
      setStatus((s) => (s === 'loading' ? 'anonymous' : s));
    }
  }, []);

  useEffect(() => {
    let active = true;
    clientSession
      .me()
      .then((c) => {
        if (!active) return;
        setClient(c);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!active) return;
        setClient(null);
        setStatus('anonymous');
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await clientSession.login(email, password);
    const profile = await clientSession.me();
    setClient(profile);
    setStatus('authenticated');
    return profile;
  }, []);

  /**
   * Full page load to the discovery page: a client side navigation kept the
   * private page (and its cached appointments, favorites...) on screen until the
   * new page rendered. Reloading drops every in memory query of the account.
   */
  const logout = useCallback(async () => {
    try {
      await clientSession.logout();
    } finally {
      window.location.replace(CLIENT_HOME);
    }
  }, []);

  const value = useMemo(
    () => ({ status, client, login, logout, refresh, setClient: (c: ClientProfile) => setClient(c) }),
    [status, client, login, logout, refresh],
  );
  return <ClientAuthContext.Provider value={value}>{children}</ClientAuthContext.Provider>;
}

export function useClientAuth(): ClientAuthValue {
  const value = useContext(ClientAuthContext);
  if (!value) throw new Error('useClientAuth must be used within ClientAuthProvider');
  return value;
}
