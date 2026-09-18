import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  crearErrorRedireccionPostAGetE2E,
  crearErrorRespuestaNoJsonE2E,
  esFalloTransitorioIdempotente,
  esFalloTransitorioLectura,
  mensajeSeguroE2E,
} from './lib/fase56-e2e-guardrails.mjs';
import { esGetSinAccionTransitorioF78 } from './lib/fase78-e2e-guardrails.mjs';
import {
  crearIdsPiloto,
  esFixtureDecimalPiloto,
  esFixtureUnidadPiloto,
  normalizarCierreAperturaPiloto,
  normalizarErrorTransportePiloto,
  normalizarFechaAperturaPiloto,
  normalizarHoraAperturaPiloto,
  seleccionarAperturaPedidoPiloto,
  validarConfiguracionPiloto,
  validarAjustesCompensadosPiloto,
  validarDestinoPiloto,
  validarPropuestaPiloto,
} from './lib/piloto-operativo-test-guardrails.mjs';

const modo = process.argv[2];
const escritura = modo === '--write-test';
const MAX_INTENTOS_GET_PILOTO = 5;
if (!['--preflight', '--write-test'].includes(modo)) {
  console.error('Uso inválido. Ejecuta el preflight o el piloto TEST.');
  process.exitCode = 2;
} else {
  await ejecutar().catch((error) => {
    const sensibles = [
      process.env.GOOGLE_SCRIPT_PEDIDOS_URL_TEST,
      process.env.GOOGLE_SCRIPT_ADMIN_TOKEN_TEST,
    ].filter(Boolean);
    console.error('FAIL | piloto operativo: ' + mensajeSeguroE2E(error, sensibles));
    process.exitCode = 1;
  });
}

