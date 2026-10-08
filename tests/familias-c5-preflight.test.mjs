/** C5 parcial: exclusivamente matrices/puertos sintéticos; cero red o credenciales. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { auditarPreflightC5, planificarEsquemaPedidoFamiliasC5Test, prepararPedidoFamiliasC5Test, verificarBackupC5 } from '../scripts/lib/familias-c5.mjs';
import { ID_TEST_B2, NOMBRE_TEST_B2, FAMILIAS_B2 } from '../scripts/lib/familias-b2.mjs';
import { COLUMNAS_DIARIO_REQUERIDAS_C5, COLUMNAS_ASIGNACIONES_PEDIDO, MAPEO_MOVIMIENTO_C5, CAMPOS_OBSERVACION_MOVIMIENTO_C5 } from '../src/lib/familias/esquemaDurableV2.ts';
import { escenarioC4, opcionesC4, cancelarInputC4, reasignarInputC4 } from './fixtures/familias-durable-c4.mjs';
import { crearDetallePedidoFamiliaV2 } from '../src/lib/familias/pedidoV2.ts';
import { confirmarPedidoV2Durable, cancelarPedidoV2Durable, reasignarPedidoV2Durable } from '../src/lib/familias/adaptadorDurableV2.ts';

const headersProducto = ['id_producto','activo','nombre','categoria','prioridad','unidad_medida','permite_decimal','paso_venta','precio_costo','margen_pct','precio_venta','stock_actual','stock_minimo','imagen_url','observaciones','actualizado_en','tipo_disponibilidad','modo_venta','gramos_referencia','gramos_unidad_stock','familia_id','marca','presentacion','contenido_cantidad','contenido_unidad'];
const headersPedido = ['id_pedido','fecha_hora','canal','id_cliente','nombre_cliente','telefono','total','estado_pedido','estado_pago','forma_pago','observaciones','vendedor_admin','fecha_entrega','apertura_id','origen_pedido'];
const headersDetalle = ['id_pedido','id_producto','nombre_producto','cantidad','unidad_medida','precio_unitario','subtotal','modo_venta','gramos_solicitados','gramos_referencia','gramos_unidad_stock'];
const headersMovimiento = ['id_movimiento','fecha_hora','tipo','origen','id_origen','id_producto','cantidad','stock_anterior','stock_resultante','usuario','observaciones','movimiento_id','producto_id','tipo_movimiento','referencia_tipo','referencia_id','apertura_id','observacion','payload_hash','operacion_id'];
function fila(headers, objeto) { return headers.map(h => objeto[h] ?? ''); }
function nativas(valores) { return Object.fromEntries(Object.entries(valores).map(([n, m]) => [n, m.map(r => r.map(v => ({
  userEnteredValue: typeof v === 'number' ? { numberValue: v } : { stringValue: v },
}))) ])); }
function escenario() {
  const valores = {
    PRODUCTOS: [headersProducto, fila(headersProducto, { id_producto: 'PROD-QA-LOCAL', activo: 'SI', stock_actual: 11, precio_costo: 590, precio_venta: 650 })],
    PEDIDOS: [headersPedido, fila(headersPedido, { id_pedido: 'PED-QA-LOCAL', estado_pedido: 'recibido', telefono: '+56000000000' })],
    DETALLE_PEDIDOS: [headersDetalle, fila(headersDetalle, { id_pedido: 'PED-QA-LOCAL', id_producto: 'PROD-QA-LOCAL', cantidad: 1 })],
    MOVIMIENTOS_STOCK: [headersMovimiento, fila(headersMovimiento, { movimiento_id: 'MOV-QA-LOCAL', id_movimiento: 'MOV-QA-LOCAL' })],
    OPERACIONES_PEDIDOS: [[...COLUMNAS_DIARIO_REQUERIDAS_C5]], FAMILIAS_PRODUCTO: [[...FAMILIAS_B2]],
  };
  const meta = { spreadsheetId: ID_TEST_B2, properties: { title: NOMBRE_TEST_B2 }, sheets: Object.entries(valores).map(([title], index) => ({ properties: {
    sheetId: 100 + index, title, index, sheetType: 'GRID', gridProperties: { rowCount: 1000, columnCount: 26, frozenRowCount: 1 },
  } })) };
  const estado = { meta, valores, celdas: nativas(valores) };
  // Una fórmula nativa sintética demuestra conservación de estructura, no solo valor mostrado.
  estado.celdas.PEDIDOS[1][5] = { userEnteredValue: { formulaValue: '=+56000000000' }, userEnteredFormat: { numberFormat: { type: 'NUMBER' } } };
  let backups = 0, aplicaciones = 0;
  const adapter = {
    leer: async () => structuredClone(estado), timestamp: () => '2026-10-07T00-00-00Z',
    backup: async title => { backups++; const b = structuredClone(estado); b.meta.spreadsheetId = 'BACKUP-QA-LOCAL'; b.meta.properties.title = title; return b; },
    aplicar: async requests => {
      aplicaciones++;
      for (const req of requests) {
        if (req.addSheet) { const p = req.addSheet.properties; estado.meta.sheets.push({ properties: { ...p, index: estado.meta.sheets.length, sheetType: 'GRID' } }); estado.valores[p.title] = [[]]; estado.celdas[p.title] = [[]]; }
        if (req.appendDimension) estado.meta.sheets.find(s => s.properties.sheetId === req.appendDimension.sheetId).properties.gridProperties.columnCount += req.appendDimension.length;
        if (req.updateCells) {
          const u = req.updateCells, n = estado.meta.sheets.find(s => s.properties.sheetId === u.range.sheetId).properties.title;
          u.rows[0].values.forEach((v, i) => { estado.valores[n][0][u.range.startColumnIndex + i] = v.userEnteredValue.stringValue; estado.celdas[n][0][u.range.startColumnIndex + i] = structuredClone(v); });
        }
      }
    },
  };
  return { estado, adapter, contadores: () => ({ backups, aplicaciones }) };
}
function opV1() { return fila(COLUMNAS_DIARIO_REQUERIDAS_C5, { operacion_id: 'OP-QA-LOCAL', idempotency_key: 'key_qa_local_1', tipo_operacion: 'CREAR_PEDIDO', id_pedido: 'PED-QA-LOCAL', estado_operacion: 'REQUIERE_REVISION', snapshot_json: JSON.stringify({ version: 1, tipo_operacion: 'CREAR_PEDIDO' }) }); }
test('C5 esquema mínimo: 13 columnas aditivas y hoja de13; sin cambio a movimientos/diario', () => {
  const c = escenario(), plan = planificarEsquemaPedidoFamiliasC5Test(c.estado.meta, c.estado.valores);
  assert.equal(plan.hojas_nuevas, 1); assert.equal(plan.headers_nuevos, 26);
  assert.deepEqual(Object.fromEntries(Object.entries(plan.columnas).map(([n, a]) => [n, a.length])), { PRODUCTOS: 2, PEDIDOS: 3, DETALLE_PEDIDOS: 8 });
  assert.equal(plan.requests.filter(r => r.appendDimension).length, 1); // PRODUCTOS25→27, sin mover columnas.
  assert.equal(plan.requests.filter(r => r.updateCells).every(r => r.updateCells.range.startRowIndex === 0 && r.updateCells.fields === 'userEnteredValue'), true);
});
for (const campo of ['spreadsheetId', 'title']) test(`C5 destino diferente ${campo}: STOP antes de backup/aplicar`, async () => {
  const c = escenario(); if (campo === 'title') c.estado.meta.properties.title = 'OTRO'; else c.estado.meta.spreadsheetId = 'OTRO';
  await assert.rejects(prepararPedidoFamiliasC5Test(c.adapter), /DESTINO_TEST_NO_VERIFICADO/);
  assert.deepEqual(c.contadores(), { backups: 0, aplicaciones: 0 });
});
for (const [hoja, columna] of [['PRODUCTOS','id_producto'],['PEDIDOS','id_pedido'],['MOVIMIENTOS_STOCK','movimiento_id'],['OPERACIONES_PEDIDOS','operacion_id'],['OPERACIONES_PEDIDOS','idempotency_key']]) test(`C5 ID duplicado ${hoja}/${columna}: ninguna escritura, incluso backup`, async () => {
  const c = escenario(), m = c.estado.valores[hoja];
  if (hoja === 'OPERACIONES_PEDIDOS') m.push(opV1());
  const clon = [...m[1]], id = m[0].indexOf(columna);
  if (hoja === 'MOVIMIENTOS_STOCK') clon[m[0].indexOf(columna === 'movimiento_id' ? 'id_movimiento' : 'movimiento_id')] = 'MOV-OTRO';
  assert.ok(clon[id]); m.push(clon);
  const antes = structuredClone(c.estado);
  await assert.rejects(prepararPedidoFamiliasC5Test(c.adapter), /ID_DUPLICADO/);
  assert.deepEqual(c.estado, antes); assert.deepEqual(c.contadores(), { backups: 0, aplicaciones: 0 });
});
test('R2 alias legacy repetido no se trata como identidad canónica moderna', () => {
  const c = escenario(), m = c.estado.valores.MOVIMIENTOS_STOCK, otro = [...m[1]];
  otro[m[0].indexOf('movimiento_id')] = 'MOV-QA-OTRO'; m.push(otro);
  assert.equal(auditarPreflightC5(c.estado.meta, c.estado.valores).seguro, true);
});
test('C5 header duplicado o datos sin header no permiten reinterpretar columnas ocupadas', () => {
  const c = escenario(); c.estado.valores.PRODUCTOS[0] = [...headersProducto, 'stock_actual'];
  assert.equal(auditarPreflightC5(c.estado.meta, c.estado.valores).seguro, false);
  const d = escenario(); d.estado.valores.PRODUCTOS[1].push('DATOS_SIN_HEADER');
  assert.throws(() => planificarEsquemaPedidoFamiliasC5Test(d.estado.meta, d.estado.valores), /DATOS_SIN_HEADER/);
});
test('C5 dos diarios V1 inciertos: conservan bloqueo global C4; nunca se ignoran para fixtures', async () => {
  const c = escenario(), a = opV1(), b = opV1(); b[0] = 'OP-QA-OTRO'; b[1] = 'key_qa_local_2';
  c.estado.valores.OPERACIONES_PEDIDOS.push(a, b);
  const audit = auditarPreflightC5(c.estado.meta, c.estado.valores);
  assert.equal(audit.bloqueo_global, true); assert.equal(audit.operaciones_incompletas, 2);
  await assert.rejects(prepararPedidoFamiliasC5Test(c.adapter), /DIARIO_INCOMPLETO_BLOQUEO_GLOBAL/);
  assert.deepEqual(c.contadores(), { backups: 0, aplicaciones: 0 });
});
test('C5 diario V1 completo no se migra ni reinterpreta', async () => {
  const c = escenario(), op = opV1(); op[COLUMNAS_DIARIO_REQUERIDAS_C5.indexOf('estado_operacion')] = 'COMPLETADA';
  c.estado.valores.OPERACIONES_PEDIDOS.push(op); c.estado.celdas.OPERACIONES_PEDIDOS = nativas({ x: c.estado.valores.OPERACIONES_PEDIDOS }).x;
  await prepararPedidoFamiliasC5Test(c.adapter); assert.deepEqual(c.estado.valores.OPERACIONES_PEDIDOS[1], op);
});
for (const problema of ['familia', 'mapa']) test(`C5 estado comercial inesperado ${problema}: no migrar`, async () => {
  const c = escenario();
  if (problema === 'familia') c.estado.valores.FAMILIAS_PRODUCTO.push(fila(FAMILIAS_B2, { familia_id: 'FAM-QA-LOCAL' }));
  else c.estado.valores.PRODUCTOS[1][headersProducto.indexOf('familia_id')] = 'FAM-QA-LOCAL';
  await assert.rejects(prepararPedidoFamiliasC5Test(c.adapter), /PREEXISTENT/); assert.equal(c.contadores().aplicaciones, 0);
});
test('C5 backup y readback: fórmulas/celdas históricas intactas, segunda ejecución0 sin segundo backup', async () => {
  const c = escenario(), antes = structuredClone(c.estado);
  const r = await prepararPedidoFamiliasC5Test(c.adapter); assert.ok(r.cambios > 0);
  assert.equal(c.estado.valores.PRODUCTOS[0].length, 27); assert.equal(c.estado.valores.PEDIDOS[0].length, 18); assert.equal(c.estado.valores.DETALLE_PEDIDOS[0].length, 19);
  assert.deepEqual(c.estado.valores.ASIGNACIONES_PEDIDO, [[...COLUMNAS_ASIGNACIONES_PEDIDO]]);
  for (const n of Object.keys(antes.valores)) assert.deepEqual(c.estado.valores[n].slice(1), antes.valores[n].slice(1));
  assert.deepEqual(c.estado.celdas.PEDIDOS[1][5], antes.celdas.PEDIDOS[1][5]);
  assert.equal((await prepararPedidoFamiliasC5Test(c.adapter)).cambios, 0);
  assert.deepEqual(c.contadores(), { backups: 1, aplicaciones: 1 });
});
for (const caso of ['id', 'title', 'value', 'formula', 'structure', 'missingCells']) test(`C5 backup no confiable ${caso}:0 aplicaciones`, async () => {
  const c = escenario(), crear = c.adapter.backup;
  c.adapter.backup = async title => { const b = await crear(title);
    if (caso === 'id') b.meta.spreadsheetId = ID_TEST_B2;
    if (caso === 'title') b.meta.properties.title = 'NO ES BACKUP';
    if (caso === 'value') b.valores.PRODUCTOS[1][11] = 99;
    if (caso === 'formula') b.celdas.PEDIDOS[1][5].userEnteredValue = { numberValue: 56000000000 };
    if (caso === 'structure') b.meta.sheets[0].properties.gridProperties.frozenRowCount = 0;
    if (caso === 'missingCells') delete b.celdas;
    assert.equal(Boolean(verificarBackupC5(c.estado, b)), false); return b;
  };
  await assert.rejects(prepararPedidoFamiliasC5Test(c.adapter), /BACKUP_NO_CONFIABLE/); assert.equal(c.contadores().aplicaciones, 0);
});
test('C5 cambio concurrente tras backup detiene antes de aplicar', async () => {
  const c = escenario(), crear = c.adapter.backup;
  c.adapter.backup = async title => { const b = await crear(title); c.estado.valores.PRODUCTOS[1][11] = 10; return b; };
  await assert.rejects(prepararPedidoFamiliasC5Test(c.adapter), /CAMBIO_CONCURRENTE/); assert.equal(c.contadores().aplicaciones, 0);
});
for (const caso of ['stock', 'formula', 'schema']) test(`C5 readback corrupto ${caso}: STOP, sin segunda migración o reparación automática`, async () => {
  const c = escenario(), aplicar = c.adapter.aplicar;
  c.adapter.aplicar = async requests => { await aplicar(requests);
    if (caso === 'stock') c.estado.valores.PRODUCTOS[1][11] = 99;
    if (caso === 'formula') c.estado.celdas.PEDIDOS[1][5].userEnteredValue = { stringValue: 'ALTERADA' };
    if (caso === 'schema') { c.estado.valores.PRODUCTOS[0].pop(); c.estado.celdas.PRODUCTOS[0].pop(); }
  };
  await assert.rejects(prepararPedidoFamiliasC5Test(c.adapter), /STOP_C5_(CELDA|ESTRUCTURA|READBACK)/);
  assert.equal(c.contadores().aplicaciones, 1);
});
test('C5 propuesta de movimiento cubre todos los campos C4, sin columnas por comodidad', async () => {
  const c = escenarioC4(); await confirmarPedidoV2Durable(c.almacen, c.input, opcionesC4);
  for (const m of c.estado.hojas.MOVIMIENTOS_STOCK)
    assert.deepEqual(Object.keys(m).sort(), [...Object.keys(MAPEO_MOVIMIENTO_C5), ...CAMPOS_OBSERVACION_MOVIMIENTO_C5].filter(k => m[k] !== undefined).sort());
});
test('C5/D50 pedido nuevo con familia desactivada es rechazado, pedido anterior conserva snapshot', () => {
  const c = escenarioC4(), antes = structuredClone(c.estado.hojas.DETALLE_PEDIDOS);
  const familia = c.estado.hojas.FAMILIAS_PRODUCTO[0]; familia.activo = 'NO';
  assert.throws(() => crearDetallePedidoFamiliaV2('PED-NUEVO', 'DPE-NUEVO', { modelo_linea: 'FAMILIA_V2', familia_id: familia.familia_id, cantidad_solicitada: 1, unidad_solicitada: 'unidad', version_oferta: 1 }, familia), /FAMILIA_NO_VENDIBLE/);
  assert.deepEqual(c.estado.hojas.DETALLE_PEDIDOS, antes); assert.equal(c.estado.hojas.PEDIDOS[0].estado, 'recibido');
});
for (const caso of ['contenido', 'marca', 'inactivo', 'stock', 'apertura']) test(`C5/D50 PERMITIR_SNAPSHOT nunca omite validación física ${caso}`, async () => {
  const c = escenarioC4({ apertura: caso === 'apertura' }); c.estado.hojas.FAMILIAS_PRODUCTO[0].activo = 'NO';
  const s = c.estado.hojas.PRODUCTOS[0];
  if (caso === 'contenido') s.contenido_cantidad = 750;
  if (caso === 'marca') s.marca = '';
  if (caso === 'inactivo') s.activo = 'NO';
  if (caso === 'stock') s.stock_actual = 3;
  if (caso === 'apertura') c.estado.hojas.APERTURA_PRODUCTOS[0].habilitado = 'NO';
  const antes = structuredClone(c.estado.hojas);
  await assert.rejects(confirmarPedidoV2Durable(c.almacen, c.input, opcionesC4));
  assert.deepEqual(c.estado.hojas, antes); assert.equal(c.estado.eventos.length, 0);
});
test('C5/D50 recibido desactivado: confirmar/reasignar/cancelar conserva650 e histórico y devuelve reparto vigente', async () => {
  const c = escenarioC4(), antes = structuredClone(c.estado.hojas.DETALLE_PEDIDOS);
  c.estado.hojas.FAMILIAS_PRODUCTO[0].activo = 'NO';
  await confirmarPedidoV2Durable(c.almacen, c.input, opcionesC4);
  await reasignarPedidoV2Durable(c.nuevoProceso(), reasignarInputC4(c), opcionesC4);
  assert.deepEqual(c.estado.hojas.PRODUCTOS.map(s => s.stock_actual), [3, 2]); assert.equal(c.estado.hojas.ASIGNACIONES_PEDIDO.length, 4);
  const input = cancelarInputC4(c); await cancelarPedidoV2Durable(c.nuevoProceso(), input, opcionesC4);
  await cancelarPedidoV2Durable(c.nuevoProceso(), input, opcionesC4);
  assert.deepEqual(c.estado.hojas.PRODUCTOS.map(s => s.stock_actual), [4, 7]); assert.deepEqual(c.estado.hojas.DETALLE_PEDIDOS, antes);
});
