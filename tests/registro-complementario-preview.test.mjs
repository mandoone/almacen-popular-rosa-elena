import assert from 'node:assert/strict';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { leerAccesoAdmin } from '../src/lib/fase9/accesoAdmin.ts';
import { MAX_VERSION_SESION_ADMIN, sesionCorrespondeAUsuario } from '../src/lib/fase9/identidades.ts';
import { COOKIE_NAME, makeSessionToken } from '../src/lib/session.ts';

const scope = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_APP_ENV: 'test',
  VERCEL_ENV: 'preview',
  VERCEL_TARGET_ENV: 'preview',
  VERCEL_GIT_COMMIT_REF: 'feature/fase-3a-operativa',
};
const clavePrincipal = randomBytes(24).toString('base64url');
const claveOmar = randomBytes(24).toString('base64url');
function cuenta(actor_id, rol, clave, session_version = 1) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(clave, salt, 310_000, 32, 'sha256');
  return {
    actor_id, rol, active: true, session_version,
    password_hash: ['pbkdf2-sha256', 310_000, salt.toString('base64url'), hash.toString('base64url')].join('$'),
  };
}
const principal = cuenta('operadora-existente', 'operacion', clavePrincipal, 4);
const omar = { ...cuenta('omar-test', 'administracion', claveOmar), nombre: 'Omar TEST' };
const encode = (...usuarios) => 'base64url:' + Buffer.from(JSON.stringify(usuarios)).toString('base64url');
const config = (extra = {}) => ({
  ...scope,
  ADMIN_USERS_JSON: encode(principal),
  ADMIN_USERS_PREVIEW_ADDITIONAL_JSON: encode(omar),
  ...extra,
});

test('solo el Preview TEST de la rama exacta incorpora una cuenta y conserva el registro original íntegro', () => {
  assert.deepEqual(leerAccesoAdmin(config()).usuarios.usuarios, [
    principal, { ...omar, session_version: MAX_VERSION_SESION_ADMIN + omar.session_version },
  ]);
  for (const otro of [
    { NEXT_PUBLIC_APP_ENV: 'production' },
    { NEXT_PUBLIC_APP_ENV: undefined },
    { VERCEL_ENV: 'production' },
    { VERCEL_ENV: 'development' },
    { VERCEL_ENV: undefined },
    { VERCEL_TARGET_ENV: 'staging' },
    { VERCEL_TARGET_ENV: undefined },
    { VERCEL_GIT_COMMIT_REF: 'main' },
    { VERCEL_GIT_COMMIT_REF: 'feature/fase-3a-operativa-otra' },
    { VERCEL_GIT_COMMIT_REF: undefined },
  ]) {
    assert.deepEqual(leerAccesoAdmin(config(otro)).usuarios.usuarios, [principal]);
  }
});

test('una cuenta original duplicada conserva clave, rol, versión y revocación', () => {
  const original = { ...omar, rol: 'venta', active: false, session_version: 8, password_hash: principal.password_hash };
  const { usuarios } = leerAccesoAdmin(config({ ADMIN_USERS_JSON: encode(principal, original) }));
  assert.deepEqual(usuarios.usuarios, [principal, original]);
  assert.equal(sesionCorrespondeAUsuario(usuarios, omar), false);
});

test('rechaza complemento malformado, duplicado, ajeno, de rol distinto o sobre capacidad sin perder cuentas originales', () => {
  for (const entrada of [
    'base64url:!', '[]', encode(omar, omar),
    encode({ ...omar, actor_id: 'otro-administrador' }),
    encode({ ...omar, rol: 'venta' }),
    encode({ ...omar, password_hash: 'sin-pbkdf2' }),
    encode({ ...omar, session_version: 0 }),
  ]) {
    assert.deepEqual(leerAccesoAdmin(config({ ADMIN_USERS_PREVIEW_ADDITIONAL_JSON: entrada })).usuarios.usuarios, [principal]);
  }
  const llenos = Array.from({ length: 50 }, (_, i) => ({ ...principal, actor_id: 'persona-' + i }));
  assert.deepEqual(leerAccesoAdmin(config({ ADMIN_USERS_JSON: encode(...llenos) })).usuarios.usuarios, llenos);
  assert.equal(leerAccesoAdmin(config({ ADMIN_USERS_JSON: '[' })).usuarios.estado, 'invalida');
  assert.equal(leerAccesoAdmin(config({ ADMIN_USERS_JSON: undefined })).usuarios.estado, 'ausente');
});

test('legacy permanece bloqueado en Preview operativo incluso si se configura explícitamente o falta el registro', () => {
  for (const ADMIN_USERS_JSON of [undefined, '{', encode(principal)]) {
    assert.equal(leerAccesoAdmin(config({ ADMIN_USERS_JSON, ADMIN_LEGACY_RECOVERY_ENABLED: 'true' })).legacyPermitido, false);
  }
  assert.equal(leerAccesoAdmin({ NODE_ENV: 'development', NEXT_PUBLIC_APP_ENV: 'local' }).legacyPermitido, true);
  assert.equal(leerAccesoAdmin({ NODE_ENV: 'production', NEXT_PUBLIC_APP_ENV: 'production' }).legacyPermitido, false);
});

