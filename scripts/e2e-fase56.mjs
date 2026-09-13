import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  CAMPOS_APERTURA_E2E,
  crearErrorRedireccionPostAGetE2E,
  crearErrorRespuestaNoJsonE2E,
  crearIdentificadoresE2E,
  esFalloTransitorioIdempotente,
  esFalloTransitorioLectura,
  mensajeSeguroE2E,
  normalizarCampoAperturaE2E,
  prepararRestauracionAperturaTest,
  validarConfiguracionE2E,
  validarConfirmacionBackendTest,
} from './lib/fase56-e2e-guardrails.mjs';

const modo = process.argv[2];
const ESPERA_RETRY_TRANSITORIO_MS = 5000;
const modos = {
  '--preflight': { escritura: false, soloIdempotencia: false },
  '--preflight-idempotencia': { escritura: false, soloIdempotencia: true },
  '--write-test': { escritura: true, soloIdempotencia: false },
  '--idempotencia': { escritura: true, soloIdempotencia: true },
};
const opcionesModo = modos[modo];
const estadoEjecucion = {
  modo,
  pasoActual: 'guardarraíles locales',
  pasos: [],
  completados: new Set(),
  marcador: null,
  ventas: [],
  pedidos: [],
  aperturaRestaurada: false,
};
const valoresSensibles = [
  process.env.GOOGLE_SCRIPT_PEDIDOS_URL_TEST,
  process.env.GOOGLE_SCRIPT_ADMIN_TOKEN_TEST,
  process.env.GOOGLE_SCRIPT_PEDIDOS_URL,
  process.env.GOOGLE_SCRIPT_ADMIN_TOKEN,
].filter((valor) => typeof valor === 'string' && valor.length >= 4);
if (!opcionesModo) {
  console.error('Uso inválido. Ejecuta el script npm de preflight o de E2E TEST.');
  process.exitCode = 2;
} else {
  estadoEjecucion.pasos = opcionesModo.escritura
    ? (opcionesModo.soloIdempotencia
        ? ['preflight TEST', 'idempotencia']
        : [
            'preflight TEST',
            'venta por unidad',
            'venta decimal',
            'rechazo decimal en entero',
            'rechazo por stock',
            'idempotencia',
            'pedidos anticipados y cancelación',
            'caja por apertura',
            'restauración de apertura',
          ])
    : ['preflight TEST'];
  await ejecutar(opcionesModo).catch((error) => {
    console.error(`FAIL | ${estadoEjecucion.pasoActual}: ${mensajeSeguroE2E(error, valoresSensibles)}`);
    for (const paso of estadoEjecucion.pasos) {
      if (!estadoEjecucion.completados.has(paso) && paso !== estadoEjecucion.pasoActual) {
        console.error(`SKIP | ${paso}`);
      }
    }
    imprimirEvidenciaFinal();
    process.exitCode = 1;
  });
}

