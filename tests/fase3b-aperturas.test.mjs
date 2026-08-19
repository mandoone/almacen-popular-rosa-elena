/**
 * Tests del calendario de aperturas (FASE 3B).
 *
 * Se ejecutan con el runner nativo de Node (`node --test`), sin dependencias
 * añadidas, igual que los tests de Fase 3A.
 *
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  calcularCierrePedidosPorDefecto,
  compararFechaHora,
  estaDentroDeHorario,
  haTerminadoApertura,
  puedeRecibirPedidoAnticipado,
  puedeUsarModoPresencial,
} from '../src/lib/fase3b/aperturas.ts';

function apertura(overrides = {}) {
  return {
    apertura_id: 'APE-20260815',
    fecha_apertura: '2026-08-15',
    hora_inicio: '11:00',
    hora_termino: '15:00',
    cierre_pedidos_anticipados: '2026-08-13T23:59',
    estado_apertura: 'activa',
    pedidos_anticipados_estado: 'activo',
    modo_presencial_estado: 'inactivo',
    ...overrides,
  };
}

// --- calcularCierrePedidosPorDefecto ------------------------------------

test('cierre por defecto: apertura sábado -> jueves anterior 23:59', () => {
  // 2026-08-15 es sábado.
  assert.equal(calcularCierrePedidosPorDefecto('2026-08-15'), '2026-08-13T23:59');
});

test('cierre por defecto: apertura domingo -> mismo jueves anterior', () => {
  // 2026-08-16 es domingo de la misma semana que el sábado 15.
  assert.equal(calcularCierrePedidosPorDefecto('2026-08-16'), '2026-08-13T23:59');
});

test('cierre por defecto: apertura jueves -> jueves de la semana previa, no el mismo día', () => {
  // 2026-08-13 es jueves.
  assert.equal(calcularCierrePedidosPorDefecto('2026-08-13'), '2026-08-06T23:59');
});

test('cierre por defecto: apertura viernes -> jueves inmediatamente anterior', () => {
  // 2026-08-14 es viernes.
  assert.equal(calcularCierrePedidosPorDefecto('2026-08-14'), '2026-08-13T23:59');
});

test('cierre por defecto: apertura lunes/martes/miércoles -> jueves de la semana previa', () => {
  assert.equal(calcularCierrePedidosPorDefecto('2026-08-17'), '2026-08-13T23:59'); // lunes
  assert.equal(calcularCierrePedidosPorDefecto('2026-08-18'), '2026-08-13T23:59'); // martes
  assert.equal(calcularCierrePedidosPorDefecto('2026-08-19'), '2026-08-13T23:59'); // miércoles
});

test('cierre por defecto: cruza el límite de año correctamente', () => {
  // 2027-01-02 es sábado; el jueves anterior cae en diciembre de 2026.
  assert.equal(calcularCierrePedidosPorDefecto('2027-01-02'), '2026-12-31T23:59');
});

// --- compararFechaHora ---------------------------------------------------

test('compararFechaHora ordena lexicográficamente fechas ISO bien formadas', () => {
  assert.equal(compararFechaHora('2026-08-13T23:59', '2026-08-14T00:00') < 0, true);
  assert.equal(compararFechaHora('2026-08-14T00:00', '2026-08-13T23:59') > 0, true);
  assert.equal(compararFechaHora('2026-08-13T23:59', '2026-08-13T23:59'), 0);
});

// --- estaDentroDeHorario / haTerminadoApertura ---------------------------

test('estaDentroDeHorario incluye los límites de hora_inicio y hora_termino', () => {
  const a = apertura();
  assert.equal(estaDentroDeHorario(a, '2026-08-15T11:00'), true);
  assert.equal(estaDentroDeHorario(a, '2026-08-15T15:00'), true);
  assert.equal(estaDentroDeHorario(a, '2026-08-15T13:00'), true);
  assert.equal(estaDentroDeHorario(a, '2026-08-15T10:59'), false);
  assert.equal(estaDentroDeHorario(a, '2026-08-15T15:01'), false);
});

test('haTerminadoApertura es true después de hora_termino', () => {
  const a = apertura();
  assert.equal(haTerminadoApertura(a, '2026-08-15T15:01'), true);
  assert.equal(haTerminadoApertura(a, '2026-08-15T14:59'), false);
});

test('haTerminadoApertura es true si estado_apertura ya está cerrada, aunque no sea la hora', () => {
  const a = apertura({ estado_apertura: 'cerrada' });
  assert.equal(haTerminadoApertura(a, '2026-08-15T12:00'), true);
});

// --- puedeRecibirPedidoAnticipado ----------------------------------------

test('puedeRecibirPedidoAnticipado: sin apertura es false', () => {
  assert.equal(puedeRecibirPedidoAnticipado(null, '2026-08-10T10:00'), false);
});

test('puedeRecibirPedidoAnticipado: antes del cierre y activo es true', () => {
  const a = apertura();
  assert.equal(puedeRecibirPedidoAnticipado(a, '2026-08-13T23:59'), true);
  assert.equal(puedeRecibirPedidoAnticipado(a, '2026-08-10T00:00'), true);
});

test('puedeRecibirPedidoAnticipado: después del cierre es false', () => {
  const a = apertura();
  assert.equal(puedeRecibirPedidoAnticipado(a, '2026-08-14T00:00'), false);
});

test('puedeRecibirPedidoAnticipado: pausado antes del cierre calculado es false', () => {
  const a = apertura({ pedidos_anticipados_estado: 'pausado' });
  assert.equal(puedeRecibirPedidoAnticipado(a, '2026-08-10T00:00'), false);
});

test('puedeRecibirPedidoAnticipado: reabierto_manual después del cierre es true', () => {
  const a = apertura({ pedidos_anticipados_estado: 'reabierto_manual' });
  assert.equal(puedeRecibirPedidoAnticipado(a, '2026-08-20T00:00'), true);
});

test('puedeRecibirPedidoAnticipado: false si la apertura está cancelada, cerrada o por_confirmar', () => {
  for (const estado_apertura of ['cancelada', 'cerrada', 'por_confirmar']) {
    const a = apertura({ estado_apertura });
    assert.equal(puedeRecibirPedidoAnticipado(a, '2026-08-10T00:00'), false);
  }
});

// --- puedeUsarModoPresencial ----------------------------------------------

test('puedeUsarModoPresencial: false si modo_presencial_estado no es activo', () => {
  const a = apertura({ modo_presencial_estado: 'inactivo' });
  assert.equal(puedeUsarModoPresencial(a, '2026-08-15T12:00'), false);
});

test('puedeUsarModoPresencial: true solo dentro del horario, con modo activo', () => {
  const a = apertura({ modo_presencial_estado: 'activo' });
  assert.equal(puedeUsarModoPresencial(a, '2026-08-15T12:00'), true);
  assert.equal(puedeUsarModoPresencial(a, '2026-08-15T10:00'), false);
  assert.equal(puedeUsarModoPresencial(a, '2026-08-15T16:00'), false);
});

test('puedeUsarModoPresencial: false si la apertura está cancelada o cerrada, aunque el modo diga activo', () => {
  for (const estado_apertura of ['cancelada', 'cerrada']) {
    const a = apertura({ modo_presencial_estado: 'activo', estado_apertura });
    assert.equal(puedeUsarModoPresencial(a, '2026-08-15T12:00'), false);
  }
});
