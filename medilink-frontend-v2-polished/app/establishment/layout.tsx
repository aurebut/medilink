'use client';

import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function EstablishmentLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['ESTABLISHMENT_OWNER', 'ESTABLISHMENT_ADMIN', 'ESTABLISHMENT_RECRUITER', 'ESTABLISHMENT_VIEWER']}><AppShell area="establishment">{children}</AppShell></ProtectedRoute>;
}
