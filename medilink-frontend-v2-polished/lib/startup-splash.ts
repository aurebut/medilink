import type { CurrentUser } from './types';

const PLATFORM_SPLASH_SEEN_KEY_PREFIX = 'medilink_platform_splash_seen';

export function splashSeenKey(user?: Pick<CurrentUser, 'id'> | null) {
  return `${PLATFORM_SPLASH_SEEN_KEY_PREFIX}:${user?.id || 'anonymous'}`;
}

export function resetPlatformSplash() {
  if (typeof window === 'undefined') return;
  Object.keys(window.sessionStorage)
    .filter((key) => key.startsWith(`${PLATFORM_SPLASH_SEEN_KEY_PREFIX}:`))
    .forEach((key) => window.sessionStorage.removeItem(key));
}