async function ejecutar({ escritura, soloIdempotencia }) {
  const resultadoConfig = validarConfiguracionE2E(process.env, {
    escritura,
    soloIdempotencia,
  });
  if (!resultadoConfig.ok) throw new Error(resultadoConfig.errores.join(' '));
  const config = resultadoConfig.config;
  const cliente = crearClienteAppsScript(config, { escrituraAutorizada: escritura });

  // Todo este bloque es de solo lectura y debe completarse antes de habilitar
  // cualquier POST. No se imprime configuración ni respuesta cruda.
  estadoEjecucion.pasoActual = 'preflight TEST';
  const verificacion = await cliente.get('verificarDestinoE2EFase56');
  cliente.confirmarBackendTest(verificacion);

  const productoIds = soloIdempotencia
    ? [config.productoDecimalId]
    : [config.productoUnidadId, config.productoDecimalId];
  const estadoInicial = await obtenerEstado(cliente, config.aperturaId, productoIds);
  const aperturaInicialCompleta = await obtenerAperturaCompleta(cliente, config.aperturaId);
  validarFixturesTest(estadoInicial, config, { soloIdempotencia });
  const resumenInicial = soloIdempotencia
    ? null
    : await cliente.get('obtenerResumenApertura', { apertura_id: config.aperturaId });
  if (!soloIdempotencia) {
    const estadoTrasResumenInicial = await obtenerEstado(
      cliente,
      config.aperturaId,
      productoIds
    );
    const aperturaTrasResumenInicial = await obtenerAperturaCompleta(cliente, config.aperturaId);
    assert.deepEqual(
      estadoTrasResumenInicial,
      estadoInicial,
      'La consulta inicial de caja no debe modificar datos persistentes.'
    );
    assert.deepEqual(
      aperturaTrasResumenInicial,
      aperturaInicialCompleta,
      'La consulta inicial de caja no debe modificar ningún campo de APERTURAS.'
    );
  }
  completarPaso('preflight TEST', { silencioso: escritura });

  if (!escritura) {
    console.log('ENTORNO: TEST');
    console.log('DESTINO: backend TEST verificado');
    console.log('ESCRITURAS E2E: deshabilitadas (preflight)');
    console.log(soloIdempotencia
      ? 'Preflight de idempotencia aprobado; no se realizaron escrituras.'
      : 'Preflight Fase 5/6 aprobado; no se realizaron escrituras.');
    return;
  }

  // Estas son deliberadamente las únicas líneas emitidas antes del primer POST.
  console.log('ENTORNO: TEST');
  console.log('DESTINO: backend TEST verificado');
  console.log('ESCRITURAS E2E: habilitadas');
  cliente.habilitarEscrituras();

  const ids = crearIdentificadoresE2E(randomUUID());
  estadoEjecucion.marcador = ids.ejecucion;
  const productoDecimal = estadoInicial.productos[config.productoDecimalId];
  const fechaHora = fechaHoraSantiago();

  if (soloIdempotencia) {
    estadoEjecucion.pasoActual = 'idempotencia';
    await ejecutarCasoIdempotencia(cliente, config, ids, fechaHora, productoIds);
    completarPaso('idempotencia');
    imprimirEvidenciaFinal();
    return;
  }

  const productoUnidad = estadoInicial.productos[config.productoUnidadId];

  estadoEjecucion.pasoActual = 'venta por unidad';
  const ventaUnidad = await crearVenta(cliente, {
    apertura_id: config.aperturaId,
    fecha_hora: fechaHora,
    vendedor: 'E2E TEST FASE 5-6',
    forma_pago: 'efectivo',
    observaciones: `${ids.ejecucion} venta unidad TEST`,
    lineas: [{ producto_id: config.productoUnidadId, cantidad: 1 }],
    idempotency_key: ids.idempotenciaUnidad,
  }, 'venta por unidad: creación');
  validarVentaYComanda(ventaUnidad, config.aperturaId, config.productoUnidadId, 1,
    productoUnidad.precio_venta);
  registrarVenta('unidad', ventaUnidad.venta.venta_id);
  await validarVentaPersistida(cliente, ventaUnidad, 1);
  completarPaso('venta por unidad');

  estadoEjecucion.pasoActual = 'venta decimal';
  const ventaDecimal = await crearVenta(cliente, {
    apertura_id: config.aperturaId,
    fecha_hora: fechaHora,
    vendedor: 'E2E TEST FASE 5-6',
    forma_pago: 'transferencia',
    observaciones: `${ids.ejecucion} venta decimal TEST`,
    lineas: [{ producto_id: config.productoDecimalId, cantidad: 0.5 }],
    idempotency_key: ids.idempotenciaDecimal,
  }, 'venta decimal: creación');
  validarVentaYComanda(ventaDecimal, config.aperturaId, config.productoDecimalId, 0.5,
    redondear2(productoDecimal.precio_venta * 0.5));
  registrarVenta('decimal', ventaDecimal.venta.venta_id);
  await validarVentaPersistida(cliente, ventaDecimal, 1);
  completarPaso('venta decimal');

  estadoEjecucion.pasoActual = 'rechazo decimal en entero';
  let antesRechazo = await obtenerEstado(cliente, config.aperturaId, productoIds);
  await exigirRechazo(cliente, {
    apertura_id: config.aperturaId,
    fecha_hora: fechaHora,
    vendedor: 'E2E TEST FASE 5-6',
    forma_pago: 'efectivo',
    observaciones: `${ids.ejecucion} rechazo decimal entero TEST`,
    lineas: [{ producto_id: config.productoUnidadId, cantidad: 0.5 }],
    idempotency_key: `e2e_test_rechazo_entero_${ids.ejecucion.slice(-12)}`,
  }, 400, /no permite decimales/i, 'rechazo decimal en entero');
  let despuesRechazo = await obtenerEstado(cliente, config.aperturaId, productoIds);
  validarSinCambios(antesRechazo, despuesRechazo);
  completarPaso('rechazo decimal en entero');

  estadoEjecucion.pasoActual = 'rechazo por stock';
  antesRechazo = despuesRechazo;
  const stockDecimalActual = antesRechazo.productos[config.productoDecimalId].stock_actual;
  await exigirRechazo(cliente, {
    apertura_id: config.aperturaId,
    fecha_hora: fechaHora,
    vendedor: 'E2E TEST FASE 5-6',
    forma_pago: 'efectivo',
    observaciones: `${ids.ejecucion} stock insuficiente TEST`,
    lineas: [{
      producto_id: config.productoDecimalId,
      cantidad: redondear2(stockDecimalActual + productoDecimal.paso_venta),
    }],
    idempotency_key: `e2e_test_rechazo_stock_${ids.ejecucion.slice(-12)}`,
  }, 409, /stock insuficiente/i, 'rechazo por stock insuficiente');
  despuesRechazo = await obtenerEstado(cliente, config.aperturaId, productoIds);
  validarSinCambios(antesRechazo, despuesRechazo);
  completarPaso('rechazo por stock');

  estadoEjecucion.pasoActual = 'idempotencia';
  await ejecutarCasoIdempotencia(cliente, config, ids, fechaHora, productoIds);
  completarPaso('idempotencia');

  estadoEjecucion.pasoActual = 'pedidos anticipados y cancelación';
  const antesPedidos = await obtenerEstado(cliente, config.aperturaId, productoIds);
  const pedidoVigente = await crearPedidoAnticipado(
    cliente, config, ids, 'vigente', config.productoDecimalId, 0.1
  );
  registrarPedido('vigente', pedidoVigente.id_pedido);
  await validarPedidoE2ECreado(cliente, pedidoVigente.id_pedido, ids, 'vigente');
  // Los pedidos heredados usan un ID con resolución de segundos.
  await esperarSiguienteSegundo();
  const antesPedidoCancelado = await obtenerEstado(cliente, config.aperturaId, productoIds);
  assert.equal(antesPedidoCancelado.filas.pedidos - antesPedidos.filas.pedidos, 1);
  assert.equal(antesPedidoCancelado.filas.detalle_pedidos - antesPedidos.filas.detalle_pedidos, 1);
  assert.equal(antesPedidoCancelado.filas.movimientos_stock - antesPedidos.filas.movimientos_stock, 1);
  assertNumero(
    antesPedidoCancelado.productos[config.productoDecimalId].stock_actual,
    antesPedidos.productos[config.productoDecimalId].stock_actual - 0.1,
    'El pedido anticipado vigente debe descontar stock una vez.'
  );
  const pedidoCancelado = await crearPedidoAnticipado(
    cliente, config, ids, 'cancelado', config.productoDecimalId, 0.1
  );
  registrarPedido('cancelado', pedidoCancelado.id_pedido);
  await validarPedidoE2ECreado(cliente, pedidoCancelado.id_pedido, ids, 'cancelado');
  const despuesCrearCancelado = await obtenerEstado(cliente, config.aperturaId, productoIds);
  assert.equal(despuesCrearCancelado.filas.pedidos - antesPedidoCancelado.filas.pedidos, 1);
  assert.equal(
    despuesCrearCancelado.filas.detalle_pedidos - antesPedidoCancelado.filas.detalle_pedidos,
    1
  );
  assert.equal(
    despuesCrearCancelado.filas.movimientos_stock - antesPedidoCancelado.filas.movimientos_stock,
    1
  );
  assertNumero(
    despuesCrearCancelado.productos[config.productoDecimalId].stock_actual,
    antesPedidoCancelado.productos[config.productoDecimalId].stock_actual - 0.1,
    'El pedido que se cancelará debe descontar stock al crearse.'
  );
  await cliente.post({
    action: 'cancelarPedido',
    id_pedido: pedidoCancelado.id_pedido,
  }, { admin: true });
  const despuesCancelar = await obtenerEstado(cliente, config.aperturaId, productoIds);
  assert.deepEqual(despuesCancelar.filas, {
    ...despuesCrearCancelado.filas,
    movimientos_stock: despuesCrearCancelado.filas.movimientos_stock + 1,
  });
  assertNumero(
    despuesCancelar.productos[config.productoDecimalId].stock_actual,
    antesPedidoCancelado.productos[config.productoDecimalId].stock_actual,
    'Cancelar el pedido debe devolver exactamente el stock descontado.'
  );
  const canceladoLeido = await cliente.get('obtenerPedido', {
    id_pedido: pedidoCancelado.id_pedido,
  });
  assert.equal(canceladoLeido.pedido.estado_pedido, 'cancelado');
  assert.equal(canceladoLeido.pedido.observaciones, `${ids.ejecucion} pedido cancelado TEST`);
  const vigenteLeido = await cliente.get('obtenerPedido', {
    id_pedido: pedidoVigente.id_pedido,
  });
  assert.notEqual(vigenteLeido.pedido.estado_pedido, 'cancelado');
  assert.equal(vigenteLeido.pedido.observaciones, `${ids.ejecucion} pedido vigente TEST`);
  completarPaso('pedidos anticipados y cancelación');

  estadoEjecucion.pasoActual = 'caja por apertura';
  const estadoAntesCaja = await obtenerEstado(cliente, config.aperturaId, productoIds);
  const aperturaAntesCaja = await obtenerAperturaCompleta(cliente, config.aperturaId);
  const ventasApertura = await cliente.get('listarVentasPorApertura', {
    apertura_id: config.aperturaId,
  });
  validarVentasListadas(ventasApertura.ventas, [
    ventaUnidad.venta.venta_id,
    ventaDecimal.venta.venta_id,
    ...estadoEjecucion.ventas
      .filter((venta) => venta.tipo === 'idempotencia')
      .map((venta) => venta.venta_id),
  ]);
  const resumenFinal = await cliente.get('obtenerResumenApertura', {
    apertura_id: config.aperturaId,
  });
  const estadoDespuesCaja = await obtenerEstado(cliente, config.aperturaId, productoIds);
  const aperturaDespuesCaja = await obtenerAperturaCompleta(cliente, config.aperturaId);

  assert.deepEqual(
    estadoDespuesCaja,
    estadoAntesCaja,
    'Las consultas de caja y ventas por apertura no deben modificar datos persistentes.'
  );
  assert.deepEqual(
    aperturaDespuesCaja,
    aperturaAntesCaja,
    'Las consultas de caja no deben modificar ningún campo persistente de APERTURAS.'
  );
  validarEstadoFinal(estadoInicial, estadoDespuesCaja, config);
  validarResumenFinal(resumenInicial, resumenFinal, productoUnidad.precio_venta,
    productoDecimal.precio_venta);
  completarPaso('caja por apertura');

  estadoEjecucion.pasoActual = 'restauración de apertura';
  await restaurarAperturaTest(
    cliente,
    config,
    ids,
    estadoDespuesCaja,
    aperturaDespuesCaja,
    productoIds
  );
  estadoEjecucion.aperturaRestaurada = true;
  completarPaso('restauración de apertura');
  imprimirEvidenciaFinal();
}

