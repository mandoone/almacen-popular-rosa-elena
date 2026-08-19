/**
 * Tests de detección de entorno y guardrails puros (src/lib/env.ts).
 *
 * No leen `process.env`: todos los valores se pasan explícitamente, mismo
 * criterio que los tests de `esModoDemoAdmin` (Fase 3A).
 *
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ENTORNOS_APLICACION,
  ETIQUETA_ENTORNO,
  assertNoProduccionParaEscritura,
  esEntornoSeguroParaPruebas,
  obtenerEntornoAplicacion,
  requiereConfigTest,
  resolverConfigPorEntorno,
  validarConfigEntornoTest,
} from '../src/lib/env.ts';

const NOMBRES_URL = {
  nombreVariableProduccion: 'GOOGLE_SCRIPT_PEDIDOS_URL',
  nombreVariableTest: 'GOOGLE_SCRIPT_PEDIDOS_URL_TEST',
};

// --- obtenerEntornoAplicacion ---------------------------------------------

test('obtenerEntornoAplicacion reconoce los cuatro valores conocidos', () => {
  assert.equal(obtenerEntornoAplicacion('production'), 'production');
  assert.equal(obtenerEntornoAplicacion('test'), 'test');
  assert.equal(obtenerEntornoAplicacion('demo'), 'demo');
  assert.equal(obtenerEntornoAplicacion('local'), 'local');
});

test('obtenerEntornoAplicacion normaliza mayúsculas y espacios', () => {
  assert.equal(obtenerEntornoAplicacion('  TEST  '), 'test');
  assert.equal(obtenerEntornoAplicacion('Production'), 'production');
  assert.equal(obtenerEntornoAplicacion('DEMO'), 'demo');
});

test('obtenerEntornoAplicacion trata lo ausente o desconocido como "desconocido", nunca como "production" ni "test"', () => {
  assert.equal(obtenerEntornoAplicacion(undefined), 'desconocido');
  assert.equal(obtenerEntornoAplicacion(''), 'desconocido');
  assert.equal(obtenerEntornoAplicacion('   '), 'desconocido');
  assert.equal(obtenerEntornoAplicacion('staging'), 'desconocido');
  assert.equal(obtenerEntornoAplicacion('prod'), 'desconocido'); // no es alias válido de "production"
});

// --- esEntornoSeguroParaPruebas -------------------------------------------

test('esEntornoSeguroParaPruebas es true para test, demo y local', () => {
  assert.equal(esEntornoSeguroParaPruebas('test'), true);
  assert.equal(esEntornoSeguroParaPruebas('demo'), true);
  assert.equal(esEntornoSeguroParaPruebas('local'), true);
});

test('esEntornoSeguroParaPruebas es false para production y desconocido', () => {
  assert.equal(esEntornoSeguroParaPruebas('production'), false);
  assert.equal(esEntornoSeguroParaPruebas('desconocido'), false);
});

// --- requiereConfigTest ----------------------------------------------------

test('requiereConfigTest es true solo para "test"', () => {
  assert.equal(requiereConfigTest('test'), true);
  assert.equal(requiereConfigTest('demo'), false);
  assert.equal(requiereConfigTest('local'), false);
  assert.equal(requiereConfigTest('production'), false);
  assert.equal(requiereConfigTest('desconocido'), false);
});

// --- validarConfigEntornoTest ----------------------------------------------

test('validarConfigEntornoTest: valido cuando todas las claves requeridas tienen valor', () => {
  const resultado = validarConfigEntornoTest(
    { URL_TEST: 'https://ejemplo.invalido/exec', TOKEN_TEST: 'abc' },
    ['URL_TEST', 'TOKEN_TEST']
  );
  assert.deepEqual(resultado, { valido: true, faltantes: [] });
});

test('validarConfigEntornoTest: detecta claves ausentes', () => {
  const resultado = validarConfigEntornoTest({ URL_TEST: 'https://ejemplo.invalido/exec' }, [
    'URL_TEST',
    'TOKEN_TEST',
  ]);
  assert.equal(resultado.valido, false);
  assert.deepEqual(resultado.faltantes, ['TOKEN_TEST']);
});

test('validarConfigEntornoTest: trata string vacío o solo espacios como ausente', () => {
  const resultado = validarConfigEntornoTest({ URL_TEST: '', TOKEN_TEST: '   ' }, [
    'URL_TEST',
    'TOKEN_TEST',
  ]);
  assert.equal(resultado.valido, false);
  assert.deepEqual(resultado.faltantes, ['URL_TEST', 'TOKEN_TEST']);
});

test('validarConfigEntornoTest: no compara valores contra nada, solo detecta ausencia', () => {
  const resultado = validarConfigEntornoTest({ URL_TEST: 'cualquier-cosa' }, ['URL_TEST']);
  assert.equal(resultado.valido, true);
});

// --- assertNoProduccionParaEscritura ---------------------------------------

test('assertNoProduccionParaEscritura no lanza para "test" ni "local"', () => {
  assert.doesNotThrow(() => assertNoProduccionParaEscritura('test'));
  assert.doesNotThrow(() => assertNoProduccionParaEscritura('local'));
});

test('assertNoProduccionParaEscritura lanza para "production"', () => {
  assert.throws(() => assertNoProduccionParaEscritura('production'), /Escritura bloqueada/);
});

test('assertNoProduccionParaEscritura lanza para "demo" (no debería llegar hasta aquí)', () => {
  assert.throws(() => assertNoProduccionParaEscritura('demo'), /Escritura bloqueada/);
});

test('assertNoProduccionParaEscritura lanza para "desconocido"', () => {
  assert.throws(() => assertNoProduccionParaEscritura('desconocido'), /Escritura bloqueada/);
});

// --- ETIQUETA_ENTORNO / ENTORNOS_APLICACION ---------------------------------

test('ETIQUETA_ENTORNO tiene una etiqueta legible para cada entorno conocido', () => {
  for (const entorno of ENTORNOS_APLICACION) {
    assert.equal(typeof ETIQUETA_ENTORNO[entorno], 'string');
    assert.ok(ETIQUETA_ENTORNO[entorno].length > 0);
  }
});

// --- resolverConfigPorEntorno -----------------------------------------------
// Selección de URL/token de backend de pedidos según entorno. Pura: strings
// de ejemplo, nunca valores reales ni llamadas de red.
// Ver docs/fase-3b/ENTORNO_TEST_FASE_3B.md.

test('resolverConfigPorEntorno: production con valor productivo presente -> usa el productivo', () => {
  const resultado = resolverConfigPorEntorno('production', {
    valorProduccion: 'https://ejemplo-prod.invalido/exec',
    valorTest: undefined,
    ...NOMBRES_URL,
  });
  assert.deepEqual(resultado, { ok: true, valor: 'https://ejemplo-prod.invalido/exec' });
});

test('resolverConfigPorEntorno: production sin valor productivo -> bloquea con error explícito', () => {
  const resultado = resolverConfigPorEntorno('production', {
    valorProduccion: undefined,
    valorTest: 'https://ejemplo-test.invalido/exec',
    ...NOMBRES_URL,
  });
  assert.equal(resultado.ok, false);
  assert.match(resultado.error, /GOOGLE_SCRIPT_PEDIDOS_URL/);
});

test('resolverConfigPorEntorno: entorno desconocido (NEXT_PUBLIC_APP_ENV sin configurar) se comporta como production, sin romper nada', () => {
  const entornoSinDeclarar = obtenerEntornoAplicacion(undefined);
  assert.equal(entornoSinDeclarar, 'desconocido');
  const resultado = resolverConfigPorEntorno(entornoSinDeclarar, {
    valorProduccion: 'https://ejemplo-prod.invalido/exec',
    valorTest: undefined,
    ...NOMBRES_URL,
  });
  assert.deepEqual(resultado, { ok: true, valor: 'https://ejemplo-prod.invalido/exec' });
});

test('resolverConfigPorEntorno: test sin valor TEST configurado -> bloquea con error explícito', () => {
  const resultado = resolverConfigPorEntorno('test', {
    valorProduccion: 'https://ejemplo-prod.invalido/exec',
    valorTest: undefined,
    ...NOMBRES_URL,
  });
  assert.equal(resultado.ok, false);
  assert.match(resultado.error, /GOOGLE_SCRIPT_PEDIDOS_URL_TEST/);
});

test('resolverConfigPorEntorno: test con valor TEST vacío (solo espacios) también bloquea', () => {
  const resultado = resolverConfigPorEntorno('test', {
    valorProduccion: undefined,
    valorTest: '   ',
    ...NOMBRES_URL,
  });
  assert.equal(resultado.ok, false);
  assert.match(resultado.error, /GOOGLE_SCRIPT_PEDIDOS_URL_TEST/);
});

test('resolverConfigPorEntorno: test con valor TEST distinto del productivo -> usa el de TEST', () => {
  const resultado = resolverConfigPorEntorno('test', {
    valorProduccion: 'https://ejemplo-prod.invalido/exec',
    valorTest: 'https://ejemplo-test.invalido/exec',
    ...NOMBRES_URL,
  });
  assert.deepEqual(resultado, { ok: true, valor: 'https://ejemplo-test.invalido/exec' });
});

test('resolverConfigPorEntorno: test sin valor productivo configurado (caso normal en TEST) -> igual usa el de TEST', () => {
  const resultado = resolverConfigPorEntorno('test', {
    valorProduccion: undefined,
    valorTest: 'https://ejemplo-test.invalido/exec',
    ...NOMBRES_URL,
  });
  assert.deepEqual(resultado, { ok: true, valor: 'https://ejemplo-test.invalido/exec' });
});

test('resolverConfigPorEntorno: test con el mismo valor que producción -> bloquea, nunca deja que coincidan', () => {
  const resultado = resolverConfigPorEntorno('test', {
    valorProduccion: 'https://mismo-backend.invalido/exec',
    valorTest: 'https://mismo-backend.invalido/exec',
    ...NOMBRES_URL,
  });
  assert.equal(resultado.ok, false);
  assert.match(resultado.error, /no puede ser igual/);
});

test('resolverConfigPorEntorno: aplica igual para el token admin (otro par de nombres de variable)', () => {
  const nombresToken = {
    nombreVariableProduccion: 'GOOGLE_SCRIPT_ADMIN_TOKEN',
    nombreVariableTest: 'GOOGLE_SCRIPT_ADMIN_TOKEN_TEST',
  };

  const sinTokenTest = resolverConfigPorEntorno('test', {
    valorProduccion: 'token-prod-ejemplo',
    valorTest: undefined,
    ...nombresToken,
  });
  assert.equal(sinTokenTest.ok, false);
  assert.match(sinTokenTest.error, /GOOGLE_SCRIPT_ADMIN_TOKEN_TEST/);

  const tokenTestOk = resolverConfigPorEntorno('test', {
    valorProduccion: 'token-prod-ejemplo',
    valorTest: 'token-test-ejemplo',
    ...nombresToken,
  });
  assert.deepEqual(tokenTestOk, { ok: true, valor: 'token-test-ejemplo' });

  const tokenIgualAlProductivo = resolverConfigPorEntorno('test', {
    valorProduccion: 'token-compartido-por-error',
    valorTest: 'token-compartido-por-error',
    ...nombresToken,
  });
  assert.equal(tokenIgualAlProductivo.ok, false);
  assert.match(tokenIgualAlProductivo.error, /GOOGLE_SCRIPT_ADMIN_TOKEN_TEST no puede ser igual/);
});

test('resolverConfigPorEntorno: demo y local se comportan como production (no requieren config TEST)', () => {
  for (const entorno of ['demo', 'local']) {
    const resultado = resolverConfigPorEntorno(entorno, {
      valorProduccion: 'https://ejemplo-prod.invalido/exec',
      valorTest: undefined,
      ...NOMBRES_URL,
    });
    assert.deepEqual(resultado, { ok: true, valor: 'https://ejemplo-prod.invalido/exec' });
  }
});
