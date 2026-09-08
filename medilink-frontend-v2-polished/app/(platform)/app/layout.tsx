'use client';

import { AppShell } from '@/components/AppShell';
import { AreaAccessGuard } from '@/components/AreaAccessGuard';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['CANDIDATE']}>
      <AreaAccessGuard area="candidate">
        <AppShell area="candidate">{children}</AppShell>
      </AreaAccessGuard>
    </ProtectedRoute>
  );
}