async function ejecutar() {
  const validacion = validarConfiguracionPiloto(process.env, { escritura });
  if (!validacion.ok) throw new Error(validacion.errores.join(' '));
  const config = validacion.config;
  const fecha = process.env.PILOTO_OPERATIVO_RUN_DATE || fechaSantiago();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('PILOTO_OPERATIVO_RUN_DATE inválida.');
  const runId = process.env.PILOTO_OPERATIVO_RUN_ID ||
    randomUUID().replace(/-/g, '').slice(0, 24);
  const ids = crearIdsPiloto(runId, fecha);

  const destino56 = await get(config, 'verificarDestinoE2EFase56');
  const destino78 = await get(config, 'verificarDestinoFase78Test');
  assert.equal(validarDestinoPiloto(destino56, destino78), true,
    'El backend no demostró ser inequívocamente TEST.');
  const esquema = await get(config, 'obtenerEsquemaFase78Test');
  const requeridas = ['COMPRAS', 'DETALLE_COMPRAS', 'GASTOS_EXTRA', 'HISTORIAL_COSTOS',
    'CAJA_COMPRA', 'AUDITORIA_PRODUCTOS'];
  assert.equal(requeridas.every((nombre) =>
    esquema.hojas?.some((hoja) => hoja.nombre === nombre && hoja.existe)), true,
  'El esquema F7/F8 TEST está incompleto.');

  const productosIniciales = await get(config, 'listarProductosAdmin');
  const unidad = buscarProducto(productosIniciales.productos, ids.productoUnidad);
  const decimal = buscarProducto(productosIniciales.productos, ids.productoDecimal);
  assert.equal(esFixtureUnidadPiloto(unidad), true, 'El fixture unitario no cumple su contrato.');
  assert.equal(esFixtureDecimalPiloto(decimal), true, 'El fixture decimal no cumple su contrato.');
  const aperturasIniciales = await get(config, 'listarAperturas');
  validarAperturaDisponible(aperturasIniciales.aperturas, ids);

  console.log('ENTORNO: TEST');
  console.log('DESTINO: backend TEST verificado');
  console.log('PASS | preflight integral read-only');
  if (!escritura) {
    console.log('ESCRITURAS PILOTO: deshabilitadas');
    return;
  }

  console.log('ESCRITURAS PILOTO: habilitadas');
  console.log('EVIDENCIA | marcador: ' + ids.marcador);

  const pedidoExistente = await buscarPedidoPorMarcador(config, ids.marcador);
  const aperturaPedidos = pedidoExistente
    ? { apertura_id: pedidoExistente.apertura_id }
    : seleccionarAperturaPedidoPiloto(
      aperturasIniciales.aperturas,
      fechaHoraMinutoSantiago()
    );

  const evidenciaBackup = await get(config, 'obtenerEvidenciaPilotoTest', {
    marcador: ids.marcador,
  });
  if (!evidenciaBackup.backup_creado) {
    const backup = await postIdempotente(config, {
      action: 'crearBackupPilotoTest',
      idempotency_key: ids.backup,
      marcador: ids.marcador,
    });
    assert.equal(backup.entorno, 'TEST');
    assert.equal(backup.backup_creado, true);
  }
  console.log('PASS | backup TEST idempotente');

  const aperturaPilotoInicial = aperturasIniciales.aperturas.find((apertura) =>
    apertura.apertura_id === ids.aperturaId);
  const fixtureUnidadRestaurado = String(unidad.activo).toUpperCase() === 'NO' &&
    Number(unidad.precio_venta) === 0;
  if (fixtureUnidadRestaurado && aperturaPilotoInicial &&
      String(aperturaPilotoInicial.observaciones_internas).includes(ids.marcador)) {
    const reportesReanudacion = await get(config, 'obtenerReportesFase78');
    const restauracionRegistrada = reportesReanudacion.auditoria_productos.some((item) =>
      item.referencia_id === ids.productoRestaurar);
    if (restauracionRegistrada) {
      await finalizarPilotoRestaurado(
        config,
        ids,
        aperturaPilotoInicial,
        unidad,
        decimal,
        reportesReanudacion
      );
      return;
    }
  }

  await prepararProductoUnidad(config, ids);
  const aperturaInfo = await obtenerOCrearApertura(config, ids, fecha);
  const aperturaId = aperturaInfo.apertura.apertura_id;
  console.log('PASS | apertura PILOTO TEST: ' + aperturaId);

  const catalogo = await get(config, 'listarProductos');
  const unidadCatalogo = buscarProducto(catalogo.productos, ids.productoUnidad);
  const decimalCatalogo = buscarProducto(catalogo.productos, ids.productoDecimal);
  assert.equal(Number(unidadCatalogo.precio_venta), 1000);
  assert.equal(esFixtureDecimalPiloto(decimalCatalogo), true);
  console.log('PASS | catálogo, unidad, decimal y fallback de imagen');

  const pedido = await crearORecuperarPedido(
    config,
    ids,
    aperturaPedidos.apertura_id,
    pedidoExistente
  );
  const pedidoLeido = await get(config, 'obtenerPedido', { id_pedido: pedido.id_pedido });
  assert.equal(pedidoLeido.detalle.length, 1);
  if (pedidoLeido.pedido.estado_pedido !== 'cancelado') {
    await postCancelacion(config, { action: 'cancelarPedido', id_pedido: pedido.id_pedido });
  }
  const pedidoCancelado = await get(config, 'obtenerPedido', { id_pedido: pedido.id_pedido });
  assert.equal(pedidoCancelado.pedido.estado_pedido, 'cancelado');
  console.log('PASS | pedido anticipado, persistencia, cancelación y devolución');

  const ventaUnidad = await crearORecuperarVenta(config, ids, {
    apertura_id: aperturaId,
    fecha_hora: fecha + ' 12:00:00',
    vendedor: 'PILOTO TEST',
    forma_pago: 'efectivo',
    observaciones: ids.marcador + ' venta unidad PILOTO TEST',
    lineas: [{ producto_id: ids.productoUnidad, cantidad: 1 }],
    idempotency_key: ids.ventaUnidad,
  });
  const ventaDecimal = await crearORecuperarVenta(config, ids, {
    apertura_id: aperturaId,
    fecha_hora: fecha + ' 12:01:00',
    vendedor: 'PILOTO TEST',
    forma_pago: 'transferencia',
    observaciones: ids.marcador + ' venta decimal PILOTO TEST',
    lineas: [{ producto_id: ids.productoDecimal, cantidad: 0.1 }],
    idempotency_key: ids.ventaDecimal,
  });
  assert.equal(ventaUnidad.detalle.length, 1);
  assert.equal(ventaDecimal.detalle.length, 1);
  assert.equal(ventaUnidad.comanda.venta_id, ventaUnidad.venta.venta_id);
  assert.equal(ventaDecimal.comanda.venta_id, ventaDecimal.venta.venta_id);
  const comanda = await get(config, 'obtenerVentaPresencial', {
    venta_id: ventaUnidad.venta.venta_id,
  });
  assert.equal(comanda.comanda.venta_id, ventaUnidad.venta.venta_id);
  console.log('PASS | ventas unidad/decimal, pagos, stock, comanda y reimpresión');

  const aperturaAntesCaja = await get(config, 'obtenerApertura', { apertura_id: aperturaId });
  const ventasApertura = await get(config, 'listarVentasPorApertura', { apertura_id: aperturaId });
  assert.equal(ventasApertura.ventas.some((venta) =>
    venta.venta_id === ventaUnidad.venta.venta_id), true);
  assert.equal(ventasApertura.ventas.some((venta) =>
    venta.venta_id === ventaDecimal.venta.venta_id), true);
  const resumenPiloto = await get(config, 'obtenerResumenApertura', {
    apertura_id: aperturaId,
  });
  assert.ok(Number(resumenPiloto.cantidad_ventas_presenciales) >= 2);
  const resumenPedidos = await get(config, 'obtenerResumenApertura', {
    apertura_id: aperturaPedidos.apertura_id,
  });
  assert.ok(Number(resumenPedidos.cantidad_cancelados) >= 1);
  const aperturaDespuesCaja = await get(config, 'obtenerApertura', { apertura_id: aperturaId });
  assert.deepEqual(aperturaDespuesCaja, aperturaAntesCaja,
    'Consultar caja no debe modificar APERTURAS.');
  console.log('PASS | caja por apertura sin mutación');

  const gastosAntes = await get(config, 'listarGastosExtra');
  let gasto = buscarPorIdempotencia(gastosAntes.gastos, ids.gasto);
  if (!gasto) {
    gasto = await postIdempotente(config, {
      action: 'crearGastoExtra',
      idempotency_key: ids.gasto,
      categoria: 'materiales',
      descripcion: 'Material controlado PILOTO TEST',
      monto: 750,
      responsable: 'PILOTO TEST',
      observaciones: ids.marcador,
    });
  }
  assert.ok(gasto.gasto_id);
  console.log('PASS | gasto extra e historial');

  const comprasAntes = await get(config, 'listarCompras');
  let compraCabecera = buscarPorIdempotencia(comprasAntes.compras, ids.compra);
  let compra;
  if (compraCabecera) {
    compra = await get(config, 'obtenerCompra', { compra_id: compraCabecera.compra_id });
  } else {
    compra = await postIdempotente(config, {
      action: 'crearCompra',
      idempotency_key: ids.compra,
      fecha: fecha,
      proveedor: 'Proveedor controlado PILOTO TEST',
      responsable: 'PILOTO TEST',
      observaciones: ids.marcador,
      lineas: [
        { producto_id: ids.productoUnidad, cantidad: 1, costo_unitario: 1100 },
        { producto_id: ids.productoDecimal, cantidad: 0.1, costo_unitario: 1000 },
      ],
    });
  }
  assert.equal(compra.detalle.length, 2);
  console.log('PASS | compra, detalle, stock, costo e historial');

  const cajaAntes = await get(config, 'obtenerCajaCompra');
  let caja = cajaAntes.ultimo_registro?.idempotency_key === ids.caja
    ? cajaAntes.ultimo_registro
    : null;
  if (!caja) {
    caja = await postIdempotente(config, {
      action: 'registrarCajaCompra',
      idempotency_key: ids.caja,
      saldo_cuenta: 10000,
      efectivo_disponible: 5000,
      pendientes_referencia: Number(cajaAntes.pendientes_por_cobrar),
      presupuesto_confirmado: 4000,
      responsable: 'PILOTO TEST',
      observaciones: ids.marcador,
    });
  }
  assert.equal(Number(caja.pendientes_referencia), Number(cajaAntes.pendientes_por_cobrar));
  assert.equal(Number(caja.presupuesto_calculado),
    Math.max(0, Number(caja.saldo_cuenta) + Number(caja.efectivo_disponible) -
      Number(caja.gastos_extra)));
  console.log('PASS | caja disponible excluye pendientes por cobrar');

  const reportesAjustesIniciales = await get(config, 'obtenerReportesFase78');
  const ajusteBajaExistente = buscarMovimientoPorReferencia(
    reportesAjustesIniciales.movimientos_stock,
    ids.ajusteBaja
  );
  const ajusteRestauraExistente = buscarMovimientoPorReferencia(
    reportesAjustesIniciales.movimientos_stock,
    ids.ajusteRestaura
  );
  if (ajusteRestauraExistente) {
    validarAjustesCompensadosPiloto(
      ajusteBajaExistente,
      ajusteRestauraExistente,
      ids.productoUnidad
    );
  } else {
    await asegurarAjuste(config, ids, ids.ajusteBaja, -1, 'conteo_piloto_baja');
    const propuesta = await get(config, 'obtenerPropuestaAbastecimiento', { presupuesto: 5000 });
    validarPropuestaPiloto(propuesta, ids.productoUnidad);
    await asegurarAjuste(config, ids, ids.ajusteRestaura, 1, 'conteo_piloto_restaura');
    const reportesAjustesFinales = await get(config, 'obtenerReportesFase78');
    validarAjustesCompensadosPiloto(
      buscarMovimientoPorReferencia(reportesAjustesFinales.movimientos_stock, ids.ajusteBaja),
      buscarMovimientoPorReferencia(reportesAjustesFinales.movimientos_stock, ids.ajusteRestaura),
      ids.productoUnidad
    );
  }
  console.log('PASS | abastecimiento TEST respeta mínimo, prioridad y presupuesto');

  const reportes = await get(config, 'obtenerReportesFase78', { apertura_id: aperturaId });
  const reportesPedidos = aperturaPedidos.apertura_id === aperturaId
    ? reportes
    : await get(config, 'obtenerReportesFase78', {
      apertura_id: aperturaPedidos.apertura_id,
    });
  assert.ok(reportesPedidos.pedidos.some((item) => item.id_pedido === pedido.id_pedido));
  assert.ok(reportes.ventas.some((item) => item.venta_id === ventaUnidad.venta.venta_id));
  assert.ok(reportes.ventas.some((item) => item.venta_id === ventaDecimal.venta.venta_id));
  assert.ok(reportes.compras.some((item) => item.compra_id === compra.compra.compra_id));
  assert.ok(reportes.gastos.some((item) => item.gasto_id === gasto.gasto_id));
  assert.ok(reportes.movimientos_stock.some((item) =>
    item.referencia_id === compra.compra.compra_id));
  assert.ok(reportes.historial_costos.some((item) =>
    item.referencia_id === compra.compra.compra_id));
  assert.match(reportes.advertencia_abastecimiento, /TEST.*NO USAR/i);
  console.log('PASS | historiales y reportes integrales');

  await restaurarProductoUnidad(config, ids);
  await cerrarAperturaPiloto(config, ids, aperturaInfo);
  const productosFinales = await get(config, 'listarProductosAdmin');
  const unidadFinal = buscarProducto(productosFinales.productos, ids.productoUnidad);
  const decimalFinal = buscarProducto(productosFinales.productos, ids.productoDecimal);
  assert.equal(String(unidadFinal.activo).toUpperCase(), 'NO');
  assert.equal(Number(unidadFinal.precio_venta), 0);
  assertCasiIgual(Number(unidadFinal.stock_actual), 2, 'Stock unitario final');
  assertCasiIgual(Number(decimalFinal.stock_actual), 5.6, 'Stock decimal final');

  console.log('PASS | fixtures temporales restaurados');
  console.log('PASS | PILOTO OPERATIVO INTEGRAL TEST');
  console.log('EVIDENCIA | pedido: ' + pedido.id_pedido);
  console.log('EVIDENCIA | venta unidad: ' + ventaUnidad.venta.venta_id);
  console.log('EVIDENCIA | venta decimal: ' + ventaDecimal.venta.venta_id);
  console.log('EVIDENCIA | gasto: ' + gasto.gasto_id);
  console.log('EVIDENCIA | compra: ' + compra.compra.compra_id);
  console.log('EVIDENCIA | caja: ' + caja.caja_compra_id);
}