function crearClienteAppsScript(config, { escrituraAutorizada = false } = {}) {
  let backendTestConfirmado = false;
  let escriturasHabilitadas = false;

  async function solicitar({ method, params = {}, body, operacion }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const url = new URL(config.urlTest);
      const opciones = {
        method,
        redirect: 'follow',
        cache: 'no-store',
        signal: controller.signal,
      };
      // Fuerza una redirección efímera nueva de ContentService en cada intento.
      // No altera el payload ni la clave de idempotencia de los POST.
      url.searchParams.set('_e2e_request_id', randomUUID());
      if (method === 'GET') {
        for (const [clave, valor] of Object.entries(params)) url.searchParams.set(clave, valor);
      } else {
        opciones.headers = { 'Content-Type': 'application/json' };
        opciones.body = JSON.stringify(body);
      }
      const respuesta = await fetch(url, opciones);
      const texto = await respuesta.text();
      let json;
      try {
        json = JSON.parse(texto);
      } catch {
        throw crearErrorRespuestaNoJsonE2E({
          operacion,
          httpStatus: respuesta.status,
          contentType: respuesta.headers.get('content-type'),
          redirected: respuesta.redirected,
          responseUrl: respuesta.url,
          cuerpo: texto,
        });
      }
      if (!json || typeof json.ok !== 'boolean') {
        throw new Error('El backend TEST devolvió un contrato inválido.');
      }
      const postConvertidoAGet = method === 'POST' && json.ok === false &&
        Number(json.codigo) === 400 &&
        /^Acci[oó]n GET no reconocida:\s*""\.?$/i.test(String(json.error || '').trim());
      if (postConvertidoAGet) {
        throw crearErrorRedireccionPostAGetE2E({
          operacion,
          httpStatus: respuesta.status,
          redirected: respuesta.redirected,
          responseUrl: respuesta.url,
        });
      }
      if (!respuesta.ok && json.ok) {
        throw new Error('El backend TEST devolvió un estado HTTP incoherente.');
      }
      return { ...json, httpStatus: respuesta.status };
    } catch (error) {
      if (error?.name === 'AbortError') {
        const timeoutError = new Error('Tiempo de espera agotado contra backend TEST.');
        timeoutError.tipoE2E = 'timeout';
        throw timeoutError;
      }
      if (error?.tipoE2E) throw error;
      if (error instanceof Error && /backend TEST/.test(error.message)) throw error;
      const redError = new Error('No se pudo contactar el backend TEST.');
      redError.tipoE2E = 'red';
      throw redError;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    confirmarBackendTest(verificacion) {
      if (!validarConfirmacionBackendTest(verificacion)) {
        throw new Error('El backend no confirmó inequívocamente el contrato TEST esperado.');
      }
      backendTestConfirmado = true;
    },
    habilitarEscrituras() {
      if (!escrituraAutorizada || !backendTestConfirmado) {
        throw new Error('Las escrituras no superaron los guardarraíles TEST en memoria.');
      }
      escriturasHabilitadas = true;
    },
    async get(action, params = {}) {
      if (!backendTestConfirmado && action !== 'verificarDestinoE2EFase56') {
        throw new Error('GET bloqueado: primero debe verificarse el destino TEST.');
      }
      let ultimoError;
      for (let intento = 1; intento <= 2; intento++) {
        try {
          const respuesta = await solicitar({
            method: 'GET',
            params: { action, token: config.tokenTest, ...params },
            operacion: `GET ${action}`,
          });
          if (!respuesta.ok) throw errorBackend(respuesta);
          return respuesta.data;
        } catch (error) {
          ultimoError = error;
          if (!esFalloTransitorioLectura(error) || intento === 2) throw error;
          console.warn(`RETRY | GET ${action}: fallo transitorio de lectura; intento 2/2.`);
          await new Promise((resolve) => setTimeout(resolve, ESPERA_RETRY_TRANSITORIO_MS));
        }
      }
      throw ultimoError;
    },
    async post(body, { admin = true, permitirError = false, operacion } = {}) {
      if (!backendTestConfirmado || !escriturasHabilitadas) {
        throw new Error('POST bloqueado: el backend TEST no fue verificado y habilitado.');
      }
      const respuesta = await solicitar({
        method: 'POST',
        body: { ...body, ...(admin ? { token: config.tokenTest } : {}) },
        operacion: operacion || `POST ${body.action}`,
      });
      if (!respuesta.ok && !permitirError) throw errorBackend(respuesta);
      return respuesta;
    },
  };
}

