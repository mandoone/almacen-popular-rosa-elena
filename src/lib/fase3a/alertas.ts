/**
 * alertas.ts — Reglas de alertas del panel admin para FASE 3A.
 *
 * Fuente: docs/fase-3a/levantamiento_operativo_fase_3a_consolidado.md (§7.3).
 *
 * Módulo puro: recibe un resumen del pedido/producto y devuelve las alertas que
 * corresponde mostrar. No consulta datos ni depende de otros módulos en runtime.
 */

import type { EstadoPedido } from './estados';
import type { EstadoPago, MetodoPago } from './pagos';

export const TIPOS_ALERTA = [
  'pedido_recibido_sin_revisar',
  'responsable_otro_pendiente',
  'transferencia_pendiente_revision',
  'stock_insuficiente_al_confirmar',
  'precio_pendiente',
  'stock_bajo',
  'cancelado_motivo_otro',
] as const;

export type TipoAlerta = (typeof TIPOS_ALERTA)[number];

export const ETIQUETA_ALERTA: Record<TipoAlerta, string> = {
  pedido_recibido_sin_revisar: 'Pedido recibido sin revisar',
  responsable_otro_pendiente: 'Responsable "Otro" pendiente de validación',
  transferencia_pendiente_revision:
    'Pago por transferencia pendiente de revisión externa',
  stock_insuficiente_al_confirmar: 'Stock insuficiente para confirmar',
  precio_pendiente: 'Producto con precio pendiente',
  stock_bajo: 'Stock bajo',
  cancelado_motivo_otro: 'Cancelado con motivo "Otro"',
};

export interface ResumenPedidoAlertas {
  estado_pedido: EstadoPedido;
  estado_pago: EstadoPago;
  metodo_pago?: MetodoPago | null;
  responsable?: string | null;
  motivo_cancelacion?: string | null;
  /** true si al confirmar no alcanza el stock de alguna línea. */
  stock_insuficiente?: boolean;
  /** true si alguna línea tiene precio sin confirmar. */
  precio_pendiente?: boolean;
  /** true si alguna línea quedó bajo el stock mínimo. */
  stock_bajo?: boolean;
}

/**
 * Devuelve las alertas aplicables a un pedido, en orden de prioridad operativa.
 */
export function alertasDePedido(
  resumen: ResumenPedidoAlertas
): TipoAlerta[] {
  const alertas: TipoAlerta[] = [];

  if (resumen.estado_pedido === 'recibido') {
    alertas.push('pedido_recibido_sin_revisar');
  }

  if (resumen.stock_insuficiente) {
    alertas.push('stock_insuficiente_al_confirmar');
  }

  if (String(resumen.responsable ?? '').trim() === 'Otro') {
    alertas.push('responsable_otro_pendiente');
  }

  if (
    resumen.metodo_pago === 'transferencia' &&
    resumen.estado_pago !== 'pagado'
  ) {
    alertas.push('transferencia_pendiente_revision');
  }

  if (resumen.precio_pendiente) {
    alertas.push('precio_pendiente');
  }

  if (resumen.stock_bajo) {
    alertas.push('stock_bajo');
  }

  if (
    resumen.estado_pedido === 'cancelado' &&
    String(resumen.motivo_cancelacion ?? '').trim() === 'otro'
  ) {
    alertas.push('cancelado_motivo_otro');
  }

  return alertas;
}
