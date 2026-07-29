/**
 * cancelacion.ts — Motivos y validación de cancelación para FASE 3A.
 *
 * Fuente: docs/fase-3a/levantamiento_operativo_fase_3a_consolidado.md (§3.8, §3.9).
 */

export const MOTIVOS_CANCELACION = [
  'cliente_no_retira',
  'cliente_cancela',
  'producto_sin_stock_real',
  'error_en_el_pedido',
  'pedido_duplicado',
  'otro',
] as const;

export type MotivoCancelacion = (typeof MOTIVOS_CANCELACION)[number];

export const ETIQUETA_MOTIVO: Record<MotivoCancelacion, string> = {
  cliente_no_retira: 'Cliente no retira',
  cliente_cancela: 'Cliente cancela',
  producto_sin_stock_real: 'Producto sin stock real',
  error_en_el_pedido: 'Error en el pedido',
  pedido_duplicado: 'Pedido duplicado',
  otro: 'Otro',
};

export function esMotivoCancelacion(
  valor: unknown
): valor is MotivoCancelacion {
  return (
    typeof valor === 'string' &&
    (MOTIVOS_CANCELACION as readonly string[]).includes(valor)
  );
}

export interface DatosCancelacion {
  motivo?: unknown;
  observacion?: unknown;
}

export interface ResultadoCancelacion {
  valido: boolean;
  errores: string[];
  /** true cuando la cancelación debe aparecer en el panel de alertas. */
  requiere_alerta: boolean;
}

/**
 * Valida los datos de una cancelación (§3.8).
 * El motivo es obligatorio siempre; con motivo "Otro" la observación interna
 * también lo es, y la cancelación queda marcada como alerta para el panel.
 */
export function validarCancelacion(
  datos: DatosCancelacion
): ResultadoCancelacion {
  const errores: string[] = [];
  const motivo = String(datos.motivo ?? '').trim();
  const observacion = String(datos.observacion ?? '').trim();

  if (!motivo) {
    return {
      valido: false,
      errores: ['El motivo de cancelación es obligatorio.'],
      requiere_alerta: false,
    };
  }

  if (!esMotivoCancelacion(motivo)) {
    return {
      valido: false,
      errores: [`Motivo de cancelación inválido: "${motivo}".`],
      requiere_alerta: false,
    };
  }

  if (motivo === 'otro' && !observacion) {
    errores.push(
      'Con motivo "Otro" la observación interna es obligatoria.'
    );
  }

  return {
    valido: errores.length === 0,
    errores,
    requiere_alerta: motivo === 'otro',
  };
}
