/** Auditoría local de una captura TEST de solo lectura. Sin Google APIs ni escrituras Sheet. */
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {auditarFaltantesIdentidad,esSkuFixtureConocido} from '../src/lib/familias/auditoriaIdentidad.ts';
const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida) throw new Error('Uso: node scripts/auditar-identidad-c6.mjs captura.json informe.json');
const bytes = await readFile(entrada), captura = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
if (captura.meta?.spreadsheetId !== '1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM'
  || captura.meta?.properties?.title !== 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES') throw new Error('DESTINO_TEST_NO_ACREDITADO');
function registros(nombre) {
  const rows = captura.valores?.[nombre];
  if (!Array.isArray(rows) || !rows.length || new Set(rows[0]).size !== rows[0].length) throw new Error('CAPTURA_ESQUEMA_INVALIDO');
  return rows.slice(1).filter(r => r[0]).map(r => Object.fromEntries(rows[0].map((h, i) => [h, r[i] ?? ''])));
}
const todosProductos = registros('PRODUCTOS');
const productos = todosProductos.filter(s => !esSkuFixtureConocido(s));
if (new Set(productos.map(s => s.id_producto)).size !== productos.length) throw new Error('SKU_DUPLICADO');
const familias = registros('FAMILIAS_PRODUCTO').filter(f => !f.familia_id.startsWith('FAM-QA-'));
if (familias.length) throw new Error('MAPA_COMERCIAL_INESPERADO_C6');
const skus = productos.map(s => ({...s,
  contenido_cantidad: s.contenido_cantidad === '' ? undefined : Number(s.contenido_cantidad),
  contenido_unidad: s.contenido_unidad || undefined,
  modo_venta: s.modo_venta || 'UNIDAD', stock_actual: Number(s.stock_actual),
}));
// Sin exenciones inventadas: ninguna clasificación NO_REQUIERE se deduce del nombre.
const resultados = auditarFaltantesIdentidad(skus, []);
const estados = ['YA_ACREDITADO', 'FALTA_IDENTIDAD_FISICA', 'FALTA_FAMILIA', 'NO_REQUIERE_FAMILIA_MULTI_SKU', 'GRANEL_POSTERGADO'];
const informe = {modelo: 'AUDITORIA_C6_LECTURA', captura_sha256: createHash('sha256').update(bytes).digest('hex'),
  productos_totales: todosProductos.length, fixtures_excluidos: todosProductos.length - productos.length,
  envasados_comerciales: skus.filter(s => s.modo_venta === 'UNIDAD').length,
  graneles_comerciales: skus.filter(s => s.modo_venta === 'GRANEL').length,
  productos_comerciales: productos.length, familias_comerciales: familias.length,
  resumen: Object.fromEntries(estados.map(e => [e, resultados.filter(r => r.estado === e).length])),
  faltantes: resultados, sin_inferencia_de_marcas: true, escrituras_remotas: 0};
await writeFile(salida, JSON.stringify(informe, null, 2) + '\n');
console.log(JSON.stringify({productos_comerciales: productos.length, familias_comerciales: 0,
  fixtures_excluidos: informe.fixtures_excluidos, envasados: informe.envasados_comerciales, graneles: informe.graneles_comerciales,
  resumen: informe.resumen, captura_sha256: informe.captura_sha256, escrituras_remotas: 0}));
