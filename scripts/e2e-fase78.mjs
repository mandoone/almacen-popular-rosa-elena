import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  crearErrorRespuestaNoJsonE2E,
  esFalloTransitorioIdempotente,
  esFalloTransitorioLectura,
} from './lib/fase56-e2e-guardrails.mjs';
import {
  crearIdsF78,
  errorSeguroF78,
  esGetSinAccionTransitorioF78,
  PRODUCTO_DECIMAL_F78,
  validarConfiguracionF78,
  validarDestinoF78,
} from './lib/fase78-e2e-guardrails.mjs';

const modo = process.argv.includes('--migrate-test') ? 'migracion' : process.argv.includes('--write-test') ? 'escritura' : 'preflight';
const TIMEOUT_E2E_MS = 60000;
const MAX_INTENTOS_GET_F78 = 3;
const fechaReanudacion = process.env.E2E_FASE78_RUN_DATE;
if (fechaReanudacion && !/^\d{4}-\d{2}-\d{2}$/.test(fechaReanudacion)) {
  throw new Error('E2E_FASE78_RUN_DATE no tiene formato yyyy-MM-dd.');
}
const fechaTest = fechaReanudacion || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
const validacion = validarConfiguracionF78(process.env, { escritura: modo === 'escritura', migracion: modo === 'migracion' });
if (!validacion.ok) {
  console.error(`FAIL | guardarraíles: ${validacion.errores.join(' ')}`);
  process.exitCode = 1;
} else {
  await ejecutar(validacion.config).catch((error) => {
    console.error(`FAIL | ${errorSeguroF78(error, process.env)}`);
    process.exitCode = 1;
  });
}

async function ejecutar(config) {
  const destino = await get(config, 'verificarDestinoFase78Test');
  assert.equal(validarDestinoF78(destino), true, 'El backend no demostró ser TEST F78.');
  console.log('ENTORNO: TEST');
  console.log('DESTINO: backend TEST verificado');
  const esquema = await get(config, 'obtenerEsquemaFase78Test');
  if (modo === 'migracion') {
    console.log('MIGRACIÓN ADITIVA: habilitada');
    const resultado = await postIdempotente(config, { action: 'prepararEsquemaFase78Test' });
    assert.equal(resultado.entorno, 'TEST');
    console.log(`PASS | esquema F78 preparado; backup=${resultado.backup_creado ? 'SI' : 'NO'}`);
    return;
  }
  const faltantes = ['COMPRAS','DETALLE_COMPRAS','GASTOS_EXTRA','HISTORIAL_COSTOS','CAJA_COMPRA','AUDITORIA_PRODUCTOS']
    .filter((nombre) => !esquema.hojas?.some((hoja) => hoja.nombre === nombre && hoja.existe));
  if (faltantes.length) throw new Error(`Esquema F78 incompleto: faltan ${faltantes.join(', ')}.`);
  console.log('PASS | preflight F78 read-only');
  if (modo === 'preflight') return;
  console.log('ESCRITURAS E2E: habilitadas');
  await ejecutarSuite(config);
}