function validarAperturaDisponible(aperturas, ids) {
  const existente = aperturas.find((apertura) => apertura.apertura_id === ids.aperturaId);
  if (!existente) return;
  if (String(existente.observaciones_internas).includes(ids.marcador)) return;
  const compatible = existente.estado_apertura === 'activa' &&
    existente.modo_presencial_estado === 'activo' &&
    ['activo', 'reabierto_manual'].includes(existente.pedidos_anticipados_estado);
  assert.equal(compatible, true,
    'Ya existe una apertura de hoy no compatible con el piloto; no se modificará.');
}

async function prepararProductoUnidad(config, ids) {
  const productos = await get(config, 'listarProductosAdmin');
  const actual = buscarProducto(productos.productos, ids.productoUnidad);
  if (String(actual.activo).toUpperCase() === 'SI' && Number(actual.precio_venta) === 1000) return;
  await postIdempotente(config, {
    action: 'actualizarProductoAdmin',
    idempotency_key: ids.productoPreparar,
    producto_id: ids.productoUnidad,
    responsable: 'PILOTO TEST',
    cambios: { activo: 'SI', precio_venta: 1000 },
  });
}

async function restaurarProductoUnidad(config, ids) {
  const productos = await get(config, 'listarProductosAdmin');
  const actual = buscarProducto(productos.productos, ids.productoUnidad);
  if (String(actual.activo).toUpperCase() === 'NO' && Number(actual.precio_venta) === 0) return;
  await postIdempotente(config, {
    action: 'actualizarProductoAdmin',
    idempotency_key: ids.productoRestaurar,
    producto_id: ids.productoUnidad,
    responsable: 'PILOTO TEST',
    cambios: { activo: 'NO', precio_venta: 0 },
  });
}

