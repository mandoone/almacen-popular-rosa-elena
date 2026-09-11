import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

import {
  crearBorradorApertura,
  formatearCierreApertura,
  formatearFechaApertura,
  formatearHorarioApertura,
  idAperturaDesdeFecha,
  normalizarAperturaAdmin,
  normalizarAperturaAdminRespuesta,
  normalizarCierreApertura,
  normalizarFechaApertura,
  normalizarHoraApertura,
  validarAperturaEditable,
} from '../src/lib/fase3b/adminAperturas.ts';
import { assertCalendarioSoloTest } from '../src/lib/env.ts';

const APERTURA_VALIDA = {
  apertura_id: 'APE-20260919',
  fecha_apertura: '2026-09-19',
  hora_inicio: '11:00',
  hora_termino: '15:00',
  lugar: 'Punto de retiro TEST',
  cierre_pedidos_anticipados: '2026-09-17T23:59',
  estado_apertura: 'activa',
  pedidos_anticipados_estado: 'activo',
  modo_presencial_estado: 'inactivo',
  mensaje_publico: '',
  observaciones_internas: '',
};

test('el borrador deriva ID, horario y jueves anterior desde la fecha', () => {
  assert.deepEqual(crearBorradorApertura('2026-10-03'), {
    apertura_id: 'APE-20261003',
    fecha_apertura: '2026-10-03',
    hora_inicio: '11:00',
    hora_termino: '15:00',
    lugar: '',
    cierre_pedidos_anticipados: '2026-10-01T23:59',
    estado_apertura: 'por_confirmar',
    pedidos_anticipados_estado: 'activo',
    modo_presencial_estado: 'inactivo',
    mensaje_publico: '',
    observaciones_internas: '',
  });
});

test('idAperturaDesdeFecha solo deriva IDs desde yyyy-MM-dd', () => {
  assert.equal(idAperturaDesdeFecha('2026-12-19'), 'APE-20261219');
  assert.equal(idAperturaDesdeFecha('19-12-2026'), '');
});

test('validarAperturaEditable acepta y normaliza una apertura completa', () => {
  const resultado = validarAperturaEditable({ ...APERTURA_VALIDA, lugar: '  TEST  ' });
  assert.equal(resultado.ok, true);
  assert.equal(resultado.apertura.lugar, 'TEST');
});

test('validarAperturaEditable rechaza fecha inexistente e ID incoherente', () => {
  const fechaInvalida = validarAperturaEditable({
    ...APERTURA_VALIDA,
    apertura_id: 'APE-20260231',
    fecha_apertura: '2026-02-31',
  });
  assert.equal(fechaInvalida.ok, false);
  assert.match(fechaInvalida.error, /fecha_apertura/);

  const idInvalido = validarAperturaEditable({ ...APERTURA_VALIDA, apertura_id: 'APE-20260920' });
  assert.equal(idInvalido.ok, false);
  assert.match(idInvalido.error, /coincidir/);
});

test('validarAperturaEditable exige lugar para programada/activa, no para borrador', () => {
  const publicada = validarAperturaEditable({ ...APERTURA_VALIDA, lugar: '' });
  assert.equal(publicada.ok, false);
  assert.match(publicada.error, /lugar/i);

  const borrador = validarAperturaEditable({
    ...APERTURA_VALIDA,
    lugar: '',
    estado_apertura: 'por_confirmar',
  });
  assert.equal(borrador.ok, true);
});

test('validarAperturaEditable rechaza horarios, cierres y enums invalidos', () => {
  assert.equal(validarAperturaEditable({ ...APERTURA_VALIDA, hora_termino: '10:00' }).ok, false);
  assert.equal(validarAperturaEditable({
    ...APERTURA_VALIDA,
    cierre_pedidos_anticipados: '2026-09-19T11:00',
  }).ok, false);
  assert.equal(validarAperturaEditable({ ...APERTURA_VALIDA, estado_apertura: 'publicada' }).ok, false);
});

test('normaliza fechas y horas ISO de Google Sheets sin desplazarlas por zona horaria', () => {
  const respuesta = normalizarAperturaAdminRespuesta({
    ...APERTURA_VALIDA,
    fecha_apertura: '2026-09-19T00:00:00.000',
    hora_inicio: '1899-12-30T11:00:00.000',
    hora_termino: '1899-12-30T15:00:00.000',
    cierre_pedidos_anticipados: '2026-09-17T23:59:00.000',
  });

  assert.equal(respuesta.fecha_apertura, '2026-09-19');
  assert.equal(respuesta.hora_inicio, '11:00');
  assert.equal(respuesta.hora_termino, '15:00');
  assert.equal(respuesta.cierre_pedidos_anticipados, '2026-09-17T23:59');
  assert.equal(normalizarAperturaAdmin(respuesta).fecha_apertura, '2026-09-19');
  assert.equal(formatearFechaApertura('2026-09-19T00:00:00.000'), '19-09-2026');
  assert.equal(
    formatearHorarioApertura('1899-12-30T11:00:00.000', '1899-12-30T15:00:00.000'),
    '11:00–15:00'
  );
  assert.equal(formatearCierreApertura('2026-09-17T23:59:00.000'), '17-09-2026 23:59');
});