async function ejecutarSuite(config) {
  const idReanudacion = process.env.E2E_FASE78_RUN_ID;
  if (idReanudacion && !/^[A-Fa-f0-9]{24}$/.test(idReanudacion)) {
    throw new Error('E2E_FASE78_RUN_ID no tiene el formato TEST esperado.');
  }
  const reanudando = Boolean(idReanudacion);
  const ids = crearIdsF78(idReanudacion || randomUUID());
  console.log(`EVIDENCIA | marcador: ${ids.marcador}`);
  const productosAntes = await get(config, 'listarProductosAdmin');
  const decimalAntes = buscarProducto(productosAntes.productos, PRODUCTO_DECIMAL_F78);

  let nuevo = productosAntes.productos.find((item) => item.id_producto === ids.producto);
  if (nuevo) {
    console.log(`RECUPERADO | producto TEST existente: ${ids.producto}`);
  } else {
    nuevo = await postIdempotente(config, {
      action: 'crearProductoAdmin', idempotency_key: ids.productoCrear, producto_id: ids.producto,
      responsable: 'E2E TEST F78', producto: {
        nombre: `Fixture ${ids.marcador}`, categoria: 'Alimentos', unidad_medida: 'unidad',
        permite_decimal: 'NO', paso_venta: 1, precio_venta: 0, stock_minimo: 2,
        prioridad: 'media', activo: 'SI', imagen_url: '',
      },
    });
    assert.equal(Number(nuevo.stock_actual), 0);
  }
  if (!reanudando) {
    const propuestaSinCosto = await get(config, 'obtenerPropuestaAbastecimiento', { presupuesto: 5000 });
    assert.equal(propuestaSinCosto.lineas.some((linea) => linea.producto_id === ids.producto), false);
    assert.equal(propuestaSinCosto.omitidos.some((item) => item.producto_id === ids.producto && /costo/i.test(item.motivo)), true);
    assert.match(propuestaSinCosto.advertencia, /TEST.*NO USAR/i);
    console.log('PASS | abastecimiento respeta costo pendiente y advertencia TEST');
  } else {
    console.log('SKIP | abastecimiento inicial ya validado antes de reanudar');
  }

  const compraPayload = {
    action: 'crearCompra', idempotency_key: ids.compra,
    fecha: fechaTest,
    proveedor: `Proveedor ${ids.marcador}`, responsable: 'E2E TEST F78',
    observaciones: ids.marcador,
    lineas: [{ producto_id: ids.producto, cantidad: 1, costo_unitario: 1000 }],
  };
  const comprasPrevias = await get(config, 'listarCompras');
  const compraPrevia = comprasPrevias.compras.find((item) => item.idempotency_key === ids.compra);
  let compra;
  if (compraPrevia) {
    compra = await get(config, 'obtenerCompra', { compra_id: compraPrevia.compra_id });
    console.log(`RECUPERADO | compra unidad existente: ${compra.compra.compra_id}`);
  } else {
    compra = await postIdempotente(config, compraPayload);
    const replay = await postIdempotente(config, compraPayload);
    assert.equal(replay.compra.compra_id, compra.compra.compra_id);
    await esperarConflicto(config, { ...compraPayload, proveedor: `Otro ${ids.marcador}` });
  }
  assert.equal(compra.detalle.length, 1);
  const evidenciaCompra = await get(config, 'obtenerCompra', { compra_id: compra.compra.compra_id });
  assert.equal(evidenciaCompra.detalle.length, 1);
  assert.equal(Number(evidenciaCompra.detalle[0].stock_nuevo) - Number(evidenciaCompra.detalle[0].stock_anterior), 1);
  console.log(`PASS | compra unidad + idempotencia: ${compra.compra.compra_id}`);

  const compraDecimalPayload = {
    action: 'crearCompra', idempotency_key: ids.compraDecimal,
    fecha: fechaTest,
    proveedor: `Proveedor ${ids.marcador}`, responsable: 'E2E TEST F78', observaciones: ids.marcador,
    lineas: [{ producto_id: PRODUCTO_DECIMAL_F78, cantidad: 0.1, costo_unitario: 1000 }],
  };
  const decimalPrevia = comprasPrevias.compras.find((item) => item.idempotency_key === ids.compraDecimal);
  const compraDecimal = decimalPrevia
    ? await get(config, 'obtenerCompra', { compra_id: decimalPrevia.compra_id })
    : await postIdempotente(config, compraDecimalPayload);
  if (decimalPrevia) console.log(`RECUPERADO | compra decimal existente: ${compraDecimal.compra.compra_id}`);
  assertCasiIgual(
    Number(compraDecimal.detalle[0].stock_nuevo) - Number(compraDecimal.detalle[0].stock_anterior),
    0.1,
    'La compra decimal debe sumar exactamente un paso de negocio.'
  );
  console.log(`PASS | compra decimal: ${compraDecimal.compra.compra_id}`);

  const antesInvalida = await get(config, 'listarProductosAdmin');
  assert.equal(comprasPrevias.compras.some((item) => item.idempotency_key === ids.compraInvalida), false);
  await esperarCodigo(config, {
    action: 'crearCompra', idempotency_key: ids.compraInvalida,
    fecha: fechaTest,
    proveedor: `Proveedor ${ids.marcador}`, responsable: 'E2E TEST F78', observaciones: ids.marcador,
    lineas: [{ producto_id: ids.producto, cantidad: 0.5, costo_unitario: 1000 }],
  }, 400);
  const despuesInvalida = await get(config, 'listarProductosAdmin');
  assert.equal(Number(buscarProducto(antesInvalida.productos, ids.producto).stock_actual), Number(buscarProducto(despuesInvalida.productos, ids.producto).stock_actual));
  console.log('PASS | cantidad decimal rechazada en producto entero sin efectos');

  const gastosPrevios = await get(config, 'listarGastosExtra');
  const gastoPrevio = gastosPrevios.gastos.find((item) => item.idempotency_key === ids.gasto);
  const gasto = gastoPrevio || await postIdempotente(config, {
    action: 'crearGastoExtra', idempotency_key: ids.gasto, categoria: 'transporte',
    descripcion: `Traslado ${ids.marcador}`, monto: 1000, responsable: 'E2E TEST F78', observaciones: ids.marcador,
  });
  if (gastoPrevio) console.log(`RECUPERADO | gasto existente: ${gasto.gasto_id}`);
  assert.ok(gasto.gasto_id);
  const gastos = await get(config, 'listarGastosExtra');
  assert.equal(gastos.gastos.filter((item) => item.gasto_id === gasto.gasto_id).length, 1);
  console.log(`PASS | gasto extra: ${gasto.gasto_id}`);

  const cajaAntes = await get(config, 'obtenerCajaCompra');
  const cajaPrevia = cajaAntes.ultimo_registro?.idempotency_key === ids.caja ? cajaAntes.ultimo_registro : null;
  const caja = cajaPrevia || await postIdempotente(config, {
    action: 'registrarCajaCompra', idempotency_key: ids.caja,
    saldo_cuenta: 10000, efectivo_disponible: 5000,
    pendientes_referencia: Number(cajaAntes.pendientes_por_cobrar),
    presupuesto_confirmado: 14000, responsable: 'E2E TEST F78', observaciones: ids.marcador,
  });
  if (cajaPrevia) console.log(`RECUPERADO | caja existente: ${caja.caja_compra_id}`);
  assert.equal(Number(caja.pendientes_referencia), Number(cajaAntes.pendientes_por_cobrar));
  console.log(`PASS | caja para compra: ${caja.caja_compra_id}`);

  const productoActual = buscarProducto((await get(config, 'listarProductosAdmin')).productos, ids.producto);
  const yaActualizado = productoActual.nombre === `Fixture actualizado ${ids.marcador}` &&
    productoActual.prioridad === 'alta' && String(productoActual.activo).toUpperCase() === 'NO';
  const actualizado = yaActualizado ? productoActual : await postIdempotente(config, {
      action: 'actualizarProductoAdmin', idempotency_key: ids.productoEditar,
      producto_id: ids.producto, responsable: 'E2E TEST F78',
      cambios: { nombre: `Fixture actualizado ${ids.marcador}`, prioridad: 'alta', activo: 'NO' },
    });
  if (yaActualizado) console.log(`RECUPERADO | edición de producto existente: ${ids.producto}`);
  assert.equal(actualizado.prioridad, 'alta');
  const ajustePayload = {
    action: 'ajustarStockAdmin', idempotency_key: ids.ajuste, producto_id: ids.producto,
    delta: 1, motivo: 'recuento_fisico', responsable: 'E2E TEST F78', observaciones: ids.marcador,
  };
  const reportesAntesAjuste = await get(config, 'obtenerReportesFase78');
  const movimientoAjuste = reportesAntesAjuste.movimientos_stock.find((item) => item.referencia_id === ids.ajuste);
  const ajuste = movimientoAjuste ? {
    producto_id: movimientoAjuste.producto_id,
    stock_anterior: Number(movimientoAjuste.stock_anterior),
    stock_nuevo: Number(movimientoAjuste.stock_resultante),
    delta: Number(movimientoAjuste.cantidad),
  } : await postIdempotente(config, ajustePayload);
  if (movimientoAjuste) {
    console.log(`RECUPERADO | ajuste de stock existente: ${ids.ajuste}`);
  } else {
    const ajusteReplay = await postIdempotente(config, ajustePayload);
    assert.deepEqual(ajusteReplay, ajuste);
  }
  assert.equal(ajuste.stock_nuevo, 2);
  console.log(`PASS | producto admin y ajuste auditable: ${ids.producto}`);

  const reportes = await get(config, 'obtenerReportesFase78');
  assert.ok(reportes.compras.some((item) => item.compra_id === compra.compra.compra_id));
  assert.ok(reportes.gastos.some((item) => item.gasto_id === gasto.gasto_id));
  assert.equal(reportes.movimientos_stock.filter((item) => item.referencia_id === compra.compra.compra_id).length, 1);
  assert.equal(reportes.historial_costos.filter((item) => item.referencia_id === compra.compra.compra_id).length, 1);
  assert.ok(reportes.auditoria_productos.some((item) => item.producto_id === ids.producto));
  assert.ok(Array.isArray(reportes.ventas));
  assert.ok(Array.isArray(reportes.pedidos));
  assert.match(reportes.advertencia_abastecimiento, /TEST.*NO USAR/i);
  console.log('PASS | historiales y reportes Fase 8');

  const productosDespues = await get(config, 'listarProductosAdmin');
  assert.equal(Number(buscarProducto(productosDespues.productos, ids.producto).stock_actual), 2);
  assertCasiIgual(
    Number(buscarProducto(productosDespues.productos, PRODUCTO_DECIMAL_F78).stock_actual),
    Number(decimalAntes.stock_actual) + (decimalPrevia ? 0 : 0.1),
    'El stock decimal final no coincide con el snapshot inicial.'
  );
  console.log('PASS | Fase 7 + Fase 8 E2E TEST completa');
}

