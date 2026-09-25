import { NextResponse } from 'next/server';
import {
  crearSessionKeyring,
  makeSessionToken,
  COOKIE_NAME,
  cookieOptions,
  permiteLoginLegacy,
  SESSION_MAX_AGE_S,
} from '@/lib/session';
import { autenticarUsuarioAdmin, leerUsuariosAdmin } from '@/lib/fase9/identidades';
import { clavesLimiteLogin, limitadorLogin } from '@/lib/fase9/proteccionLogin';

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(a)),
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(b)),
  ]);
  const bytesA = new Uint8Array(hashA);
  const bytesB = new Uint8Array(hashB);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) {
    diff |= bytesA[i] ^ bytesB[i];
  }
  return diff === 0;
}

function jsonSinCache(body: object, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export async function POST(req: Request) {
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 4_096) {
    return jsonSinCache({ ok: false, error: 'Solicitud inválida.' }, { status: 413 });
  }
  const adminPassword = process.env.ADMIN_PANEL_PASSWORD;
  const usuarios = leerUsuariosAdmin(process.env.ADMIN_USERS_JSON);
  const keyring = crearSessionKeyring({
    currentSecret: process.env.ADMIN_SESSION_SECRET,
    currentVersion: process.env.ADMIN_SESSION_SECRET_VERSION,
    previousSecret: process.env.ADMIN_SESSION_SECRET_PREVIOUS,
    previousVersion: process.env.ADMIN_SESSION_SECRET_PREVIOUS_VERSION,
  });
  if (usuarios.estado === 'invalida' || !keyring.ok) {
    return jsonSinCache(
      { ok: false, error: 'El acceso no está disponible.' },
      { status: 500 }
    );
  }

  let body: { actor_id?: string; password?: string };
  try {
    const desconocido: unknown = await req.json();
    if (!desconocido || typeof desconocido !== 'object' || Array.isArray(desconocido) ||
        Object.keys(desconocido).some((campo) => !['actor_id', 'password'].includes(campo))) {
      throw new Error('body inválido');
    }
    const candidato = desconocido as { actor_id?: unknown; password?: unknown };
    if ((candidato.actor_id !== undefined && typeof candidato.actor_id !== 'string') ||
        typeof candidato.password !== 'string' ||
        candidato.password.length < 1 || candidato.password.length > 256 ||
        (typeof candidato.actor_id === 'string' && candidato.actor_id.length > 100)) {
      throw new Error('campos inválidos');
    }
    body = { actor_id: candidato.actor_id, password: candidato.password };
  } catch {
    return jsonSinCache({ ok: false, error: 'Solicitud inválida.' }, { status: 400 });
  }

  const actorId = String(body.actor_id ?? '').trim().toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const clavesLimite = clavesLimiteLogin(req, actorId);
  const limite = limitadorLogin.consultar(clavesLimite);
  if (!limite.permitido) {
    const response = jsonSinCache(
      { ok: false, error: 'Demasiados intentos. Intenta más tarde.' },
      { status: 429 }
    );
    response.headers.set('Retry-After', String(limite.retryAfterS));
    return response;
  }

  let identity;
  let autenticado = false;
  if (usuarios.estado === 'valida' && actorId) {
    const usuario = await autenticarUsuarioAdmin(usuarios, actorId, password);
    if (usuario) {
      identity = {
        actor_id: usuario.actor_id,
        ...(usuario.nombre ? { nombre: usuario.nombre } : {}),
        rol: usuario.rol,
        session_version: usuario.session_version,
        secret_version: keyring.keyring.current.version,
      };
      autenticado = true;
    }
  } else {
    const recuperacionLegacy = process.env.ADMIN_LEGACY_RECOVERY_ENABLED === 'true';
    const legacyPermitido = permiteLoginLegacy(
      process.env.NODE_ENV,
      process.env.NEXT_PUBLIC_APP_ENV,
      usuarios.estado === 'valida',
      recuperacionLegacy
    );
    if (legacyPermitido && adminPassword && await timingSafeEqual(password, adminPassword)) {
      identity = undefined;
      autenticado = true;
    }
  }

  if (!autenticado) {
    const estado = limitadorLogin.registrarFallo(clavesLimite);
    const response = jsonSinCache(
      { ok: false, error: 'Credenciales inválidas.' },
      { status: 401 }
    );
    if (!estado.permitido) response.headers.set('Retry-After', String(estado.retryAfterS));
    return response;
  }

  limitadorLogin.registrarExito(clavesLimite);
  const token = await makeSessionToken(keyring.keyring.current.secret, identity);
  const res = jsonSinCache({ ok: true });
  res.cookies.set(COOKIE_NAME, token, cookieOptions(SESSION_MAX_AGE_S));
  return res;
}
