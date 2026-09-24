/**
 * estados.ts — Máquina de estados de pedido para FASE 3A.
 *
 * Fuente de verdad operativa:
 *   docs/fase-3a/levantamiento_operativo_fase_3a_consolidado.md (§3.4, §3.5, §3.8)
 *
 * Esta misma matriz se aplica en el proxy Next.js y se replica defensivamente
 * dentro de Apps Script. Allí el lock serializa la operación; el diario durable
 * y el readback verifican sus efectos sin afirmar atomicidad multitabla.
 */

export const ESTADOS_PEDIDO = [
  'recibido',
  'pendiente',
  'listo',
  'entregado',
  'cancelado',
] as const;

export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

/** Etiqueta legible para UI. */
export const ETIQUETA_ESTADO: Record<EstadoPedido, string> = {
  recibido: 'Recibido',
  pendiente: 'Pendiente',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export function esEstadoPedido(valor: unknown): valor is EstadoPedido {
  return (
    typeof valor === 'string' &&
    (ESTADOS_PEDIDO as readonly string[]).includes(valor)
  );
}

/**
 * Estados en los que el stock YA está descontado del inventario.
 *
 * Esta es la pieza central del modelo: el impacto de stock de una transición se
 * deriva de comparar este predicado en origen y destino, en vez de enumerar
 * casos a mano. Evita la clase de bug "doble descuento / doble devolución".
 */
export function consumeStock(estado: EstadoPedido): boolean {
  switch (estado) {
    case 'recibido':
    case 'cancelado':
      return false;
    case 'pendiente':
    case 'listo':
    case 'entregado':
      return true;
    default:
      return exhaustivo(estado);
  }
}

/**
 * Transiciones aprobadas en el levantamiento (§3.4).
 *
 * `recibido → listo` y `pendiente → entregado` se rechazan porque saltan pasos.
 */
const TRANSICIONES: Record<EstadoPedido, readonly EstadoPedido[]> = {
  recibido: ['pendiente', 'cancelado'],
  pendiente: ['listo', 'cancelado'],
  listo: ['entregado', 'cancelado'],
  entregado: [],
  cancelado: [],
};

/**
 * Una transición a sí mismo se considera INVÁLIDA a propósito: así una llamada
 * repetida (doble clic, reintento de red) no puede volver a aplicar un descuento
 * o una devolución de stock.
 */
export function esTransicionValida(
  desde: EstadoPedido,
  hacia: EstadoPedido
): boolean {
  if (desde === hacia) return false;
  return TRANSICIONES[desde].includes(hacia);
}

export function transicionesPosibles(
  desde: EstadoPedido
): readonly EstadoPedido[] {
  return TRANSICIONES[desde];
}

export type ImpactoStock = 'descuenta' | 'devuelve' | 'ninguno';

export interface ResultadoTransicion {
  valido: boolean;
  impacto: ImpactoStock;
  motivo?: string;
}

/**
 * Evalúa una transición y devuelve su impacto de stock.
 *
 * Reglas derivadas (§3.4 y §3.8 del levantamiento):
 *   recibido  → pendiente        → descuenta
 *   pendiente → listo            → ninguno (ya estaba descontado)
 *   listo     → entregado        → ninguno
 *   recibido  → cancelado        → ninguno (nunca descontó)
 *   pendiente/listo → cancelado  → devuelve
 *   entregado → cancelado        → inválido en flujo normal
 */
export function evaluarTransicion(
  desde: EstadoPedido,
  hacia: EstadoPedido
): ResultadoTransicion {
  if (desde === hacia) {
    return {
      valido: false,
      impacto: 'ninguno',
      motivo: `El pedido ya está en estado "${ETIQUETA_ESTADO[desde]}".`,
    };
  }
  if (!esTransicionValida(desde, hacia)) {
    return {
      valido: false,
      impacto: 'ninguno',
      motivo: `Transición no permitida: ${ETIQUETA_ESTADO[desde]} → ${ETIQUETA_ESTADO[hacia]}.`,
    };
  }

  const antes = consumeStock(desde);
  const despues = consumeStock(hacia);

  if (!antes && despues) return { valido: true, impacto: 'descuenta' };
  if (antes && hacia === 'cancelado') return { valido: true, impacto: 'devuelve' };
  return { valido: true, impacto: 'ninguno' };
}

/** Un pedido cancelado no se reabre (§3.5): se crea uno nuevo. */
export function puedeReabrirse(estado: EstadoPedido): boolean {
  return estado !== 'cancelado';
}

/** Solo los pedidos en "Recibido" son editables (§3.6). */
export function esEditable(estado: EstadoPedido): boolean {
  return estado === 'recibido';
}

/** Ayuda al compilador a probar que un switch cubre todos los casos. */
function exhaustivo(valor: never): never {
  throw new Error(`Estado de pedido no contemplado: ${String(valor)}`);
}
