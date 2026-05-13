'use client';

import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={['CANDIDATE']}><AppShell area="candidate">{children}</AppShell></ProtectedRoute>;
}
