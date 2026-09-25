import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
import { leerUsuariosAdmin, sesionCorrespondeAUsuario } from '../src/lib/fase9/identidades.ts';
import { LimitadorIntentosLogin } from '../src/lib/fase9/proteccionLogin.ts';
import {
  crearSessionKeyring,
  makeSessionToken,
  readSessionTokenConRotacion,
  permiteLoginLegacy,
} from '../src/lib/session.ts';

// QA de identidad exclusivamente en el servidor Next local y el backend TEST.
// Las contraseñas sintéticas solo viven en este proceso. El archivo ignorado
// contiene hashes y una clave de sesión TEST, nunca contraseñas en claro.
const root = new URL('../', import.meta.url);
nextEnv.loadEnvConfig(fileURLToPath(root), true);
assert.equal(process.env.NEXT_PUBLIC_APP_ENV, 'test', 'Se exige entorno TEST.');
assert.ok(process.env.GOOGLE_SCRIPT_PEDIDOS_URL_TEST);
assert.ok(process.env.GOOGLE_SCRIPT_ADMIN_TOKEN_TEST);
assert.notEqual(process.env.GOOGLE_SCRIPT_PEDIDOS_URL_TEST, process.env.GOOGLE_SCRIPT_PEDIDOS_URL);
assert.notEqual(process.env.GOOGLE_SCRIPT_ADMIN_TOKEN_TEST, process.env.GOOGLE_SCRIPT_ADMIN_TOKEN);

const passwordHash = (password) => {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 310_000, 32, 'sha256');
  return `pbkdf2-sha256$310000$${salt.toString('base64url')}$${hash.toString('base64url')}`;
};
const accounts = [
  ['test-admin', 'administracion'],
  ['test-operacion', 'operacion'],
  ['test-venta', 'venta'],
].map(([actor_id, rol]) => {
  const password = randomBytes(32).toString('base64url');
  return { actor_id, rol, password, active: true, session_version: 1, password_hash: passwordHash(password) };
});
const users = accounts.map(({ actor_id, rol, active, session_version, password_hash }) =>
  ({ actor_id, rol, active, session_version, password_hash }));
const secret = randomBytes(48).toString('base64url');
const version = `qa-${Date.now().toString(36)}`;
const envPath = new URL('../.env.development.local', import.meta.url);
const marker = '# PROVISORIO_TEST: identidad sintética local. Contraseñas no almacenadas.';
const encodedUsers = (configuration) =>
  `base64url:${Buffer.from(JSON.stringify(configuration)).toString('base64url')}`;

function validate(configuration) {
  const result = leerUsuariosAdmin(JSON.stringify(configuration));
  assert.equal(result.estado, 'valida');
  assert.equal(leerUsuariosAdmin(encodedUsers(configuration)).estado, 'valida');
  assert.deepEqual(result.usuarios.map(({ actor_id, rol, active, session_version }) =>
    ({ actor_id, rol, active, session_version })), configuration.map(({ actor_id, rol, active, session_version }) =>
    ({ actor_id, rol, active, session_version })));
  assert.equal(permiteLoginLegacy('development', 'test', true, false), false);
  assert.equal(permiteLoginLegacy('production', 'production', true, true), false);
  assert.equal(crearSessionKeyring({ currentSecret: secret, currentVersion: version }).ok, true);
  return result;
}

async function saveTestConfig(configuration) {
  validate(configuration);
  const existing = await readFile(envPath, 'utf8').catch((error) => {
    if (error?.code === 'ENOENT') return null;
    throw error;
  });
  assert.ok(existing === null || existing.startsWith(`${marker}\n`),
    'Archivo de entorno preexistente ajeno al QA: no se sobrescribe.');
  const lines = [
    marker,
    'NEXT_PUBLIC_APP_ENV=test',
    // @next/env puede procesar $ dentro de los hashes PBKDF2 varias veces.
    `ADMIN_USERS_JSON=${encodedUsers(configuration)}`,
    `ADMIN_SESSION_SECRET=${secret}`,
    `ADMIN_SESSION_SECRET_VERSION=${version}`,
    'ADMIN_SESSION_SECRET_PREVIOUS=',
    'ADMIN_SESSION_SECRET_PREVIOUS_VERSION=',
    'ADMIN_LEGACY_RECOVERY_ENABLED=false',
    '',
  ];
  await writeFile(envPath, lines.join('\n'), { mode: 0o600 });
}

function randomPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

