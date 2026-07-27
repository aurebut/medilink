'use client';

import { AppShell } from '@/components/AppShell';
import { AreaAccessGuard } from '@/components/AreaAccessGuard';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['MEDILINK_ADMIN', 'MEDILINK_SUPPORT']}>
      <AreaAccessGuard area="admin">
        <AppShell area="admin">{children}</AppShell>
      </AreaAccessGuard>
    </ProtectedRoute>
  );
}
