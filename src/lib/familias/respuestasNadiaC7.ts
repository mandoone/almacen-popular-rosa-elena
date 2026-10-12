/** Ingesta LOCAL de respuestas. No altera precio/stock/costo ni crea IDs/SKU. */
import { validarIdentidadSkuFisica, type FamiliaProducto, type SkuFamilia } from '../familiasProducto.ts';
import type { IdentidadAprobadaC7a } from './mapaComercialC7a.ts';
import { extraerAprobadosC7, type ManifestC7 } from './preparacionC7b.ts';
import { ejecutarDryRunComercialC7a } from './mapaComercialC7a.ts';
interface RespuestaProducto {
  producto_id: string; estado: 'PENDIENTE' | 'RECIBIDA'; marca_fisica: string | null;
  contenido_cantidad: number | null; contenido_unidad: string | null; presentacion: string | null;
  respuesta_fuente: string; fecha_acreditacion: string | null;
}
interface RespuestaGrupo {
  grupo: 'CLORO_GEL' | 'BOLSAS_70X90'; estado: 'PENDIENTE' | 'RECIBIDA'; conviven_actualmente: boolean | null;
  politica_publica: 'VARIABLE' | 'EXPLICITA' | null; observacion: string; respuesta_fuente: string; fecha_acreditacion: string | null;
}
export interface RespuestasNadiaC7 { modelo: 'RESPUESTAS_NADIA_C7_LOCAL'; productos: RespuestaProducto[]; variantes: RespuestaGrupo[] }
const pk = ['producto_id','estado','marca_fisica','contenido_cantidad','contenido_unidad','presentacion','respuesta_fuente','fecha_acreditacion'];
const gk = ['grupo','estado','conviven_actualmente','politica_publica','observacion','respuesta_fuente','fecha_acreditacion'];
function exacto(v: object, claves: string[]) { if (!v || Object.keys(v).length !== claves.length || Object.keys(v).some(k => !claves.includes(k))) throw new Error('CAMPOS_RESPUESTA_NO_PERMITIDOS'); }
function fecha(v: unknown) { return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v; }
function texto(v: unknown, max: number) { return typeof v === 'string' && !!v.trim() && v.trim().length <= max && !/^=|[\u0000-\u001f]/.test(v.trim()); }
export function validarRespuestasNadiaC7(respuestas: RespuestasNadiaC7, skus: readonly SkuFamilia[], manifest: ManifestC7) {
  exacto(respuestas, ['modelo','productos','variantes']);
  if (respuestas.modelo !== 'RESPUESTAS_NADIA_C7_LOCAL' || !Array.isArray(respuestas.productos) || !Array.isArray(respuestas.variantes)) throw new Error('TEMPLATE_INVALIDO');
  const aprobadas: IdentidadAprobadaC7a[] = [], human_gates: string[] = [], vistos = new Set<string>();
  for (const p of respuestas.productos) {
    exacto(p, pk);
    if (vistos.has(p.producto_id)) throw new Error('RESPUESTA_SKU_DUPLICADA'); vistos.add(p.producto_id);
    const filas = skus.filter(s => s.id_producto === p.producto_id), es = manifest.entradas.filter(e => e.producto_id === p.producto_id);
    if (filas.length !== 1 || es.length !== 1) throw new Error('SKU_DESCONOCIDO_O_DUPLICADO');
    if (es[0].estado === 'POSTERGADO_GRANEL') throw new Error('GRANEL_POSTERGADO');
    if (p.estado === 'PENDIENTE') {
      if ([p.marca_fisica,p.contenido_cantidad,p.contenido_unidad,p.presentacion,p.fecha_acreditacion].some(v => v !== null) || p.respuesta_fuente !== '') throw new Error('RESPUESTA_PARCIAL_NO_ACREDITADA');
      human_gates.push(`PENDIENTE_NADIA:${p.producto_id}`); continue;
    }
    if (p.estado !== 'RECIBIDA' || !texto(p.marca_fisica,120) || !texto(p.presentacion,200) || !texto(p.respuesta_fuente,1000) || !fecha(p.fecha_acreditacion)
      || typeof p.contenido_cantidad !== 'number' || !Number.isFinite(p.contenido_cantidad) || p.contenido_cantidad <= 0) throw new Error('RESPUESTA_OBLIGATORIOS_INVALIDOS');
    const unidad = p.contenido_unidad?.trim().toLowerCase();
    const unidades: Record<string, ['g'|'ml'|'unidad',number]> = { ml:['ml',1], mililitros:['ml',1], l:['ml',1000], litro:['ml',1000], litros:['ml',1000], g:['g',1], gramos:['g',1], kg:['g',1000], unidad:['unidad',1], unidades:['unidad',1] };
    if (!unidad || !Object.hasOwn(unidades,unidad)) throw new Error('UNIDAD_RESPUESTA_INVALIDA');
    const [u,factor] = unidades[unidad], cantidad = p.contenido_cantidad * factor;
    const a: IdentidadAprobadaC7a = { producto_id:p.producto_id, estado:'IDENTIDAD_APROBADA_PARA_DRY_RUN', evidencia:`${p.fecha_acreditacion}: ${p.respuesta_fuente.trim()}`,
      marca:p.marca_fisica!.trim(), presentacion:p.presentacion!.trim(), contenido_cantidad:cantidad, contenido_unidad:u };
    if (!validarIdentidadSkuFisica({ ...filas[0], ...a }).valido) throw new Error('IDENTIDAD_RESPUESTA_INVALIDA');
    const anterior = es[0].identidad_aprobada;
    for (const k of ['marca','presentacion','contenido_cantidad','contenido_unidad'] as const) {
      const vigente = anterior?.[k] ?? filas[0][k];
      if (vigente !== undefined && vigente !== '' && vigente !== a[k]) throw new Error('CONFLICTO_IDENTIDAD_ACREDITADA');
    }
    if (p.producto_id === 'PROD-033' && (cantidad !== 1000 || u !== 'ml')) throw new Error('CLORO_PRESENTACION_NO_EQUIVALENTE');
    aprobadas.push(a);
  }
  const grupos = new Set<string>();
  for (const g of respuestas.variantes) {
    exacto(g,gk);
    if (!['CLORO_GEL','BOLSAS_70X90'].includes(g.grupo) || grupos.has(g.grupo)) throw new Error('GRUPO_DESCONOCIDO_O_DUPLICADO'); grupos.add(g.grupo);
    if (g.estado === 'PENDIENTE') {
      if (g.conviven_actualmente !== null || g.politica_publica !== null || g.observacion || g.respuesta_fuente || g.fecha_acreditacion !== null) throw new Error('VARIANTE_PARCIAL_NO_ACREDITADA');
      human_gates.push(`PENDIENTE_NADIA:${g.grupo}`); continue;
    }
    if (g.estado !== 'RECIBIDA' || typeof g.conviven_actualmente !== 'boolean' || !['VARIABLE','EXPLICITA'].includes(g.politica_publica ?? '')
      || !texto(g.observacion,1000) || !texto(g.respuesta_fuente,1000) || !fecha(g.fecha_acreditacion)) throw new Error('VARIANTE_INVALIDA');
    human_gates.push(`PENDIENTE_OMAR_PRECIO_MAPA_VARIANTE:${g.grupo}`);
  }
  return { aprobadas, human_gates, variantes: structuredClone(respuestas.variantes) };
}
export function proyectarRespuestasNadiaC7(respuestas: RespuestasNadiaC7, skus: readonly SkuFamilia[], manifest: ManifestC7) {
  const v = validarRespuestasNadiaC7(respuestas,skus,manifest), copia = structuredClone(manifest);
  for (const a of v.aprobadas) {
    const e = copia.entradas.find(e => e.producto_id === a.producto_id)!;
    if (e.estado === 'APROBADO') continue;
    // Solo las cuatro ofertas VARIABLE ya decididas tienen precio/nombre acreditados para automatizar.
    if (!['PROD-033','PROD-023','PROD-044','PROD-048'].includes(a.producto_id)) { v.human_gates.push(`PENDIENTE_OMAR_MAPA:${a.producto_id}`); continue; }
    const s = skus.find(s => s.id_producto === a.producto_id)!, oferta=e.oferta_propuesta;
    if (!oferta.precio_comanda || oferta.politica_propuesta !== 'VARIABLE') throw new Error('OFERTA_VARIABLE_NO_ACREDITADA');
    const familia: FamiliaProducto = { familia_id:oferta.familia_id, activo:'SI', nombre_publico:oferta.nombre_publico, categoria:s.categoria, precio_venta:oferta.precio_comanda,
      modo_venta:'UNIDAD', unidad_venta:'unidad', permite_decimal:'NO', paso_venta:1, contenido_cantidad:a.contenido_cantidad, contenido_unidad:a.contenido_unidad,
      presentacion_publica:a.presentacion, politica_marca:'VARIABLE', marca_publica:'', version_oferta:1 };
    e.estado='APROBADO'; e.evidencia=a.evidencia; e.contrato_aprobado=familia; e.identidad_aprobada=a; e.bloqueos_humanos=[];
  }
  const es=extraerAprobadosC7(copia);
  const dry_run=ejecutarDryRunComercialC7a(skus,{modelo:'PROPUESTA_C7A_LOCAL',familias:es.map(e=>e.contrato_aprobado!),identidades_aprobadas:es.map(e=>e.identidad_aprobada!),mapa:es.map(e=>({familia_id:e.contrato_aprobado!.familia_id,producto_id:e.producto_id}))});
  return { manifest_proyectado:copia, identidades:v.aprobadas, mapa:es.map(e=>({familia_id:e.contrato_aprobado!.familia_id,producto_id:e.producto_id})), dry_run, human_gates:v.human_gates };
}
