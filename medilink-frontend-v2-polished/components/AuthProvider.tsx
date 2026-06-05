'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearAuthToken, setAuthToken } from '@/lib/api';
import type { CandidateGender, CurrentUser } from '@/lib/types';

type AuthContextValue = {
  user: CurrentUser | null;
  loading: boolean;
  refresh: () => Promise<CurrentUser | null>;
  login: (email: string, password: string) => Promise<CurrentUser>;
  register: (data: RegisterPayload) => Promise<CurrentUser>;
  logout: () => Promise<void>;
};

type RegisterPayload = {
  accountType: 'candidate' | 'establishment';
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  candidateGender?: CandidateGender;
  phone?: string;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const current = await api.get<CurrentUser>('/auth/me');
      setUser(current);
      return current;
    } catch {
      clearAuthToken();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.post<{ user: CurrentUser; token: string }>('/auth/login', { email, password });
    setAuthToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (data: RegisterPayload) => {
    const result = await api.post<{ user: CurrentUser; token: string }>('/auth/register', data);
    setAuthToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } finally { clearAuthToken(); setUser(null); }
  }, []);

  const value = useMemo(() => ({ user, loading, refresh, login, register, logout }), [user, loading, refresh, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
