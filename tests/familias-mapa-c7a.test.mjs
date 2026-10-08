import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ejecutarDryRunComercialC7a, proyectarIdentidadesC7a } from '../src/lib/familias/mapaComercialC7a.ts';
import { validarFamiliaProducto } from '../src/lib/familiasProducto.ts';
import { validarMapaPropuesto } from '../src/lib/familias/mapaDryRun.ts';
const propuesta = JSON.parse(await readFile(new URL('../docs/operativa/MAPA_COMERCIAL_C7A_DRY_RUN_2026-10-08.json', import.meta.url), 'utf8'));
const plan = () => structuredClone(propuesta);
const maestro = () => propuesta.identidades_aprobadas.map((a, n) => ({
  id_producto: a.producto_id, nombre: ['Lavaloza Fuzol', 'Shampoo Ballerina', 'Bálsamo Ballerina'][n],
  categoria: propuesta.familias[n].categoria, activo: 'SI', unidad_medida: 'unidad',
  permite_decimal: 'NO', paso_venta: 1, tipo_disponibilidad: 'REGULAR',
  stock_actual: n + 4, precio_costo: n + 10, precio_venta: n + 999,
  familia_id: '', marca: '', presentacion: '',
}));

for (const [n, id, marca, ml, precio] of [
  [0, 'FAM-LAVALOZA-FUZOL-900ML', 'Fuzol', 900, 1000],
  [1, 'FAM-SHAMPOO-BALLERINA-750ML', 'Ballerina', 750, 1400],
  [2, 'FAM-BALSAMO-BALLERINA-750ML', 'Ballerina', 750, 1400],
]) test(`C7-A identidad aprobada ${id}: formato/marca/precio/CUMPLE`, () => {
  const p = plan(), ss = maestro(), r = ejecutarDryRunComercialC7a(ss, p), f = r.catalogo_propuesto[n];
  assert.equal(validarFamiliaProducto(p.familias[n]).valido, true);
  assert.equal(r.estado, 'CUMPLE'); assert.deepEqual(r.hallazgos, []);
  assert.equal(f.oferta.familia_id, id); assert.equal(f.oferta.precio_venta, precio);
  assert.equal(f.oferta.politica_marca, 'EXPLICITA'); assert.equal(f.oferta.marca_publica, marca);
  assert.equal(f.oferta.presentacion_publica, `${ml} ml`);
  assert.deepEqual(f.sku_elegibles, [p.identidades_aprobadas[n].producto_id]);
  assert.equal(f.sku_integrantes[0].contenido_cantidad, ml); assert.equal(f.sku_integrantes[0].contenido_unidad, 'ml');
  assert.equal(f.disponible, true); assert.equal('stock_actual' in f.oferta, false);
});
test('C7-A conserva maestro/plan, stock/costo/precio/IDs/categoría y legado; asociación solo en copia C6', () => {
  const ss = [...maestro(), { ...maestro()[0], id_producto: 'PROD-LEGADO', nombre: 'Legado', stock_actual: 3 }];
  const p = plan(), antes = JSON.stringify(ss), antesPlan = JSON.stringify(p), r = ejecutarDryRunComercialC7a(ss, p);
  assert.equal(JSON.stringify(ss), antes); assert.equal(JSON.stringify(p), antesPlan);
  for (let n = 0; n < ss.length; n++) for (const campo of ['id_producto', 'nombre', 'categoria', 'activo', 'stock_actual', 'precio_costo', 'precio_venta', 'unidad_medida', 'modo_venta', 'familia_id']) assert.equal(r.skus_proyectados[n][campo], ss[n][campo]);
  assert.deepEqual(r.skus_proyectados[3], ss[3]);
});
test('C7-A precio familiar no depende del costo ni precio SKU', () => {
  const r = ejecutarDryRunComercialC7a(maestro().map(s => ({ ...s, precio_costo: 999999, precio_venta: 1 })), plan());
  assert.deepEqual(r.catalogo_propuesto.map(f => f.oferta.precio_venta), [1000, 1400, 1400]);
});
test('C7-A ocho precios coinciden con filas PRECIO de comanda versionada', async () => {
  const csv = await readFile(new URL('../docs/operativa/FUENTES_CATALOGO_2026-10-01.csv', import.meta.url), 'utf8');
  const filas = [52, 58, 59, 45, 36, 56, 60, 46];
  const ofertas = [...propuesta.familias, ...propuesta.ofertas_sin_asociacion];
  assert.equal(new Set(ofertas.map(f => f.familia_id)).size, 8);
  for (let n = 0; n < filas.length; n++) {
    const rows = csv.split(/\r?\n/).filter(l => l.startsWith(`"PRECIO";"${filas[n]}";`));
    assert.equal(rows.length, 1); assert.equal(Number(rows[0].split(';')[3].replaceAll('"', '')), ofertas[n].precio_venta);
    assert.match(ofertas[n].familia_id, /^FAM-[A-Za-z0-9][A-Za-z0-9-]{0,79}$/);
  }
});
test('C7-A marca explícita equivocada bloquea; no se flexibiliza equivalencia', () => {
  const p = plan(); p.identidades_aprobadas[0].marca = 'Otra';
  const r = ejecutarDryRunComercialC7a(maestro(), p);
  assert.equal(r.estado, 'BLOQUEADO'); assert.ok(r.hallazgos.some(h => h.codigo === 'MARCA_NO_EQUIVALENTE'));
});
test('C7-A 900 vs750 no son equivalentes aunque nombre diga Fuzol900', () => {
  const p = plan(); p.identidades_aprobadas[0].contenido_cantidad = 750;
  const r = ejecutarDryRunComercialC7a(maestro(), p);
  assert.equal(r.estado, 'BLOQUEADO'); assert.ok(r.hallazgos.some(h => h.codigo === 'CONTENIDO_NO_EQUIVALENTE'));
});
test('C7-A variable sin marca física sigue bloqueado y no entra al mapa de tres', () => {
  const f = { ...plan().familias[0], familia_id: 'FAM-CLORO-1L-ECO', nombre_publico: 'Cloro 1 L Económico', politica_marca: 'VARIABLE', marca_publica: undefined, contenido_cantidad: 1000 };
  const sku = { ...maestro()[0], id_producto: 'PROD-033', contenido_cantidad: 1000, contenido_unidad: 'ml', presentacion: '1 L' };
  const r = validarMapaPropuesto([{ familia_id: f.familia_id, producto_id: sku.id_producto }], [f], [sku]);
  assert.equal(r.estado, 'BLOQUEADO'); assert.ok(r.hallazgos.some(h => h.codigo === 'MARCA_FISICA_REQUERIDA'));
  assert.equal(plan().mapa.some(m => m.producto_id === 'PROD-033'), false);
});
test('C7-A Clorinda no puede compartir PROD-033 con Económico; sin SKU no se crea asociación', () => {
  const f = { ...plan().familias[0], familia_id: 'FAM-CLORO-1L-ECO', politica_marca: 'VARIABLE', marca_publica: undefined, contenido_cantidad: 1000 };
  const c = { ...f, familia_id: 'FAM-CLORO-CLORINDA-1L', politica_marca: 'EXPLICITA', marca_publica: 'Clorinda' };
  const s = { ...maestro()[0], id_producto: 'PROD-033', familia_id: f.familia_id, marca: 'Otra', contenido_cantidad: 1000, contenido_unidad: 'ml', presentacion: '1 L' };
  const r = validarMapaPropuesto([f, c].map(f => ({ familia_id: f.familia_id, producto_id: 'PROD-033' })), [f, c], [s]);
  assert.equal(r.estado, 'BLOQUEADO'); assert.ok(r.hallazgos.some(h => h.codigo === 'SKU_EN_DOS_FAMILIAS'));
  assert.ok(r.hallazgos.some(h => h.codigo === 'MARCA_NO_EQUIVALENTE'));
  assert.equal(plan().ofertas_sin_asociacion.at(-1).estado, 'OFERTA_APROBADA_SIN_SKU_ACREDITADO');
});
for (const campo of ['stock_actual', 'precio_costo', 'precio_venta', 'familia_id']) test(`C7-A rechaza inyección ${campo} en identidad antes de proyectar`, () => {
  const p = plan(), ss = maestro(), antes = JSON.stringify(ss); p.identidades_aprobadas[0][campo] = 0;
  assert.throws(() => ejecutarDryRunComercialC7a(ss, p), /APROBACION_IDENTIDAD_INVALIDA/); assert.equal(JSON.stringify(ss), antes);
});
test('C7-A SKU inexistente/duplicado e identidad duplicada no se reconstruyen', () => {
  const p = plan(); assert.throws(() => ejecutarDryRunComercialC7a(maestro().slice(1), p), /SKU_INEXISTENTE/);
  assert.throws(() => ejecutarDryRunComercialC7a([...maestro(), maestro()[0]], p), /SKU_DUPLICADO/);
  assert.throws(() => proyectarIdentidadesC7a(maestro(), [...p.identidades_aprobadas, p.identidades_aprobadas[0]]), /APROBACION_IDENTIDAD_DUPLICADA/);
});
test('C7-A estado/evidencia requerida; maestro con identidad distinta bloquea proyección', () => {
  for (const cambios of [{ estado: 'PENDIENTE' }, { evidencia: '' }, { contenido_cantidad: NaN }]) {
    const p = plan(); Object.assign(p.identidades_aprobadas[0], cambios);
    assert.throws(() => ejecutarDryRunComercialC7a(maestro(), p), /APROBACION_IDENTIDAD_INVALIDA/);
  }
  const ss = maestro(); ss[0].marca = 'Distinta'; assert.throws(() => ejecutarDryRunComercialC7a(ss, plan()), /IDENTIDAD_MAESTRO_CAMBIO/);
});
test('C7-A mapa sin aprobación/doble asociación/precio inválido no se acepta', () => {
  const p = plan(); p.mapa.push({ familia_id: p.familias[0].familia_id, producto_id: 'PROD-033' });
  assert.throws(() => ejecutarDryRunComercialC7a(maestro(), p), /MAPA_SIN_IDENTIDAD_APROBADA/);
  const doble = plan(); doble.mapa.push({ ...doble.mapa[0], familia_id: doble.familias[1].familia_id });
  assert.equal(ejecutarDryRunComercialC7a(maestro(), doble).estado, 'BLOQUEADO');
  const precio = plan(); precio.familias[0].precio_venta = 0;
  assert.equal(ejecutarDryRunComercialC7a(maestro(), precio).estado, 'BLOQUEADO');
});
test('C7-A stock0 produce advertencia sin falsear stock para obtener CUMPLE', () => {
  const ss = maestro(); ss[0].stock_actual = 0;
  const r = ejecutarDryRunComercialC7a(ss, plan());
  assert.equal(r.estado, 'ADVERTENCIA'); assert.equal(r.catalogo_propuesto[0].disponible, false); assert.equal(ss[0].stock_actual, 0);
});
test('C7-A proyección/runner sin puertos HTTP, Google ni persistencia comercial', async () => {
  for (const archivo of ['../src/lib/familias/mapaComercialC7a.ts', '../scripts/dry-run-mapa-c7a.mjs']) {
    const source = await readFile(new URL(archivo, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\bfetch\s*\(|https?:\/\/|SpreadsheetApp|UrlFetchApp|appsScriptPedidos|setValues\s*\(|appendRow\s*\(/);
  }
});
