'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { LoadingCard } from './ui';
import type { UserRole } from '@/lib/types';
import { defaultRouteForUser } from '@/lib/routes';

export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: UserRole[] }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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

  if (loading) return <div className="content"><LoadingCard /></div>;
  if (!user) return null;
  if (allowedRoles && !allowedRoles.includes(user.role)) return null;
  return <>{children}</>;
}
