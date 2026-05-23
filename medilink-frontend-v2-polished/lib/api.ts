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
  const hasJsonBody = options.body !== undefined && !(options.body instanceof FormData);
  const token = getAuthToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: hasJsonBody ? JSON.stringify(options.body) : (options.body as BodyInit | undefined),
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text ? { message: text } : null; }

  if (!response.ok) {
    throw new ApiError(normalizeError(payload), response.status, payload);
  }

  return payload as T;
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
