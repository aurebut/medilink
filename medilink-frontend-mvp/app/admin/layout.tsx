'use client';

import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['MEDILINK_ADMIN', 'MEDILINK_SUPPORT']}><AppShell area="admin">{children}</AppShell></ProtectedRoute>;
}
