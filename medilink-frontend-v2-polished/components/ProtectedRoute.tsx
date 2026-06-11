'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { LoadingCard, PlatformSplash } from './ui';
import type { CandidateDashboardData, Conversation, CurrentUser, EstablishmentDashboardData, UserRole } from '@/lib/types';
import { defaultRouteForUser } from '@/lib/routes';
import { api, primeApiCache } from '@/lib/api';
import { primeNotificationsCache } from '@/lib/notification-cache';
import { splashSeenKey } from '@/lib/startup-splash';

const PLATFORM_SPLASH_MIN_MS = 900;

function hasAnySplashBeenSeen() {
  if (typeof window === 'undefined') return false;
  return Object.keys(window.sessionStorage).some(
    (key) => key.startsWith('medilink_platform_splash_seen:') && window.sessionStorage.getItem(key) === 'true'
  );
}

function shouldShowInitialSplash(user?: CurrentUser | null) {
  if (typeof window === 'undefined') return true;
  if (hasAnySplashBeenSeen()) return false;
  if (!user) return true;
  return window.sessionStorage.getItem(splashSeenKey(user)) !== 'true';
}

function markInitialSplashSeen(user: CurrentUser) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(splashSeenKey(user), 'true');
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function primeCandidateDashboard(data: CandidateDashboardData) {
  primeApiCache('/me/profile', data.profile);
  primeApiCache('/me/documents', data.documents);
  primeApiCache('/me/applications', data.applications);
  primeApiCache('/conversations', data.conversations);
  primeNotificationsCache(data.notifications);
}

function primeEstablishmentDashboard(data: EstablishmentDashboardData) {
  if (data.establishment) {
    primeApiCache('/establishments/me', [data.establishment]);
    primeApiCache(`/establishment/applications?establishmentId=${data.establishment.id}`, data.applications);
    primeApiCache(`/missions/mine?establishmentId=${data.establishment.id}`, data.missions);
    api.preload(`/billing/establishments/${data.establishment.id}/status`);
  }
  primeApiCache('/conversations', data.conversations);
}

async function preloadConversationMessages(conversations: Conversation[]) {
  await Promise.allSettled(
    conversations.slice(0, 3).map((conversation) => api.get(`/conversations/${conversation.id}/messages`)),
  );
}

async function warmStartupData(user: CurrentUser | null) {
  if (!user) return;

  if (user.role === 'CANDIDATE') {
    const [dashboardResult] = await Promise.allSettled([
      api.get<CandidateDashboardData>('/me/dashboard'),
      api.get('/missions?limit=50'),
    ]);

    if (dashboardResult.status === 'fulfilled') {
      primeCandidateDashboard(dashboardResult.value);
      await preloadConversationMessages(dashboardResult.value.conversations);
    }
    return;
  }

  if (user.role.startsWith('ESTABLISHMENT_')) {
    const [dashboardResult] = await Promise.allSettled([
      api.get<EstablishmentDashboardData>('/establishment/dashboard'),
      api.get('/notifications'),
    ]);

    if (dashboardResult.status === 'fulfilled') {
      primeEstablishmentDashboard(dashboardResult.value);
      await preloadConversationMessages(dashboardResult.value.conversations);
    }
  }
}

export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: UserRole[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showInitialSplash, setShowInitialSplash] = useState(() => shouldShowInitialSplash(user));

  useEffect(() => {
    if (loading) return;
    setShowInitialSplash(shouldShowInitialSplash(user));
  }, [loading, user]);

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

    let cancelled = false;
    
    // Warm startup data in the background without blocking the splash screen dismissal
    void warmStartupData(user);

    sleep(PLATFORM_SPLASH_MIN_MS).then(() => {
      if (cancelled) return;
      markInitialSplashSeen(user);
      setShowInitialSplash(false);
    });

    return () => {
      cancelled = true;
    };
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
