import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  fechaHoraSantiago,
  pedidosAnticipadosConCalendarioHabilitados,
  seleccionarAperturaActivaParaPedidos,
} from '../src/lib/fase3b/pedidosAnticipados.ts';

const APERTURA = {
  apertura_id: 'APE-20260919',
  fecha_apertura: '2026-09-19T00:00:00.000',
  hora_inicio: '1899-12-30T11:00:00.000',
  hora_termino: '1899-12-30T15:00:00.000',
  lugar: 'Punto de retiro TEST',
  cierre_pedidos_anticipados: '2026-09-17T23:59:00.000',
  estado_apertura: 'activa',
  pedidos_anticipados_estado: 'activo',
  modo_presencial_estado: 'inactivo',
  mensaje_publico: 'Retiro comunitario',
  observaciones_internas: 'no exponer',
  creada_por: 'interno',
  actualizada_por: 'interno',
  creado_en: 'interno',
  actualizado_en: 'interno',
};

test('selecciona y normaliza una apertura activa antes del cierre', () => {
  const resultado = seleccionarAperturaActivaParaPedidos([APERTURA], '2026-09-10T12:00');
  assert.equal(resultado.tipo, 'disponible');
  assert.deepEqual(resultado.apertura, {
    apertura_id: 'APE-20260919',
    fecha_apertura: '2026-09-19',
    horario: { inicio: '11:00', termino: '15:00' },
    lugar: 'Punto de retiro TEST',
    cierre_pedidos_anticipados: '2026-09-17T23:59',
    pedidos_anticipados_estado: 'activo',
    mensaje_publico: 'Retiro comunitario',
  });
});

test('no filtra campos administrativos en el DTO público', () => {
  const resultado = seleccionarAperturaActivaParaPedidos([APERTURA], '2026-09-10T12:00');
  assert.equal(resultado.tipo, 'disponible');
  const serializado = JSON.stringify(resultado.apertura);
  for (const campo of [
    'observaciones_internas',
    'creada_por',
    'actualizada_por',
    'creado_en',
    'actualizado_en',
    'estado_apertura',
    'modo_presencial_estado',
  ]) {
    assert.equal(serializado.includes(campo), false, `se filtró ${campo}`);
  }
});

test('rechaza ausencia, estado no activo y cierre vencido', () => {
  assert.deepEqual(
    seleccionarAperturaActivaParaPedidos([], '2026-09-10T12:00'),
    { tipo: 'no_disponible' }
  );
  assert.equal(
    seleccionarAperturaActivaParaPedidos([
      { ...APERTURA, estado_apertura: 'programada' },
    ], '2026-09-10T12:00').tipo,
    'no_disponible'
  );
  assert.equal(
    seleccionarAperturaActivaParaPedidos([APERTURA], '2026-09-18T00:00').tipo,
    'no_disponible'
  );
});

test('estado manual distinto de activo no habilita pedidos anticipados', () => {
  for (const estado of ['cerrado', 'pausado', 'reabierto_manual']) {
    const resultado = seleccionarAperturaActivaParaPedidos([
      { ...APERTURA, pedidos_anticipados_estado: estado },
    ], '2026-09-10T12:00');
    assert.equal(resultado.tipo, 'no_disponible');
  }
});

test('dos aperturas activas producen conflicto explícito', () => {
  const resultado = seleccionarAperturaActivaParaPedidos([
    APERTURA,
    {
      ...APERTURA,
      apertura_id: 'APE-20260920',
      fecha_apertura: '2026-09-20T00:00:00.000',
    },
  ], '2026-09-10T12:00');
  assert.equal(resultado.tipo, 'conflicto');
});

test('la hora actual se expresa como hora de pared de Santiago', () => {
  assert.equal(fechaHoraSantiago(new Date('2026-09-10T15:34:00.000Z')), '2026-09-10T12:34');
});

test('el calendario público y el bloqueo de pedidos solo se habilitan en TEST', () => {
  assert.equal(pedidosAnticipadosConCalendarioHabilitados('test'), true);
  for (const entorno of ['production', 'local', 'demo', undefined]) {
    assert.equal(pedidosAnticipadosConCalendarioHabilitados(entorno), false);
  }
});

test('la ruta pública usa un DTO saneado y la creación valida antes de escribir', async () => {
  const rutaPublica = await readFile(
    new URL('../src/app/api/aperturas/relevante/route.ts', import.meta.url),
    'utf8'
  );
  const rutaPedidos = await readFile(
    new URL('../src/app/api/pedidos/route.ts', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(rutaPublica, /GOOGLE_SCRIPT_ADMIN_TOKEN|observaciones_internas|creada_por/);
  assert.match(rutaPedidos, /exigirAperturaActivaParaCrearPedidoTest/);
  assert.ok(
    rutaPedidos.indexOf('exigirAperturaActivaParaCrearPedidoTest') <
      rutaPedidos.lastIndexOf('crearPedido(')
  );
});
