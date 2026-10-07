import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { crearEscenarioCompra, objetos } from './helpers/compra-identidad-escenario.mjs';
import { crearFixturesFamilias } from './fixtures/familias-producto.mjs';
import { auditarMapaFamiliasSku, prepararCambioFamilia } from '../src/lib/familiasProducto.ts';
import { dtoFamiliaAdmin, dtoIdentidadSkuAdmin } from '../src/lib/familiasAdmin.ts';
import { capacidadParaRuta } from '../src/lib/fase9/autorizacion.ts';
import { ID_TEST_B2, NOMBRE_TEST_B2, FAMILIAS_B2, IDENTIDAD_B2, SNAPSHOTS_B2 } from '../scripts/lib/familias-b2.mjs';
import { prepararAuditoriaFamiliasB3Test, planificarAuditoriaFamiliasB3 } from '../scripts/lib/familias-b3.mjs';

const plano = x => JSON.parse(JSON.stringify(x));
async function escenario() {
  const c = await crearEscenarioCompra();
  c.contexto.SPREADSHEET_ID = '1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM';
  c.bodyFamilia = { familia: { ...c.economico, nombre_publico: 'Cloro QA nuevo', familia_id: 'FAM-QA-NUEVA' }, responsable: 'qa-local', idempotency_key: 'familia_qa_123456789' };
  delete c.bodyFamilia.familia.version_oferta; delete c.bodyFamilia.familia.actualizado_en;
  return c;
}
function editar(c, familia, key = 'familia_qa_update_123') {
  const f = { ...familia }; delete f.version_oferta; delete f.actualizado_en;
  return { familia: f, version_esperada: familia.version_oferta, responsable: 'qa-local', idempotency_key: key };
}

test('B3: CRUD TEST audita entidad FAMILIA sin producto_id, sin tocar operación física', async () => {
  const c = await escenario(), antes = c.estado();
  const f = c.contexto.mutarFamiliaProductoAdmin_(c.bodyFamilia, true);
  assert.equal(f.version_oferta, 1);
  assert.equal(c.contexto.listarFamiliasProductoAdmin_().familias.length, 2);
  assert.equal(c.contexto.obtenerFamiliaProductoAdmin_(f.familia_id).precio_venta, 650);
  const edit = editar(c, { ...f, precio_venta: 700, activo: 'NO' });
  assert.equal(c.contexto.mutarFamiliaProductoAdmin_(edit, false).version_oferta, 2);
  const audit = objetos(c.hojas.AUDITORIA_PRODUCTOS);
  assert.equal(audit.length, 2); assert.equal(audit[0].entidad_tipo, 'FAMILIA'); assert.equal(audit[0].producto_id, '');
  assert.equal(JSON.parse(audit[0].cambios_json).estado, 'COMPLETADA');
  for (const n of ['PRODUCTOS', 'COMPRAS', 'DETALLE_COMPRAS', 'MOVIMIENTOS_STOCK', 'HISTORIAL_COSTOS']) assert.deepEqual(c.estado()[n], antes[n]);
  assert.equal(c.bloqueado(), false);
});

test('B3: replay durable conserva oferta original tras cambiar maestro; otra key/reparto no sobrescribe', async () => {
  const c = await escenario(), original = c.contexto.mutarFamiliaProductoAdmin_(c.bodyFamilia, true);
  c.contexto.mutarFamiliaProductoAdmin_(editar(c, { ...original, precio_venta: 800 }), false);
  assert.deepEqual(plano(c.contexto.mutarFamiliaProductoAdmin_(c.bodyFamilia, true)), plano(original));
  assert.throws(() => c.contexto.mutarFamiliaProductoAdmin_({ ...c.bodyFamilia, familia: { ...c.bodyFamilia.familia, precio_venta: 900 } }, true), /idempotencia/);
  assert.equal(objetos(c.hojas.AUDITORIA_PRODUCTOS).length, 2);
});

test('B3: versión optimista, ID inmutable, duplicados y campos físicos rechazados', async () => {
  const c = await escenario(), f = c.contexto.mutarFamiliaProductoAdmin_(c.bodyFamilia, true);
  const antes = c.estado();
  for (const body of [
    { ...editar(c, f), version_esperada: 0 },
    editar(c, { ...f, familia_id: 'FAM-OTRO' }),
    { ...editar(c, f), familia: { ...editar(c, f).familia, stock_actual: 5 } },
    { ...editar(c, f), familia: { ...editar(c, f).familia, version_oferta: 80 } },
  ]) assert.throws(() => c.contexto.mutarFamiliaProductoAdmin_(body, false));
  assert.throws(() => c.contexto.mutarFamiliaProductoAdmin_({ ...c.bodyFamilia, idempotency_key: 'key_distinta_12345' }, true), /existe/);
  assert.deepEqual(c.estado(), antes);
});