function errorBackend(respuesta) {
  const error = new Error(String(respuesta.error || 'El backend TEST rechazó la operación.'));
  error.codigo = Number(respuesta.codigo || respuesta.httpStatus || 500);
  error.httpStatus = Number(respuesta.httpStatus || 0);
  error.tipoE2E = 'backend_logico';
  return error;
}

async function obtenerEstado(cliente, aperturaId, productoIds) {
  return cliente.get('obtenerEstadoE2EFase56', {
    apertura_id: aperturaId,
    producto_ids: productoIds.join(','),
  });
}

async function obtenerAperturaCompleta(cliente, aperturaId) {
  return cliente.get('obtenerApertura', { apertura_id: aperturaId });
}

function validarFixturesTest(estado, config, { soloIdempotencia = false } = {}) {
  assert.equal(estado.contrato, 'fase56_e2e_test_v1');
  assert.equal(estado.apertura.apertura_id, config.aperturaId);
  assert.equal(estado.apertura.estado_apertura, 'activa');
  assert.equal(estado.apertura.modo_presencial_estado, 'activo');

  const decimal = estado.productos[config.productoDecimalId];
  assert.equal(decimal.activo, 'SI');
  assert.equal(decimal.unidad_medida, 'kg');
  assert.equal(decimal.permite_decimal, 'SI');
  assertNumero(decimal.paso_venta, 0.1, 'El fixture decimal debe usar paso_venta 0.1.');
  assertNumero(decimal.precio_venta, 1000, 'El fixture decimal debe costar 1000 por kg.');
  assert.ok(decimal.stock_actual >= (soloIdempotencia ? 0.1 : 0.8),
    'El producto decimal no tiene stock suficiente.');

  if (!soloIdempotencia) {
    assert.equal(estado.apertura.pedidos_anticipados_estado, 'activo');
    const unidad = estado.productos[config.productoUnidadId];
    assert.equal(unidad.activo, 'SI');
    assert.equal(unidad.nombre, 'Arroz');
    assert.notEqual(unidad.permite_decimal, 'SI');
    assert.ok(unidad.stock_actual >= 1, 'El producto por unidad no tiene stock suficiente.');
    assert.ok(unidad.precio_venta > 0, 'El producto por unidad no tiene precio válido.');
  }

  const actual = fechaHoraSantiago();
  const inicio = `${estado.apertura.fecha_apertura}T${estado.apertura.hora_inicio}`;
  const termino = `${estado.apertura.fecha_apertura}T${estado.apertura.hora_termino}`;
  assert.ok(actual >= inicio && actual <= termino,
    'La apertura TEST no está dentro de su horario presencial actual.');
}