async function obtenerOCrearApertura(config, ids, fecha) {
  const aperturas = await get(config, 'listarAperturas');
  const existente = aperturas.aperturas.find((apertura) =>
    apertura.apertura_id === ids.aperturaId);
  if (existente) {
    const propia = String(existente.observaciones_internas).includes(ids.marcador);
    validarAperturaDisponible(aperturas.aperturas, ids);
    return { apertura: existente, propia };
  }
  const apertura = await postIdempotente(config, {
    action: 'crearApertura',
    idempotency_key: ids.aperturaCrear,
    actor: 'piloto_test',
    apertura: {
      apertura_id: ids.aperturaId,
      fecha_apertura: fecha,
      hora_inicio: '00:00',
      hora_termino: '23:59',
      lugar: 'PILOTO TEST',
      cierre_pedidos_anticipados: fechaAnterior(fecha) + 'T23:59',
      estado_apertura: 'activa',
      pedidos_anticipados_estado: 'reabierto_manual',
      modo_presencial_estado: 'activo',
      mensaje_publico: 'Operación controlada PILOTO TEST',
      observaciones_internas: ids.marcador,
    },
  });
  return { apertura, propia: true };
}

async function cerrarAperturaPiloto(config, ids, aperturaInfo) {
  if (!aperturaInfo.propia) return;
  const actual = await get(config, 'obtenerApertura', { apertura_id: ids.aperturaId });
  if (actual.estado_apertura === 'cerrada' &&
      actual.pedidos_anticipados_estado === 'cerrado' &&
      actual.modo_presencial_estado === 'cerrado') return;
  await postIdempotente(config, {
    action: 'actualizarApertura',
    apertura_id: ids.aperturaId,
    actualizado_en_esperado: actual.actualizado_en,
    idempotency_key: ids.aperturaCerrar,
    actor: 'piloto_test',
    apertura: {
      apertura_id: actual.apertura_id,
      fecha_apertura: normalizarFechaAperturaPiloto(actual.fecha_apertura),
      hora_inicio: normalizarHoraAperturaPiloto(actual.hora_inicio),
      hora_termino: normalizarHoraAperturaPiloto(actual.hora_termino),
      lugar: actual.lugar,
      cierre_pedidos_anticipados: normalizarCierreAperturaPiloto(
        actual.cierre_pedidos_anticipados
      ),
      estado_apertura: 'cerrada',
      pedidos_anticipados_estado: 'cerrado',
      modo_presencial_estado: 'cerrado',
      mensaje_publico: actual.mensaje_publico,
      observaciones_internas: actual.observaciones_internas,
    },
  });
}