test('mantiene los formatos canonicos de validacion existentes', () => {
  assert.equal(normalizarFechaApertura('2026-09-19'), '2026-09-19');
  assert.equal(normalizarHoraApertura('11:00'), '11:00');
  assert.equal(normalizarCierreApertura('2026-09-17T23:59'), '2026-09-17T23:59');
});

test('el guardrail Next habilita calendario solo en TEST', () => {
  assert.doesNotThrow(() => assertCalendarioSoloTest('test'));
  for (const entorno of ['production', 'local', 'demo', 'desconocido']) {
    assert.throws(() => assertCalendarioSoloTest(entorno), /solo esta habilitada en TEST/);
  }
});

test('Apps Script compila como JavaScript y contiene las siete semillas sin secretos', async () => {
  const fuente = await readFile(new URL('../scripts/apps-script-pedidos.gs', import.meta.url), 'utf8');
  const contexto = {};
  vm.runInNewContext(fuente, contexto, { filename: 'apps-script-pedidos.gs' });

  assert.equal(typeof contexto.prepararHojaAperturasTest, 'function');
  assert.equal(typeof contexto.prepararColumnasPedidosAnticipadosTest, 'function');
  assert.equal(typeof contexto.validarYNormalizarApertura_, 'function');
  assert.equal(typeof contexto.seleccionarAperturaActivaPedidoTest_, 'function');
  assert.equal(fuente.includes("var SPREADSHEET_ID = 'PEGAR_ID_BASE_OPERATIVA_AQUI'"), true);
  assert.equal(fuente.includes("var ADMIN_TOKEN = 'PEGAR_TOKEN_ADMIN_AQUI'"), true);
  assert.equal((fuente.match(/\['APE-2026\d{4}'/g) ?? []).length, 7);
  assert.match(fuente, /getProperty\('APP_ENV'\)/);
  assert.match(fuente, /entorno !== 'TEST'/);

  const semillas = contexto.semillasAperturasTest_();
  assert.deepEqual(
    JSON.parse(JSON.stringify(
      semillas.map((a) => [a.apertura_id, a.fecha_apertura, a.cierre_pedidos_anticipados])
    )),
    [
      ['APE-20260919', '2026-09-19', '2026-09-17T23:59'],
      ['APE-20261003', '2026-10-03', '2026-10-01T23:59'],
      ['APE-20261017', '2026-10-17', '2026-10-15T23:59'],
      ['APE-20261107', '2026-11-07', '2026-11-05T23:59'],
      ['APE-20261121', '2026-11-21', '2026-11-19T23:59'],
      ['APE-20261205', '2026-12-05', '2026-12-03T23:59'],
      ['APE-20261219', '2026-12-19', '2026-12-17T23:59'],
    ]
  );
  assert.equal(contexto.validarYNormalizarApertura_(APERTURA_VALIDA).apertura_id, 'APE-20260919');
  assert.throws(
    () => contexto.validarYNormalizarApertura_({ ...APERTURA_VALIDA, hora_termino: '09:00' }),
    /hora_inicio debe ser anterior/
  );

  const activa = contexto.seleccionarAperturaActivaPedidoTest_([
    {
      ...APERTURA_VALIDA,
      fecha_apertura: '2026-09-19T00:00:00.000',
      hora_inicio: '1899-12-30T11:00:00.000',
      hora_termino: '1899-12-30T15:00:00.000',
      cierre_pedidos_anticipados: '2026-09-17T23:59:00.000',
    },
  ], '2026-09-10T12:00');
  assert.equal(activa.apertura_id, 'APE-20260919');
  assert.equal(
    contexto.seleccionarAperturaActivaPedidoTest_([APERTURA_VALIDA], '2026-09-18T00:00'),
    null
  );
  assert.throws(
    () => contexto.seleccionarAperturaActivaPedidoTest_([
      APERTURA_VALIDA,
      {
        ...APERTURA_VALIDA,
        apertura_id: 'APE-20260920',
        fecha_apertura: '2026-09-20',
      },
    ], '2026-09-10T12:00'),
    /mas de una apertura activa/
  );
});

test('las rutas de aperturas quedan cubiertas por autenticacion admin', async () => {
  const middleware = await readFile(new URL('../src/middleware.ts', import.meta.url), 'utf8');
  assert.match(middleware, /'\/api\/admin\/:path\+'/);

  for (const ruta of [
    '../src/app/api/admin/aperturas/route.ts',
    '../src/app/api/admin/aperturas/[id]/route.ts',
    '../src/app/api/admin/aperturas/[id]/estado/route.ts',
  ]) {
    const fuente = await readFile(new URL(ruta, import.meta.url), 'utf8');
    assert.doesNotMatch(fuente, /GOOGLE_SCRIPT_ADMIN_TOKEN/);
    assert.doesNotMatch(fuente, /GOOGLE_SCRIPT_PEDIDOS_URL/);
  }
});
