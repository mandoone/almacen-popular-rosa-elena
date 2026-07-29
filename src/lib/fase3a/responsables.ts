/**
 * responsables.ts — Responsables de venta/pago para FASE 3A.
 *
 * Fuente: docs/fase-3a/levantamiento_operativo_fase_3a_consolidado.md (§3.1, §4.7).
 *
 * La lista es un PARÁMETRO EDITABLE: cambiar quién opera el sistema no debe
 * requerir tocar la lógica. Los permisos por rol (quién confirma, quién cancela)
 * siguen pendientes de Carolina/Nadia y NO se asumen aquí.
 */

export const RESPONSABLE_OTRO = 'Otro';

/** Lista autorizada inicial (§4.7). Editable sin tocar la lógica. */
export const RESPONSABLES_AUTORIZADOS = [
  'Carolina',
  'Nadia',
  'Lucía',
  'Seba',
  'Juan Py',
  'Cris',
  'Mati',
  'Lizzie',
] as const;

export type ResponsableAutorizado = (typeof RESPONSABLES_AUTORIZADOS)[number];

export const ALERTA_RESPONSABLE_NO_AUTORIZADO =
  'Responsable no autorizado / pendiente de validación administrativa';

/**
 * Roles declarados en §3.1. Se registran como dato, NO como permisos: quién
 * puede confirmar o cancelar pedidos es una pregunta abierta para Carolina/Nadia
 * (ver docs/fase-3a/PENDIENTES_CAROLINA_NADIA.md, puntos 3 y 4).
 */
export type RolOperativo = 'administracion' | 'operacion' | 'venta';

export const ROLES_POR_RESPONSABLE: Record<
  ResponsableAutorizado,
  readonly RolOperativo[]
> = {
  Carolina: ['administracion', 'operacion'],
  Nadia: ['administracion', 'operacion'],
  'Lucía': ['operacion', 'venta'],
  Seba: ['operacion'],
  'Juan Py': ['venta'],
  Cris: ['venta'],
  Mati: ['venta'],
  Lizzie: ['venta'],
};

export function esResponsableAutorizado(
  valor: unknown
): valor is ResponsableAutorizado {
  return (
    typeof valor === 'string' &&
    (RESPONSABLES_AUTORIZADOS as readonly string[]).includes(valor)
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
  observacion?: unknown
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

  if (esResponsableAutorizado(nombre)) {
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