async function finalizarPilotoRestaurado(
  config,
  ids,
  apertura,
  unidad,
  decimal,
  reportes
) {
  const pedido = await buscarPedidoPorMarcador(config, ids.marcador);
  assert.ok(pedido && pedido.estado_pedido === 'cancelado');
  const ventas = await get(config, 'listarVentasPorApertura', {
    apertura_id: ids.aperturaId,
  });
  const ventaUnidad = ventas.ventas.find((item) =>
    String(item.observaciones) === ids.marcador + ' venta unidad PILOTO TEST');
  const ventaDecimal = ventas.ventas.find((item) =>
    String(item.observaciones) === ids.marcador + ' venta decimal PILOTO TEST');
  assert.ok(ventaUnidad && ventaDecimal);
  const gasto = buscarPorIdempotencia(reportes.gastos, ids.gasto);
  const compra = buscarPorIdempotencia(reportes.compras, ids.compra);
  assert.ok(gasto && compra);
  assert.ok(reportes.movimientos_stock.some((item) =>
    item.referencia_id === compra.compra_id));
  assert.ok(reportes.historial_costos.some((item) =>
    item.referencia_id === compra.compra_id));
  validarAjustesCompensadosPiloto(
    buscarMovimientoPorReferencia(reportes.movimientos_stock, ids.ajusteBaja),
    buscarMovimientoPorReferencia(reportes.movimientos_stock, ids.ajusteRestaura),
    ids.productoUnidad
  );
  const cajaRespuesta = await get(config, 'obtenerCajaCompra');
  const caja = cajaRespuesta.ultimo_registro;
  assert.equal(caja?.idempotency_key, ids.caja);

  await cerrarAperturaPiloto(config, ids, { apertura, propia: true });
  const aperturaFinal = await get(config, 'obtenerApertura', {
    apertura_id: ids.aperturaId,
  });
  assert.equal(aperturaFinal.estado_apertura, 'cerrada');
  assert.equal(aperturaFinal.pedidos_anticipados_estado, 'cerrado');
  assert.equal(aperturaFinal.modo_presencial_estado, 'cerrado');
  assert.equal(String(unidad.activo).toUpperCase(), 'NO');
  assert.equal(Number(unidad.precio_venta), 0);
  assertCasiIgual(Number(unidad.stock_actual), 2, 'Stock unitario final');
  assertCasiIgual(Number(decimal.stock_actual), 5.6, 'Stock decimal final');

  console.log('PASS | historiales y reportes integrales recuperados');
  console.log('PASS | fixtures temporales restaurados');
  console.log('PASS | PILOTO OPERATIVO INTEGRAL TEST');
  console.log('EVIDENCIA | pedido: ' + pedido.id_pedido);
  console.log('EVIDENCIA | venta unidad: ' + ventaUnidad.venta_id);
  console.log('EVIDENCIA | venta decimal: ' + ventaDecimal.venta_id);
  console.log('EVIDENCIA | gasto: ' + gasto.gasto_id);
  console.log('EVIDENCIA | compra: ' + compra.compra_id);
  console.log('EVIDENCIA | caja: ' + caja.caja_compra_id);
}

