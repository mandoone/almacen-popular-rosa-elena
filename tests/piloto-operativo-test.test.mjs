import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  crearIdsPiloto,
  esFixtureDecimalPiloto,
  esFixtureUnidadPiloto,
  normalizarCierreAperturaPiloto,
  normalizarErrorTransportePiloto,
  normalizarFechaAperturaPiloto,
  normalizarHoraAperturaPiloto,
  seleccionarAperturaPedidoPiloto,
  validarAjustesCompensadosPiloto,
  validarConfiguracionPiloto,
  validarDestinoPiloto,
  validarPropuestaPiloto,
} from '../scripts/lib/piloto-operativo-test-guardrails.mjs';

const CONFIG = {
  NEXT_PUBLIC_APP_ENV: 'test',
  GOOGLE_SCRIPT_PEDIDOS_URL_TEST: 'https://script.google.com/macros/s/TEST_ONLY/exec',
  GOOGLE_SCRIPT_ADMIN_TOKEN_TEST: 'token_test_controlado',
};

test('piloto: guardarraíl acepta solo TEST y exige opt-in para escribir', () => {
  assert.equal(validarConfiguracionPiloto(CONFIG).ok, true);
  assert.equal(validarConfiguracionPiloto(CONFIG, { escritura: true }).ok, false);
  assert.equal(validarConfiguracionPiloto({
    ...CONFIG,
    PILOTO_OPERATIVO_ENABLE_WRITES: 'HABILITAR_PILOTO_TEST',
  }, { escritura: true }).ok, true);
});

test('piloto: cualquier configuración productiva bloquea', () => {
  assert.equal(validarConfiguracionPiloto({
    ...CONFIG,
    GOOGLE_SCRIPT_PEDIDOS_URL: 'presente',
  }).ok, false);
  assert.equal(validarConfiguracionPiloto({
    ...CONFIG,
    NEXT_PUBLIC_APP_ENV: 'production',
  }).ok, false);
});

test('piloto: IDs estables permiten reanudar sin cambiar payloads', () => {
  const ids = crearIdsPiloto('0123456789abcdef01234567', '2026-09-16');
  assert.equal(ids.marcador, 'PILOTO-TEST-0123456789abcdef01234567');
  assert.equal(ids.aperturaId, 'APE-20260916');
  assert.equal(ids.compra, crearIdsPiloto('0123456789abcdef01234567', '2026-09-16').compra);
  assert.match(ids.ventaUnidad, /^piloto_test_venta_unidad_/);
});

test('piloto: destino exige ambos contratos sobre la Sheet TEST exacta', () => {
  const base = {
    entorno: 'TEST',
    destino: 'backend_test_verificado',
    sheet_nombre: 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES',
  };
  assert.equal(validarDestinoPiloto(base, { ...base, contrato: 'fase78_test_v1' }), true);
  assert.equal(validarDestinoPiloto(base, { ...base, contrato: 'otro' }), false);
});

test('piloto: fixtures aislados conservan reglas entero y decimal', () => {
  assert.equal(esFixtureUnidadPiloto({
    id_producto: 'PROD-TEST-F78-64C8BE2C22E0', unidad_medida: 'unidad',
    permite_decimal: 'NO', paso_venta: 1,
  }), true);
  assert.equal(esFixtureDecimalPiloto({
    id_producto: 'PROD-TEST-DECIMAL', unidad_medida: 'kg',
    permite_decimal: 'SI', paso_venta: 0.1,
  }), true);
});

test('piloto: pedido usa la única apertura cuyo cierre anticipado sigue vigente', () => {
  const seleccionada = seleccionarAperturaPedidoPiloto([
    { apertura_id: 'APE-AYER', estado_apertura: 'activa', pedidos_anticipados_estado: 'activo', cierre_pedidos_anticipados: '2026-09-16T23:59:00.000' },
    { apertura_id: 'APE-FUTURA', estado_apertura: 'activa', pedidos_anticipados_estado: 'activo', cierre_pedidos_anticipados: '2026-09-18T23:59:00.000' },
    { apertura_id: 'APE-PAUSADA', estado_apertura: 'activa', pedidos_anticipados_estado: 'pausado', cierre_pedidos_anticipados: '2026-09-20T23:59:00.000' },
  ], '2026-09-17T12:00');
  assert.equal(seleccionada.apertura_id, 'APE-FUTURA');
});

test('piloto: abastecimiento usa subtotal por línea y presupuesto global', () => {
  const propuesta = {
    presupuesto: 5000,
    total_propuesto: 1100,
    saldo_sin_asignar: 3900,
    lineas: [{
      producto_id: 'PROD-TEST-F78-64C8BE2C22E0',
      cantidad_sugerida: 1,
      costo_unitario: 1100,
      subtotal: 1100,
    }],
    omitidos: [{ producto_id: 'PROD-SIN-COSTO', motivo: 'Falta costo vigente valido.' }],
    advertencia: 'PROPUESTA DE ABASTECIMIENTO TEST / NO USAR COMO RECOMENDACION OPERATIVA REAL',
  };
  assert.equal(validarPropuestaPiloto(propuesta, 'PROD-TEST-F78-64C8BE2C22E0').subtotal, 1100);
  assert.throws(() => validarPropuestaPiloto({
    ...propuesta,
    lineas: [{
      producto_id: 'PROD-TEST-F78-64C8BE2C22E0',
      cantidad_sugerida: 1,
      costo_unitario: 1100,
      costo_total: 1100,
    }],
  }, 'PROD-TEST-F78-64C8BE2C22E0'), /contrato de costo conocido/);
});