async function ejecutarCasoIdempotencia(cliente, config, ids, fechaHora, productoIds) {
  const antes = await obtenerEstado(cliente, config.aperturaId, productoIds);
  const producto = antes.productos[config.productoDecimalId];
  const payload = {
    apertura_id: config.aperturaId,
    fecha_hora: fechaHora,
    vendedor: 'E2E TEST IDEMPOTENCIA',
    forma_pago: 'pendiente',
    observaciones: `${ids.ejecucion} idempotencia TEST`,
    lineas: [{ producto_id: config.productoDecimalId, cantidad: 0.1 }],
    idempotency_key: ids.idempotenciaPrincipal,
  };

  const primera = await crearVenta(cliente, payload, 'idempotencia: primer POST');
  registrarVenta('idempotencia', primera.venta.venta_id);
  validarVentaYComanda(
    primera,
    config.aperturaId,
    config.productoDecimalId,
    0.1,
    redondear2(producto.precio_venta * 0.1)
  );

  const repetida = await crearVenta(
    cliente,
    structuredClone(payload),
    'idempotencia: segundo POST, replay idéntico'
  );
  assert.deepEqual(repetida, primera,
    'El mismo payload debe devolver exactamente la misma venta.');

  await exigirRechazo(cliente, {
    ...payload,
    observaciones: `${ids.ejecucion} payload diferente TEST`,
  }, 409, /clave de idempotencia.+otro contenido/i,
  'idempotencia: tercer POST, conflicto esperado');

  const despues = await obtenerEstado(cliente, config.aperturaId, productoIds);
  assert.equal(despues.filas.ventas - antes.filas.ventas, 1);
  assert.equal(despues.filas.detalle_ventas - antes.filas.detalle_ventas, 1);
  assert.equal(despues.filas.movimientos_stock - antes.filas.movimientos_stock, 1);
  assertNumero(
    despues.productos[config.productoDecimalId].stock_actual,
    antes.productos[config.productoDecimalId].stock_actual - 0.1,
    'La idempotencia no debe descontar stock dos veces.'
  );
  await validarVentaPersistida(cliente, primera, 1);
}