async function crearORecuperarPedido(config, ids, aperturaId, evidenciaExistente = null) {
  const existente = evidenciaExistente || await buscarPedidoPorMarcador(config, ids.marcador);
  if (existente) return existente;
  const payload = {
    action: 'crearPedido',
    nombre_cliente: 'PILOTO TEST',
    telefono: '+56900000000',
    forma_pago: 'efectivo_al_retirar',
    observaciones: ids.marcador + ' pedido anticipado',
    carrito: [{ id_producto: ids.productoUnidad, cantidad: 1 }],
    apertura_id: aperturaId,
    origen_pedido: 'online_anticipado',
  };
  try {
    return await postUnaVez(config, payload);
  } catch (error) {
    if (!esFalloTransitorioIdempotente(error)) throw error;
    const recuperado = await buscarPedidoPorMarcador(config, ids.marcador);
    if (recuperado) return recuperado;
    throw error;
  }
}

async function buscarPedidoPorMarcador(config, marcador) {
  const respuesta = await get(config, 'listarPedidos');
  const coincidencias = respuesta.pedidos.filter((pedido) =>
    String(pedido.observaciones).includes(marcador));
  assert.ok(coincidencias.length <= 1, 'Existe más de un pedido para el marcador del piloto.');
  return coincidencias[0] || null;
}

