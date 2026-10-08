/** C6: mapa propuesto en memoria. No modifica el maestro ni infiere marca. */
import { construirCatalogoFamiliasShadow } from './catalogoShadow.ts';
import { validarRelacionSkuFamilia, validarFamiliaProducto, type FamiliaProducto, type SkuFamilia, type ContextoDisponibilidadFamilia } from '../familiasProducto.ts';

export interface AsociacionPropuesta { familia_id: string; producto_id: string }
export interface HallazgoMapa {
  estado: 'ADVERTENCIA' | 'BLOQUEADO'; codigo: string; familia_id?: string; producto_id?: string;
}
export interface ResultadoMapa {
  estado: 'CUMPLE' | 'ADVERTENCIA' | 'BLOQUEADO'; hallazgos: HallazgoMapa[];
  catalogo_propuesto: ReturnType<typeof construirCatalogoFamiliasShadow>;
}
/** CSV mínimo sin campos libres: dos IDs. JSON admite solo esas mismas claves. */
export function leerMapaPropuesto(texto: string, formato: 'JSON' | 'CSV'): AsociacionPropuesta[] {
  if (texto.length > 200_000) throw new Error('MAPA_DEMASIADO_GRANDE');
  let filas: unknown;
  if (formato === 'JSON') filas = JSON.parse(texto);
  else {
    const lineas = texto.trim().replace(/^\uFEFF/, '').split(/\r?\n/);
    if (lineas.shift()?.trim() !== 'familia_id,producto_id') throw new Error('HEADERS_MAPA_INVALIDOS');
    filas = lineas.filter(l => l.trim()).map(l => {
      const partes = l.split(',').map(s => s.trim());
      if (partes.length !== 2) throw new Error('FILA_MAPA_INVALIDA');
      return { familia_id: partes[0], producto_id: partes[1] };
    });
  }
  if (!Array.isArray(filas) || filas.length > 2000) throw new Error('MAPA_INVALIDO');
  return filas.map(f => {
    if (!f || typeof f !== 'object' || Array.isArray(f) || Object.keys(f).length !== 2
      || Object.keys(f).some(c => !['familia_id', 'producto_id'].includes(c))
      || typeof f.familia_id !== 'string' || typeof f.producto_id !== 'string'
      || !/^FAM-[A-Za-z0-9][A-Za-z0-9-]{0,79}$/.test(f.familia_id.trim())
      || !/^PROD-[A-Za-z0-9-]{1,80}$/.test(f.producto_id.trim())) throw new Error('FILA_MAPA_INVALIDA');
    return { familia_id: f.familia_id.trim(), producto_id: f.producto_id.trim() };
  });
}

export function validarMapaPropuesto(
  mapa: readonly AsociacionPropuesta[], familias: readonly FamiliaProducto[], skus: readonly SkuFamilia[],
  contexto: ContextoDisponibilidadFamilia = {},
): ResultadoMapa {
  // Incluso consumidores directos deben respetar el mismo contrato estricto del parser.
  const filas = leerMapaPropuesto(JSON.stringify(mapa), 'JSON');
  const hallazgos: HallazgoMapa[] = [];
  const add = (estado: HallazgoMapa['estado'], codigo: string, familia_id?: string, producto_id?: string) => hallazgos.push({ estado, codigo, ...(familia_id ? { familia_id } : {}), ...(producto_id ? { producto_id } : {}) });
  const vistos = new Map<string, string>();
  const skuPropuestos = skus.map(s => ({ ...s }));
  const idsMaestro = new Set<string>();
  for (const s of skus) {
    if (idsMaestro.has(s.id_producto)) add('BLOQUEADO', 'SKU_DUPLICADO', s.familia_id, s.id_producto);
    idsMaestro.add(s.id_producto);
  }
  for (const a of filas) {
    if (vistos.has(a.producto_id)) add('BLOQUEADO', vistos.get(a.producto_id) === a.familia_id ? 'ASOCIACION_DUPLICADA' : 'SKU_EN_DOS_FAMILIAS', a.familia_id, a.producto_id);
    vistos.set(a.producto_id, a.familia_id);
    const fs = familias.filter(f => f.familia_id === a.familia_id), ss = skus.filter(s => s.id_producto === a.producto_id);
    if (fs.length !== 1) add('BLOQUEADO', fs.length ? 'FAMILIA_DUPLICADA' : 'FAMILIA_INEXISTENTE', a.familia_id, a.producto_id);
    if (ss.length !== 1) add('BLOQUEADO', ss.length ? 'SKU_DUPLICADO' : 'SKU_INEXISTENTE', a.familia_id, a.producto_id);
    if (fs.length !== 1 || ss.length !== 1) continue;
    if (ss[0].familia_id && ss[0].familia_id !== a.familia_id) add('BLOQUEADO', 'SKU_YA_ASOCIADO_OTRA_FAMILIA', a.familia_id, a.producto_id);
    const sku = { ...ss[0], familia_id: a.familia_id };
    for (const e of validarRelacionSkuFamilia(sku, fs[0]).inconsistencias) add('BLOQUEADO', e.codigo, a.familia_id, a.producto_id);
    if (sku.tipo_disponibilidad === 'POR_APERTURA' && (!contexto.apertura_id || !contexto.sku_habilitados?.includes(sku.id_producto))) add('BLOQUEADO', 'SKU_NO_HABILITADO_APERTURA', a.familia_id, a.producto_id);
    const indice = skuPropuestos.findIndex(s => s.id_producto === a.producto_id);
    skuPropuestos[indice] = sku;
  }
  for (const f of familias) {
    for (const e of validarFamiliaProducto(f).inconsistencias) add('BLOQUEADO', e.codigo, f.familia_id);
    if (f.precio_venta <= 0) add('BLOQUEADO', 'PRECIO_FAMILIAR_NO_VENDIBLE', f.familia_id);
  }
  for (const s of skuPropuestos) {
    for (const e of validarRelacionSkuFamilia(s, familias.find(f => f.familia_id === s.familia_id)).inconsistencias) add('BLOQUEADO', e.codigo, e.familia_id, s.id_producto);
  }
  const catalogo = construirCatalogoFamiliasShadow(familias, skuPropuestos, contexto);
  for (const f of catalogo) {
    for (const e of f.inconsistencias) add(['SKU_ASOCIADO_INACTIVO', 'FAMILIA_SIN_SKU'].includes(e.codigo) ? 'ADVERTENCIA' : 'BLOQUEADO', e.codigo, e.familia_id, e.producto_id);
    if (f.oferta.activo !== 'SI') add('ADVERTENCIA', 'FAMILIA_INACTIVA', f.oferta.familia_id);
    if (!f.disponible) add('ADVERTENCIA', 'SIN_DISPONIBILIDAD_ELEGIBLE', f.oferta.familia_id);
  }
  const unicos = hallazgos.filter((h, n, todos) => todos.findIndex(i => JSON.stringify(i) === JSON.stringify(h)) === n);
  return { estado: unicos.some(h => h.estado === 'BLOQUEADO') ? 'BLOQUEADO' : unicos.length ? 'ADVERTENCIA' : 'CUMPLE',
    hallazgos: unicos, catalogo_propuesto: catalogo };
}
