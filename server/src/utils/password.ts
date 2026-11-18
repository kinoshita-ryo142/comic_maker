import crypto from 'node:crypto';

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH);
  const keyBuffer = Buffer.from(key, 'hex');
  if (derived.length !== keyBuffer.length) return false;
  return crypto.timingSafeEqual(derived, keyBuffer);
}