test('B3: SKU asociación valida familia/contenido/marca; desasocia sin alterar stock/costo/precio', async () => {
  const c = await escenario(), p = objetos(c.productos)[0], antes = c.estado();
  for (const cambios of [{ familia_id: 'FAM-NO-EXISTE' }, { contenido_cantidad: 750 }]) {
    assert.throws(() => c.contexto.actualizarProductoAdmin_({ producto_id: p.id_producto, cambios, responsable: 'qa-local', idempotency_key: 'sku_mal_12345678' }));
    assert.deepEqual(c.estado(), antes);
  }
  const r = c.contexto.actualizarProductoAdmin_({ producto_id: p.id_producto, cambios: { familia_id: '' }, responsable: 'qa-local', idempotency_key: 'sku_clear_12345678' });
  for (const campo of ['stock_actual', 'precio_costo', 'precio_venta']) assert.equal(r[campo], p[campo]);
  assert.equal(r.familia_id, '');
});

test('B3: cambiar condiciones de familia no rompe SKU ya asociado', async () => {
  const c = await escenario(), antes = c.estado();
  const b = editar(c, { ...c.economico, contenido_cantidad: 750 });
  assert.throws(() => c.contexto.mutarFamiliaProductoAdmin_(b, false), /incompatible/);
  assert.deepEqual(c.estado(), antes);
});

for (const [hoja, op] of [['FAMILIAS_PRODUCTO', 'appendRow'], ['FAMILIAS_PRODUCTO', 'setValues'], ['AUDITORIA_PRODUCTOS', 'appendRow']]) {
  test(`B3: rollback ante ${hoja}.${op} restaura oferta y auditoría`, async () => {
    const c = await escenario(), crear = op !== 'setValues';
    const b = crear ? c.bodyFamilia : editar(c, { ...c.economico, precio_venta: 700 });
    const antes = c.estado(); c.control.fallarUnaVez(hoja, op);
    assert.throws(() => c.contexto.mutarFamiliaProductoAdmin_(b, crear), /fallo simulado/);
    assert.deepEqual(c.estado(), antes); assert.equal(c.bloqueado(), false);
    assert.equal(c.contexto.mutarFamiliaProductoAdmin_(b, crear).precio_venta, crear ? 650 : 700);
  });
}

test('B3: interrupción durable pendiente exige revisión, no rehace escritura', async () => {
  const c = await escenario(); c.contexto.mutarFamiliaProductoAdmin_(c.bodyFamilia, true);
  const h = c.hojas.AUDITORIA_PRODUCTOS, col = h.headers.indexOf('cambios_json');
  const evento = JSON.parse(h.filas[0][col]); evento.estado = 'PREPARADA'; h.filas[0][col] = JSON.stringify(evento);
  const antes = c.estado();
  assert.throws(() => c.contexto.mutarFamiliaProductoAdmin_(c.bodyFamilia, true), /REQUIERE_REVISION/);
  assert.throws(() => c.contexto.mutarFamiliaProductoAdmin_(editar(c, c.contexto.obtenerFamiliaProductoAdmin_('FAM-QA-NUEVA')), false), /REQUIERE_REVISION/);
  assert.deepEqual(c.estado(), antes);
});

test('B3: destino ajeno y esquema audit incompleto bloquean antes de escribir', async () => {
  const c = await escenario(), antes = c.estado();
  c.contexto.SPREADSHEET_ID = 'otro';
  assert.throws(() => c.contexto.mutarFamiliaProductoAdmin_(c.bodyFamilia, true), /no autorizado/);
  c.contexto.SPREADSHEET_ID = '1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM';
  c.hojas.AUDITORIA_PRODUCTOS.headers.pop();
  assert.throws(() => c.contexto.mutarFamiliaProductoAdmin_(c.bodyFamilia, true), /CONTRATO/);
  assert.deepEqual(c.estado(), antes);
});