let child;
let base;
async function start(configuration) {
  await saveTestConfig(configuration);
  const port = await randomPort();
  base = `http://localhost:${port}`;
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', String(port)], {
    cwd: fileURLToPath(root),
    env: {
      ...process.env,
      NEXT_PUBLIC_APP_ENV: 'test',
      ADMIN_USERS_JSON: encodedUsers(configuration),
      ADMIN_SESSION_SECRET: secret,
      ADMIN_SESSION_SECRET_VERSION: version,
      ADMIN_SESSION_SECRET_PREVIOUS: '',
      ADMIN_SESSION_SECRET_PREVIOUS_VERSION: '',
      ADMIN_LEGACY_RECOVERY_ENABLED: 'false',
    },
    stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null) throw new Error('Next TEST no pudo iniciar.');
    try {
      const response = await fetch(`${base}/admin/login`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return;
    } catch { /* esperando arranque local */ }
    await delay(500);
  }
  throw new Error('Timeout al iniciar Next TEST.');
}

async function stop() {
  if (!child) return;
  const current = child;
  child = undefined;
  if (current.exitCode === null) {
    current.kill();
    await Promise.race([new Promise((resolve) => current.once('exit', resolve)), delay(5000)]);
  }
}

async function restart(configuration) {
  await stop();
  await start(configuration);
}

async function request(path, { method = 'GET', cookie, body, headers = {} } = {}) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  });
}

