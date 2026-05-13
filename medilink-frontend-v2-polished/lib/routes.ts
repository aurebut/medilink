import type { CurrentUser } from './types';

export function defaultRouteForUser(user?: CurrentUser | null) {
  if (!user) return '/login';
  if (user.role === 'MEDILINK_ADMIN' || user.role === 'MEDILINK_SUPPORT') return '/admin/dashboard';
  if (user.role.startsWith('ESTABLISHMENT')) return '/establishment/dashboard';
  return '/app/dashboard';
}

export function isEstablishmentRole(role?: string) {
  return Boolean(role?.startsWith('ESTABLISHMENT'));
}

export function isAdminRole(role?: string) {
  return role === 'MEDILINK_ADMIN' || role === 'MEDILINK_SUPPORT';
}
