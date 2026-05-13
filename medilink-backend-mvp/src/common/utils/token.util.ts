import { randomBytes, createHash } from 'crypto';

export function createRawToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
