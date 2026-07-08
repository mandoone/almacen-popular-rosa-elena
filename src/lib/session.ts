/**
 * session.ts — Helpers de sesión admin.
 *
 * Usa Web Crypto API (globalThis.crypto.subtle): compatible con Edge Runtime
 * (Next.js middleware) y Node.js 18+. Sin dependencias externas.
 *
 * Token: "TIMESTAMP_MS.HMAC_SHA256_HEX"
 * Expira: SESSION_MAX_AGE_S segundos desde su emisión.
 */

export const COOKIE_NAME = 'admin_session';
export const SESSION_MAX_AGE_S = 8 * 60 * 60; // 8 horas
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_S * 1000;

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function makeSessionToken(secret: string): Promise<string> {
  const ts = Date.now().toString();
  const key = await importKey(secret);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ts));
  const sigHex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${ts}.${sigHex}`;
}

export async function verifySessionToken(
  token: string,
  secret: string
): Promise<boolean> {
  try {
    const dot = token.indexOf('.');
    if (dot === -1) return false;
    const tsStr = token.slice(0, dot);
    const sigHex = token.slice(dot + 1);
    const ts = parseInt(tsStr, 10);
    if (isNaN(ts) || Date.now() - ts > SESSION_MAX_AGE_MS) return false;
    const key = await importKey(secret);
    const sigBytes = new Uint8Array(
      (sigHex.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16))
    );
    return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(tsStr));
  } catch {
    return false;
  }
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
