import {
  ESTADOS_APERTURA,
  ESTADOS_MODO_PRESENCIAL,
  ESTADOS_PEDIDOS_ANTICIPADOS,
  calcularCierrePedidosPorDefecto,
  type EstadoApertura,
  type EstadoModoPresencial,
  type EstadoPedidosAnticipados,
} from './aperturas.ts';

export interface AperturaEditable {
  apertura_id: string;
  fecha_apertura: string;
  hora_inicio: string;
  hora_termino: string;
  lugar: string;
  cierre_pedidos_anticipados: string;
  estado_apertura: EstadoApertura;
  pedidos_anticipados_estado: EstadoPedidosAnticipados;
  modo_presencial_estado: EstadoModoPresencial;
  mensaje_publico: string;
  observaciones_internas: string;
}

export interface AperturaAdmin extends AperturaEditable {
  creada_por: string;
  actualizada_por: string;
  creado_en: string;
  actualizado_en: string;
}

export type ResultadoValidacionApertura =
  | { ok: true; apertura: AperturaEditable }
  | { ok: false; error: string };

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA_HORA_RE = /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/;

function texto(valor: unknown): string {
  return String(valor ?? '').trim();
}

function incluye<T extends string>(valores: readonly T[], valor: string): valor is T {
  return valores.includes(valor as T);
}

function esFechaIsoValida(fecha: string): boolean {
  if (!FECHA_RE.test(fecha)) return false;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const valor = new Date(Date.UTC(anio, mes - 1, dia));
  return valor.getUTCFullYear() === anio &&
    valor.getUTCMonth() === mes - 1 &&
    valor.getUTCDate() === dia;
}

export function idAperturaDesdeFecha(fecha: string): string {
  return FECHA_RE.test(fecha) ? `APE-${fecha.replace(/-/g, '')}` : '';
}

export function crearBorradorApertura(fecha = ''): AperturaEditable {
  return {
    apertura_id: idAperturaDesdeFecha(fecha),
    fecha_apertura: fecha,
    hora_inicio: '11:00',
    hora_termino: '15:00',
    lugar: '',
    cierre_pedidos_anticipados: fecha ? calcularCierrePedidosPorDefecto(fecha) : '',
    estado_apertura: 'por_confirmar',
    pedidos_anticipados_estado: 'activo',
    modo_presencial_estado: 'inactivo',
    mensaje_publico: '',
    observaciones_internas: '',
  };
}

export function validarAperturaEditable(entrada: unknown): ResultadoValidacionApertura {
  if (!entrada || typeof entrada !== 'object') {
    return { ok: false, error: 'La apertura debe ser un objeto.' };
  }
  const raw = entrada as Record<string, unknown>;
  const fecha = texto(raw.fecha_apertura);
  const estado = texto(raw.estado_apertura);
  const pedidos = texto(raw.pedidos_anticipados_estado);
  const presencial = texto(raw.modo_presencial_estado);
  const apertura: AperturaEditable = {
    apertura_id: texto(raw.apertura_id),
    fecha_apertura: fecha,
    hora_inicio: texto(raw.hora_inicio),
    hora_termino: texto(raw.hora_termino),
    lugar: texto(raw.lugar),
    cierre_pedidos_anticipados: texto(raw.cierre_pedidos_anticipados),
    estado_apertura: incluye(ESTADOS_APERTURA, estado) ? estado : 'por_confirmar',
    pedidos_anticipados_estado: incluye(ESTADOS_PEDIDOS_ANTICIPADOS, pedidos)
      ? pedidos
      : 'activo',
    modo_presencial_estado: incluye(ESTADOS_MODO_PRESENCIAL, presencial)
      ? presencial
      : 'inactivo',
    mensaje_publico: texto(raw.mensaje_publico),
    observaciones_internas: texto(raw.observaciones_internas),
  };

  if (!esFechaIsoValida(fecha)) {
    return { ok: false, error: 'fecha_apertura debe usar yyyy-MM-dd.' };
  }
  if (apertura.apertura_id !== idAperturaDesdeFecha(fecha)) {
    return { ok: false, error: 'apertura_id debe coincidir con fecha_apertura.' };
  }
  if (!HORA_RE.test(apertura.hora_inicio) || !HORA_RE.test(apertura.hora_termino)) {
    return { ok: false, error: 'Las horas deben usar HH:mm.' };
  }
  if (apertura.hora_inicio >= apertura.hora_termino) {
    return { ok: false, error: 'La hora de inicio debe ser anterior a la de término.' };
  }
  if (!FECHA_HORA_RE.test(apertura.cierre_pedidos_anticipados)) {
    return { ok: false, error: 'El cierre debe usar yyyy-MM-ddTHH:mm.' };
  }
  if (apertura.cierre_pedidos_anticipados >= `${fecha}T${apertura.hora_inicio}`) {
    return { ok: false, error: 'El cierre debe ser anterior al inicio de la apertura.' };
  }
  if (!incluye(ESTADOS_APERTURA, estado)) {
    return { ok: false, error: 'estado_apertura no es válido.' };
  }
  if (!incluye(ESTADOS_PEDIDOS_ANTICIPADOS, pedidos)) {
    return { ok: false, error: 'pedidos_anticipados_estado no es válido.' };
  }
  if (!incluye(ESTADOS_MODO_PRESENCIAL, presencial)) {
    return { ok: false, error: 'modo_presencial_estado no es válido.' };
  }
  if (!apertura.lugar && (estado === 'programada' || estado === 'activa')) {
    return { ok: false, error: 'Completa el lugar antes de programar o activar.' };
  }
  if (presencial === 'activo' && (estado === 'cerrada' || estado === 'cancelada')) {
    return { ok: false, error: 'Una apertura cerrada o cancelada no admite modo presencial.' };
  }
  return { ok: true, apertura };
}

export function normalizarAperturaAdmin(entrada: unknown): AperturaAdmin {
  const raw = (entrada && typeof entrada === 'object' ? entrada : {}) as Record<string, unknown>;
  const validacion = validarAperturaEditable(raw);
  if (!validacion.ok) throw new Error(validacion.error);
  return {
    ...validacion.apertura,
    creada_por: texto(raw.creada_por),
    actualizada_por: texto(raw.actualizada_por),
    creado_en: texto(raw.creado_en),
    actualizado_en: texto(raw.actualizado_en),
  };
}