test('B3: dry-run distingue faltante, inactivo, explicit mismatch, contenido y granel', () => {
  const { economico, cloros, clorinda, skuClorinda, arroz, granel } = crearFixturesFamilias();
  const audit = auditarMapaFamiliasSku([economico, clorinda, arroz, { ...economico, familia_id: 'FAM-VACIA' }], [
    { ...cloros[0], activo: 'NO' }, { ...cloros[1], contenido_cantidad: 750 }, { ...skuClorinda, marca: 'Otra' }, { ...granel[0], gramos_unidad_stock: 333 },
    { ...cloros[0], id_producto: 'PROD-HUERFANO', familia_id: 'FAM-FALTA' },
  ]);
  for (const codigo of ['FAMILIA_SIN_SKU', 'SKU_ASOCIADO_INACTIVO', 'FAMILIA_ACTIVA_SIN_SKU_ELEGIBLE', 'MARCA_NO_EQUIVALENTE', 'CONTENIDO_NO_EQUIVALENTE', 'BASE_STOCK_GRANEL_INVALIDA', 'FAMILIA_INEXISTENTE']) assert.ok(audit.inconsistencias.some(i => i.codigo === codigo));
});

test('B3: DTO identidad excluye operación física; oferta no permite versiones ni actor; permiso administración', () => {
  assert.throws(() => dtoIdentidadSkuAdmin({ cambios: { stock_actual: 5 } }));
  assert.throws(() => dtoFamiliaAdmin({ familia: { familia_id: 'FAM-QA', version_oferta: 1 } }));
  assert.equal('actor' in dtoFamiliaAdmin({ familia: { familia_id: 'FAM-QA' }, actor: 'falso' }), false);
  assert.equal(capacidadParaRuta('/api/admin/familias', 'PATCH'), 'productos:gestionar');
  assert.equal(capacidadParaRuta('/admin/familias'), 'productos:gestionar');
  const { economico } = crearFixturesFamilias(), entrada = { ...economico }; delete entrada.version_oferta; delete entrada.actualizado_en;
  assert.throws(() => prepararCambioFamilia(economico, entrada, 99), /CONFLICTO/);
});

test('B3: rutas/UI están cerradas fuera de TEST; compras/pedidos no importan familia admin', async () => {
  for (const path of ['src/app/api/admin/familias/route.ts', 'src/app/api/admin/familias/identidad/route.ts', 'src/app/admin/familias/page.tsx']) {
    const s = await readFile(path, 'utf8'); assert.match(s, /obtenerEntornoAplicacion\(process.env.NEXT_PUBLIC_APP_ENV\) !== 'test'/);
    if (path.includes('/api/')) assert.match(s, /sesionTieneCapacidad\(req, 'productos:gestionar'\)/);
  }
});

function estadoB3() {
  const valores = { PRODUCTOS: [['id_producto', ...IDENTIDAD_B2], ['PROD-QA']], DETALLE_COMPRAS: [['producto_id', ...SNAPSHOTS_B2], ['PROD-QA']], FAMILIAS_PRODUCTO: [FAMILIAS_B2], AUDITORIA_PRODUCTOS: [['auditoria_id', 'producto_id'], ['AUD-QA', 'PROD-QA']] };
  return { meta: { spreadsheetId: ID_TEST_B2, properties: { title: NOMBRE_TEST_B2 }, sheets: Object.keys(valores).map((title, sheetId) => ({ properties: { title, sheetId, gridProperties: { columnCount: 26 } } })) }, valores };
}
test('B3: migración protegida agrega solo cuatro headers; replay 0 y backup obligatorio', async () => {
  let estado = estadoB3(), escrituras = 0, backups = 0;
  const adapter = { leer: async () => structuredClone(estado), backup: async () => { backups++; return { verificado: true }; }, aplicar: async requests => { escrituras++; estado.valores.AUDITORIA_PRODUCTOS[0].push(...requests[0].updateCells.rows[0].values.map(v => v.userEnteredValue.stringValue)); } };
  assert.equal((await prepararAuditoriaFamiliasB3Test(adapter)).cambios, 1);
  assert.equal((await prepararAuditoriaFamiliasB3Test(adapter)).cambios, 0);
  assert.equal(escrituras, 1); assert.equal(backups, 1);
  assert.deepEqual(estado.valores.AUDITORIA_PRODUCTOS[1], ['AUD-QA', 'PROD-QA']);
  estado = estadoB3(); adapter.backup = async () => ({ verificado: false });
  await assert.rejects(prepararAuditoriaFamiliasB3Test(adapter), /Backup/);
});
test('B3: migración aborta si B2 está incompleta o aparece identidad real', () => {
  const a = estadoB3(); a.valores.PRODUCTOS[0].pop(); assert.throws(() => planificarAuditoriaFamiliasB3(a), /incompleta/);
  const b = estadoB3(); b.valores.PRODUCTOS[1][1] = 'FAM-REAL'; assert.throws(() => planificarAuditoriaFamiliasB3(b));
});
