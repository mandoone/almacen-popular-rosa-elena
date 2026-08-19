/**
 * estadoPublicoWeb.ts — Máquina de estados públicos de la web (FASE 3B).
 *
 * Fuente de verdad operativa:
 *   docs/fase-3b/MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md (§B)
 *
 * IMPORTANTE — este módulo es PURO y NO está conectado al flujo real. No
 * decide cuál `Apertura` es "la relevante" cuando hay varias en el
 * calendario: eso es una decisión pendiente explícita (ver §F.3 del modelo
 * de datos), no un comportamiento inventado aquí. Recibe una `Apertura` ya
 * elegida (o `null` si no hay ninguna relevante).
 */

import {
  type Apertura,
  estaDentroDeHorario,
  haTerminadoApertura,
  puedeRecibirPedidoAnticipado,
  puedeUsarModoPresencial,
} from './aperturas.ts';

export const ESTADOS_PUBLICOS_WEB = [
  'sin_apertura_programada',
  'pedido_anticipado_activo',
  'pedido_anticipado_cerrado',
  'modo_presencial_activo',
  'apertura_cerrada',
  'apertura_cancelada',
] as const;

export type EstadoPublicoWeb = (typeof ESTADOS_PUBLICOS_WEB)[number];

export interface ComportamientoEstadoPublico {
  puedeVerCatalogo: boolean;
  puedeHacerPedidoAnticipado: boolean;
  puedeUsarComandaDigitalPresencial: boolean;
  mensajePublicoSugerido: string;
}

/** Tabla B de docs/fase-3b/MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md, como datos. */
export const COMPORTAMIENTO_ESTADO_PUBLICO: Record<
  EstadoPublicoWeb,
  ComportamientoEstadoPublico
> = {
  sin_apertura_programada: {
    puedeVerCatalogo: true,
    puedeHacerPedidoAnticipado: false,
    puedeUsarComandaDigitalPresencial: false,
    mensajePublicoSugerido: 'Aún no hay próxima apertura confirmada.',
  },
  pedido_anticipado_activo: {
    puedeVerCatalogo: true,
    puedeHacerPedidoAnticipado: true,
    puedeUsarComandaDigitalPresencial: false,
    mensajePublicoSugerido: 'Pedidos anticipados abiertos para la próxima apertura.',
  },
  pedido_anticipado_cerrado: {
    puedeVerCatalogo: true,
    puedeHacerPedidoAnticipado: false,
    puedeUsarComandaDigitalPresencial: false,
    mensajePublicoSugerido: 'Pedidos anticipados cerrados. Próxima apertura a confirmar.',
  },
  modo_presencial_activo: {
    puedeVerCatalogo: true,
    puedeHacerPedidoAnticipado: false,
    puedeUsarComandaDigitalPresencial: true,
    mensajePublicoSugerido: '¡Estamos abiertos! Escanea el QR para armar tu comanda.',
  },
  apertura_cerrada: {
    puedeVerCatalogo: true,
    puedeHacerPedidoAnticipado: false,
    puedeUsarComandaDigitalPresencial: false,
    mensajePublicoSugerido: 'Cerramos por hoy. Próxima apertura a confirmar.',
  },
  apertura_cancelada: {
    puedeVerCatalogo: true,
    puedeHacerPedidoAnticipado: false,
    puedeUsarComandaDigitalPresencial: false,
    mensajePublicoSugerido: 'La apertura fue cancelada.',
  },
};

/**
 * Evalúa el estado público de la web para una apertura ya seleccionada.
 *
 * Precedencia (docs/fase-3b/MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md §B.1):
 *   1. sin apertura, o `por_confirmar`      → sin_apertura_programada
 *   2. `estado_apertura = cancelada`         → apertura_cancelada
 *   3. modo presencial usable ahora          → modo_presencial_activo
 *   4. `cerrada` o ya pasó `hora_termino`    → apertura_cerrada
 *   5. puede recibir pedido anticipado ahora → pedido_anticipado_activo
 *   6. cualquier otro caso                   → pedido_anticipado_cerrado
 */
export function obtenerEstadoPublicoWeb(
  apertura: Apertura | null,
  fechaActual: string
): EstadoPublicoWeb {
  if (!apertura || apertura.estado_apertura === 'por_confirmar') {
    return 'sin_apertura_programada';
  }
  if (apertura.estado_apertura === 'cancelada') {
    return 'apertura_cancelada';
  }
  if (puedeUsarModoPresencial(apertura, fechaActual)) {
    return 'modo_presencial_activo';
  }
  if (haTerminadoApertura(apertura, fechaActual)) {
    return 'apertura_cerrada';
  }
  if (puedeRecibirPedidoAnticipado(apertura, fechaActual)) {
    return 'pedido_anticipado_activo';
  }
  return 'pedido_anticipado_cerrado';
}

/** Reexportado para que quien consuma este módulo no necesite importar aperturas.ts aparte. */
export { estaDentroDeHorario, haTerminadoApertura, puedeRecibirPedidoAnticipado, puedeUsarModoPresencial };
