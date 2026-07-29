/**
 * Tests de las reglas del proxy admin (FASE 3A, etapa 1.5a).
 *
 * Cubren las decisiones que toma src/app/api/admin/pedidos/[id]/route.ts antes
 * de reenviar un cambio a Apps Script.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  decidirPatchEstado,
  decidirCancelacion,
} from '../src/lib/fase3a/proxyAdmin.ts';

// ── Los cuatro rechazos pedidos en la micro-etapa ────────────────────────────

test('Cancelado -> cualquier estado se rechaza', () => {
  for (const destino of ['recibido', 'pendiente', 'listo', 'entregado']) {
    const d = decidirPatchEstado('cancelado', destino);
    assert.equal(d.permitido, false, `cancelado -> ${destino}`);
    assert.equal(d.status, 409);
    assert.ok(d.motivo);
  }
});

test('Entregado -> cualquier estado se rechaza', () => {
  for (const destino of ['recibido', 'pendiente', 'listo']) {
    const d = decidirPatchEstado('entregado', destino);
    assert.equal(d.permitido, false, `entregado -> ${destino}`);
    assert.equal(d.status, 409);
  }
});

test('Pendiente -> Entregado se rechaza (no esta en el flujo aprobado)', () => {
  const d = decidirPatchEstado('pendiente', 'entregado');
  assert.equal(d.permitido, false);
  assert.equal(d.status, 409);
});

test('Listo -> Entregado si se permite', () => {
  assert.equal(decidirPatchEstado('listo', 'entregado').permitido, true);
});

// ── La trampa del desplegable de pago ────────────────────────────────────────

test('reenviar el mismo estado se permite y no cuenta como transicion', () => {
  // El panel manda { estado_pedido: <actual>, estado_pago: X } al cambiar el
  // pago. Si esto se rechazara, el desplegable de pago dejaria de funcionar.
  for (const estado of ['pendiente', 'listo', 'entregado']) {
    const d = decidirPatchEstado(estado, estado);
    assert.equal(d.permitido, true, `${estado} -> ${estado} debe pasar`);
    assert.equal(d.sin_cambio_de_estado, true);
  }
});

test('un PATCH solo de pago no necesita validar estado', () => {
  const d = decidirPatchEstado('pendiente', '');
  assert.equal(d.permitido, true);
  assert.equal(d.sin_cambio_de_estado, true);
});

// ── Hallazgo 4: cancelar por PATCH no devuelve stock ─────────────────────────

test('PATCH hacia cancelado se rechaza y remite a POST', () => {
  for (const origen of ['recibido', 'pendiente', 'listo']) {
    const d = decidirPatchEstado(origen, 'cancelado');
    assert.equal(d.permitido, false, `${origen} -> cancelado por PATCH`);
    assert.equal(d.status, 400);
    assert.match(d.motivo, /POST/);
  }
});

// ── Entradas inesperadas ─────────────────────────────────────────────────────

test('un estado solicitado invalido se rechaza con 400', () => {
  const d = decidirPatchEstado('pendiente', 'entregadisimo');
  assert.equal(d.permitido, false);
  assert.equal(d.status, 400);
});

test('un estado ilegible en la hoja se rechaza con 409, no se adivina', () => {
  const d = decidirPatchEstado('pagado_efectivo', 'listo');
  assert.equal(d.permitido, false);
  assert.equal(d.status, 409);
  assert.match(d.motivo, /no reconocido/);
});

test('el estado se normaliza: espacios y mayusculas no importan', () => {
  assert.equal(decidirPatchEstado('  PENDIENTE ', 'Listo').permitido, true);
});

// ── Cancelacion (POST) ───────────────────────────────────────────────────────

test('cancelar desde recibido, pendiente o listo se permite', () => {
  for (const origen of ['recibido', 'pendiente', 'listo']) {
    assert.equal(decidirCancelacion(origen).permitido, true, `cancelar ${origen}`);
  }
});

test('hallazgo 5: cancelar un pedido entregado se rechaza', () => {
  const d = decidirCancelacion('entregado');
  assert.equal(d.permitido, false);
  assert.equal(d.status, 409);
});

test('hallazgo 3: cancelar un pedido ya cancelado se rechaza', () => {
  // Es el paso que evitaria la segunda devolucion de stock.
  const d = decidirCancelacion('cancelado');
  assert.equal(d.permitido, false);
  assert.equal(d.status, 409);
});

test('cancelar con estado ilegible se rechaza', () => {
  const d = decidirCancelacion('');
  assert.equal(d.permitido, false);
  assert.equal(d.status, 409);
});

// ── La secuencia completa del hallazgo 3 ─────────────────────────────────────

test('hallazgo 3 completo: la secuencia de doble devolucion queda cortada', () => {
  // 1. Pedido en 'pendiente' -> se cancela: permitido, devuelve stock.
  assert.equal(decidirCancelacion('pendiente').permitido, true);
  // 2. Intentar devolverlo a 'pendiente' por PATCH: RECHAZADO.
  assert.equal(decidirPatchEstado('cancelado', 'pendiente').permitido, false);
  // 3. Sin el paso 2, el segundo cancelar es inalcanzable; y aun asi se rechaza.
  assert.equal(decidirCancelacion('cancelado').permitido, false);
});
