'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { canAccessAdminPath, canAccessCandidatePath, canAccessEstablishmentPath, workspaceHomeForRole } from '@/lib/access-control';
import { useAuth } from './AuthProvider';

export function AreaAccessGuard({
  area,
  children,
}: {
  area: 'candidate' | 'establishment' | 'admin';
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const allowed = area === 'admin'
    ? canAccessAdminPath(user?.role, pathname)
    : area === 'candidate'
      ? canAccessCandidatePath(user?.role, pathname)
      : canAccessEstablishmentPath(user?.role, pathname);

  useEffect(() => {
    if (!user || allowed) return;
    router.replace(workspaceHomeForRole(user.role));
  }, [allowed, router, user]);

  if (!user || !allowed) return null;
  return <>{children}</>;
}