test('piloto: reanudación reconoce ajustes compensados sin repetirlos', () => {
  const baja = {
    producto_id: 'PROD-TEST-F78-64C8BE2C22E0',
    cantidad: -1,
    stock_anterior: 2,
    stock_resultante: 1,
  };
  const restaura = {
    producto_id: 'PROD-TEST-F78-64C8BE2C22E0',
    cantidad: 1,
    stock_anterior: 1,
    stock_resultante: 2,
  };
  assert.equal(validarAjustesCompensadosPiloto(
    baja,
    restaura,
    'PROD-TEST-F78-64C8BE2C22E0'
  ), true);
  assert.throws(() => validarAjustesCompensadosPiloto(
    baja,
    { ...restaura, stock_resultante: 3 },
    'PROD-TEST-F78-64C8BE2C22E0'
  ), /stock neto/);
});

test('piloto: cierre normaliza fecha de apertura leída desde Sheets', () => {
  assert.equal(normalizarFechaAperturaPiloto('2026-09-17'), '2026-09-17');
  assert.equal(normalizarFechaAperturaPiloto('2026-09-17T00:00:00.000'), '2026-09-17');
  assert.equal(normalizarHoraAperturaPiloto('1899-12-30T00:00:00.000'), '00:00');
  assert.equal(normalizarHoraAperturaPiloto('1899-12-30T23:59:00.000'), '23:59');
  assert.equal(normalizarCierreAperturaPiloto('2026-09-16T23:59:00.000'), '2026-09-16T23:59');
  assert.throws(() => normalizarFechaAperturaPiloto('2026-02-31T00:00:00.000'), /no es válida/);
});

test('piloto: AbortError no estándar se clasifica como timeout sanitizado', () => {
  const timeout = normalizarErrorTransportePiloto({
    name: 'AbortError',
    message: 'This operation was aborted',
  });
  assert.equal(timeout.tipoE2E, 'timeout');
  assert.doesNotMatch(timeout.message, /operation was aborted/i);
  const red = normalizarErrorTransportePiloto(new TypeError('URL privada'));
  assert.equal(red.tipoE2E, 'red');
  assert.doesNotMatch(red.message, /URL privada/);
});

test('piloto: runner consulta evidencia antes de POST y no carga env files', async () => {
  const source = await readFile(new URL('../scripts/piloto-operativo-test.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /dotenv|\.env\.local|readFileSync\s*\(/);
  assert.match(source, /buscarPedidoPorMarcador/);
  assert.match(source, /buscarPorIdempotencia/);
  assert.match(source, /postIdempotente/);
  assert.match(source, /cerrarAperturaPiloto/);
  assert.match(source, /crearErrorRedireccionPostAGetE2E/);
  assert.match(source, /postConvertidoAGet/);
  const cancelacion = source.slice(
    source.indexOf('async function postCancelacion'),
    source.indexOf('async function solicitar')
  );
  assert.equal((cancelacion.match(/postUnaVez\(/g) || []).length, 1,
    'La cancelación no debe repetir un POST ambiguo.');
  assert.match(cancelacion, /get\(config, 'obtenerPedido'/,
    'La cancelación ambigua debe recuperarse por evidencia GET.');
  assert.match(source, /MAX_INTENTOS_GET_PILOTO = 5/);
  assert.doesNotMatch(source, /MAX_INTENTOS_GET_PILOTO\s*=\s*(?:[6-9]|\d{2,})/);
  assert.match(source,
    /obtenerResumenApertura'[\s\S]{0,120}apertura_id: aperturaPedidos\.apertura_id/,
    'El pedido anticipado debe validarse en su propia apertura, no en la apertura de ventas.');
  assert.match(source,
    /const reportesPedidos[\s\S]{0,220}apertura_id: aperturaPedidos\.apertura_id/,
    'El historial del pedido debe consultarse en su apertura anticipada.');
  assert.ok(source.indexOf("if (!escritura)") < source.indexOf('seleccionarAperturaPedidoPiloto('),
    'El preflight read-only no debe exigir una nueva apertura anticipada.');
  assert.match(source, /pedidoExistente\s*\?\s*\{ apertura_id: pedidoExistente\.apertura_id \}/,
    'La reanudación debe reutilizar la apertura del pedido ya persistido.');
  assert.ok(source.indexOf('await finalizarPilotoRestaurado(') <
    source.indexOf('await prepararProductoUnidad(config, ids)'),
  'Una restauración parcial debe cerrarse antes de intentar reactivar el fixture.');
});

test('piloto: backup remoto exige token, TEST e idempotencia', async () => {
  const source = await readFile(new URL('../scripts/apps-script-pedidos.gs', import.meta.url), 'utf8');
  assert.match(source, /case 'crearBackupPilotoTest':[\s\S]{0,180}exigirToken_\(body\.token\);[\s\S]{0,180}validarEntornoTestFase78_\(\)/);
  assert.match(source, /function crearBackupPilotoTest_\(body\)[\s\S]{0,260}exigirIdempotencyKey_\(body\.idempotency_key\)/);
  assert.match(source, /ejecutarIdempotenteBajoLock_\([\s\S]{0,100}'crearBackupPilotoTest'/);
  assert.match(source, /function obtenerEvidenciaPilotoTest_\(params\)/);
  assert.match(source, /solo_lectura: true/);
});
