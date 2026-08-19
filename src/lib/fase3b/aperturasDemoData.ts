/**
 * Datos efímeros para revisar el calendario de aperturas de FASE 3B sin
 * llamar a Apps Script ni leer Google Sheets.
 *
 * Mismo criterio que `src/lib/fase3a/adminDemo.ts`: el modo demo solo se
 * habilita en desarrollo local con `/admin?demo=1`. Este módulo es PURO — no
 * usa `Date.now()` ni el reloj real, para que la demo sea 100% reproducible
 * sin importar cuándo se abra: usa `AHORA_DEMO` como instante de referencia
 * fijo en vez de la hora actual.
 */

import { calcularCierrePedidosPorDefecto, type Apertura } from './aperturas.ts';

/**
 * Instante de referencia fijo para toda la demo (sábado, dentro del horario
 * 11:00–15:00 de la apertura de ejemplo "modo presencial activo"). No es la
 * hora real: es el "ahora" que usan las funciones puras al evaluar los datos
 * de abajo.
 */
export const AHORA_DEMO = '2026-08-15T12:30';

/** Apertura ya cerrada (pasada). */
const APERTURA_CERRADA: Apertura = {
  apertura_id: 'APE-20260801-DEMO',
  fecha_apertura: '2026-08-01',
  hora_inicio: '11:00',
  hora_termino: '15:00',
  cierre_pedidos_anticipados: calcularCierrePedidosPorDefecto('2026-08-01'),
  estado_apertura: 'cerrada',
  pedidos_anticipados_estado: 'cerrado',
  modo_presencial_estado: 'cerrado',
  lugar: 'Gamero 2670, Independencia',
  mensaje_publico: 'Cerramos por hoy. Próxima apertura a confirmar.',
  observaciones_internas: 'Apertura de ejemplo ya terminada.',
};

/** Apertura activa hoy, con el modo presencial QR activo ahora mismo. */
const APERTURA_MODO_PRESENCIAL_ACTIVO: Apertura = {
  apertura_id: 'APE-20260815-DEMO',
  fecha_apertura: '2026-08-15',
  hora_inicio: '11:00',
  hora_termino: '15:00',
  cierre_pedidos_anticipados: calcularCierrePedidosPorDefecto('2026-08-15'),
  estado_apertura: 'activa',
  pedidos_anticipados_estado: 'cerrado',
  modo_presencial_estado: 'activo',
  lugar: 'Gamero 2670, Independencia',
  mensaje_publico: '¡Estamos abiertos! Escanea el QR para armar tu comanda.',
  observaciones_internas: 'Apertura de ejemplo con modo presencial activo ahora mismo (AHORA_DEMO).',
};

/** Apertura activa (destacada como próxima), con pedidos anticipados abiertos. */
const APERTURA_ACTIVA_PEDIDOS_ABIERTOS: Apertura = {
  apertura_id: 'APE-20260822-DEMO',
  fecha_apertura: '2026-08-22',
  hora_inicio: '11:00',
  hora_termino: '15:00',
  cierre_pedidos_anticipados: calcularCierrePedidosPorDefecto('2026-08-22'),
  estado_apertura: 'activa',
  pedidos_anticipados_estado: 'activo',
  modo_presencial_estado: 'inactivo',
  lugar: 'Gamero 2670, Independencia',
  mensaje_publico: 'Pedidos anticipados abiertos para la próxima apertura.',
  observaciones_internas: 'Apertura de ejemplo destacada como próxima, con pedidos anticipados aún abiertos.',
};

/** Apertura cancelada. */
const APERTURA_CANCELADA: Apertura = {
  apertura_id: 'APE-20260829-DEMO',
  fecha_apertura: '2026-08-29',
  hora_inicio: '11:00',
  hora_termino: '15:00',
  cierre_pedidos_anticipados: calcularCierrePedidosPorDefecto('2026-08-29'),
  estado_apertura: 'cancelada',
  pedidos_anticipados_estado: 'cerrado',
  modo_presencial_estado: 'inactivo',
  lugar: 'Gamero 2670, Independencia',
  mensaje_publico: 'La apertura fue cancelada.',
  observaciones_internas: 'Apertura de ejemplo cancelada por feriado.',
};

/** Apertura programada a futuro, con pedidos anticipados normales. */
const APERTURA_PROGRAMADA_FUTURA: Apertura = {
  apertura_id: 'APE-20260905-DEMO',
  fecha_apertura: '2026-09-05',
  hora_inicio: '11:00',
  hora_termino: '15:00',
  cierre_pedidos_anticipados: calcularCierrePedidosPorDefecto('2026-09-05'),
  estado_apertura: 'programada',
  pedidos_anticipados_estado: 'activo',
  modo_presencial_estado: 'inactivo',
  lugar: 'Gamero 2670, Independencia',
  mensaje_publico: 'Aún no hay próxima apertura confirmada.',
  observaciones_internas: 'Apertura de ejemplo programada, todavía no destacada como "activa".',
};

/** Apertura con pedidos anticipados cerrados manualmente antes de la fecha de cierre normal. */
const APERTURA_PEDIDOS_PAUSADOS: Apertura = {
  apertura_id: 'APE-20260912-DEMO',
  fecha_apertura: '2026-09-12',
  hora_inicio: '11:00',
  hora_termino: '15:00',
  cierre_pedidos_anticipados: calcularCierrePedidosPorDefecto('2026-09-12'),
  estado_apertura: 'programada',
  pedidos_anticipados_estado: 'pausado',
  modo_presencial_estado: 'inactivo',
  lugar: 'Gamero 2670, Independencia',
  mensaje_publico: 'Pedidos anticipados cerrados. Próxima apertura a confirmar.',
  observaciones_internas: 'Apertura de ejemplo con pedidos anticipados cerrados a mano antes del jueves de cierre normal.',
};

/**
 * Las seis aperturas de ejemplo, en orden cronológico. Evaluadas contra
 * `AHORA_DEMO`, exactamente una satisface la máxima prioridad de
 * `seleccionarAperturaRelevante` (la de modo presencial activo) — no hay
 * conflicto en este fixture a propósito, para que la demo muestre siempre el
 * mismo resultado estable.
 */
export const APERTURAS_DEMO: readonly Apertura[] = [
  APERTURA_CERRADA,
  APERTURA_MODO_PRESENCIAL_ACTIVO,
  APERTURA_ACTIVA_PEDIDOS_ABIERTOS,
  APERTURA_CANCELADA,
  APERTURA_PROGRAMADA_FUTURA,
  APERTURA_PEDIDOS_PAUSADOS,
];

/** Copia nueva en cada llamada, mismo criterio que `crearPedidosAdminDemo()` de Fase 3A. */
export function crearAperturasDemo(): Apertura[] {
  return APERTURAS_DEMO.map((apertura) => ({ ...apertura }));
}
