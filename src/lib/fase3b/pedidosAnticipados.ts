import {
  normalizarAperturaAdminRespuesta,
  type AperturaAdmin,
} from './adminAperturas.ts';
import { compararFechaHora } from './aperturas.ts';
import { obtenerEntornoAplicacion } from '../env.ts';

export interface AperturaPublicaPedidos {
  apertura_id: string;
  fecha_apertura: string;
  horario: {
    inicio: string;
    termino: string;
  };
  lugar: string;
  cierre_pedidos_anticipados: string;
  pedidos_anticipados_estado: 'activo';
  mensaje_publico?: string;
}

export type ResultadoAperturaActivaPedidos =
  | { tipo: 'disponible'; apertura: AperturaPublicaPedidos }
  | { tipo: 'no_disponible' }
  | { tipo: 'conflicto'; error: string };

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA_HORA_RE = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

export function pedidosAnticipadosConCalendarioHabilitados(
  entorno: string | undefined
): boolean {
  return obtenerEntornoAplicacion(entorno) === 'test';
}

/**
 * Devuelve la hora de pared de Santiago con formato comparable, sin convertir
 * los valores de Sheets a Date ni aplicarles un segundo desplazamiento horario.
 */
export function fechaHoraSantiago(ahora = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(ahora);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? '';
  return `${valor('year')}-${valor('month')}-${valor('day')}T${valor('hour')}:${valor('minute')}`;
}

function tieneFormatoPublicable(apertura: AperturaAdmin): boolean {
  return /^APE-\d{8}$/.test(apertura.apertura_id) &&
    FECHA_RE.test(apertura.fecha_apertura) &&
    HORA_RE.test(apertura.hora_inicio) &&
    HORA_RE.test(apertura.hora_termino) &&
    FECHA_HORA_RE.test(apertura.cierre_pedidos_anticipados);
}

function aAperturaPublica(apertura: AperturaAdmin): AperturaPublicaPedidos {
  return {
    apertura_id: apertura.apertura_id,
    fecha_apertura: apertura.fecha_apertura,
    horario: {
      inicio: apertura.hora_inicio,
      termino: apertura.hora_termino,
    },
    lugar: apertura.lugar,
    cierre_pedidos_anticipados: apertura.cierre_pedidos_anticipados,
    pedidos_anticipados_estado: 'activo',
    ...(apertura.mensaje_publico ? { mensaje_publico: apertura.mensaje_publico } : {}),
  };
}

/** Selecciona una única apertura activa que todavía recibe pedidos. */
export function seleccionarAperturaActivaParaPedidos(
  entradas: readonly unknown[],
  fechaActual: string
): ResultadoAperturaActivaPedidos {
  if (!FECHA_HORA_RE.test(fechaActual)) {
    return { tipo: 'conflicto', error: 'La fecha actual no tiene un formato válido.' };
  }

  const candidatas = entradas
    .map(normalizarAperturaAdminRespuesta)
    .filter((apertura) =>
      tieneFormatoPublicable(apertura) &&
      apertura.estado_apertura === 'activa' &&
      apertura.pedidos_anticipados_estado === 'activo' &&
      compararFechaHora(fechaActual, apertura.cierre_pedidos_anticipados) <= 0
    );

  if (candidatas.length === 0) return { tipo: 'no_disponible' };
  if (candidatas.length > 1) {
    return {
      tipo: 'conflicto',
      error: 'Hay más de una apertura activa disponible para pedidos anticipados.',
    };
  }
  return { tipo: 'disponible', apertura: aAperturaPublica(candidatas[0]) };
}