test('Production conserva el registro y la política legacy aunque el complemento esté presente', () => {
  const production = {
    NEXT_PUBLIC_APP_ENV: 'production',
    VERCEL_ENV: 'production',
    VERCEL_TARGET_ENV: 'production',
    VERCEL_GIT_COMMIT_REF: 'main',
    ADMIN_LEGACY_RECOVERY_ENABLED: 'true',
  };
  const { usuarios, legacyPermitido } = leerAccesoAdmin(config(production));
  assert.deepEqual(usuarios.usuarios, [principal]);
  assert.equal(legacyPermitido, false);
  assert.equal(sesionCorrespondeAUsuario(usuarios, principal), true);
  assert.equal(sesionCorrespondeAUsuario(usuarios, omar), false);
  assert.equal(leerAccesoAdmin(config({ ...production, ADMIN_USERS_JSON: '{' })).usuarios.estado, 'invalida');
  assert.equal(leerAccesoAdmin(config({ ...production, ADMIN_USERS_JSON: undefined })).usuarios.estado, 'ausente');
});

// Carga los handlers reales con los alias que Next resuelve al construir la aplicación.
const aliases = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/server') return nextResolve('next/server.js', context);
    if (!specifier.startsWith('@/')) return nextResolve(specifier, context);
    const url = new URL('../src/' + specifier.slice(2) + '.ts', import.meta.url);
    assert.ok(existsSync(fileURLToPath(url)));
    return nextResolve(url.href, context);
  },
});
const { NextRequest } = await import('next/server');
const { POST } = await import('../src/app/api/admin/auth/login/route.ts');
const { GET: me } = await import('../src/app/api/admin/auth/me/route.ts');
const { POST: logout } = await import('../src/app/api/admin/auth/logout/route.ts');
const { middleware } = await import('../src/middleware.ts');
aliases.deregister();

test('login y middleware comparten el registro: /me, acceso administrativo, revocación y sesión legacy', async t => {
  const claveSesion = randomBytes(32).toString('base64url');
  const env = {
    ...config(),
    ADMIN_SESSION_SECRET: claveSesion,
    ADMIN_SESSION_SECRET_VERSION: 'v1',
    ADMIN_SESSION_SECRET_PREVIOUS: '',
    ADMIN_SESSION_SECRET_PREVIOUS_VERSION: '',
    ADMIN_LEGACY_RECOVERY_ENABLED: 'true',
    ADMIN_PANEL_PASSWORD: randomBytes(24).toString('base64url'),
  };
  const anteriores = Object.fromEntries(Object.keys(env).map(k => [k, process.env[k]]));
  t.after(() => {
    for (const [k, v] of Object.entries(anteriores)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
  Object.assign(process.env, env);

  const base = 'https://acceso.example.test';
  const login = (actor_id, password) => POST(new Request(base + '/api/admin/auth/login', {
    method: 'POST', body: JSON.stringify({ actor_id, password }),
  }));
  const acceso = (ruta, cookie) => middleware(new NextRequest(base + ruta, { headers: { cookie } }));
  const sesionOriginal = await login(principal.actor_id, clavePrincipal);
  assert.equal(sesionOriginal.status, 200);

  const sesionOmar = await login('omar-test', claveOmar);
  assert.equal(sesionOmar.status, 200);
  const cookieOmar = sesionOmar.cookies.get(COOKIE_NAME);
  const cookie = COOKIE_NAME + '=' + cookieOmar.value;
  const verificado = await acceso('/api/admin/auth/me', cookie);
  const headers = new Headers();
  for (const header of verificado.headers.get('x-middleware-override-headers').split(',')) {
    headers.set(header, verificado.headers.get('x-middleware-request-' + header));
  }
  const identidad = await (await me(new Request(base + '/api/admin/auth/me', { headers }))).json();
  assert.equal(identidad.data.actor_id, 'omar-test');
  assert.equal(identidad.data.rol, 'administracion');
  for (const ruta of ['productos', 'inventario', 'compras', 'gastos', 'caja', 'configuracion-inicial']) {
    assert.equal((await acceso('/admin/' + ruta, cookie)).headers.get('x-middleware-next'), '1');
  }
  assert.equal((await logout()).cookies.get(COOKIE_NAME).maxAge, 0);
  assert.equal((await acceso('/api/admin/auth/me', COOKIE_NAME + '=')).status, 401);

  // Las dos fuentes incluso con el mismo actor, rol y versión de registro
  // no pueden aceptar la cookie emitida bajo la otra cuenta.
  process.env.ADMIN_USERS_JSON = encode(principal, { ...omar, password_hash: principal.password_hash });
  assert.equal((await acceso('/api/admin/auth/me', cookie)).status, 401);
  assert.equal((await login('omar-test', claveOmar)).status, 401);
  const sesionOmarOriginal = await login('omar-test', clavePrincipal);
  assert.equal(sesionOmarOriginal.status, 200);
  const cookieOmarOriginal = COOKIE_NAME + '=' + sesionOmarOriginal.cookies.get(COOKIE_NAME).value;
  assert.equal((await acceso('/api/admin/auth/me', cookieOmarOriginal)).status, 200);
  process.env.ADMIN_USERS_JSON = encode(principal);
  assert.equal((await acceso('/api/admin/auth/me', cookieOmarOriginal)).status, 401);

  process.env.ADMIN_USERS_PREVIEW_ADDITIONAL_JSON = encode({ ...omar, session_version: 2 });
  assert.equal((await acceso('/api/admin/auth/me', cookie)).status, 401);
  process.env.ADMIN_USERS_PREVIEW_ADDITIONAL_JSON = encode({ ...omar, active: false, session_version: 3 });
  assert.equal((await login('omar-test', claveOmar)).status, 401);
  assert.equal((await acceso('/api/admin/auth/me', COOKIE_NAME + '=' + sesionOriginal.cookies.get(COOKIE_NAME).value)).status, 200);

  assert.equal((await login('', env.ADMIN_PANEL_PASSWORD)).status, 401);
  const legacy = COOKIE_NAME + '=' + await makeSessionToken(claveSesion);
  assert.equal((await acceso('/api/admin/auth/me', legacy)).status, 401);
});
