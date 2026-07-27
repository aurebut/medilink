const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
const LEGACY_AUTH_TOKEN_KEY = 'medilink_auth_token';
const NETWORK_ERROR_MESSAGE = 'Impossible de joindre le service. Vérifiez votre connexion puis réessayez.';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  cacheMode?: 'default' | 'reload';
  invalidateCache?: boolean;
};

type CacheEntry = {
  expiresAt: number;
  promise: Promise<unknown>;
  value?: unknown;
};

const GET_CACHE_TTL_MS = 5 * 60_000;
const REVALIDATE_THROTTLE_MS = 15_000;
const getCache = new Map<string, CacheEntry>();
const revalidatedAt = new Map<string, number>();
const cacheListeners = new Map<string, Set<(value: unknown) => void>>();
const cacheVersions = new Map<string, number>();
let cacheGeneration = 0;

function cacheKey(path: string) {
  return path;
}

function emitApiCacheUpdate<T>(path: string, value: T) {
  const listeners = cacheListeners.get(cacheKey(path));
  if (!listeners?.size) return;
  listeners.forEach((listener) => listener(value));
}

function versionFor(path: string) {
  return cacheVersions.get(cacheKey(path)) || 0;
}

function bumpCacheVersion(path?: string) {
  if (!path) return;
  const key = cacheKey(path);
  cacheVersions.set(key, versionFor(path) + 1);
}

function revalidateApiCache(path: string) {
  const key = cacheKey(path);
  const now = Date.now();
  const last = revalidatedAt.get(key);
  if (last && now - last < REVALIDATE_THROTTLE_MS) return;

  revalidatedAt.set(key, now);
  void apiFetch(path, { method: 'GET', cacheMode: 'reload' }).catch(() => undefined);
}

export function clearApiCache(path?: string) {
  if (!path) {
    cacheGeneration += 1;
    getCache.clear();
    revalidatedAt.clear();
    return;
  }

  bumpCacheVersion(path);
  getCache.delete(cacheKey(path));
  revalidatedAt.delete(cacheKey(path));
}

export function subscribeApiCache<T>(path: string, listener: (value: T) => void) {
  const key = cacheKey(path);
  const listeners = cacheListeners.get(key) || new Set<(value: unknown) => void>();
  const wrapped = listener as (value: unknown) => void;
  listeners.add(wrapped);
  cacheListeners.set(key, listeners);

  return () => {
    listeners.delete(wrapped);
    if (!listeners.size) cacheListeners.delete(key);
  };
}

export function getApiCacheValue<T>(path: string) {
  const now = Date.now();
  const cached = getCache.get(cacheKey(path));
  if (cached && cached.expiresAt > now) return cached.promise as Promise<T>;

  return null;
}

export function primeApiCache<T>(path: string, value: T) {
  bumpCacheVersion(path);
  const expiresAt = Date.now() + GET_CACHE_TTL_MS;
  getCache.set(cacheKey(path), {
    expiresAt,
    promise: Promise.resolve(value),
    value,
  });
  emitApiCacheUpdate(path, value);
}

export function updateApiCache<T>(path: string, updater: (current: T | null) => T) {
  const next = updater(getApiCacheSync<T>(path));
  primeApiCache(path, next);
  return next;
}

export function getApiEventUrl(path: string) {
  const baseUrl = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  return new URL(`${API_URL}${path}`, baseUrl).toString();
}

export function getApiUrl(path: string) {
  return `${API_URL}${path}`;
}

export function clearLegacyAuthToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
}

function normalizeError(payload: any): string {
  if (!payload) return 'Erreur API.';
  if (typeof payload.message === 'string') return payload.message;
  if (Array.isArray(payload.message)) return payload.message.join('\n');
  if (typeof payload.error === 'string') return payload.error;
  return 'Erreur API.';
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const canUseCache = method === 'GET' && options.body === undefined;
  const shouldReadCache = canUseCache && options.cacheMode !== 'reload';
  const key = cacheKey(path);
  const now = Date.now();
  const requestCacheVersion = versionFor(path);
  const requestCacheGeneration = cacheGeneration;

  if (shouldReadCache) {
    const cached = getCache.get(key);
    if (cached && cached.expiresAt > now) {
      revalidateApiCache(path);
      return cached.promise as Promise<T>;
    }

  }

  const hasJsonBody = options.body !== undefined && !(options.body instanceof FormData);
  const { cacheMode: _cacheMode, invalidateCache: _invalidateCache, ...requestOptions } = options;
  const request = fetch(`${API_URL}${path}`, {
    ...requestOptions,
    credentials: 'include',
    headers: {
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(requestOptions.headers || {}),
    },
    body: hasJsonBody ? JSON.stringify(options.body) : (options.body as BodyInit | undefined),
  }).then(async (response) => {
    if (response.status === 204) return undefined as T;

    const text = await response.text();
    let payload: any = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text ? { message: text } : null; }

    if (!response.ok) {
      throw new ApiError(normalizeError(payload), response.status, payload);
    }

    if (canUseCache) {
      const cacheWasMutated =
        cacheGeneration !== requestCacheGeneration ||
        versionFor(path) !== requestCacheVersion;
      if (!cacheWasMutated) {
        getCache.set(key, {
          expiresAt: now + GET_CACHE_TTL_MS,
          promise: Promise.resolve(payload as T),
          value: payload,
        });
        emitApiCacheUpdate(path, payload as T);
      }
    }

    return payload as T;
  }).catch((error) => {
    if (canUseCache) getCache.delete(key);
    if (
      !(error instanceof ApiError) &&
      error instanceof Error &&
      /failed to fetch|networkerror|network request failed|load failed/i.test(error.message)
    ) {
      throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
    }
    throw error;
  });

  if (canUseCache && options.cacheMode !== 'reload') {
    getCache.set(key, {
      expiresAt: now + GET_CACHE_TTL_MS,
      promise: request,
    });
  } else if (method !== 'GET' && options.invalidateCache !== false) {
    clearApiCache();
  }

  return request;
}

export function getApiCacheSync<T>(path: string): T | null {
  const now = Date.now();
  const cached = getCache.get(cacheKey(path));
  if (cached && cached.expiresAt > now && cached.value !== undefined) {
    return cached.value as T;
  }
  return null;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  reload: <T>(path: string) => apiFetch<T>(path, { method: 'GET', cacheMode: 'reload' }),
  preload: (path: string) => { void apiFetch(path, { method: 'GET' }).catch(() => undefined); },
  getSync: <T>(path: string) => getApiCacheSync<T>(path),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  postSilent: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body, invalidateCache: false }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  patchSilent: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body, invalidateCache: false }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
  deleteSilent: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE', invalidateCache: false }),
};

export function isMockStorageUrl(url?: string) {
  return Boolean(url?.startsWith('mock://'));
}

export function openDocumentPreviewWindow() {
  if (typeof window === 'undefined') return null;

  const previewWindow = window.open('', '_blank');
  if (!previewWindow) return null;

  previewWindow.document.title = 'Document';
  previewWindow.document.body.style.fontFamily = 'system-ui, sans-serif';
  previewWindow.document.body.style.padding = '24px';
  previewWindow.document.body.textContent = 'Chargement du document...';
  return previewWindow;
}

export function showDocumentInPreview(url: string, previewWindow: Window | null) {
  if (previewWindow && !previewWindow.closed) {
    previewWindow.location.href = url;
    return;
  }

  window.location.href = url;
}
