const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ORIGIN_EXEMPT_PATHS = new Set(['/api/billing/webhooks/stripe']);

export function isTrustedWriteRequest(
  method: string,
  path: string,
  origin: string | undefined,
  trustedOrigins: string[],
) {
  if (SAFE_METHODS.has(method.toUpperCase()) || ORIGIN_EXEMPT_PATHS.has(path)) {
    return true;
  }

  if (!origin) {
    return false;
  }

  try {
    return trustedOrigins.includes(new URL(origin).origin);
  } catch {
    return false;
  }
}
