import type { CurrentUser } from './types';
import { workspaceHomeForRole } from './access-control';

export function defaultRouteForUser(user?: CurrentUser | null) {
  if (!user) return '/login';
  if (user.status !== 'ACTIVE' || !user.emailVerified) return '/verify-email';
  return workspaceHomeForRole(user.role);
}

export function safePostLoginRoute(candidate: string | null, user?: CurrentUser | null) {
  const fallback = defaultRouteForUser(user);
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }

  if (candidate.includes('\\') || /[\u0000-\u001F\u007F]/.test(candidate)) {
    return fallback;
  }

  try {
    const base = new URL('https://medilink.invalid');
    const destination = new URL(candidate, base);
    if (destination.origin !== base.origin) return fallback;

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}

export function isEstablishmentRole(role?: string) {
  return Boolean(role?.startsWith('ESTABLISHMENT'));
}

export function isAdminRole(role?: string) {
  return role === 'MEDILINK_ADMIN' || role === 'MEDILINK_SUPPORT';
}
