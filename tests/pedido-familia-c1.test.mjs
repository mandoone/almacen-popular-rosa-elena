import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { crearFixturesFamilias } from './fixtures/familias-producto.mjs';
import { crearDetallePedidoFamiliaV2, leerOfertaSnapshotV2, modeloLineaPedido, validarContratoAsignacionV2, COLUMNAS_ASIGNACIONES_PEDIDO } from '../src/lib/familias/pedidoV2.ts';
const datos = () => { const f = crearFixturesFamilias(); return { ...f, solicitud: { modelo_linea: 'FAMILIA_V2', familia_id: f.economico.familia_id, cantidad_solicitada: 6, unidad_solicitada: 'unidad', version_oferta: 1 } }; };
test('C1: contrato V2 congela oferta; no guarda FAM en id_producto ni cantidad nativa', () => {
  const { economico, solicitud } = datos();
  const linea = crearDetallePedidoFamiliaV2('PED-QA', 'DPE-QA', { ...solicitud, precio_unitario: 1, marca_snapshot: 'Falsa' }, economico);
  assert.equal(linea.id_producto, ''); assert.equal(linea.cantidad, ''); assert.equal(linea.precio_unitario, 650); assert.equal(linea.subtotal, 3900);
  assert.deepEqual(leerOfertaSnapshotV2(linea), economico); economico.precio_venta = 800;
  assert.equal(leerOfertaSnapshotV2(linea).precio_venta, 650);
});
test('C1: históricos vacíos y SKU_V1 explícitos preservan versión; desconocido/mixed falla', () => {
  for (const modelo_linea of [undefined, null, '', 'SKU_V1']) assert.equal(modeloLineaPedido({ modelo_linea, id_producto: 'ID-HISTORICO-01' }), 'SKU_V1');
  for (const fila of [{ modelo_linea: 'V3', id_producto: 'PROD-QA' }, { id_producto: 'FAM-QA' }, { modelo_linea: 'FAMILIA_V2', id_producto: 'FAM-QA' }, { id_producto: 'PROD-QA', familia_id: 'FAM-QA' }]) assert.throws(() => modeloLineaPedido(fila));
});
for (const cantidad of [0, -1, 1.5, NaN, Infinity, '6', Number.MAX_SAFE_INTEGER + 1]) test(`C1: cantidad inválida ${cantidad}`, () => {
  const { economico, solicitud } = datos(); assert.throws(() => crearDetallePedidoFamiliaV2('PED-QA', 'DPE-QA', { ...solicitud, cantidad_solicitada: cantidad }, economico));
});
test('C1: oferta/version/unidad obsoleta y snapshot manipulado rechazan', () => {
  const { economico, solicitud } = datos();
  for (const cambios of [{ version_oferta: 2 }, { familia_id: 'FAM-OTRA' }, { unidad_solicitada: 'ml' }]) assert.throws(() => crearDetallePedidoFamiliaV2('PED-QA', 'DPE-QA', { ...solicitud, ...cambios }, economico));
  const l = crearDetallePedidoFamiliaV2('PED-QA', 'DPE-QA', solicitud, economico);
  for (const cambios of [{ subtotal: 1 }, { precio_unitario: 1 }, { familia_id: 'FAM-OTRA' }, { oferta_snapshot_json: '{mal}' }]) assert.throws(() => leerOfertaSnapshotV2({ ...l, ...cambios }));
});
test('C1: granel precio de línea se redondea una vez (150g=203)', () => {
  const { arroz } = datos(), f = { ...arroz, precio_venta: 1350, gramos_referencia: 1000 };
  const l = crearDetallePedidoFamiliaV2('PED-QA', 'DPE-G', { modelo_linea: 'FAMILIA_V2', familia_id: f.familia_id, cantidad_solicitada: 150, unidad_solicitada: 'g', version_oferta: f.version_oferta }, f);
  assert.equal(l.subtotal, 203); assert.equal(leerOfertaSnapshotV2(l).gramos_referencia, 1000);
});
test('C1: asignación futura usa SKU físico y snapshots; ningún contrato permite stock familiar', () => {
  const a = { asignacion_id: 'ASI-QA', id_detalle_pedido: 'DPE-QA', producto_id: 'PROD-QA', cantidad_asignada: 1, cantidad_stock: 1, unidad_stock_snapshot: 'unidad', nombre_sku_snapshot: 'Cloro', marca_snapshot: 'A', presentacion_snapshot: '1L', operacion_id: 'OP-QA', actor: 'qa-local', creado_en: '2026-10-07T08:00:00Z' };
  validarContratoAsignacionV2(a); assert.throws(() => validarContratoAsignacionV2({ ...a, producto_id: 'FAM-QA' }));
  assert.equal(COLUMNAS_ASIGNACIONES_PEDIDO.includes('stock_actual'), false);
});
test('C1: contratos aislados sin import desde rutas, tienda, transporte o Apps Script', async () => {
  for (const p of ['src/app/api/pedidos/route.ts', 'src/app/api/productos/route.ts', 'src/app/tienda/page.tsx', 'src/lib/appsScriptPedidos.ts', 'scripts/apps-script-pedidos.gs']) assert.doesNotMatch(await readFile(p, 'utf8'), /pedidoV2|ASIGNACIONES_PEDIDO|FAMILIA_V2/);
});
