'use client';

import { AppShell } from '@/components/AppShell';
import { AreaAccessGuard } from '@/components/AreaAccessGuard';
import {
  EstablishmentProvider,
  EstablishmentSelectionGate,
} from '@/components/EstablishmentSelector';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function EstablishmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['ESTABLISHMENT_OWNER', 'ESTABLISHMENT_ADMIN', 'ESTABLISHMENT_RECRUITER', 'ESTABLISHMENT_VIEWER']}>
      <EstablishmentProvider>
        <AreaAccessGuard area="establishment">
          <AppShell area="establishment">
            <EstablishmentSelectionGate>{children}</EstablishmentSelectionGate>
          </AppShell>
        </AreaAccessGuard>
      </EstablishmentProvider>
    </ProtectedRoute>
  );
}
