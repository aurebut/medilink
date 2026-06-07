'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { LoadingCard, PlatformSplash } from './ui';
import type { CurrentUser, UserRole } from '@/lib/types';
import { defaultRouteForUser } from '@/lib/routes';
import { api } from '@/lib/api';

const PLATFORM_SPLASH_SEEN_KEY = 'medilink_platform_splash_seen';
const PLATFORM_SPLASH_MIN_MS = 900;

function shouldShowInitialSplash() {
  if (typeof window === 'undefined') return true;
  return window.sessionStorage.getItem(PLATFORM_SPLASH_SEEN_KEY) !== 'true';
}

function markInitialSplashSeen() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(PLATFORM_SPLASH_SEEN_KEY, 'true');
}

function warmStartupData(user: CurrentUser | null) {
  if (!user) return;

  if (user.role === 'CANDIDATE') {
    api.preload('/me/dashboard');
    api.preload('/me/applications');
    api.preload('/conversations');
    api.preload('/notifications');
    api.preload('/missions?limit=50');
    return;
  }

  if (user.role.startsWith('ESTABLISHMENT_')) {
    api.preload('/establishment/dashboard');
    api.preload('/establishments/me');
    api.preload('/conversations');
    api.preload('/notifications');
  }
}

export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: UserRole[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showInitialSplash, setShowInitialSplash] = useState(shouldShowInitialSplash);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace(defaultRouteForUser(user));
    }
  }, [loading, user, allowedRoles, router, pathname]);

  useEffect(() => {
    if (loading || !user || !showInitialSplash) return;

    warmStartupData(user);
    const timeout = window.setTimeout(() => {
      markInitialSplashSeen();
      setShowInitialSplash(false);
    }, PLATFORM_SPLASH_MIN_MS);

    return () => window.clearTimeout(timeout);
  }, [loading, showInitialSplash, user]);

  if (loading) {
    return showInitialSplash
      ? <PlatformSplash label="Connexion à votre espace" />
      : <div className="content"><LoadingCard /></div>;
  }
  if (!user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;
  if (showInitialSplash) return <PlatformSplash />;
  return <>{children}</>;
}
