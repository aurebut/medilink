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
};

type CacheEntry = {
  expiresAt: number;
  promise: Promise<unknown>;
};

const GET_CACHE_TTL_MS = 15_000;
const getCache = new Map<string, CacheEntry>();

function cacheKey(path: string) {
  return path;
}

export function clearApiCache(path?: string) {
  if (!path) {
    getCache.clear();
    return;
  }

  getCache.delete(cacheKey(path));
}

export function primeApiCache<T>(path: string, value: T) {
  getCache.set(cacheKey(path), {
    expiresAt: Date.now() + GET_CACHE_TTL_MS,
    promise: Promise.resolve(value),
  });
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
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
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
  const key = cacheKey(path);
  const now = Date.now();

  if (canUseCache) {
    const cached = getCache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.promise as Promise<T>;
    }
  }

  const hasJsonBody = options.body !== undefined && !(options.body instanceof FormData);
  const token = getAuthToken();
  const request = fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
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

    return payload as T;
  }).catch((error) => {
    if (canUseCache) getCache.delete(key);
    throw error;
  });

  if (canUseCache) {
    getCache.set(key, {
      expiresAt: now + GET_CACHE_TTL_MS,
      promise: request,
    });
  } else if (method !== 'GET') {
    clearApiCache();
  }

  return request;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
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
