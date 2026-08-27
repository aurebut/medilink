import type { UserRole } from './types';

export type EstablishmentCapability =
  | 'view_recruitment'
  | 'create_mission'
  | 'manage_billing'
  | 'manage_establishment'
  | 'create_establishment'
  | 'delete_establishment';

const ESTABLISHMENT_ROLES: UserRole[] = [
  'ESTABLISHMENT_OWNER',
  'ESTABLISHMENT_ADMIN',
  'ESTABLISHMENT_RECRUITER',
  'ESTABLISHMENT_VIEWER',
];

export function isEstablishmentAccountRole(role?: UserRole | null) {
  return Boolean(role && ESTABLISHMENT_ROLES.includes(role));
}

export function canAccessCandidatePath(
  role: UserRole | null | undefined,
  pathname: string,
) {
  if (role !== 'CANDIDATE') return false;
  return pathname !== '/app/billing' && !pathname.startsWith('/app/billing/');
}

export function hasEstablishmentCapability(
  role: UserRole | null | undefined,
  capability: EstablishmentCapability,
) {
  if (!role || !isEstablishmentAccountRole(role)) return false;

  if (capability === 'view_recruitment') {
    return role !== 'ESTABLISHMENT_VIEWER';
  }

  if (
    capability === 'create_mission'
    || capability === 'manage_billing'
    || capability === 'manage_establishment'
  ) {
    return role === 'ESTABLISHMENT_OWNER' || role === 'ESTABLISHMENT_ADMIN';
  }

  if (capability === 'create_establishment' || capability === 'delete_establishment') {
    return role === 'ESTABLISHMENT_OWNER';
  }

  return false;
}

export function canAccessEstablishmentPath(
  role: UserRole | null | undefined,
  pathname: string,
) {
  if (!isEstablishmentAccountRole(role)) return false;

  if (
    pathname === '/establishment/account'
    || pathname.startsWith('/establishment/account/')
    || pathname === '/establishment/notifications'
    || pathname.startsWith('/establishment/notifications/')
    || pathname === '/establishment/messages'
    || pathname.startsWith('/establishment/messages/')
  ) {
    return true;
  }

  if (
    pathname === '/establishment/onboarding'
    || pathname.startsWith('/establishment/onboarding/')
    || pathname.startsWith('/establishment/edit/')
  ) {
    return hasEstablishmentCapability(role, 'manage_establishment');
  }

  if (
    pathname === '/establishment/missions/new'
    || pathname.startsWith('/establishment/missions/new/')
  ) {
    return hasEstablishmentCapability(role, 'create_mission');
  }

  if (
    pathname === '/establishment/dashboard'
    || pathname.startsWith('/establishment/dashboard/')
    || pathname === '/establishment/agenda'
    || pathname.startsWith('/establishment/agenda/')
    || pathname === '/establishment/missions'
    || pathname.startsWith('/establishment/missions/')
    || pathname === '/establishment/current-missions'
    || pathname.startsWith('/establishment/current-missions/')
    || pathname.startsWith('/establishment/candidates/')
  ) {
    return hasEstablishmentCapability(role, 'view_recruitment');
  }

  return false;
}

export function canAccessAdminPath(
  role: UserRole | null | undefined,
  pathname: string,
) {
  if (role === 'MEDILINK_ADMIN') return pathname.startsWith('/admin');
  if (role !== 'MEDILINK_SUPPORT') return false;
  return pathname === '/admin/account' || pathname.startsWith('/admin/account/');
}

export function workspaceHomeForRole(role?: UserRole | null) {
  if (role === 'MEDILINK_SUPPORT') return '/admin/account';
  if (role === 'MEDILINK_ADMIN') return '/admin/dashboard';
  if (role === 'ESTABLISHMENT_VIEWER') return '/establishment/messages';
  if (isEstablishmentAccountRole(role)) return '/establishment/dashboard';
  if (role === 'CANDIDATE') return '/app/dashboard';
  return '/login';
}
