import { esRolOperativo, type RolOperativo } from './roles.ts';

export const PBKDF2_ALGORITHM = 'pbkdf2-sha256';
export const PBKDF2_ITERATIONS = 310_000;
export const MAX_USUARIOS_ADMIN = 50;

export interface UsuarioAdmin {
  actor_id: string;
  nombre?: string;
  rol: RolOperativo;
  active: boolean;
  session_version: number;
  password_hash: string;
}

export type ConfiguracionUsuarios =
  | { estado: 'ausente'; usuarios: readonly [] }
  | { estado: 'invalida'; usuarios: readonly []; error: string }
  | { estado: 'valida'; usuarios: readonly UsuarioAdmin[] };

interface PasswordHash {
  iterations: number;
  salt: Uint8Array;
  hash: Uint8Array;
}

const CAMPOS_USUARIO = new Set([
  'actor_id',
  'nombre',
  'rol',
  'active',
  'session_version',
  'password_hash',
]);

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);
}

function base64UrlABytes(valor: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(valor)) return null;
  try {
    const base64 = valor.replace(/-/g, '+').replace(/_/g, '/');
    const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
    const binario = atob(base64 + relleno);
    return Uint8Array.from(binario, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function parsePasswordHash(valor: string): PasswordHash | null {
  const partes = valor.split('$');
  if (partes.length !== 4 || partes[0] !== PBKDF2_ALGORITHM) return null;
  const iterations = Number(partes[1]);
  const salt = base64UrlABytes(partes[2]);
  const hash = base64UrlABytes(partes[3]);
  if (!Number.isSafeInteger(iterations) ||
      iterations !== PBKDF2_ITERATIONS ||
      !salt || salt.byteLength < 16 ||
      !hash || hash.byteLength !== 32) return null;
  return { iterations, salt, hash };
}

function nombreValido(valor: unknown): valor is string {
  return typeof valor === 'string' &&
    valor === valor.trim() &&
    valor.length >= 1 &&
    valor.length <= 120 &&
    !/[\u0000-\u001f\u007f]/.test(valor);
}

export function actorIdValido(valor: unknown): valor is string {
  return typeof valor === 'string' && /^[a-z0-9][a-z0-9._@-]{0,99}$/.test(valor);
}

export function leerUsuariosAdmin(valor: string | undefined): ConfiguracionUsuarios {
  if (!valor?.trim()) return { estado: 'ausente', usuarios: [] };
  let json: unknown;
  try {
    const texto = valor.startsWith('base64url:')
      ? new TextDecoder('utf-8', { fatal: true }).decode(base64UrlABytes(valor.slice(10)) ?? new Uint8Array())
      : valor;
    json = JSON.parse(texto);
  } catch {
    return { estado: 'invalida', usuarios: [], error: 'ADMIN_USERS_JSON no es JSON válido.' };
  }
  if (!Array.isArray(json) || json.length < 1 || json.length > MAX_USUARIOS_ADMIN) {
    return {
      estado: 'invalida',
      usuarios: [],
      error: `ADMIN_USERS_JSON debe contener entre 1 y ${MAX_USUARIOS_ADMIN} cuentas.`,
    };
  }

  const usuarios: UsuarioAdmin[] = [];
  const actores = new Set<string>();
  for (const [indice, valorUsuario] of json.entries()) {
    if (!esObjeto(valorUsuario) ||
        Object.keys(valorUsuario).some((campo) => !CAMPOS_USUARIO.has(campo))) {
      return { estado: 'invalida', usuarios: [], error: `Cuenta ${indice + 1} inválida.` };
    }
    const { actor_id, nombre, rol, active, session_version, password_hash } = valorUsuario;
    if (!actorIdValido(actor_id) ||
        (nombre !== undefined && !nombreValido(nombre)) ||
        !esRolOperativo(rol) ||
        typeof active !== 'boolean' ||
        !Number.isSafeInteger(session_version) ||
        Number(session_version) < 1 ||
        Number(session_version) > 1_000_000 ||
        typeof password_hash !== 'string' ||
        !parsePasswordHash(password_hash) ||
        actores.has(String(actor_id))) {
      return { estado: 'invalida', usuarios: [], error: `Cuenta ${indice + 1} inválida.` };
    }
    actores.add(actor_id);
    usuarios.push({
      actor_id,
      ...(nombre ? { nombre } : {}),
      rol,
      active,
      session_version: Number(session_version),
      password_hash,
    });
  }
  return { estado: 'valida', usuarios };
}

function bytesIguales(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diferencia = 0;
  for (let indice = 0; indice < a.byteLength; indice += 1) {
    diferencia |= a[indice] ^ b[indice];
  }
  return diferencia === 0;
}

export async function verificarPasswordPBKDF2(
  password: string,
  passwordHash: string
): Promise<boolean> {
  const parsed = parsePasswordHash(passwordHash);
  if (!parsed || typeof password !== 'string' || password.length < 1 || password.length > 256) {
    return false;
  }
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: parsed.salt as BufferSource,
        iterations: parsed.iterations,
      },
      key,
      256
    );
    return bytesIguales(new Uint8Array(bits), parsed.hash);
  } catch {
    return false;
  }
}

// Obliga a pagar el mismo costo aproximado cuando el actor no existe y evita
// convertir el endpoint en un oráculo trivial de nombres de usuario.
const HASH_FALSO =
  'pbkdf2-sha256$310000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function autenticarUsuarioAdmin(
  configuracion: ConfiguracionUsuarios,
  actorId: string,
  password: string
): Promise<UsuarioAdmin | null> {
  if (configuracion.estado !== 'valida') return null;
  const actorNormalizado = String(actorId ?? '').trim().toLowerCase();
  const usuario = configuracion.usuarios.find((item) => item.actor_id === actorNormalizado);
  const passwordValido = await verificarPasswordPBKDF2(
    password,
    usuario?.password_hash ?? HASH_FALSO
  );
  return usuario?.active && passwordValido ? usuario : null;
}

export function sesionCorrespondeAUsuario(
  configuracion: ConfiguracionUsuarios,
  sesion: { actor_id: string; rol: RolOperativo; session_version?: number }
): boolean {
  if (configuracion.estado !== 'valida' || !Number.isSafeInteger(sesion.session_version)) {
    return false;
  }
  const usuario = configuracion.usuarios.find((item) => item.actor_id === sesion.actor_id);
  return Boolean(
    usuario?.active &&
    usuario.rol === sesion.rol &&
    usuario.session_version === sesion.session_version
  );
}
