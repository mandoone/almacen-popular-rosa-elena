import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { assertFase78SoloTest } from '../src/lib/env.ts';
import { resolverIntentoIdempotente } from '../src/lib/fase8/clienteAdmin.ts';

async function fuente(ruta) { return readFile(new URL(ruta, import.meta.url), 'utf8'); }

test('Fase 7/8: la UI conserva clave ante retry idéntico y la rota si cambia el payload', () => {
  const primero = resolverIntentoIdempotente(null, 'COMPRA', { total: 1000 });
  const replay = resolverIntentoIdempotente(primero, 'COMPRA', { total: 1000 });
  const distinto = resolverIntentoIdempotente(primero, 'COMPRA', { total: 2000 });
  assert.equal(replay.clave, primero.clave);
  assert.notEqual(distinto.clave, primero.clave);
});

async function cargarAppsScript() {
  const codigo = await fuente('../scripts/apps-script-pedidos.gs');
  const contexto = {
    Utilities: {
      getUuid: () => '12345678-0000-0000-0000-000000000000',
      formatDate: () => '2026-09-15 12:00:00',
      computeDigest: () => [1, 2, 3],
      DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
    },
    Session: { getScriptTimeZone: () => 'America/Santiago' },
  };
  vm.runInNewContext(codigo, contexto, { filename: 'apps-script-pedidos.gs' });
  return { codigo, contexto };
}

test('Fase 7/8: Apps Script compila y todas las acciones nuevas exigen token y TEST', async () => {
  const { codigo } = await cargarAppsScript();
  const accionesGet = ['verificarDestinoFase78Test','obtenerEsquemaFase78Test','listarCompras','obtenerCompra','listarGastosExtra','obtenerGastoExtra','listarHistorialCostos','listarMovimientosStockAdmin','listarProductosAdmin','obtenerReportesFase78','obtenerCajaCompra','obtenerPropuestaAbastecimiento'];
  const accionesPost = ['prepararEsquemaFase78Test','crearCompra','crearGastoExtra','registrarCajaCompra','crearProductoAdmin','actualizarProductoAdmin','ajustarStockAdmin'];
  for (const accion of [...accionesGet, ...accionesPost]) {
    const patron = new RegExp(`case '${accion}':[\\s\\S]{0,180}exigirToken_\\([^)]+\\);[\\s\\S]{0,120}validarEntornoTestFase78_\\(\\)`);
    assert.match(codigo, patron, accion);
  }
  assert.match(codigo, /function validarEntornoTestFase78_\(\)[\s\S]*entorno !== 'TEST'/);
});

test('Fase 7: normaliza compra válida y rechaza costo decimal o producto duplicado', async () => {
  const { contexto } = await cargarAppsScript();
  const compra = contexto.normalizarCompra_({
    fecha: '2026-09-15',
    proveedor: ' Proveedor TEST ', responsable: ' Admin TEST ',
    lineas: [{ producto_id: 'PROD-001', cantidad: 2, costo_unitario: 900 }],
  });
  assert.equal(compra.proveedor, 'Proveedor TEST');
  assert.equal(compra.lineas[0].cantidad, 2);
  assert.throws(() => contexto.normalizarCompra_({ fecha: '2026-09-15', proveedor: 'P', responsable: 'R', lineas: [{ producto_id: 'PROD-001', cantidad: 1, costo_unitario: 1.5 }] }), /entero CLP/);
  assert.throws(() => contexto.normalizarCompra_({ fecha: '2026-09-15', proveedor: 'P', responsable: 'R', lineas: [{ producto_id: 'PROD-001', cantidad: 1, costo_unitario: 1 }, { producto_id: 'PROD-001', cantidad: 1, costo_unitario: 1 }] }), /repetido/);
});

