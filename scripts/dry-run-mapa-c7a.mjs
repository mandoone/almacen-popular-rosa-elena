/** C7-A local: captura ya leída → proyección → validador C6. Nunca llama Google/GAS. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { ejecutarDryRunComercialC7a } from '../src/lib/familias/mapaComercialC7a.ts';
import { esSkuFixtureConocido } from '../src/lib/familias/auditoriaIdentidad.ts';
import { skuParaShadow } from '../src/lib/familias/catalogoShadow.ts';
const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida || resolve(entrada) === resolve(salida)) throw new Error('Uso: captura.json informe-local.json (rutas distintas)');
const bytes = await readFile(entrada), captura = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
if (captura.meta?.spreadsheetId !== '1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM'
  || captura.meta?.properties?.title !== 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES') throw new Error('DESTINO_CAPTURA_NO_ACREDITADO');
const hs = captura.valores?.PRODUCTOS?.[0];
if (!Array.isArray(hs) || new Set(hs).size !== hs.length) throw new Error('HEADERS_INVALIDOS');
const datos = captura.valores.PRODUCTOS.slice(1).filter(r => r[0]).map(r => Object.fromEntries(hs.map((h, i) => [h, r[i] ?? ''])));
const skus = datos.filter(s => !esSkuFixtureConocido(s)).map(s => skuParaShadow({ ...s,
  contenido_cantidad: s.contenido_cantidad === '' ? undefined : Number(s.contenido_cantidad),
  contenido_unidad: s.contenido_unidad || undefined, modo_venta: s.modo_venta || 'UNIDAD',
  paso_venta: s.paso_venta === '' ? undefined : Number(s.paso_venta), stock_actual: Number(s.stock_actual),
  gramos_referencia: s.gramos_referencia === '' ? undefined : Number(s.gramos_referencia),
  gramos_unidad_stock: s.gramos_unidad_stock === '' ? undefined : Number(s.gramos_unidad_stock),
}));
const propuesta = JSON.parse(await readFile(new URL('../docs/operativa/MAPA_COMERCIAL_C7A_DRY_RUN_2026-10-08.json', import.meta.url), 'utf8'));
const precios = await readFile(new URL('../docs/operativa/FUENTES_CATALOGO_2026-10-01.csv', import.meta.url), 'utf8');
// Filas de PRECIO de la comanda; jamás lee COSTO para generar la oferta.
const fuentes = [[52, 'FAM-LAVALOZA-FUZOL-900ML'], [58, 'FAM-SHAMPOO-BALLERINA-750ML'], [59, 'FAM-BALSAMO-BALLERINA-750ML'],
  [45, 'FAM-CLORO-1L-ECO'], [36, 'FAM-ACEITE-VEGETAL-ECO'], [56, 'FAM-DESINFECTANTE-SUELO-ECO'], [60, 'FAM-LIMPIADOR-CREMA-ECO'], [46, 'FAM-CLORO-CLORINDA-1L']];
const ofertas = [...propuesta.familias, ...propuesta.ofertas_sin_asociacion];
for (const [fila, id] of fuentes) {
  const r = precios.split(/\r?\n/).filter(l => l.startsWith(`"PRECIO";"${fila}";`));
  const precio = r.length === 1 ? Number(r[0].split(';')[3]?.replaceAll('"', '')) : NaN;
  const fs = ofertas.filter(f => f.familia_id === id);
  if (fs.length !== 1 || !Number.isSafeInteger(precio) || precio <= 0 || precio !== fs[0].precio_venta) throw new Error('PRECIO_COMANDA_NO_COINCIDE ' + id);
}
const antes = JSON.stringify(skus), r = ejecutarDryRunComercialC7a(skus, propuesta);
const hash = b => createHash('sha256').update(b).digest('hex');
if (JSON.stringify(skus) !== antes || hash(await readFile(entrada)) !== hash(bytes)) throw new Error('ENTRADA_MODIFICADA');
const informe = { modelo: 'C7A_DRY_RUN_LOCAL', captura_sha256: hash(bytes), estado: r.estado,
  precios_comanda_verificados: fuentes.length, sku_comerciales: skus.length, fixtures_excluidos: datos.length - skus.length,
  hallazgos: r.hallazgos, proyeccion_shadow: r.catalogo_propuesto,
  ofertas_futuras: r.catalogo_propuesto.map(f => ({ ...f.oferta, disponibilidad: f.disponible ? 'Disponible' : 'Agotado' })),
  escrituras_remotas: 0, entrada_preservada: true, autorizacion_migracion: false };
await writeFile(salida, JSON.stringify(informe, null, 2) + '\n');
console.log(JSON.stringify({ estado: r.estado, precios_comanda_verificados: fuentes.length, sku_comerciales: skus.length,
  familias_mapeadas: propuesta.familias.length, hallazgos: r.hallazgos, ofertas: informe.ofertas_futuras,
  escrituras_remotas: 0, entrada_preservada: true }));
if (r.estado !== 'CUMPLE') process.exitCode = 1;