function buscarProducto(productos, id) {
  const producto = productos.find((item) => item.id_producto === id);
  assert.ok(producto, `No existe fixture TEST ${id}.`);
  return producto;
}

function assertCasiIgual(actual, esperado, mensaje) {
  assert.ok(Math.abs(actual - esperado) < 1e-9, `${mensaje} Actual=${actual}; esperado=${esperado}.`);
}

async function get(config, action, params = {}) {
  let ultimo;
  for (let intento = 1; intento <= MAX_INTENTOS_GET_F78; intento++) {
    try { return await solicitar(config, 'GET', { action, ...params }); }
    catch (error) {
      ultimo = error;
      const transitorio = esFalloTransitorioLectura(error) || esGetSinAccionTransitorioF78(error);
      if (intento === MAX_INTENTOS_GET_F78 || !transitorio) throw error;
      await pausa(1000);
    }
  }
  throw ultimo;
}

async function postIdempotente(config, body) {
  let ultimo;
  const reintentable = typeof body.idempotency_key === 'string';
  for (let intento = 1; intento <= (reintentable ? 2 : 1); intento++) {
    try { return await solicitar(config, 'POST', body); }
    catch (error) { ultimo = error; if (intento === 2 || !esFalloTransitorioIdempotente(error)) throw error; await pausa(1000); }
  }
  throw ultimo;
}