async function crearVenta(cliente, payload, operacion) {
  const respuesta = await postIdempotenteConReintento(
    cliente,
    { action: 'crearVentaPresencial', ...payload },
    { operacion }
  );
  assert.equal(respuesta.ok, true);
  return respuesta.data;
}

async function postIdempotenteConReintento(
  cliente,
  body,
  { operacion, permitirError = false }
) {
  assert.match(
    String(body.idempotency_key || ''),
    /^[A-Za-z0-9_-]{8,100}$/,
    'Un reintento remoto exige una idempotency_key válida.'
  );
  const cuerpoExacto = JSON.stringify(body);
  let ultimoError;
  for (let intento = 1; intento <= 2; intento++) {
    try {
      return await cliente.post(
        JSON.parse(cuerpoExacto),
        { admin: true, permitirError, operacion }
      );
    } catch (error) {
      ultimoError = error;
      const reintentable = esFalloTransitorioIdempotente(error);
      if (!reintentable || intento === 2) throw error;
      console.warn(
        `RETRY | ${operacion}: se repetirá una vez el mismo cuerpo e idempotency_key.`
      );
      await new Promise((resolve) => setTimeout(resolve, ESPERA_RETRY_TRANSITORIO_MS));
      // Reintentar el mismo payload es seguro porque crearVentaPresencial exige
      // una idempotency_key y el backend la resuelve bajo lock.
    }
  }
  throw ultimoError;
}

function validarVentaYComanda(resultado, aperturaId, productoId, cantidad, total) {
  assert.match(resultado.venta.venta_id, /^VEN-/);
  assert.equal(resultado.venta.apertura_id, aperturaId);
  assertNumero(resultado.venta.total, total, 'Total de venta incorrecto.');
  assert.equal(resultado.detalle.length, 1);
  assert.equal(resultado.detalle[0].producto_id, productoId);
  assertNumero(resultado.detalle[0].cantidad, cantidad, 'Cantidad persistida incorrecta.');
  assert.equal(resultado.comanda.venta_id, resultado.venta.venta_id);
  assert.equal(resultado.comanda.estado_impresion, 'pendiente_de_impresion');
  assert.deepEqual(resultado.comanda.detalle, resultado.detalle);
  assertNumero(resultado.comanda.total, total, 'Total de comanda incorrecto.');
}

async function validarVentaPersistida(cliente, resultadoEsperado, lineas) {
  const ventaId = resultadoEsperado.venta.venta_id;
  const evidencia = await cliente.get('obtenerEvidenciaVentaE2EFase56', { venta_id: ventaId });
  assert.equal(evidencia.contrato, 'fase56_e2e_test_v1');
  assert.equal(evidencia.filas.ventas, 1);
  assert.equal(evidencia.filas.detalle_ventas, lineas);
  assert.equal(evidencia.filas.movimientos_stock, lineas);
  const obtenida = await cliente.get('obtenerVentaPresencial', { venta_id: ventaId });
  assert.deepEqual(
    obtenida,
    resultadoEsperado,
    'obtenerVentaPresencial debe reconstruir exactamente la venta y su comanda.'
  );
}

