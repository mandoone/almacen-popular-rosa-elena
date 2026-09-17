import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  CONFIRMACION_F78_ESCRITURAS,
  CONFIRMACION_F78_MIGRACION,
  crearIdsF78,
  errorSeguroF78,
  esGetSinAccionTransitorioF78,
  validarConfiguracionF78,
  validarDestinoF78,
} from '../scripts/lib/fase78-e2e-guardrails.mjs';

const base = {
  NEXT_PUBLIC_APP_ENV: 'test',
  GOOGLE_SCRIPT_PEDIDOS_URL_TEST: 'https://script.google.com/macros/s/TEST_DEPLOYMENT_PLACEHOLDER/exec',
  GOOGLE_SCRIPT_ADMIN_TOKEN_TEST: 'token-test-placeholder',
};

test('E2E F78: preflight exige solo configuración TEST canónica', () => {
  assert.equal(validarConfiguracionF78(base).ok, true);
  assert.equal(validarConfiguracionF78({ ...base, NEXT_PUBLIC_APP_ENV: 'production' }).ok, false);
  assert.equal(validarConfiguracionF78({ ...base, GOOGLE_SCRIPT_PEDIDOS_URL_TEST: '' }).ok, false);
});

test('E2E F78: cualquier variable productiva presente bloquea', () => {
  assert.equal(validarConfiguracionF78({ ...base, GOOGLE_SCRIPT_PEDIDOS_URL: 'presente' }).ok, false);
  assert.equal(validarConfiguracionF78({ ...base, GOOGLE_SCRIPT_ADMIN_TOKEN: 'presente' }).ok, false);
});

test('E2E F78: escrituras y migración tienen opt-in independientes', () => {
  assert.equal(validarConfiguracionF78(base, { escritura: true }).ok, false);
  assert.equal(validarConfiguracionF78({ ...base, E2E_FASE78_ENABLE_WRITES: CONFIRMACION_F78_ESCRITURAS }, { escritura: true }).ok, true);
  assert.equal(validarConfiguracionF78(base, { migracion: true }).ok, false);
  assert.equal(validarConfiguracionF78({ ...base, E2E_FASE78_ENABLE_SCHEMA: CONFIRMACION_F78_MIGRACION }, { migracion: true }).ok, true);
});

test('E2E F78: valida contrato exacto de destino', () => {
  const correcto = { entorno: 'TEST', destino: 'backend_test_verificado', sheet_nombre: 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES', contrato: 'fase78_test_v1' };
  assert.equal(validarDestinoF78(correcto), true);
  assert.equal(validarDestinoF78({ ...correcto, entorno: 'PROD' }), false);
  assert.equal(validarDestinoF78({ ...correcto, sheet_nombre: 'otra' }), false);
});

test('E2E F78: IDs son únicos, explícitos y solo usan fixtures autorizados', () => {
  const ids = crearIdsF78('12345678-1234-1234-1234-123456789abc');
  assert.match(ids.marcador, /^E2E-TEST-F78-/);
  assert.match(ids.producto, /^PROD-TEST-F78-/);
  assert.notEqual(ids.compra, ids.compraDecimal);
});

test('E2E F78: sanitiza secretos y URL en errores', () => {
  const config = { ...base };
  const error = new Error(`fallo ${config.GOOGLE_SCRIPT_PEDIDOS_URL_TEST} token=${config.GOOGLE_SCRIPT_ADMIN_TOKEN_TEST}`);
  const mensaje = errorSeguroF78(error, config);
  assert.doesNotMatch(mensaje, /TEST_DEPLOYMENT_PLACEHOLDER|token-test-placeholder/);
});

test('E2E F78: solo reintenta el 400 exacto causado por un GET sin query', () => {
  const sinAccion = new Error('Accion GET no reconocida: "".');
  sinAccion.tipoE2E = 'backend_logico';
  sinAccion.codigo = 400;
  assert.equal(esGetSinAccionTransitorioF78(sinAccion), true);

  const funcional = new Error('apertura_id invalida.');
  funcional.tipoE2E = 'backend_logico';
  funcional.codigo = 400;
  assert.equal(esGetSinAccionTransitorioF78(funcional), false);
});

test('E2E F78: runner no lee env files, preflight precede escrituras y conflicto no se reintenta', async () => {
  const fuente = await readFile(new URL('../scripts/e2e-fase78.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(fuente, /dotenv|\.env\.local|readFile|process\.env\s*=/);
  assert.ok(fuente.indexOf("get(config, 'verificarDestinoFase78Test')") < fuente.indexOf("console.log('ESCRITURAS E2E: habilitadas')"));
  assert.match(fuente, /async function esperarCodigo[\s\S]*await solicitar\(config, 'POST', body\)/);
  const conflicto = fuente.slice(fuente.indexOf('async function esperarCodigo'), fuente.indexOf('async function esperarConflicto'));
  assert.doesNotMatch(conflicto, /postIdempotente/);
  assert.match(fuente, /E2E_FASE78_RUN_ID/);
  assert.match(fuente, /E2E_FASE78_RUN_DATE/);
  assert.match(fuente, /RECUPERADO \| compra unidad existente/);
  assert.ok(fuente.indexOf("get(config, 'listarCompras')") < fuente.indexOf('postIdempotente(config, compraPayload)'));
  assert.match(fuente, /Math\.abs\(actual - esperado\) < 1e-9/);
  assert.match(fuente, /const TIMEOUT_E2E_MS = 60000/);
  assert.match(fuente, /const MAX_INTENTOS_GET_F78 = 3/);
  assert.match(fuente, /esGetSinAccionTransitorioF78\(error\)/);
});
