/**
 * responsables.ts — Responsables de venta/pago para FASE 3A.
 *
 * Fuente: docs/fase-3a/levantamiento_operativo_fase_3a_consolidado.md (§3.1, §4.7).
 *
 * DEPRECADO PARA AUTORIZACIÓN: el validador heredado recibe un registro explícito
 * del llamador y falla cerrado si falta. La autorización runtime usa la sesión
 * y src/lib/fase9/roles.ts; la matriz nominativa vive fuera de Git.
 */

export const RESPONSABLE_OTRO = 'Otro';

/** Registro suministrado por el llamador; nunca una lista nominativa en código. */
export type ResponsableAutorizado = string;

export const ALERTA_RESPONSABLE_NO_AUTORIZADO =
  'Responsable no autorizado / pendiente de validación administrativa';

export function esResponsableAutorizado(
  valor: unknown,
  autorizados: readonly string[] = []
): valor is ResponsableAutorizado {
  return (
    typeof valor === 'string' &&
    autorizados.includes(valor)
  );
}

export interface ResultadoResponsable {
  valido: boolean;
  /** true cuando el pedido debe quedar marcado para revisión administrativa. */
  requiere_alerta: boolean;
  alerta?: string;
  errores: string[];
}

/**
 * Valida el responsable de una venta/pago (§4.7).
 *
 * "Otro" se acepta solo como excepción y siempre deja alerta y observación
 * obligatoria (§3.9).
 */
export function validarResponsable(
  responsable: unknown,
  observacion?: unknown,
  autorizados: readonly string[] = []
): ResultadoResponsable {
  const nombre = String(responsable ?? '').trim();
  const errores: string[] = [];

  if (!nombre) {
    return {
      valido: false,
      requiere_alerta: false,
      errores: ['Falta el responsable de venta/pago.'],
    };
  }

  if (esResponsableAutorizado(nombre, autorizados)) {
    return { valido: true, requiere_alerta: false, errores: [] };
  }

  if (nombre === RESPONSABLE_OTRO) {
    const obs = String(observacion ?? '').trim();
    if (!obs) {
      errores.push(
        'Con responsable "Otro" la observación interna es obligatoria.'
      );
    }
    return {
      valido: errores.length === 0,
      requiere_alerta: true,
      alerta: ALERTA_RESPONSABLE_NO_AUTORIZADO,
      errores,
    };
  }

  return {
    valido: false,
    requiere_alerta: true,
    alerta: ALERTA_RESPONSABLE_NO_AUTORIZADO,
    errores: [`Responsable no reconocido: "${nombre}".`],
  };
}
