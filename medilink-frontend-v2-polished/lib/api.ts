const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
const AUTH_TOKEN_KEY = 'medilink_auth_token';

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
};

const GET_CACHE_TTL_MS = 5 * 60_000;
const REVALIDATE_THROTTLE_MS = 15_000;
const SESSION_CACHE_PREFIX = 'medilink_api_cache:';
const getCache = new Map<string, CacheEntry>();
const revalidatedAt = new Map<string, number>();
const cacheListeners = new Map<string, Set<(value: unknown) => void>>();

function cacheKey(path: string) {
  return path;
}

function sessionCacheKey(path: string) {
  return `${SESSION_CACHE_PREFIX}${path}`;
}

function readSessionCache<T>(path: string, now: number) {
  if (typeof window === 'undefined') return null;

  const raw = window.sessionStorage.getItem(sessionCacheKey(path));
  if (!raw) return null;

  try {
    const cached = JSON.parse(raw) as { expiresAt: number; value: T };
    if (cached.expiresAt <= now) {
      window.sessionStorage.removeItem(sessionCacheKey(path));
      return null;
    }
    return cached.value;
  } catch {
    window.sessionStorage.removeItem(sessionCacheKey(path));
    return null;
  }
}

function writeSessionCache<T>(path: string, value: T, expiresAt: number) {
  if (typeof window === 'undefined' || value === undefined) return;

  try {
    window.sessionStorage.setItem(sessionCacheKey(path), JSON.stringify({ expiresAt, value }));
  } catch {
    // Storage can be full or unavailable; in-memory cache still covers the current view.
  }
}

function emitApiCacheUpdate<T>(path: string, value: T) {
  const listeners = cacheListeners.get(cacheKey(path));
  if (!listeners?.size) return;
  listeners.forEach((listener) => listener(value));
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
    getCache.clear();
    revalidatedAt.clear();
    if (typeof window !== 'undefined') {
      Object.keys(window.sessionStorage)
        .filter((key) => key.startsWith(SESSION_CACHE_PREFIX))
        .forEach((key) => window.sessionStorage.removeItem(key));
    }
    return;
  }

  getCache.delete(cacheKey(path));
  revalidatedAt.delete(cacheKey(path));
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(sessionCacheKey(path));
  }
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

  const sessionValue = readSessionCache<T>(path, now);
  if (sessionValue !== null) return Promise.resolve(sessionValue);

  return null;
}

export function primeApiCache<T>(path: string, value: T) {
  const expiresAt = Date.now() + GET_CACHE_TTL_MS;
  getCache.set(cacheKey(path), {
    expiresAt,
    promise: Promise.resolve(value),
  });
  writeSessionCache(path, value, expiresAt);
  emitApiCacheUpdate(path, value);
}

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getApiEventUrl(path: string) {
  const token = getAuthToken();
  const url = new URL(`${API_URL}${path}`);
  if (token) url.searchParams.set('access_token', token);
  return url.toString();
}

export function getApiUrl(path: string) {
  return `${API_URL}${path}`;
}

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  clearApiCache();
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  clearApiCache();
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
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

  if (shouldReadCache) {
    const cached = getCache.get(key);
    if (cached && cached.expiresAt > now) {
      revalidateApiCache(path);
      return cached.promise as Promise<T>;
    }

    const sessionValue = readSessionCache<T>(path, now);
    if (sessionValue !== null) {
      const promise = Promise.resolve(sessionValue);
      getCache.set(key, {
        expiresAt: now + GET_CACHE_TTL_MS,
        promise,
      });
      revalidateApiCache(path);
      return promise;
    }
  }

  const hasJsonBody = options.body !== undefined && !(options.body instanceof FormData);
  const token = getAuthToken();
  const { cacheMode: _cacheMode, invalidateCache: _invalidateCache, ...requestOptions } = options;
  const request = fetch(`${API_URL}${path}`, {
    ...requestOptions,
    credentials: 'include',
    headers: {
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      writeSessionCache(path, payload as T, now + GET_CACHE_TTL_MS);
      getCache.set(key, {
        expiresAt: now + GET_CACHE_TTL_MS,
        promise: Promise.resolve(payload as T),
      });
      emitApiCacheUpdate(path, payload as T);
    }

    return payload as T;
  }).catch((error) => {
    if (canUseCache) getCache.delete(key);
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

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  reload: <T>(path: string) => apiFetch<T>(path, { method: 'GET', cacheMode: 'reload' }),
  preload: (path: string) => { void apiFetch(path, { method: 'GET' }).catch(() => undefined); },
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  postSilent: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body, invalidateCache: false }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  patchSilent: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body, invalidateCache: false }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};

export function isMockStorageUrl(url?: string) {
  return Boolean(url?.startsWith('mock://'));
}

export function openDocumentPreviewWindow() {
  if (typeof window === 'undefined') return null;

  const previewWindow = window.open('', '_blank');
  if (!previewWindow) return null;

  previewWindow.document.write(
    '<!doctype html><title>Document</title><body style="font-family:system-ui,sans-serif;padding:24px">Chargement du document...</body>',
  );
  previewWindow.document.close();
  return previewWindow;
}

export function showDocumentInPreview(url: string, previewWindow: Window | null) {
  if (previewWindow && !previewWindow.closed) {
    previewWindow.location.href = url;
    return;
  }

  window.location.href = url;
}
