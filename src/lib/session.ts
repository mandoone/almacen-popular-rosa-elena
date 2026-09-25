/** Sesión firmada del panel. Compatible con Edge Runtime y Node.js. */
import {
  esRolOperativo,
  rolTieneCapacidad,
  type Capacidad,
  type RolOperativo,
} from './fase9/roles.ts';

export const COOKIE_NAME = 'admin_session';
export const SESSION_MAX_AGE_S = 8 * 60 * 60;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_S * 1000;

export const SESSION_ACTOR_HEADER = 'x-almacen-session-actor';
export const SESSION_NAME_HEADER = 'x-almacen-session-name';
export const SESSION_ROLE_HEADER = 'x-almacen-session-role';

export interface SessionIdentity {
  actor_id: string;
  nombre?: string;
  rol: RolOperativo;
  session_version?: number;
  secret_version?: string;
}

export interface SessionPayload extends SessionIdentity {
  iat: number;
  exp: number;
}

// PROVISORIO_TEST: la contraseña compartida crea esta identidad genérica hasta
// implementar el acceso multiusuario real. No asigna personas a roles.
export const LEGACY_TEST_IDENTITY: Readonly<SessionIdentity> = {
  actor_id: 'legacy-admin',
  rol: 'administracion',
};

export function permiteLoginLegacy(
  nodeEnv: string | undefined,
  appEnv: string | undefined,
  usuariosConfigurados = false,
  recuperacionExplicita = false
): boolean {
  const entornoApp = String(appEnv ?? '').trim().toLowerCase();
  const entornoSeguro = nodeEnv !== 'production' || entornoApp === 'test' || entornoApp === 'local';
  return entornoSeguro && (!usuariosConfigurados || recuperacionExplicita);
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): ArrayBuffer | null {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  const buffer = new ArrayBuffer(32);
  const bytes = new Uint8Array(buffer);
  hex.match(/.{2}/g)!.forEach((parte, indice) => {
    bytes[indice] = parseInt(parte, 16);
  });
  return buffer;
}

function encodeBase64Url(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  bytes.forEach((byte) => { binario += String.fromCharCode(byte); });
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(valor: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(valor)) throw new Error('Base64url inválido.');
  const base64 = valor.replace(/-/g, '+').replace(/_/g, '/');
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const binario = atob(base64 + relleno);
  return new TextDecoder().decode(Uint8Array.from(binario, (char) => char.charCodeAt(0)));
}

function payloadValido(valor: unknown, ahora: number): valor is SessionPayload {
  if (!valor || typeof valor !== 'object') return false;
  const payload = valor as Partial<SessionPayload>;
  if (typeof payload.actor_id !== 'string' ||
      !/^[a-z0-9][a-z0-9._@-]{0,99}$/.test(payload.actor_id)) return false;
  if (payload.nombre !== undefined &&
      (typeof payload.nombre !== 'string' || payload.nombre !== payload.nombre.trim() ||
       payload.nombre.length < 1 || payload.nombre.length > 120 ||
       /[\u0000-\u001f\u007f]/.test(payload.nombre))) return false;
  if (!esRolOperativo(payload.rol)) return false;
  if (payload.session_version !== undefined &&
      (!Number.isSafeInteger(payload.session_version) || payload.session_version < 1)) return false;
  if (payload.secret_version !== undefined &&
      (typeof payload.secret_version !== 'string' ||
       !/^[A-Za-z0-9._-]{1,32}$/.test(payload.secret_version))) return false;
  if ((payload.session_version === undefined) !== (payload.secret_version === undefined)) return false;
  if (!Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp)) return false;
  if (payload.exp! <= payload.iat!) return false;
  if (payload.exp! - payload.iat! > SESSION_MAX_AGE_MS) return false;
  if (payload.iat! > ahora + 60_000 || ahora >= payload.exp!) return false;
  return true;
}

export async function makeSessionToken(
  secret: string,
  identity: SessionIdentity = LEGACY_TEST_IDENTITY,
  ahora = Date.now()
): Promise<string> {
  if (!secret) throw new Error('Falta secreto de sesión.');
  if (!payloadValido({ ...identity, iat: ahora, exp: ahora + SESSION_MAX_AGE_MS }, ahora)) {
    throw new Error('Identidad de sesión inválida.');
  }
  const payload: SessionPayload = {
    actor_id: identity.actor_id,
    ...(identity.nombre ? { nombre: identity.nombre } : {}),
    rol: identity.rol,
    ...(identity.session_version ? { session_version: identity.session_version } : {}),
    ...(identity.secret_version ? { secret_version: identity.secret_version } : {}),
    iat: ahora,
    exp: ahora + SESSION_MAX_AGE_MS,
  };
  const encoded = encodeBase64Url(JSON.stringify(payload));
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded));
  return `${encoded}.${bytesToHex(new Uint8Array(signature))}`;
}

