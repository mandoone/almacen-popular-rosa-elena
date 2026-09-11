/**
 * Base puramente local para Fase 6: resumen de caja y cierre por apertura.
 * No consulta ni actualiza Apps Script, APERTURAS, VENTAS ni MOVIMIENTOS_STOCK.
 */

export const FORMAS_PAGO_RESUMEN = [
  'efectivo',
  'transferencia',
  'efectivo_al_retirar',
] as const;

export type FormaPagoResumen = (typeof FORMAS_PAGO_RESUMEN)[number];
export type OrigenRegistroApertura = 'pedido_anticipado' | 'venta_presencial';
export type EstadoRegistroApertura = 'vigente' | 'cancelado';
export type EstadoPagoRegistro = 'pagado' | 'pendiente_de_pago';

export interface RegistroParaResumenApertura {
  apertura_id: string;
  origen: OrigenRegistroApertura;
  total: number;
  estado: EstadoRegistroApertura;
  estado_pago: EstadoPagoRegistro;
  forma_pago?: FormaPagoResumen;
}

export interface ResumenApertura {
  apertura_id: string;
  total_pedidos_anticipados: number;
  total_ventas_presenciales: number;
  total_general: number;
  cantidad_pedidos_anticipados: number;
  cantidad_ventas_presenciales: number;
  total_pendiente_pago: number;
  cantidad_pendientes_pago: number;
  total_cancelado: number;
  cantidad_cancelados: number;
  total_cobrado: number;
  total_por_forma_pago: Record<FormaPagoResumen, number>;
  errores: string[];
}

function totalesPorFormaPago(): Record<FormaPagoResumen, number> {
  return { efectivo: 0, transferencia: 0, efectivo_al_retirar: 0 };
}

function esFormaPagoResumen(valor: unknown): valor is FormaPagoResumen {
  return (FORMAS_PAGO_RESUMEN as readonly string[]).includes(String(valor ?? ''));
}

function esOrigenRegistro(valor: unknown): valor is OrigenRegistroApertura {
  return valor === 'pedido_anticipado' || valor === 'venta_presencial';
}

function esEstadoRegistro(valor: unknown): valor is EstadoRegistroApertura {
  return valor === 'vigente' || valor === 'cancelado';
}

function esEstadoPagoRegistro(valor: unknown): valor is EstadoPagoRegistro {
  return valor === 'pagado' || valor === 'pendiente_de_pago';
}

/**
 * Agrupa registros de una sola apertura. Los cancelados quedan separados y no
 * afectan el total general ni la caja. Los registros de otra apertura se
 * rechazan explícitamente para evitar un cierre mezclado.
 */
export function resumirApertura(
  aperturaId: string,
  registros: readonly RegistroParaResumenApertura[]
): ResumenApertura {
  const resumen: ResumenApertura = {
    apertura_id: aperturaId,
    total_pedidos_anticipados: 0,
    total_ventas_presenciales: 0,
    total_general: 0,
    cantidad_pedidos_anticipados: 0,
    cantidad_ventas_presenciales: 0,
    total_pendiente_pago: 0,
    cantidad_pendientes_pago: 0,
    total_cancelado: 0,
    cantidad_cancelados: 0,
    total_cobrado: 0,
    total_por_forma_pago: totalesPorFormaPago(),
    errores: [],
  };

  if (!/^APE-\d{8}$/.test(aperturaId)) {
    resumen.errores.push('La apertura_id del resumen no es válida.');
  }

  for (const registro of registros) {
    if (registro.apertura_id !== aperturaId) {
      resumen.errores.push('Se recibió un registro de otra apertura.');
      continue;
    }
    if (!Number.isFinite(registro.total) || registro.total < 0) {
      resumen.errores.push('Se recibió un total inválido.');
      continue;
    }
    if (!esOrigenRegistro(registro.origen)) {
      resumen.errores.push('Se recibió un origen de registro inválido.');
      continue;
    }
    if (!esEstadoRegistro(registro.estado) || !esEstadoPagoRegistro(registro.estado_pago)) {
      resumen.errores.push('Se recibió un estado de registro o pago inválido.');
      continue;
    }

    if (registro.estado === 'cancelado') {
      resumen.cantidad_cancelados += 1;
      resumen.total_cancelado += registro.total;
      continue;
    }

    resumen.total_general += registro.total;
    if (registro.origen === 'pedido_anticipado') {
      resumen.cantidad_pedidos_anticipados += 1;
      resumen.total_pedidos_anticipados += registro.total;
    } else {
      resumen.cantidad_ventas_presenciales += 1;
      resumen.total_ventas_presenciales += registro.total;
    }

    if (registro.estado_pago === 'pendiente_de_pago') {
      resumen.cantidad_pendientes_pago += 1;
      resumen.total_pendiente_pago += registro.total;
      continue;
    }

    resumen.total_cobrado += registro.total;
    if (!esFormaPagoResumen(registro.forma_pago)) {
      resumen.errores.push('Un registro pagado no informa una forma de pago válida.');
    } else {
      resumen.total_por_forma_pago[registro.forma_pago] += registro.total;
    }
  }

  return resumen;
}

export interface BorradorCierreApertura {
  apertura_id: string;
  efectivo_declarado?: number;
  responsable?: string;
  observaciones?: string;
}

export interface CierrePreparado {
  apertura_id: string;
  efectivo_esperado: number;
  efectivo_declarado: number | null;
  diferencia_efectivo: number | null;
  responsable?: string;
  observaciones?: string;
  listo_para_revision: boolean;
  alertas: string[];
}

/**
 * Revisa los mínimos de un futuro cierre, sin modificar ningún estado. Una
 * diferencia de efectivo es una alerta que requiere decisión humana: esta
 * preparación no autoriza ni ejecuta el cierre de la apertura.
 */
export function prepararCierreApertura(
  resumen: ResumenApertura,
  borrador: BorradorCierreApertura
): CierrePreparado {
  const alertas = [...resumen.errores];
  const declarado = borrador.efectivo_declarado;

  if (borrador.apertura_id !== resumen.apertura_id) {
    alertas.push('El borrador y el resumen corresponden a aperturas distintas.');
  }
  if (!Number.isFinite(declarado) || (declarado ?? -1) < 0) {
    alertas.push('Falta un efectivo declarado válido.');
  }
  if (!String(borrador.responsable ?? '').trim()) {
    alertas.push('Falta identificar a la persona responsable del cierre.');
  }
  if (resumen.cantidad_pendientes_pago > 0) {
    alertas.push('Hay pagos pendientes que deben revisarse antes del cierre.');
  }

  const efectivoDeclarado = Number.isFinite(declarado) ? (declarado as number) : null;
  const diferencia =
    efectivoDeclarado === null
      ? null
      : efectivoDeclarado - resumen.total_por_forma_pago.efectivo;
  if (diferencia !== null && diferencia !== 0) {
    alertas.push('La diferencia de efectivo requiere revisión humana.');
  }

  return {
    apertura_id: resumen.apertura_id,
    efectivo_esperado: resumen.total_por_forma_pago.efectivo,
    efectivo_declarado: efectivoDeclarado,
    diferencia_efectivo: diferencia,
    ...(borrador.responsable?.trim() ? { responsable: borrador.responsable.trim() } : {}),
    ...(borrador.observaciones?.trim()
      ? { observaciones: borrador.observaciones.trim() }
      : {}),
    listo_para_revision: alertas.length === 0,
    alertas,
  };
}
