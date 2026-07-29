/**
 * pagos.ts — Modelo de pago para FASE 3A.
 *
 * Fuente: docs/fase-3a/levantamiento_operativo_fase_3a_consolidado.md (§4).
 *
 * Regla central: estado de pago y método de pago son campos SEPARADOS. Los
 * valores mezclados que hoy existen en producción (`pagado_efectivo`,
 * `pagado_transferencia`) quedan prohibidos en el modelo nuevo; este módulo
 * incluye la función de migración para leerlos sin perder información.
 */

// Import SOLO de tipo: se borra al compilar y al ejecutar con `node --test`, así
// cada módulo de fase3a queda sin dependencias de runtime entre sí.
import type { EstadoPedido } from './estados';

export const ESTADOS_PAGO = ['pendiente_de_pago', 'pagado'] as const;
export type EstadoPago = (typeof ESTADOS_PAGO)[number];

export const METODOS_PAGO = ['efectivo', 'transferencia'] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];

export const ETIQUETA_ESTADO_PAGO: Record<EstadoPago, string> = {
  pendiente_de_pago: 'Pendiente de pago',
  pagado: 'Pagado',
};

export const ETIQUETA_METODO_PAGO: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
};

export function esEstadoPago(valor: unknown): valor is EstadoPago {
  return (
    typeof valor === 'string' &&
    (ESTADOS_PAGO as readonly string[]).includes(valor)
  );
}

export function esMetodoPago(valor: unknown): valor is MetodoPago {
  return (
    typeof valor === 'string' &&
    (METODOS_PAGO as readonly string[]).includes(valor)
  );
}

/**
 * Estados de pedido desde los que se puede marcar un pago (§4.3).
 * Solo pedidos confirmados: "Recibido" y "Cancelado" no admiten pago.
 */
export function puedeMarcarsePagado(estadoPedido: EstadoPedido): boolean {
  return (
    estadoPedido === 'pendiente' ||
    estadoPedido === 'listo' ||
    estadoPedido === 'entregado'
  );
}

export interface RegistroPago {
  estado_pago: EstadoPago;
  metodo_pago?: MetodoPago | null;
  responsable?: string | null;
}

export interface ResultadoValidacion {
  valido: boolean;
  errores: string[];
}

/**
 * Valida el registro de un pago (§4.5).
 * Al marcar "Pagado" son obligatorios método y responsable. El comprobante de
 * transferencia NO es obligatorio en primera versión.
 */
export function validarRegistroPago(
  estadoPedido: EstadoPedido,
  registro: RegistroPago
): ResultadoValidacion {
  const errores: string[] = [];

  if (registro.estado_pago === 'pagado') {
    if (!puedeMarcarsePagado(estadoPedido)) {
      errores.push(
        `No se puede registrar pago con el pedido en estado "${estadoPedido}".`
      );
    }
    if (!registro.metodo_pago) {
      errores.push('Falta el método de pago (efectivo o transferencia).');
    } else if (!esMetodoPago(registro.metodo_pago)) {
      errores.push(`Método de pago inválido: "${registro.metodo_pago}".`);
    }
    if (!registro.responsable || !String(registro.responsable).trim()) {
      errores.push('Falta el responsable de venta/pago.');
    }
  }

  return { valido: errores.length === 0, errores };
}

/**
 * Un pedido no puede pasar a "Entregado" si sigue pendiente de pago (§4.4).
 * Antes de entregar debe estar pagado, con método y responsable registrados.
 */
export function validarEntrega(registro: RegistroPago): ResultadoValidacion {
  const errores: string[] = [];

  if (registro.estado_pago !== 'pagado') {
    errores.push('El pedido no puede entregarse con el pago pendiente.');
  }
  if (!registro.metodo_pago) {
    errores.push('Falta el método de pago para entregar.');
  }
  if (!registro.responsable || !String(registro.responsable).trim()) {
    errores.push('Falta el responsable de venta/pago para entregar.');
  }

  return { valido: errores.length === 0, errores };
}

export interface PagoMigrado {
  estado_pago: EstadoPago;
  metodo_pago: MetodoPago | null;
  /** true cuando el valor original no se pudo interpretar sin ambigüedad. */
  requiere_revision: boolean;
  valor_original: string;
}

/**
 * Traduce los valores heredados de la hoja PEDIDOS al modelo separado.
 *
 * Valores vistos hoy en producción:
 *   'pendiente'             → pendiente de pago, sin método
 *   'pagado_efectivo'       → pagado + efectivo
 *   'pagado_transferencia'  → pagado + transferencia
 *   'anulado'               → sin equivalente; queda para revisión manual
 *
 * No inventa información: cualquier otro valor se marca `requiere_revision`.
 */
export function migrarEstadoPagoHeredado(valor: unknown): PagoMigrado {
  const original = String(valor ?? '').trim().toLowerCase();

  switch (original) {
    case 'pagado_efectivo':
      return {
        estado_pago: 'pagado',
        metodo_pago: 'efectivo',
        requiere_revision: false,
        valor_original: original,
      };
    case 'pagado_transferencia':
      return {
        estado_pago: 'pagado',
        metodo_pago: 'transferencia',
        requiere_revision: false,
        valor_original: original,
      };
    case 'pendiente':
    case 'pendiente_de_pago':
    case '':
      return {
        estado_pago: 'pendiente_de_pago',
        metodo_pago: null,
        requiere_revision: false,
        valor_original: original,
      };
    case 'pagado':
      // Pagado sin método: el método debe completarse a mano.
      return {
        estado_pago: 'pagado',
        metodo_pago: null,
        requiere_revision: true,
        valor_original: original,
      };
    default:
      // Incluye 'anulado' y cualquier valor libre escrito en la hoja.
      return {
        estado_pago: 'pendiente_de_pago',
        metodo_pago: null,
        requiere_revision: true,
        valor_original: original,
      };
  }
}
