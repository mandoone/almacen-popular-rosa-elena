/** C7-A: proyecta identidad aprobada en copias locales. No tiene puerto de persistencia. */
import { validarIdentidadSkuFisica, type FamiliaProducto, type SkuFamilia } from '../familiasProducto.ts';
import { validarMapaPropuesto, type AsociacionPropuesta } from './mapaDryRun.ts';

export interface IdentidadAprobadaC7a {
  producto_id: string;
  estado: 'IDENTIDAD_APROBADA_PARA_DRY_RUN';
  evidencia: string;
  marca: string;
  presentacion: string;
  contenido_cantidad: number;
  contenido_unidad: 'g' | 'ml' | 'unidad';
}
export interface MapaComercialC7a {
  modelo: 'PROPUESTA_C7A_LOCAL';
  familias: readonly FamiliaProducto[];
  identidades_aprobadas: readonly IdentidadAprobadaC7a[];
  mapa: readonly AsociacionPropuesta[];
}
const campos = ['marca', 'presentacion', 'contenido_cantidad', 'contenido_unidad'] as const;
const claves = ['producto_id', 'estado', 'evidencia', ...campos];

export function proyectarIdentidadesC7a(skus: readonly SkuFamilia[], aprobaciones: readonly IdentidadAprobadaC7a[]): SkuFamilia[] {
  const copia = skus.map(s => ({ ...s }));
  const vistos = new Set<string>();
  for (const a of aprobaciones) {
    if (!a || Object.keys(a).length !== claves.length || Object.keys(a).some(k => !claves.includes(k))
      || a.estado !== 'IDENTIDAD_APROBADA_PARA_DRY_RUN' || typeof a.evidencia !== 'string' || !a.evidencia.trim()
      || typeof a.marca !== 'string' || !a.marca.trim() || typeof a.presentacion !== 'string' || !a.presentacion.trim()
      || typeof a.contenido_cantidad !== 'number' || !Number.isFinite(a.contenido_cantidad) || a.contenido_cantidad <= 0
      || !['g', 'ml', 'unidad'].includes(a.contenido_unidad)) throw new Error('APROBACION_IDENTIDAD_INVALIDA');
    if (vistos.has(a.producto_id)) throw new Error('APROBACION_IDENTIDAD_DUPLICADA');
    vistos.add(a.producto_id);
    const indices = copia.flatMap((s, i) => s.id_producto === a.producto_id ? [i] : []);
    if (indices.length !== 1) throw new Error(indices.length ? 'SKU_DUPLICADO' : 'SKU_INEXISTENTE');
    const actual = copia[indices[0]];
    // Una identidad estructurada distinta ya presente exige revisión; no se sobrescribe.
    for (const c of campos) if (actual[c] !== undefined && actual[c] !== '' && actual[c] !== a[c]) throw new Error('IDENTIDAD_MAESTRO_CAMBIO');
    const identidad = Object.fromEntries(campos.map(c => [c, a[c]]));
    const proyectado = { ...actual, ...identidad } as SkuFamilia;
    if (!validarIdentidadSkuFisica(proyectado).valido) throw new Error('IDENTIDAD_FISICA_INVALIDA');
    copia[indices[0]] = proyectado;
  }
  return copia;
}

export function ejecutarDryRunComercialC7a(skus: readonly SkuFamilia[], propuesta: MapaComercialC7a) {
  if (propuesta.modelo !== 'PROPUESTA_C7A_LOCAL') throw new Error('MODELO_PROPUESTA_INVALIDO');
  const aprobados = new Set(propuesta.identidades_aprobadas.map(a => a.producto_id));
  if (propuesta.mapa.some(a => !aprobados.has(a.producto_id))
    || propuesta.identidades_aprobadas.some(a => !propuesta.mapa.some(m => m.producto_id === a.producto_id))) throw new Error('MAPA_SIN_IDENTIDAD_APROBADA');
  const skus_proyectados = proyectarIdentidadesC7a(skus, propuesta.identidades_aprobadas);
  const resultado = validarMapaPropuesto(propuesta.mapa, propuesta.familias, skus_proyectados);
  return { ...resultado, skus_proyectados };
}
