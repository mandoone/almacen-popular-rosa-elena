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
  validarConfigEntornoTest,
} from '../src/lib/env.ts';

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
