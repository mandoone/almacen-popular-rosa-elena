/** Acreditación aditiva: no modifica estado/paso/snapshot/resultado originales del diario V1. */
import { sha256Texto } from './sha256.ts';

export const COLUMNAS_RESOLUCION_REVISION = ['revision_resuelta', 'revision_tipo', 'revision_evidencia_hash', 'revision_detalle', 'revision_resuelta_por', 'revision_resuelta_en'] as const;
export type TipoRevisionV1 = 'CREACION_V1_ACREDITADA' | 'FALLO_PARCIAL_V1_ACREDITADO';
export const COLUMNAS_ORIGINALES_OPERACION = ['operacion_id','idempotency_key','tipo_operacion','id_pedido','actor','estado_operacion','paso','payload_hash','snapshot_json','resultado_json','error_codigo','error_detalle','creado_en','actualizado_en'] as const;
export interface ResolucionRevisionV1 {
  revision_resuelta?: string; revision_tipo?: string; revision_evidencia_hash?: string;
  revision_detalle?: string; revision_resuelta_por?: string; revision_resuelta_en?: string;
}
export function canonRevision(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canonRevision).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.entries(v).filter(([,x]) => x !== undefined).sort(([a],[b]) => a.localeCompare(b)).map(([k,x]) => JSON.stringify(k) + ':' + canonRevision(x)).join(',') + '}';
  return JSON.stringify(v);
}
export function hashRevision(v: unknown): string { return sha256Texto(canonRevision(v)); }
export function hashOriginalOperacion(op: Record<string, unknown>): string {
  // Sheets serial y GET GAS representan el mismo timestamp sin alterar la celda original.
  const fecha = (v: unknown) => typeof v === 'number'
    ? new Date(Date.UTC(1899,11,30) + Math.round(v * 86400000)).toISOString().slice(0,23)
    : typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z?$/.test(v) ? v.slice(0,23) : v;
  return hashRevision(Object.fromEntries(COLUMNAS_ORIGINALES_OPERACION.map(k => [k,
    ['creado_en','actualizado_en'].includes(k) ? fecha(op[k] ?? '') : op[k] ?? ''])));
}
export interface EvidenciaRevisionV1 {
  modelo: 'ACREDITACION_CREACION_V1_1'; tipo: TipoRevisionV1;
  operacion_id: string; id_pedido: string; actor: string; creado_en: string;
  operacion_original_hash: string; explicacion: string;
  pruebas: { cabeceras: 1; detalles: number; movimientos: 0; estado_pedido: string;
    diferencias_normalizadas: string[]; total_coincide: true; identidad_coincide: true;
    fecha_coincide: true; cabecera_hash: string; detalles_hash: string; inventario_hash: string };
}
/** Hashes verifican integridad/vinculación, no sustituyen auditoría autenticada de la Sheet. */
export function revisionV1Acreditada(op: Record<string, unknown>): boolean {
  try {
    if (op.estado_operacion !== 'REQUIERE_REVISION' || op.tipo_operacion !== 'CREAR_PEDIDO' || op.revision_resuelta !== 'SI') return false;
    if (!['CREACION_V1_ACREDITADA','FALLO_PARCIAL_V1_ACREDITADO'].includes(String(op.revision_tipo))) return false;
    const e = JSON.parse(String(op.revision_detalle)) as EvidenciaRevisionV1, p = JSON.parse(String(op.snapshot_json));
    if (p.version !== 1 || p.tipo_operacion !== 'CREAR_PEDIDO' || p.id_pedido !== op.id_pedido || p.cabecera?.id_pedido !== op.id_pedido
      || p.resultado?.id_pedido !== op.id_pedido || !Array.isArray(p.detalles) || !p.detalles.length) return false;
    if (e.modelo !== 'ACREDITACION_CREACION_V1_1' || e.operacion_id !== op.operacion_id || e.id_pedido !== op.id_pedido
      || e.tipo !== op.revision_tipo || e.actor !== op.revision_resuelta_por || e.creado_en !== op.revision_resuelta_en
      || !/^[A-Za-z0-9][A-Za-z0-9_.@-]{0,99}$/.test(e.actor) || !Number.isFinite(Date.parse(e.creado_en))
      || !e.explicacion || e.explicacion.length > 1000 || e.operacion_original_hash !== hashOriginalOperacion(op)
      || hashRevision(e) !== op.revision_evidencia_hash) return false;
    const b = e.pruebas;
    if (!b || b.cabeceras !== 1 || b.movimientos !== 0 || b.total_coincide !== true || b.identidad_coincide !== true || b.fecha_coincide !== true
      || ![b.cabecera_hash,b.detalles_hash,b.inventario_hash].every(h => /^[a-f0-9]{64}$/.test(h)) || !Array.isArray(b.diferencias_normalizadas)) return false;
    return e.tipo === 'CREACION_V1_ACREDITADA'
      ? b.estado_pedido === 'recibido' && b.detalles === p.detalles.length && b.diferencias_normalizadas.length === 0
      : b.estado_pedido === '' && b.detalles === 0 && b.diferencias_normalizadas.length > 0;
  } catch { return false; }
}
