/**
 * aperturas.ts — Calendario editable de aperturas para FASE 3B.
 *
 * Fuente de verdad operativa:
 *   docs/fase-3b/DECISIONES_OPERATIVAS_FASE_3B.md (§1.1, §1.2, §3)
 *   docs/fase-3b/MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md (§A)
 *
 * IMPORTANTE — este módulo es PURO y NO está conectado a ningún flujo real.
 * No lee Google Sheets, no llama a Apps Script, no depende del reloj del
 * sistema (la fecha/hora "actual" siempre se recibe como parámetro).
 *
 * Supuesto de zona horaria: todas las fechas y horas son strings ISO
 * (`yyyy-MM-dd`, `HH:mm`, `yyyy-MM-ddTHH:mm`) tratados como hora de pared, sin
 * ninguna conversión de zona horaria. Se asume que ya vienen en hora de
 * Santiago de Chile. Ver MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md §B.1.
 */

export const ESTADOS_APERTURA = [
  'programada',
  'activa',
  'cerrada',
  'cancelada',
  'por_confirmar',
] as const;

export type EstadoApertura = (typeof ESTADOS_APERTURA)[number];

export const ESTADOS_PEDIDOS_ANTICIPADOS = [
  'activo',
  'cerrado',
  'reabierto_manual',
  'pausado',
] as const;

export type EstadoPedidosAnticipados = (typeof ESTADOS_PEDIDOS_ANTICIPADOS)[number];

export const ESTADOS_MODO_PRESENCIAL = [
  'inactivo',
  'activo',
  'pausado',
  'cerrado',
] as const;

export type EstadoModoPresencial = (typeof ESTADOS_MODO_PRESENCIAL)[number];

/**
 * Entidad APERTURAS (docs/fase-3b/MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md §A).
 * Solo se modelan aquí los campos que la lógica pura necesita leer; los campos
 * puramente informativos (lugar, mensajes, auditoría) se dejan opcionales para
 * no forzar a los tests a completarlos.
 */
export interface Apertura {
  apertura_id: string;
  /** `yyyy-MM-dd` */
  fecha_apertura: string;
  /** `HH:mm`, por defecto 11:00 */
  hora_inicio: string;
  /** `HH:mm`, por defecto 15:00 */
  hora_termino: string;
  /** `yyyy-MM-ddTHH:mm` */
  cierre_pedidos_anticipados: string;
  estado_apertura: EstadoApertura;
  pedidos_anticipados_estado: EstadoPedidosAnticipados;
  modo_presencial_estado: EstadoModoPresencial;
  lugar?: string;
  mensaje_publico?: string;
  observaciones_internas?: string;
}

/**
 * Calcula el cierre de pedidos anticipados por defecto (§1.2 de decisiones):
 * el jueves más cercano ESTRICTAMENTE ANTERIOR a `fechaApertura`, a las 23:59.
 *
 * Misma regla para cualquier día de la semana en que caiga la apertura — no
 * hay un caso especial para domingo ni para ningún otro día. Si la apertura
 * cae en jueves, el resultado es el jueves de la semana previa (7 días antes),
 * no el mismo día: nunca se cierra el mismo día que se abre.
 *
 * Los casos excepcionales (cierre distinto al normal) NO se resuelven acá:
 * se sobrescribe el campo `cierre_pedidos_anticipados` de la apertura a mano.
 * Esta función solo calcula el valor por defecto.
 */
export function calcularCierrePedidosPorDefecto(fechaApertura: string): string {
  const apertura = parseFecha(fechaApertura);
  const cursor = new Date(apertura.getTime());
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (cursor.getUTCDay() !== 4 /* jueves */) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return `${formatFecha(cursor)}T23:59`;
}

