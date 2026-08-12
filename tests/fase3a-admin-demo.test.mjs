import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  crearPedidosAdminDemo,
  esModoDemoAdmin,
} from '../src/lib/fase3a/adminDemo.ts';

test('el modo demo solo se habilita en desarrollo y en /admin?demo=1', () => {
  assert.equal(esModoDemoAdmin('development', '/admin', '1'), true);
  assert.equal(esModoDemoAdmin('production', '/admin', '1'), false);
  assert.equal(esModoDemoAdmin('development', '/admin', null), false);
  assert.equal(esModoDemoAdmin('development', '/admin/login', '1'), false);
});

test('el fixture cubre todos los estados necesarios para revisar la UI', () => {
  const estados = crearPedidosAdminDemo().map((pedido) => pedido.estado_pedido);

  assert.deepEqual(estados, [
    'recibido',
    'pendiente',
    'listo',
    'entregado',
    'cancelado',
    'revision_manual',
  ]);
});
