import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  autenticarUsuarioAdmin,
  leerUsuariosAdmin,
  sesionCorrespondeAUsuario,
} from '../src/lib/fase9/identidades.ts';
import { LimitadorIntentosLogin } from '../src/lib/fase9/proteccionLogin.ts';
import { solicitudAdminMismoOrigen } from '../src/lib/fase9/seguridadHttp.ts';
import { validarManifiestoF10, CHECKS_F10 } from '../scripts/preflight-f10-readiness.mjs';
import {
  crearSessionKeyring,
  makeSessionToken,
  permiteLoginLegacy,
  readSessionTokenConRotacion,
} from '../src/lib/session.ts';

function passwordHash(password, salt = Buffer.alloc(16, 7)) {
  const hash = pbkdf2Sync(password, salt, 310_000, 32, 'sha256');
  return `pbkdf2-sha256$310000$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

function config(overrides = {}) {
  return JSON.stringify([{
    actor_id: 'usuario-test-01',
    rol: 'operacion',
    active: true,
    session_version: 1,
    password_hash: passwordHash('password-test-segura'),
    ...overrides,
  }]);
}

test('F9 global: configuración multiusuario es estricta, individual y sin nombres hardcodeados', async () => {
  const usuarios = leerUsuariosAdmin(config());
  assert.equal(usuarios.estado, 'valida');
  const autenticado = await autenticarUsuarioAdmin(
    usuarios,
    'USUARIO-TEST-01',
    'password-test-segura'
  );
  assert.equal(autenticado?.actor_id, 'usuario-test-01');
  assert.equal(autenticado?.rol, 'operacion');
  assert.equal(await autenticarUsuarioAdmin(usuarios, 'usuario-test-01', 'incorrecta'), null);
  assert.equal(await autenticarUsuarioAdmin(usuarios, 'no-existe', 'incorrecta'), null);
});

test('F9 global: configuración inválida o duplicada falla cerrada', () => {
  assert.equal(leerUsuariosAdmin(undefined).estado, 'ausente');
  assert.equal(leerUsuariosAdmin('{').estado, 'invalida');
  const duplicada = JSON.stringify([
    JSON.parse(config())[0],
    JSON.parse(config())[0],
  ]);
  assert.equal(leerUsuariosAdmin(duplicada).estado, 'invalida');
  assert.equal(leerUsuariosAdmin(config({ rol: 'superadmin' })).estado, 'invalida');
  assert.equal(leerUsuariosAdmin(config({ campo_extra: true })).estado, 'invalida');
});

test('F9 global: ADMIN_USERS_JSON admite transporte base64url sin expansión de $', async () => {
  const json = config();
  const encoded = `base64url:${Buffer.from(json).toString('base64url')}`;
  const usuarios = leerUsuariosAdmin(encoded);
  assert.equal(usuarios.estado, 'valida');
  assert.equal((await autenticarUsuarioAdmin(
    usuarios, 'usuario-test-01', 'password-test-segura'
  ))?.rol, 'operacion');
  assert.equal(leerUsuariosAdmin('base64url:!').estado, 'invalida');
  assert.equal(leerUsuariosAdmin('base64url:e30').estado, 'invalida');
  const duplicate = JSON.stringify([JSON.parse(json)[0], JSON.parse(json)[0]]);
  assert.equal(leerUsuariosAdmin(`base64url:${Buffer.from(duplicate).toString('base64url')}`).estado, 'invalida');
});

test('F9 global: revocar, cambiar rol o subir session_version invalida la sesión', () => {
  const sesion = { actor_id: 'usuario-test-01', rol: 'operacion', session_version: 1 };
  assert.equal(sesionCorrespondeAUsuario(leerUsuariosAdmin(config()), sesion), true);
  assert.equal(sesionCorrespondeAUsuario(leerUsuariosAdmin(config({ active: false })), sesion), false);
  assert.equal(sesionCorrespondeAUsuario(leerUsuariosAdmin(config({ rol: 'venta' })), sesion), false);
  assert.equal(sesionCorrespondeAUsuario(leerUsuariosAdmin(config({ session_version: 2 })), sesion), false);
});

test('F9 global: rotación acepta solo clave actual o anterior identificada', async () => {
  const keyring = crearSessionKeyring({
    currentSecret: 'secreto-actual-con-al-menos-32-caracteres',
    currentVersion: 'v2',
    previousSecret: 'secreto-anterior-con-al-menos-32-caracteres',
    previousVersion: 'v1',
  });
  assert.equal(keyring.ok, true);
  const identidad = {
    actor_id: 'usuario-test-01', rol: 'venta', session_version: 3, secret_version: 'v1',
  };
  const anterior = await makeSessionToken(keyring.keyring.previous.secret, identidad);
  assert.equal((await readSessionTokenConRotacion(anterior, keyring.keyring))?.actor_id, identidad.actor_id);
  const versionDesconocida = await makeSessionToken(keyring.keyring.current.secret, {
    ...identidad, secret_version: 'v0',
  });
  assert.equal(await readSessionTokenConRotacion(versionDesconocida, keyring.keyring), null);
  assert.equal(crearSessionKeyring({ currentSecret: 'corto' }).ok, false);
});

test('F9 global: legacy queda aislado cuando existen usuarios salvo recuperación explícita', () => {
  assert.equal(permiteLoginLegacy('production', 'production', false, true), false);
  assert.equal(permiteLoginLegacy('production', 'test', true, false), false);
  assert.equal(permiteLoginLegacy('production', 'test', true, true), true);
  assert.equal(permiteLoginLegacy('development', 'local', false, false), true);
});

test('F9 global: rate limit bloquea por IP o actor al quinto fallo y se puede limpiar con éxito', () => {
  const limitador = new LimitadorIntentosLogin();
  const claves = ['ip:127.0.0.1', 'actor:usuario-test-01'];
  for (let i = 0; i < 4; i += 1) {
    assert.equal(limitador.registrarFallo(claves, 1_000 + i).permitido, true);
  }
  const bloqueado = limitador.registrarFallo(claves, 1_005);
  assert.equal(bloqueado.permitido, false);
  assert.ok(bloqueado.retryAfterS > 0);
  assert.equal(limitador.consultar(['actor:usuario-test-01'], 2_000).permitido, false);
  limitador.registrarExito(claves);
  assert.equal(limitador.consultar(claves, 2_001).permitido, true);
});

test('F9 global: mutaciones admin rechazan origen cross-site', () => {
  assert.equal(solicitudAdminMismoOrigen(new Request('https://almacen.test/api/admin/pedidos', {
    method: 'POST', headers: { origin: 'https://almacen.test', 'sec-fetch-site': 'same-origin' },
  })), true);
  assert.equal(solicitudAdminMismoOrigen(new Request('https://almacen.test/api/admin/pedidos', {
    method: 'POST', headers: { origin: 'https://hostil.test', 'sec-fetch-site': 'cross-site' },
  })), false);
  assert.equal(solicitudAdminMismoOrigen(new Request('https://almacen.test/api/admin/pedidos')), true);
});

test('F9 global: login y middleware usan cuentas, revocación, rate limit y origen', async () => {
  const login = await readFile(new URL('../src/app/api/admin/auth/login/route.ts', import.meta.url), 'utf8');
  const middleware = await readFile(new URL('../src/middleware.ts', import.meta.url), 'utf8');
  assert.match(login, /autenticarUsuarioAdmin/);
  assert.match(login, /limitadorLogin/);
  assert.match(login, /Credenciales inválidas/);
  assert.match(login, /Object\.keys\(desconocido\)/);
  assert.match(middleware, /sesionCorrespondeAUsuario/);
  assert.match(middleware, /solicitudAdminMismoOrigen/);
});

test('F10: manifiesto exige evidencia para todos los checks de puesta en marcha', async () => {
  const ejemplo = JSON.parse(await readFile(
    new URL('../config/f10-readiness.example.json', import.meta.url),
    'utf8'
  ));
  const resultado = validarManifiestoF10(ejemplo);
  assert.equal(resultado.valido, true);
  assert.equal(resultado.resumen.pending, CHECKS_F10.length);
  assert.equal(validarManifiestoF10({ version: 1, fecha_corte: '2026-09-25', checks: {} }).valido, false);
});