async function crearORecuperarVenta(config, ids, payload) {
  const ventas = await get(config, 'listarVentasPorApertura', {
    apertura_id: payload.apertura_id,
  });
  const coincidencias = ventas.ventas.filter((venta) =>
    String(venta.observaciones).includes(ids.marcador) &&
    String(venta.observaciones) === payload.observaciones);
  assert.ok(coincidencias.length <= 1, 'Existe más de una venta para el mismo paso del piloto.');
  if (coincidencias[0]) {
    return get(config, 'obtenerVentaPresencial', { venta_id: coincidencias[0].venta_id });
  }
  return postIdempotente(config, { action: 'crearVentaPresencial', ...payload });
}

async function asegurarAjuste(config, ids, idempotencyKey, delta, motivo) {
  const reportes = await get(config, 'obtenerReportesFase78');
  const existente = reportes.movimientos_stock.find((movimiento) =>
    movimiento.referencia_id === idempotencyKey);
  if (existente) return existente;
  return postIdempotente(config, {
    action: 'ajustarStockAdmin',
    idempotency_key: idempotencyKey,
    producto_id: ids.productoUnidad,
    delta,
    motivo: 'recuento_fisico',
    responsable: 'PILOTO TEST',
    observaciones: ids.marcador + ' ' + motivo,
  });
}

function buscarPorIdempotencia(items, key) {
  return items.find((item) => item.idempotency_key === key) || null;
}

function buscarMovimientoPorReferencia(movimientos, referenciaId) {
  return (Array.isArray(movimientos) ? movimientos : [])
    .find((item) => item.referencia_id === referenciaId) || null;
}

function buscarProducto(productos, productoId) {
  const producto = productos.find((item) => item.id_producto === productoId);
  assert.ok(producto, 'No existe el fixture TEST requerido: ' + productoId);
  return producto;
}