export interface SessionKeyring {
  current: { version: string; secret: string };
  previous?: { version: string; secret: string };
}

export type ResultadoKeyring =
  | { ok: true; keyring: SessionKeyring }
  | { ok: false; error: string };

export function crearSessionKeyring(config: {
  currentSecret?: string;
  currentVersion?: string;
  previousSecret?: string;
  previousVersion?: string;
}): ResultadoKeyring {
  const currentSecret = config.currentSecret ?? '';
  const currentVersion = config.currentVersion?.trim() || 'v1';
  if (currentSecret.length < 32 || !/^[A-Za-z0-9._-]{1,32}$/.test(currentVersion)) {
    return { ok: false, error: 'Configuración de sesión actual inválida.' };
  }
  const tieneSecretAnterior = Boolean(config.previousSecret);
  const tieneVersionAnterior = Boolean(config.previousVersion?.trim());
  if (tieneSecretAnterior !== tieneVersionAnterior) {
    return { ok: false, error: 'La rotación anterior de sesión está incompleta.' };
  }
  if (!tieneSecretAnterior) {
    return { ok: true, keyring: { current: { version: currentVersion, secret: currentSecret } } };
  }
  const previousSecret = config.previousSecret!;
  const previousVersion = config.previousVersion!.trim();
  if (previousSecret.length < 32 ||
      !/^[A-Za-z0-9._-]{1,32}$/.test(previousVersion) ||
      previousVersion === currentVersion ||
      previousSecret === currentSecret) {
    return { ok: false, error: 'Configuración de rotación de sesión inválida.' };
  }
  return {
    ok: true,
    keyring: {
      current: { version: currentVersion, secret: currentSecret },
      previous: { version: previousVersion, secret: previousSecret },
    },
  };
}

function versionSinVerificar(token: string): string | undefined {
  try {
    const encoded = token.split('.')[0];
    const payload = JSON.parse(decodeBase64Url(encoded)) as { secret_version?: unknown };
    return typeof payload.secret_version === 'string' ? payload.secret_version : undefined;
  } catch {
    return undefined;
  }
}

export async function readSessionTokenConRotacion(
  token: string,
  keyring: SessionKeyring,
  ahora = Date.now()
): Promise<SessionPayload | null> {
  const version = versionSinVerificar(token);
  const clave = version === undefined
    ? keyring.current
    : version === keyring.current.version
      ? keyring.current
      : version === keyring.previous?.version
        ? keyring.previous
        : null;
  if (!clave) return null;
  const payload = await readSessionToken(token, clave.secret, ahora);
  if (!payload) return null;
  if (payload.secret_version !== undefined && payload.secret_version !== clave.version) return null;
  return payload;
}

export async function readSessionToken(
  token: string,
  secret: string,
  ahora = Date.now()
): Promise<SessionPayload | null> {
  try {
    const partes = token.split('.');
    if (partes.length !== 2 || !secret) return null;
    const [encoded, sigHex] = partes;
    const signature = hexToBytes(sigHex);
    if (!signature) return null;
    const key = await importKey(secret);
    const firmaValida = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(encoded)
    );
    if (!firmaValida) return null;
    const payload: unknown = JSON.parse(decodeBase64Url(encoded));
    return payloadValido(payload, ahora) ? payload : null;
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  return (await readSessionToken(token, secret)) !== null;
}

export function actorIdFromRequest(request: Request): string {
  const actor = request.headers.get(SESSION_ACTOR_HEADER) ?? '';
  if (!/^[a-z0-9][a-z0-9._@-]{0,99}$/.test(actor)) {
    throw new Error('La sesión autenticada no contiene un actor válido.');
  }
  return actor;
}

export function sesionTieneCapacidad(request: Request, capacidad: Capacidad): boolean {
  const rol = request.headers.get(SESSION_ROLE_HEADER);
  return esRolOperativo(rol) && rolTieneCapacidad(rol, capacidad);
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
    priority: 'high' as const,
  };
}
