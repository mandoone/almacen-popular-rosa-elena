/**
 * Tests del fixture de demo del calendario de aperturas (FASE 3B, Etapa 2).
 *
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { seleccionarAperturaRelevante } from '../src/lib/fase3b/aperturas.ts';
import { obtenerEstadoPublicoWeb } from '../src/lib/fase3b/estadoPublicoWeb.ts';
import { AHORA_DEMO, APERTURAS_DEMO, crearAperturasDemo } from '../src/lib/fase3b/aperturasDemoData.ts';

test('el fixture tiene exactamente 6 aperturas de ejemplo', () => {
  assert.equal(APERTURAS_DEMO.length, 6);
});

test('el fixture cubre los 6 escenarios pedidos: programada futura, activa, cerrada, cancelada, pedidos anticipados cerrados, modo presencial activo', () => {
  const estadosApertura = APERTURAS_DEMO.map((a) => a.estado_apertura);
  assert.ok(estadosApertura.includes('programada'), 'falta una apertura programada');
  assert.ok(estadosApertura.includes('activa'), 'falta una apertura activa');
  assert.ok(estadosApertura.includes('cerrada'), 'falta una apertura cerrada');
  assert.ok(estadosApertura.includes('cancelada'), 'falta una apertura cancelada');

  const conPedidosCerrados = APERTURAS_DEMO.some(
    (a) => a.pedidos_anticipados_estado === 'pausado' || a.pedidos_anticipados_estado === 'cerrado'
  );
  assert.ok(conPedidosCerrados, 'falta una apertura con pedidos anticipados cerrados');

  const conModoPresencialActivo = APERTURAS_DEMO.some((a) => a.modo_presencial_estado === 'activo');
  assert.ok(conModoPresencialActivo, 'falta una apertura con modo presencial activo');
});

test('evaluado en AHORA_DEMO, el fixture no produce conflicto: hay exactamente una apertura relevante', () => {
  const resultado = seleccionarAperturaRelevante(APERTURAS_DEMO, AHORA_DEMO);
  assert.equal(resultado.tipo, 'apertura');
});

test('la apertura relevante en AHORA_DEMO es la que tiene el modo presencial activo', () => {
  const resultado = seleccionarAperturaRelevante(APERTURAS_DEMO, AHORA_DEMO);
  assert.equal(resultado.tipo, 'apertura');
  assert.equal(resultado.apertura.modo_presencial_estado, 'activo');
  assert.equal(obtenerEstadoPublicoWeb(resultado.apertura, AHORA_DEMO), 'modo_presencial_activo');
});

test('crearAperturasDemo devuelve copias nuevas en cada llamada (no la misma referencia)', () => {
  const primera = crearAperturasDemo();
  const segunda = crearAperturasDemo();
  assert.notEqual(primera, segunda);
  assert.notEqual(primera[0], segunda[0]);
  assert.deepEqual(primera, segunda);
});

test('cada apertura del fixture calcula un estado público válido sin lanzar excepción', () => {
  for (const apertura of APERTURAS_DEMO) {
    const estado = obtenerEstadoPublicoWeb(apertura, AHORA_DEMO);
    assert.equal(typeof estado, 'string');
  }
});
