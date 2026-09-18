export const CONFIRMACION_PILOTO_ESCRITURAS = 'HABILITAR_PILOTO_TEST';
export const NOMBRE_SHEET_PILOTO_TEST = 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES';
export const PRODUCTO_UNIDAD_PILOTO = 'PROD-TEST-F78-64C8BE2C22E0';
export const PRODUCTO_DECIMAL_PILOTO = 'PROD-TEST-DECIMAL';

function valor(config, nombre) {
  return typeof config[nombre] === 'string' ? config[nombre] : '';
}

function urlTestValida(valorUrl) {
  try {
    const url = new URL(valorUrl);
    return valorUrl === valorUrl.trim() && url.protocol === 'https:' &&
      url.hostname === 'script.google.com' &&
      /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) &&
      !url.search && !url.hash && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validarConfiguracionPiloto(config, { escritura = false } = {}) {
  const errores = [];
  if (valor(config, 'NEXT_PUBLIC_APP_ENV') !== 'test') {
    errores.push('NEXT_PUBLIC_APP_ENV debe ser exactamente test.');
  }
  const url = valor(config, 'GOOGLE_SCRIPT_PEDIDOS_URL_TEST');
  const token = valor(config, 'GOOGLE_SCRIPT_ADMIN_TOKEN_TEST');
  if (!url || !token) errores.push('Falta configuración TEST obligatoria.');
  if (url && !urlTestValida(url)) errores.push('La URL TEST no tiene formato canónico.');
  if (token && (token !== token.trim() || token.length < 8)) {
    errores.push('El token TEST no cumple el formato mínimo.');
  }
  if (valor(config, 'GOOGLE_SCRIPT_PEDIDOS_URL') || valor(config, 'GOOGLE_SCRIPT_ADMIN_TOKEN')) {
    errores.push('Hay configuración productiva presente; piloto bloqueado.');
  }
  if (escritura && valor(config, 'PILOTO_OPERATIVO_ENABLE_WRITES') !== CONFIRMACION_PILOTO_ESCRITURAS) {
    errores.push('Las escrituras del piloto TEST no fueron habilitadas explícitamente.');
  }
  return errores.length
    ? { ok: false, errores }
    : { ok: true, config: { url, token } };
}

export function crearIdsPiloto(runId, fecha) {
  const sufijo = String(runId ?? '').replace(/[^A-Fa-f0-9]/g, '').slice(0, 24).toLowerCase();
  if (!/^[a-f0-9]{24}$/.test(sufijo)) throw new Error('RUN_ID del piloto no es válido.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha ?? ''))) {
    throw new Error('La fecha del piloto no es válida.');
  }
  return {
    runId: sufijo,
    marcador: `PILOTO-TEST-${sufijo}`,
    aperturaId: `APE-${fecha.replace(/-/g, '')}`,
    productoUnidad: PRODUCTO_UNIDAD_PILOTO,
    productoDecimal: PRODUCTO_DECIMAL_PILOTO,
    aperturaCrear: `piloto_test_apertura_${sufijo}`,
    backup: `piloto_test_backup_${sufijo}`,
    productoPreparar: `piloto_test_producto_preparar_${sufijo}`,
    ventaUnidad: `piloto_test_venta_unidad_${sufijo}`,
    ventaDecimal: `piloto_test_venta_decimal_${sufijo}`,
    gasto: `piloto_test_gasto_${sufijo}`,
    compra: `piloto_test_compra_${sufijo}`,
    caja: `piloto_test_caja_${sufijo}`,
    ajusteBaja: `piloto_test_ajuste_baja_${sufijo}`,
    ajusteRestaura: `piloto_test_ajuste_restaura_${sufijo}`,
    productoRestaurar: `piloto_test_producto_restaurar_${sufijo}`,
    aperturaCerrar: `piloto_test_apertura_cerrar_${sufijo}`,
  };
}

export function validarDestinoPiloto(destino56, destino78) {
  return Boolean(
    destino56?.entorno === 'TEST' &&
    destino56?.destino === 'backend_test_verificado' &&
    destino56?.sheet_nombre === NOMBRE_SHEET_PILOTO_TEST &&
    destino78?.entorno === 'TEST' &&
    destino78?.destino === 'backend_test_verificado' &&
    destino78?.sheet_nombre === NOMBRE_SHEET_PILOTO_TEST &&
    destino78?.contrato === 'fase78_test_v1'
  );
}

export function esFixtureUnidadPiloto(producto) {
  return Boolean(
    producto?.id_producto === PRODUCTO_UNIDAD_PILOTO &&
    String(producto.unidad_medida) === 'unidad' &&
    String(producto.permite_decimal).toUpperCase() === 'NO' &&
    Number(producto.paso_venta) === 1
  );
}

export function esFixtureDecimalPiloto(producto) {
  return Boolean(
    producto?.id_producto === PRODUCTO_DECIMAL_PILOTO &&
    String(producto.unidad_medida) === 'kg' &&
    String(producto.permite_decimal).toUpperCase() === 'SI' &&
    Number(producto.paso_venta) === 0.1
  );
}

export function seleccionarAperturaPedidoPiloto(aperturas, fechaHoraActual) {
  const candidatas = (Array.isArray(aperturas) ? aperturas : []).filter((apertura) => {
    const cierre = String(apertura?.cierre_pedidos_anticipados ?? '')
      .replace(' ', 'T').slice(0, 16);
    return apertura?.estado_apertura === 'activa' &&
      apertura?.pedidos_anticipados_estado === 'activo' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(cierre) &&
      fechaHoraActual <= cierre;
  });
  if (candidatas.length !== 1) {
    throw new Error('El piloto requiere exactamente una apertura anticipada disponible.');
  }
  return candidatas[0];
}

export function validarPropuestaPiloto(propuesta, productoId) {
  const presupuesto = Number(propuesta?.presupuesto);
  const total = Number(propuesta?.total_propuesto);
  const saldo = Number(propuesta?.saldo_sin_asignar);
  if (![presupuesto, total, saldo].every(Number.isFinite) ||
      presupuesto < 0 || total < 0 || total > presupuesto ||
      Math.abs((presupuesto - total) - saldo) > 1e-9) {
    throw new Error('La propuesta no respeta su presupuesto global.');
  }
  const linea = (Array.isArray(propuesta?.lineas) ? propuesta.lineas : [])
    .find((item) => item?.producto_id === productoId);
  if (!linea) throw new Error('La propuesta no incluye el fixture bajo mínimo.');
  const cantidad = Number(linea.cantidad_sugerida);
  const costoUnitario = Number(linea.costo_unitario);
  const subtotal = Number(linea.subtotal);
  if (![cantidad, costoUnitario, subtotal].every(Number.isFinite) ||
      cantidad <= 0 || costoUnitario <= 0 || subtotal <= 0 ||
      subtotal !== Math.round(cantidad * costoUnitario) || subtotal > total) {
    throw new Error('La línea propuesta no cumple el contrato de costo conocido.');
  }
  if (!/TEST.*NO USAR/i.test(String(propuesta.advertencia ?? ''))) {
    throw new Error('La propuesta no declara su carácter TEST no operativo.');
  }
  return linea;
}

export function validarAjustesCompensadosPiloto(baja, restaura, productoId) {
  if (!baja || !restaura) throw new Error('Falta evidencia de los ajustes compensatorios.');
  const productoBaja = String(baja.producto_id ?? baja.id_producto ?? '');
  const productoRestaura = String(restaura.producto_id ?? restaura.id_producto ?? '');
  const stockInicial = Number(baja.stock_anterior);
  const stockBajo = Number(baja.stock_resultante);
  const stockAntesRestaura = Number(restaura.stock_anterior);
  const stockFinal = Number(restaura.stock_resultante);
  if (productoBaja !== productoId || productoRestaura !== productoId ||
      Number(baja.cantidad) !== -1 || Number(restaura.cantidad) !== 1 ||
      ![stockInicial, stockBajo, stockAntesRestaura, stockFinal].every(Number.isFinite) ||
      stockBajo !== stockAntesRestaura || stockFinal !== stockInicial) {
    throw new Error('Los ajustes del piloto no restauran el stock neto.');
  }
  return true;
}

export function normalizarFechaAperturaPiloto(valor) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/.exec(String(valor ?? ''));
  if (!match) throw new Error('La fecha de apertura del piloto no es válida.');
  const fecha = `${match[1]}-${match[2]}-${match[3]}`;
  const comprobacion = new Date(`${fecha}T12:00:00Z`);
  if (Number.isNaN(comprobacion.getTime()) || comprobacion.toISOString().slice(0, 10) !== fecha) {
    throw new Error('La fecha de apertura del piloto no es válida.');
  }
  return fecha;
}

export function normalizarHoraAperturaPiloto(valor) {
  const match = /^(?:\d{4}-\d{2}-\d{2}T)?([0-2]\d):([0-5]\d)/.exec(String(valor ?? ''));
  if (!match || Number(match[1]) > 23) {
    throw new Error('La hora de apertura del piloto no es válida.');
  }
  return `${match[1]}:${match[2]}`;
}

export function normalizarCierreAperturaPiloto(valor) {
  const match = /^(\d{4}-\d{2}-\d{2})T([0-2]\d):([0-5]\d)/.exec(String(valor ?? ''));
  if (!match || Number(match[2]) > 23) {
    throw new Error('El cierre anticipado del piloto no es válido.');
  }
  normalizarFechaAperturaPiloto(match[1]);
  return `${match[1]}T${match[2]}:${match[3]}`;
}

export function normalizarErrorTransportePiloto(error) {
  if (error && typeof error === 'object' && error.name === 'AbortError') {
    return Object.assign(new Error('La lectura TEST agotó el tiempo de espera.'), {
      tipoE2E: 'timeout',
    });
  }
  if (error instanceof TypeError) {
    return Object.assign(new Error('La lectura TEST sufrió un error de red.'), {
      tipoE2E: 'red',
    });
  }
  return error;
}
