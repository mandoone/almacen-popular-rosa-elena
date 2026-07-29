/**
 * Tests de la máquina de estados de pedido (FASE 3A).
 *
 * Se ejecutan con el runner nativo de Node (`node --test`), sin dependencias
 * añadidas. Node 24 elimina los tipos de los `.ts` al importarlos, por eso el
 * import lleva extensión explícita.
 *
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ESTADOS_PEDIDO,
  consumeStock,
  esTransicionValida,
  evaluarTransicion,
  esEstadoPedido,
  esEditable,
  puedeReabrirse,
  transicionesPosibles,
} from '../src/lib/fase3a/estados.ts';

test('los cinco estados del levantamiento están definidos', () => {
  assert.deepEqual(
    [...ESTADOS_PEDIDO],
    ['recibido', 'pendiente', 'listo', 'entregado', 'cancelado']
  );
});

test('esEstadoPedido rechaza valores desconocidos', () => {
  assert.equal(esEstadoPedido('recibido'), true);
  assert.equal(esEstadoPedido('pagado_efectivo'), false);
  assert.equal(esEstadoPedido(''), false);
  assert.equal(esEstadoPedido(null), false);
});

test('recibido y cancelado no tienen stock comprometido', () => {
  assert.equal(consumeStock('recibido'), false);
  assert.equal(consumeStock('cancelado'), false);
  assert.equal(consumeStock('pendiente'), true);
  assert.equal(consumeStock('listo'), true);
  assert.equal(consumeStock('entregado'), true);
});

/**
 * Matriz completa 5x5. Es la especificación ejecutable del §3.4 y §3.8:
 * cualquier cambio de regla debe verse aquí primero.
 */
const MATRIZ = [
  // desde        hacia         valido  impacto
  ['recibido', 'recibido', false, 'ninguno'],
  ['recibido', 'pendiente', true, 'descuenta'],
  ['recibido', 'listo', true, 'descuenta'],
  ['recibido', 'entregado', false, 'ninguno'],
  ['recibido', 'cancelado', true, 'ninguno'],

  ['pendiente', 'recibido', false, 'ninguno'],
  ['pendiente', 'pendiente', false, 'ninguno'],
  ['pendiente', 'listo', true, 'ninguno'],
  ['pendiente', 'entregado', false, 'ninguno'],
  ['pendiente', 'cancelado', true, 'devuelve'],

  ['listo', 'recibido', false, 'ninguno'],
  ['listo', 'pendiente', true, 'ninguno'],
  ['listo', 'listo', false, 'ninguno'],
  ['listo', 'entregado', true, 'ninguno'],
  ['listo', 'cancelado', true, 'devuelve'],

  ['entregado', 'recibido', false, 'ninguno'],
  ['entregado', 'pendiente', false, 'ninguno'],
  ['entregado', 'listo', false, 'ninguno'],
  ['entregado', 'entregado', false, 'ninguno'],
  ['entregado', 'cancelado', false, 'ninguno'],

  ['cancelado', 'recibido', false, 'ninguno'],
  ['cancelado', 'pendiente', false, 'ninguno'],
  ['cancelado', 'listo', false, 'ninguno'],
  ['cancelado', 'entregado', false, 'ninguno'],
  ['cancelado', 'cancelado', false, 'ninguno'],
];

test('matriz completa de transiciones e impacto de stock', () => {
  assert.equal(
    MATRIZ.length,
    ESTADOS_PEDIDO.length * ESTADOS_PEDIDO.length,
    'la matriz debe cubrir todos los pares de estados'
  );

  for (const [desde, hacia, valido, impacto] of MATRIZ) {
    const r = evaluarTransicion(desde, hacia);
    assert.equal(r.valido, valido, `${desde} -> ${hacia}: validez`);
    assert.equal(r.impacto, impacto, `${desde} -> ${hacia}: impacto de stock`);
    assert.equal(esTransicionValida(desde, hacia), valido, `${desde} -> ${hacia}`);
    if (!valido) {
      assert.ok(r.motivo, `${desde} -> ${hacia} debe explicar el rechazo`);
    }
  }
});

test('el stock nunca se descuenta dos veces por el mismo pedido', () => {
  // recibido -> pendiente descuenta; desde ahí ninguna transición vuelve a descontar.
  assert.equal(evaluarTransicion('recibido', 'pendiente').impacto, 'descuenta');
  assert.equal(evaluarTransicion('pendiente', 'listo').impacto, 'ninguno');
  assert.equal(evaluarTransicion('listo', 'pendiente').impacto, 'ninguno');
  assert.equal(evaluarTransicion('listo', 'entregado').impacto, 'ninguno');
});

test('el stock nunca se devuelve dos veces: cancelado es terminal', () => {
  assert.equal(evaluarTransicion('pendiente', 'cancelado').impacto, 'devuelve');
  // Desde cancelado no hay salida, así que no se puede volver a cancelar.
  assert.deepEqual([...transicionesPosibles('cancelado')], []);
  assert.equal(evaluarTransicion('cancelado', 'cancelado').valido, false);
  assert.equal(evaluarTransicion('cancelado', 'pendiente').valido, false);
});

test('cancelar un pedido recibido no devuelve stock', () => {
  const r = evaluarTransicion('recibido', 'cancelado');
  assert.equal(r.valido, true);
  assert.equal(r.impacto, 'ninguno');
});

test('un pedido entregado no se cancela en flujo normal', () => {
  const r = evaluarTransicion('entregado', 'cancelado');
  assert.equal(r.valido, false);
  assert.equal(r.impacto, 'ninguno');
});

test('un pedido cancelado no se reabre', () => {
  assert.equal(puedeReabrirse('cancelado'), false);
  assert.equal(puedeReabrirse('recibido'), true);
});

test('solo los pedidos recibidos son editables', () => {
  assert.equal(esEditable('recibido'), true);
  for (const e of ['pendiente', 'listo', 'entregado', 'cancelado']) {
    assert.equal(esEditable(e), false, `${e} no debe ser editable`);
  }
});