async function exigirRechazo(cliente, payload, codigo, patron, operacion) {
  const respuesta = await postIdempotenteConReintento(
    cliente,
    { action: 'crearVentaPresencial', ...payload },
    { permitirError: true, operacion }
  );
  assert.equal(respuesta.ok, false, 'La operación debía ser rechazada.');
  assert.equal(Number(respuesta.codigo), codigo, `Se esperaba código lógico ${codigo}.`);
  assert.match(String(respuesta.error || ''), patron);
}

function validarSinCambios(antes, despues) {
  assert.deepEqual(
    despues,
    antes,
    'Un rechazo no debe modificar filas, productos ni la apertura.'
  );
}

async function crearPedidoAnticipado(cliente, config, ids, tipo, productoId, cantidad) {
  const respuesta = await cliente.post({
    action: 'crearPedido',
    nombre_cliente: `E2E TEST ${tipo}`,
    telefono: '+56900000000',
    forma_pago: 'efectivo_al_retirar',
    observaciones: `${ids.ejecucion} pedido ${tipo} TEST`,
    carrito: [{ id_producto: productoId, cantidad }],
    apertura_id: config.aperturaId,
    origen_pedido: 'online_anticipado',
  }, { admin: false });
  assert.equal(respuesta.ok, true);
  assert.match(respuesta.data.id_pedido, /^PED-/);
  return respuesta.data;
}

async function validarPedidoE2ECreado(cliente, pedidoId, ids, tipo) {
  const leido = await cliente.get('obtenerPedido', { id_pedido: pedidoId });
  assert.equal(leido.pedido.id_pedido, pedidoId);
  assert.equal(leido.pedido.nombre_cliente, `E2E TEST ${tipo}`);
  assert.equal(leido.pedido.observaciones, `${ids.ejecucion} pedido ${tipo} TEST`);
  assert.notEqual(leido.pedido.estado_pedido, 'cancelado');
}

function validarVentasListadas(ventas, idsEsperados) {
  assert.ok(Array.isArray(ventas), 'listarVentasPorApertura debe devolver una lista de ventas.');
  for (const ventaId of idsEsperados) {
    assert.equal(
      ventas.filter((venta) => venta.venta_id === ventaId).length,
      1,
      `La venta ${ventaId} debe aparecer exactamente una vez en la apertura.`
    );
  }
}

async function restaurarAperturaTest(
  cliente,
  config,
  ids,
  estadoAntes,
  aperturaAntes,
  productoIds
) {
  assert.equal(config.aperturaId, 'APE-20260919');
  const restauracion = prepararRestauracionAperturaTest(aperturaAntes);
  const aperturaRestaurada = restauracion.apertura;

  const body = {
    action: 'actualizarApertura',
    apertura_id: config.aperturaId,
    apertura: aperturaRestaurada,
    actualizado_en_esperado: restauracion.actualizadoEnEsperado,
    idempotency_key: ids.idempotenciaRestauracion,
    actor: 'e2e_test_fase56_restauracion',
  };
  const respuesta = await postIdempotenteConReintento(cliente, body, {
    operacion: 'restauración de apertura TEST',
  });
  assert.equal(respuesta?.ok, true, 'La restauración TEST debe ser confirmada por el backend.');

  const estadoDespues = await obtenerEstado(cliente, config.aperturaId, productoIds);
  const aperturaDespues = await obtenerAperturaCompleta(cliente, config.aperturaId);
  for (const campo of CAMPOS_APERTURA_E2E) {
    assert.equal(
      normalizarCampoAperturaE2E(campo, aperturaDespues[campo]),
      normalizarCampoAperturaE2E(campo, aperturaRestaurada[campo]),
      `La restauración no dejó el valor esperado en ${campo}.`
    );
  }
  assert.equal(aperturaDespues.creada_por, aperturaAntes.creada_por);
  assert.equal(aperturaDespues.creado_en, aperturaAntes.creado_en);
  assert.equal(aperturaDespues.actualizada_por, 'e2e_test_fase56_restauracion');
  assert.ok(aperturaDespues.actualizado_en, 'La restauración debe registrar actualizado_en.');
  assert.deepEqual(estadoDespues.filas, estadoAntes.filas);
  assert.deepEqual(estadoDespues.productos, estadoAntes.productos);
}

