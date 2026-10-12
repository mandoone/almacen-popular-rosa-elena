/** Revisión de un archivo local: reutiliza C7-B sin aceptar autoridad de migración. */
import type { ManifestC7, BaseMigracionC7 } from './preparacionC7b.ts';
import { generarPlanMigracionFamiliasC7, simularPlanMigracionC7 } from './preparacionC7b.ts';
import { proyectarRespuestasNadiaC7, type RespuestasNadiaC7 } from './respuestasNadiaC7.ts';
import type { FuenteEvidenciaC7c } from './revisionAdminC7c.ts';

export const MAX_JSON_C7C = 200_000;
export function leerRespuestasLocalesC7c(texto: string): RespuestasNadiaC7 {
  if (new TextEncoder().encode(texto).length > MAX_JSON_C7C) throw new Error('ARCHIVO_DEMASIADO_GRANDE');
  let respuesta: unknown;
  try { respuesta = JSON.parse(texto); } catch { throw new Error('JSON_INVALIDO'); }
  if (!respuesta || typeof respuesta !== 'object' || Array.isArray(respuesta)) throw new Error('TEMPLATE_INVALIDO');
  return respuesta as RespuestasNadiaC7; // C7-B valida estructura/campos exactos antes de proyectar.
}
export interface PropuestaIdentidadLocalC7c {
  producto_id: string; marca_fisica: string; presentacion: string; contenido_cantidad: number;
  contenido_unidad: string; fuente: FuenteEvidenciaC7c; evidencia: string; fecha: string;
}
export function incorporarPropuestaLocalC7c(template: RespuestasNadiaC7, p: PropuestaIdentidadLocalC7c): RespuestasNadiaC7 {
  if (!['NADIA', 'OMAR', 'CONTEO_FISICO', 'DOCUMENTO_VIGENTE'].includes(p.fuente)) throw new Error('FUENTE_INVALIDA');
  if (!p.evidencia.trim()) throw new Error('EVIDENCIA_REQUERIDA');
  const copia = structuredClone(template), i = copia.productos.findIndex(r => r.producto_id === p.producto_id);
  if (i < 0) throw new Error('SKU_FUERA_TEMPLATE');
  copia.productos[i] = { producto_id: p.producto_id, estado: 'RECIBIDA', marca_fisica: p.marca_fisica, presentacion: p.presentacion,
    contenido_cantidad: p.contenido_cantidad, contenido_unidad: p.contenido_unidad,
    respuesta_fuente: `[${p.fuente}] ${p.evidencia.trim()}`, fecha_acreditacion: p.fecha };
  return copia;
}
export async function revisarPreparacionLocalC7c(texto: string, manifest: ManifestC7, base: BaseMigracionC7) {
  const respuestas = leerRespuestasLocalesC7c(texto);
  const proyeccion = proyectarRespuestasNadiaC7(respuestas, base.skus, manifest);
  if (proyeccion.dry_run.estado !== 'CUMPLE') throw new Error('DRY_RUN_NO_CUMPLE');
  const plan = await generarPlanMigracionFamiliasC7(proyeccion.manifest_proyectado, base);
  const primera = await simularPlanMigracionC7(plan, { ...structuredClone(base), recibos: [] });
  const replay = await simularPlanMigracionC7(plan, primera.estado);
  const inversa = await simularPlanMigracionC7(plan, primera.estado, true);
  return {
    proyeccion, plan, respuestas, autorizacion_remota: false as const,
    estado_revision: 'APROBADO_PARA_DRY_RUN' as const,
    simulacion: { primera: primera.cambios, segunda: replay.cambios, inversa: inversa.cambios },
    resumen: {
      familias: plan.cambios.filter(o => o.tipo === 'CREATE_FAMILIA').length,
      skus: new Set(plan.cambios.filter(o => o.tipo === 'UPDATE_PRODUCTO_IDENTIDAD').map(o => o.entidad_id)).size,
      asociaciones: plan.cambios.filter(o => o.tipo === 'SET_FAMILIA_ID').length,
      pendientes: proyeccion.manifest_proyectado.entradas.filter(e => e.estado !== 'APROBADO').length,
      bloqueados: proyeccion.manifest_proyectado.entradas.filter(e => e.estado === 'POSTERGADO_GRANEL' || e.accion_futura === 'CONSERVAR_HISTORICO_NO_MIGRAR').length,
      warnings: proyeccion.dry_run.hallazgos.length,
    },
    cardinalidades_pendientes: manifest.entradas.filter(e => e.cardinalidad.propuesta === 'PROPUESTO_NO_REQUIERE_MULTI_SKU' && e.cardinalidad.estado === 'PENDIENTE_OMAR').map(e => e.producto_id),
  };
}
export type RevisionLocalC7c = Awaited<ReturnType<typeof revisarPreparacionLocalC7c>>;
export function explicarErrorRevisionC7c(e: unknown): string {
  const codigo = e instanceof Error ? e.message : 'ENTRADA_INVALIDA';
  const mensajes: Record<string, string> = {
    JSON_INVALIDO: 'El archivo no es JSON válido.', ARCHIVO_DEMASIADO_GRANDE: 'El JSON supera200 KB.',
    TEMPLATE_INVALIDO: 'Use el template C7 de productos y variantes.', CAMPOS_RESPUESTA_NO_PERMITIDOS: 'Hay campos no permitidos: no se aceptan precio, stock, costo ni cambios de ID.',
    SKU_DESCONOCIDO_O_DUPLICADO: 'El SKU no existe en el manifest o está repetido.', RESPUESTA_SKU_DUPLICADA: 'Hay dos respuestas para el mismo SKU.',
    RESPUESTA_OBLIGATORIOS_INVALIDOS: 'Falta marca, presentación, contenido positivo, fuente o fecha válida.',
    CONFLICTO_IDENTIDAD_ACREDITADA: 'La propuesta contradice una identidad ya acreditada. No se reemplaza.',
    RESPUESTA_PARCIAL_NO_ACREDITADA: 'Una respuesta pendiente no puede contener identidad parcial.',
    CLORO_PRESENTACION_NO_EQUIVALENTE: 'Cloro1L requiere1000 ml. Otra presentación necesita otro SKU.',
    GRANEL_POSTERGADO: 'La identidad y migración de granel siguen postergadas.', UNIDAD_RESPUESTA_INVALIDA: 'Unidad no válida: use ml, g o unidad (también L/kg para normalizar).',
    EVIDENCIA_REQUERIDA: 'Escriba la fuente de la propuesta; no se acredita por nombre.', SKU_FUERA_TEMPLATE: 'Este SKU no está entre las respuestas pendientes del template.',
  };
  return `${mensajes[codigo] ?? 'La entrada no cumple el contrato local. Revise estructura, identidad y evidencia.'} (${codigo})`;
}
