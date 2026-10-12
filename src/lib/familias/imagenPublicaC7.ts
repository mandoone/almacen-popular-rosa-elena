/** Autoridad de imagen = familia + evaluación explícita. Nunca recibe ni consulta imágenes SKU. */
import type { FamiliaProducto } from '../familiasProducto.ts';
export type ClasificacionFotoC7 = 'APTA_EXPLICITA' | 'APTA_GENERICA' | 'NO_APTA_VARIABLE_MARCA_VISIBLE' | 'AMBIGUA_REVISAR' | 'FALTA_FOTO';
export interface EvaluacionImagenC7 {
  familia_id: string; imagen_url: string; clasificacion: ClasificacionFotoC7; evidencia: string;
  marca_visible?: string; presentacion_publica?: string; derechos_validados?: boolean;
}
export interface ImagenPublicaC7 {
  origen: 'IMAGEN_FAMILIA' | 'PLACEHOLDER_GENERICO' | 'SIN_IMAGEN' | 'BLOQUEADA_POR_MARCA';
  url?: string; categoria: string; nombre_publico: string; economico: boolean; avisos: string[];
}
const normal = (s: string) => s.trim().toLocaleLowerCase('es');
function urlSegura(url: string) {
  if (url.startsWith('/') && !url.startsWith('//') && !/[\\\u0000-\u001f]/.test(url)) return true;
  try { const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password; } catch { return false; }
}
export function resolverImagenPublicaFamiliaC7(f: Pick<FamiliaProducto,'familia_id'|'politica_marca'|'nombre_publico'|'categoria'|'imagen_url'|'marca_publica'|'presentacion_publica'>, evaluacion?: EvaluacionImagenC7): ImagenPublicaC7 {
  const base={categoria:f.categoria,nombre_publico:f.nombre_publico,economico:/econ[oó]mico/i.test(f.nombre_publico),avisos:[] as string[]};
  const url=f.imagen_url?.trim();
  if(!url)return {...base,origen:f.politica_marca==='VARIABLE'?'PLACEHOLDER_GENERICO':'SIN_IMAGEN'};
  if(!urlSegura(url))return {...base,origen:'SIN_IMAGEN',avisos:['URL de imagen inválida; se usa una representación neutral.']};
  const e=evaluacion,acreditada=e?.familia_id===f.familia_id&&e.imagen_url===url&&!!e.evidencia.trim();
  const generica=acreditada&&e.clasificacion==='APTA_GENERICA'&&!e.marca_visible?.trim();
  const explicita=acreditada&&e.clasificacion==='APTA_EXPLICITA'&&!!f.marca_publica&&normal(e.marca_visible??'')===normal(f.marca_publica)
    &&e.presentacion_publica===f.presentacion_publica;
  const compatible=f.politica_marca==='VARIABLE'?generica:f.politica_marca==='EXPLICITA'?explicita:f.politica_marca==='NO_APLICA'?generica:false;
  if(!compatible)return {...base,origen:'BLOQUEADA_POR_MARCA',avisos:[f.politica_marca==='VARIABLE'
    ?'La imagen no está acreditada como genérica o muestra una marca. La oferta Económico conserva su placeholder sin marca.'
    :'La imagen no acredita marca/presentación de esta oferta. No se toma una foto del SKU como reemplazo.']};
  return {...base,origen:'IMAGEN_FAMILIA',url,avisos:e?.derechos_validados?[]:['HUMAN_GATE: derechos de imagen pendientes. Esta vista administrativa no autoriza publicar.']};
}
