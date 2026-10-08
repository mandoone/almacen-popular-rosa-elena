import test from 'node:test';
import assert from 'node:assert/strict';
import { construirCatalogoFamiliasShadow, skuParaShadow } from '../src/lib/familias/catalogoShadow.ts';
import { leerMapaPropuesto, validarMapaPropuesto } from '../src/lib/familias/mapaDryRun.ts';
import { auditarFaltantesIdentidad, esSkuFixtureConocido } from '../src/lib/familias/auditoriaIdentidad.ts';
import { crearFixturesFamilias } from './fixtures/familias-producto.mjs';
const fixture = crearFixturesFamilias;
const shadow = (skus, f = fixture().economico, c = {}) => construirCatalogoFamiliasShadow([f], skus, c)[0];
const code = (v, c) => v.inconsistencias.some(i => i.codigo === c);
const mapa = (...skus) => skus.map(s => ({ familia_id: s.familia_id, producto_id: s.id_producto }));
const dry = (m, fs = [fixture().economico], ss = fixture().cloros, c = {}) => validarMapaPropuesto(m, fs, ss, c);

test('C6: Cloro A4+B7=11, disponible, oferta separada de marcas/stock', () => {
  const f = fixture(), v = shadow(f.cloros);
  assert.equal(v.stock_agregado_interno, 11); assert.equal(v.disponible, true);
  assert.deepEqual(v.sku_elegibles, f.cloros.map(s => s.id_producto));
  assert.equal(v.oferta.precio_venta, 650); assert.equal('marca_publica' in v.oferta, false);
  for (const key of ['stock_actual', 'stock_agregado_interno', 'precio_costo', 'sku_integrantes', 'marca', 'nombre_sku']) assert.equal(key in v.oferta, false);
  assert.equal(v.sku_integrantes[0].marca, 'Marca A');
});
test('C6: costos/precios SKU no cambian precio de familia ni entran en DTO', () => {
  const ss = fixture().cloros.map(s => ({ ...s, precio_costo: 9999, precio_venta: 3, proveedor: 'Falso' }));
  assert.equal(shadow(ss).oferta.precio_venta, 650);
  for (const s of ss.map(skuParaShadow)) for (const k of ['precio_costo', 'precio_venta', 'proveedor']) assert.equal(k in s, false);
});
test('C6: Clorinda conserva familia y marca explícita; NO_APLICA no marca', () => {
  const f = fixture(), [e, c, a] = construirCatalogoFamiliasShadow([f.economico, f.clorinda, f.arroz], [...f.cloros, f.skuClorinda, ...f.granel]);
  assert.equal(e.stock_agregado_interno, 11); assert.equal(c.stock_agregado_interno, 9);
  assert.equal(c.oferta.marca_publica, 'Clorinda'); assert.equal('marca_publica' in a.oferta, false);
});
test('C6: incompatibilidad 1L no aporta a750ml, válidos siguen disponibles', () => {
  const f = fixture(), v = shadow([...f.shampoos, f.shampooIncompatible], f.shampoo);
  assert.equal(v.stock_agregado_interno, 5); assert.equal(v.disponible, true);
  assert.equal(v.sku_integrantes[2].elegible, false); assert.ok(code(v, 'CONTENIDO_NO_EQUIVALENTE'));
});
for (const [nombre, cambios, codigo] of [
  ['inactivo', { activo: 'NO' }, 'SKU_ASOCIADO_INACTIVO'],
  ['marca faltante', { marca: '' }, 'MARCA_FISICA_REQUERIDA'],
  ['contenido distinto', { contenido_cantidad: 750 }, 'CONTENIDO_NO_EQUIVALENTE'],
  ['categoría', { categoria: 'Higiene' }, 'CATEGORIA_NO_EQUIVALENTE'],
  ['modo', { modo_venta: 'GRANEL' }, 'MODO_NO_EQUIVALENTE'],
  ['stock negativo', { stock_actual: -1 }, 'STOCK_INVALIDO'],
  ['NaN', { stock_actual: NaN }, 'STOCK_INVALIDO'],
  ['infinito', { stock_actual: Infinity }, 'STOCK_INVALIDO'],
  ['tipo inválido', { tipo_disponibilidad: 'OTRO' }, 'TIPO_DISPONIBILIDAD_INVALIDO'],
  ['activo inválido', { activo: 'quizá' }, 'SKU_ACTIVO_INVALIDO'],
  ['marca fórmula', { marca: '=1' }, 'TEXTO_IDENTIDAD_INVALIDO'],
]) test(`C6: excluir SKU ${nombre} sin perder disponibilidad del válido`, () => {
  const ss = fixture().cloros; ss[0] = { ...ss[0], ...cambios }; const v = shadow(ss);
  assert.equal(v.stock_agregado_interno, 7); assert.equal(v.disponible, true); assert.ok(code(v, codigo));
});
test('C6: stock0 agotado, familia inactiva0, stock positivo disponible', () => {
  assert.equal(shadow(fixture().cloros.map(s => ({ ...s, stock_actual: 0 }))).disponible, false);
  const v = shadow(fixture().cloros, { ...fixture().economico, activo: 'NO' });
  assert.equal(v.disponible, false); assert.equal(v.stock_agregado_interno, 0);
});
test('C6: definición estricta >0 incluso decimal menor que paso; no cambia fase A', () => {
  const f = { ...fixture().economico, permite_decimal: 'SI', paso_venta: 0.5 };
  const s = { ...fixture().cloros[0], permite_decimal: 'SI', paso_venta: 0.5, stock_actual: 0.1 };
  assert.equal(shadow([s], f).disponible, true);
});
test('C6: POR_APERTURA requiere contexto y habilitación', () => {
  const f = fixture();
  assert.equal(shadow([f.especial]).disponible, false);
  assert.equal(shadow([f.especial], f.economico, { apertura_id: 'APE-20261010', sku_habilitados: [] }).disponible, false);
  assert.equal(shadow([f.especial], f.economico, { apertura_id: 'APE-20261010', sku_habilitados: [f.especial.id_producto] }).stock_agregado_interno, 30);
  assert.equal(shadow(f.cloros, f.economico, { apertura_id: 'invalida' }).disponible, false);
});
for (const cambios of [{ precio_venta: 0 }, { precio_venta: -1 }, { precio_venta: 1.2 }, { precio_venta: Infinity }, { version_oferta: 0 }, { contenido_cantidad: 0 }, { politica_marca: 'OTRA' }]) test(`C6: oferta inválida bloquea ${JSON.stringify(cambios)}`, () => {
  const v = shadow(fixture().cloros, { ...fixture().economico, ...cambios });
  assert.equal(v.disponible, false); assert.equal(v.stock_agregado_interno, 0);
});
test('C6: duplicados de familia no vendibles; SKU duplicado no suma', () => {
  const f = fixture();
  assert.ok(construirCatalogoFamiliasShadow([f.economico, f.economico], f.cloros).every(v => !v.disponible));
  const v = shadow([...f.cloros, f.cloros[0]]);
  assert.equal(v.stock_agregado_interno, 7); assert.ok(code(v, 'SKU_DUPLICADO'));
});
test('C6: familia sin SKU warning; SKU sin familia no se infiere por nombre', () => {
  const f = fixture(), v = shadow([{ ...f.legado, nombre: f.economico.nombre_publico }]);
  assert.equal(v.stock_agregado_interno, 0); assert.ok(code(v, 'FAMILIA_SIN_SKU'));
});
test('C6: marca ajena no suma EXPLICITA', () => {
  const f = fixture(), v = shadow([{ ...f.skuClorinda, marca: 'Otra' }], f.clorinda);
  assert.equal(v.disponible, false); assert.ok(code(v, 'MARCA_NO_EQUIVALENTE'));
});
test('C6: granel250/1000 suma3000g, 100g adicional200g, no unidades nativas', () => {
  const f = fixture(), ss = [...f.granel, { ...f.granel[0], id_producto: 'PROD-QA-G100', gramos_unidad_stock: 100, stock_actual: 2 }];
  const v = shadow(ss, f.arroz);
  assert.equal(v.stock_agregado_interno, 3200); assert.equal(v.unidad_stock_interna, 'g'); assert.equal(v.disponible, true);
});
test('C6: base granel incompatible excluida; sumatoria overflow no anuncia disponible', () => {
  const f = fixture(), ss = f.granel.map(s => ({ ...s })); ss[0].gramos_unidad_stock = 500;
  const v = shadow(ss, f.arroz); assert.equal(v.stock_agregado_interno, 2000); assert.ok(code(v, 'BASE_STOCK_GRANEL_INVALIDA'));
  const overflow = shadow(f.cloros.map(s => ({ ...s, stock_actual: Number.MAX_SAFE_INTEGER })));
  assert.equal(overflow.disponible, false); assert.ok(code(overflow, 'AGREGADO_FUERA_RANGO'));
});
test('C6: shadow/dry-run no mutan entrada ni heredan precios SKU', () => {
  const f = fixture(), antes = JSON.stringify(f), propuesta = mapa(...f.cloros);
  const r = dry(propuesta, [f.economico], f.cloros); shadow(f.cloros);
  assert.equal(r.estado, 'CUMPLE'); assert.equal(r.catalogo_propuesto[0].oferta.precio_venta, 650); assert.equal(JSON.stringify(f), antes);
});
test('C6: mapa JSON/CSV equivalentes; espacios normalizados', () => {
  const f = fixture(), m = mapa(...f.cloros);
  assert.deepEqual(leerMapaPropuesto(JSON.stringify(m), 'JSON'), m);
  assert.deepEqual(leerMapaPropuesto('familia_id,producto_id\r\n' + m.map(a => ` ${a.familia_id} , ${a.producto_id} `).join('\n'), 'CSV'), m);
});
for (const [entrada, formato] of [['{}', 'JSON'], ['[{"familia_id":"FAM-X","producto_id":"PROD-X","marca":"Inventada"}]', 'JSON'], ['[{"familia_id":"FAM-X","producto_id":"FAM-X"}]', 'JSON'], ['marca,producto_id\na,b', 'CSV'], ['familia_id,producto_id\nFAM-X,PROD-X,EXTRA', 'CSV'], ['familia_id,producto_id\n"FAM-X","PROD-X"', 'CSV'], ['x'.repeat(200001), 'JSON']]) test(`C6: parser rechaza ${formato} ${entrada.slice(0, 60)}`, () => assert.throws(() => leerMapaPropuesto(entrada, formato)));
for (const [m, c] of [
  [[{ familia_id: 'FAM-INEXISTENTE', producto_id: fixture().cloros[0].id_producto }], 'FAMILIA_INEXISTENTE'],
  [[{ familia_id: fixture().economico.familia_id, producto_id: 'PROD-INEXISTENTE' }], 'SKU_INEXISTENTE'],
  [[...mapa(fixture().cloros[0]), ...mapa(fixture().cloros[0])], 'ASOCIACION_DUPLICADA'],
  [[...mapa(fixture().cloros[0]), { familia_id: fixture().clorinda.familia_id, producto_id: fixture().cloros[0].id_producto }], 'SKU_EN_DOS_FAMILIAS'],
]) test(`C6: dry-run bloquea ${c}`, () => { const r = dry(m); assert.equal(r.estado, 'BLOQUEADO'); assert.ok(r.hallazgos.some(h => h.codigo === c)); });
test('C6: asociación compatible solo cambia copia; marca faltante nunca se inventa', () => {
  const f = fixture(), ss = f.cloros.map(s => ({ ...s, familia_id: '' }));
  assert.equal(dry(mapa(...f.cloros), [f.economico], ss).estado, 'CUMPLE'); assert.ok(ss.every(s => s.familia_id === ''));
  ss[0].marca = ''; assert.ok(dry(mapa(...f.cloros), [f.economico], ss).hallazgos.some(h => h.codigo === 'MARCA_FISICA_REQUERIDA'));
});
test('C6: dry-run duplicados maestros, otra familia, inexistente actual, contenido/política/precio/apertura', () => {
  const f = fixture(), m = mapa(...f.cloros);
  for (const [fs, ss, codigo] of [
    [[f.economico, f.economico], f.cloros, 'FAMILIA_DUPLICADA'],
    [[f.economico], [...f.cloros, f.cloros[0]], 'SKU_DUPLICADO'],
    [[f.economico], f.cloros.map(s => ({ ...s, familia_id: 'FAM-OTRA' })), 'SKU_YA_ASOCIADO_OTRA_FAMILIA'],
    [[f.economico], [...f.cloros, { ...f.legado, familia_id: 'FAM-OTRA' }], 'FAMILIA_INEXISTENTE'],
    [[{ ...f.economico, precio_venta: 0 }], f.cloros, 'PRECIO_FAMILIAR_NO_VENDIBLE'],
    [[f.economico], [{ ...f.cloros[0], contenido_cantidad: 750 }, f.cloros[1]], 'CONTENIDO_NO_EQUIVALENTE'],
    [[{ ...f.economico, politica_marca: 'EXPLICITA', marca_publica: 'Una' }], f.cloros, 'MARCA_NO_EQUIVALENTE'],
  ]) { const r = dry(m, fs, ss); assert.equal(r.estado, 'BLOQUEADO'); assert.ok(r.hallazgos.some(h => h.codigo === codigo), codigo); }
  assert.equal(dry(mapa(f.especial), [f.economico], [f.especial]).estado, 'BLOQUEADO');
  assert.equal(dry(mapa(f.especial), [f.economico], [f.especial], { apertura_id: 'APE-20261010', sku_habilitados: [f.especial.id_producto] }).estado, 'CUMPLE');
});
test('C6: dry-run warnings familia sin SKU/inactiva, SKU inactivo/agotado', () => {
  assert.equal(dry([], [fixture().economico], []).estado, 'ADVERTENCIA');
  assert.equal(dry([], [{ ...fixture().economico, activo: 'NO' }]).estado, 'ADVERTENCIA');
  assert.equal(dry([], [fixture().economico], [fixture().inactivo]).estado, 'ADVERTENCIA');
  assert.equal(dry([], [fixture().economico], fixture().cloros.map(s => ({ ...s, stock_actual: 0 }))).estado, 'ADVERTENCIA');
});
test('C6: dry-run detecta duplicados legados aunque no haya familias/propuestas', () => {
  const s = fixture().legado, r = dry([], [], [s, s]);
  assert.equal(r.estado, 'BLOQUEADO'); assert.ok(r.hallazgos.some(h => h.codigo === 'SKU_DUPLICADO'));
});
test('C6: auditoría no infiere marca/presentación/familia desde nombre explícito', () => {
  const s = { ...fixture().legado, nombre: 'Shampoo Marca Confirmable 750ml' }, antes = JSON.stringify(s);
  const a = auditarFaltantesIdentidad([s], [fixture().shampoo])[0];
  assert.equal(a.estado, 'FALTA_IDENTIDAD_FISICA'); assert.equal(a.falta_familia, true); assert.equal(a.evidencia, ''); assert.equal(a.requiere_decision_multi_sku, true);
  assert.equal(JSON.stringify(s), antes);
});
test('C6: auditoría cinco categorías; exención requiere evidencia humana explícita', () => {
  const f = fixture(), ss = [f.cloros[0], { ...f.cloros[1], familia_id: '' }, f.legado, f.granel[0]];
  assert.deepEqual(auditarFaltantesIdentidad(ss, [f.economico]).map(a => a.estado), ['YA_ACREDITADO', 'FALTA_FAMILIA', 'FALTA_IDENTIDAD_FISICA', 'GRANEL_POSTERGADO']);
  assert.equal(auditarFaltantesIdentidad([f.legado], [], [{ producto_id: f.legado.id_producto, no_requiere_familia_multi_sku: true, evidencia: 'Decisión humana fixture' }])[0].estado, 'NO_REQUIERE_FAMILIA_MULTI_SKU');
  assert.equal(auditarFaltantesIdentidad([f.legado], [], [{ producto_id: f.legado.id_producto, no_requiere_familia_multi_sku: true, evidencia: '' }])[0].estado, 'FALTA_IDENTIDAD_FISICA');
});
test('C6: excluir solo fixtures por IDs documentados, no nombres que parezcan TEST/QA', () => {
  for (const id_producto of ['PROD-QA-C5-A', 'PROD-TEST-DECIMAL', 'PROD-TEST-F78-64C8BE2C22E0']) assert.equal(esSkuFixtureConocido({ id_producto }), true);
  for (const id_producto of ['PROD-054', 'PROD-COMERCIAL', 'PROD-TEST-MARCA']) assert.equal(esSkuFixtureConocido({ id_producto, nombre: 'Producto QA TEST' }), false);
});
test('C6: identidad estructurada permanece interna; presentación legible no sustituye contenido', () => {
  const f = fixture(), v = shadow(f.cloros);
  assert.equal(v.sku_integrantes[0].contenido_cantidad, 1000);
  assert.equal(v.sku_integrantes[0].contenido_unidad, 'ml');
  assert.equal('contenido_cantidad' in v.oferta, false);
  const alterado = { ...f.cloros[0], presentacion: 'Botella 1 L', contenido_cantidad: 750 };
  assert.equal(shadow([alterado]).sku_integrantes[0].elegible, false);
});
for (const [nombre, cambio, codigo] of [
  ['presentación ausente', { presentacion: '' }, 'PRESENTACION_FISICA_REQUERIDA'],
  ['modo distinto', { modo_venta: 'GRANEL' }, 'MODO_NO_EQUIVALENTE'],
]) test(`C6: dry-run bloquea ${nombre} sin corregir el maestro`, () => {
  const f = fixture(), ss = [{ ...f.cloros[0], ...cambio }], antes = JSON.stringify(ss);
  const r = dry(mapa(...ss), [f.economico], ss);
  assert.equal(r.estado, 'BLOQUEADO'); assert.ok(r.hallazgos.some(h => h.codigo === codigo));
  assert.equal(JSON.stringify(ss), antes);
});
for (const precio of [undefined, NaN]) test(`C6: dry-run bloquea precio familiar ${String(precio)}`, () => {
  const f = fixture(), r = dry(mapa(...f.cloros), [{ ...f.economico, precio_venta: precio }], f.cloros);
  assert.equal(r.estado, 'BLOQUEADO'); assert.ok(r.hallazgos.some(h => h.codigo === 'PRECIO_FAMILIAR_INVALIDO'));
  assert.equal(r.catalogo_propuesto[0].disponible, false);
});
test('C6: dry-run granel rechaza base inválida aunque haya otro SKU compatible', () => {
  const f = fixture(), ss = [{ ...f.granel[0], gramos_unidad_stock: 500 }, f.granel[1]];
  const r = dry(mapa(...ss), [f.arroz], ss);
  assert.equal(r.estado, 'BLOQUEADO'); assert.ok(r.hallazgos.some(h => h.codigo === 'BASE_STOCK_GRANEL_INVALIDA'));
  assert.equal(r.catalogo_propuesto[0].stock_agregado_interno, 2000);
});
