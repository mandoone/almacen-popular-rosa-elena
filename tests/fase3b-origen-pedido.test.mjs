/**
 * Tests de origen de pedido y su relación con canal (FASE 3B).
 *
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ORIGENES_PEDIDO,
  canalPorOrigen,
  esOrigenPedidoValido,
  esOrigenPresencial,
  normalizarOrigenPedido,
} from '../src/lib/fase3b/origenPedido.ts';

test('los cuatro orígenes de pedido están definidos', () => {
  assert.deepEqual(
    [...ORIGENES_PEDIDO],
    ['online_anticipado', 'presencial_qr', 'presencial_vendedor', 'comanda_papel']
  );
});

test('esOrigenPedidoValido acepta los cuatro orígenes conocidos', () => {
  for (const origen of ORIGENES_PEDIDO) {
    assert.equal(esOrigenPedidoValido(origen), true);
  }
});

test('esOrigenPedidoValido rechaza valores desconocidos, vacíos o de otro tipo', () => {
  assert.equal(esOrigenPedidoValido('presencial'), false);
  assert.equal(esOrigenPedidoValido(''), false);
  assert.equal(esOrigenPedidoValido(null), false);
  assert.equal(esOrigenPedidoValido(undefined), false);
  assert.equal(esOrigenPedidoValido(42), false);
});

test('normalizarOrigenPedido devuelve el origen si es válido', () => {
  assert.equal(normalizarOrigenPedido('comanda_papel'), 'comanda_papel');
});

test('normalizarOrigenPedido devuelve null sin lanzar excepción para datos corruptos', () => {
  assert.equal(normalizarOrigenPedido('typo_invalido'), null);
  assert.equal(normalizarOrigenPedido(null), null);
  assert.equal(normalizarOrigenPedido(undefined), null);
  assert.equal(normalizarOrigenPedido(''), null);
});

test('canalPorOrigen: online_anticipado deriva a web', () => {
  assert.equal(canalPorOrigen('online_anticipado'), 'web');
});

test('canalPorOrigen: los tres orígenes presenciales derivan a presencial', () => {
  assert.equal(canalPorOrigen('presencial_qr'), 'presencial');
  assert.equal(canalPorOrigen('presencial_vendedor'), 'presencial');
  assert.equal(canalPorOrigen('comanda_papel'), 'presencial');
});

test('esOrigenPresencial coincide con canalPorOrigen', () => {
  for (const origen of ORIGENES_PEDIDO) {
    assert.equal(esOrigenPresencial(origen), canalPorOrigen(origen) === 'presencial');
  }
});

test('comanda_papel sigue siendo un origen válido independiente del modo QR (no lo reemplaza)', () => {
  assert.equal(esOrigenPedidoValido('comanda_papel'), true);
  assert.equal(esOrigenPedidoValido('presencial_qr'), true);
});