test('Fase 7: persistencia de compra usa lock, cabecera final y rollback de todos los efectos', async () => {
  const { codigo } = await cargarAppsScript();
  assert.match(codigo, /function crearCompra_\(body\)[\s\S]*tryLock\(30000\)/);
  assert.match(codigo, /function persistirCompraIdempotente_[\s\S]*payload_hash[\s\S]*409/);
  assert.match(codigo, /agregarFila_\(detalles[\s\S]*registrarMovimiento_\(movimientos[\s\S]*agregarFila_\(costos[\s\S]*agregarFila_\(compras/);
  assert.match(codigo, /catch \(err\)[\s\S]*setValue\(linea\.stock_anterior\)[\s\S]*eliminarFilasAgregadas_\(costos\.sheet/);
});

test('Fase 7: esquema es aditivo y el backup TEST precede cualquier cambio estructural', async () => {
  const { codigo } = await cargarAppsScript();
  const inicio = codigo.indexOf('function prepararEsquemaFase78Test_');
  const fin = codigo.indexOf('function crearCompra_', inicio);
  const bloque = codigo.slice(inicio, fin);
  assert.ok(bloque.indexOf("ss.copy('BACKUP TEST F78 '") < bloque.indexOf('ss.insertSheet'));
  for (const hoja of ['COMPRAS','DETALLE_COMPRAS','GASTOS_EXTRA','HISTORIAL_COSTOS','CAJA_COMPRA']) assert.match(codigo, new RegExp(`${hoja}: '${hoja}'`));
  assert.match(bloque, /asegurarColumnasAditivas_/);
  assert.doesNotMatch(bloque, /deleteSheet|deleteColumn|clear\(/);
});

test('Fase 7: propuesta remota omite costo pendiente, respeta presupuesto y declara TEST', async () => {
  const { contexto } = await cargarAppsScript();
  contexto.listarProductosAdmin_ = () => [
    { id_producto: 'PROD-SIN-COSTO', nombre: 'Sin costo', activo: 'SI', stock_actual: 0, stock_minimo: 2, prioridad: 'alta', permite_decimal: 'NO', paso_venta: 1, precio_costo: '' },
    { id_producto: 'PROD-CON-COSTO', nombre: 'Con costo', activo: 'SI', stock_actual: 0, stock_minimo: 3, prioridad: 'media', permite_decimal: 'NO', paso_venta: 1, precio_costo: 1000 },
  ];
  const propuesta = contexto.obtenerPropuestaAbastecimiento_(2500);
  assert.equal(propuesta.total_propuesto, 2000);
  assert.equal(propuesta.saldo_sin_asignar, 500);
  assert.equal(propuesta.lineas[0].cantidad_sugerida, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(propuesta.omitidos)), [{ producto_id: 'PROD-SIN-COSTO', motivo: 'Falta costo vigente valido.' }]);
  assert.match(propuesta.advertencia, /TEST.*NO USAR/);
});

test('Fase 8: producto admin nunca acepta stock_actual y ajuste exige movimiento', async () => {
  const { codigo, contexto } = await cargarAppsScript();
  assert.throws(() => contexto.normalizarCambioProductoAdmin_({ producto_id: 'PROD-001', cambios: { stock_actual: 10 } }), /no editable/);
  assert.throws(() => contexto.normalizarCambioProductoAdmin_({ producto_id: 'PROD-001', cambios: { permite_decimal: 'NO', paso_venta: 0.5 } }), /paso 1/);
  assert.match(codigo, /function ajustarStockAdmin_[\s\S]*registrarMovimiento_\(movimientos/);
  assert.match(codigo, /nuevo < 0[\s\S]*409/);
});

test('Fase 8: rutas admin quedan cubiertas por middleware y POST no tiene retry automático', async () => {
  const middleware = await fuente('../src/middleware.ts');
  const cliente = await fuente('../src/lib/appsScriptPedidos.ts');
  assert.match(middleware, /matcher: \['\/admin', '\/admin\/:path\+', '\/api\/admin\/:path\+'\]/);
  assert.match(cliente, /async function postScript[\s\S]*await fetch/);
  const bloquePost = cliente.slice(cliente.indexOf('async function postScript'), cliente.indexOf('async function getScript'));
  assert.doesNotMatch(bloquePost, /for \(let intento|MAX_INTENTOS_GET/);
  assert.match(cliente, /function exigirEntornoTestParaFase78/);
});

test('Fase 7/8: guardarraíl Next habilita exclusivamente TEST', () => {
  assert.doesNotThrow(() => assertFase78SoloTest('test'));
  for (const entorno of ['production', 'local', 'demo', 'desconocido']) {
    assert.throws(() => assertFase78SoloTest(entorno), /solo está habilitada en TEST/);
  }
});

test('Fase 7/8: UI identifica TEST y advertencia de abastecimiento no operativo', async () => {
  const [compras, gastos, abastecimiento, productos, historiales] = await Promise.all([
    fuente('../src/app/admin/compras/page.tsx'), fuente('../src/app/admin/gastos/page.tsx'),
    fuente('../src/app/admin/abastecimiento/page.tsx'), fuente('../src/app/admin/productos/page.tsx'),
    fuente('../src/app/admin/historiales/page.tsx'),
  ]);
  for (const pagina of [compras, gastos, abastecimiento, productos, historiales]) assert.match(pagina, /TEST/);
  assert.match(abastecimiento, /NO USAR COMO RECOMENDACIÓN OPERATIVA REAL/);
  assert.match(productos, /stock nunca se edita directamente/i);
});
