/**
 * Tests de la máquina de estados públicos de la web (FASE 3B).
 *
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  COMPORTAMIENTO_ESTADO_PUBLICO,
  ESTADOS_PUBLICOS_WEB,
  obtenerEstadoPublicoWeb,
} from '../src/lib/fase3b/estadoPublicoWeb.ts';

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

test('los seis estados públicos están definidos y tienen comportamiento asociado', () => {
  assert.deepEqual(
    [...ESTADOS_PUBLICOS_WEB],
    [
      'sin_apertura_programada',
      'pedido_anticipado_activo',
      'pedido_anticipado_cerrado',
      'modo_presencial_activo',
      'apertura_cerrada',
      'apertura_cancelada',
    ]
  );
  for (const estado of ESTADOS_PUBLICOS_WEB) {
    assert.ok(COMPORTAMIENTO_ESTADO_PUBLICO[estado], `falta comportamiento para ${estado}`);
    assert.equal(typeof COMPORTAMIENTO_ESTADO_PUBLICO[estado].mensajePublicoSugerido, 'string');
  }
});

test('sin apertura (null) -> sin_apertura_programada', () => {
  assert.equal(obtenerEstadoPublicoWeb(null, '2026-08-10T10:00'), 'sin_apertura_programada');
});

test('apertura por_confirmar -> sin_apertura_programada', () => {
  const a = apertura({ estado_apertura: 'por_confirmar' });
  assert.equal(obtenerEstadoPublicoWeb(a, '2026-08-10T10:00'), 'sin_apertura_programada');
});

test('apertura cancelada -> apertura_cancelada, incluso antes de la fecha', () => {
  const a = apertura({ estado_apertura: 'cancelada' });
  assert.equal(obtenerEstadoPublicoWeb(a, '2026-08-01T10:00'), 'apertura_cancelada');
});

test('antes del cierre, pedidos activos -> pedido_anticipado_activo', () => {
  const a = apertura();
  assert.equal(obtenerEstadoPublicoWeb(a, '2026-08-10T10:00'), 'pedido_anticipado_activo');
});

test('después del cierre, pedidos activos -> pedido_anticipado_cerrado', () => {
  const a = apertura();
  assert.equal(obtenerEstadoPublicoWeb(a, '2026-08-14T00:00'), 'pedido_anticipado_cerrado');
});

test('pausado antes del cierre calculado -> pedido_anticipado_cerrado (el cierre manual manda)', () => {
  const a = apertura({ pedidos_anticipados_estado: 'pausado' });
  assert.equal(obtenerEstadoPublicoWeb(a, '2026-08-10T10:00'), 'pedido_anticipado_cerrado');
});

test('reabierto_manual después del cierre -> pedido_anticipado_activo', () => {
  const a = apertura({ pedidos_anticipados_estado: 'reabierto_manual' });
  assert.equal(obtenerEstadoPublicoWeb(a, '2026-08-14T00:00'), 'pedido_anticipado_activo');
});

test('dentro de horario con modo presencial activo -> modo_presencial_activo, con prioridad sobre pedidos anticipados', () => {
  const a = apertura({ modo_presencial_estado: 'activo', pedidos_anticipados_estado: 'activo' });
  assert.equal(obtenerEstadoPublicoWeb(a, '2026-08-15T12:00'), 'modo_presencial_activo');
});

test('dentro de horario con modo presencial inactivo -> cae en pedido_anticipado_cerrado (ya pasó el cierre de pedidos, la apertura no ha terminado)', () => {
  const a = apertura({ modo_presencial_estado: 'inactivo' });
  assert.equal(obtenerEstadoPublicoWeb(a, '2026-08-15T12:00'), 'pedido_anticipado_cerrado');
});

test('después de hora_termino -> apertura_cerrada, sin importar pedidos anticipados', () => {
  const a = apertura({ pedidos_anticipados_estado: 'reabierto_manual' });
  assert.equal(obtenerEstadoPublicoWeb(a, '2026-08-15T15:01'), 'apertura_cerrada');
});

test('estado_apertura cerrada explícito -> apertura_cerrada aunque no sea la hora todavía', () => {
  const a = apertura({ estado_apertura: 'cerrada' });
  assert.equal(obtenerEstadoPublicoWeb(a, '2026-08-15T09:00'), 'apertura_cerrada');
});

test('límite exacto del cierre de pedidos es inclusivo -> pedido_anticipado_activo', () => {
  const a = apertura();
  assert.equal(obtenerEstadoPublicoWeb(a, '2026-08-13T23:59'), 'pedido_anticipado_activo');
});
