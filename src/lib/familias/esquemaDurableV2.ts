/** C5-A: esquema futuro mínimo. No crea hojas ni conecta rutas o servicios. */
import { COLUMNAS_ASIGNACIONES_PEDIDO, COLUMNAS_DETALLE_PEDIDOS_V2_ADITIVAS } from './pedidoV2.ts';

export const COLUMNAS_PRODUCTOS_DURABLE_V2 = ['revision_stock_v2', 'evidencia_stock_v2'] as const;
export const COLUMNAS_PEDIDOS_DURABLE_V2 = [
  'operacion_asignacion_vigente', 'evidencia_estado_v2', 'evidencia_puntero_v2',
] as const;
/** El puerto derivará contexto_apertura_snapshot.apertura_id del ID ya congelado en PEDIDOS.
 * Habilitaciones se leen para ese ID al confirmar y se congelan en el plan, como C4.
 * No duplicar apertura_id en otra columna JSON. */
export const COLUMNA_APERTURA_PEDIDO_C5 = 'apertura_id' as const;
export const COLUMNAS_ADITIVAS_C5 = {
  PRODUCTOS: COLUMNAS_PRODUCTOS_DURABLE_V2,
  PEDIDOS: COLUMNAS_PEDIDOS_DURABLE_V2,
  DETALLE_PEDIDOS: COLUMNAS_DETALLE_PEDIDOS_V2_ADITIVAS,
} as const;
export { COLUMNAS_ASIGNACIONES_PEDIDO };

/** OPERACIONES_PEDIDOS ya tiene estos campos; no necesita columnas nuevas. */
export const COLUMNAS_DIARIO_REQUERIDAS_C5 = [
  'operacion_id', 'idempotency_key', 'tipo_operacion', 'id_pedido', 'actor',
  'estado_operacion', 'paso', 'payload_hash', 'snapshot_json', 'resultado_json',
  'error_codigo', 'error_detalle', 'creado_en', 'actualizado_en',
] as const;
/** Los recibos son JSON; nunca se acepta saldo final sin autoría. */
export const CAMPOS_RECIBO_DURABLE_V2 = ['operacion_id', 'payload_hash', 'plan_hash', 'efecto_id'] as const;

/** Diseño de serialización para el futuro puerto, aún sin implementación GAS.
 * Campos directos existentes + observacion JSON versionado cubren el movimiento C4 completo.
 * No se requiere una columna nueva por cada atributo del snapshot físico. */
export const MAPEO_MOVIMIENTO_C5 = {
  movimiento_id: 'movimiento_id', operacion_id: 'operacion_id', producto_id: 'producto_id',
  tipo: 'tipo_movimiento', cantidad_stock: 'cantidad', stock_anterior: 'stock_anterior',
  stock_resultante: 'stock_resultante', actor: 'usuario', creado_en: 'fecha_hora',
  referencia_id: 'referencia_id', payload_hash: 'payload_hash',
} as const;
export const CAMPOS_OBSERVACION_MOVIMIENTO_C5 = [
  'id_detalle_pedido', 'asignacion_ids', 'unidad_stock_snapshot',
  'gramos_unidad_stock_snapshot', 'escala_stock_snapshot',
] as const;
export const MODELO_OBSERVACION_MOVIMIENTO_C5 = 'MOVIMIENTO_PEDIDO_V2_1' as const;
