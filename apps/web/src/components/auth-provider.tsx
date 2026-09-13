'use client';

import { setLibraryAccount } from '../features/viewing/library';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  countryCode: string | null;
  role: string;
};

type Session = { accessToken: string; user: AuthUser };
type AuthContextValue = {
  status: 'loading' | 'authenticated' | 'anonymous';
  user: AuthUser | null;
  acceptSession: (session: Session) => void;
  logout: () => Promise<void>;
};

const api = process.env.NEXT_PUBLIC_API_URL;
const AuthContext = createContext<AuthContextValue | null>(null);
let restorePromise: Promise<Session | null> | null = null;

function announce(session: Session | null) {
  window.dispatchEvent(new CustomEvent('streamly:auth', { detail: session }));
}

async function restoreSession(): Promise<Session | null> {
  if (restorePromise) return restorePromise;
  restorePromise = (async () => {
    if (!api) return null;
    const stored = sessionStorage.getItem('accessToken');
    if (stored) {
      try {
        const profile = await fetch(`${api}/auth/me`, {
          cache: 'no-store',
          credentials: 'include',
          headers: { authorization: `Bearer ${stored}` },
        });
        if (profile.ok) return { accessToken: stored, user: await profile.json() as AuthUser };
      } catch { /* The refresh request below may restore the session. */ }
    }
    try {
      const response = await fetch(`${api}/auth/refresh`, { method: 'POST', cache: 'no-store', credentials: 'include' });
      if (!response.ok) return null;
      const session = await response.json() as Session;
      return session.accessToken && session.user ? session : null;
    } catch { return null; }
  })().finally(() => { restorePromise = null; });
  return restorePromise;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue['status']>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  const apply = useCallback((session: Session | null) => {
    if (session) {
      sessionStorage.setItem('accessToken', session.accessToken);
      sessionStorage.setItem('streamly.userId', session.user.id);
      setLibraryAccount(session.user.id);
      setUser(session.user);
      setStatus('authenticated');
    } else {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('streamly.userId');
      setLibraryAccount(null);
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    let active = true;
    void restoreSession().then(session => { if (active) apply(session); });
    const onAuth = (event: Event) => apply((event as CustomEvent<Session | null>).detail ?? null);
    window.addEventListener('streamly:auth', onAuth);
    return () => { active = false; window.removeEventListener('streamly:auth', onAuth); };
  }, [apply]);

  const acceptSession = useCallback((session: Session) => { apply(session); announce(session); }, [apply]);
  const logout = useCallback(async () => {
    const token = sessionStorage.getItem('accessToken');
    apply(null);
    announce(null);
    try {
      if (api) await fetch(`${api}/auth/logout`, {
        method: 'POST', credentials: 'include',
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
      });
    } catch { /* Local logout remains effective if the API is temporarily unavailable. */ }
  }, [apply]);

  const value = useMemo(() => ({ status, user, acceptSession, logout }), [status, user, acceptSession, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

export const adminRoles = new Set(['CONTENT_MANAGER', 'TECHNICAL_ADMIN', 'SUPER_ADMIN']);