async function login(account, overrides = {}) {
  const response = await request('/api/admin/auth/login', {
    method: 'POST', body: { actor_id: account.actor_id, password: account.password, ...overrides },
  });
  assert.equal(response.status, 200, `Login ${account.actor_id}`);
  const setCookie = response.headers.get('set-cookie') ?? '';
  assert.match(setCookie, /^admin_session=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=strict/i);
  assert.match(setCookie, /Path=\//i);
  assert.doesNotMatch(setCookie, /Secure/i); // Servidor TEST local HTTP, no HTTPS.
  const cookie = setCookie.split(';')[0];
  const me = await request('/api/admin/auth/me', { cookie });
  assert.equal(me.status, 200);
  const data = (await me.json()).data;
  assert.equal(data.actor_id, account.actor_id);
  assert.equal(data.rol, account.rol);
  return { cookie, data };
}

async function expectStatus(path, status, options = {}) {
  const response = await request(path, options);
  assert.equal(response.status, status, `${options.method ?? 'GET'} ${path}`);
  return response;
}

try {
  await start(users);
  console.log('PASS | configuración TEST válida, tres actores sintéticos, legacy apagado');

  const loginPage = await expectStatus('/admin/login', 200);
  for (const header of ['content-security-policy', 'x-content-type-options', 'x-frame-options',
    'cross-origin-opener-policy', 'permissions-policy', 'strict-transport-security']) {
    assert.ok(loginPage.headers.get(header), `Falta ${header}`);
  }
  assert.match(loginPage.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  console.log('PASS | headers HTTP locales y CSP');

  const sessions = {};
  for (const account of accounts) {
    sessions[account.actor_id] = await login(account);
  }
  console.log('PASS | login, /me y cookies de admin/operacion/venta');

  const admin = sessions['test-admin'];
  const operacion = sessions['test-operacion'];
  const venta = sessions['test-venta'];
  assert.ok(admin.data.capacidades.includes('usuarios:gestionar'));
  assert.ok(operacion.data.capacidades.includes('compras:gestionar'));
  assert.ok(!operacion.data.capacidades.includes('usuarios:gestionar'));
  assert.ok(venta.data.capacidades.includes('pedidos:ver'));
  assert.ok(!venta.data.capacidades.includes('stock:ajustar'));
  await expectStatus('/api/admin/productos', 400, { method: 'PATCH', cookie: admin.cookie, body: {} });
  await expectStatus('/admin/compras', 200, { cookie: operacion.cookie });
  await expectStatus('/api/admin/productos', 403, { method: 'PATCH', cookie: operacion.cookie, body: {} });
  await expectStatus('/admin/vendedor', 200, { cookie: venta.cookie });
  await expectStatus('/api/admin/productos', 403, { method: 'PATCH', cookie: venta.cookie, body: {} });
  await expectStatus('/admin/compras', 307, { cookie: venta.cookie });
  console.log('PASS | autorizaciones positivas/negativas sin mutar datos');

  const wrong = await request('/api/admin/auth/login', {
    method: 'POST', body: { actor_id: 'test-admin', password: 'incorrecta' },
  });
  const missing = await request('/api/admin/auth/login', {
    method: 'POST', body: { actor_id: 'desconocido-qa', password: 'incorrecta' },
  });
  assert.equal(wrong.status, 401);
  assert.equal(missing.status, 401);
  assert.deepEqual(await wrong.json(), await missing.json());
  await expectStatus('/api/admin/auth/login', 400, {
    method: 'POST', body: { actor_id: 'test-venta', password: accounts[2].password, rol: 'administracion' },
  });
  const spoofed = await request('/api/admin/auth/me', {
    cookie: venta.cookie,
    headers: { 'x-almacen-session-actor': 'test-admin', 'x-almacen-session-role': 'administracion' },
  });
  assert.equal((await spoofed.json()).data.actor_id, 'test-venta');
  const [encoded, signature] = venta.cookie.split('=')[1].split('.');
  const forged = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  forged.rol = 'administracion';
  const forgedCookie = `admin_session=${Buffer.from(JSON.stringify(forged)).toString('base64url')}.${signature}`;
  await expectStatus('/api/admin/auth/me', 401, { cookie: forgedCookie });
  await expectStatus('/api/admin/auth/me', 401, { cookie: 'admin_session=invalid' });
  await expectStatus('/api/admin/auth/login', 401, {
    method: 'POST', body: { password: process.env.ADMIN_PANEL_PASSWORD },
  });
  await expectStatus('/api/admin/auth/logout', 403, {
    method: 'POST', cookie: venta.cookie, headers: { origin: 'https://otro.test', 'sec-fetch-site': 'cross-site' },
  });
  await expectStatus('/api/admin/auth/logout', 200, {
    method: 'POST', cookie: venta.cookie, headers: { origin: base, 'sec-fetch-site': 'same-origin' },
  });
  console.log('PASS | no enumeración, spoofing, legacy bypass ni origen cruzado');

  const revoked = users.map((user) => user.actor_id === 'test-venta'
    ? { ...user, session_version: 2 } : user);
  await restart(revoked);
  await expectStatus('/api/admin/auth/me', 401, { cookie: venta.cookie });
  const nuevaVenta = await login(accounts[2]);
  assert.equal(nuevaVenta.data.rol, 'venta');
  console.log('PASS | revocación por session_version y login posterior');

  const changed = users.map((user) => user.actor_id === 'test-operacion'
    ? { ...user, rol: 'venta', session_version: 2 } : user);
  await restart(changed);
  await expectStatus('/api/admin/auth/me', 401, { cookie: operacion.cookie });
  const changedAccount = { ...accounts[1], rol: 'venta' };
  const nuevaOperacion = await login(changedAccount);
  await expectStatus('/api/admin/productos', 403, {
    method: 'PATCH', cookie: nuevaOperacion.cookie, body: {},
  });
  await restart(users);
  const restored = await login(accounts[1]);
  assert.equal(restored.data.rol, 'operacion');
  console.log('PASS | cambio temporal de rol, invalidez y restauración baseline');

  const limiter = new LimitadorIntentosLogin();
  for (let i = 0; i < 5; i += 1) limiter.registrarFallo(['ip:qa', 'actor:qa'], i * 1000);
  assert.equal(limiter.consultar(['ip:qa'], 5000).permitido, false);
  assert.equal(limiter.consultar(['actor:qa'], 5000).permitido, false);
  assert.equal(limiter.consultar(['ip:qa'], 16 * 60 * 1000).permitido, true);
  console.log('PASS | rate limit local 5 fallos/15 min, IP/actor y expiración');

  const previousSecret = randomBytes(48).toString('base64url');
  const keyring = crearSessionKeyring({
    currentSecret: secret, currentVersion: version,
    previousSecret, previousVersion: 'qa-previous',
  });
  assert.equal(keyring.ok, true);
  const oldToken = await makeSessionToken(previousSecret, {
    actor_id: 'test-venta', rol: 'venta', session_version: 1, secret_version: 'qa-previous',
  });
  assert.ok(await readSessionTokenConRotacion(oldToken, keyring.keyring));
  assert.equal(await readSessionTokenConRotacion(oldToken, { current: keyring.keyring.current }), null);
  assert.equal(sesionCorrespondeAUsuario(validate(users), {
    actor_id: 'test-venta', rol: 'venta', session_version: 1,
  }), true);
  console.log('PASS | rotación de secreto con ventana anterior y cierre posterior');
  console.log('PASS | baseline TEST restaurado, sin escrituras al backend ni Producción');
} finally {
  await stop();
  await saveTestConfig(users);
}