async function get(config, action, params = {}) {
  let ultimo;
  for (let intento = 1; intento <= MAX_INTENTOS_GET_PILOTO; intento++) {
    try {
      return await solicitar(config, 'GET', { action, ...params });
    } catch (error) {
      ultimo = error;
      const transitorio = esFalloTransitorioLectura(error) ||
        esGetSinAccionTransitorioF78(error);
      if (!transitorio || intento === MAX_INTENTOS_GET_PILOTO) throw error;
      await pausa(2000);
    }
  }
  throw ultimo;
}

async function postIdempotente(config, body) {
  assert.equal(typeof body.idempotency_key, 'string',
    'El POST idempotente requiere idempotency_key.');
  let ultimo;
  for (let intento = 1; intento <= 2; intento++) {
    try {
      return await solicitar(config, 'POST', body);
    } catch (error) {
      ultimo = error;
      if (!esFalloTransitorioIdempotente(error) || intento === 2) throw error;
      await pausa(1000);
    }
  }
  throw ultimo;
}

async function postUnaVez(config, body) {
  return solicitar(config, 'POST', body);
}

async function postCancelacion(config, body) {
  try {
    return await postUnaVez(config, body);
  } catch (error) {
    if (!esFalloTransitorioIdempotente(error)) throw error;
    const evidencia = await get(config, 'obtenerPedido', {
      id_pedido: body.id_pedido,
    });
    if (evidencia.pedido?.estado_pedido === 'cancelado') return evidencia;
    throw error;
  }
}

async function solicitar(config, metodo, payload) {
  const controlador = new AbortController();
  const timeout = setTimeout(() => controlador.abort(), 60000);
  try {
    let respuesta;
    if (metodo === 'GET') {
      const url = new URL(config.url);
      url.searchParams.set('_request_id', randomUUID());
      Object.entries({ ...payload, token: config.token }).forEach(([clave, valor]) =>
        url.searchParams.set(clave, String(valor)));
      respuesta = await fetch(url, {
        method: 'GET', redirect: 'follow', cache: 'no-store', signal: controlador.signal,
      });
    } else {
      respuesta = await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, token: config.token }),
        redirect: 'follow',
        signal: controlador.signal,
      });
    }
    const texto = await respuesta.text();
    let json;
    try {
      json = JSON.parse(texto);
    } catch {
      throw crearErrorRespuestaNoJsonE2E({
        operacion: metodo + ' ' + payload.action,
        httpStatus: respuesta.status,
        contentType: respuesta.headers.get('content-type'),
        redirected: respuesta.redirected,
        responseUrl: respuesta.url,
        cuerpo: texto,
      });
    }
    if (!json.ok) {
      const postConvertidoAGet = metodo === 'POST' && Number(json.codigo) === 400 &&
        /^Acci[oó]n GET no reconocida:\s*""\.?$/i.test(String(json.error || '').trim());
      if (postConvertidoAGet) {
        throw crearErrorRedireccionPostAGetE2E({
          operacion: metodo + ' ' + payload.action,
          httpStatus: respuesta.status,
          redirected: respuesta.redirected,
          responseUrl: respuesta.url,
        });
      }
      const error = new Error(json.error || 'Error lógico del backend TEST.');
      error.tipoE2E = 'backend_logico';
      error.codigo = Number(json.codigo || 500);
      error.httpStatus = respuesta.status;
      throw error;
    }
    return json.data;
  } catch (error) {
    throw normalizarErrorTransportePiloto(error);
  } finally {
    clearTimeout(timeout);
  }
}

function fechaSantiago() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

function fechaHoraMinutoSantiago() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const valor = (tipo) => partes.find((parte) => parte.type === tipo)?.value;
  return valor('year') + '-' + valor('month') + '-' + valor('day') + 'T' +
    valor('hour') + ':' + valor('minute');
}

function fechaAnterior(fecha) {
  const date = new Date(fecha + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function assertCasiIgual(actual, esperado, etiqueta) {
  assert.ok(Math.abs(actual - esperado) < 1e-9,
    etiqueta + ': actual=' + actual + '; esperado=' + esperado);
}

function pausa(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
