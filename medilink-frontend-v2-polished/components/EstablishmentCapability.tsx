'use client';

import type { ReactNode } from 'react';
import { hasEstablishmentCapability, type EstablishmentCapability } from '@/lib/access-control';
import { useAuth } from './AuthProvider';

export function EstablishmentCapabilityGate({
  capability,
  children,
  fallback = null,
}: {
  capability: EstablishmentCapability;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { user } = useAuth();
  return hasEstablishmentCapability(user?.role, capability) ? <>{children}</> : <>{fallback}</>;
}
