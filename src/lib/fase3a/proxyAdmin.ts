/**
 * proxyAdmin.ts — Reglas de decisión del proxy admin de pedidos (FASE 3A, 1.5a).
 *
 * Función pura, sin dependencias de Next ni de red, para que las reglas que
 * aplica `src/app/api/admin/pedidos/[id]/route.ts` sean verificables por tests.
 *
 * Cierra por el lado de Next.js los hallazgos 3, 4 y 5 de
 * docs/fase-3a/DIAGNOSTICO_ACTUAL.md. Ver también
 * docs/fase-3a/SEGUIMIENTO_1_5A_PROXY_ADMIN.md
 */

// La extension .ts es deliberada: permite que `node --test` resuelva el modulo
// al ejecutar los tests sin transpilar. Habilitado con `allowImportingTsExtensions`
// en tsconfig.json, que solo es valido con `noEmit` (Next.js compila con SWC).
import {
  esEstadoPedido,
  evaluarTransicion,
  type EstadoPedido,
} from './estados.ts';

export interface DecisionProxy {
  permitido: boolean;
  /** Código HTTP a devolver cuando `permitido` es false. */
  status?: 400 | 409;
  motivo?: string;
  /**
   * true cuando la petición no cambia el estado del pedido: el panel reenvía el
   * estado actual al actualizar solo el pago.
   */
  sin_cambio_de_estado?: boolean;
}

function normalizar(valor: unknown): string {
  return String(valor ?? '').trim().toLowerCase();
}

const PERMITIDO: DecisionProxy = { permitido: true };

function rechazar(status: 400 | 409, motivo: string): DecisionProxy {
  return { permitido: false, status, motivo };
}

function estadoIlegible(estado: string, accion: string): DecisionProxy {
  return rechazar(
    409,
    `El pedido tiene un estado no reconocido en la hoja: "${estado}". Revisalo a mano antes de ${accion}.`
  );
}

/**
 * Decide si un PATCH de estado puede reenviarse a Apps Script.
 *
 * `estadoSolicitado` vacío significa que la petición solo actualiza el pago.
 */
export function decidirPatchEstado(
  estadoActual: unknown,
  estadoSolicitado: unknown
): DecisionProxy {
  const solicitado = normalizar(estadoSolicitado);

  // Sin estado solicitado, la petición solo toca el pago: nada que validar.
  if (!solicitado) return { permitido: true, sin_cambio_de_estado: true };

  // Cancelar por PATCH marcaba el pedido cancelado SIN devolver stock, porque
  // `actualizarEstadoPedido` no toca inventario (hallazgo 4). Debe ir por POST.
  if (solicitado === 'cancelado') {
    return rechazar(
      400,
      'Para cancelar un pedido usa POST a esta misma ruta: PATCH no devuelve el stock.'
    );
  }

  if (!esEstadoPedido(solicitado)) {
    return rechazar(400, `Estado de pedido invalido: "${solicitado}".`);
  }

  const actual = normalizar(estadoActual);
  if (!esEstadoPedido(actual)) return estadoIlegible(actual, 'cambiarlo');

  // El panel reenvía el estado actual cuando solo cambia el pago. Eso no es una
  // transición: `evaluarTransicion` rechaza ir a uno mismo a propósito (defensa
  // contra el doble clic), y validarlo aquí rompería el desplegable de pago.
  if (solicitado === actual) {
    return { permitido: true, sin_cambio_de_estado: true };
  }

  const resultado = evaluarTransicion(actual, solicitado as EstadoPedido);
  if (!resultado.valido) {
    return rechazar(409, resultado.motivo ?? 'Transicion de estado no permitida.');
  }

  return PERMITIDO;
}

/**
 * Decide si un pedido puede cancelarse (POST).
 *
 * Rechaza cancelar un pedido ya cancelado —lo que evitaría la segunda devolución
 * de stock del hallazgo 3— y cancelar uno entregado (hallazgo 5).
 */
export function decidirCancelacion(estadoActual: unknown): DecisionProxy {
  const actual = normalizar(estadoActual);
  if (!esEstadoPedido(actual)) return estadoIlegible(actual, 'cancelarlo');

  const resultado = evaluarTransicion(actual, 'cancelado');
  if (!resultado.valido) {
    return rechazar(409, resultado.motivo ?? 'No se puede cancelar este pedido.');
  }

  return PERMITIDO;
}