function validarEstadoFinal(inicial, final, config) {
  assert.equal(final.filas.ventas - inicial.filas.ventas, 3);
  assert.equal(final.filas.detalle_ventas - inicial.filas.detalle_ventas, 3);
  assert.equal(final.filas.pedidos - inicial.filas.pedidos, 2);
  assert.equal(final.filas.detalle_pedidos - inicial.filas.detalle_pedidos, 2);
  assert.equal(final.filas.movimientos_stock - inicial.filas.movimientos_stock, 6);
  assertNumero(final.productos[config.productoUnidadId].stock_actual,
    inicial.productos[config.productoUnidadId].stock_actual - 1,
    'Stock final del producto por unidad incorrecto.');
  assertNumero(final.productos[config.productoDecimalId].stock_actual,
    inicial.productos[config.productoDecimalId].stock_actual - 0.7,
    'Stock final del producto decimal incorrecto.');
}

function validarResumenFinal(inicial, final, precioUnidad, precioDecimal) {
  const totalUnidad = redondear2(precioUnidad);
  const totalDecimal = redondear2(precioDecimal * 0.5);
  const totalPaso = redondear2(precioDecimal * 0.1);
  const totalPresencial = redondear2(totalUnidad + totalDecimal + totalPaso);

  assertDelta(final, inicial, 'cantidad_ventas_presenciales', 3);
  assertDelta(final, inicial, 'total_ventas_presenciales', totalPresencial);
  assertDelta(final, inicial, 'cantidad_pedidos_anticipados', 1);
  assertDelta(final, inicial, 'total_pedidos_anticipados', totalPaso);
  assertDelta(final, inicial, 'total_general', totalPresencial + totalPaso);
  assertDelta(final, inicial, 'cantidad_pendientes_pago', 2);
  assertDelta(final, inicial, 'total_pendiente_pago', totalPaso * 2);
  assertDelta(final, inicial, 'cantidad_cancelados', 1);
  assertDelta(final, inicial, 'total_cancelado', totalPaso);
  assertDelta(final, inicial, 'total_cobrado', totalUnidad + totalDecimal);
  assertDelta(final, inicial, 'total_efectivo_esperado', totalUnidad);
  assertDelta(final, inicial, 'total_transferencia', totalDecimal);
  assertDelta(final, inicial, 'total_efectivo_al_retirar', 0);
  assert.deepEqual(
    final.advertencias,
    inicial.advertencias,
    'Los registros E2E válidos no deben introducir advertencias nuevas.'
  );
}

function completarPaso(paso, { silencioso = false } = {}) {
  estadoEjecucion.completados.add(paso);
  if (!silencioso) console.log(`PASS | ${paso}`);
}

function registrarVenta(tipo, ventaId) {
  estadoEjecucion.ventas.push({ tipo, venta_id: ventaId });
}

function registrarPedido(tipo, pedidoId) {
  estadoEjecucion.pedidos.push({ tipo, id_pedido: pedidoId });
}

function imprimirEvidenciaFinal() {
  if (estadoEjecucion.evidenciaImpresa) return;
  estadoEjecucion.evidenciaImpresa = true;
  if (estadoEjecucion.marcador) {
    console.log(`EVIDENCIA | marcador: ${estadoEjecucion.marcador}`);
  }
  for (const venta of estadoEjecucion.ventas) {
    console.log(`EVIDENCIA | venta ${venta.tipo}: ${venta.venta_id}`);
  }
  for (const pedido of estadoEjecucion.pedidos) {
    console.log(`EVIDENCIA | pedido ${pedido.tipo}: ${pedido.id_pedido}`);
  }
  if (estadoEjecucion.pasos.includes('restauración de apertura')) {
    console.log(`EVIDENCIA | apertura restaurada: ${estadoEjecucion.aperturaRestaurada ? 'SI' : 'NO'}`);
  }
}

function assertDelta(final, inicial, campo, esperado) {
  assertNumero(Number(final[campo]) - Number(inicial[campo]), esperado,
    `Delta incorrecto para ${campo}.`);
}

function assertNumero(actual, esperado, mensaje) {
  assert.ok(Math.abs(Number(actual) - Number(esperado)) < 0.000001,
    `${mensaje} Esperado ${esperado}; recibido ${actual}.`);
}

function redondear2(numero) {
  return Math.round(numero * 100) / 100;
}

function fechaHoraSantiago() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const parte = (tipo) => partes.find((item) => item.type === tipo)?.value ?? '';
  return `${parte('year')}-${parte('month')}-${parte('day')}T${parte('hour')}:${parte('minute')}`;
}

async function esperarSiguienteSegundo() {
  const segundoInicial = Math.floor(Date.now() / 1000);
  while (Math.floor(Date.now() / 1000) === segundoInicial) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}