async function solicitar(config, metodo, payload) {
  const controlador = new AbortController();
  const timeout = setTimeout(() => controlador.abort(), TIMEOUT_E2E_MS);
  try {
    let respuesta;
    if (metodo === 'GET') {
      const url = new URL(config.url); url.searchParams.set('_request_id', randomUUID());
      Object.entries({ ...payload, token: config.token }).forEach(([k, v]) => url.searchParams.set(k, String(v)));
      respuesta = await fetch(url, { method: 'GET', redirect: 'follow', cache: 'no-store', signal: controlador.signal });
    } else {
      respuesta = await fetch(config.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, token: config.token }), redirect: 'follow', signal: controlador.signal });
    }
    const texto = await respuesta.text();
    let json;
    try { json = JSON.parse(texto); }
    catch { throw crearErrorRespuestaNoJsonE2E({ operacion: `${metodo} ${payload.action}`, httpStatus: respuesta.status, contentType: respuesta.headers.get('content-type'), redirected: respuesta.redirected, responseUrl: respuesta.url, cuerpo: texto }); }
    if (!json.ok) {
      const error = new Error(json.error || 'Error lógico del backend TEST.');
      error.tipoE2E = 'backend_logico'; error.codigo = Number(json.codigo || 500); error.httpStatus = respuesta.status;
      throw error;
    }
    return json.data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') { error.tipoE2E = 'timeout'; }
    else if (error instanceof TypeError) { error.tipoE2E = 'red'; }
    throw error;
  } finally { clearTimeout(timeout); }
}

async function esperarCodigo(config, body, codigo) {
  try { await solicitar(config, 'POST', body); }
  catch (error) { assert.equal(error.codigo, codigo); return; }
  assert.fail(`Se esperaba código lógico ${codigo}.`);
}

async function esperarConflicto(config, body) { return esperarCodigo(config, body, 409); }
function pausa(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