/**
 * `true` si, a `fechaActual`, la apertura puede recibir pedidos anticipados.
 *
 * - Ninguna apertura, o `estado_apertura` cancelada/cerrada/por_confirmar →
 *   `false`.
 * - `pedidos_anticipados_estado = reabierto_manual` → `true` sin importar la
 *   fecha de cierre (esa es la excepción que representa: el admin decidió
 *   aceptar pedidos después del cierre normal).
 * - `pedidos_anticipados_estado` distinto de `activo` (`cerrado`, `pausado`)
 *   → `false`, aunque la fecha de cierre todavía no haya llegado. Un cierre
 *   manual anticipado siempre gana sobre la fecha calculada.
 * - `activo` → se compara `fechaActual` contra `cierre_pedidos_anticipados`.
 *   El límite es inclusivo: justo a la hora de cierre todavía se puede pedir.
 */
export function puedeRecibirPedidoAnticipado(
  apertura: Apertura | null,
  fechaActual: string
): boolean {
  if (!apertura) return false;
  if (
    apertura.estado_apertura === 'cancelada' ||
    apertura.estado_apertura === 'cerrada' ||
    apertura.estado_apertura === 'por_confirmar'
  ) {
    return false;
  }
  if (apertura.pedidos_anticipados_estado === 'reabierto_manual') return true;
  if (apertura.pedidos_anticipados_estado !== 'activo') return false;
  return compararFechaHora(fechaActual, apertura.cierre_pedidos_anticipados) <= 0;
}

/**
 * `true` si, a `fechaActual`, el modo presencial QR puede usarse.
 *
 * Requiere `modo_presencial_estado = activo` Y que la hora actual esté dentro
 * de `[hora_inicio, hora_termino]` del día de la apertura (ambos límites
 * inclusivos). Una apertura cancelada o marcada `cerrada` nunca habilita el
 * modo presencial, aunque el campo `modo_presencial_estado` diga `activo`
 * (el estado general de la apertura manda).
 */
export function puedeUsarModoPresencial(
  apertura: Apertura | null,
  fechaActual: string
): boolean {
  if (!apertura) return false;
  if (apertura.estado_apertura === 'cancelada' || apertura.estado_apertura === 'cerrada') {
    return false;
  }
  if (apertura.modo_presencial_estado !== 'activo') return false;
  return estaDentroDeHorario(apertura, fechaActual);
}

/**
 * `true` si `fechaActual` ya pasó `hora_termino` del día de la apertura,
 * o si `estado_apertura` ya está marcada `cerrada` explícitamente.
 */
export function haTerminadoApertura(apertura: Apertura, fechaActual: string): boolean {
  if (apertura.estado_apertura === 'cerrada') return true;
  const fin = `${apertura.fecha_apertura}T${apertura.hora_termino}`;
  return compararFechaHora(fechaActual, fin) > 0;
}

/** `true` si `fechaActual` está entre `hora_inicio` y `hora_termino`, inclusive. */
export function estaDentroDeHorario(apertura: Apertura, fechaActual: string): boolean {
  const inicio = `${apertura.fecha_apertura}T${apertura.hora_inicio}`;
  const fin = `${apertura.fecha_apertura}T${apertura.hora_termino}`;
  return (
    compararFechaHora(fechaActual, inicio) >= 0 && compararFechaHora(fechaActual, fin) <= 0
  );
}

/**
 * Compara dos fechas-hora ISO bien formadas (`yyyy-MM-dd`, `yyyy-MM-ddTHH:mm`
 * o `HH:mm`) por orden lexicográfico, que coincide con el orden cronológico
 * porque el formato usa ancho fijo y ceros a la izquierda.
 *
 * Devuelve negativo si `a < b`, positivo si `a > b`, cero si son iguales. No
 * valida el formato de entrada: se asume que ya viene bien formado, igual que
 * el resto de este módulo (ver supuesto de zona horaria en el encabezado).
 */
export function compararFechaHora(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function parseFecha(fechaISO: string): Date {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

function formatFecha(fecha: Date): string {
  const anio = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}
