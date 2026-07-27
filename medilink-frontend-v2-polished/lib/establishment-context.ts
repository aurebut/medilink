const ACTIVE_ESTABLISHMENT_KEY_PREFIX = 'medilink_active_establishment:';

export function activeEstablishmentStorageKey(userId: string) {
  return `${ACTIVE_ESTABLISHMENT_KEY_PREFIX}${userId}`;
}

export function readActiveEstablishmentId(userId?: string | null) {
  if (!userId || typeof window === 'undefined') return null;
  return window.localStorage.getItem(activeEstablishmentStorageKey(userId));
}

export function persistActiveEstablishmentId(userId: string, establishmentId: string | null) {
  if (typeof window === 'undefined') return;
  const key = activeEstablishmentStorageKey(userId);
  if (establishmentId) {
    window.localStorage.setItem(key, establishmentId);
  } else {
    window.localStorage.removeItem(key);
  }
}

export function establishmentDashboardPath(establishmentId: string) {
  return `/establishment/dashboard?establishmentId=${encodeURIComponent(establishmentId)}`;
}
