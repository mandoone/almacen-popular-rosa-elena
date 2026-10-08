/**
 * apps-script-pedidos.gs
 * ------------------------------------------------------------------------------
 * Web App de Google Apps Script para PEDIDOS REALES del Almacen Popular Rosa Elena
 * Morales, sobre la base operativa BD_WEB_ALMACEN_ROSA_ELENA_MORALES.
 *
 * Acciones:
 *   POST publico:        crearPedido
 *   GET  con token:      listarPedidos, obtenerPedido, listarAperturas,
 *                        obtenerApertura, obtenerCapacidadesFase3b,
 *                        obtenerVentaPresencial, listarVentasPorApertura,
 *                        obtenerResumenApertura, verificarDestinoE2EFase56,
 *                        obtenerEstadoE2EFase56,
 *                        obtenerEvidenciaVentaE2EFase56
 *   POST con token:      actualizarEstadoPedido, cancelarPedido,
 *                        crearApertura, actualizarApertura,
 *                        cambiarEstadoApertura, crearVentaPresencial
 *
 * IMPORTANTE:
 *   - SPREADSHEET_ID y ADMIN_TOKEN se editan a mano en Apps Script antes de
 *     desplegar. NO commitear valores reales.
 *   - La URL de la Web App y el token NO se guardan en el repo.
 *   - Las acciones de APERTURAS, ventas presenciales y caja solo funcionan si
 *     la propiedad de script APP_ENV tiene exactamente el valor TEST.
 *
 * USO / DESPLIEGUE: ver docs/APPS_SCRIPT_PEDIDOS.md
 * ------------------------------------------------------------------------------
 */

// ====== CONFIGURAR AQUI (editar en Apps Script, NO commitear valores reales) ====
var SPREADSHEET_ID = 'PEGAR_ID_BASE_OPERATIVA_AQUI';
var ADMIN_TOKEN = 'PEGAR_TOKEN_ADMIN_AQUI';
// ===============================================================================

var HOJAS = {
  PRODUCTOS: 'PRODUCTOS',
  FAMILIAS_PRODUCTO: 'FAMILIAS_PRODUCTO', // Fase A paralela; ninguna acción V1 la utiliza.
  PEDIDOS: 'PEDIDOS',
  DETALLE_PEDIDOS: 'DETALLE_PEDIDOS',
  VENTAS: 'VENTAS',
  DETALLE_VENTAS: 'DETALLE_VENTAS',
  MOVIMIENTOS_STOCK: 'MOVIMIENTOS_STOCK',
  APERTURAS: 'APERTURAS',
  APERTURA_PRODUCTOS: 'APERTURA_PRODUCTOS',
  COMPRAS: 'COMPRAS',
  DETALLE_COMPRAS: 'DETALLE_COMPRAS',
  GASTOS_EXTRA: 'GASTOS_EXTRA',
  HISTORIAL_COSTOS: 'HISTORIAL_COSTOS',
  CAJA_COMPRA: 'CAJA_COMPRA',
  AUDITORIA_PRODUCTOS: 'AUDITORIA_PRODUCTOS',
  OPERACIONES_PEDIDOS: 'OPERACIONES_PEDIDOS'
};

var COLUMNAS_OPERACIONES_PEDIDOS = [
  'operacion_id', 'idempotency_key', 'tipo_operacion', 'id_pedido', 'actor',
  'estado_operacion', 'paso', 'payload_hash', 'snapshot_json', 'resultado_json',
  'error_codigo', 'error_detalle', 'creado_en', 'actualizado_en'
];

var ESTADOS_OPERACION_PEDIDO = [
  'PREPARADA', 'APLICANDO', 'COMPLETADA', 'REQUIERE_REVISION'
];

var ESTADOS_PEDIDO = ['recibido', 'pendiente', 'listo', 'entregado', 'cancelado'];

var COLUMNAS_APERTURAS = [
  'apertura_id',
  'fecha_apertura',
  'hora_inicio',
  'hora_termino',
  'lugar',
  'cierre_pedidos_anticipados',
  'estado_apertura',
  'pedidos_anticipados_estado',
  'modo_presencial_estado',
  'mensaje_publico',
  'observaciones_internas',
  'creada_por',
  'actualizada_por',
  'creado_en',
  'actualizado_en'
];

var CANAL_WEB = 'web';
var COLUMNAS_APERTURA_PRODUCTOS = [
  'apertura_id', 'producto_id', 'habilitado', 'actualizado_por', 'actualizado_en'
];
var NOMBRE_SHEET_TEST_E2E = 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES';

var COLUMNAS_VENTA_PRESENCIAL = {
  VENTAS: [
    'venta_id', 'fecha_hora', 'apertura_id', 'origen_venta', 'vendedor',
    'total', 'estado_venta', 'estado_pago', 'forma_pago', 'observaciones',
    'creado_en', 'actualizado_en'
  ],
  DETALLE_VENTAS: [
    'detalle_id', 'venta_id', 'producto_id', 'nombre_producto', 'cantidad',
    'unidad_medida', 'precio_unitario', 'subtotal'
  ],
  MOVIMIENTOS_STOCK: [
    'movimiento_id', 'fecha_hora', 'producto_id', 'tipo_movimiento',
    'cantidad', 'referencia_tipo', 'referencia_id', 'apertura_id', 'observacion'
  ]
};

var COLUMNAS_SNAPSHOTS_COMPRA_B1 = [
  'familia_id_snapshot', 'marca_snapshot', 'presentacion_snapshot',
  'contenido_cantidad_snapshot', 'contenido_unidad_snapshot',
  'gramos_unidad_stock_snapshot'
];

var COLUMNAS_FASE_7_8 = {
  COMPRAS: [
    'compra_id', 'fecha', 'fecha_hora', 'proveedor', 'responsable', 'estado', 'total',
    'observaciones', 'idempotency_key', 'payload_hash', 'creado_en', 'actualizado_en'
  ],
  DETALLE_COMPRAS: [
    'detalle_compra_id', 'compra_id', 'producto_id', 'nombre_producto',
    'unidad_medida', 'cantidad', 'costo_unitario', 'costo_total',
    'stock_anterior', 'stock_nuevo', 'costo_anterior', 'costo_nuevo'
  ].concat(COLUMNAS_SNAPSHOTS_COMPRA_B1),
  GASTOS_EXTRA: [
    'gasto_id', 'fecha_hora', 'categoria', 'descripcion', 'monto', 'responsable',
    'observaciones', 'estado', 'idempotency_key', 'payload_hash', 'creado_en',
    'actualizado_en'
  ],
  HISTORIAL_COSTOS: [
    'historial_costo_id', 'fecha_hora', 'producto_id', 'costo_anterior',
    'costo_nuevo', 'origen', 'referencia_id', 'responsable', 'observaciones'
  ],
  CAJA_COMPRA: [
    'caja_compra_id', 'fecha_hora', 'saldo_cuenta', 'efectivo_disponible',
    'pendientes_referencia', 'gastos_extra', 'presupuesto_calculado',
    'presupuesto_confirmado', 'responsable', 'observaciones', 'idempotency_key',
    'payload_hash', 'creado_en'
  ],
  AUDITORIA_PRODUCTOS: [
    'auditoria_id', 'fecha_hora', 'producto_id', 'accion', 'cambios_json',
    'responsable', 'referencia_id',
    'entidad_tipo', 'entidad_id', 'payload_hash', 'resultado_json'
  ],
  MOVIMIENTOS_STOCK: [
    'movimiento_id', 'fecha_hora', 'producto_id', 'tipo_movimiento', 'cantidad',
    'referencia_tipo', 'referencia_id', 'apertura_id', 'observacion',
    'stock_anterior', 'stock_resultante', 'usuario', 'payload_hash', 'operacion_id'
  ],
  PRODUCTOS_ADMIN: [
    'id_producto', 'activo', 'nombre', 'categoria', 'prioridad', 'unidad_medida',
    'permite_decimal', 'paso_venta', 'precio_costo', 'precio_venta',
    'stock_actual', 'stock_minimo', 'imagen_url',
    'familia_id', 'marca', 'presentacion', 'contenido_cantidad', 'contenido_unidad'
  ]
};

// ===================== DISPONIBILIDAD POR APERTURA =============================

function tipoDisponibilidadProducto_(valor) {
  return limpiar_(valor) || 'REGULAR'; // Compatibilidad con productos anteriores.
}

function productoDisponibleEnApertura_(producto, habilitados) {
  if (limpiar_(producto.activo).toUpperCase() !== 'SI') return false;
  var tipo = tipoDisponibilidadProducto_(producto.tipo_disponibilidad);
  return tipo === 'REGULAR' || (tipo === 'POR_APERTURA' && habilitados[producto.id_producto] === true);
}

function exigirDisponibilidadProducto_(producto, habilitados) {
  if (!productoDisponibleEnApertura_(producto, habilitados)) {
    lanzar_('Producto no disponible para esta apertura: "' + producto.id_producto + '".', 409);
  }
}

function productosHabilitadosEnApertura_(ss, aperturaId) {
  var resultado = Object.create(null);
  if (!limpiar_(aperturaId) || !ss.getSheetByName(HOJAS.APERTURA_PRODUCTOS)) return resultado;
  var hoja = leerHoja_(ss, HOJAS.APERTURA_PRODUCTOS);
  exigirColumnas_(hoja, COLUMNAS_APERTURA_PRODUCTOS.slice(0, 3));
  var vistos = Object.create(null);
  hoja.filas.forEach(function (fila) {
    var registro = filaAObjeto_(hoja, fila);
    if (limpiar_(registro.apertura_id) !== aperturaId) return;
    var id = limpiar_(registro.producto_id);
    if (!id || vistos[id]) lanzar_('Relacion apertura-producto duplicada o invalida.', 409);
    vistos[id] = true;
    resultado[id] = limpiar_(registro.habilitado).toUpperCase() === 'SI';
  });
  return resultado;
}

function listarProductosPorAperturaAdmin_(aperturaId) {
  verificarDestinoFase78Test_();
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  aperturaId = limpiar_(aperturaId);
  obtenerAperturaEnHoja_(leerHoja_(ss, HOJAS.APERTURAS), aperturaId);
  var habilitados = productosHabilitadosEnApertura_(ss, aperturaId);
  return listarProductosAdmin_().filter(function (p) { return p.tipo_disponibilidad === 'POR_APERTURA'; })
    .map(function (p) {
      return { producto_id: p.id_producto, nombre: p.nombre, activo: p.activo, habilitado: habilitados[p.id_producto] === true };
    });
}

function configurarProductoPorAperturaAdmin_(body) {
  verificarDestinoFase78Test_();
  exigirIdempotencyKey_(body.idempotency_key);
  var entrada = {
    apertura_id: limpiar_(body.apertura_id), producto_id: limpiar_(body.producto_id),
    habilitado: body.habilitado, habilitado_esperado: body.habilitado_esperado,
    responsable: limpiar_(body.responsable)
  };
  if (!/^APE-\d{8}$/.test(entrada.apertura_id) || !/^PROD-[A-Za-z0-9-]{1,80}$/.test(entrada.producto_id) ||
      typeof entrada.habilitado !== 'boolean' || typeof entrada.habilitado_esperado !== 'boolean' || !entrada.responsable) {
    lanzar_('Configuracion apertura-producto invalida.', 400);
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) lanzar_('El backend TEST esta ocupado.', 503);
  try {
    return ejecutarIdempotenteBajoLock_('configurarProductoPorAperturaAdmin', body.idempotency_key, entrada, function () {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var lista = listarProductosPorAperturaAdmin_(entrada.apertura_id);
      var producto = lista.filter(function (p) { return p.producto_id === entrada.producto_id; })[0];
      if (!producto) lanzar_('El producto no es POR_APERTURA.', 400);
      if (entrada.habilitado && producto.activo !== 'SI') lanzar_('No se puede habilitar un producto inactivo.', 409);
      if (producto.habilitado !== entrada.habilitado_esperado) lanzar_('La disponibilidad cambio. Actualiza y vuelve a intentar.', 409);
      var hoja = leerHoja_(ss, HOJAS.APERTURA_PRODUCTOS);
      var indice = -1;
      hoja.filas.forEach(function (fila, i) {
        if (limpiar_(fila[col_(hoja, 'apertura_id')]) === entrada.apertura_id &&
            limpiar_(fila[col_(hoja, 'producto_id')]) === entrada.producto_id) indice = i;
      });
      var registro = indice < 0 ? {} : filaAObjeto_(hoja, hoja.filas[indice]);
      registro.apertura_id = entrada.apertura_id;
      registro.producto_id = entrada.producto_id;
      registro.habilitado = entrada.habilitado ? 'SI' : 'NO';
      registro.actualizado_por = entrada.responsable;
      registro.actualizado_en = marcaIso_(new Date());
      if (indice < 0) agregarFila_(hoja, registro);
      else hoja.sheet.getRange(indice + 2, 1, 1, hoja.headers.length).setValues([
        hoja.headers.map(function (campo) { return registro[campo] === undefined ? '' : registro[campo]; })
      ]);
      SpreadsheetApp.flush();
      var actual = listarProductosPorAperturaAdmin_(entrada.apertura_id);
      if (actual.filter(function (p) { return p.producto_id === entrada.producto_id; })[0].habilitado !== entrada.habilitado) {
        lanzar_('Readback de disponibilidad no coincide.', 409);
      }
      return { apertura_id: entrada.apertura_id, productos: actual };
    });
  } finally { lock.releaseLock(); }
}

/** Readback privado completo del maestro/relacion y huellas de las demas hojas. */
function obtenerCatalogoOperativoTest_() {
  verificarDestinoFase78Test_();
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var nombres = ss.getSheets().map(function(sheet) { return sheet.getName(); });
  return {
    entorno: 'TEST', sheet_nombre: ss.getName(),
    hojas: nombres.map(function (nombre) {
      if (!ss.getSheetByName(nombre)) return { nombre: nombre, existe: false, headers: [], registros: [] };
      var hoja = leerHoja_(ss, nombre);
      return { nombre: nombre, existe: true, headers: hoja.headers,
        registros: hoja.filas.map(function (fila) { return serializarRegistroF78_(filaAObjeto_(hoja, fila)); }) };
    }),
    integridad: ss.getSheets().map(function (sheet) {
      var valores = sheet.getDataRange().getValues();
      return { nombre: sheet.getName(), filas: Math.max(0, sheet.getLastRow() - 1), huella: hashPayload_(valores) };
    })
  };
}

/** Migracion aditiva TEST: backup antes de escribir, sin tocar IDs ni snapshots. */
function prepararDisponibilidadProductosTest_() {
  verificarDestinoFase78Test_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) lanzar_('El backend TEST esta ocupado.', 503);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var hoja = leerHoja_(ss, HOJAS.PRODUCTOS);
    var ids = Object.create(null);
    if (hoja.headers.some(function (h, i) { return !h || hoja.headers.indexOf(h) !== i; })) lanzar_('Headers PRODUCTOS ambiguos.', 409);
    hoja.filas.forEach(function (fila) {
      var p = filaAObjeto_(hoja, fila);
      if (!limpiar_(p.id_producto)) return;
      if (ids[p.id_producto]) lanzar_('ID de producto duplicado.', 409);
      ids[p.id_producto] = true;
      if (['REGULAR', 'POR_APERTURA'].indexOf(tipoDisponibilidadProducto_(p.tipo_disponibilidad)) === -1) lanzar_('Tipo de disponibilidad invalido.', 409);
    });
    var relacion = ss.getSheetByName(HOJAS.APERTURA_PRODUCTOS);
    var headersRelacion = relacion && relacion.getLastColumn() > 0
      ? relacion.getRange(1, 1, 1, relacion.getLastColumn()).getValues()[0].map(limpiar_) : [];
    if (headersRelacion.some(function (h, i) { return !h || headersRelacion.indexOf(h) !== i; })) lanzar_('Headers APERTURA_PRODUCTOS ambiguos.', 409);
    var tipoCol = hoja.mapa.tipo_disponibilidad;
    var faltantes = hoja.filas.some(function (fila) {
      return limpiar_(fila[col_(hoja, 'id_producto')]) && (tipoCol === undefined || !limpiar_(fila[tipoCol]));
    });
    var cambios = tipoCol === undefined || faltantes || !relacion ||
      COLUMNAS_APERTURA_PRODUCTOS.some(function (h) { return headersRelacion.indexOf(h) < 0; });
    if (cambios) ss.copy('BACKUP TEST DISPONIBILIDAD ' + marca_(new Date()).replace(/[: ]/g, '-'));
    var extension = asegurarColumnasAditivas_(hoja, ['tipo_disponibilidad']);
    hoja = leerHoja_(ss, HOJAS.PRODUCTOS);
    var normalizadas = 0;
    hoja.filas.forEach(function (fila, i) {
      if (limpiar_(fila[col_(hoja, 'id_producto')]) && !limpiar_(fila[col_(hoja, 'tipo_disponibilidad')])) {
        hoja.sheet.getRange(i + 2, col_(hoja, 'tipo_disponibilidad') + 1).setValue('REGULAR');
        normalizadas++;
      }
    });
    if (!relacion) relacion = ss.insertSheet(HOJAS.APERTURA_PRODUCTOS);
    if (relacion.getLastColumn() === 0) {
      relacion.getRange(1, 1, 1, COLUMNAS_APERTURA_PRODUCTOS.length).setValues([COLUMNAS_APERTURA_PRODUCTOS]);
      relacion.setFrozenRows(1);
    } else asegurarColumnasAditivas_(leerHoja_(ss, HOJAS.APERTURA_PRODUCTOS), COLUMNAS_APERTURA_PRODUCTOS);
    SpreadsheetApp.flush();
    return { entorno: 'TEST', backup_creado: cambios, agregadas: extension.agregadas,
      normalizadas: normalizadas, readback: obtenerCatalogoOperativoTest_() };
  } finally { lock.releaseLock(); }
}

// ============================== ENRUTADO HTTP ==================================

/**
 * GET: acciones de solo lectura para admin (requieren token).
 *   ?action=listarPedidos&token=...
 *   ?action=obtenerPedido&id_pedido=PED-...&token=...
 */
function doGet(e) {
  try {
    validarConfig_();
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || '';

    switch (action) {
      case 'listarProductos':
        // Publico: catalogo para la tienda. No requiere token.
        return jsonOk_({ productos: listarProductos_(params.apertura_id) });
      case 'listarProductosPorAperturaAdmin':
        exigirToken_(params.token);
        validarEntornoTestFase78_();
        return jsonOk_({ productos: listarProductosPorAperturaAdmin_(params.apertura_id) });
      case 'obtenerCatalogoOperativoTest':
        exigirToken_(params.token);
        validarEntornoTestFase78_();
        return jsonOk_(obtenerCatalogoOperativoTest_());
      case 'listarPedidos':
        exigirToken_(params.token);
        return jsonOk_({ pedidos: listarPedidos_() });
      case 'obtenerPedido':
        exigirToken_(params.token);
        return jsonOk_(obtenerPedido_(params.id_pedido));
      case 'verificarContratoPedidosF9Test':
        exigirToken_(params.token);
        return jsonOk_(verificarContratoPedidosF9Test());
      case 'listarAperturas':
        exigirToken_(params.token);
        validarEntornoTestCalendario_();
        return jsonOk_({ aperturas: listarAperturas_() });
      case 'obtenerApertura':
        exigirToken_(params.token);
        validarEntornoTestCalendario_();
        return jsonOk_(obtenerApertura_(params.apertura_id));
      case 'obtenerCapacidadesFase3b':
        exigirToken_(params.token);
        validarEntornoTestCalendario_();
        return jsonOk_(obtenerCapacidadesFase3b_());
      case 'obtenerVentaPresencial':
        exigirToken_(params.token);
        validarEntornoTestVentas_();
        return jsonOk_(obtenerVentaPresencial_(params.venta_id));
      case 'listarVentasPorApertura':
        exigirToken_(params.token);
        validarEntornoTestVentas_();
        return jsonOk_({ ventas: listarVentasPorApertura_(params.apertura_id) });
      case 'obtenerResumenApertura':
        exigirToken_(params.token);
        validarEntornoTestVentas_();
        return jsonOk_(obtenerResumenApertura_(params.apertura_id));
      case 'verificarDestinoE2EFase56':
        exigirToken_(params.token);
        validarEntornoTestVentas_();
        return jsonOk_(verificarDestinoE2EFase56_());
      case 'obtenerEstadoE2EFase56':
        exigirToken_(params.token);
        validarEntornoTestVentas_();
        return jsonOk_(obtenerEstadoE2EFase56_(params.apertura_id, params.producto_ids));
      case 'obtenerEvidenciaVentaE2EFase56':
        exigirToken_(params.token);
        validarEntornoTestVentas_();
        return jsonOk_(obtenerEvidenciaVentaE2EFase56_(params.venta_id));
      case 'verificarDestinoFase78Test':
        exigirToken_(params.token);
        validarEntornoTestFase78_();
        return jsonOk_(verificarDestinoFase78Test_());
      case 'obtenerEsquemaFase78Test':
        exigirToken_(params.token);
        validarEntornoTestFase78_();
        return jsonOk_(obtenerEsquemaFase78Test_());
      case 'listarFamiliasProductoAdmin':
        exigirToken_(params.token);
        return jsonOk_(listarFamiliasProductoAdmin_());
      case 'obtenerFamiliaProductoAdmin':
        exigirToken_(params.token);
        return jsonOk_(obtenerFamiliaProductoAdmin_(params.familia_id));
      case 'auditarMapaFamiliasSku':
        exigirToken_(params.token);
        return jsonOk_(auditarMapaFamiliasSkuAdmin_(params));
      case 'listarCompras':
        exigirToken_(params.token);
        validarEntornoTestFase78_();
        return jsonOk_({ compras: listarCompras_(params.desde, params.hasta) });
      case 'obtenerCompra':
        exigirToken_(params.token);
        validarEntornoTestFase78_();
        return jsonOk_(obtenerCompra_(params.compra_id));
      case 'listarGastosExtra':
        exigirToken_(params.token);
        validarEntornoTestFase78_();
        return jsonOk_({ gastos: listarGastosExtra_(params.desde, params.hasta) });
      case 'obtenerGastoExtra':
        exigirToken_(params.token);
        validarEntornoTestFase78_();
        return jsonOk_(obtenerGastoExtra_(params.gasto_id));
      case 'listarHistorialCostos':
        exigirToken_(params.token);
        validarEntornoTestFase78_();
        return jsonOk_({ historial: listarHistorialCostos_(params.producto_id, params.desde, params.hasta) });
      case 'listarMovimientosStockAdmin':
        exigirToken_(params.token);
        validarEntornoTestFase78_();
        return jsonOk_({ movimientos: listarMovimientosStockAdmin_(params.producto_id, params.desde, params.hasta) });
      case 'listarProductosAdmin':
        exigirToken_(params.token);
        validarEntornoTestFase78_();
        return jsonOk_({ productos: listarProductosAdmin_() });
      case 'obtenerReportesFase78':
        exigirToken_(params.token);
        validarEntornoTestFase78_();
        return jsonOk_(obtenerReportesFase78_(params));
      case 'obtenerCajaCompra':
        exigirToken_(params.token);
        validarEntornoTestFase78_();
        return jsonOk_(obtenerCajaCompra_());
      case 'obtenerPropuestaAbastecimiento':
        exigirToken_(params.token);
        validarEntornoTestFase78_();
        return jsonOk_(obtenerPropuestaAbastecimiento_(params.presupuesto));
      case 'obtenerEvidenciaPilotoTest':
        exigirToken_(params.token);
        validarEntornoTestFase78_();
        return jsonOk_(obtenerEvidenciaPilotoTest_(params));
      default:
        return jsonError_('Accion GET no reconocida: "' + action + '".', 400);
    }
  } catch (err) {
    return jsonError_(err.message || String(err), err.codigo || 500);
  }
}

/**
 * POST: crear pedido (publico) y acciones admin (requieren token).
 * Body JSON: { action, token?, ... }
 */
function doPost(e) {
  try {
    validarConfig_();
    var body = parseBody_(e);
    var action = body.action || '';

    switch (action) {
      case 'crearPedido':
        return jsonOk_(crearPedido_(body));
      case 'prepararGranelTest':
        exigirToken_(body.token);
        return jsonOk_(prepararGranelTest_());
      case 'prepararFixturePedidoV2Test':
      case 'confirmarPedidoV2Test':
      case 'cancelarPedidoV2Test':
      case 'reasignarPedidoV2Test':
      case 'obtenerOperacionV2Test':
      case 'obtenerAsignacionesPedidoV2Test':
      case 'verificarOperacionV2Test':
      case 'configurarFixtureC5Test':
      case 'reconciliarFixtureC5Test':
      case 'recuperarMovimientoParcialC5Test':
      case 'cleanupFixturesC5Test':
        exigirToken_(body.token);
        return jsonOk_(ejecutarAccionDurableC5Test_(action, body));
      case 'prepararDisponibilidadProductosTest':
        exigirToken_(body.token);
        validarEntornoTestFase78_();
        return jsonOk_(prepararDisponibilidadProductosTest_());
      case 'configurarProductoPorAperturaAdmin':
        exigirToken_(body.token);
        validarEntornoTestFase78_();
        return jsonOk_(configurarProductoPorAperturaAdmin_(body));
      case 'actualizarEstadoPedido':
        exigirToken_(body.token);
        return jsonOk_(actualizarEstadoPedido_(body));
      case 'cancelarPedido':
        exigirToken_(body.token);
        return jsonOk_(cancelarPedido_(body));
      case 'prepararValidacionEstadosPedidosTest':
        exigirToken_(body.token);
        return jsonOk_(prepararValidacionEstadosPedidosTest());
      case 'crearApertura':
        exigirToken_(body.token);
        validarEntornoTestCalendario_();
        return jsonOk_(crearApertura_(body));
      case 'actualizarApertura':
        exigirToken_(body.token);
        validarEntornoTestCalendario_();
        return jsonOk_(actualizarApertura_(body));
      case 'cambiarEstadoApertura':
        exigirToken_(body.token);
        validarEntornoTestCalendario_();
        return jsonOk_(cambiarEstadoApertura_(body));
      case 'crearVentaPresencial':
        exigirToken_(body.token);
        validarEntornoTestVentas_();
        return jsonOk_(crearVentaPresencial_(body));
      case 'prepararEsquemaFase78Test':
        exigirToken_(body.token);
        validarEntornoTestFase78_();
        return jsonOk_(prepararEsquemaFase78Test_());
      case 'crearBackupPilotoTest':
        exigirToken_(body.token);
        validarEntornoTestFase78_();
        return jsonOk_(crearBackupPilotoTest_(body));
      case 'crearFamiliaProductoAdmin':
        exigirToken_(body.token);
        return jsonOk_(mutarFamiliaProductoAdmin_(body, true));
      case 'actualizarFamiliaProductoAdmin':
        exigirToken_(body.token);
        return jsonOk_(mutarFamiliaProductoAdmin_(body, false));
      case 'crearCompra':
        exigirToken_(body.token);
        validarEntornoTestFase78_();
        return jsonOk_(crearCompra_(body));
      case 'crearGastoExtra':
        exigirToken_(body.token);
        validarEntornoTestFase78_();
        return jsonOk_(crearGastoExtra_(body));
      case 'registrarCajaCompra':
        exigirToken_(body.token);
        validarEntornoTestFase78_();
        return jsonOk_(registrarCajaCompra_(body));
      case 'actualizarProductoAdmin':
        exigirToken_(body.token);
        validarEntornoTestFase78_();
        return jsonOk_(actualizarProductoAdmin_(body));
      case 'crearProductoAdmin':
        exigirToken_(body.token);
        validarEntornoTestFase78_();
        return jsonOk_(crearProductoAdmin_(body));
      case 'ajustarStockAdmin':
        exigirToken_(body.token);
        validarEntornoTestFase78_();
        return jsonOk_(ajustarStockAdmin_(body));
      default:
        return jsonError_('Accion POST no reconocida: "' + action + '".', 400);
    }
  } catch (err) {
    return jsonError_(err.message || String(err), err.codigo || 500);
  }
}

// ============================== ACCIONES =======================================

function construirPayloadCanonicoCreacionPedido_(body) {
  var nombreCliente = limpiar_(body.nombre_cliente);
  var telefono = limpiar_(body.telefono);
  var formaPago = limpiar_(body.forma_pago);
  var observaciones = limpiar_(body.observaciones);
  var carrito = body.carrito;

  if (!nombreCliente) lanzar_('Falta nombre_cliente.', 400);
  if (!telefono) lanzar_('Falta telefono.', 400);
  if (!carrito || !carrito.length) lanzar_('El carrito esta vacio.', 400);
  exigirIdempotencyKey_(body.idempotency_key);

  var lineas = carrito.map(function (item, indice) {
    item = item || {};
    var idProducto = limpiar_(item.id_producto);
    var cantidad = Number(item.cantidad);
    if (typeof item.cantidad !== 'number' || !isFinite(cantidad)) lanzar_('Cantidad invalida.', 400);
    if (!idProducto) lanzar_('Item ' + (indice + 1) + ': falta id_producto.', 400);
    if (!(cantidad > 0)) lanzar_('Item "' + idProducto + '": cantidad invalida.', 400);
    return { id_producto: idProducto, cantidad: cantidad };
  });
  lineas.sort(function (a, b) {
    if (a.id_producto < b.id_producto) return -1;
    if (a.id_producto > b.id_producto) return 1;
    return a.cantidad - b.cantidad;
  });

  return {
    version: 1,
    nombre_cliente: nombreCliente,
    telefono: telefono,
    forma_pago: formaPago,
    observaciones: observaciones,
    apertura_id: limpiar_(body.apertura_id),
    origen_pedido: limpiar_(body.origen_pedido),
    carrito: lineas
  };
}

function construirPlanCreacionPedido_(ss, payload, ahora) {
  exigirContratoPedidosF9Test_(ss);
  var contextoApertura = validarPedidoAnticipadoTest_(ss, payload, ahora);
  var prod = leerHoja_(ss, HOJAS.PRODUCTOS);
  var habilitados = productosHabilitadosEnApertura_(ss, payload.apertura_id);

  var cId = col_(prod, 'id_producto');
  var cActivo = col_(prod, 'activo');
  var cNombre = col_(prod, 'nombre');
  var cUnidad = col_(prod, 'unidad_medida');
  var cDecimal = col_(prod, 'permite_decimal');
  var cPrecio = col_(prod, 'precio_venta');
  var cStock = col_(prod, 'stock_actual');

  var indicePorId = {};
  for (var i = 0; i < prod.filas.length; i++) {
    var idP = limpiar_(prod.filas[i][cId]);
    if (idP) indicePorId[idP] = i;
  }

  var lineas = [];
  var total = 0;
  for (var k = 0; k < payload.carrito.length; k++) {
    var item = payload.carrito[k];
    var idProd = item.id_producto;
    var cant = item.cantidad;
    var fi = indicePorId[idProd];
    if (fi === undefined) lanzar_('Producto no existe: "' + idProd + '".', 400);

    var fila = prod.filas[fi];
    if (String(fila[cActivo]).toUpperCase() !== 'SI') {
      lanzar_('Producto inactivo: "' + idProd + '".', 400);
    }
    exigirDisponibilidadProducto_(filaAObjeto_(prod, fila), habilitados);
    var calculo = calcularLineaVenta_(filaAObjeto_(prod, fila), cant, false);
    var stockActual = parseNum_(fila[cStock]);
    var acumulada = lineas.filter(function (l) { return l.id_producto === idProd; }).reduce(function (n,l) { return n + l.cantidad; }, 0);
    if (redondearStock_(calculo.cantidad + acumulada) > stockActual) lanzar_('Stock insuficiente de "' + idProd + '".', 409);
    var precio = calculo.precio_unitario;
    var subtotal = calculo.subtotal;
    total += subtotal;
    lineas.push({
      id_producto: idProd,
      nombre_producto: limpiar_(fila[cNombre]),
      unidad_medida: limpiar_(fila[cUnidad]),
      cantidad: calculo.cantidad,
      modo_venta: calculo.modo_venta, gramos_solicitados: calculo.gramos_solicitados,
      gramos_referencia: calculo.gramos_referencia, gramos_unidad_stock: calculo.gramos_unidad_stock,
      precio_unitario: precio,
      subtotal: subtotal,
      stock_disponible_al_crear: stockActual
    });
  }
  total = redondear2_(total);

  var pedidos = leerHoja_(ss, HOJAS.PEDIDOS);
  var idPedido = generarIdUnicoEnHoja_(pedidos, 'id_pedido', 'PED', ahora);
  var cabecera = {
    id_pedido: idPedido,
    fecha_hora: marca_(ahora),
    canal: CANAL_WEB,
    id_cliente: '',
    nombre_cliente: payload.nombre_cliente,
    telefono: payload.telefono,
    total: total,
    estado_pedido: 'recibido',
    estado_pago: 'pendiente',
    forma_pago: payload.forma_pago,
    observaciones: payload.observaciones,
    vendedor_admin: '',
    fecha_entrega: '',
    apertura_id: contextoApertura.apertura_id,
    origen_pedido: contextoApertura.origen_pedido
  };
  var detalles = lineas.map(function (linea) {
    return {
      id_pedido: idPedido,
      id_producto: linea.id_producto,
      nombre_producto: linea.nombre_producto,
      cantidad: linea.cantidad,
      modo_venta: linea.modo_venta === 'GRANEL' ? 'GRANEL' : undefined, gramos_solicitados: linea.gramos_solicitados,
      gramos_referencia: linea.gramos_referencia, gramos_unidad_stock: linea.gramos_unidad_stock,
      unidad_medida: linea.unidad_medida,
      precio_unitario: linea.precio_unitario,
      subtotal: linea.subtotal
    };
  });
  return {
    version: 1,
    tipo_operacion: 'CREAR_PEDIDO',
    actor: 'web-publico',
    id_pedido: idPedido,
    payload: payload,
    cabecera: cabecera,
    detalles: detalles,
    resultado: {
      id_pedido: idPedido,
      total: total,
      estado_pedido: 'recibido',
      items: lineas.length,
      apertura_id: contextoApertura.apertura_id || undefined,
      origen_pedido: contextoApertura.origen_pedido || undefined,
      resumen: lineas.map(function (linea) {
        return {
          id_producto: linea.id_producto,
          nombre_producto: linea.nombre_producto,
          gramos_solicitados: linea.gramos_solicitados,
          cantidad: linea.cantidad,
          precio_unitario: linea.precio_unitario,
          subtotal: linea.subtotal
        };
      })
    }
  };
}

function filasCreacionPorPedido_(hoja, idPedido) {
  var cPedido = col_(hoja, 'id_pedido');
  var filas = [];
  for (var i = 0; i < hoja.filas.length; i++) {
    if (limpiar_(hoja.filas[i][cPedido]) === idPedido) {
      filas.push(filaAObjeto_(hoja, hoja.filas[i]));
    }
  }
  return filas;
}

function registroCreacionCoincide_(actual, esperado, camposNumero) {
  camposNumero = camposNumero || [];
  var numericos = {};
  camposNumero.forEach(function (campo) { numericos[campo] = true; });
  var campos = Object.keys(esperado);
  for (var i = 0; i < campos.length; i++) {
    var campo = campos[i];
    if (numericos[campo]) {
      if (!numerosOperacionIguales_(actual[campo], esperado[campo])) return false;
    } else if (limpiar_(actual[campo]) !== limpiar_(esperado[campo])) {
      return false;
    }
  }
  return true;
}

function cabeceraCreacionCoincide_(actual, esperada) {
  var campos = [
    'id_pedido', 'canal', 'id_cliente', 'nombre_cliente', 'telefono', 'total',
    'estado_pedido', 'estado_pago', 'forma_pago', 'observaciones',
    'vendedor_admin', 'fecha_entrega', 'apertura_id', 'origen_pedido'
  ];
  var subconjunto = {};
  campos.forEach(function (campo) { subconjunto[campo] = esperada[campo]; });
  return Boolean(actual.fecha_hora) &&
    registroCreacionCoincide_(actual, subconjunto, ['total']);
}

function analizarDetallesCreacion_(actuales, esperados) {
  var usados = [];
  var incompatibles = [];
  for (var i = 0; i < actuales.length; i++) {
    var encontrado = -1;
    for (var e = 0; e < esperados.length; e++) {
      if (usados[e]) continue;
      if (registroCreacionCoincide_(actuales[i], esperados[e],
          ['cantidad', 'precio_unitario', 'subtotal'])) {
        encontrado = e;
        break;
      }
    }
    if (encontrado === -1) incompatibles.push(actuales[i]);
    else usados[encontrado] = true;
  }
  var faltantes = [];
  for (var j = 0; j < esperados.length; j++) {
    if (!usados[j]) faltantes.push(esperados[j]);
  }
  return { faltantes: faltantes, incompatibles: incompatibles };
}

function diagnosticarCreacionPedido_(ss, operacion) {
  var plan = parseJsonOperacion_(operacion.snapshot_json, 'snapshot');
  if (!plan || plan.tipo_operacion !== 'CREAR_PEDIDO' ||
      plan.id_pedido !== operacion.id_pedido || !plan.cabecera ||
      !Array.isArray(plan.detalles) || !plan.resultado) {
    return { estado: 'REQUIERE_REVISION', diferencias: ['snapshot_creacion_invalido'] };
  }
  var pedidos = leerHoja_(ss, HOJAS.PEDIDOS);
  var cabeceras = filasCreacionPorPedido_(pedidos, plan.id_pedido);
  var detalles = filasCreacionPorPedido_(
    leerHoja_(ss, HOJAS.DETALLE_PEDIDOS), plan.id_pedido
  );
  var diferencias = [];
  var cabeceraCorrecta = cabeceras.length === 1 &&
    cabeceraCreacionCoincide_(cabeceras[0], plan.cabecera);
  if (cabeceras.length > 1) diferencias.push('cabecera_duplicada');
  else if (cabeceras.length === 1 && !cabeceraCorrecta) diferencias.push('cabecera_incompatible');
  if (cabeceras.length === 0 && detalles.length) diferencias.push('detalle_sin_cabecera');

  var analisis = analizarDetallesCreacion_(detalles, plan.detalles);
  if (analisis.incompatibles.length) diferencias.push('detalle_incompatible_o_extra');
  if (diferencias.length) {
    return { estado: 'REQUIERE_REVISION', diferencias: diferencias };
  }
  var completa = cabeceraCorrecta && analisis.faltantes.length === 0 &&
    detalles.length === plan.detalles.length;
  return {
    estado: completa ? 'CONSISTENTE_COMPLETADA' : 'PUEDE_CONTINUAR',
    diferencias: [],
    cabecera_existe: cabeceras.length === 1,
    detalles_faltantes: analisis.faltantes.length
  };
}

function aplicarPlanCreacionPedido_(ss, operacion, plan) {
  var diagnostico = diagnosticarCreacionPedido_(ss, operacion);
  if (diagnostico.estado === 'REQUIERE_REVISION') {
    lanzarOperacionPedido_('CONSISTENCIA_INCIERTA',
      'Los datos existentes de la creación divergen del snapshot durable.', 500);
  }
  if (diagnostico.estado === 'CONSISTENTE_COMPLETADA') return;

  var pedidos = leerHoja_(ss, HOJAS.PEDIDOS);
  if (!diagnostico.cabecera_existe) agregarCabeceraPedidoCreacion_(pedidos, plan.cabecera);

  var detalles = leerHoja_(ss, HOJAS.DETALLE_PEDIDOS);
  var actuales = filasCreacionPorPedido_(detalles, plan.id_pedido);
  var analisis = analizarDetallesCreacion_(actuales, plan.detalles);
  if (analisis.incompatibles.length) {
    lanzarOperacionPedido_('CONSISTENCIA_INCIERTA',
      'Existe un detalle incompatible con el snapshot durable.', 500);
  }
  for (var i = 0; i < analisis.faltantes.length; i++) {
    agregarFila_(detalles, analisis.faltantes[i]);
  }
  SpreadsheetApp.flush();
}

function resultadoCreacionPedido_(operacion, plan) {
  var resultado = {};
  Object.keys(plan.resultado).forEach(function (campo) {
    resultado[campo] = plan.resultado[campo];
  });
  resultado.operacion_id = operacion.operacion_id;
  resultado.idempotency_key = operacion.idempotency_key;
  resultado.consistencia = 'VERIFICADA_POR_READBACK';
  return resultado;
}

function completarCreacionPedido_(ss, operacion, plan) {
  var resultado = resultadoCreacionPedido_(operacion, plan);
  try {
    actualizarOperacionPedido_(ss, operacion.operacion_id, {
      estado_operacion: 'COMPLETADA',
      paso: 'READBACK_OK',
      resultado_json: JSON.stringify(resultado),
      error_codigo: '',
      error_detalle: ''
    });
  } catch (err) {
    lanzarOperacionPedido_('OPERACION_EN_CURSO',
      'El pedido coincide, pero no se pudo cerrar el registro durable. Reintenta con la misma key. ' +
      detalleOperacionError_(err), 503);
  }
  return resultado;
}

function registrarFalloCreacionPedido_(ss, operacion, err) {
  var diagnostico;
  try {
    diagnostico = diagnosticarCreacionPedido_(ss, operacion);
  } catch (diagError) {
    diagnostico = {
      estado: 'REQUIERE_REVISION',
      diferencias: ['fallo_diagnostico:' + detalleOperacionError_(diagError)]
    };
  }
  if (diagnostico.estado === 'CONSISTENTE_COMPLETADA') {
    var plan = parseJsonOperacion_(operacion.snapshot_json, 'snapshot');
    completarCreacionPedido_(ss, operacion, plan);
    lanzarOperacionPedido_('OPERACION_EN_CURSO',
      'La creación fue reconciliada después de un fallo. Reintenta con la misma key.', 503);
  }
  var estadoDurable = diagnostico.estado === 'PUEDE_CONTINUAR'
    ? 'APLICANDO' : 'REQUIERE_REVISION';
  var codigo = codigoOperacionError_(err, 'FALLO_CREACION');
  try {
    actualizarOperacionPedido_(ss, operacion.operacion_id, {
      estado_operacion: estadoDurable,
      paso: diagnostico.estado === 'PUEDE_CONTINUAR'
        ? 'INTERRUMPIDA_RECUPERABLE' : 'READBACK_INCONSISTENTE',
      error_codigo: codigo,
      error_detalle: detalleOperacionError_(err) +
        (diagnostico.diferencias.length ? ' | ' + diagnostico.diferencias.join(',') : '')
    });
  } catch (registroError) {
    lanzarOperacionPedido_('CONSISTENCIA_INCIERTA',
      'Error original: ' + codigo + ' - ' + detalleOperacionError_(err) +
      '. Además no se pudo registrar el estado durable: ' +
      detalleOperacionError_(registroError), 500);
  }
  if (estadoDurable === 'REQUIERE_REVISION') {
    lanzarOperacionPedido_('OPERACION_REQUIERE_REVISION',
      'La creación no coincide con el plan durable.', 409);
  }
  lanzarOperacionPedido_('OPERACION_EN_CURSO',
    'La creación quedó recuperable. Reintenta con la misma idempotency_key.', 503);
}

function continuarCreacionPedido_(ss, operacion) {
  exigirContratoPedidosF9Test_(ss);
  var plan = parseJsonOperacion_(operacion.snapshot_json, 'snapshot');
  try {
    operacion = actualizarOperacionPedido_(ss, operacion.operacion_id, {
      estado_operacion: 'APLICANDO',
      paso: 'APLICANDO_CREACION',
      error_codigo: '',
      error_detalle: ''
    });
    aplicarPlanCreacionPedido_(ss, operacion, plan);
    var diagnostico = diagnosticarCreacionPedido_(ss, operacion);
    if (diagnostico.estado !== 'CONSISTENTE_COMPLETADA') {
      lanzarOperacionPedido_('CONSISTENCIA_INCIERTA',
        'El readback final de la creación no coincide con el plan.', 500);
    }
    return completarCreacionPedido_(ss, operacion, plan);
  } catch (err) {
    return registrarFalloCreacionPedido_(ss, operacion, err);
  }
}

function ejecutarCreacionPedidoDurable_(ss, payload, key) {
  var hash = hashPayload_(payload);
  var existente = buscarOperacionPedidoPor_(ss, 'idempotency_key', key);
  if (existente) {
    if (existente.tipo_operacion !== 'CREAR_PEDIDO' || existente.payload_hash !== hash) {
      lanzarOperacionPedido_('IDEMPOTENCY_CONFLICT',
        'La idempotency_key ya fue usada con otra operación o payload.', 409);
    }
    var estado = exigirEstadoOperacionPedidoValido_(existente.estado_operacion);
    if (estado === 'COMPLETADA') {
      return parseJsonOperacion_(existente.resultado_json, 'resultado');
    }
    if (estado === 'REQUIERE_REVISION') {
      lanzarOperacionPedido_('OPERACION_REQUIERE_REVISION',
        'La creación requiere reconciliación administrativa.', 409);
    }
    return continuarCreacionPedido_(ss, existente);
  }

  var ahora = new Date();
  var plan = construirPlanCreacionPedido_(ss, payload, ahora);
  var diario = leerHoja_(ss, HOJAS.OPERACIONES_PEDIDOS);
  var operacionId = generarIdUnicoEnHoja_(diario, 'operacion_id', 'OPE', ahora);
  var marca = marcaIso_(ahora);
  var operacion = persistirOperacionPreparada_(ss, {
    operacion_id: operacionId,
    idempotency_key: key,
    tipo_operacion: 'CREAR_PEDIDO',
    id_pedido: plan.id_pedido,
    actor: plan.actor,
    estado_operacion: 'PREPARADA',
    paso: 'INTENCION_PERSISTIDA',
    payload_hash: hash,
    snapshot_json: JSON.stringify(plan),
    resultado_json: '',
    error_codigo: '',
    error_detalle: '',
    creado_en: marca,
    actualizado_en: marca
  });
  return continuarCreacionPedido_(ss, operacion);
}

/**
 * Crea un pedido recibido mediante el diario durable. Precios y validaciones
 * permanecen del lado servidor; crear no reserva stock ni genera movimientos.
 */
function crearPedido_(body) {
  var payload = construirPayloadCanonicoCreacionPedido_(body);

  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // hasta 30s esperando el turno
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    validarDestinoOperacionesPedidosTest_(ss);
    return ejecutarCreacionPedidoDurable_(ss, payload, limpiar_(body.idempotency_key));
  } finally {
    lock.releaseLock();
  }
}

/**
 * Catalogo publico para la tienda: productos con activo = SI, en el orden de la
 * hoja PRODUCTOS. NO expone precio_costo ni margen_pct.
 */
function listarProductos_(aperturaId) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var prod = leerHoja_(ss, HOJAS.PRODUCTOS);
  aperturaId = limpiar_(aperturaId);
  if (aperturaId) obtenerAperturaEnHoja_(leerHoja_(ss, HOJAS.APERTURAS), aperturaId);
  var habilitados = productosHabilitadosEnApertura_(ss, aperturaId);

  var cId = col_(prod, 'id_producto');
  var cActivo = col_(prod, 'activo');
  var cNombre = col_(prod, 'nombre');
  var cCategoria = col_(prod, 'categoria');
  var cPrioridad = col_(prod, 'prioridad');
  var cUnidad = col_(prod, 'unidad_medida');
  var cDecimal = col_(prod, 'permite_decimal');
  var cPaso = col_(prod, 'paso_venta');
  var cPrecio = col_(prod, 'precio_venta');
  var cStock = col_(prod, 'stock_actual');
  var cStockMin = col_(prod, 'stock_minimo');
  var cImagen = col_(prod, 'imagen_url');

  var productos = [];
  for (var i = 0; i < prod.filas.length; i++) {
    var fila = prod.filas[i];
    var idProd = limpiar_(fila[cId]);
    if (!idProd) continue;
    if (String(fila[cActivo]).toUpperCase() !== 'SI') continue;
    var producto = filaAObjeto_(prod, fila);
    if (!productoDisponibleEnApertura_(producto, habilitados)) continue;

    productos.push({
      id_producto: idProd,
      tipo_disponibilidad: tipoDisponibilidadProducto_(producto.tipo_disponibilidad),
      modo_venta: modoVenta_(producto), gramos_referencia: Number(producto.gramos_referencia) || 0,
      gramos_unidad_stock: Number(producto.gramos_unidad_stock) || 0,
      nombre: limpiar_(fila[cNombre]),
      categoria: limpiar_(fila[cCategoria]),
      prioridad: limpiar_(fila[cPrioridad]),
      unidad_medida: limpiar_(fila[cUnidad]),
      permite_decimal: limpiar_(fila[cDecimal]),
      paso_venta: parseNum_(fila[cPaso]),
      precio_venta: parseNum_(fila[cPrecio]),
      stock_actual: parseNum_(fila[cStock]),
      stock_minimo: parseNum_(fila[cStockMin]),
      imagen_url: limpiar_(fila[cImagen])
    });
  }
  return productos;
}

/**
 * Devuelve todos los pedidos, del mas reciente al mas antiguo.
 */
function listarPedidos_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var ped = leerHoja_(ss, HOJAS.PEDIDOS);
  var pedidos = [];
  for (var i = 0; i < ped.filas.length; i++) {
    var obj = filaAObjeto_(ped, ped.filas[i]);
    if (limpiar_(obj.id_pedido)) pedidos.push(obj);
  }
  // Mas reciente primero: ordenar por fecha_hora desc; fallback al orden inverso.
  pedidos.reverse();
  pedidos.sort(function (a, b) {
    return String(b.fecha_hora).localeCompare(String(a.fecha_hora));
  });
  return pedidos;
}

/**
 * Devuelve un pedido + su detalle.
 */
function obtenerPedido_(idPedido) {
  idPedido = limpiar_(idPedido);
  if (!idPedido) lanzar_('Falta id_pedido.', 400);

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var ped = leerHoja_(ss, HOJAS.PEDIDOS);
  var cPed = col_(ped, 'id_pedido');

  var cabecera = null;
  for (var i = 0; i < ped.filas.length; i++) {
    if (limpiar_(ped.filas[i][cPed]) === idPedido) {
      cabecera = filaAObjeto_(ped, ped.filas[i]);
      break;
    }
  }
  if (!cabecera) lanzar_('Pedido no encontrado: "' + idPedido + '".', 404);

  var det = leerHoja_(ss, HOJAS.DETALLE_PEDIDOS);
  var cDetPed = col_(det, 'id_pedido');
  var detalle = [];
  for (var j = 0; j < det.filas.length; j++) {
    if (limpiar_(det.filas[j][cDetPed]) === idPedido) {
      detalle.push(filaAObjeto_(det, det.filas[j]));
    }
  }
  return { pedido: cabecera, detalle: detalle };
}

function impactoTransicionPedido_(actual, siguiente) {
  var permitidas = {
    recibido: ['pendiente', 'cancelado'],
    pendiente: ['listo', 'cancelado'],
    listo: ['entregado', 'cancelado'],
    entregado: [],
    cancelado: []
  };
  if (!permitidas[actual]) lanzar_('Estado actual de pedido no reconocido: "' + actual + '".', 409);
  if (actual === siguiente) return 'ninguno';
  if (permitidas[actual].indexOf(siguiente) === -1) {
    lanzar_('Transicion de pedido no permitida: ' + actual + ' -> ' + siguiente + '.', 409);
  }
  if (actual === 'recibido' && siguiente === 'pendiente') return 'descuenta';
  if ((actual === 'pendiente' || actual === 'listo') && siguiente === 'cancelado') return 'devuelve';
  return 'ninguno';
}

function lanzarOperacionPedido_(codigo, mensaje, status) {
  var err = new Error(codigo + ': ' + mensaje);
  err.codigo_operacion = codigo;
  err.codigo = status || 409;
  throw err;
}

function codigoOperacionError_(err, fallback) {
  return limpiar_(err && err.codigo_operacion) || fallback || 'FALLO_APLICACION';
}

function detalleOperacionError_(err) {
  return limpiar_(err && err.message || err || 'Error no identificado.').slice(0, 500);
}

function parseNumeroDurableEstricto_(valor) {
  var numero;
  if (typeof valor === 'number') {
    numero = valor;
  } else if (typeof valor === 'string') {
    if (valor !== valor.trim() || !/^[+-]?\d+(?:\.\d+)?$/.test(valor)) {
      return { valido: false, valor: null };
    }
    numero = Number(valor);
  } else {
    return { valido: false, valor: null };
  }
  return isFinite(numero)
    ? { valido: true, valor: numero }
    : { valido: false, valor: null };
}

function numerosOperacionIguales_(a, b) {
  var numeroA = parseNumeroDurableEstricto_(a);
  var numeroB = parseNumeroDurableEstricto_(b);
  return numeroA.valido && numeroB.valido &&
    Math.abs(numeroA.valor - numeroB.valor) < 0.000001;
}

function estadoOperacionPedidoValido_(valor) {
  if (typeof valor !== 'string') return null;
  return ESTADOS_OPERACION_PEDIDO.indexOf(valor) === -1 ? null : valor;
}

function exigirEstadoOperacionPedidoValido_(valor) {
  var estado = estadoOperacionPedidoValido_(valor);
  if (!estado) {
    lanzarOperacionPedido_('CONSISTENCIA_INCIERTA',
      'El pedido tiene una operación durable con estado inválido o desconocido.', 409);
  }
  return estado;
}

function planOperacionTieneNumerosValidos_(plan) {
  if (!plan || !Array.isArray(plan.productos)) return false;
  for (var i = 0; i < plan.productos.length; i++) {
    var producto = plan.productos[i] || {};
    if (!parseNumeroDurableEstricto_(producto.cantidad_movimiento).valido ||
        !parseNumeroDurableEstricto_(producto.stock_anterior).valido ||
        !parseNumeroDurableEstricto_(producto.stock_resultante).valido) {
      return false;
    }
  }
  return true;
}

function parseJsonOperacion_(texto, etiqueta) {
  try {
    return JSON.parse(String(texto || ''));
  } catch (err) {
    lanzarOperacionPedido_('OPERACION_REQUIERE_REVISION',
      'El ' + etiqueta + ' durable no es legible.', 409);
  }
}

function serializarOperacionPedido_(hoja, indice) {
  var obj = filaAObjeto_(hoja, hoja.filas[indice]);
  return {
    indice: indice,
    operacion_id: limpiar_(obj.operacion_id),
    idempotency_key: limpiar_(obj.idempotency_key),
    tipo_operacion: limpiar_(obj.tipo_operacion),
    id_pedido: limpiar_(obj.id_pedido),
    actor: limpiar_(obj.actor),
    estado_operacion: obj.estado_operacion,
    paso: limpiar_(obj.paso),
    payload_hash: limpiar_(obj.payload_hash),
    snapshot_json: String(obj.snapshot_json || ''),
    resultado_json: String(obj.resultado_json || ''),
    error_codigo: limpiar_(obj.error_codigo),
    error_detalle: limpiar_(obj.error_detalle),
    creado_en: limpiar_(obj.creado_en),
    actualizado_en: limpiar_(obj.actualizado_en)
  };
}

function buscarOperacionPedidoPor_(ss, campo, valor) {
  var hoja = leerHoja_(ss, HOJAS.OPERACIONES_PEDIDOS);
  exigirColumnas_(hoja, COLUMNAS_OPERACIONES_PEDIDOS);
  var indice = buscarFila_(hoja, col_(hoja, campo), valor);
  return indice === -1 ? null : serializarOperacionPedido_(hoja, indice);
}

function actualizarOperacionPedido_(ss, operacionId, cambios) {
  var hoja = leerHoja_(ss, HOJAS.OPERACIONES_PEDIDOS);
  var indice = buscarFila_(hoja, col_(hoja, 'operacion_id'), operacionId);
  if (indice === -1) {
    lanzarOperacionPedido_('CONSISTENCIA_INCIERTA',
      'No se encontró la intención durable de la operación.', 500);
  }
  var obj = filaAObjeto_(hoja, hoja.filas[indice]);
  Object.keys(cambios).forEach(function (campo) { obj[campo] = cambios[campo]; });
  obj.actualizado_en = marcaIso_(new Date());
  escribirObjetoEnFila_(hoja, indice, obj);
  SpreadsheetApp.flush();
  var leida = buscarOperacionPedidoPor_(ss, 'operacion_id', operacionId);
  var cambioNoConfirmado = !leida || Object.keys(cambios).some(function (campo) {
    return String(leida[campo] === undefined ? '' : leida[campo]) !==
      String(cambios[campo] === undefined ? '' : cambios[campo]);
  });
  if (cambioNoConfirmado) {
    lanzarOperacionPedido_('CONSISTENCIA_INCIERTA',
      'El cambio de estado durable no superó el readback.', 500);
  }
  return leida;
}

function persistirOperacionPreparada_(ss, registro) {
  try {
    var hoja = leerHoja_(ss, HOJAS.OPERACIONES_PEDIDOS);
    agregarFila_(hoja, registro);
    SpreadsheetApp.flush();
    var leida = buscarOperacionPedidoPor_(ss, 'operacion_id', registro.operacion_id);
    if (!leida || leida.estado_operacion !== 'PREPARADA' ||
        leida.idempotency_key !== registro.idempotency_key ||
        leida.tipo_operacion !== registro.tipo_operacion ||
        leida.id_pedido !== registro.id_pedido || leida.actor !== registro.actor ||
        leida.payload_hash !== registro.payload_hash ||
        leida.snapshot_json !== registro.snapshot_json) {
      lanzarOperacionPedido_('CONSISTENCIA_INCIERTA',
        'La intención durable no superó el readback.', 500);
    }
    return leida;
  } catch (err) {
    lanzarOperacionPedido_('CONSISTENCIA_INCIERTA',
      'No se pudo confirmar la intención durable; no se modificó stock ni pedido. ' +
      detalleOperacionError_(err), 500);
  }
}

function exigirSinOperacionPedidoBloqueante_(ss, idPedido, operacionIdPermitida) {
  var hoja = leerHoja_(ss, HOJAS.OPERACIONES_PEDIDOS);
  var cPedido = col_(hoja, 'id_pedido');
  var cEstado = col_(hoja, 'estado_operacion');
  var cOperacion = col_(hoja, 'operacion_id');
  for (var i = 0; i < hoja.filas.length; i++) {
    if (limpiar_(hoja.filas[i][cPedido]) !== idPedido) continue;
    if (limpiar_(hoja.filas[i][cOperacion]) === operacionIdPermitida) continue;
    var estado = exigirEstadoOperacionPedidoValido_(hoja.filas[i][cEstado]);
    if (estado === 'COMPLETADA') continue;
    if (estado === 'REQUIERE_REVISION') {
      lanzarOperacionPedido_('OPERACION_REQUIERE_REVISION',
        'El pedido tiene una operación incierta pendiente de reconciliación.', 409);
    }
    if (estado === 'PREPARADA' || estado === 'APLICANDO') {
      lanzarOperacionPedido_('OPERACION_EN_CURSO',
        'El pedido tiene una operación durable pendiente.', 409);
    }
  }
}

function obtenerPedidoParaOperacion_(ss, idPedido) {
  var pedidos = leerHoja_(ss, HOJAS.PEDIDOS);
  var indice = buscarFila_(pedidos, col_(pedidos, 'id_pedido'), idPedido);
  if (indice === -1) lanzar_('Pedido no encontrado: "' + idPedido + '".', 404);
  return {
    hoja: pedidos,
    indice: indice,
    estado: limpiar_(pedidos.filas[indice][col_(pedidos, 'estado_pedido')]),
    actor: pedidos.headers.indexOf('vendedor_admin') === -1
      ? '' : limpiar_(pedidos.filas[indice][pedidos.headers.indexOf('vendedor_admin')])
  };
}

function prepararPlanStockPedido_(ss, tipo, idPedido, actor, estadoAnterior, ahora) {
  var signo = tipo === 'CONFIRMAR_PEDIDO' ? -1 : 1;
  var necesitaStock = tipo === 'CONFIRMAR_PEDIDO' ||
    (tipo === 'CANCELAR_PEDIDO' && (estadoAnterior === 'pendiente' || estadoAnterior === 'listo'));
  if (!necesitaStock) return [];

  var detalle = leerHoja_(ss, HOJAS.DETALLE_PEDIDOS);
  var cPedido = col_(detalle, 'id_pedido');
  var cProducto = col_(detalle, 'id_producto');
  var cCantidad = col_(detalle, 'cantidad');
  var cantidades = {};
  for (var i = 0; i < detalle.filas.length; i++) {
    if (limpiar_(detalle.filas[i][cPedido]) !== idPedido) continue;
    var productoId = limpiar_(detalle.filas[i][cProducto]);
    var cantidad = parseNum_(detalle.filas[i][cCantidad]);
    if (!productoId || !(cantidad > 0)) {
      lanzarOperacionPedido_('DETALLE_INVALIDO',
        'El pedido contiene una línea de detalle inválida.', 409);
    }
    cantidades[productoId] = redondearStock_((cantidades[productoId] || 0) + cantidad);
  }
  var ids = Object.keys(cantidades).sort();
  if (!ids.length) {
    lanzarOperacionPedido_('DETALLE_INVALIDO',
      'El pedido no tiene detalle para mover stock.', 409);
  }

  exigirSinBloqueoDurableC5_(ss, idPedido, ids);

  var productos = leerHoja_(ss, HOJAS.PRODUCTOS);
  var cId = col_(productos, 'id_producto');
  var cStock = col_(productos, 'stock_actual');
  var porId = {};
  for (var p = 0; p < productos.filas.length; p++) {
    porId[limpiar_(productos.filas[p][cId])] = p;
  }
  return ids.map(function (id) {
    var indice = porId[id];
    if (indice === undefined) {
      lanzarOperacionPedido_('PRODUCTO_NO_EXISTE',
        'Un producto del pedido ya no existe: "' + id + '".', 409);
    }
    var anterior = parseNum_(productos.filas[indice][cStock]);
    var resultante = redondearStock_(anterior + signo * cantidades[id]);
    if (resultante < 0) {
      lanzarOperacionPedido_('STOCK_INSUFICIENTE',
        'Stock insuficiente de "' + id + '". El pedido sigue recibido.', 409);
    }
    return {
      id_producto: id,
      cantidad: cantidades[id],
      stock_anterior: anterior,
      stock_resultante: resultante,
      movimiento_id: generarIdOperacion_('MOV', ahora),
      tipo_movimiento: signo < 0 ? 'salida' : 'devolucion',
      origen: signo < 0 ? 'pedido' : 'cancelacion',
      cantidad_movimiento: signo * cantidades[id],
      actor: actor
    };
  });
}

function construirPlanOperacionPedido_(ss, tipo, idPedido, actor, key, ahora) {
  var pedido = obtenerPedidoParaOperacion_(ss, idPedido);
  var objetivo;
  if (tipo === 'CONFIRMAR_PEDIDO') {
    if (pedido.estado !== 'recibido') {
      lanzarOperacionPedido_('TRANSICION_NO_PERMITIDA',
        'Confirmar exige que el pedido esté recibido.', 409);
    }
    objetivo = 'pendiente';
  } else {
    if (pedido.estado === 'entregado' || pedido.estado === 'cancelado' ||
        ['recibido', 'pendiente', 'listo'].indexOf(pedido.estado) === -1) {
      lanzarOperacionPedido_('TRANSICION_NO_PERMITIDA',
        'El pedido no se puede cancelar desde su estado actual.', 409);
    }
    objetivo = 'cancelado';
  }
  return {
    version: 1,
    tipo_operacion: tipo,
    idempotency_key: key,
    id_pedido: idPedido,
    actor: actor,
    estado_anterior: pedido.estado,
    estado_objetivo: objetivo,
    productos: prepararPlanStockPedido_(ss, tipo, idPedido, actor, pedido.estado, ahora)
  };
}

function movimientoOperacionCoincide_(obj, esperado, operacionId, idPedido) {
  return limpiar_(obj.operacion_id) === operacionId &&
    limpiar_(obj.id_movimiento || obj.movimiento_id) === esperado.movimiento_id &&
    limpiar_(obj.id_producto || obj.producto_id) === esperado.id_producto &&
    limpiar_(obj.id_origen || obj.referencia_id) === idPedido &&
    limpiar_(obj.tipo || obj.tipo_movimiento) === esperado.tipo_movimiento &&
    numerosOperacionIguales_(obj.cantidad, esperado.cantidad_movimiento) &&
    numerosOperacionIguales_(obj.stock_anterior, esperado.stock_anterior) &&
    numerosOperacionIguales_(obj.stock_resultante, esperado.stock_resultante) &&
    limpiar_(obj.usuario) === esperado.actor;
}

function movimientosDeOperacion_(ss, operacionId) {
  var hoja = leerHoja_(ss, HOJAS.MOVIMIENTOS_STOCK);
  var cOperacion = col_(hoja, 'operacion_id');
  var encontrados = [];
  for (var i = 0; i < hoja.filas.length; i++) {
    if (limpiar_(hoja.filas[i][cOperacion]) === operacionId) {
      encontrados.push(filaAObjeto_(hoja, hoja.filas[i]));
    }
  }
  return { hoja: hoja, filas: encontrados };
}

function diagnosticarOperacionPedido_(ss, operacion) {
  var plan = parseJsonOperacion_(operacion.snapshot_json, 'snapshot');
  var diferencias = [];
  var puedeContinuar = true;
  var completa = true;
  if (!planOperacionTieneNumerosValidos_(plan)) {
    puedeContinuar = false;
    completa = false;
    diferencias.push('numeros_snapshot_invalidos');
  }
  var pedido = obtenerPedidoParaOperacion_(ss, plan.id_pedido);
  if (pedido.estado !== plan.estado_anterior && pedido.estado !== plan.estado_objetivo) {
    puedeContinuar = false;
    diferencias.push('estado_pedido_fuera_del_plan');
  }
  if (pedido.estado !== plan.estado_objetivo) completa = false;
  if (pedido.estado === plan.estado_objetivo && pedido.actor !== plan.actor) {
    completa = false;
    if (pedido.actor) {
      puedeContinuar = false;
      diferencias.push('actor_pedido_fuera_del_plan');
    }
  }

  var productos = leerHoja_(ss, HOJAS.PRODUCTOS);
  var cId = col_(productos, 'id_producto');
  var cStock = col_(productos, 'stock_actual');
  var stockPorId = {};
  for (var i = 0; i < productos.filas.length; i++) {
    stockPorId[limpiar_(productos.filas[i][cId])] = productos.filas[i][cStock];
  }
  for (var p = 0; p < plan.productos.length; p++) {
    var esperado = plan.productos[p];
    var actual = stockPorId[esperado.id_producto];
    if (actual === undefined || (!numerosOperacionIguales_(actual, esperado.stock_anterior) &&
        !numerosOperacionIguales_(actual, esperado.stock_resultante))) {
      puedeContinuar = false;
      diferencias.push('stock_fuera_del_plan:' + esperado.id_producto);
    }
    if (!numerosOperacionIguales_(actual, esperado.stock_resultante)) completa = false;
  }

  var movimientos = movimientosDeOperacion_(ss, operacion.operacion_id).filas;
  var conteoMovimientos = {};
  if (movimientos.length > plan.productos.length) {
    puedeContinuar = false;
    diferencias.push('movimientos_duplicados_o_extra');
  }
  for (var m = 0; m < movimientos.length; m++) {
    var movimiento = movimientos[m];
    var esperadoMov = null;
    for (var e = 0; e < plan.productos.length; e++) {
      if (plan.productos[e].movimiento_id ===
          limpiar_(movimiento.id_movimiento || movimiento.movimiento_id)) {
        esperadoMov = plan.productos[e];
        break;
      }
    }
    if (!esperadoMov || !movimientoOperacionCoincide_(
        movimiento, esperadoMov, operacion.operacion_id, plan.id_pedido)) {
      puedeContinuar = false;
      diferencias.push('movimiento_fuera_del_plan');
    } else {
      conteoMovimientos[esperadoMov.movimiento_id] =
        (conteoMovimientos[esperadoMov.movimiento_id] || 0) + 1;
      if (conteoMovimientos[esperadoMov.movimiento_id] > 1) {
        puedeContinuar = false;
        diferencias.push('movimiento_duplicado:' + esperadoMov.movimiento_id);
      }
    }
  }
  for (var q = 0; q < plan.productos.length; q++) {
    if (conteoMovimientos[plan.productos[q].movimiento_id] !== 1) completa = false;
  }

  return {
    estado: completa && puedeContinuar
      ? 'CONSISTENTE_COMPLETADA'
      : puedeContinuar ? 'PUEDE_CONTINUAR' : 'REQUIERE_REVISION',
    pedido_actual: pedido.estado,
    movimientos_encontrados: movimientos.length,
    movimientos_esperados: plan.productos.length,
    diferencias: diferencias
  };
}

function aplicarPlanOperacionPedido_(ss, operacion, plan) {
  if (!planOperacionTieneNumerosValidos_(plan)) {
    lanzarOperacionPedido_('CONSISTENCIA_INCIERTA',
      'El snapshot durable contiene valores numéricos inválidos.', 500);
  }
  exigirSinBloqueoDurableC5_(ss, plan.id_pedido, plan.productos.map(function (p) { return p.id_producto; }));
  var productos = leerHoja_(ss, HOJAS.PRODUCTOS);
  var cId = col_(productos, 'id_producto');
  var cStock = col_(productos, 'stock_actual');
  var porId = {};
  for (var i = 0; i < productos.filas.length; i++) {
    porId[limpiar_(productos.filas[i][cId])] = i;
  }
  for (var p = 0; p < plan.productos.length; p++) {
    var cambio = plan.productos[p];
    var indice = porId[cambio.id_producto];
    if (indice === undefined) {
      lanzarOperacionPedido_('CONSISTENCIA_INCIERTA',
        'Producto ausente durante la aplicación.', 500);
    }
    var actual = productos.filas[indice][cStock];
    if (numerosOperacionIguales_(actual, cambio.stock_resultante)) continue;
    if (!numerosOperacionIguales_(actual, cambio.stock_anterior)) {
      lanzarOperacionPedido_('CONSISTENCIA_INCIERTA',
        'Stock fuera del snapshot para "' + cambio.id_producto + '".', 500);
    }
    productos.sheet.getRange(indice + 2, cStock + 1).setValue(cambio.stock_resultante);
    productos.filas[indice][cStock] = cambio.stock_resultante;
  }

  var movimientos = movimientosDeOperacion_(ss, operacion.operacion_id);
  for (var m = 0; m < plan.productos.length; m++) {
    var esperado = plan.productos[m];
    var existentes = movimientos.filas.filter(function (fila) {
      return limpiar_(fila.id_movimiento || fila.movimiento_id) === esperado.movimiento_id;
    });
    if (existentes.length === 1 && movimientoOperacionCoincide_(
        existentes[0], esperado, operacion.operacion_id, plan.id_pedido)) continue;
    if (existentes.length !== 0) {
      lanzarOperacionPedido_('CONSISTENCIA_INCIERTA',
        'Movimiento existente incompatible con el plan.', 500);
    }
    registrarMovimiento_(movimientos.hoja, {
      id_movimiento: esperado.movimiento_id,
      operacion_id: operacion.operacion_id,
      tipo: esperado.tipo_movimiento,
      origen: esperado.origen,
      id_origen: plan.id_pedido,
      id_producto: esperado.id_producto,
      cantidad: esperado.cantidad_movimiento,
      stock_anterior: esperado.stock_anterior,
      stock_resultante: esperado.stock_resultante,
      usuario: esperado.actor,
      observaciones: (plan.tipo_operacion === 'CONFIRMAR_PEDIDO'
        ? 'Confirmacion pedido ' : 'Cancelacion pedido ') + plan.id_pedido,
      ahora: new Date()
    });
  }

  var pedido = obtenerPedidoParaOperacion_(ss, plan.id_pedido);
  if (pedido.estado !== plan.estado_objetivo || pedido.actor !== plan.actor) {
    if (pedido.estado !== plan.estado_anterior) {
      if (pedido.estado !== plan.estado_objetivo || pedido.actor) {
        lanzarOperacionPedido_('CONSISTENCIA_INCIERTA',
          'Estado o actor del pedido fuera del snapshot.', 500);
      }
    }
    var filaNueva = pedido.hoja.filas[pedido.indice].slice();
    filaNueva[col_(pedido.hoja, 'estado_pedido')] = plan.estado_objetivo;
    var cActor = pedido.hoja.headers.indexOf('vendedor_admin');
    if (cActor !== -1) filaNueva[cActor] = plan.actor;
    pedido.hoja.sheet.getRange(
      pedido.indice + 2, 1, 1, pedido.hoja.headers.length
    ).setValues([filaNueva]);
  }
  SpreadsheetApp.flush();
}

function resultadoOperacionPedido_(operacion, plan) {
  return {
    operacion_id: operacion.operacion_id,
    idempotency_key: operacion.idempotency_key,
    tipo_operacion: plan.tipo_operacion,
    id_pedido: plan.id_pedido,
    estado_pedido: plan.estado_objetivo,
    actor: plan.actor,
    movimientos: plan.productos.length,
    consistencia: 'VERIFICADA_POR_READBACK'
  };
}

function completarOperacionPedido_(ss, operacion, plan) {
  var resultado = resultadoOperacionPedido_(operacion, plan);
  try {
    actualizarOperacionPedido_(ss, operacion.operacion_id, {
      estado_operacion: 'COMPLETADA',
      paso: 'READBACK_OK',
      resultado_json: JSON.stringify(resultado),
      error_codigo: '',
      error_detalle: ''
    });
  } catch (err) {
    lanzarOperacionPedido_('OPERACION_EN_CURSO',
      'Los datos coinciden, pero no se pudo cerrar el registro durable. Reintenta con la misma key. ' +
      detalleOperacionError_(err), 503);
  }
  return resultado;
}

function registrarFalloOperacionPedido_(ss, operacion, err) {
  var diagnostico;
  try {
    diagnostico = diagnosticarOperacionPedido_(ss, operacion);
  } catch (diagError) {
    diagnostico = {
      estado: 'REQUIERE_REVISION',
      diferencias: ['fallo_diagnostico:' + detalleOperacionError_(diagError)]
    };
  }
  if (diagnostico.estado === 'CONSISTENTE_COMPLETADA') {
    completarOperacionPedido_(
      ss, operacion, parseJsonOperacion_(operacion.snapshot_json, 'snapshot')
    );
    lanzarOperacionPedido_('OPERACION_EN_CURSO',
      'La operación fue reconciliada después de un fallo. Reintenta con la misma key para obtener el resultado.',
      503);
  }

  var estadoDurable = diagnostico.estado === 'PUEDE_CONTINUAR'
    ? 'APLICANDO' : 'REQUIERE_REVISION';
  var codigo = codigoOperacionError_(err, 'FALLO_APLICACION');
  try {
    actualizarOperacionPedido_(ss, operacion.operacion_id, {
      estado_operacion: estadoDurable,
      paso: diagnostico.estado === 'PUEDE_CONTINUAR'
        ? 'INTERRUMPIDA_RECUPERABLE' : 'READBACK_INCONSISTENTE',
      error_codigo: codigo,
      error_detalle: detalleOperacionError_(err) +
        (diagnostico.diferencias.length
          ? ' | ' + diagnostico.diferencias.join(',') : '')
    });
  } catch (registroError) {
    lanzarOperacionPedido_('CONSISTENCIA_INCIERTA',
      'Error original: ' + codigo + ' - ' + detalleOperacionError_(err) +
      '. Además no se pudo registrar el estado durable: ' +
      detalleOperacionError_(registroError), 500);
  }
  if (estadoDurable === 'REQUIERE_REVISION') {
    lanzarOperacionPedido_('OPERACION_REQUIERE_REVISION',
      'El readback no coincide con el plan durable. Se bloquearon nuevas mutaciones.', 409);
  }
  lanzarOperacionPedido_('OPERACION_EN_CURSO',
    'La operación quedó recuperable. Reintenta con la misma idempotency_key.', 503);
}

function continuarOperacionPedido_(ss, operacion) {
  var plan = parseJsonOperacion_(operacion.snapshot_json, 'snapshot');
  try {
    operacion = actualizarOperacionPedido_(ss, operacion.operacion_id, {
      estado_operacion: 'APLICANDO',
      paso: 'APLICANDO_CAMBIOS',
      error_codigo: '',
      error_detalle: ''
    });
    aplicarPlanOperacionPedido_(ss, operacion, plan);
    var diagnostico = diagnosticarOperacionPedido_(ss, operacion);
    if (diagnostico.estado !== 'CONSISTENTE_COMPLETADA') {
      lanzarOperacionPedido_('CONSISTENCIA_INCIERTA',
        'El readback final no coincide con el plan.', 500);
    }
    return completarOperacionPedido_(ss, operacion, plan);
  } catch (err) {
    return registrarFalloOperacionPedido_(ss, operacion, err);
  }
}

function ejecutarOperacionPedidoDurable_(ss, tipo, idPedido, actor, key) {
  exigirIdempotencyKey_(key);
  var payload = {
    tipo_operacion: tipo,
    id_pedido: idPedido,
    actor: actor,
    estado_objetivo: tipo === 'CONFIRMAR_PEDIDO' ? 'pendiente' : 'cancelado'
  };
  var hash = hashPayload_(payload);
  var existente = buscarOperacionPedidoPor_(ss, 'idempotency_key', key);
  if (existente) {
    if (existente.payload_hash !== hash || existente.tipo_operacion !== tipo ||
        existente.id_pedido !== idPedido) {
      lanzarOperacionPedido_('IDEMPOTENCY_CONFLICT',
        'La idempotency_key ya fue usada con otra operación o payload.', 409);
    }
    var estadoExistente = exigirEstadoOperacionPedidoValido_(existente.estado_operacion);
    if (estadoExistente === 'COMPLETADA') {
      return parseJsonOperacion_(existente.resultado_json, 'resultado');
    }
    if (estadoExistente === 'REQUIERE_REVISION') {
      lanzarOperacionPedido_('OPERACION_REQUIERE_REVISION',
        'La operación requiere reconciliación administrativa.', 409);
    }
    exigirSinOperacionPedidoBloqueante_(ss, idPedido, existente.operacion_id);
    return continuarOperacionPedido_(ss, existente);
  }

  exigirSinOperacionPedidoBloqueante_(ss, idPedido, '');
  var ahora = new Date();
  var plan = construirPlanOperacionPedido_(ss, tipo, idPedido, actor, key, ahora);
  var diario = leerHoja_(ss, HOJAS.OPERACIONES_PEDIDOS);
  var operacionId = generarIdUnicoEnHoja_(diario, 'operacion_id', 'OPE', ahora);
  var marca = marcaIso_(ahora);
  var operacion = persistirOperacionPreparada_(ss, {
    operacion_id: operacionId,
    idempotency_key: key,
    tipo_operacion: tipo,
    id_pedido: idPedido,
    actor: actor,
    estado_operacion: 'PREPARADA',
    paso: 'INTENCION_PERSISTIDA',
    payload_hash: hash,
    snapshot_json: JSON.stringify(plan),
    resultado_json: '',
    error_codigo: '',
    error_detalle: '',
    creado_en: marca,
    actualizado_en: marca
  });
  return continuarOperacionPedido_(ss, operacion);
}

/** Cambia estado/pago bajo lock; la confirmación usa diario durable TEST. */
function actualizarEstadoPedido_(body) {
  var idPedido = limpiar_(body.id_pedido);
  var estadoPedido = limpiar_(body.estado_pedido);
  var estadoPago = body.estado_pago === undefined ? null : limpiar_(body.estado_pago);
  var actor = limpiar_(body.actor) || 'legacy-admin'; // PROVISORIO_TEST
  if (!idPedido) lanzar_('Falta id_pedido.', 400);
  if (!estadoPedido) lanzar_('Falta estado_pedido.', 400);
  if (ESTADOS_PEDIDO.indexOf(estadoPedido) === -1) {
    lanzar_('estado_pedido invalido: "' + estadoPedido + '".', 400);
  }
  if (estadoPedido === 'cancelado') lanzar_('Usa cancelarPedido para cancelar.', 400);

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    validarDestinoOperacionesPedidosTest_(ss);
    var pedido = obtenerPedidoParaOperacion_(ss, idPedido);
    var key = limpiar_(body.idempotency_key);
    var operacionExistente = key
      ? buscarOperacionPedidoPor_(ss, 'idempotency_key', key)
      : null;
    if (operacionExistente) {
      return ejecutarOperacionPedidoDurable_(
        ss, 'CONFIRMAR_PEDIDO', idPedido, actor, key
      );
    }
    var impacto = impactoTransicionPedido_(pedido.estado, estadoPedido);
    if (pedido.estado !== estadoPedido && impacto === 'descuenta') {
      return ejecutarOperacionPedidoDurable_(
        ss, 'CONFIRMAR_PEDIDO', idPedido, actor, key
      );
    }

    exigirSinOperacionPedidoBloqueante_(ss, idPedido, '');
    var filaNueva = pedido.hoja.filas[pedido.indice].slice();
    if (pedido.estado !== estadoPedido) {
      filaNueva[col_(pedido.hoja, 'estado_pedido')] = estadoPedido;
      var cActor = pedido.hoja.headers.indexOf('vendedor_admin');
      if (cActor !== -1) filaNueva[cActor] = actor;
    }
    if (estadoPago !== null && estadoPago !== '') {
      filaNueva[col_(pedido.hoja, 'estado_pago')] = estadoPago;
    }
    pedido.hoja.sheet.getRange(
      pedido.indice + 2, 1, 1, pedido.hoja.headers.length
    ).setValues([filaNueva]);
    SpreadsheetApp.flush();
    return {
      id_pedido: idPedido,
      estado_pedido: estadoPedido,
      estado_pago: estadoPago !== null ? estadoPago : undefined,
      actor: actor,
      stock_actualizado: false
    };
  } finally {
    lock.releaseLock();
  }
}

/** Cancela mediante operación durable; recibido no genera movimientos. */
function cancelarPedido_(body) {
  var idPedido = limpiar_(body.id_pedido);
  var actor = limpiar_(body.actor) || 'legacy-admin'; // PROVISORIO_TEST
  if (!idPedido) lanzar_('Falta id_pedido.', 400);
  exigirIdempotencyKey_(body.idempotency_key);

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    validarDestinoOperacionesPedidosTest_(ss);
    var existente = buscarOperacionPedidoPor_(ss, 'idempotency_key', limpiar_(body.idempotency_key));
    if (!existente) {
      var pedido = obtenerPedidoParaOperacion_(ss, idPedido);
      if (pedido.estado === 'cancelado') {
        exigirSinOperacionPedidoBloqueante_(ss, idPedido, '');
        lanzarOperacionPedido_('IDEMPOTENCY_CONFLICT',
          'El pedido ya está cancelado y la idempotency_key no corresponde a su operación.', 409);
      }
      impactoTransicionPedido_(pedido.estado, 'cancelado');
    }
    return ejecutarOperacionPedidoDurable_(
      ss, 'CANCELAR_PEDIDO', idPedido, actor, limpiar_(body.idempotency_key)
    );
  } finally {
    lock.releaseLock();
  }
}

// ========================== VENTAS PRESENCIALES TEST =========================

/**
 * Preparacion MANUAL, aditiva e idempotente para Fase 5 + Fase 6 en TEST.
 * No crea hojas, no borra columnas ni datos y no cambia el orden existente.
 */
function prepararColumnasVentaPresencialTest() {
  validarConfig_();
  validarEntornoTestVentas_();

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) lanzar_('El backend TEST esta ocupado. Intenta nuevamente.', 503);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var requisitos = [
      { nombre: HOJAS.APERTURAS, columnas: COLUMNAS_APERTURAS },
      { nombre: HOJAS.PRODUCTOS, columnas: [
        'id_producto', 'activo', 'nombre', 'unidad_medida', 'permite_decimal',
        'paso_venta', 'precio_venta', 'stock_actual'
      ] },
      { nombre: HOJAS.PEDIDOS, columnas: [
        'apertura_id', 'estado_pedido', 'estado_pago', 'forma_pago', 'total'
      ] }
    ];
    var objetivos = [
      { nombre: HOJAS.VENTAS, columnas: COLUMNAS_VENTA_PRESENCIAL.VENTAS },
      { nombre: HOJAS.DETALLE_VENTAS, columnas: COLUMNAS_VENTA_PRESENCIAL.DETALLE_VENTAS },
      { nombre: HOJAS.MOVIMIENTOS_STOCK, columnas: COLUMNAS_VENTA_PRESENCIAL.MOVIMIENTOS_STOCK }
    ];
    var resultado = [];
    for (var r = 0; r < requisitos.length; r++) {
      var requerida = leerHoja_(ss, requisitos[r].nombre);
      exigirColumnas_(requerida, requisitos[r].columnas);
      resultado.push({
        hoja: requerida.sheet.getName(),
        revisadas: requisitos[r].columnas.slice(),
        agregadas: []
      });
    }
    for (var i = 0; i < objetivos.length; i++) {
      var hoja = leerHoja_(ss, objetivos[i].nombre);
      resultado.push(asegurarColumnasAditivas_(hoja, objetivos[i].columnas));
    }
    SpreadsheetApp.flush();
    return { entorno: 'TEST', hojas: resultado };
  } finally {
    lock.releaseLock();
  }
}

function crearVentaPresencial_(body) {
  exigirIdempotencyKey_(body.idempotency_key);
  var entrada = normalizarEntradaVentaPresencial_(body);

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) lanzar_('El backend TEST esta ocupado. Intenta nuevamente.', 503);
  try {
    return ejecutarIdempotenteBajoLock_(
      'crearVentaPresencial',
      body.idempotency_key,
      entrada,
      function () { return persistirVentaPresencial_(entrada); }
    );
  } finally {
    lock.releaseLock();
  }
}

function normalizarEntradaVentaPresencial_(body) {
  var aperturaId = limpiar_(body.apertura_id);
  var vendedor = limpiar_(body.vendedor);
  var formaPago = limpiar_(body.forma_pago);
  var observaciones = limpiar_(body.observaciones);
  var lineas = body.lineas;

  if (!/^APE-[0-9]{8}$/.test(aperturaId)) lanzar_('Falta una apertura_id valida.', 400);
  if (!vendedor || vendedor.length > 100) lanzar_('Falta un vendedor valido.', 400);
  if (observaciones.length > 500) lanzar_('Las observaciones superan 500 caracteres.', 400);
  if (['efectivo', 'transferencia', 'pendiente'].indexOf(formaPago) === -1) {
    lanzar_('forma_pago invalida.', 400);
  }
  if (!lineas || !Array.isArray(lineas) || !lineas.length || lineas.length > 100) {
    lanzar_('La venta debe incluir entre 1 y 100 productos.', 400);
  }

  var ids = {};
  var limpias = [];
  for (var i = 0; i < lineas.length; i++) {
    var linea = lineas[i] || {};
    var productoId = limpiar_(linea.producto_id);
    var cantidad = Number(linea.cantidad);
    if (!productoId || productoId.length > 100) lanzar_('Linea sin producto_id valido.', 400);
    if (ids[productoId]) lanzar_('Producto repetido: "' + productoId + '".', 400);
    if (!isFinite(cantidad) || !(cantidad > 0)) {
      lanzar_('Cantidad invalida para "' + productoId + '".', 400);
    }
    ids[productoId] = true;
    limpias.push({ producto_id: productoId, cantidad: cantidad });
  }

  return {
    apertura_id: aperturaId,
    vendedor: vendedor,
    forma_pago: formaPago,
    observaciones: observaciones,
    lineas: limpias
  };
}

function persistirVentaPresencial_(entrada) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  exigirSinBloqueoDurableC5_(ss, '', entrada.lineas.map(function (p) { return p.producto_id; }));
  var aperturas = leerHoja_(ss, HOJAS.APERTURAS);
  validarEncabezadosAperturas_(aperturas);
  var apertura = obtenerAperturaEnHoja_(aperturas, entrada.apertura_id).apertura;
  validarAperturaVentaPresencial_(apertura, new Date());

  var prod = leerHoja_(ss, HOJAS.PRODUCTOS);
  var habilitados = productosHabilitadosEnApertura_(ss, entrada.apertura_id);
  var ventas = leerHoja_(ss, HOJAS.VENTAS);
  var detalles = leerHoja_(ss, HOJAS.DETALLE_VENTAS);
  var movimientos = leerHoja_(ss, HOJAS.MOVIMIENTOS_STOCK);
  exigirColumnas_(ventas, COLUMNAS_VENTA_PRESENCIAL.VENTAS);
  exigirColumnas_(detalles, COLUMNAS_VENTA_PRESENCIAL.DETALLE_VENTAS);
  exigirColumnas_(movimientos, COLUMNAS_VENTA_PRESENCIAL.MOVIMIENTOS_STOCK);

  var cId = col_(prod, 'id_producto');
  var cActivo = col_(prod, 'activo');
  var cNombre = col_(prod, 'nombre');
  var cUnidad = col_(prod, 'unidad_medida');
  var cDecimal = col_(prod, 'permite_decimal');
  var cPaso = col_(prod, 'paso_venta');
  var cPrecio = col_(prod, 'precio_venta');
  var cStock = col_(prod, 'stock_actual');
  var indicePorId = {};
  for (var i = 0; i < prod.filas.length; i++) {
    var id = limpiar_(prod.filas[i][cId]);
    if (id) indicePorId[id] = i;
  }

  var lineas = [];
  var total = 0;
  for (var j = 0; j < entrada.lineas.length; j++) {
    var solicitada = entrada.lineas[j];
    var indice = indicePorId[solicitada.producto_id];
    if (indice === undefined) lanzar_('Producto no existe: "' + solicitada.producto_id + '".', 400);
    var fila = prod.filas[indice];
    if (limpiar_(fila[cActivo]).toUpperCase() !== 'SI') {
      lanzar_('Producto inactivo: "' + solicitada.producto_id + '".', 409);
    }
    exigirDisponibilidadProducto_(filaAObjeto_(prod, fila), habilitados);
    var cantidad = solicitada.cantidad;
    var calculo = calcularLineaVenta_(filaAObjeto_(prod, fila), cantidad);
    cantidad = calculo.cantidad;
    var stockAnterior = parseNum_(fila[cStock]);
    if (cantidad > stockAnterior) lanzar_('Stock insuficiente de "' + solicitada.producto_id + '".', 409);
    var precio = calculo.precio_unitario;
    var subtotal = calculo.subtotal;
    total += subtotal;
    lineas.push({
      filaProducto: indice,
      producto_id: solicitada.producto_id,
      nombre_producto: limpiar_(fila[cNombre]),
      cantidad: cantidad,
      modo_venta: calculo.modo_venta, gramos_solicitados: calculo.gramos_solicitados,
      gramos_referencia: calculo.gramos_referencia, gramos_unidad_stock: calculo.gramos_unidad_stock,
      unidad_medida: limpiar_(fila[cUnidad]),
      precio_unitario: precio,
      subtotal: subtotal,
      stock_anterior: stockAnterior,
      stock_resultante: redondearStock_(stockAnterior - cantidad)
    });
  }
  total = redondear2_(total);

  var ahora = new Date();
  var ventaId = generarIdOperacion_('VEN', ahora);
  var fechaHora = marca_(ahora);
  var auditoria = marcaIso_(ahora);
  var estadoPago = entrada.forma_pago === 'pendiente' ? 'pendiente_de_pago' : 'pagado';
  var ultimaFilaVentas = ventas.sheet.getLastRow();
  var ultimaFilaDetalles = detalles.sheet.getLastRow();
  var ultimaFilaMovimientos = movimientos.sheet.getLastRow();

  try {
    // Stock y movimiento se escriben como par; detalle despues; cabecera al final.
    // Si cualquier paso falla, el catch restaura stock y elimina filas agregadas.
    for (var s = 0; s < lineas.length; s++) {
      var ln = lineas[s];
      prod.sheet.getRange(ln.filaProducto + 2, cStock + 1).setValue(ln.stock_resultante);
      prod.filas[ln.filaProducto][cStock] = ln.stock_resultante;
      registrarMovimiento_(movimientos, {
        tipo: 'salida', origen: 'venta', id_origen: ventaId,
        id_producto: ln.producto_id, cantidad: -ln.cantidad,
        stock_anterior: ln.stock_anterior, stock_resultante: ln.stock_resultante,
        usuario: entrada.vendedor, observaciones: 'Venta presencial ' + ventaId,
        referencia_tipo: 'venta_presencial', apertura_id: entrada.apertura_id,
        ahora: ahora
      });
    }

    var detalleRespuesta = [];
    for (var d = 0; d < lineas.length; d++) {
      var item = lineas[d];
      var detalleId = ventaId + '-D' + ('00' + (d + 1)).slice(-3);
      var detalleObj = {
        detalle_id: detalleId, venta_id: ventaId, id_venta: ventaId,
        producto_id: item.producto_id, id_producto: item.producto_id,
        nombre_producto: item.nombre_producto, cantidad: item.cantidad,
        modo_venta: item.modo_venta, gramos_solicitados: item.gramos_solicitados,
        gramos_referencia: item.gramos_referencia, gramos_unidad_stock: item.gramos_unidad_stock,
        unidad_medida: item.unidad_medida, precio_unitario: item.precio_unitario,
        subtotal: item.subtotal
      };
      agregarFila_(detalles, detalleObj);
      detalleRespuesta.push({
        detalle_id: detalleId, venta_id: ventaId,
        producto_id: item.producto_id, nombre_producto: item.nombre_producto,
        modo_venta: item.modo_venta, gramos_solicitados: item.gramos_solicitados,
        gramos_referencia: item.gramos_referencia, gramos_unidad_stock: item.gramos_unidad_stock,
        cantidad: item.cantidad, unidad_medida: item.unidad_medida,
        precio_unitario: item.precio_unitario, subtotal: item.subtotal
      });
    }

    var venta = {
      venta_id: ventaId, id_venta: ventaId, fecha_hora: fechaHora,
      apertura_id: entrada.apertura_id, origen_venta: 'presencial', canal: 'presencial',
      vendedor: entrada.vendedor, total: total, estado_venta: 'vigente',
      estado_pago: estadoPago, forma_pago: entrada.forma_pago,
      observaciones: entrada.observaciones, creado_en: auditoria, actualizado_en: auditoria
    };
    agregarFila_(ventas, venta);
    SpreadsheetApp.flush();

    var ventaRespuesta = serializarVentaPresencial_(venta);
    return {
      venta: ventaRespuesta,
      detalle: detalleRespuesta,
      comanda: {
        venta_id: ventaId, fecha_hora: fechaHora, apertura_id: entrada.apertura_id,
        detalle: detalleRespuesta, total: total, estado_pago: estadoPago,
        estado_impresion: 'pendiente_de_impresion'
      }
    };
  } catch (err) {
    var rollbackOk = rollbackVentaPresencial_(
      prod, cStock, lineas, ventas.sheet, ultimaFilaVentas,
      detalles.sheet, ultimaFilaDetalles, movimientos.sheet, ultimaFilaMovimientos
    );
    if (!rollbackOk) {
      lanzar_('La venta no se completo y requiere revision manual en TEST.', 500);
    }
    throw err;
  }
}

function obtenerVentaPresencial_(ventaId) {
  ventaId = limpiar_(ventaId);
  if (!ventaId) lanzar_('Falta venta_id.', 400);
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var ventas = leerHoja_(ss, HOJAS.VENTAS);
  var detalles = leerHoja_(ss, HOJAS.DETALLE_VENTAS);
  var cVenta = colPrimera_(ventas, ['venta_id', 'id_venta']);
  var filaVenta = buscarFila_(ventas, cVenta, ventaId);
  if (filaVenta === -1) lanzar_('Venta no encontrada: "' + ventaId + '".', 404);
  var venta = serializarVentaPresencial_(filaAObjeto_(ventas, ventas.filas[filaVenta]));
  var cDetalleVenta = colPrimera_(detalles, ['venta_id', 'id_venta']);
  var detalle = [];
  for (var i = 0; i < detalles.filas.length; i++) {
    if (limpiar_(detalles.filas[i][cDetalleVenta]) === ventaId) {
      detalle.push(serializarDetalleVenta_(filaAObjeto_(detalles, detalles.filas[i])));
    }
  }
  return {
    venta: venta,
    detalle: detalle,
    comanda: {
      venta_id: venta.venta_id, fecha_hora: venta.fecha_hora,
      apertura_id: venta.apertura_id, detalle: detalle, total: venta.total,
      estado_pago: venta.estado_pago, estado_impresion: 'pendiente_de_impresion'
    }
  };
}

function listarVentasPorApertura_(aperturaId) {
  aperturaId = limpiar_(aperturaId);
  if (!/^APE-[0-9]{8}$/.test(aperturaId)) lanzar_('apertura_id invalida.', 400);
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var ventas = leerHoja_(ss, HOJAS.VENTAS);
  var cApertura = col_(ventas, 'apertura_id');
  var resultado = [];
  for (var i = 0; i < ventas.filas.length; i++) {
    if (limpiar_(ventas.filas[i][cApertura]) === aperturaId) {
      resultado.push(serializarVentaPresencial_(filaAObjeto_(ventas, ventas.filas[i])));
    }
  }
  resultado.reverse();
  return resultado;
}

function obtenerResumenApertura_(aperturaId) {
  aperturaId = limpiar_(aperturaId);
  if (!/^APE-[0-9]{8}$/.test(aperturaId)) lanzar_('apertura_id invalida.', 400);
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  obtenerAperturaEnHoja_(leerHoja_(ss, HOJAS.APERTURAS), aperturaId);
  var resumen = {
    apertura_id: aperturaId,
    total_pedidos_anticipados: 0, total_ventas_presenciales: 0, total_general: 0,
    cantidad_pedidos_anticipados: 0, cantidad_ventas_presenciales: 0,
    total_pendiente_pago: 0, cantidad_pendientes_pago: 0,
    total_cancelado: 0, cantidad_cancelados: 0, total_cobrado: 0,
    total_efectivo_esperado: 0, total_transferencia: 0,
    total_efectivo_al_retirar: 0, advertencias: []
  };

  var ventas = listarVentasPorApertura_(aperturaId);
  for (var v = 0; v < ventas.length; v++) {
    acumularResumenApertura_(resumen, 'venta_presencial', ventas[v].total,
      ventas[v].estado_venta, ventas[v].estado_pago, ventas[v].forma_pago);
  }

  var pedidos = leerHoja_(ss, HOJAS.PEDIDOS);
  var cApertura = col_(pedidos, 'apertura_id');
  for (var p = 0; p < pedidos.filas.length; p++) {
    if (limpiar_(pedidos.filas[p][cApertura]) !== aperturaId) continue;
    var pedido = filaAObjeto_(pedidos, pedidos.filas[p]);
    var estado = limpiar_(pedido.estado_pedido) === 'cancelado' ? 'cancelado' : 'vigente';
    var pago = limpiar_(pedido.estado_pago);
    var estadoPago = pago === 'pendiente' || pago === '' ? 'pendiente_de_pago' : 'pagado';
    var forma = limpiar_(pedido.forma_pago);
    if (pago === 'pagado_transferencia') forma = 'transferencia';
    if (pago === 'pagado_efectivo') forma = forma === 'efectivo_al_retirar' ? forma : 'efectivo';
    acumularResumenApertura_(resumen, 'pedido_anticipado', parseNum_(pedido.total),
      estado, estadoPago, forma);
  }
  if (!resumen.cantidad_pedidos_anticipados && !resumen.cantidad_ventas_presenciales &&
      !resumen.cantidad_cancelados) {
    resumen.advertencias.push('No hay movimientos asociados a esta apertura.');
  }
  return resumen;
}

/**
 * Preflight E2E de solo lectura. APP_ENV=TEST se valida antes de entrar aqui y
 * el nombre exacto de la Sheet evita que una propiedad TEST mal configurada
 * autorice escrituras sobre la base operativa productiva.
 */
function verificarDestinoE2EFase56_() {
  validarEntornoTestVentas_();
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (limpiar_(ss.getName()) !== NOMBRE_SHEET_TEST_E2E) {
    lanzar_('Destino E2E bloqueado: la Sheet no corresponde a TEST.', 403);
  }

  var aperturas = leerHoja_(ss, HOJAS.APERTURAS);
  var productos = leerHoja_(ss, HOJAS.PRODUCTOS);
  var ventas = leerHoja_(ss, HOJAS.VENTAS);
  var detalles = leerHoja_(ss, HOJAS.DETALLE_VENTAS);
  var movimientos = leerHoja_(ss, HOJAS.MOVIMIENTOS_STOCK);
  validarEncabezadosAperturas_(aperturas);
  exigirColumnas_(productos, [
    'id_producto', 'activo', 'nombre', 'unidad_medida', 'permite_decimal',
    'paso_venta', 'precio_venta', 'stock_actual'
  ]);
  exigirColumnas_(ventas, COLUMNAS_VENTA_PRESENCIAL.VENTAS);
  exigirColumnas_(detalles, COLUMNAS_VENTA_PRESENCIAL.DETALLE_VENTAS);
  exigirColumnas_(movimientos, COLUMNAS_VENTA_PRESENCIAL.MOVIMIENTOS_STOCK);

  return {
    entorno: 'TEST',
    destino: 'backend_test_verificado',
    contrato: 'fase56_e2e_test_v1',
    sheet_nombre: NOMBRE_SHEET_TEST_E2E
  };
}

/** Snapshot de solo lectura, acotado a una apertura y productos declarados. */
function obtenerEstadoE2EFase56_(aperturaId, productoIdsCrudos) {
  verificarDestinoE2EFase56_();
  aperturaId = limpiar_(aperturaId);
  if (!/^APE-[0-9]{8}$/.test(aperturaId)) lanzar_('apertura_id invalida.', 400);
  var productoIds = limpiar_(productoIdsCrudos).split(',').map(limpiar_).filter(Boolean);
  if (!productoIds.length || productoIds.length > 10) {
    lanzar_('Se requieren entre 1 y 10 producto_ids para evidencia E2E.', 400);
  }
  var ids = {};
  for (var i = 0; i < productoIds.length; i++) {
    if (!/^[A-Za-z0-9_-]{3,100}$/.test(productoIds[i]) || ids[productoIds[i]]) {
      lanzar_('producto_ids invalidos para evidencia E2E.', 400);
    }
    ids[productoIds[i]] = true;
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var aperturas = leerHoja_(ss, HOJAS.APERTURAS);
  var apertura = obtenerAperturaEnHoja_(aperturas, aperturaId).apertura;
  var productos = leerHoja_(ss, HOJAS.PRODUCTOS);
  var cProducto = col_(productos, 'id_producto');
  var encontrados = {};
  for (var p = 0; p < productos.filas.length; p++) {
    var productoId = limpiar_(productos.filas[p][cProducto]);
    if (!ids[productoId]) continue;
    var producto = filaAObjeto_(productos, productos.filas[p]);
    encontrados[productoId] = {
      id_producto: productoId,
      nombre: limpiar_(producto.nombre),
      activo: limpiar_(producto.activo),
      unidad_medida: limpiar_(producto.unidad_medida),
      permite_decimal: limpiar_(producto.permite_decimal),
      paso_venta: parseNum_(producto.paso_venta),
      precio_venta: parseNum_(producto.precio_venta),
      stock_actual: parseNum_(producto.stock_actual)
    };
  }
  for (var e = 0; e < productoIds.length; e++) {
    if (!encontrados[productoIds[e]]) {
      lanzar_('Producto E2E no encontrado en TEST.', 404);
    }
  }

  return {
    contrato: 'fase56_e2e_test_v1',
    // La fila completa permite demostrar que las consultas de caja no cambian
    // ningun campo persistente de APERTURAS. Sigue acotada a una sola apertura
    // solicitada y esta accion exige token admin + APP_ENV=TEST.
    apertura: apertura,
    productos: encontrados,
    filas: {
      ventas: contarFilasIdentificadas_(leerHoja_(ss, HOJAS.VENTAS), ['venta_id', 'id_venta']),
      detalle_ventas: contarFilasIdentificadas_(
        leerHoja_(ss, HOJAS.DETALLE_VENTAS), ['detalle_id']
      ),
      movimientos_stock: contarFilasIdentificadas_(
        leerHoja_(ss, HOJAS.MOVIMIENTOS_STOCK), ['movimiento_id', 'id_movimiento']
      ),
      pedidos: contarFilasIdentificadas_(leerHoja_(ss, HOJAS.PEDIDOS), ['id_pedido']),
      detalle_pedidos: contarFilasIdentificadas_(
        leerHoja_(ss, HOJAS.DETALLE_PEDIDOS), ['id_pedido']
      )
    }
  };
}

/** Cuenta evidencia exacta de una venta persistida, sin devolver filas crudas. */
function obtenerEvidenciaVentaE2EFase56_(ventaId) {
  verificarDestinoE2EFase56_();
  ventaId = limpiar_(ventaId);
  if (!/^VEN-[A-Za-z0-9-]{8,100}$/.test(ventaId)) lanzar_('venta_id invalida.', 400);
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var ventas = leerHoja_(ss, HOJAS.VENTAS);
  var detalles = leerHoja_(ss, HOJAS.DETALLE_VENTAS);
  var movimientos = leerHoja_(ss, HOJAS.MOVIMIENTOS_STOCK);
  return {
    contrato: 'fase56_e2e_test_v1',
    venta_id: ventaId,
    filas: {
      ventas: contarCoincidencias_(ventas, ['venta_id', 'id_venta'], ventaId),
      detalle_ventas: contarCoincidencias_(detalles, ['venta_id', 'id_venta'], ventaId),
      movimientos_stock: contarCoincidencias_(
        movimientos, ['referencia_id', 'id_origen'], ventaId
      )
    }
  };
}

function contarFilasIdentificadas_(hoja, columnasId) {
  var cId = colPrimera_(hoja, columnasId);
  var total = 0;
  for (var i = 0; i < hoja.filas.length; i++) {
    if (limpiar_(hoja.filas[i][cId])) total++;
  }
  return total;
}

function contarCoincidencias_(hoja, columnasId, id) {
  var cId = colPrimera_(hoja, columnasId);
  var total = 0;
  for (var i = 0; i < hoja.filas.length; i++) {
    if (limpiar_(hoja.filas[i][cId]) === id) total++;
  }
  return total;
}

function acumularResumenApertura_(resumen, origen, total, estado, estadoPago, formaPago) {
  total = redondear2_(parseNum_(total));
  if (estado === 'cancelado') {
    resumen.cantidad_cancelados++;
    resumen.total_cancelado = redondear2_(resumen.total_cancelado + total);
    return;
  }
  resumen.total_general = redondear2_(resumen.total_general + total);
  if (origen === 'pedido_anticipado') {
    resumen.cantidad_pedidos_anticipados++;
    resumen.total_pedidos_anticipados = redondear2_(resumen.total_pedidos_anticipados + total);
  } else {
    resumen.cantidad_ventas_presenciales++;
    resumen.total_ventas_presenciales = redondear2_(resumen.total_ventas_presenciales + total);
  }
  if (estadoPago === 'pendiente_de_pago') {
    resumen.cantidad_pendientes_pago++;
    resumen.total_pendiente_pago = redondear2_(resumen.total_pendiente_pago + total);
    return;
  }
  resumen.total_cobrado = redondear2_(resumen.total_cobrado + total);
  if (formaPago === 'transferencia') {
    resumen.total_transferencia = redondear2_(resumen.total_transferencia + total);
  } else if (formaPago === 'efectivo_al_retirar') {
    resumen.total_efectivo_al_retirar = redondear2_(resumen.total_efectivo_al_retirar + total);
    resumen.total_efectivo_esperado = redondear2_(resumen.total_efectivo_esperado + total);
  } else if (formaPago === 'efectivo') {
    resumen.total_efectivo_esperado = redondear2_(resumen.total_efectivo_esperado + total);
  } else {
    resumen.advertencias.push('Hay un registro pagado sin forma de pago reconocida.');
  }
}

function serializarVentaPresencial_(obj) {
  return {
    venta_id: limpiar_(obj.venta_id || obj.id_venta),
    fecha_hora: valorFechaHoraVenta_(obj.fecha_hora), apertura_id: limpiar_(obj.apertura_id),
    origen_venta: limpiar_(obj.origen_venta) || 'presencial',
    vendedor: limpiar_(obj.vendedor), total: parseNum_(obj.total),
    estado_venta: limpiar_(obj.estado_venta) || 'vigente',
    estado_pago: limpiar_(obj.estado_pago), forma_pago: limpiar_(obj.forma_pago),
    observaciones: limpiar_(obj.observaciones),
    creado_en: valorAuditoriaVenta_(obj.creado_en),
    actualizado_en: valorAuditoriaVenta_(obj.actualizado_en)
  };
}

function valorFechaHoraVenta_(valor) {
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return marca_(valor);
  }
  return limpiar_(valor);
}

function valorAuditoriaVenta_(valor) {
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return marcaIso_(valor);
  }
  return limpiar_(valor);
}

function serializarDetalleVenta_(obj) {
  return {
    detalle_id: limpiar_(obj.detalle_id), venta_id: limpiar_(obj.venta_id || obj.id_venta),
    producto_id: limpiar_(obj.producto_id || obj.id_producto),
    nombre_producto: limpiar_(obj.nombre_producto), cantidad: parseNum_(obj.cantidad),
    modo_venta: limpiar_(obj.modo_venta), gramos_solicitados: Number(obj.gramos_solicitados) || 0,
    gramos_referencia: Number(obj.gramos_referencia) || 0, gramos_unidad_stock: Number(obj.gramos_unidad_stock) || 0,
    unidad_medida: limpiar_(obj.unidad_medida), precio_unitario: parseNum_(obj.precio_unitario),
    subtotal: parseNum_(obj.subtotal)
  };
}

function rollbackVentaPresencial_(prod, cStock, lineas, ventas, filaVentas,
    detalles, filaDetalles, movimientos, filaMovimientos) {
  try {
    for (var i = 0; i < lineas.length; i++) {
      prod.sheet.getRange(lineas[i].filaProducto + 2, cStock + 1).setValue(lineas[i].stock_anterior);
    }
    eliminarFilasAgregadas_(ventas, filaVentas);
    eliminarFilasAgregadas_(detalles, filaDetalles);
    eliminarFilasAgregadas_(movimientos, filaMovimientos);
    SpreadsheetApp.flush();
    return true;
  } catch (rollbackError) {
    return false;
  }
}

function eliminarFilasAgregadas_(sheet, ultimaFilaOriginal) {
  var agregadas = sheet.getLastRow() - ultimaFilaOriginal;
  if (agregadas > 0) sheet.deleteRows(ultimaFilaOriginal + 1, agregadas);
}

function esMultiploPasoVenta_(cantidad, paso) {
  if (!(paso > 0)) return false;
  var cociente = cantidad / paso;
  return Math.abs(cociente - Math.round(cociente)) < 0.000001;
}

function validarAperturaVentaPresencial_(apertura, ahora) {
  if (apertura.estado_apertura !== 'activa' || apertura.modo_presencial_estado !== 'activo') {
    lanzar_('La apertura no esta habilitada para venta presencial.', 409);
  }
  var fecha = normalizarFechaPedido_(apertura.fecha_apertura);
  var inicio = normalizarHoraPedido_(apertura.hora_inicio);
  var termino = normalizarHoraPedido_(apertura.hora_termino);
  var actual = Utilities.formatDate(ahora, 'America/Santiago', "yyyy-MM-dd'T'HH:mm");
  if (!esFechaIsoValida_(fecha) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(inicio) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(termino) ||
      actual < fecha + 'T' + inicio || actual > fecha + 'T' + termino) {
    lanzar_('La apertura no esta dentro de su horario presencial.', 409);
  }
}

// ============================== FASE 7/8 TEST ================================

function verificarDestinoFase78Test_() {
  validarEntornoTestFase78_();
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (ss.getName() !== NOMBRE_SHEET_TEST_E2E) {
    lanzar_('El destino Fase 7/8 no corresponde a la Sheet TEST autorizada.', 403);
  }
  return {
    entorno: 'TEST', destino: 'backend_test_verificado',
    sheet_nombre: ss.getName(), contrato: 'fase78_test_v1'
  };
}

function obtenerEsquemaFase78Test_() {
  verificarDestinoFase78Test_();
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var nombres = [
    HOJAS.PRODUCTOS, HOJAS.MOVIMIENTOS_STOCK, HOJAS.COMPRAS,
    HOJAS.DETALLE_COMPRAS, HOJAS.GASTOS_EXTRA, HOJAS.HISTORIAL_COSTOS,
    HOJAS.CAJA_COMPRA, HOJAS.AUDITORIA_PRODUCTOS
  ];
  return {
    solo_lectura: true,
    hojas: nombres.map(function (nombre) {
      var sheet = ss.getSheetByName(nombre);
      if (!sheet) return { nombre: nombre, existe: false, headers: [], filas: 0 };
      var ultimaCol = sheet.getLastColumn();
      var headers = ultimaCol > 0
        ? sheet.getRange(1, 1, 1, ultimaCol).getValues()[0].map(limpiar_)
        : [];
      return {
        nombre: nombre, existe: true, headers: headers,
        filas: Math.max(0, sheet.getLastRow() - 1)
      };
    })
  };
}

function prepararEsquemaFase78Test_() {
  verificarDestinoFase78Test_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) lanzar_('El backend TEST esta ocupado.', 503);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var objetivos = [
      { nombre: HOJAS.COMPRAS, columnas: COLUMNAS_FASE_7_8.COMPRAS },
      { nombre: HOJAS.DETALLE_COMPRAS, columnas: COLUMNAS_FASE_7_8.DETALLE_COMPRAS },
      { nombre: HOJAS.GASTOS_EXTRA, columnas: COLUMNAS_FASE_7_8.GASTOS_EXTRA },
      { nombre: HOJAS.HISTORIAL_COSTOS, columnas: COLUMNAS_FASE_7_8.HISTORIAL_COSTOS },
      { nombre: HOJAS.CAJA_COMPRA, columnas: COLUMNAS_FASE_7_8.CAJA_COMPRA },
      { nombre: HOJAS.AUDITORIA_PRODUCTOS, columnas: COLUMNAS_FASE_7_8.AUDITORIA_PRODUCTOS },
      { nombre: HOJAS.MOVIMIENTOS_STOCK, columnas: COLUMNAS_FASE_7_8.MOVIMIENTOS_STOCK },
      { nombre: HOJAS.PRODUCTOS, columnas: COLUMNAS_FASE_7_8.PRODUCTOS_ADMIN }
    ];
    var cambios = objetivos.some(function (objetivo) {
      var sheet = ss.getSheetByName(objetivo.nombre);
      if (!sheet || sheet.getLastColumn() === 0) return true;
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(limpiar_);
      return objetivo.columnas.some(function (columna) { return headers.indexOf(columna) === -1; });
    });
    var backupCreado = false;
    if (cambios) {
      ss.copy('BACKUP TEST F78 ' + marca_(new Date()).replace(/[: ]/g, '-'));
      backupCreado = true;
    }
    var resultado = objetivos.map(function (objetivo) {
      var sheet = ss.getSheetByName(objetivo.nombre);
      if (!sheet) {
        sheet = ss.insertSheet(objetivo.nombre);
        sheet.getRange(1, 1, 1, objetivo.columnas.length).setValues([objetivo.columnas]);
        sheet.setFrozenRows(1);
        return { hoja: objetivo.nombre, creada: true, agregadas: objetivo.columnas.slice() };
      }
      if (sheet.getLastColumn() === 0) {
        sheet.getRange(1, 1, 1, objetivo.columnas.length).setValues([objetivo.columnas]);
        sheet.setFrozenRows(1);
        return { hoja: objetivo.nombre, creada: false, agregadas: objetivo.columnas.slice() };
      }
      var hoja = leerHoja_(ss, objetivo.nombre);
      var extension = asegurarColumnasAditivas_(hoja, objetivo.columnas);
      return { hoja: objetivo.nombre, creada: false, agregadas: extension.agregadas };
    });
    SpreadsheetApp.flush();
    return { entorno: 'TEST', backup_creado: backupCreado, cambios: resultado };
  } finally {
    lock.releaseLock();
  }
}

function eliminarFilasCreadas_(sheet, ultimaFilaOriginal, cantidadCreada) {
  if (!(cantidadCreada > 0)) return;
  var agregadas = sheet.getLastRow() - ultimaFilaOriginal;
  if (agregadas !== cantidadCreada) {
    lanzar_('No se pudo identificar con seguridad las filas a compensar.', 500);
  }
  sheet.deleteRows(ultimaFilaOriginal + 1, cantidadCreada);
}

/** Compensación acotada de creación; no constituye una transacción multitabla. */
function compensarCreacionPedido_(pedidos, ultimaFilaPedidos, filasPedidoCreadas,
    detalles, ultimaFilaDetalles, filasDetalleCreadas) {
  try {
    eliminarFilasCreadas_(detalles, ultimaFilaDetalles, filasDetalleCreadas);
    eliminarFilasCreadas_(pedidos, ultimaFilaPedidos, filasPedidoCreadas);
    SpreadsheetApp.flush();
    return true;
  } catch (rollbackError) {
    return false;
  }
}

function crearBackupPilotoTest_(body) {
  verificarDestinoFase78Test_();
  exigirIdempotencyKey_(body.idempotency_key);
  var marcador = limpiar_(body.marcador);
  if (!/^PILOTO-TEST-[a-f0-9]{24}$/.test(marcador)) {
    lanzar_('Marcador de piloto TEST inválido.', 400);
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) lanzar_('El backend TEST está ocupado.', 503);
  try {
    return ejecutarIdempotenteBajoLock_(
      'crearBackupPilotoTest',
      body.idempotency_key,
      { marcador: marcador },
      function () {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        verificarDestinoFase78Test_();
        var nombre = 'BACKUP PILOTO TEST ' + marca_(new Date()).replace(/[: ]/g, '-');
        ss.copy(nombre);
        return { entorno: 'TEST', backup_creado: true, marcador: marcador, nombre: nombre };
      }
    );
  } finally {
    lock.releaseLock();
  }
}

function obtenerEvidenciaPilotoTest_(params) {
  verificarDestinoFase78Test_();
  var marcador = limpiar_(params.marcador);
  if (!/^PILOTO-TEST-[a-f0-9]{24}$/.test(marcador)) {
    lanzar_('Marcador de piloto TEST inválido.', 400);
  }
  var sufijo = marcador.substring('PILOTO-TEST-'.length);
  var key = 'piloto_test_backup_' + sufijo;
  var nombre = 'FASE3B_IDEM_crearBackupPilotoTest_' + key;
  return {
    solo_lectura: true,
    marcador: marcador,
    backup_creado: Boolean(PropertiesService.getScriptProperties().getProperty(nombre))
  };
}

/** Columnas B1 opcionales en bases V1; si existen, deben ser únicas. No migra. */
function exigirColumnasCompatiblesB1_(hoja, columnas, opcionales) {
  exigirColumnas_(hoja, columnas.filter(function (campo) { return opcionales.indexOf(campo) === -1; }));
  opcionales.forEach(function (campo) {
    if (hoja.mapa[campo] !== undefined) columnaUnicaContrato_(hoja.sheet, campo);
  });
}

function normalizarIdentidadSkuFisicaB1_(producto) {
  var validacion = DominioFamiliasFaseA.validarIdentidadSkuFisica(producto);
  if (!validacion.valido) lanzar_('Identidad fisica invalida: ' + validacion.inconsistencias[0].campo + '.', 400);
  var identidad = {};
  COLUMNAS_IDENTIDAD_SKU_FAMILIA.forEach(function (campo) {
    if (!Object.prototype.hasOwnProperty.call(producto, campo)) return;
    var valor = producto[campo];
    identidad[campo] = campo === 'contenido_cantidad' && typeof valor === 'number' ? valor : limpiar_(valor);
  });
  return identidad;
}

function exigirColumnasEdicionIdentidadB1_(hoja, cambios) {
  COLUMNAS_IDENTIDAD_SKU_FAMILIA.forEach(function (campo) {
    if (Object.prototype.hasOwnProperty.call(cambios, campo)) columnaUnicaContrato_(hoja.sheet, campo);
  });
}

/** Solo PRODUCTOS es fuente: no acepta ni mezcla snapshots del body. */
function snapshotsIdentidadCompraB1_(producto) {
  var identidad = normalizarIdentidadSkuFisicaB1_(producto), snapshots = {};
  COLUMNAS_IDENTIDAD_SKU_FAMILIA.forEach(function (campo) {
    snapshots[campo + '_snapshot'] = identidad[campo] === undefined ? '' : identidad[campo];
  });
  snapshots.gramos_unidad_stock_snapshot = modoVenta_(producto) === 'GRANEL' ? Number(producto.gramos_unidad_stock) : '';
  return snapshots;
}

/** Una identidad documentada no puede perderse por falta de columnas destino. */
function exigirDestinoSnapshotsCompraB1_(detalles, snapshots) {
  var identidadPresente = COLUMNAS_IDENTIDAD_SKU_FAMILIA.some(function (campo) { return snapshots[campo + '_snapshot'] !== ''; });
  if (!identidadPresente) return; // Legados sin identidad siguen operando en su esquema V1.
  var requeridos = COLUMNAS_SNAPSHOTS_COMPRA_B1.filter(function (campo) {
    return campo !== 'gramos_unidad_stock_snapshot' || snapshots[campo] !== '';
  });
  exigirColumnas_(detalles, requeridos); // Antes de cualquier escritura, sin crear columnas.
}

function crearCompra_(body) {
  exigirIdempotencyKey_(body.idempotency_key);
  var entrada = normalizarCompra_(body);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) lanzar_('El backend TEST esta ocupado.', 503);
  try {
    return persistirCompraIdempotente_(entrada, limpiar_(body.idempotency_key));
  } finally {
    lock.releaseLock();
  }
}

function normalizarCompra_(body) {
  var proveedor = limpiar_(body.proveedor);
  var fecha = limpiar_(body.fecha);
  var responsable = limpiar_(body.responsable);
  var observaciones = limpiar_(body.observaciones);
  var lineas = body.lineas;
  if (!esFechaIsoValida_(fecha)) lanzar_('La fecha debe usar yyyy-MM-dd.', 400);
  if (!proveedor || proveedor.length > 120) lanzar_('Falta un proveedor valido.', 400);
  if (!responsable || responsable.length > 100) lanzar_('Falta una persona responsable valida.', 400);
  if (observaciones.length > 500) lanzar_('Las observaciones superan 500 caracteres.', 400);
  if (!Array.isArray(lineas) || !lineas.length || lineas.length > 100) {
    lanzar_('La compra debe incluir entre 1 y 100 productos.', 400);
  }
  var vistos = {};
  var limpias = lineas.map(function (linea) {
    var productoId = limpiar_(linea && linea.producto_id);
    var cantidad = Number(linea && linea.cantidad);
    var costo = Number(linea && linea.costo_unitario);
    if (!/^PROD-[A-Za-z0-9-]{1,80}$/.test(productoId)) lanzar_('La compra requiere producto_id fisico PROD-*, nunca familia_id.', 400);
    if (vistos[productoId]) lanzar_('Producto repetido: "' + productoId + '".', 400);
    if (!isFinite(cantidad) || cantidad <= 0) lanzar_('Cantidad de compra invalida.', 400);
    if (!isFinite(costo) || costo <= 0 || Math.floor(costo) !== costo) {
      lanzar_('El costo unitario debe ser un entero CLP positivo.', 400);
    }
    vistos[productoId] = true;
    return { producto_id: productoId, cantidad: cantidad, costo_unitario: costo };
  });
  return { fecha: fecha, proveedor: proveedor, responsable: responsable, observaciones: observaciones, lineas: limpias };
}

function persistirCompraIdempotente_(entrada, key) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var compras = leerHoja_(ss, HOJAS.COMPRAS);
  var detalles = leerHoja_(ss, HOJAS.DETALLE_COMPRAS);
  var productos = leerHoja_(ss, HOJAS.PRODUCTOS);
  var movimientos = leerHoja_(ss, HOJAS.MOVIMIENTOS_STOCK);
  var costos = leerHoja_(ss, HOJAS.HISTORIAL_COSTOS);
  exigirColumnas_(compras, COLUMNAS_FASE_7_8.COMPRAS);
  exigirColumnasCompatiblesB1_(detalles, COLUMNAS_FASE_7_8.DETALLE_COMPRAS, COLUMNAS_SNAPSHOTS_COMPRA_B1);
  exigirColumnasCompatiblesB1_(productos, COLUMNAS_FASE_7_8.PRODUCTOS_ADMIN, COLUMNAS_IDENTIDAD_SKU_FAMILIA);
  exigirColumnas_(movimientos, COLUMNAS_FASE_7_8.MOVIMIENTOS_STOCK);
  exigirColumnas_(costos, COLUMNAS_FASE_7_8.HISTORIAL_COSTOS);
  var hash = hashPayload_(entrada);
  var cKey = col_(compras, 'idempotency_key');
  var existente = buscarFila_(compras, cKey, key);
  if (existente !== -1) {
    var previa = filaAObjeto_(compras, compras.filas[existente]);
    if (limpiar_(previa.payload_hash) !== hash) {
      lanzar_('La clave de idempotencia ya fue usada con otro contenido.', 409);
    }
    return obtenerCompraDesdeHojas_(compras, detalles, limpiar_(previa.compra_id));
  }

  exigirSinBloqueoDurableC5_(ss, '', entrada.lineas.map(function (p) { return p.producto_id; }));

  var cId = col_(productos, 'id_producto');
  var cActivo = col_(productos, 'activo');
  var cNombre = col_(productos, 'nombre');
  var cUnidad = col_(productos, 'unidad_medida');
  var cDecimal = col_(productos, 'permite_decimal');
  var cPaso = col_(productos, 'paso_venta');
  var cStock = col_(productos, 'stock_actual');
  var cCosto = col_(productos, 'precio_costo');
  var indice = {};
  productos.filas.forEach(function (fila, i) {
    var id = limpiar_(fila[cId]);
    if (id) indice[id] = i;
  });
  var calculadas = entrada.lineas.map(function (linea) {
    var i = indice[linea.producto_id];
    if (i === undefined) lanzar_('Producto no existe: "' + linea.producto_id + '".', 400);
    var fila = productos.filas[i];
    var maestro = filaAObjeto_(productos, fila);
    var snapshots = snapshotsIdentidadCompraB1_(maestro);
    exigirDestinoSnapshotsCompraB1_(detalles, snapshots);
    if (limpiar_(fila[cActivo]).toUpperCase() !== 'SI') lanzar_('Producto inactivo.', 409);
    var decimal = limpiar_(fila[cDecimal]).toUpperCase() === 'SI';
    var paso = decimal ? parseNum_(fila[cPaso]) : 1;
    if (!esMultiploPasoVenta_(linea.cantidad, paso)) {
      lanzar_('La cantidad de "' + linea.producto_id + '" no respeta su paso.', 400);
    }
    var stockAnterior = parseNum_(fila[cStock]);
    var costoTexto = limpiar_(fila[cCosto]);
    validarPrecisionStock_(filaAObjeto_(productos,fila),linea.cantidad);
    validarPrecisionStock_(filaAObjeto_(productos,fila),stockAnterior);
    var costoAnterior = costoTexto === '' ? '' : parseNum_(fila[cCosto]);
    return {
      indice: i, producto_id: linea.producto_id, nombre_producto: limpiar_(fila[cNombre]),
      unidad_medida: limpiar_(fila[cUnidad]), cantidad: linea.cantidad,
      costo_unitario: linea.costo_unitario,
      costo_total: Math.round(linea.cantidad * linea.costo_unitario),
      stock_anterior: stockAnterior, stock_nuevo: redondearStock_(stockAnterior + linea.cantidad),
      costo_anterior: costoAnterior, costo_nuevo: linea.costo_unitario,
      snapshots: snapshots
    };
  });
  var ahora = new Date();
  var compraId = generarIdOperacion_('COM', ahora);
  var ultimaCompra = compras.sheet.getLastRow();
  var ultimoDetalle = detalles.sheet.getLastRow();
  var ultimoMovimiento = movimientos.sheet.getLastRow();
  var ultimoCosto = costos.sheet.getLastRow();
  try {
    calculadas.forEach(function (linea, posicion) {
      productos.sheet.getRange(linea.indice + 2, cStock + 1).setValue(linea.stock_nuevo);
      productos.sheet.getRange(linea.indice + 2, cCosto + 1).setValue(linea.costo_nuevo);
      agregarFila_(detalles, Object.assign({}, {
        detalle_compra_id: compraId + '-D' + ('00' + (posicion + 1)).slice(-3),
        compra_id: compraId, producto_id: linea.producto_id,
        nombre_producto: linea.nombre_producto, unidad_medida: linea.unidad_medida,
        cantidad: linea.cantidad, costo_unitario: linea.costo_unitario,
        costo_total: linea.costo_total, stock_anterior: linea.stock_anterior,
        stock_nuevo: linea.stock_nuevo, costo_anterior: linea.costo_anterior,
        costo_nuevo: linea.costo_nuevo
      }, linea.snapshots));
      registrarMovimiento_(movimientos, {
        tipo: 'entrada', origen: 'compra', referencia_tipo: 'compra',
        id_origen: compraId, id_producto: linea.producto_id, cantidad: linea.cantidad,
        stock_anterior: linea.stock_anterior, stock_resultante: linea.stock_nuevo,
        usuario: entrada.responsable, observaciones: 'Compra TEST ' + compraId,
        ahora: ahora
      });
      agregarFila_(costos, {
        historial_costo_id: compraId + '-C' + ('00' + (posicion + 1)).slice(-3),
        fecha_hora: marca_(ahora), producto_id: linea.producto_id,
        costo_anterior: linea.costo_anterior, costo_nuevo: linea.costo_nuevo,
        origen: 'compra', referencia_id: compraId, responsable: entrada.responsable,
        observaciones: entrada.observaciones
      });
    });
    var total = calculadas.reduce(function (suma, linea) { return suma + linea.costo_total; }, 0);
    agregarFila_(compras, {
      compra_id: compraId, id: compraId, fecha_hora: marca_(ahora), fecha: entrada.fecha,
      proveedor: entrada.proveedor, responsable: entrada.responsable, estado: 'confirmada',
      total: total, observaciones: entrada.observaciones, idempotency_key: key,
      payload_hash: hash, creado_en: marcaIso_(ahora), actualizado_en: marcaIso_(ahora)
    });
    SpreadsheetApp.flush();
    return obtenerCompraDesdeHojas_(leerHoja_(ss, HOJAS.COMPRAS), leerHoja_(ss, HOJAS.DETALLE_COMPRAS), compraId);
  } catch (err) {
    calculadas.forEach(function (linea) {
      productos.sheet.getRange(linea.indice + 2, cStock + 1).setValue(linea.stock_anterior);
      productos.sheet.getRange(linea.indice + 2, cCosto + 1).setValue(linea.costo_anterior);
    });
    eliminarFilasAgregadas_(compras.sheet, ultimaCompra);
    eliminarFilasAgregadas_(detalles.sheet, ultimoDetalle);
    eliminarFilasAgregadas_(movimientos.sheet, ultimoMovimiento);
    eliminarFilasAgregadas_(costos.sheet, ultimoCosto);
    SpreadsheetApp.flush();
    throw err;
  }
}

function listarCompras_(desde, hasta) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var compras = leerHoja_(ss, HOJAS.COMPRAS);
  exigirColumnas_(compras, COLUMNAS_FASE_7_8.COMPRAS);
  return compras.filas.map(function (fila) { return serializarRegistroF78_(filaAObjeto_(compras, fila)); })
    .filter(function (compra) { return limpiar_(compra.compra_id) && dentroPeriodo_(compra.fecha_hora, desde, hasta); })
    .reverse();
}

function obtenerCompra_(compraId) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return obtenerCompraDesdeHojas_(leerHoja_(ss, HOJAS.COMPRAS), leerHoja_(ss, HOJAS.DETALLE_COMPRAS), limpiar_(compraId));
}

function obtenerCompraDesdeHojas_(compras, detalles, compraId) {
  if (!compraId) lanzar_('Falta compra_id.', 400);
  var fila = buscarFila_(compras, col_(compras, 'compra_id'), compraId);
  if (fila === -1) lanzar_('Compra no encontrada.', 404);
  var detalle = detalles.filas.filter(function (item) {
    return limpiar_(item[col_(detalles, 'compra_id')]) === compraId;
  }).map(function (item) { return serializarRegistroF78_(filaAObjeto_(detalles, item)); });
  return { compra: serializarRegistroF78_(filaAObjeto_(compras, compras.filas[fila])), detalle: detalle };
}

function crearGastoExtra_(body) {
  exigirIdempotencyKey_(body.idempotency_key);
  var entrada = {
    categoria: limpiar_(body.categoria).toLowerCase(), descripcion: limpiar_(body.descripcion),
    monto: Number(body.monto), responsable: limpiar_(body.responsable),
    observaciones: limpiar_(body.observaciones)
  };
  var categorias = ['bencina', 'bolsas', 'propina', 'transporte', 'materiales', 'otros'];
  if (categorias.indexOf(entrada.categoria) === -1) lanzar_('Categoria de gasto invalida.', 400);
  if (!entrada.descripcion || entrada.descripcion.length > 200) lanzar_('Falta una descripcion valida.', 400);
  if (!isFinite(entrada.monto) || entrada.monto <= 0 || Math.floor(entrada.monto) !== entrada.monto) {
    lanzar_('El monto debe ser un entero CLP positivo.', 400);
  }
  if (!entrada.responsable || entrada.responsable.length > 100) lanzar_('Falta responsable.', 400);
  if (entrada.observaciones.length > 500) lanzar_('Observaciones demasiado largas.', 400);
  return persistirRegistroSimpleIdempotente_(HOJAS.GASTOS_EXTRA, 'gasto_id', 'GAS', entrada, body.idempotency_key, function (id, ahora, hash) {
    return {
      gasto_id: id, fecha_hora: marca_(ahora), categoria: entrada.categoria,
      descripcion: entrada.descripcion, monto: entrada.monto, responsable: entrada.responsable,
      observaciones: entrada.observaciones, estado: 'vigente',
      idempotency_key: body.idempotency_key, payload_hash: hash,
      creado_en: marcaIso_(ahora), actualizado_en: marcaIso_(ahora)
    };
  });
}

function registrarCajaCompra_(body) {
  exigirIdempotencyKey_(body.idempotency_key);
  var entrada = {
    saldo_cuenta: Number(body.saldo_cuenta), efectivo_disponible: Number(body.efectivo_disponible),
    pendientes_referencia: Number(body.pendientes_referencia || 0),
    presupuesto_confirmado: Number(body.presupuesto_confirmado),
    responsable: limpiar_(body.responsable), observaciones: limpiar_(body.observaciones)
  };
  ['saldo_cuenta', 'efectivo_disponible', 'pendientes_referencia', 'presupuesto_confirmado'].forEach(function (campo) {
    if (!isFinite(entrada[campo]) || entrada[campo] < 0 || Math.floor(entrada[campo]) !== entrada[campo]) {
      lanzar_('Monto de caja invalido.', 400);
    }
  });
  if (!entrada.responsable) lanzar_('Falta responsable de caja.', 400);
  var gastos = listarGastosExtra_('', '').filter(function (gasto) { return limpiar_(gasto.estado) === 'vigente'; })
    .reduce(function (suma, gasto) { return suma + parseNum_(gasto.monto); }, 0);
  var calculado = Math.max(0, entrada.saldo_cuenta + entrada.efectivo_disponible - gastos);
  return persistirRegistroSimpleIdempotente_(HOJAS.CAJA_COMPRA, 'caja_compra_id', 'CAJ', entrada, body.idempotency_key, function (id, ahora, hash) {
    return {
      caja_compra_id: id, fecha_hora: marca_(ahora), saldo_cuenta: entrada.saldo_cuenta,
      efectivo_disponible: entrada.efectivo_disponible,
      pendientes_referencia: entrada.pendientes_referencia, gastos_extra: gastos,
      presupuesto_calculado: calculado, presupuesto_confirmado: entrada.presupuesto_confirmado,
      responsable: entrada.responsable, observaciones: entrada.observaciones,
      idempotency_key: body.idempotency_key, payload_hash: hash, creado_en: marcaIso_(ahora)
    };
  });
}

function persistirRegistroSimpleIdempotente_(hojaNombre, campoId, prefijo, entrada, keyCruda, construir) {
  var key = limpiar_(keyCruda);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) lanzar_('El backend TEST esta ocupado.', 503);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var hoja = leerHoja_(ss, hojaNombre);
    var hash = hashPayload_(entrada);
    var existente = buscarFila_(hoja, col_(hoja, 'idempotency_key'), key);
    if (existente !== -1) {
      var previo = serializarRegistroF78_(filaAObjeto_(hoja, hoja.filas[existente]));
      if (limpiar_(previo.payload_hash) !== hash) lanzar_('La clave de idempotencia ya fue usada con otro contenido.', 409);
      return previo;
    }
    var ahora = new Date();
    var registro = construir(generarIdOperacion_(prefijo, ahora), ahora, hash);
    agregarFila_(hoja, registro);
    SpreadsheetApp.flush();
    return serializarRegistroF78_(registro);
  } finally {
    lock.releaseLock();
  }
}

function listarGastosExtra_(desde, hasta) {
  var hoja = leerHoja_(SpreadsheetApp.openById(SPREADSHEET_ID), HOJAS.GASTOS_EXTRA);
  return hoja.filas.map(function (fila) { return serializarRegistroF78_(filaAObjeto_(hoja, fila)); })
    .filter(function (gasto) { return limpiar_(gasto.gasto_id) && dentroPeriodo_(gasto.fecha_hora, desde, hasta); }).reverse();
}

function obtenerGastoExtra_(id) {
  var hoja = leerHoja_(SpreadsheetApp.openById(SPREADSHEET_ID), HOJAS.GASTOS_EXTRA);
  var fila = buscarFila_(hoja, col_(hoja, 'gasto_id'), limpiar_(id));
  if (fila === -1) lanzar_('Gasto no encontrado.', 404);
  return serializarRegistroF78_(filaAObjeto_(hoja, hoja.filas[fila]));
}

function listarHistorialCostos_(productoId, desde, hasta) {
  var hoja = leerHoja_(SpreadsheetApp.openById(SPREADSHEET_ID), HOJAS.HISTORIAL_COSTOS);
  productoId = limpiar_(productoId);
  return hoja.filas.map(function (fila) { return serializarRegistroF78_(filaAObjeto_(hoja, fila)); })
    .filter(function (cambio) {
      return limpiar_(cambio.historial_costo_id) && (!productoId || limpiar_(cambio.producto_id) === productoId) &&
        dentroPeriodo_(cambio.fecha_hora, desde, hasta);
    }).reverse();
}

function listarMovimientosStockAdmin_(productoId, desde, hasta) {
  var hoja = leerHoja_(SpreadsheetApp.openById(SPREADSHEET_ID), HOJAS.MOVIMIENTOS_STOCK);
  var operacionesV2Reporte = operacionesMovimientoReporteC5_();
  productoId = limpiar_(productoId);
  return hoja.filas.map(function (fila) { return serializarRegistroF78_(filaAObjeto_(hoja, fila)); })
    .filter(function (movimiento) {
      var id = limpiar_(movimiento.movimiento_id || movimiento.id_movimiento);
      var prod = limpiar_(movimiento.producto_id || movimiento.id_producto);
      return id && (!productoId || prod === productoId) && dentroPeriodo_(movimiento.fecha_hora, desde, hasta) && movimientoCompletadoReporteC5_(movimiento, operacionesV2Reporte);
    }).reverse();
}

function listarProductosAdmin_() {
  var hoja = leerHoja_(SpreadsheetApp.openById(SPREADSHEET_ID), HOJAS.PRODUCTOS);
  exigirColumnasCompatiblesB1_(hoja, COLUMNAS_FASE_7_8.PRODUCTOS_ADMIN, COLUMNAS_IDENTIDAD_SKU_FAMILIA);
  return hoja.filas.map(function (fila) {
    var producto = serializarRegistroF78_(filaAObjeto_(hoja, fila));
    producto.tipo_disponibilidad = tipoDisponibilidadProducto_(producto.tipo_disponibilidad);
    producto.modo_venta = modoVenta_(producto);
    return producto;
  })
    .filter(function (producto) { return limpiar_(producto.id_producto); });
}

function actualizarProductoAdmin_(body) {
  exigirIdempotencyKey_(body.idempotency_key);
  var entrada = normalizarCambioProductoAdmin_(body);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) lanzar_('El backend TEST esta ocupado.', 503);
  try {
    return ejecutarIdempotenteBajoLock_('actualizarProductoAdmin', body.idempotency_key, entrada, function () {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      exigirSinBloqueoDurableC5_(ss, '', [entrada.producto_id]);
      var hoja = leerHoja_(ss, HOJAS.PRODUCTOS);
      var auditoria = leerHoja_(ss, HOJAS.AUDITORIA_PRODUCTOS);
      var costos = leerHoja_(ss, HOJAS.HISTORIAL_COSTOS);
      var fila = buscarFila_(hoja, col_(hoja, 'id_producto'), entrada.producto_id);
      if (fila === -1) lanzar_('Producto no encontrado.', 404);
      var vigente = filaAObjeto_(hoja, hoja.filas[fila]);
      exigirColumnasEdicionIdentidadB1_(hoja, entrada.cambios);
      var combinado = Object.assign({}, vigente, entrada.cambios);
      validarAsociacionSkuAdminB3_(ss, combinado);
      if (modoVenta_(combinado) === 'GRANEL') {
        validarModeloGranel_(combinado);
        validarPrecisionStock_(combinado,parseNum_(combinado.stock_minimo));
      }
      // La base de stock queda congelada al establecerla; precio/referencia comercial pueden cambiar.
      if (modoVenta_(vigente) === 'GRANEL' && ['modo_venta','unidad_medida','gramos_unidad_stock'].some(function(k) { return entrada.cambios[k] !== undefined && String(entrada.cambios[k]) !== String(vigente[k]); })) lanzar_('La base historica de stock requiere migracion separada.',409);
      var anteriores = {};
      var ultimoAudit = auditoria.sheet.getLastRow();
      var ultimoCosto = costos.sheet.getLastRow();
      try {
        Object.keys(entrada.cambios).forEach(function (campo) {
          anteriores[campo] = hoja.filas[fila][col_(hoja, campo)];
          hoja.sheet.getRange(fila + 2, col_(hoja, campo) + 1).setValue(entrada.cambios[campo]);
        });
        var ahora = new Date();
        agregarFila_(auditoria, {
          auditoria_id: generarIdOperacion_('AUD', ahora), fecha_hora: marca_(ahora),
          producto_id: entrada.producto_id, accion: 'actualizar',
          cambios_json: JSON.stringify({ antes: anteriores, despues: entrada.cambios }),
          responsable: limpiar_(body.responsable) || 'admin_web',
          referencia_id: limpiar_(body.idempotency_key)
        });
        if (entrada.cambios.precio_costo !== undefined && String(anteriores.precio_costo) !== String(entrada.cambios.precio_costo)) {
          agregarFila_(costos, {
            historial_costo_id: generarIdOperacion_('COS', ahora), fecha_hora: marca_(ahora),
            producto_id: entrada.producto_id, costo_anterior: anteriores.precio_costo,
            costo_nuevo: entrada.cambios.precio_costo, origen: 'ajuste_admin',
            referencia_id: limpiar_(body.idempotency_key),
            responsable: limpiar_(body.responsable) || 'admin_web', observaciones: 'Ajuste explicito de costo TEST'
          });
        }
        SpreadsheetApp.flush();
        var actualizada = leerHoja_(ss, HOJAS.PRODUCTOS);
        return serializarRegistroF78_(filaAObjeto_(actualizada, actualizada.filas[fila]));
      } catch (err) {
        Object.keys(anteriores).forEach(function (campo) {
          hoja.sheet.getRange(fila + 2, col_(hoja, campo) + 1).setValue(anteriores[campo]);
        });
        eliminarFilasAgregadas_(auditoria.sheet, ultimoAudit);
        eliminarFilasAgregadas_(costos.sheet, ultimoCosto);
        SpreadsheetApp.flush();
        throw err;
      }
    });
  } finally { lock.releaseLock(); }
}

function crearProductoAdmin_(body) {
  exigirIdempotencyKey_(body.idempotency_key);
  var productoId = limpiar_(body.producto_id);
  if (!/^PROD-[A-Za-z0-9-]{1,80}$/.test(productoId)) lanzar_('producto_id invalido.', 400);
  var entrada = normalizarCambioProductoAdmin_({ producto_id: productoId, cambios: body.producto || {} });
  entrada.cambios.tipo_disponibilidad = tipoDisponibilidadProducto_(entrada.cambios.tipo_disponibilidad);
  var requeridos = ['nombre', 'categoria', 'unidad_medida', 'permite_decimal', 'paso_venta', 'precio_venta', 'stock_minimo', 'prioridad', 'activo'];
  requeridos.forEach(function (campo) {
    if (entrada.cambios[campo] === undefined || limpiar_(entrada.cambios[campo]) === '') lanzar_('Falta campo requerido: ' + campo + '.', 400);
  });
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) lanzar_('El backend TEST esta ocupado.', 503);
  try {
    return ejecutarIdempotenteBajoLock_('crearProductoAdmin', body.idempotency_key, entrada, function () {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var hoja = leerHoja_(ss, HOJAS.PRODUCTOS);
      var auditoria = leerHoja_(ss, HOJAS.AUDITORIA_PRODUCTOS);
      if (buscarFila_(hoja, col_(hoja, 'id_producto'), productoId) !== -1) lanzar_('El producto ya existe.', 409);
      exigirColumnasEdicionIdentidadB1_(hoja, entrada.cambios);
      if (modoVenta_(entrada.cambios) === 'GRANEL') validarModeloGranel_(entrada.cambios);
      var producto = { id_producto: productoId, stock_actual: 0 };
      Object.keys(entrada.cambios).forEach(function (campo) { producto[campo] = entrada.cambios[campo]; });
      validarAsociacionSkuAdminB3_(ss, producto);
      var ultimaFila = hoja.sheet.getLastRow();
      var ultimoAudit = auditoria.sheet.getLastRow();
      try {
        agregarFila_(hoja, producto);
        var ahora = new Date();
        agregarFila_(auditoria, {
          auditoria_id: generarIdOperacion_('AUD', ahora), fecha_hora: marca_(ahora),
          producto_id: productoId, accion: 'crear', cambios_json: JSON.stringify(producto),
          responsable: limpiar_(body.responsable) || 'admin_web', referencia_id: limpiar_(body.idempotency_key)
        });
        SpreadsheetApp.flush();
        return serializarRegistroF78_(producto);
      } catch (err) {
        eliminarFilasAgregadas_(hoja.sheet, ultimaFila);
        eliminarFilasAgregadas_(auditoria.sheet, ultimoAudit);
        SpreadsheetApp.flush();
        throw err;
      }
    });
  } finally { lock.releaseLock(); }
}

function normalizarCambioProductoAdmin_(body) {
  var productoId = limpiar_(body.producto_id);
  if (!/^PROD-[A-Za-z0-9-]{1,80}$/.test(productoId)) lanzar_('producto_id invalido.', 400);
  var permitidos = ['nombre', 'categoria', 'unidad_medida', 'permite_decimal', 'paso_venta', 'precio_costo', 'precio_venta', 'stock_minimo', 'prioridad', 'imagen_url', 'activo', 'tipo_disponibilidad', 'modo_venta', 'gramos_referencia', 'gramos_unidad_stock'].concat(COLUMNAS_IDENTIDAD_SKU_FAMILIA);
  var cambios = {};
  Object.keys(body.cambios || {}).forEach(function (campo) {
    if (permitidos.indexOf(campo) === -1 || campo === 'stock_actual') lanzar_('Campo de producto no editable.', 400);
    cambios[campo] = body.cambios[campo];
  });
  if (!Object.keys(cambios).length) lanzar_('No hay cambios de producto.', 400);
  var identidad = normalizarIdentidadSkuFisicaB1_(cambios);
  Object.keys(identidad).forEach(function (campo) { cambios[campo] = identidad[campo]; });
  if (cambios.modo_venta !== undefined && ['UNIDAD','GRANEL'].indexOf(cambios.modo_venta) < 0) lanzar_('Modo de venta invalido.',400);
  ['gramos_referencia','gramos_unidad_stock'].forEach(function(k) { if (cambios[k] !== undefined && (!enteroSeguro_(Number(cambios[k])) || Number(cambios[k]) < 0)) lanzar_('Referencia invalida.',400); });
  if (cambios.nombre !== undefined && !limpiar_(cambios.nombre)) lanzar_('Nombre invalido.', 400);
  if (cambios.categoria !== undefined && ['Granel', 'Alimentos', 'Limpieza', 'Higiene'].indexOf(limpiar_(cambios.categoria)) === -1) lanzar_('Categoria invalida.', 400);
  if (cambios.unidad_medida !== undefined && ['unidad', 'pack', 'kg'].indexOf(limpiar_(cambios.unidad_medida)) === -1) lanzar_('Unidad invalida.', 400);
  if (cambios.prioridad !== undefined && ['alta', 'media', 'baja'].indexOf(limpiar_(cambios.prioridad)) === -1) lanzar_('Prioridad invalida.', 400);
  if (cambios.activo !== undefined) cambios.activo = normalizarSiNo_(cambios.activo);
  if (cambios.tipo_disponibilidad !== undefined) {
    if (['REGULAR', 'POR_APERTURA'].indexOf(cambios.tipo_disponibilidad) === -1) lanzar_('Tipo de disponibilidad invalido.', 400);
  }
  if (cambios.permite_decimal !== undefined) cambios.permite_decimal = normalizarSiNo_(cambios.permite_decimal);
  ['paso_venta', 'precio_costo', 'precio_venta', 'stock_minimo'].forEach(function (campo) {
    if (cambios[campo] !== undefined) {
      if (campo === 'precio_costo' && limpiar_(cambios[campo]) === '') return;
      cambios[campo] = Number(cambios[campo]);
      if (!isFinite(cambios[campo]) || cambios[campo] < 0 || (campo === 'paso_venta' && cambios[campo] <= 0)) lanzar_('Valor numerico invalido.', 400);
    }
  });
  if (cambios.permite_decimal === 'NO' && cambios.paso_venta !== undefined && cambios.paso_venta !== 1) lanzar_('Producto entero debe usar paso 1.', 400);
  return { producto_id: productoId, cambios: cambios };
}

function ajustarStockAdmin_(body) {
  exigirIdempotencyKey_(body.idempotency_key);
  var entrada = {
    producto_id: limpiar_(body.producto_id), delta: Number(body.delta),
    motivo: limpiar_(body.motivo), responsable: limpiar_(body.responsable),
    observaciones: limpiar_(body.observaciones)
  };
  if (body.stock_esperado !== undefined) {
    if (typeof body.stock_esperado !== 'number' || !isFinite(body.stock_esperado) || body.stock_esperado < 0) lanzar_('Stock esperado invalido.',400);
    entrada.stock_esperado = body.stock_esperado;
  }
  var motivos = ['recuento_fisico', 'merma', 'error_carga_inicial', 'devolucion', 'otro'];
  if (!/^PROD-[A-Za-z0-9-]{1,80}$/.test(entrada.producto_id)) lanzar_('producto_id invalido.', 400);
  if (!isFinite(entrada.delta) || entrada.delta === 0) lanzar_('Delta de stock invalido.', 400);
  if (motivos.indexOf(entrada.motivo) === -1) lanzar_('Motivo invalido.', 400);
  if (!entrada.responsable) lanzar_('Falta responsable.', 400);
  if (entrada.motivo === 'otro' && !entrada.observaciones) lanzar_('El motivo otro exige observaciones.', 400);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) lanzar_('El backend TEST esta ocupado.', 503);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var productos = leerHoja_(ss, HOJAS.PRODUCTOS);
    var movimientos = leerHoja_(ss, HOJAS.MOVIMIENTOS_STOCK);
    var hash = hashPayload_(entrada);
    var cReferenciaTipo = col_(movimientos, 'referencia_tipo');
    var cReferenciaId = col_(movimientos, 'referencia_id');
    for (var i = 0; i < movimientos.filas.length; i++) {
      if (limpiar_(movimientos.filas[i][cReferenciaTipo]) === 'ajuste_admin' && limpiar_(movimientos.filas[i][cReferenciaId]) === limpiar_(body.idempotency_key)) {
        var previo = filaAObjeto_(movimientos, movimientos.filas[i]);
        if (limpiar_(previo.payload_hash) !== hash) lanzar_('La clave de idempotencia ya fue usada con otro contenido.', 409);
        return { producto_id: limpiar_(previo.producto_id || previo.id_producto), stock_anterior: parseNum_(previo.stock_anterior), stock_nuevo: parseNum_(previo.stock_resultante), delta: parseNum_(previo.cantidad) };
      }
    }
    var ultimaFilaMovimiento = movimientos.sheet.getLastRow();
    exigirSinBloqueoDurableC5_(ss, '', [entrada.producto_id]);
    var fila = buscarFila_(productos, col_(productos, 'id_producto'), entrada.producto_id);
    if (fila === -1) lanzar_('Producto no encontrado.', 404);
    var cStock = col_(productos, 'stock_actual');
    var anterior = parseNum_(productos.filas[fila][cStock]);
    if (entrada.stock_esperado !== undefined && anterior !== entrada.stock_esperado) lanzar_('El stock cambio desde el conteo/dry-run. Revisar antes de ajustar.',409);
    var maestro = filaAObjeto_(productos,productos.filas[fila]);
    validarPrecisionStock_(maestro,anterior);
    validarPrecisionStock_(maestro,entrada.delta);
    var nuevo = redondearStock_(anterior + entrada.delta);
    if (nuevo < 0) lanzar_('El ajuste dejaria stock negativo.', 409);
    var ahora = new Date();
    try {
      productos.sheet.getRange(fila + 2, cStock + 1).setValue(nuevo);
      registrarMovimiento_(movimientos, {
        tipo: 'ajuste', origen: 'ajuste_admin', referencia_tipo: 'ajuste_admin',
        id_origen: limpiar_(body.idempotency_key), id_producto: entrada.producto_id,
        cantidad: entrada.delta, stock_anterior: anterior, stock_resultante: nuevo,
        usuario: entrada.responsable,
        observaciones: entrada.motivo + (entrada.observaciones ? ': ' + entrada.observaciones : ''),
        ahora: ahora, payload_hash: hash
      });
      SpreadsheetApp.flush();
      return { producto_id: entrada.producto_id, stock_anterior: anterior, stock_nuevo: nuevo, delta: entrada.delta };
    } catch (err) {
      productos.sheet.getRange(fila + 2, cStock + 1).setValue(anterior);
      eliminarFilasAgregadas_(movimientos.sheet, ultimaFilaMovimiento);
      SpreadsheetApp.flush();
      throw err;
    }
  } finally { lock.releaseLock(); }
}

function obtenerCajaCompra_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var hoja = leerHoja_(ss, HOJAS.CAJA_COMPRA);
  var registros = hoja.filas.map(function (fila) { return serializarRegistroF78_(filaAObjeto_(hoja, fila)); })
    .filter(function (caja) { return limpiar_(caja.caja_compra_id); });
  var ultimo = registros.length ? registros[registros.length - 1] : null;
  var pendientes = calcularPendientesReferencia_(ss);
  return {
    ultimo_registro: ultimo, pendientes_por_cobrar: pendientes,
    advertencia: 'TEST / NO OPERATIVA REAL: costos, minimos y prioridades pueden ser sinteticos.'
  };
}

function obtenerPropuestaAbastecimiento_(presupuestoCrudo) {
  var presupuesto = Number(presupuestoCrudo);
  if (!isFinite(presupuesto) || presupuesto < 0 || Math.floor(presupuesto) !== presupuesto) {
    lanzar_('Presupuesto de abastecimiento invalido.', 400);
  }
  var ordenPrioridad = { alta: 0, media: 1, baja: 2 };
  var candidatos = listarProductosAdmin_().filter(function (producto) {
    return normalizarSiNo_(producto.activo) === 'SI' &&
      parseNum_(producto.stock_actual) < parseNum_(producto.stock_minimo);
  }).sort(function (a, b) {
    var prioridadA = ordenPrioridad[limpiar_(a.prioridad)] !== undefined
      ? ordenPrioridad[limpiar_(a.prioridad)] : ordenPrioridad.media;
    var prioridadB = ordenPrioridad[limpiar_(b.prioridad)] !== undefined
      ? ordenPrioridad[limpiar_(b.prioridad)] : ordenPrioridad.media;
    return prioridadA - prioridadB || limpiar_(a.id_producto).localeCompare(limpiar_(b.id_producto));
  });
  var disponible = presupuesto;
  var lineas = [];
  var omitidos = [];
  candidatos.forEach(function (producto) {
    var productoId = limpiar_(producto.id_producto);
    var costoTexto = limpiar_(producto.precio_costo);
    var costo = Number(costoTexto);
    if (!costoTexto || !isFinite(costo) || costo <= 0 || Math.floor(costo) !== costo) {
      omitidos.push({ producto_id: productoId, motivo: 'Falta costo vigente valido.' });
      return;
    }
    var decimal = normalizarSiNo_(producto.permite_decimal) === 'SI';
    var paso = decimal ? parseNum_(producto.paso_venta) : 1;
    if (!isFinite(paso) || paso <= 0) {
      omitidos.push({ producto_id: productoId, motivo: 'El paso de compra no es valido.' });
      return;
    }
    var actual = parseNum_(producto.stock_actual);
    var objetivo = parseNum_(producto.stock_minimo);
    var pasosNecesarios = Math.ceil(((objetivo - actual) - 0.000000001) / paso);
    var pasosPosibles = Math.floor(disponible / (costo * paso));
    var pasos = Math.min(pasosNecesarios, pasosPosibles);
    if (pasos <= 0) {
      omitidos.push({ producto_id: productoId, motivo: 'Presupuesto insuficiente.' });
      return;
    }
    var cantidad = redondearStock_(pasos * paso);
    var subtotal = Math.round(cantidad * costo);
    disponible -= subtotal;
    lineas.push({
      producto_id: productoId, nombre_producto: limpiar_(producto.nombre),
      prioridad: limpiar_(producto.prioridad) || 'media', cantidad_sugerida: cantidad,
      costo_unitario: costo, subtotal: subtotal, stock_actual: actual, stock_objetivo: objetivo
    });
  });
  var total = lineas.reduce(function (suma, linea) { return suma + linea.subtotal; }, 0);
  return {
    presupuesto: presupuesto, total_propuesto: total,
    saldo_sin_asignar: presupuesto - total, lineas: lineas, omitidos: omitidos,
    advertencia: 'PROPUESTA DE ABASTECIMIENTO TEST / NO USAR COMO RECOMENDACION OPERATIVA REAL'
  };
}

function obtenerReportesFase78_(params) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var desde = params.desde || '';
  var hasta = params.hasta || '';
  var productos = listarProductosAdmin_();
  var compras = listarCompras_(desde, hasta);
  var gastos = listarGastosExtra_(desde, hasta);
  var movimientos = listarMovimientosStockAdmin_(params.producto_id, desde, hasta);
  var costos = listarHistorialCostos_(params.producto_id, desde, hasta);
  var ranking = rankingVentasFase78_(ss, params.apertura_id, desde, hasta);
  var ventasHistoricas = listarRegistrosPeriodoF78_(leerHoja_(ss, HOJAS.VENTAS), 'fecha_hora', desde, hasta)
    .filter(function (venta) { return !limpiar_(params.apertura_id) || limpiar_(venta.apertura_id) === limpiar_(params.apertura_id); });
  var pedidosHistoricos = listarRegistrosPeriodoF78_(leerHoja_(ss, HOJAS.PEDIDOS), 'fecha_hora', desde, hasta)
    .filter(function (pedido) { return !limpiar_(params.apertura_id) || limpiar_(pedido.apertura_id) === limpiar_(params.apertura_id); });
  var auditoriaProductos = listarRegistrosPeriodoF78_(leerHoja_(ss, HOJAS.AUDITORIA_PRODUCTOS), 'fecha_hora', desde, hasta)
    .filter(function (r) { return r.entidad_tipo !== 'FAMILIA'; }); // Histórico vacío sigue siendo PRODUCTO.
  return {
    compras: compras, gastos: gastos, movimientos_stock: movimientos,
    historial_costos: costos, auditoria_productos: auditoriaProductos,
    ventas: ventasHistoricas, pedidos: pedidosHistoricos,
    productos_mas_vendidos: ranking,
    productos_bajo_stock: productos.filter(function (p) {
      return normalizarSiNo_(p.activo) === 'SI' && parseNum_(p.stock_actual) < parseNum_(p.stock_minimo);
    }),
    resumen: {
      cantidad_compras: compras.length,
      total_compras: compras.reduce(function (s, c) { return s + parseNum_(c.total); }, 0),
      cantidad_gastos: gastos.length,
      total_gastos: gastos.filter(function (g) { return limpiar_(g.estado) === 'vigente'; })
        .reduce(function (s, g) { return s + parseNum_(g.monto); }, 0)
    },
    resumen_apertura: limpiar_(params.apertura_id) ? obtenerResumenApertura_(limpiar_(params.apertura_id)) : null,
    advertencia_abastecimiento: 'PROPUESTA DE ABASTECIMIENTO TEST / NO USAR COMO RECOMENDACION OPERATIVA REAL'
  };
}

function listarRegistrosPeriodoF78_(hoja, campoFecha, desde, hasta) {
  return hoja.filas.map(function (fila) { return serializarRegistroF78_(filaAObjeto_(hoja, fila)); })
    .filter(function (registro) { return dentroPeriodo_(registro[campoFecha], desde, hasta); }).reverse();
}

function rankingVentasFase78_(ss, aperturaId, desde, hasta) {
  var ventas = leerHoja_(ss, HOJAS.VENTAS);
  var detalles = leerHoja_(ss, HOJAS.DETALLE_VENTAS);
  var validas = {};
  ventas.filas.forEach(function (fila) {
    var venta = filaAObjeto_(ventas, fila);
    var id = limpiar_(venta.venta_id || venta.id_venta);
    var aperturaOk = !limpiar_(aperturaId) || limpiar_(venta.apertura_id) === limpiar_(aperturaId);
    if (id && aperturaOk && limpiar_(venta.estado_venta || 'vigente') !== 'cancelada' && dentroPeriodo_(venta.fecha_hora, desde, hasta)) validas[id] = true;
  });
  var agrupados = {};
  detalles.filas.forEach(function (fila) {
    var detalle = filaAObjeto_(detalles, fila);
    var ventaId = limpiar_(detalle.venta_id || detalle.id_venta);
    if (!validas[ventaId]) return;
    var productoId = limpiar_(detalle.producto_id || detalle.id_producto);
    if (!agrupados[productoId]) agrupados[productoId] = { producto_id: productoId, nombre_producto: limpiar_(detalle.nombre_producto), cantidad: 0, total: 0 };
    agrupados[productoId].cantidad += parseNum_(detalle.cantidad);
    agrupados[productoId].total += parseNum_(detalle.subtotal);
  });
  return Object.keys(agrupados).map(function (id) { return agrupados[id]; })
    .sort(function (a, b) { return b.cantidad - a.cantidad || a.producto_id.localeCompare(b.producto_id); });
}

function calcularPendientesReferencia_(ss) {
  var total = 0;
  var ventas = leerHoja_(ss, HOJAS.VENTAS);
  ventas.filas.forEach(function (fila) {
    var venta = filaAObjeto_(ventas, fila);
    if (limpiar_(venta.estado_pago) === 'pendiente_de_pago' && limpiar_(venta.estado_venta || 'vigente') !== 'cancelada') total += parseNum_(venta.total);
  });
  var pedidos = leerHoja_(ss, HOJAS.PEDIDOS);
  pedidos.filas.forEach(function (fila) {
    var pedido = filaAObjeto_(pedidos, fila);
    if (limpiar_(pedido.estado_pago) === 'pendiente' && limpiar_(pedido.estado_pedido) !== 'cancelado') total += parseNum_(pedido.total);
  });
  return total;
}

function dentroPeriodo_(valor, desde, hasta) {
  var fecha = valorFechaHoraF78_(valor).slice(0, 10);
  var inicio = limpiar_(desde);
  var fin = limpiar_(hasta);
  return (!inicio || fecha >= inicio) && (!fin || fecha <= fin);
}

function serializarRegistroF78_(obj) {
  var salida = {};
  Object.keys(obj).forEach(function (campo) {
    var valor = obj[campo];
    salida[campo] = Object.prototype.toString.call(valor) === '[object Date]'
      ? (campo.indexOf('fecha') !== -1 ? marca_(valor) : marcaIso_(valor))
      : valor;
  });
  return salida;
}

function valorFechaHoraF78_(valor) {
  return Object.prototype.toString.call(valor) === '[object Date]' ? marca_(valor) : limpiar_(valor);
}

function normalizarSiNo_(valor) {
  if (valor === true) return 'SI';
  if (valor === false) return 'NO';
  var texto = limpiar_(valor).toUpperCase();
  if (texto !== 'SI' && texto !== 'NO') lanzar_('Valor SI/NO invalido.', 400);
  return texto;
}

// ============================== APERTURAS TEST ================================

/**
 * Preparacion MANUAL e idempotente de APERTURAS en la Sheet TEST.
 *
 * Ejecutar desde el editor del proyecto Apps Script TEST despues de definir la
 * propiedad de script APP_ENV=TEST. Si la hoja no existe, crea los encabezados;
 * si existe, exige que coincidan exactamente. Agrega solo semillas ausentes.
 * Nunca borra ni reemplaza filas existentes.
 */
function prepararHojaAperturasTest() {
  validarConfig_();
  validarEntornoTestCalendario_();

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(HOJAS.APERTURAS);
    var creada = false;
    if (!sheet) {
      sheet = ss.insertSheet(HOJAS.APERTURAS);
      creada = true;
    }
    var encabezadosPreparados = false;
    if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
      sheet.getRange(1, 1, 1, COLUMNAS_APERTURAS.length).setValues([COLUMNAS_APERTURAS]);
      sheet.getRange(1, 1, sheet.getMaxRows(), COLUMNAS_APERTURAS.length).setNumberFormat('@');
      sheet.getRange(1, 1, 1, COLUMNAS_APERTURAS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
      encabezadosPreparados = true;
    }

    var aperturas = leerHoja_(ss, HOJAS.APERTURAS);
    validarEncabezadosAperturas_(aperturas);
    var cId = col_(aperturas, 'apertura_id');
    var ids = {};
    for (var i = 0; i < aperturas.filas.length; i++) {
      var id = limpiar_(aperturas.filas[i][cId]);
      if (id) ids[id] = true;
    }

    var ahora = marcaIso_(new Date());
    var semillas = semillasAperturasTest_();
    var agregadas = [];
    for (var s = 0; s < semillas.length; s++) {
      var semilla = semillas[s];
      if (ids[semilla.apertura_id]) continue;
      semilla.creada_por = 'setup_test';
      semilla.actualizada_por = 'setup_test';
      semilla.creado_en = ahora;
      semilla.actualizado_en = ahora;
      agregarFila_(aperturas, semilla);
      agregadas.push(semilla.apertura_id);
    }

    SpreadsheetApp.flush();
    return {
      hoja_creada: creada,
      encabezados_preparados: encabezadosPreparados,
      semillas_agregadas: agregadas,
      semillas_omitidas: semillas.length - agregadas.length
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Agrega de forma idempotente las dos columnas de PEDIDOS necesarias para el
 * primer bloque público de pedidos anticipados. Solo se permite en TEST.
 */
function prepararColumnasPedidosAnticipadosTest() {
  validarConfig_();
  validarEntornoTestCalendario_();
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var pedidos = leerHoja_(ss, HOJAS.PEDIDOS);
  var requeridas = ['apertura_id', 'origen_pedido'];
  var agregadas = [];
  for (var i = 0; i < requeridas.length; i++) {
    var nombre = requeridas[i];
    if (pedidos.mapa[nombre] !== undefined) continue;
    var columna = pedidos.sheet.getLastColumn() + 1;
    pedidos.sheet.getRange(1, columna).setValue(nombre).setFontWeight('bold');
    agregadas.push(nombre);
    pedidos = leerHoja_(ss, HOJAS.PEDIDOS);
  }
  SpreadsheetApp.flush();
  validarColumnasPedidosAnticipados_(pedidos);
  return { columnas_agregadas: agregadas, contrato: 'pedidos_anticipados_publicos_v1' };
}

function obtenerCapacidadesFase3b_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  validarColumnasPedidosAnticipados_(leerHoja_(ss, HOJAS.PEDIDOS));
  return { pedidos_anticipados_publicos: 'v1' };
}

function validarColumnasPedidosAnticipados_(pedidos) {
  col_(pedidos, 'apertura_id');
  col_(pedidos, 'origen_pedido');
}

/**
 * En TEST, valida por segunda vez bajo lock que el pedido sigue asociado a la
 * única apertura activa y que el cierre no ha vencido. Fuera de TEST conserva
 * exactamente el comportamiento productivo anterior.
 */
function validarPedidoAnticipadoTest_(ss, body, ahora) {
  var entorno = limpiar_(PropertiesService.getScriptProperties().getProperty('APP_ENV'));
  if (entorno !== 'TEST') return { apertura_id: '', origen_pedido: '' };

  var pedidos = leerHoja_(ss, HOJAS.PEDIDOS);
  validarColumnasPedidosAnticipados_(pedidos);
  var hojaAperturas = leerHoja_(ss, HOJAS.APERTURAS);
  validarEncabezadosAperturas_(hojaAperturas);
  var aperturas = [];
  for (var i = 0; i < hojaAperturas.filas.length; i++) {
    var apertura = serializarApertura_(filaAObjeto_(hojaAperturas, hojaAperturas.filas[i]));
    if (apertura.apertura_id) aperturas.push(apertura);
  }

  var fechaActual = Utilities.formatDate(
    ahora,
    'America/Santiago',
    "yyyy-MM-dd'T'HH:mm"
  );
  var activa = seleccionarAperturaActivaPedidoTest_(aperturas, fechaActual);
  if (!activa) {
    lanzar_('No hay una apertura activa con pedidos anticipados disponibles.', 409);
  }

  var aperturaId = limpiar_(body.apertura_id);
  var origen = limpiar_(body.origen_pedido);
  if (aperturaId !== activa.apertura_id) {
    lanzar_('La apertura activa cambio. Recarga la tienda antes de enviar el pedido.', 409);
  }
  if (origen !== 'online_anticipado') {
    lanzar_('origen_pedido invalido para este flujo.', 400);
  }
  return { apertura_id: aperturaId, origen_pedido: origen };
}

function seleccionarAperturaActivaPedidoTest_(entradas, fechaActual) {
  var candidatas = [];
  for (var i = 0; i < entradas.length; i++) {
    var entrada = entradas[i] || {};
    var fecha = normalizarFechaPedido_(entrada.fecha_apertura);
    var inicio = normalizarHoraPedido_(entrada.hora_inicio);
    var termino = normalizarHoraPedido_(entrada.hora_termino);
    var cierre = normalizarCierrePedido_(entrada.cierre_pedidos_anticipados);
    if (!/^APE-\d{8}$/.test(limpiar_(entrada.apertura_id)) ||
        !esFechaIsoValida_(fecha) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(inicio) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(termino) ||
        !esFechaHoraIsoValida_(cierre)) continue;
    if (limpiar_(entrada.estado_apertura) !== 'activa') continue;
    if (limpiar_(entrada.pedidos_anticipados_estado) !== 'activo') continue;
    if (fechaActual > cierre) continue;
    candidatas.push({
      apertura_id: limpiar_(entrada.apertura_id),
      fecha_apertura: fecha,
      hora_inicio: inicio,
      hora_termino: termino,
      cierre_pedidos_anticipados: cierre
    });
  }
  if (candidatas.length > 1) {
    lanzar_('Hay mas de una apertura activa disponible para pedidos anticipados.', 409);
  }
  return candidatas.length === 1 ? candidatas[0] : null;
}

function normalizarFechaPedido_(valor) {
  var texto = limpiar_(valor);
  var match = /^(\d{4}-\d{2}-\d{2})(?:T.*)?$/.exec(texto);
  return match ? match[1] : texto;
}

function normalizarHoraPedido_(valor) {
  var texto = limpiar_(valor);
  var match = /^(?:\d{4}-\d{2}-\d{2}T)?([0-2]\d):([0-5]\d)/.exec(texto);
  return match && Number(match[1]) <= 23 ? match[1] + ':' + match[2] : texto;
}

function normalizarCierrePedido_(valor) {
  var texto = limpiar_(valor);
  var match = /^(\d{4}-\d{2}-\d{2})T([0-2]\d):([0-5]\d)/.exec(texto);
  return match && Number(match[2]) <= 23
    ? match[1] + 'T' + match[2] + ':' + match[3]
    : texto;
}

function semillasAperturasTest_() {
  var fechas = [
    ['APE-20260919', '2026-09-19', '2026-09-17T23:59', 'activa'],
    ['APE-20261003', '2026-10-03', '2026-10-01T23:59', 'programada'],
    ['APE-20261017', '2026-10-17', '2026-10-15T23:59', 'programada'],
    ['APE-20261107', '2026-11-07', '2026-11-05T23:59', 'programada'],
    ['APE-20261121', '2026-11-21', '2026-11-19T23:59', 'programada'],
    ['APE-20261205', '2026-12-05', '2026-12-03T23:59', 'programada'],
    ['APE-20261219', '2026-12-19', '2026-12-17T23:59', 'programada']
  ];
  return fechas.map(function (fila) {
    return {
      apertura_id: fila[0],
      fecha_apertura: fila[1],
      hora_inicio: '11:00',
      hora_termino: '15:00',
      lugar: '',
      cierre_pedidos_anticipados: fila[2],
      estado_apertura: fila[3],
      pedidos_anticipados_estado: 'activo',
      modo_presencial_estado: 'inactivo',
      mensaje_publico: '',
      observaciones_internas: 'Semilla TEST; lugar pendiente de confirmacion.'
    };
  });
}

function listarAperturas_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var aperturas = leerHoja_(ss, HOJAS.APERTURAS);
  validarEncabezadosAperturas_(aperturas);
  var resultado = [];
  for (var i = 0; i < aperturas.filas.length; i++) {
    var apertura = serializarApertura_(filaAObjeto_(aperturas, aperturas.filas[i]));
    if (apertura.apertura_id) resultado.push(apertura);
  }
  resultado.sort(function (a, b) {
    return String(a.fecha_apertura).localeCompare(String(b.fecha_apertura));
  });
  return resultado;
}

function obtenerApertura_(idApertura) {
  idApertura = limpiar_(idApertura);
  if (!idApertura) lanzar_('Falta apertura_id.', 400);
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var aperturas = leerHoja_(ss, HOJAS.APERTURAS);
  validarEncabezadosAperturas_(aperturas);
  return obtenerAperturaEnHoja_(aperturas, idApertura).apertura;
}

function crearApertura_(body) {
  exigirIdempotencyKey_(body.idempotency_key);
  var apertura = validarYNormalizarApertura_(body.apertura || body);
  var actor = limpiar_(body.actor) || 'admin_web';

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return ejecutarIdempotenteBajoLock_(
      'crearApertura',
      body.idempotency_key,
      apertura,
      function () {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var hoja = leerHoja_(ss, HOJAS.APERTURAS);
        validarEncabezadosAperturas_(hoja);
        exigirIdUnico_(hoja, apertura.apertura_id);
        exigirSinSolapamiento_(hoja, apertura, -1);
        var ahora = marcaIso_(new Date());
        apertura.creada_por = actor;
        apertura.actualizada_por = actor;
        apertura.creado_en = ahora;
        apertura.actualizado_en = ahora;
        agregarFila_(hoja, apertura);
        SpreadsheetApp.flush();
        return apertura;
      }
    );
  } finally {
    lock.releaseLock();
  }
}

function actualizarApertura_(body) {
  exigirIdempotencyKey_(body.idempotency_key);
  var idApertura = limpiar_(body.apertura_id);
  var esperado = limpiar_(body.actualizado_en_esperado);
  if (!idApertura) lanzar_('Falta apertura_id.', 400);
  if (!esperado) lanzar_('Falta actualizado_en_esperado.', 400);
  var apertura = validarYNormalizarApertura_(body.apertura || body);
  if (apertura.apertura_id !== idApertura) {
    lanzar_('apertura_id no puede cambiar durante una actualizacion.', 400);
  }
  var actor = limpiar_(body.actor) || 'admin_web';

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return ejecutarIdempotenteBajoLock_(
      'actualizarApertura',
      body.idempotency_key,
      { apertura_id: idApertura, actualizado_en_esperado: esperado, apertura: apertura },
      function () {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var hoja = leerHoja_(ss, HOJAS.APERTURAS);
        validarEncabezadosAperturas_(hoja);
        var encontrada = obtenerAperturaEnHoja_(hoja, idApertura);
        if (limpiar_(encontrada.apertura.actualizado_en) !== esperado) {
          lanzar_('La apertura fue modificada por otra sesion. Recarga antes de guardar.', 409);
        }
        exigirSinSolapamiento_(hoja, apertura, encontrada.indice);
        apertura.creada_por = encontrada.apertura.creada_por;
        apertura.creado_en = encontrada.apertura.creado_en;
        apertura.actualizada_por = actor;
        apertura.actualizado_en = marcaIso_(new Date());
        escribirObjetoEnFila_(hoja, encontrada.indice, apertura);
        SpreadsheetApp.flush();
        return apertura;
      }
    );
  } finally {
    lock.releaseLock();
  }
}

function cambiarEstadoApertura_(body) {
  exigirIdempotencyKey_(body.idempotency_key);
  var idApertura = limpiar_(body.apertura_id);
  var nuevoEstado = limpiar_(body.estado_apertura);
  var esperado = limpiar_(body.actualizado_en_esperado);
  if (!idApertura) lanzar_('Falta apertura_id.', 400);
  if (!esperado) lanzar_('Falta actualizado_en_esperado.', 400);
  if (['programada', 'activa', 'cerrada', 'cancelada', 'por_confirmar'].indexOf(nuevoEstado) === -1) {
    lanzar_('estado_apertura invalido: "' + nuevoEstado + '".', 400);
  }
  var actor = limpiar_(body.actor) || 'admin_web';

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return ejecutarIdempotenteBajoLock_(
      'cambiarEstadoApertura',
      body.idempotency_key,
      { apertura_id: idApertura, estado_apertura: nuevoEstado, actualizado_en_esperado: esperado },
      function () {
        var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        var hoja = leerHoja_(ss, HOJAS.APERTURAS);
        validarEncabezadosAperturas_(hoja);
        var encontrada = obtenerAperturaEnHoja_(hoja, idApertura);
        var actual = encontrada.apertura;
        if (limpiar_(actual.actualizado_en) !== esperado) {
          lanzar_('La apertura fue modificada por otra sesion. Recarga antes de guardar.', 409);
        }
        exigirTransicionApertura_(actual.estado_apertura, nuevoEstado);
        actual.estado_apertura = nuevoEstado;
        actual.actualizada_por = actor;
        actual.actualizado_en = marcaIso_(new Date());
        escribirObjetoEnFila_(hoja, encontrada.indice, actual);
        SpreadsheetApp.flush();
        return actual;
      }
    );
  } finally {
    lock.releaseLock();
  }
}

function validarYNormalizarApertura_(entrada) {
  entrada = entrada || {};
  var apertura = {
    apertura_id: limpiar_(entrada.apertura_id),
    fecha_apertura: limpiar_(entrada.fecha_apertura),
    hora_inicio: limpiar_(entrada.hora_inicio),
    hora_termino: limpiar_(entrada.hora_termino),
    lugar: limpiar_(entrada.lugar),
    cierre_pedidos_anticipados: limpiar_(entrada.cierre_pedidos_anticipados),
    estado_apertura: limpiar_(entrada.estado_apertura),
    pedidos_anticipados_estado: limpiar_(entrada.pedidos_anticipados_estado),
    modo_presencial_estado: limpiar_(entrada.modo_presencial_estado),
    mensaje_publico: limpiar_(entrada.mensaje_publico),
    observaciones_internas: limpiar_(entrada.observaciones_internas)
  };

  if (!/^APE-[0-9]{8}$/.test(apertura.apertura_id)) {
    lanzar_('apertura_id debe usar el formato APE-yyyyMMdd.', 400);
  }
  if (!esFechaIsoValida_(apertura.fecha_apertura)) {
    lanzar_('fecha_apertura debe ser una fecha valida yyyy-MM-dd.', 400);
  }
  if (apertura.apertura_id !== 'APE-' + apertura.fecha_apertura.replace(/-/g, '')) {
    lanzar_('apertura_id no coincide con fecha_apertura.', 400);
  }
  if (!/^[0-2][0-9]:[0-5][0-9]$/.test(apertura.hora_inicio) ||
      Number(apertura.hora_inicio.slice(0, 2)) > 23) {
    lanzar_('hora_inicio debe usar HH:mm.', 400);
  }
  if (!/^[0-2][0-9]:[0-5][0-9]$/.test(apertura.hora_termino) ||
      Number(apertura.hora_termino.slice(0, 2)) > 23) {
    lanzar_('hora_termino debe usar HH:mm.', 400);
  }
  if (apertura.hora_inicio >= apertura.hora_termino) {
    lanzar_('hora_inicio debe ser anterior a hora_termino.', 400);
  }
  if (!esFechaHoraIsoValida_(apertura.cierre_pedidos_anticipados)) {
    lanzar_('cierre_pedidos_anticipados debe usar yyyy-MM-ddTHH:mm.', 400);
  }
  if (apertura.cierre_pedidos_anticipados >=
      apertura.fecha_apertura + 'T' + apertura.hora_inicio) {
    lanzar_('El cierre de pedidos debe ser anterior al inicio de la apertura.', 400);
  }
  if (['programada', 'activa', 'cerrada', 'cancelada', 'por_confirmar'].indexOf(apertura.estado_apertura) === -1) {
    lanzar_('estado_apertura invalido.', 400);
  }
  if (['activo', 'cerrado', 'reabierto_manual', 'pausado'].indexOf(apertura.pedidos_anticipados_estado) === -1) {
    lanzar_('pedidos_anticipados_estado invalido.', 400);
  }
  if (['inactivo', 'activo', 'pausado', 'cerrado'].indexOf(apertura.modo_presencial_estado) === -1) {
    lanzar_('modo_presencial_estado invalido.', 400);
  }
  if (!apertura.lugar &&
      (apertura.estado_apertura === 'programada' || apertura.estado_apertura === 'activa')) {
    lanzar_('lugar es obligatorio antes de programar o activar una apertura.', 400);
  }
  if (apertura.modo_presencial_estado === 'activo' &&
      (apertura.estado_apertura === 'cancelada' || apertura.estado_apertura === 'cerrada')) {
    lanzar_('No se puede activar modo presencial en una apertura cerrada o cancelada.', 400);
  }
  return apertura;
}

function obtenerAperturaEnHoja_(hoja, idApertura) {
  var cId = col_(hoja, 'apertura_id');
  var coincidencias = [];
  for (var i = 0; i < hoja.filas.length; i++) {
    if (limpiar_(hoja.filas[i][cId]) === idApertura) coincidencias.push(i);
  }
  if (!coincidencias.length) lanzar_('Apertura no encontrada: "' + idApertura + '".', 404);
  if (coincidencias.length > 1) lanzar_('Apertura duplicada: "' + idApertura + '".', 409);
  return {
    indice: coincidencias[0],
    apertura: serializarApertura_(filaAObjeto_(hoja, hoja.filas[coincidencias[0]]))
  };
}

function exigirIdUnico_(hoja, idApertura) {
  var cId = col_(hoja, 'apertura_id');
  for (var i = 0; i < hoja.filas.length; i++) {
    if (limpiar_(hoja.filas[i][cId]) === idApertura) {
      lanzar_('Ya existe la apertura "' + idApertura + '".', 409);
    }
  }
}

function exigirSinSolapamiento_(hoja, apertura, indiceIgnorado) {
  if (apertura.estado_apertura === 'cerrada' || apertura.estado_apertura === 'cancelada') return;
  for (var i = 0; i < hoja.filas.length; i++) {
    if (i === indiceIgnorado) continue;
    var otra = serializarApertura_(filaAObjeto_(hoja, hoja.filas[i]));
    if (!otra.apertura_id || otra.estado_apertura === 'cerrada' || otra.estado_apertura === 'cancelada') continue;
    if (otra.fecha_apertura === apertura.fecha_apertura &&
        otra.hora_inicio === apertura.hora_inicio &&
        otra.hora_termino === apertura.hora_termino) {
      lanzar_('Ya existe una apertura publica con la misma fecha y horario.', 409);
    }
  }
}

function exigirTransicionApertura_(actual, siguiente) {
  if (actual === siguiente) return;
  var permitidas = {
    programada: ['activa', 'cerrada', 'cancelada', 'por_confirmar'],
    activa: ['programada', 'cerrada', 'cancelada'],
    por_confirmar: ['programada', 'activa', 'cerrada', 'cancelada'],
    cerrada: ['programada'],
    cancelada: ['programada']
  };
  if (!permitidas[actual] || permitidas[actual].indexOf(siguiente) === -1) {
    lanzar_('Transicion de apertura no permitida: ' + actual + ' -> ' + siguiente + '.', 409);
  }
}

function validarEncabezadosAperturas_(hoja) {
  if (hoja.headers.length !== COLUMNAS_APERTURAS.length) {
    lanzar_('APERTURAS no tiene la cantidad esperada de columnas.', 500);
  }
  for (var i = 0; i < COLUMNAS_APERTURAS.length; i++) {
    if (hoja.headers[i] !== COLUMNAS_APERTURAS[i]) {
      lanzar_('Encabezados de APERTURAS no coinciden con el contrato de Fase 3B.', 500);
    }
  }
}

function serializarApertura_(obj) {
  var salida = {};
  for (var i = 0; i < COLUMNAS_APERTURAS.length; i++) {
    var campo = COLUMNAS_APERTURAS[i];
    salida[campo] = valorTextoApertura_(obj[campo]);
  }
  return salida;
}

function valorTextoApertura_(valor) {
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return marcaIso_(valor);
  }
  return limpiar_(valor);
}

function escribirObjetoEnFila_(hoja, indiceDatos, obj) {
  var fila = hoja.headers.map(function (nombre) {
    return obj[nombre] !== undefined ? obj[nombre] : '';
  });
  hoja.sheet.getRange(indiceDatos + 2, 1, 1, hoja.headers.length).setValues([fila]);
}

function exigirIdempotencyKey_(key) {
  key = limpiar_(key);
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(key)) {
    lanzar_('idempotency_key invalida o ausente.', 400);
  }
}

function ejecutarIdempotenteBajoLock_(accion, key, payload, ejecutar) {
  key = limpiar_(key);
  var props = PropertiesService.getScriptProperties();
  var nombre = 'FASE3B_IDEM_' + accion + '_' + key;
  var hash = hashPayload_(payload);
  var guardado = props.getProperty(nombre);
  if (guardado) {
    var previo = JSON.parse(guardado);
    if (previo.hash !== hash) {
      lanzar_('La clave de idempotencia ya fue usada con otro contenido.', 409);
    }
    return previo.resultado;
  }
  var resultado = ejecutar();
  props.setProperty(nombre, JSON.stringify({ hash: hash, resultado: resultado }));
  return resultado;
}

function hashPayload_(payload) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(payload),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (b) {
    var n = b < 0 ? b + 256 : b;
    return ('0' + n.toString(16)).slice(-2);
  }).join('');
}

function validarEntornoTestCalendario_() {
  var entorno = limpiar_(PropertiesService.getScriptProperties().getProperty('APP_ENV'));
  if (entorno !== 'TEST') {
    lanzar_('Operacion APERTURAS bloqueada: este Apps Script no esta marcado como TEST.', 403);
  }
}

function validarEntornoTestVentas_() {
  var entorno = limpiar_(PropertiesService.getScriptProperties().getProperty('APP_ENV'));
  if (entorno !== 'TEST') {
    lanzar_('Operacion de ventas/caja bloqueada: este Apps Script no esta marcado como TEST.', 403);
  }
}

function validarEntornoTestFase78_() {
  var entorno = limpiar_(PropertiesService.getScriptProperties().getProperty('APP_ENV'));
  if (entorno !== 'TEST') {
    lanzar_('Operacion Fase 7/8 bloqueada: este Apps Script no esta marcado como TEST.', 403);
  }
}

function validarDestinoOperacionesPedidosTest_(ss) {
  var entorno = limpiar_(PropertiesService.getScriptProperties().getProperty('APP_ENV'));
  if (entorno !== 'TEST') {
    lanzar_('Operaciones durables de pedidos bloqueadas fuera de TEST.', 403);
  }
  if (!ss || typeof ss.getName !== 'function' ||
      ss.getName() !== NOMBRE_SHEET_TEST_E2E) {
    lanzar_('El diario de pedidos solo puede operar sobre la Sheet TEST autorizada.', 403);
  }
}

function columnaUnicaContrato_(sheet, nombre) {
  if (!sheet || sheet.getLastColumn() < 1) {
    lanzar_('CONTRATO_SHEET_PEDIDOS_INVALIDO: falta una hoja o encabezados.', 409);
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(limpiar_);
  var indice = headers.indexOf(nombre);
  if (indice === -1 || headers.lastIndexOf(nombre) !== indice) {
    lanzar_('CONTRATO_SHEET_PEDIDOS_INVALIDO: falta o se repite ' + nombre + '.', 409);
  }
  return indice + 1;
}

function reglaEstadosPedidoCorrecta_(regla) {
  if (!regla || regla.getAllowInvalid() ||
      regla.getCriteriaType() !== SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) return false;
  var criterios = regla.getCriteriaValues();
  var valores = criterios && criterios[0];
  return Array.isArray(valores) && valores.length === ESTADOS_PEDIDO.length &&
    ESTADOS_PEDIDO.every(function (estado, indice) { return valores[indice] === estado; });
}

function inspeccionarValidacionEstadosPedidosTest_(ss) {
  validarDestinoOperacionesPedidosTest_(ss);
  var sheet = ss.getSheetByName(HOJAS.PEDIDOS);
  var columna = columnaUnicaContrato_(sheet, 'estado_pedido');
  var filas = sheet.getMaxRows() - 1;
  if (filas < 1) lanzar_('CONTRATO_SHEET_PEDIDOS_INVALIDO: PEDIDOS no tiene filas de datos.', 409);
  var rango = sheet.getRange(2, columna, filas, 1);
  var reglas = rango.getDataValidations();
  var correctas = 0;
  for (var i = 0; i < filas; i++) {
    if (reglas[i] && reglaEstadosPedidoCorrecta_(reglas[i][0])) correctas++;
  }
  return { rango: rango, columna: columna, filas: filas, correctas: correctas };
}

/** Lectura de contrato, sin alterar datos ni reglas. */
function exigirContratoPedidosF9Test_(ss) {
  var validacion = inspeccionarValidacionEstadosPedidosTest_(ss);
  var operaciones = ss.getSheetByName(HOJAS.OPERACIONES_PEDIDOS);
  var movimientos = ss.getSheetByName(HOJAS.MOVIMIENTOS_STOCK);
  columnaUnicaContrato_(operaciones, 'operacion_id');
  columnaUnicaContrato_(movimientos, 'operacion_id');
  if (validacion.correctas !== validacion.filas) {
    lanzar_('CONTRATO_SHEET_PEDIDOS_INVALIDO: estado_pedido no admite los cinco estados F9-A en todas las filas.', 409);
  }
  return {
    entorno: 'TEST', hoja: HOJAS.PEDIDOS,
    columna_estado_pedido: validacion.columna,
    filas_validadas: validacion.correctas,
    estados: ESTADOS_PEDIDO.slice(),
    diario: HOJAS.OPERACIONES_PEDIDOS,
    columna_movimiento: 'operacion_id'
  };
}

function verificarContratoPedidosF9Test() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    return exigirContratoPedidosF9Test_(ss);
  } finally {
    lock.releaseLock();
  }
}

/** Migración de DataValidation, idempotente y exclusiva de la Sheet TEST. */
function prepararValidacionEstadosPedidosTest() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var antes = inspeccionarValidacionEstadosPedidosTest_(ss);
    columnaUnicaContrato_(ss.getSheetByName(HOJAS.OPERACIONES_PEDIDOS), 'operacion_id');
    columnaUnicaContrato_(ss.getSheetByName(HOJAS.MOVIMIENTOS_STOCK), 'operacion_id');
    var actualizada = antes.correctas !== antes.filas;
    if (actualizada) {
      var regla = SpreadsheetApp.newDataValidation()
        .requireValueInList(ESTADOS_PEDIDO, true)
        .setAllowInvalid(false)
        .setHelpText('Valores permitidos: ' + ESTADOS_PEDIDO.join(' / '))
        .build();
      antes.rango.setDataValidation(regla);
      SpreadsheetApp.flush();
    }
    var contrato = exigirContratoPedidosF9Test_(ss);
    contrato.actualizada = actualizada;
    return contrato;
  } finally {
    lock.releaseLock();
  }
}

/** Migración manual, aditiva, idempotente y exclusiva de TEST. */
function prepararOperacionesPedidosTest() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    validarDestinoOperacionesPedidosTest_(ss);
    var objetivos = [
      { nombre: HOJAS.OPERACIONES_PEDIDOS, columnas: COLUMNAS_OPERACIONES_PEDIDOS },
      { nombre: HOJAS.MOVIMIENTOS_STOCK, columnas: ['operacion_id'] }
    ];
    var resultado = objetivos.map(function (objetivo) {
      var sheet = ss.getSheetByName(objetivo.nombre);
      if (!sheet) {
        sheet = ss.insertSheet(objetivo.nombre);
        sheet.getRange(1, 1, 1, objetivo.columnas.length).setValues([objetivo.columnas]);
        sheet.setFrozenRows(1);
        return { hoja: objetivo.nombre, creada: true, agregadas: objetivo.columnas.slice() };
      }
      var hoja = leerHoja_(ss, objetivo.nombre);
      var extension = asegurarColumnasAditivas_(hoja, objetivo.columnas);
      return { hoja: objetivo.nombre, creada: false, agregadas: extension.agregadas };
    });
    SpreadsheetApp.flush();
    return { entorno: 'TEST', cambios: resultado };
  } finally {
    lock.releaseLock();
  }
}

/** Diagnóstico manual read-only para reconciliación; no corrige datos. */
function diagnosticarOperacionPedidoTest(operacionId) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    validarDestinoOperacionesPedidosTest_(ss);
    var operacion = buscarOperacionPedidoPor_(ss, 'operacion_id', limpiar_(operacionId));
    if (!operacion) lanzar_('Operación durable no encontrada.', 404);
    return {
      operacion_id: operacion.operacion_id,
      id_pedido: operacion.id_pedido,
      tipo_operacion: operacion.tipo_operacion,
      estado_operacion: operacion.estado_operacion,
      paso: operacion.paso,
      diagnostico: diagnosticarOperacionPedido_(ss, operacion)
    };
  } finally {
    lock.releaseLock();
  }
}

function esFechaIsoValida_(valor) {
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!match) return false;
  var fecha = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return fecha.getUTCFullYear() === Number(match[1]) &&
    fecha.getUTCMonth() === Number(match[2]) - 1 &&
    fecha.getUTCDate() === Number(match[3]);
}

function esFechaHoraIsoValida_(valor) {
  var match = /^(\d{4}-\d{2}-\d{2})T([0-2]\d):([0-5]\d)$/.exec(valor);
  return !!match && esFechaIsoValida_(match[1]) && Number(match[2]) <= 23;
}

// ============================== HELPERS ========================================

/**
 * Valida que la configuracion fue editada antes de usar el script.
 */
function validarConfig_() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID.indexOf('PEGAR_') === 0) {
    lanzar_('Configura SPREADSHEET_ID antes de desplegar.', 500);
  }
  if (!ADMIN_TOKEN || ADMIN_TOKEN.indexOf('PEGAR_') === 0) {
    lanzar_('Configura ADMIN_TOKEN antes de desplegar.', 500);
  }
}

/**
 * Exige que el token recibido coincida con ADMIN_TOKEN.
 */
function exigirToken_(token) {
  if (limpiar_(token) !== ADMIN_TOKEN) {
    lanzar_('No autorizado: token invalido.', 401);
  }
}

/**
 * Lee una hoja completa y devuelve { sheet, headers, filas, mapa }.
 *   headers: array de nombres de columna (fila 1).
 *   filas:   array 2D de filas de datos (desde la fila 2).
 *   mapa:    { nombreColumna: indice }.
 */
function leerHoja_(ss, nombre) {
  var sheet = ss.getSheetByName(nombre);
  if (!sheet) lanzar_('No existe la hoja "' + nombre + '".', 500);

  var ultimaFila = sheet.getLastRow();
  var ultimaCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, ultimaCol).getValues()[0].map(function (h) {
    return String(h).replace(/^\s+|\s+$/g, '');
  });

  var filas = [];
  if (ultimaFila >= 2) {
    filas = sheet.getRange(2, 1, ultimaFila - 1, ultimaCol).getValues();
  }

  var mapa = {};
  for (var c = 0; c < headers.length; c++) mapa[headers[c]] = c;

  return { sheet: sheet, headers: headers, filas: filas, mapa: mapa };
}

/**
 * Indice de una columna por nombre de encabezado (lanza si no existe).
 */
function col_(hoja, nombre) {
  var idx = hoja.mapa[nombre];
  if (idx === undefined) lanzar_('Falta la columna "' + nombre + '".', 500);
  return idx;
}

/**
 * Convierte una fila (array) a objeto usando los encabezados.
 */
function filaAObjeto_(hoja, fila) {
  var obj = {};
  for (var c = 0; c < hoja.headers.length; c++) {
    obj[hoja.headers[c]] = fila[c];
  }
  return obj;
}

/**
 * Busca el indice (0-based, en datos) de la primera fila cuyo valor en col === valor.
 */
function buscarFila_(hoja, colIdx, valor) {
  for (var i = 0; i < hoja.filas.length; i++) {
    if (limpiar_(hoja.filas[i][colIdx]) === valor) return i;
  }
  return -1;
}

/**
 * Agrega una fila al final de la hoja respetando el orden de encabezados.
 */
function agregarFila_(hoja, obj) {
  var fila = [];
  for (var c = 0; c < hoja.headers.length; c++) {
    var nombre = hoja.headers[c];
    fila.push(obj[nombre] !== undefined ? obj[nombre] : '');
  }
  hoja.sheet.appendRow(fila);
}

/** Preserva los campos de texto de una cabecera nueva antes de escribir valores. */
function agregarCabeceraPedidoCreacion_(hoja, cabecera) {
  var fila = hoja.sheet.getLastRow() + 1;
  if (fila > hoja.sheet.getMaxRows()) {
    hoja.sheet.insertRowsAfter(hoja.sheet.getMaxRows(), 1);
  }
  var camposTexto = {
    id_pedido: true, canal: true, id_cliente: true, nombre_cliente: true,
    telefono: true, estado_pedido: true, estado_pago: true, forma_pago: true,
    observaciones: true, vendedor_admin: true, fecha_entrega: true,
    apertura_id: true, origen_pedido: true
  };
  var valores = hoja.headers.map(function (campo, indice) {
    var valor = cabecera[campo] !== undefined ? cabecera[campo] : '';
    if (camposTexto[campo]) {
      hoja.sheet.getRange(fila, indice + 1).setNumberFormat('@');
      return String(valor);
    }
    return valor;
  });
  SpreadsheetApp.flush();
  hoja.sheet.getRange(fila, 1, 1, hoja.headers.length).setValues([valores]);
}

/**
 * Registra un movimiento de stock generando id_movimiento.
 */
function registrarMovimiento_(movHoja, m) {
  var movimientoId = limpiar_(m.id_movimiento) || generarIdOperacion_('MOV', m.ahora);
  agregarFila_(movHoja, {
    id_movimiento: movimientoId,
    movimiento_id: movimientoId,
    fecha_hora: marca_(m.ahora),
    tipo: m.tipo,
    tipo_movimiento: m.tipo,
    origen: m.origen,
    id_origen: m.id_origen,
    referencia_tipo: m.referencia_tipo || m.origen,
    referencia_id: m.id_origen,
    id_producto: m.id_producto,
    producto_id: m.id_producto,
    cantidad: m.cantidad,
    stock_anterior: m.stock_anterior,
    stock_resultante: m.stock_resultante,
    apertura_id: m.apertura_id || '',
    usuario: m.usuario,
    observaciones: m.observaciones,
    observacion: m.observaciones,
    payload_hash: m.payload_hash || '',
    operacion_id: m.operacion_id || ''
  });
}

/**
 * Parsea el body JSON de un POST.
 */
function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    lanzar_('Cuerpo POST vacio o invalido.', 400);
  }
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    lanzar_('JSON invalido en el cuerpo POST.', 400);
  }
}

/**
 * Respuesta JSON estandar de exito.
 */
function jsonOk_(data) {
  return jsonSalida_({ ok: true, data: data });
}

/**
 * Respuesta JSON estandar de error.
 */
function jsonError_(mensaje, codigo) {
  return jsonSalida_({ ok: false, error: mensaje, codigo: codigo || 500 });
}

function jsonSalida_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Lanza un error con codigo HTTP logico asociado.
 */
function lanzar_(mensaje, codigo) {
  var err = new Error(mensaje);
  err.codigo = codigo || 500;
  throw err;
}

/**
 * Genera un id tipo PREFIJO-YYYYMMDD-HHMMSS segun la zona del script.
 */
function generarId_(prefijo, fecha) {
  var tz = Session.getScriptTimeZone() || 'America/Santiago';
  return prefijo + '-' + Utilities.formatDate(fecha, tz, 'yyyyMMdd-HHmmss');
}

function generarIdOperacion_(prefijo, fecha) {
  return generarId_(prefijo, fecha) + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
}

function generarIdUnicoEnHoja_(hoja, campoId, prefijo, fecha) {
  var cId = col_(hoja, campoId);
  for (var intento = 0; intento < 10; intento++) {
    var candidato = generarIdOperacion_(prefijo, fecha);
    if (buscarFila_(hoja, cId, candidato) === -1) return candidato;
  }
  lanzar_('No se pudo generar un identificador unico para ' + prefijo + '.', 503);
}

/**
 * Marca de tiempo legible (yyyy-MM-dd HH:mm:ss).
 */
function marca_(fecha) {
  var tz = Session.getScriptTimeZone() || 'America/Santiago';
  return Utilities.formatDate(fecha, tz, 'yyyy-MM-dd HH:mm:ss');
}

function colPrimera_(hoja, nombres) {
  for (var i = 0; i < nombres.length; i++) {
    if (hoja.mapa[nombres[i]] !== undefined) return hoja.mapa[nombres[i]];
  }
  lanzar_('Falta una columna de identificacion compatible.', 500);
}

function exigirColumnas_(hoja, columnas) {
  for (var i = 0; i < columnas.length; i++) col_(hoja, columnas[i]);
}

function asegurarColumnasAditivas_(hoja, columnas) {
  var agregadas = [];
  for (var i = 0; i < columnas.length; i++) {
    if (hoja.mapa[columnas[i]] === undefined) agregadas.push(columnas[i]);
  }
  if (agregadas.length) {
    hoja.sheet.getRange(1, hoja.headers.length + 1, 1, agregadas.length).setValues([agregadas]);
  }
  return { hoja: hoja.sheet.getName(), revisadas: columnas.slice(), agregadas: agregadas };
}

/** Marca ISO de auditoria para bloqueo optimista de APERTURAS. */
function marcaIso_(fecha) {
  var tz = Session.getScriptTimeZone() || 'America/Santiago';
  return Utilities.formatDate(fecha, tz, "yyyy-MM-dd'T'HH:mm:ss.SSS");
}

/**
 * Convierte a numero de forma segura. Acepta strings con separadores de miles.
 */
function parseNum_(v) {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined) return 0;
  var s = String(v).replace(/\$/g, '').replace(/\./g, '').replace(/,/g, '.');
  s = s.replace(/[^0-9.\-]/g, '');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Redondea a 2 decimales (evita arrastre de floats en subtotales).
 */
function enteroSeguro_(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n && Math.abs(n) <= 9007199254740991; }
function modoVenta_(p) {
  var modo = limpiar_(p.modo_venta) || 'UNIDAD';
  if (['UNIDAD','GRANEL'].indexOf(modo) < 0) lanzar_('Modo de venta invalido.',409);
  return modo;
}
function validarModeloGranel_(p) {
  var ref = Number(p.gramos_referencia), base = Number(p.gramos_unidad_stock);
  if (!enteroSeguro_(ref) || ref <= 0 || [100,250,1000].indexOf(base) < 0 ||
      (p.unidad_medida === 'kg' && base !== 1000) || ['kg','unidad'].indexOf(p.unidad_medida) < 0) lanzar_('Modelo de granel incompleto.',409);
}
function calcularLineaVenta_(producto, cantidad, exigirPasoLegacy) {
  if (typeof cantidad !== 'number' || !isFinite(cantidad) || cantidad <= 0) lanzar_('Cantidad invalida.',400);
  var modo = modoVenta_(producto), precio = Number(producto.precio_venta);
  if (!isFinite(precio) || precio <= 0) lanzar_('Producto sin precio vendible.',409);
  if (modo === 'GRANEL') {
    validarModeloGranel_(producto);
    var ref = Number(producto.gramos_referencia), base = Number(producto.gramos_unidad_stock);
    if (!enteroSeguro_(cantidad) || !enteroSeguro_(precio) || !enteroSeguro_(precio * cantidad)) lanzar_('Granel requiere gramos enteros positivos y precio CLP seguro.',400);
    var numerador = precio * cantidad;
    return { modo_venta: modo, gramos_solicitados: cantidad, gramos_referencia: ref,
      gramos_unidad_stock: base, cantidad: cantidad / base, precio_unitario: precio,
      subtotal: Math.floor(numerador / ref) + (numerador % ref >= ref / 2 ? 1 : 0) };
  }
  var decimal = normalizarSiNo_(producto.permite_decimal) === 'SI';
  if (!decimal && Math.floor(cantidad) !== cantidad) lanzar_('Producto no permite decimales.',400);
  if (decimal && exigirPasoLegacy !== false && !esMultiploPasoVenta_(cantidad, Number(producto.paso_venta) || 0.25)) lanzar_('Producto no respeta su paso de venta.',400);
  return { modo_venta: modo, cantidad: cantidad, precio_unitario: precio, subtotal: redondear2_(precio * cantidad) };
}
/** Saldos en milésimas enteras: 1 g/kg, 1 g/250 g o 1 g/100 g. */
function redondearStock_(n) {
  if (!isFinite(n) || !enteroSeguro_(Math.round(n * 1000))) lanzar_('Saldo de stock invalido.',409);
  return Math.round(n * 1000) / 1000;
}
function validarPrecisionStock_(producto,nativo) {
  if (modoVenta_(producto) !== 'GRANEL') return;
  validarModeloGranel_(producto);
  var gramos = nativo * Number(producto.gramos_unidad_stock);
  if (!enteroSeguro_(Math.round(gramos)) || Math.abs(gramos - Math.round(gramos)) > 0.0000001) lanzar_('Stock granel requiere gramos enteros.',400);
}
function prepararGranelTest_() {
  verificarDestinoFase78Test_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) lanzar_('El backend TEST esta ocupado.',503);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var contrato = { PRODUCTOS: ['modo_venta','gramos_referencia','gramos_unidad_stock'],
      DETALLE_PEDIDOS: ['modo_venta','gramos_solicitados','gramos_referencia','gramos_unidad_stock'],
      DETALLE_VENTAS: ['modo_venta','gramos_solicitados','gramos_referencia','gramos_unidad_stock'] };
    var hojas = Object.keys(contrato).map(function(n) { return leerHoja_(ss,n); });
    hojas.forEach(function(h) { if (h.headers.some(function(v,i) { return !v || h.headers.indexOf(v) !== i; })) lanzar_('Encabezados ambiguos.',409); });
    var cambios = hojas.some(function(h) { return contrato[h.sheet.getName()].some(function(c) { return h.headers.indexOf(c) < 0; }); });
    if (cambios) ss.copy('BACKUP TEST GRANEL ' + marca_(new Date()).replace(/[: ]/g,'-'));
    var agregadas = [];
    hojas.forEach(function(h) { agregadas.push({hoja:h.sheet.getName(), resultado:asegurarColumnasAditivas_(h,contrato[h.sheet.getName()])}); });
    SpreadsheetApp.flush();
    return { entorno:'TEST', backup_creado:cambios, agregadas:agregadas, readback:obtenerCatalogoOperativoTest_() };
  } finally { lock.releaseLock(); }
}
function redondear2_(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Normaliza a string sin espacios extremos.
 */
function limpiar_(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/^\s+|\s+$/g, '');
}

// BEGIN DOMINIO FAMILIAS FASE A GENERADO
// Fuente única: src/lib/familiasProducto.ts. Regenerar con --write y verificar --check.
var DominioFamiliasFaseA = (function () {
/** Fase A: contrato paralelo puro. No sustituye ninguna operación SKU_V1. */
const COLUMNAS_FAMILIAS_PRODUCTO = [
    'familia_id', 'activo', 'nombre_publico', 'categoria', 'precio_venta',
    'modo_venta', 'unidad_venta', 'permite_decimal', 'paso_venta',
    'gramos_referencia', 'contenido_cantidad', 'contenido_unidad',
    'presentacion_publica', 'politica_marca', 'marca_publica', 'imagen_url',
    'version_oferta', 'actualizado_en',
];
const COLUMNAS_IDENTIDAD_SKU_FAMILIA = [
    'familia_id', 'marca', 'presentacion', 'contenido_cantidad', 'contenido_unidad',
];
function registro(valor) {
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
        ? valor : {};
}
function texto(valor) { return typeof valor === 'string' ? valor.trim() : ''; }
function vacio(valor) { return valor === undefined || valor === null || (typeof valor === 'string' && !valor.trim()); }
function normalizado(valor) { return texto(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function positivo(valor) { return typeof valor === 'number' && Number.isFinite(valor) && valor > 0; }
function enteroPositivo(valor) { return positivo(valor) && Number.isSafeInteger(valor); }
function resultado(inconsistencias) { return { valido: inconsistencias.length === 0, inconsistencias }; }
/** Identidad opcional del maestro físico; no consulta familias ni infiere datos. */
function validarIdentidadSkuFisica(valor) {
    const sku = registro(valor), inconsistencias = [];
    const error = (codigo, campo) => inconsistencias.push({ codigo, campo, producto_id: texto(sku.id_producto) });
    if (!vacio(sku.familia_id) && (typeof sku.familia_id !== 'string' || !/^FAM-[A-Za-z0-9][A-Za-z0-9-]{0,79}$/.test(texto(sku.familia_id))))
        error('FAMILIA_ID_INVALIDO', 'familia_id');
    for (const [campo, maximo] of [['marca', 120], ['presentacion', 200]]) {
        if (!vacio(sku[campo]) && (typeof sku[campo] !== 'string' || texto(sku[campo]).length > maximo || /^=|[\u0000-\u001f]/.test(texto(sku[campo]))))
            error('TEXTO_IDENTIDAD_INVALIDO', campo);
    }
    if (!vacio(sku.contenido_cantidad) && (!positivo(sku.contenido_cantidad) || sku.contenido_cantidad > Number.MAX_SAFE_INTEGER))
        error('CONTENIDO_INVALIDO', 'contenido_cantidad');
    if (!vacio(sku.contenido_unidad) && !['g', 'ml', 'unidad'].includes(sku.contenido_unidad))
        error('UNIDAD_CONTENIDO_INVALIDA', 'contenido_unidad');
    return resultado(inconsistencias);
}
function validarFamiliaProducto(valor) {
    const f = registro(valor), inconsistencias = [];
    const error = (codigo, campo) => inconsistencias.push({ codigo, campo, familia_id: texto(f.familia_id) });
    if (!/^FAM-[A-Za-z0-9][A-Za-z0-9-]{0,79}$/.test(texto(f.familia_id)))
        error('FAMILIA_ID_INVALIDO', 'familia_id');
    for (const campo of ['stock_actual', 'precio_costo', 'proveedor']) {
        if (Object.prototype.hasOwnProperty.call(f, campo))
            error('CAMPO_FISICO_EN_FAMILIA', campo);
    }
    if (!['SI', 'NO'].includes(f.activo))
        error('ACTIVO_INVALIDO', 'activo');
    if (!texto(f.nombre_publico) || texto(f.nombre_publico).length > 200)
        error('NOMBRE_PUBLICO_INVALIDO', 'nombre_publico');
    if (!['granel', 'alimentos', 'limpieza', 'higiene'].includes(normalizado(f.categoria)))
        error('CATEGORIA_INVALIDA', 'categoria');
    if (typeof f.precio_venta !== 'number' || !Number.isSafeInteger(f.precio_venta) || f.precio_venta < 0)
        error('PRECIO_FAMILIAR_INVALIDO', 'precio_venta');
    if (!enteroPositivo(f.version_oferta))
        error('VERSION_OFERTA_INVALIDA', 'version_oferta');
    if (!['VARIABLE', 'EXPLICITA', 'NO_APLICA'].includes(f.politica_marca))
        error('POLITICA_MARCA_INVALIDA', 'politica_marca');
    if (f.politica_marca === 'EXPLICITA' && !texto(f.marca_publica))
        error('MARCA_PUBLICA_REQUERIDA', 'marca_publica');
    if (f.politica_marca !== 'EXPLICITA' && !vacio(f.marca_publica))
        error('MARCA_PUBLICA_NO_CORRESPONDE', 'marca_publica');
    if (!vacio(f.marca_publica) && (typeof f.marca_publica !== 'string' || texto(f.marca_publica).length > 120))
        error('MARCA_PUBLICA_INVALIDA', 'marca_publica');
    if (!texto(f.presentacion_publica) || texto(f.presentacion_publica).length > 200)
        error('PRESENTACION_PUBLICA_INVALIDA', 'presentacion_publica');
    if (!vacio(f.imagen_url) && (typeof f.imagen_url !== 'string' || f.imagen_url.length > 500))
        error('IMAGEN_INVALIDA', 'imagen_url');
    if (!vacio(f.actualizado_en) && typeof f.actualizado_en !== 'string')
        error('FECHA_AUDITORIA_INVALIDA', 'actualizado_en');
    if (!['SI', 'NO'].includes(f.permite_decimal))
        error('DECIMALES_INVALIDOS', 'permite_decimal');
    if (!positivo(f.paso_venta))
        error('PASO_VENTA_INVALIDO', 'paso_venta');
    if (f.modo_venta === 'UNIDAD') {
        if (!['unidad', 'pack', 'kg', 'litro'].includes(f.unidad_venta))
            error('UNIDAD_VENTA_INVALIDA', 'unidad_venta');
        if (!positivo(f.contenido_cantidad))
            error('CONTENIDO_INVALIDO', 'contenido_cantidad');
        if (!['g', 'ml', 'unidad'].includes(f.contenido_unidad))
            error('UNIDAD_CONTENIDO_INVALIDA', 'contenido_unidad');
        if (f.permite_decimal === 'NO' && f.paso_venta !== 1)
            error('PASO_ENTERO_INVALIDO', 'paso_venta');
        if (!vacio(f.gramos_referencia))
            error('REFERENCIA_GRANEL_NO_CORRESPONDE', 'gramos_referencia');
    }
    else if (f.modo_venta === 'GRANEL') {
        if (f.unidad_venta !== 'g' || f.permite_decimal !== 'NO' || f.paso_venta !== 1)
            error('ENTRADA_GRANEL_INVALIDA', 'unidad_venta');
        if (!enteroPositivo(f.gramos_referencia))
            error('REFERENCIA_GRANEL_INVALIDA', 'gramos_referencia');
        if (!vacio(f.contenido_cantidad) || !vacio(f.contenido_unidad))
            error('CONTENIDO_ENVASADO_EN_GRANEL', 'contenido_cantidad');
    }
    else
        error('MODO_VENTA_INVALIDO', 'modo_venta');
    return resultado(inconsistencias);
}
/** Solo compara contenido estructurado; jamás deduce equivalencia desde nombres. */
function presentacionesEquivalentes(familia, sku) {
    return positivo(familia.contenido_cantidad) && positivo(sku.contenido_cantidad)
        && familia.contenido_cantidad === sku.contenido_cantidad
        && familia.contenido_unidad === sku.contenido_unidad;
}
function validarRelacionSkuFamilia(sku, familia) {
    var _a;
    if (vacio(sku.familia_id))
        return resultado([]); // Legado V1: no exige campos nuevos.
    const inconsistencias = [];
    const error = (codigo, campo) => inconsistencias.push({ codigo, campo, familia_id: texto(sku.familia_id), producto_id: texto(sku.id_producto) });
    if (!/^FAM-[A-Za-z0-9][A-Za-z0-9-]{0,79}$/.test(texto(sku.familia_id)))
        error('FAMILIA_ID_INVALIDO', 'familia_id');
    if (!familia || texto(familia.familia_id) !== texto(sku.familia_id)) {
        error('FAMILIA_INEXISTENTE', 'familia_id');
        return resultado(inconsistencias);
    }
    inconsistencias.push(...validarFamiliaProducto(familia).inconsistencias);
    if (!/^PROD-[A-Za-z0-9-]{1,80}$/.test(texto(sku.id_producto)))
        error('SKU_ID_INVALIDO', 'id_producto');
    if (normalizado(sku.categoria) !== normalizado(familia.categoria))
        error('CATEGORIA_NO_EQUIVALENTE', 'categoria');
    const modo = vacio(sku.modo_venta) ? 'UNIDAD' : sku.modo_venta;
    if (modo !== familia.modo_venta)
        error('MODO_NO_EQUIVALENTE', 'modo_venta');
    if (!vacio(sku.permite_decimal) && !['SI', 'NO', true, false].includes(sku.permite_decimal))
        error('DECIMALES_SKU_INVALIDOS', 'permite_decimal');
    if (!texto(sku.presentacion))
        error('PRESENTACION_FISICA_REQUERIDA', 'presentacion');
    if (familia.politica_marca !== 'NO_APLICA' && !texto(sku.marca))
        error('MARCA_FISICA_REQUERIDA', 'marca');
    if (familia.politica_marca === 'EXPLICITA' && normalizado(sku.marca) !== normalizado(familia.marca_publica))
        error('MARCA_NO_EQUIVALENTE', 'marca');
    if (familia.modo_venta === 'UNIDAD') {
        if (!presentacionesEquivalentes(familia, sku))
            error('CONTENIDO_NO_EQUIVALENTE', 'contenido_cantidad');
        if (sku.unidad_medida !== familia.unidad_venta)
            error('UNIDAD_NO_EQUIVALENTE', 'unidad_medida');
        const decimal = sku.permite_decimal === true || sku.permite_decimal === 'SI';
        if (decimal !== (familia.permite_decimal === 'SI') || ((_a = sku.paso_venta) !== null && _a !== void 0 ? _a : 1) !== familia.paso_venta)
            error('REGLA_CANTIDAD_NO_EQUIVALENTE', 'paso_venta');
    }
    else if (familia.modo_venta === 'GRANEL') {
        if (![100, 250, 1000].includes(Number(sku.gramos_unidad_stock)) || !enteroPositivo(sku.gramos_unidad_stock)
            || !['kg', 'unidad'].includes(sku.unidad_medida) || (sku.unidad_medida === 'kg' && sku.gramos_unidad_stock !== 1000))
            error('BASE_STOCK_GRANEL_INVALIDA', 'gramos_unidad_stock');
        if (!enteroPositivo(sku.gramos_referencia))
            error('REFERENCIA_SKU_GRANEL_INVALIDA', 'gramos_referencia');
        // Referencia de precio legada y paso nativo NO limitan gramos libres de la familia.
    }
    return resultado(inconsistencias);
}
function auditarModeloFamilias(familias, skus) {
    const inconsistencias = [];
    const familiasVistas = new Set(), skuVistos = new Set();
    for (const familia of familias) {
        inconsistencias.push(...validarFamiliaProducto(familia).inconsistencias);
        const id = texto(familia.familia_id);
        if (familiasVistas.has(id))
            inconsistencias.push({ codigo: 'FAMILIA_DUPLICADA', familia_id: id });
        familiasVistas.add(id);
    }
    for (const sku of skus) {
        const id = texto(sku.id_producto);
        if (skuVistos.has(id))
            inconsistencias.push({ codigo: 'SKU_DUPLICADO', producto_id: id, familia_id: texto(sku.familia_id) });
        skuVistos.add(id);
        inconsistencias.push(...validarRelacionSkuFamilia(sku, familias.find(f => texto(f.familia_id) === texto(sku.familia_id))).inconsistencias);
    }
    return resultado(inconsistencias);
}
/** Vista interna de diagnóstico; no es una reserva ni un contrato de catálogo público. */
function agregarDisponibilidadFamilia(familia, skus, contexto = {}) {
    var _a, _b;
    const inconsistencias = [...validarFamiliaProducto(familia).inconsistencias];
    const sku_elegibles = [];
    const miembros = skus.filter(s => !vacio(s.familia_id) && texto(s.familia_id) === texto(familia.familia_id));
    const ids = skus.map(s => texto(s.id_producto));
    const duplicados = new Set(miembros.map(s => texto(s.id_producto)).filter(id => ids.indexOf(id) !== ids.lastIndexOf(id)));
    for (const id of duplicados)
        inconsistencias.push({ codigo: 'SKU_DUPLICADO', familia_id: familia.familia_id, producto_id: id });
    const aperturaValida = !vacio(contexto.apertura_id) && /^APE-\d{8}$/.test(texto(contexto.apertura_id));
    if (!vacio(contexto.apertura_id) && !aperturaValida)
        inconsistencias.push({ codigo: 'APERTURA_INVALIDA', campo: 'apertura_id', familia_id: familia.familia_id });
    const escala = familia.modo_venta === 'GRANEL' || familia.permite_decimal === 'NO' ? 1 : 1000;
    let suma = 0;
    for (const sku of miembros) {
        const relacion = validarRelacionSkuFamilia(sku, familia);
        inconsistencias.push(...relacion.inconsistencias);
        if (!relacion.valido || duplicados.has(texto(sku.id_producto)))
            continue;
        const error = (codigo, campo) => inconsistencias.push({ codigo, campo, familia_id: familia.familia_id, producto_id: sku.id_producto });
        if (!['SI', 'NO'].includes(sku.activo)) {
            error('SKU_ACTIVO_INVALIDO', 'activo');
            continue;
        }
        const tipo = vacio(sku.tipo_disponibilidad) ? 'REGULAR' : (_a = sku.tipo_disponibilidad) !== null && _a !== void 0 ? _a : 'REGULAR';
        if (!['REGULAR', 'POR_APERTURA'].includes(tipo)) {
            error('TIPO_DISPONIBILIDAD_INVALIDO', 'tipo_disponibilidad');
            continue;
        }
        const stock = sku.stock_actual;
        const cantidad = typeof stock === 'number' ? stock * (familia.modo_venta === 'GRANEL' ? Number(sku.gramos_unidad_stock) : escala) : NaN;
        if (!Number.isFinite(cantidad) || cantidad < 0 || !Number.isSafeInteger(Math.round(cantidad)) || Math.abs(cantidad - Math.round(cantidad)) > 1e-7) {
            error('STOCK_INVALIDO', 'stock_actual');
            continue;
        }
        if (sku.activo !== 'SI' || familia.activo !== 'SI' || (tipo === 'POR_APERTURA' && (!aperturaValida || !((_b = contexto.sku_habilitados) === null || _b === void 0 ? void 0 : _b.some(id => texto(id) === texto(sku.id_producto))))))
            continue;
        suma += Math.round(cantidad);
        sku_elegibles.push(texto(sku.id_producto));
    }
    if (!Number.isSafeInteger(suma)) {
        inconsistencias.push({ codigo: 'AGREGADO_FUERA_RANGO', familia_id: familia.familia_id });
        suma = 0;
    }
    const cantidad_agregada = suma / escala;
    const precio = Number.isSafeInteger(familia.precio_venta) && familia.precio_venta >= 0 ? familia.precio_venta : null;
    return {
        familia_id: texto(familia.familia_id), precio_venta: precio, cantidad_agregada,
        unidad_disponibilidad: familia.modo_venta === 'GRANEL' ? 'g' : familia.unidad_venta,
        disponible: inconsistencias.length === 0 && familia.activo === 'SI' && precio !== null && precio > 0 && cantidad_agregada >= familia.paso_venta,
        sku_elegibles, inconsistencias,
    };
}
function leerVistaFamiliasParalela(familias, skus, contexto = {}) {
    const auditoria = auditarModeloFamilias(familias, skus);
    return {
        auditoria,
        familias: familias.map(f => {
            const vista = agregarDisponibilidadFamilia(f, skus, contexto);
            if (!auditoria.valido)
                vista.disponible = false; // Diagnóstico incompleto nunca se anuncia vendible.
            return vista;
        }),
    };
}
/** Dry-run administrativo: informa problemas sin cambiar ni inferir identidad. */
function auditarMapaFamiliasSku(familias, skus, contexto = {}) {
    const inconsistencias = [...auditarModeloFamilias(familias, skus).inconsistencias];
    for (const f of familias) {
        const miembros = skus.filter(s => s.familia_id === f.familia_id);
        if (!miembros.length)
            inconsistencias.push({ codigo: 'FAMILIA_SIN_SKU', familia_id: f.familia_id });
        for (const sku of miembros.filter(s => s.activo === 'NO'))
            inconsistencias.push({ codigo: 'SKU_ASOCIADO_INACTIVO', familia_id: f.familia_id, producto_id: sku.id_producto });
        const vista = agregarDisponibilidadFamilia(f, skus, contexto);
        inconsistencias.push(...vista.inconsistencias);
        if (f.activo === 'SI' && !vista.disponible)
            inconsistencias.push({ codigo: 'FAMILIA_ACTIVA_SIN_SKU_ELEGIBLE', familia_id: f.familia_id });
    }
    return resultado(inconsistencias.filter((i, n, todos) => todos.findIndex(j => JSON.stringify(j) === JSON.stringify(i)) === n));
}
/** Versionado de oferta independiente de costos/stock. Versiones gestionadas por servidor. */
function prepararCambioFamilia(anterior, entrada, versionEsperada) {
    var _a;
    const campos = COLUMNAS_FAMILIAS_PRODUCTO.filter(c => c !== 'actualizado_en' && c !== 'version_oferta');
    if (Object.keys(entrada).some(c => !campos.includes(c)))
        throw new Error('CAMPO_FAMILIA_NO_EDITABLE');
    if (anterior && (entrada.familia_id !== anterior.familia_id || versionEsperada !== anterior.version_oferta))
        throw new Error('CONFLICTO_VERSION_FAMILIA');
    const nuevo = Object.assign(Object.assign(Object.assign({}, anterior), entrada), { version_oferta: (_a = anterior === null || anterior === void 0 ? void 0 : anterior.version_oferta) !== null && _a !== void 0 ? _a : 1 });
    if (Object.values(entrada).some(v => typeof v === 'string' && /^=|[\u0000-\u001f]/.test(v.trim())))
        throw new Error('TEXTO_FAMILIA_INVALIDO');
    for (const c of campos)
        if (typeof nuevo[c] === 'string')
            nuevo[c] = nuevo[c].trim();
    // Cualquier cambio de oferta invalida snapshots futuros; no se sincronizan SKU.
    if (anterior && campos.some(c => { var _a, _b; return ((_a = anterior[c]) !== null && _a !== void 0 ? _a : '') !== ((_b = nuevo[c]) !== null && _b !== void 0 ? _b : ''); }))
        nuevo.version_oferta++;
    const validacion = validarFamiliaProducto(nuevo);
    if (!validacion.valido)
        throw new Error(validacion.inconsistencias.map(i => i.codigo).join(','));
    if (nuevo.activo === 'SI' && nuevo.precio_venta === 0)
        throw new Error('PRECIO_FAMILIAR_NO_VENDIBLE');
    return nuevo;
}
return { COLUMNAS_FAMILIAS_PRODUCTO, COLUMNAS_IDENTIDAD_SKU_FAMILIA, validarIdentidadSkuFisica, validarFamiliaProducto, presentacionesEquivalentes, validarRelacionSkuFamilia, auditarModeloFamilias, agregarDisponibilidadFamilia, leerVistaFamiliasParalela, auditarMapaFamiliasSku, prepararCambioFamilia };
})();
// END DOMINIO FAMILIAS FASE A GENERADO

var COLUMNAS_FAMILIAS_PRODUCTO = DominioFamiliasFaseA.COLUMNAS_FAMILIAS_PRODUCTO.slice();
var COLUMNAS_IDENTIDAD_SKU_FAMILIA = DominioFamiliasFaseA.COLUMNAS_IDENTIDAD_SKU_FAMILIA.slice();

/** Lectura interna TEST, no expuesta por HTTP. Nunca crea hojas/columnas. */
function leerFamiliasProductoFaseA_(ss) {
  validarDestinoOperacionesPedidosTest_(ss);
  if (!ss.getSheetByName(HOJAS.FAMILIAS_PRODUCTO)) return [];
  var hoja = leerHoja_(ss, HOJAS.FAMILIAS_PRODUCTO);
  COLUMNAS_FAMILIAS_PRODUCTO.forEach(function (campo) {
    columnaUnicaContrato_(hoja.sheet, campo);
  });
  return hoja.filas.filter(function (fila) {
    return fila.some(function (valor) { return valor !== '' && valor !== null && valor !== undefined; });
  }).map(function (fila) {
    var familia = filaAObjeto_(hoja, fila);
    ['gramos_referencia', 'contenido_cantidad', 'contenido_unidad'].forEach(function (campo) {
      if (familia[campo] === '' || familia[campo] === null) delete familia[campo];
    });
    if (Object.prototype.toString.call(familia.actualizado_en) === '[object Date]') {
      familia.actualizado_en = familia.actualizado_en.toISOString();
    }
    return familia;
  });
}

/** Contexto explícito de diagnóstico: el caller aporta apertura/SKU habilitados. */
function leerVistaFamiliasFaseA_(ss, contexto) {
  var familias = leerFamiliasProductoFaseA_(ss);
  var productos = leerHoja_(ss, HOJAS.PRODUCTOS);
  var skus = productos.filas.filter(function (fila) {
    return fila.some(function (valor) { return valor !== '' && valor !== null && valor !== undefined; });
  }).map(function (fila) { return filaAObjeto_(productos, fila); });
  return DominioFamiliasFaseA.leerVistaFamiliasParalela(familias, skus, contexto || {});
}

/** B3: únicamente el destino TEST aprobado; nunca crea/migra hojas. */
function destinoFamiliasAdminB3_() {
  validarEntornoTestFase78_();
  if (SPREADSHEET_ID !== '1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM') lanzar_('Destino familias TEST no autorizado.', 403);
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (ss.getName() !== 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES') lanzar_('Nombre destino familias TEST no autorizado.', 403);
  if (!ss.getSheetByName(HOJAS.FAMILIAS_PRODUCTO)) lanzar_('Falta esquema B2.', 409);
  return ss;
}

function listarFamiliasProductoAdmin_() {
  var familias = leerFamiliasProductoFaseA_(destinoFamiliasAdminB3_());
  var vistos = {};
  familias.forEach(function (f) {
    if (vistos[f.familia_id]) lanzar_('Familia duplicada; requiere revision.', 409);
    vistos[f.familia_id] = true;
  });
  return { familias: familias };
}

function obtenerFamiliaProductoAdmin_(id) {
  var encontrada = listarFamiliasProductoAdmin_().familias.filter(function (f) { return f.familia_id === limpiar_(id); });
  if (encontrada.length !== 1) lanzar_('Familia no encontrada.', 404);
  return encontrada[0];
}

function validarAsociacionSkuAdminB3_(ss, sku) {
  if (!limpiar_(sku.familia_id)) return; // V1 no exige nuevas columnas ni familias.
  var productos = leerHoja_(ss, HOJAS.PRODUCTOS);
  if (productos.filas.filter(function (f) { return limpiar_(filaAObjeto_(productos, f).id_producto) === sku.id_producto; }).length > 1) lanzar_('SKU duplicado; asociacion ambigua.', 409);
  var familias = leerFamiliasProductoFaseA_(ss).filter(function (f) { return f.familia_id === limpiar_(sku.familia_id); });
  if (familias.length !== 1) lanzar_('Familia inexistente o duplicada.', 409);
  var validacion = DominioFamiliasFaseA.validarRelacionSkuFamilia(sku, familias[0]);
  if (!validacion.valido) lanzar_('Identidad SKU incompatible: ' + validacion.inconsistencias.map(function (i) { return i.codigo; }).join(', '), 400);
}

function auditarMapaFamiliasSkuAdmin_(params) {
  var ss = destinoFamiliasAdminB3_();
  var productos = leerHoja_(ss, HOJAS.PRODUCTOS);
  var skus = productos.filas.map(function (f) { return filaAObjeto_(productos, f); }).filter(function (p) { return limpiar_(p.id_producto); });
  var contexto = {};
  if (limpiar_(params.apertura_id)) {
    contexto.apertura_id = limpiar_(params.apertura_id);
    var apertura = leerHoja_(ss, HOJAS.APERTURA_PRODUCTOS);
    contexto.sku_habilitados = apertura.filas.map(function (f) { return filaAObjeto_(apertura, f); })
      .filter(function (p) { return p.apertura_id === contexto.apertura_id && p.habilitado === 'SI'; })
      .map(function (p) { return p.producto_id; });
  }
  return DominioFamiliasFaseA.auditarMapaFamiliasSku(leerFamiliasProductoFaseA_(ss), skus, contexto);
}

/** Audit log durable: replay devuelve el resultado original, no relee la oferta vigente. */
function mutarFamiliaProductoAdmin_(body, crear) {
  exigirIdempotencyKey_(body.idempotency_key);
  var actor = limpiar_(body.responsable);
  if (!/^[a-z0-9][a-z0-9._@-]{0,99}$/.test(actor)) lanzar_('Actor administrativo invalido.', 400);
  var entrada = body.familia;
  if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) lanzar_('Familia invalida.', 400);
  var campos = COLUMNAS_FAMILIAS_PRODUCTO.filter(function (c) { return c !== 'version_oferta' && c !== 'actualizado_en'; });
  if (Object.keys(entrada).some(function (c) { return campos.indexOf(c) < 0; })) lanzar_('Campo familiar no editable.', 400);
  var normalizada = {};
  campos.forEach(function (c) { if (entrada[c] !== undefined) normalizada[c] = typeof entrada[c] === 'string' ? entrada[c].trim() : entrada[c]; });
  var accion = crear ? 'crear_familia' : 'actualizar_familia';
  var hash = hashPayload_({ accion: accion, actor: actor, familia: normalizada, version_esperada: body.version_esperada || null });
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) lanzar_('El backend TEST esta ocupado.', 503);
  try {
    var ss = destinoFamiliasAdminB3_();
    var audit = leerHoja_(ss, HOJAS.AUDITORIA_PRODUCTOS);
    ['entidad_tipo', 'entidad_id', 'payload_hash', 'resultado_json'].forEach(function (c) { columnaUnicaContrato_(audit.sheet, c); });
    var replays = audit.filas.map(function (f) { return filaAObjeto_(audit, f); }).filter(function (r) {
      return r.entidad_tipo === 'FAMILIA' && r.referencia_id === body.idempotency_key;
    });
    if (replays.length) {
      if (replays.length !== 1 || replays[0].payload_hash !== hash) lanzar_('Conflicto de idempotencia familiar.', 409);
      if (JSON.parse(replays[0].cambios_json).estado !== 'COMPLETADA') lanzar_('Operacion familiar incompleta; REQUIERE_REVISION.', 409);
      return JSON.parse(replays[0].resultado_json);
    }
    // Fail closed ante una interrupción previa sobre la misma familia.
    if (audit.filas.some(function (f) { var r = filaAObjeto_(audit, f); return r.entidad_tipo === 'FAMILIA' && r.entidad_id === normalizada.familia_id && JSON.parse(r.cambios_json).estado !== 'COMPLETADA'; })) lanzar_('Familia con operacion incompleta; REQUIERE_REVISION.', 409);
    var familias = leerFamiliasProductoFaseA_(ss), hoja = leerHoja_(ss, HOJAS.FAMILIAS_PRODUCTO);
    var coincidencias = familias.filter(function (f) { return f.familia_id === normalizada.familia_id; });
    if (coincidencias.length > 1 || (crear && coincidencias.length)) lanzar_('Familia ya existe o esta duplicada.', 409);
    if (!crear && coincidencias.length !== 1) lanzar_('Familia no encontrada.', 404);
    var antes = coincidencias[0], nueva;
    try { nueva = DominioFamiliasFaseA.prepararCambioFamilia(antes, normalizada, body.version_esperada); }
    catch (err) { lanzar_(err.message, /CONFLICTO_VERSION/.test(err.message) ? 409 : 400); }
    var productos = leerHoja_(ss, HOJAS.PRODUCTOS), vistosSku = {};
    productos.filas.forEach(function (f) {
      var sku = filaAObjeto_(productos, f), id = limpiar_(sku.id_producto);
      if (!id) return;
      if (vistosSku[id]) lanzar_('SKU duplicado; requiere revision.', 409);
      vistosSku[id] = true;
      if (sku.familia_id === nueva.familia_id) {
        var v = DominioFamiliasFaseA.validarRelacionSkuFamilia(sku, nueva);
        if (!v.valido) lanzar_('Cambio incompatible con SKU asociado.', 409);
      }
    });
    var fila = buscarFila_(hoja, col_(hoja, 'familia_id'), nueva.familia_id);
    var filaAnterior = fila < 0 ? null : hoja.filas[fila].slice();
    var ultimoFamilia = hoja.sheet.getLastRow(), ultimoAudit = audit.sheet.getLastRow();
    var ahora = new Date(); nueva.actualizado_en = marcaIso_(ahora);
    var evento = { estado: 'PREPARADA', antes: antes || null, despues: nueva };
    try {
      agregarFila_(audit, { auditoria_id: generarIdOperacion_('AUD', ahora), fecha_hora: marca_(ahora), producto_id: '',
        accion: accion, cambios_json: JSON.stringify(evento), responsable: actor, referencia_id: body.idempotency_key,
        entidad_tipo: 'FAMILIA', entidad_id: nueva.familia_id, payload_hash: hash, resultado_json: JSON.stringify(nueva) });
      SpreadsheetApp.flush();
      if (crear) agregarFila_(hoja, nueva); else escribirObjetoEnFila_(hoja, fila, nueva);
      SpreadsheetApp.flush();
      evento.estado = 'COMPLETADA';
      audit.sheet.getRange(ultimoAudit + 1, col_(audit, 'cambios_json') + 1).setValue(JSON.stringify(evento));
      SpreadsheetApp.flush();
      return nueva;
    } catch (err) {
      if (filaAnterior) hoja.sheet.getRange(fila + 2, 1, 1, hoja.headers.length).setValues([filaAnterior]);
      else eliminarFilasAgregadas_(hoja.sheet, ultimoFamilia);
      SpreadsheetApp.flush();
      eliminarFilasAgregadas_(audit.sheet, ultimoAudit);
      SpreadsheetApp.flush();
      throw err;
    }
  } finally { lock.releaseLock(); }
}

// INICIO DOMINIO DURABLE C5 GENERADO
var DominioPedidoDurableC5=(function(){
function structuredClone(v){return JSON.parse(JSON.stringify(v));}
var factories={
"granel.ts":function(require,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.esGranel = esGranel;
exports.gramosValidos = gramosValidos;
exports.cantidadStock = cantidadStock;
exports.subtotalVenta = subtotalVenta;
exports.formatoPeso = formatoPeso;
exports.formatoCantidad = formatoCantidad;
exports.referenciaPrecio = referenciaPrecio;
exports.formatoDetalle = formatoDetalle;
function esGranel(p) { return p.modo_venta === 'GRANEL'; }
function gramosValidos(n) { return Number.isSafeInteger(n) && n > 0; }
function cantidadStock(p, cantidad) {
    if (!esGranel(p))
        return cantidad;
    if (!gramosValidos(cantidad) || ![100, 250, 1000].includes(Number(p.gramos_unidad_stock)))
        throw new Error('Peso o base de stock inválidos.');
    return cantidad / Number(p.gramos_unidad_stock);
}
function subtotalVenta(p, precio, cantidad) {
    if (!esGranel(p))
        return Math.round(precio * cantidad);
    if (!gramosValidos(cantidad) || !gramosValidos(Number(p.gramos_referencia)) || !Number.isSafeInteger(precio) || precio <= 0 || !Number.isSafeInteger(precio * cantidad))
        throw new Error('Referencia de precio o peso inválidos.');
    const numerador = precio * cantidad, referencia = Number(p.gramos_referencia);
    return Math.floor(numerador / referencia) + (numerador % referencia >= referencia / 2 ? 1 : 0);
}
function formatoPeso(g) { return g % 1000 === 0 ? `${g / 1000} kg` : `${g} g`; }
function formatoCantidad(p, cantidad) { return esGranel(p) ? formatoPeso(cantidad) : String(cantidad); }
function referenciaPrecio(p, precio) {
    const valor = '$' + precio.toLocaleString('es-CL');
    return esGranel(p) ? `${valor} / ${Number(p.gramos_referencia) === 1000 ? 'kg' : formatoPeso(Number(p.gramos_referencia))}` : valor;
}
function formatoDetalle(p) {
    var _a;
    return Number(p.gramos_solicitados) > 0 ? formatoPeso(Number(p.gramos_solicitados)) : `${p.cantidad} ${(_a = p.unidad_medida) !== null && _a !== void 0 ? _a : ''}`.trim();
}

},
"familiasProducto.ts":function(require,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLUMNAS_IDENTIDAD_SKU_FAMILIA = exports.COLUMNAS_FAMILIAS_PRODUCTO = void 0;
exports.validarIdentidadSkuFisica = validarIdentidadSkuFisica;
exports.validarFamiliaProducto = validarFamiliaProducto;
exports.presentacionesEquivalentes = presentacionesEquivalentes;
exports.validarRelacionSkuFamilia = validarRelacionSkuFamilia;
exports.auditarModeloFamilias = auditarModeloFamilias;
exports.agregarDisponibilidadFamilia = agregarDisponibilidadFamilia;
exports.leerVistaFamiliasParalela = leerVistaFamiliasParalela;
exports.auditarMapaFamiliasSku = auditarMapaFamiliasSku;
exports.prepararCambioFamilia = prepararCambioFamilia;
/** Fase A: contrato paralelo puro. No sustituye ninguna operación SKU_V1. */
exports.COLUMNAS_FAMILIAS_PRODUCTO = [
    'familia_id', 'activo', 'nombre_publico', 'categoria', 'precio_venta',
    'modo_venta', 'unidad_venta', 'permite_decimal', 'paso_venta',
    'gramos_referencia', 'contenido_cantidad', 'contenido_unidad',
    'presentacion_publica', 'politica_marca', 'marca_publica', 'imagen_url',
    'version_oferta', 'actualizado_en',
];
exports.COLUMNAS_IDENTIDAD_SKU_FAMILIA = [
    'familia_id', 'marca', 'presentacion', 'contenido_cantidad', 'contenido_unidad',
];
function registro(valor) {
    return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
        ? valor : {};
}
function texto(valor) { return typeof valor === 'string' ? valor.trim() : ''; }
function vacio(valor) { return valor === undefined || valor === null || (typeof valor === 'string' && !valor.trim()); }
function normalizado(valor) { return texto(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function positivo(valor) { return typeof valor === 'number' && Number.isFinite(valor) && valor > 0; }
function enteroPositivo(valor) { return positivo(valor) && Number.isSafeInteger(valor); }
function resultado(inconsistencias) { return { valido: inconsistencias.length === 0, inconsistencias }; }
/** Identidad opcional del maestro físico; no consulta familias ni infiere datos. */
function validarIdentidadSkuFisica(valor) {
    const sku = registro(valor), inconsistencias = [];
    const error = (codigo, campo) => inconsistencias.push({ codigo, campo, producto_id: texto(sku.id_producto) });
    if (!vacio(sku.familia_id) && (typeof sku.familia_id !== 'string' || !/^FAM-[A-Za-z0-9][A-Za-z0-9-]{0,79}$/.test(texto(sku.familia_id))))
        error('FAMILIA_ID_INVALIDO', 'familia_id');
    for (const [campo, maximo] of [['marca', 120], ['presentacion', 200]]) {
        if (!vacio(sku[campo]) && (typeof sku[campo] !== 'string' || texto(sku[campo]).length > maximo || /^=|[\u0000-\u001f]/.test(texto(sku[campo]))))
            error('TEXTO_IDENTIDAD_INVALIDO', campo);
    }
    if (!vacio(sku.contenido_cantidad) && (!positivo(sku.contenido_cantidad) || sku.contenido_cantidad > Number.MAX_SAFE_INTEGER))
        error('CONTENIDO_INVALIDO', 'contenido_cantidad');
    if (!vacio(sku.contenido_unidad) && !['g', 'ml', 'unidad'].includes(sku.contenido_unidad))
        error('UNIDAD_CONTENIDO_INVALIDA', 'contenido_unidad');
    return resultado(inconsistencias);
}
function validarFamiliaProducto(valor) {
    const f = registro(valor), inconsistencias = [];
    const error = (codigo, campo) => inconsistencias.push({ codigo, campo, familia_id: texto(f.familia_id) });
    if (!/^FAM-[A-Za-z0-9][A-Za-z0-9-]{0,79}$/.test(texto(f.familia_id)))
        error('FAMILIA_ID_INVALIDO', 'familia_id');
    for (const campo of ['stock_actual', 'precio_costo', 'proveedor']) {
        if (Object.prototype.hasOwnProperty.call(f, campo))
            error('CAMPO_FISICO_EN_FAMILIA', campo);
    }
    if (!['SI', 'NO'].includes(f.activo))
        error('ACTIVO_INVALIDO', 'activo');
    if (!texto(f.nombre_publico) || texto(f.nombre_publico).length > 200)
        error('NOMBRE_PUBLICO_INVALIDO', 'nombre_publico');
    if (!['granel', 'alimentos', 'limpieza', 'higiene'].includes(normalizado(f.categoria)))
        error('CATEGORIA_INVALIDA', 'categoria');
    if (typeof f.precio_venta !== 'number' || !Number.isSafeInteger(f.precio_venta) || f.precio_venta < 0)
        error('PRECIO_FAMILIAR_INVALIDO', 'precio_venta');
    if (!enteroPositivo(f.version_oferta))
        error('VERSION_OFERTA_INVALIDA', 'version_oferta');
    if (!['VARIABLE', 'EXPLICITA', 'NO_APLICA'].includes(f.politica_marca))
        error('POLITICA_MARCA_INVALIDA', 'politica_marca');
    if (f.politica_marca === 'EXPLICITA' && !texto(f.marca_publica))
        error('MARCA_PUBLICA_REQUERIDA', 'marca_publica');
    if (f.politica_marca !== 'EXPLICITA' && !vacio(f.marca_publica))
        error('MARCA_PUBLICA_NO_CORRESPONDE', 'marca_publica');
    if (!vacio(f.marca_publica) && (typeof f.marca_publica !== 'string' || texto(f.marca_publica).length > 120))
        error('MARCA_PUBLICA_INVALIDA', 'marca_publica');
    if (!texto(f.presentacion_publica) || texto(f.presentacion_publica).length > 200)
        error('PRESENTACION_PUBLICA_INVALIDA', 'presentacion_publica');
    if (!vacio(f.imagen_url) && (typeof f.imagen_url !== 'string' || f.imagen_url.length > 500))
        error('IMAGEN_INVALIDA', 'imagen_url');
    if (!vacio(f.actualizado_en) && typeof f.actualizado_en !== 'string')
        error('FECHA_AUDITORIA_INVALIDA', 'actualizado_en');
    if (!['SI', 'NO'].includes(f.permite_decimal))
        error('DECIMALES_INVALIDOS', 'permite_decimal');
    if (!positivo(f.paso_venta))
        error('PASO_VENTA_INVALIDO', 'paso_venta');
    if (f.modo_venta === 'UNIDAD') {
        if (!['unidad', 'pack', 'kg', 'litro'].includes(f.unidad_venta))
            error('UNIDAD_VENTA_INVALIDA', 'unidad_venta');
        if (!positivo(f.contenido_cantidad))
            error('CONTENIDO_INVALIDO', 'contenido_cantidad');
        if (!['g', 'ml', 'unidad'].includes(f.contenido_unidad))
            error('UNIDAD_CONTENIDO_INVALIDA', 'contenido_unidad');
        if (f.permite_decimal === 'NO' && f.paso_venta !== 1)
            error('PASO_ENTERO_INVALIDO', 'paso_venta');
        if (!vacio(f.gramos_referencia))
            error('REFERENCIA_GRANEL_NO_CORRESPONDE', 'gramos_referencia');
    }
    else if (f.modo_venta === 'GRANEL') {
        if (f.unidad_venta !== 'g' || f.permite_decimal !== 'NO' || f.paso_venta !== 1)
            error('ENTRADA_GRANEL_INVALIDA', 'unidad_venta');
        if (!enteroPositivo(f.gramos_referencia))
            error('REFERENCIA_GRANEL_INVALIDA', 'gramos_referencia');
        if (!vacio(f.contenido_cantidad) || !vacio(f.contenido_unidad))
            error('CONTENIDO_ENVASADO_EN_GRANEL', 'contenido_cantidad');
    }
    else
        error('MODO_VENTA_INVALIDO', 'modo_venta');
    return resultado(inconsistencias);
}
/** Solo compara contenido estructurado; jamás deduce equivalencia desde nombres. */
function presentacionesEquivalentes(familia, sku) {
    return positivo(familia.contenido_cantidad) && positivo(sku.contenido_cantidad)
        && familia.contenido_cantidad === sku.contenido_cantidad
        && familia.contenido_unidad === sku.contenido_unidad;
}
function validarRelacionSkuFamilia(sku, familia) {
    var _a;
    if (vacio(sku.familia_id))
        return resultado([]); // Legado V1: no exige campos nuevos.
    const inconsistencias = [];
    const error = (codigo, campo) => inconsistencias.push({ codigo, campo, familia_id: texto(sku.familia_id), producto_id: texto(sku.id_producto) });
    if (!/^FAM-[A-Za-z0-9][A-Za-z0-9-]{0,79}$/.test(texto(sku.familia_id)))
        error('FAMILIA_ID_INVALIDO', 'familia_id');
    if (!familia || texto(familia.familia_id) !== texto(sku.familia_id)) {
        error('FAMILIA_INEXISTENTE', 'familia_id');
        return resultado(inconsistencias);
    }
    inconsistencias.push(...validarFamiliaProducto(familia).inconsistencias);
    if (!/^PROD-[A-Za-z0-9-]{1,80}$/.test(texto(sku.id_producto)))
        error('SKU_ID_INVALIDO', 'id_producto');
    if (normalizado(sku.categoria) !== normalizado(familia.categoria))
        error('CATEGORIA_NO_EQUIVALENTE', 'categoria');
    const modo = vacio(sku.modo_venta) ? 'UNIDAD' : sku.modo_venta;
    if (modo !== familia.modo_venta)
        error('MODO_NO_EQUIVALENTE', 'modo_venta');
    if (!vacio(sku.permite_decimal) && !['SI', 'NO', true, false].includes(sku.permite_decimal))
        error('DECIMALES_SKU_INVALIDOS', 'permite_decimal');
    if (!texto(sku.presentacion))
        error('PRESENTACION_FISICA_REQUERIDA', 'presentacion');
    if (familia.politica_marca !== 'NO_APLICA' && !texto(sku.marca))
        error('MARCA_FISICA_REQUERIDA', 'marca');
    if (familia.politica_marca === 'EXPLICITA' && normalizado(sku.marca) !== normalizado(familia.marca_publica))
        error('MARCA_NO_EQUIVALENTE', 'marca');
    if (familia.modo_venta === 'UNIDAD') {
        if (!presentacionesEquivalentes(familia, sku))
            error('CONTENIDO_NO_EQUIVALENTE', 'contenido_cantidad');
        if (sku.unidad_medida !== familia.unidad_venta)
            error('UNIDAD_NO_EQUIVALENTE', 'unidad_medida');
        const decimal = sku.permite_decimal === true || sku.permite_decimal === 'SI';
        if (decimal !== (familia.permite_decimal === 'SI') || ((_a = sku.paso_venta) !== null && _a !== void 0 ? _a : 1) !== familia.paso_venta)
            error('REGLA_CANTIDAD_NO_EQUIVALENTE', 'paso_venta');
    }
    else if (familia.modo_venta === 'GRANEL') {
        if (![100, 250, 1000].includes(Number(sku.gramos_unidad_stock)) || !enteroPositivo(sku.gramos_unidad_stock)
            || !['kg', 'unidad'].includes(sku.unidad_medida) || (sku.unidad_medida === 'kg' && sku.gramos_unidad_stock !== 1000))
            error('BASE_STOCK_GRANEL_INVALIDA', 'gramos_unidad_stock');
        if (!enteroPositivo(sku.gramos_referencia))
            error('REFERENCIA_SKU_GRANEL_INVALIDA', 'gramos_referencia');
        // Referencia de precio legada y paso nativo NO limitan gramos libres de la familia.
    }
    return resultado(inconsistencias);
}
function auditarModeloFamilias(familias, skus) {
    const inconsistencias = [];
    const familiasVistas = new Set(), skuVistos = new Set();
    for (const familia of familias) {
        inconsistencias.push(...validarFamiliaProducto(familia).inconsistencias);
        const id = texto(familia.familia_id);
        if (familiasVistas.has(id))
            inconsistencias.push({ codigo: 'FAMILIA_DUPLICADA', familia_id: id });
        familiasVistas.add(id);
    }
    for (const sku of skus) {
        const id = texto(sku.id_producto);
        if (skuVistos.has(id))
            inconsistencias.push({ codigo: 'SKU_DUPLICADO', producto_id: id, familia_id: texto(sku.familia_id) });
        skuVistos.add(id);
        inconsistencias.push(...validarRelacionSkuFamilia(sku, familias.find(f => texto(f.familia_id) === texto(sku.familia_id))).inconsistencias);
    }
    return resultado(inconsistencias);
}
/** Vista interna de diagnóstico; no es una reserva ni un contrato de catálogo público. */
function agregarDisponibilidadFamilia(familia, skus, contexto = {}) {
    var _a, _b;
    const inconsistencias = [...validarFamiliaProducto(familia).inconsistencias];
    const sku_elegibles = [];
    const miembros = skus.filter(s => !vacio(s.familia_id) && texto(s.familia_id) === texto(familia.familia_id));
    const ids = skus.map(s => texto(s.id_producto));
    const duplicados = new Set(miembros.map(s => texto(s.id_producto)).filter(id => ids.indexOf(id) !== ids.lastIndexOf(id)));
    for (const id of duplicados)
        inconsistencias.push({ codigo: 'SKU_DUPLICADO', familia_id: familia.familia_id, producto_id: id });
    const aperturaValida = !vacio(contexto.apertura_id) && /^APE-\d{8}$/.test(texto(contexto.apertura_id));
    if (!vacio(contexto.apertura_id) && !aperturaValida)
        inconsistencias.push({ codigo: 'APERTURA_INVALIDA', campo: 'apertura_id', familia_id: familia.familia_id });
    const escala = familia.modo_venta === 'GRANEL' || familia.permite_decimal === 'NO' ? 1 : 1000;
    let suma = 0;
    for (const sku of miembros) {
        const relacion = validarRelacionSkuFamilia(sku, familia);
        inconsistencias.push(...relacion.inconsistencias);
        if (!relacion.valido || duplicados.has(texto(sku.id_producto)))
            continue;
        const error = (codigo, campo) => inconsistencias.push({ codigo, campo, familia_id: familia.familia_id, producto_id: sku.id_producto });
        if (!['SI', 'NO'].includes(sku.activo)) {
            error('SKU_ACTIVO_INVALIDO', 'activo');
            continue;
        }
        const tipo = vacio(sku.tipo_disponibilidad) ? 'REGULAR' : (_a = sku.tipo_disponibilidad) !== null && _a !== void 0 ? _a : 'REGULAR';
        if (!['REGULAR', 'POR_APERTURA'].includes(tipo)) {
            error('TIPO_DISPONIBILIDAD_INVALIDO', 'tipo_disponibilidad');
            continue;
        }
        const stock = sku.stock_actual;
        const cantidad = typeof stock === 'number' ? stock * (familia.modo_venta === 'GRANEL' ? Number(sku.gramos_unidad_stock) : escala) : NaN;
        if (!Number.isFinite(cantidad) || cantidad < 0 || !Number.isSafeInteger(Math.round(cantidad)) || Math.abs(cantidad - Math.round(cantidad)) > 1e-7) {
            error('STOCK_INVALIDO', 'stock_actual');
            continue;
        }
        if (sku.activo !== 'SI' || familia.activo !== 'SI' || (tipo === 'POR_APERTURA' && (!aperturaValida || !((_b = contexto.sku_habilitados) === null || _b === void 0 ? void 0 : _b.some(id => texto(id) === texto(sku.id_producto))))))
            continue;
        suma += Math.round(cantidad);
        sku_elegibles.push(texto(sku.id_producto));
    }
    if (!Number.isSafeInteger(suma)) {
        inconsistencias.push({ codigo: 'AGREGADO_FUERA_RANGO', familia_id: familia.familia_id });
        suma = 0;
    }
    const cantidad_agregada = suma / escala;
    const precio = Number.isSafeInteger(familia.precio_venta) && familia.precio_venta >= 0 ? familia.precio_venta : null;
    return {
        familia_id: texto(familia.familia_id), precio_venta: precio, cantidad_agregada,
        unidad_disponibilidad: familia.modo_venta === 'GRANEL' ? 'g' : familia.unidad_venta,
        disponible: inconsistencias.length === 0 && familia.activo === 'SI' && precio !== null && precio > 0 && cantidad_agregada >= familia.paso_venta,
        sku_elegibles, inconsistencias,
    };
}
function leerVistaFamiliasParalela(familias, skus, contexto = {}) {
    const auditoria = auditarModeloFamilias(familias, skus);
    return {
        auditoria,
        familias: familias.map(f => {
            const vista = agregarDisponibilidadFamilia(f, skus, contexto);
            if (!auditoria.valido)
                vista.disponible = false; // Diagnóstico incompleto nunca se anuncia vendible.
            return vista;
        }),
    };
}
/** Dry-run administrativo: informa problemas sin cambiar ni inferir identidad. */
function auditarMapaFamiliasSku(familias, skus, contexto = {}) {
    const inconsistencias = [...auditarModeloFamilias(familias, skus).inconsistencias];
    for (const f of familias) {
        const miembros = skus.filter(s => s.familia_id === f.familia_id);
        if (!miembros.length)
            inconsistencias.push({ codigo: 'FAMILIA_SIN_SKU', familia_id: f.familia_id });
        for (const sku of miembros.filter(s => s.activo === 'NO'))
            inconsistencias.push({ codigo: 'SKU_ASOCIADO_INACTIVO', familia_id: f.familia_id, producto_id: sku.id_producto });
        const vista = agregarDisponibilidadFamilia(f, skus, contexto);
        inconsistencias.push(...vista.inconsistencias);
        if (f.activo === 'SI' && !vista.disponible)
            inconsistencias.push({ codigo: 'FAMILIA_ACTIVA_SIN_SKU_ELEGIBLE', familia_id: f.familia_id });
    }
    return resultado(inconsistencias.filter((i, n, todos) => todos.findIndex(j => JSON.stringify(j) === JSON.stringify(i)) === n));
}
/** Versionado de oferta independiente de costos/stock. Versiones gestionadas por servidor. */
function prepararCambioFamilia(anterior, entrada, versionEsperada) {
    var _a;
    const campos = exports.COLUMNAS_FAMILIAS_PRODUCTO.filter(c => c !== 'actualizado_en' && c !== 'version_oferta');
    if (Object.keys(entrada).some(c => !campos.includes(c)))
        throw new Error('CAMPO_FAMILIA_NO_EDITABLE');
    if (anterior && (entrada.familia_id !== anterior.familia_id || versionEsperada !== anterior.version_oferta))
        throw new Error('CONFLICTO_VERSION_FAMILIA');
    const nuevo = { ...anterior, ...entrada, version_oferta: (_a = anterior === null || anterior === void 0 ? void 0 : anterior.version_oferta) !== null && _a !== void 0 ? _a : 1 };
    if (Object.values(entrada).some(v => typeof v === 'string' && /^=|[\u0000-\u001f]/.test(v.trim())))
        throw new Error('TEXTO_FAMILIA_INVALIDO');
    for (const c of campos)
        if (typeof nuevo[c] === 'string')
            nuevo[c] = nuevo[c].trim();
    // Cualquier cambio de oferta invalida snapshots futuros; no se sincronizan SKU.
    if (anterior && campos.some(c => { var _a, _b; return ((_a = anterior[c]) !== null && _a !== void 0 ? _a : '') !== ((_b = nuevo[c]) !== null && _b !== void 0 ? _b : ''); }))
        nuevo.version_oferta++;
    const validacion = validarFamiliaProducto(nuevo);
    if (!validacion.valido)
        throw new Error(validacion.inconsistencias.map(i => i.codigo).join(','));
    if (nuevo.activo === 'SI' && nuevo.precio_venta === 0)
        throw new Error('PRECIO_FAMILIAR_NO_VENDIBLE');
    return nuevo;
}

},
"familias/sha256.ts":function(require,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256Texto = sha256Texto;
/** SHA256 síncrono puro para verificar evidencia también en el puerto GAS. No firma/autentica actores. */
function sha256Texto(texto) {
    const bytes = [];
    for (const c of texto) {
        const cp = c.codePointAt(0);
        const n = cp >= 0xd800 && cp <= 0xdfff ? 0xfffd : cp;
        if (n < 128)
            bytes.push(n);
        else if (n < 2048)
            bytes.push(192 | n >> 6, 128 | n & 63);
        else if (n < 65536)
            bytes.push(224 | n >> 12, 128 | n >> 6 & 63, 128 | n & 63);
        else
            bytes.push(240 | n >> 18, 128 | n >> 12 & 63, 128 | n >> 6 & 63, 128 | n & 63);
    }
    const bits = bytes.length * 8;
    bytes.push(128);
    while (bytes.length % 64 !== 56)
        bytes.push(0);
    for (let i = 7; i >= 0; i--)
        bytes.push(Math.floor(bits / 2 ** (i * 8)) & 255);
    const k = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const rr = (x, n) => x >>> n | x << (32 - n);
    for (let offset = 0; offset < bytes.length; offset += 64) {
        const w = Array(64).fill(0);
        for (let i = 0; i < 16; i++)
            w[i] = bytes[offset + i * 4] << 24 | bytes[offset + i * 4 + 1] << 16 | bytes[offset + i * 4 + 2] << 8 | bytes[offset + i * 4 + 3];
        for (let i = 16; i < 64; i++) {
            const x = w[i - 15], y = w[i - 2];
            w[i] = (w[i - 16] + (rr(x, 7) ^ rr(x, 18) ^ x >>> 3) + w[i - 7] + (rr(y, 17) ^ rr(y, 19) ^ y >>> 10)) | 0;
        }
        let [a, b, c, d, e, f, g, z] = h;
        for (let i = 0; i < 64; i++) {
            const t1 = (z + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + k[i] + w[i]) | 0;
            const t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
            z = g;
            g = f;
            f = e;
            e = (d + t1) | 0;
            d = c;
            c = b;
            b = a;
            a = (t1 + t2) | 0;
        }
        [a, b, c, d, e, f, g, z].forEach((x, i) => { h[i] = (h[i] + x) | 0; });
    }
    return h.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

},
"familias/revisionV1.ts":function(require,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLUMNAS_ORIGINALES_OPERACION = exports.COLUMNAS_RESOLUCION_REVISION = void 0;
exports.canonRevision = canonRevision;
exports.hashRevision = hashRevision;
exports.hashOriginalOperacion = hashOriginalOperacion;
exports.revisionV1Acreditada = revisionV1Acreditada;
/** Acreditación aditiva: no modifica estado/paso/snapshot/resultado originales del diario V1. */
const sha256_ts_1 = require("./sha256.ts");
exports.COLUMNAS_RESOLUCION_REVISION = ['revision_resuelta', 'revision_tipo', 'revision_evidencia_hash', 'revision_detalle', 'revision_resuelta_por', 'revision_resuelta_en'];
exports.COLUMNAS_ORIGINALES_OPERACION = ['operacion_id', 'idempotency_key', 'tipo_operacion', 'id_pedido', 'actor', 'estado_operacion', 'paso', 'payload_hash', 'snapshot_json', 'resultado_json', 'error_codigo', 'error_detalle', 'creado_en', 'actualizado_en'];
function canonRevision(v) {
    if (Array.isArray(v))
        return '[' + v.map(canonRevision).join(',') + ']';
    if (v && typeof v === 'object')
        return '{' + Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => JSON.stringify(k) + ':' + canonRevision(x)).join(',') + '}';
    return JSON.stringify(v);
}
function hashRevision(v) { return (0, sha256_ts_1.sha256Texto)(canonRevision(v)); }
function hashOriginalOperacion(op) {
    // Sheets serial y GET GAS representan el mismo timestamp sin alterar la celda original.
    const fecha = (v) => typeof v === 'number'
        ? new Date(Date.UTC(1899, 11, 30) + Math.round(v * 86400000)).toISOString().slice(0, 23)
        : typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z?$/.test(v) ? v.slice(0, 23) : v;
    return hashRevision(Object.fromEntries(exports.COLUMNAS_ORIGINALES_OPERACION.map(k => {
        var _a, _b;
        return [k,
            ['creado_en', 'actualizado_en'].includes(k) ? fecha((_a = op[k]) !== null && _a !== void 0 ? _a : '') : (_b = op[k]) !== null && _b !== void 0 ? _b : ''];
    })));
}
/** Hashes verifican integridad/vinculación, no sustituyen auditoría autenticada de la Sheet. */
function revisionV1Acreditada(op) {
    var _a, _b;
    try {
        if (op.estado_operacion !== 'REQUIERE_REVISION' || op.tipo_operacion !== 'CREAR_PEDIDO' || op.revision_resuelta !== 'SI')
            return false;
        if (!['CREACION_V1_ACREDITADA', 'FALLO_PARCIAL_V1_ACREDITADO'].includes(String(op.revision_tipo)))
            return false;
        const e = JSON.parse(String(op.revision_detalle)), p = JSON.parse(String(op.snapshot_json));
        if (p.version !== 1 || p.tipo_operacion !== 'CREAR_PEDIDO' || p.id_pedido !== op.id_pedido || ((_a = p.cabecera) === null || _a === void 0 ? void 0 : _a.id_pedido) !== op.id_pedido
            || ((_b = p.resultado) === null || _b === void 0 ? void 0 : _b.id_pedido) !== op.id_pedido || !Array.isArray(p.detalles) || !p.detalles.length)
            return false;
        if (e.modelo !== 'ACREDITACION_CREACION_V1_1' || e.operacion_id !== op.operacion_id || e.id_pedido !== op.id_pedido
            || e.tipo !== op.revision_tipo || e.actor !== op.revision_resuelta_por || e.creado_en !== op.revision_resuelta_en
            || !/^[A-Za-z0-9][A-Za-z0-9_.@-]{0,99}$/.test(e.actor) || !Number.isFinite(Date.parse(e.creado_en))
            || !e.explicacion || e.explicacion.length > 1000 || e.operacion_original_hash !== hashOriginalOperacion(op)
            || hashRevision(e) !== op.revision_evidencia_hash)
            return false;
        const b = e.pruebas;
        if (!b || b.cabeceras !== 1 || b.movimientos !== 0 || b.total_coincide !== true || b.identidad_coincide !== true || b.fecha_coincide !== true
            || ![b.cabecera_hash, b.detalles_hash, b.inventario_hash].every(h => /^[a-f0-9]{64}$/.test(h)) || !Array.isArray(b.diferencias_normalizadas))
            return false;
        return e.tipo === 'CREACION_V1_ACREDITADA'
            ? b.estado_pedido === 'recibido' && b.detalles === p.detalles.length && b.diferencias_normalizadas.length === 0
            : b.estado_pedido === '' && b.detalles === 0 && b.diferencias_normalizadas.length > 0;
    }
    catch {
        return false;
    }
}

},
"familias/pedidoV2.ts":function(require,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorPedidoFamilia = exports.COLUMNAS_PEDIDOS_V2_ADITIVAS = exports.COLUMNAS_ASIGNACIONES_PEDIDO = exports.COLUMNAS_DETALLE_PEDIDOS_V2_ADITIVAS = void 0;
exports.exigirV2 = exigirV2;
exports.idInternoV2 = idInternoV2;
exports.modeloLineaPedido = modeloLineaPedido;
exports.validarCantidadFamiliaV2 = validarCantidadFamiliaV2;
exports.crearDetallePedidoFamiliaV2 = crearDetallePedidoFamiliaV2;
exports.leerOfertaSnapshotV2 = leerOfertaSnapshotV2;
exports.validarContratoAsignacionV2 = validarContratoAsignacionV2;
/** C1 paralelo y local: ninguna ruta V1 ni Apps Script importa este contrato. */
const familiasProducto_ts_1 = require("../familiasProducto.ts");
const granel_ts_1 = require("../granel.ts");
exports.COLUMNAS_DETALLE_PEDIDOS_V2_ADITIVAS = [
    'id_detalle_pedido', 'modelo_linea', 'familia_id', 'cantidad_solicitada',
    'unidad_solicitada', 'presentacion_publica_snapshot', 'version_oferta_snapshot',
    'oferta_snapshot_json',
];
exports.COLUMNAS_ASIGNACIONES_PEDIDO = [
    'asignacion_id', 'id_detalle_pedido', 'producto_id', 'cantidad_asignada',
    'cantidad_stock', 'unidad_stock_snapshot', 'gramos_unidad_stock_snapshot',
    'nombre_sku_snapshot', 'marca_snapshot', 'presentacion_snapshot',
    'operacion_id', 'actor', 'creado_en',
];
/** Puntero futuro para reasignación: permite conservar todas las filas históricas. */
exports.COLUMNAS_PEDIDOS_V2_ADITIVAS = ['operacion_asignacion_vigente'];
class ErrorPedidoFamilia extends Error {
    constructor(codigo, status = 400) { super(codigo); this.name = 'ErrorPedidoFamilia'; this.codigo = codigo; this.status = status; }
}
exports.ErrorPedidoFamilia = ErrorPedidoFamilia;
function exigirV2(condicion, codigo, status = 400) {
    if (!condicion)
        throw new ErrorPedidoFamilia(codigo, status);
}
function idInternoV2(valor) { return typeof valor === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(valor); }
/** Compatibilidad explícita: solo vacío histórico = V1; nunca inferir desde prefijos. */
function modeloLineaPedido(fila) {
    const modelo = fila.modelo_linea;
    if (modelo === undefined || modelo === null || modelo === '' || modelo === 'SKU_V1') {
        exigirV2(typeof fila.id_producto === 'string' && !!fila.id_producto && !fila.id_producto.startsWith('FAM-'), 'SKU_V1_ID_FISICO_REQUERIDO');
        exigirV2(!fila.familia_id, 'LINEA_AMBIGUA');
        return 'SKU_V1';
    }
    exigirV2(modelo === 'FAMILIA_V2', 'MODELO_LINEA_DESCONOCIDO');
    exigirV2(!fila.id_producto && !fila.cantidad, 'V2_SIN_SKU_VIRTUAL');
    return 'FAMILIA_V2';
}
function validarCantidadFamiliaV2(f, cantidad) {
    const escala = f.modo_venta === 'GRANEL' || f.permite_decimal === 'NO' ? 1 : 1000;
    const n = cantidad * escala, paso = f.paso_venta * escala;
    exigirV2(typeof cantidad === 'number' && Number.isFinite(cantidad) && cantidad > 0 && Number.isSafeInteger(Math.round(n)) && Math.abs(n - Math.round(n)) < 1e-7, 'CANTIDAD_V2_INVALIDA');
    exigirV2(Number.isSafeInteger(Math.round(paso)) && Math.abs(paso - Math.round(paso)) < 1e-7 && paso > 0 && Math.round(n) % Math.round(paso) === 0, 'PASO_V2_INVALIDO');
    return Math.round(n);
}
/** Snapshot comercial autoritativo: precios/campos del navegador no forman parte del input. */
function crearDetallePedidoFamiliaV2(id_pedido, id_detalle_pedido, solicitud, familia) {
    exigirV2(idInternoV2(id_pedido) && idInternoV2(id_detalle_pedido), 'ID_DETALLE_V2_INVALIDO');
    exigirV2(solicitud.modelo_linea === 'FAMILIA_V2', 'MODELO_LINEA_DESCONOCIDO');
    exigirV2((0, familiasProducto_ts_1.validarFamiliaProducto)(familia).valido && familia.activo === 'SI' && familia.precio_venta > 0, 'FAMILIA_NO_VENDIBLE', 409);
    exigirV2(solicitud.familia_id === familia.familia_id && solicitud.version_oferta === familia.version_oferta, 'OFERTA_DESACTUALIZADA', 409);
    exigirV2(solicitud.unidad_solicitada === familia.unidad_venta, 'UNIDAD_SOLICITADA_INVALIDA');
    validarCantidadFamiliaV2(familia, solicitud.cantidad_solicitada);
    const numerador = familia.precio_venta * solicitud.cantidad_solicitada;
    exigirV2(Number.isFinite(numerador) && numerador <= Number.MAX_SAFE_INTEGER, 'SUBTOTAL_FUERA_RANGO');
    const subtotal = (0, granel_ts_1.subtotalVenta)(familia, familia.precio_venta, solicitud.cantidad_solicitada);
    exigirV2(Number.isSafeInteger(subtotal) && subtotal >= 0, 'SUBTOTAL_FUERA_RANGO');
    return { id_pedido, id_detalle_pedido, modelo_linea: 'FAMILIA_V2', id_producto: '', cantidad: '', familia_id: familia.familia_id,
        cantidad_solicitada: solicitud.cantidad_solicitada, unidad_solicitada: solicitud.unidad_solicitada,
        nombre_producto: familia.nombre_publico, precio_unitario: familia.precio_venta, subtotal,
        presentacion_publica_snapshot: familia.presentacion_publica, version_oferta_snapshot: familia.version_oferta,
        oferta_snapshot_json: JSON.stringify(familia) };
}
function leerOfertaSnapshotV2(linea) {
    exigirV2(modeloLineaPedido(linea) === 'FAMILIA_V2', 'LINEA_NO_V2');
    let f;
    try {
        f = JSON.parse(linea.oferta_snapshot_json);
    }
    catch {
        throw new ErrorPedidoFamilia('SNAPSHOT_OFERTA_INVALIDO');
    }
    exigirV2((0, familiasProducto_ts_1.validarFamiliaProducto)(f).valido && f.familia_id === linea.familia_id && f.version_oferta === linea.version_oferta_snapshot
        && f.nombre_publico === linea.nombre_producto && f.precio_venta === linea.precio_unitario && f.presentacion_publica === linea.presentacion_publica_snapshot, 'SNAPSHOT_OFERTA_INCOHERENTE');
    const esperado = crearDetallePedidoFamiliaV2(linea.id_pedido, linea.id_detalle_pedido, { modelo_linea: 'FAMILIA_V2', familia_id: f.familia_id, cantidad_solicitada: linea.cantidad_solicitada, unidad_solicitada: linea.unidad_solicitada, version_oferta: f.version_oferta }, f);
    exigirV2(esperado.subtotal === linea.subtotal, 'SUBTOTAL_SNAPSHOT_INCOHERENTE');
    return f;
}
function validarContratoAsignacionV2(a) {
    exigirV2(idInternoV2(a.asignacion_id) && idInternoV2(a.id_detalle_pedido) && idInternoV2(a.operacion_id), 'ID_ASIGNACION_INVALIDO');
    exigirV2(/^PROD-[A-Za-z0-9-]{1,80}$/.test(a.producto_id), 'SKU_FISICO_REQUERIDO');
    exigirV2(Number.isFinite(a.cantidad_asignada) && a.cantidad_asignada > 0 && Number.isFinite(a.cantidad_stock) && a.cantidad_stock > 0, 'CANTIDAD_ASIGNACION_INVALIDA');
    exigirV2(typeof a.unidad_stock_snapshot === 'string' && !!a.unidad_stock_snapshot && !!a.nombre_sku_snapshot && !!a.presentacion_snapshot, 'SNAPSHOT_FISICO_INCOMPLETO');
    exigirV2(typeof a.actor === 'string' && /^[a-z0-9][a-z0-9._@-]{0,99}$/.test(a.actor) && typeof a.creado_en === 'string' && Number.isFinite(Date.parse(a.creado_en)), 'AUDITORIA_ASIGNACION_INVALIDA');
    if (a.gramos_unidad_stock_snapshot !== undefined)
        exigirV2([100, 250, 1000].includes(a.gramos_unidad_stock_snapshot), 'BASE_GRANEL_INVALIDA');
}

},
"familias/asignacionV2.ts":function(require,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validarYCongelarAsignacionesV2 = validarYCongelarAsignacionesV2;
exports.prepararConfirmacionFamiliaV2 = prepararConfirmacionFamiliaV2;
exports.prepararCancelacionFamiliaV2 = prepararCancelacionFamiliaV2;
exports.reasignarAsignacionPedido = reasignarAsignacionPedido;
exports.avanzarPlanDurableV2 = avanzarPlanDurableV2;
exports.ejecutarPlanLocalV2 = ejecutarPlanLocalV2;
/** C2: motor puro local. Sin red, Sheets, rutas, selección automática ni deploy. */
const familiasProducto_ts_1 = require("../familiasProducto.ts");
const pedidoV2_ts_1 = require("./pedidoV2.ts");
function copia(valor) { return structuredClone(valor); }
function canon(valor) {
    if (Array.isArray(valor))
        return '[' + valor.map(canon).join(',') + ']';
    if (valor && typeof valor === 'object')
        return '{' + Object.entries(valor).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + canon(v)).join(',') + '}';
    return JSON.stringify(valor);
}
function sha(valor) {
    return require("./sha256.ts").sha256Texto(canon(valor));
}
function enteroExacto(n, codigo = 'STOCK_V2_INVALIDO') {
    (0, pedidoV2_ts_1.exigirV2)(Number.isFinite(n) && n >= 0 && Number.isSafeInteger(Math.round(n)) && Math.abs(n - Math.round(n)) < 1e-7, codigo);
    return Math.round(n);
}
function escalaSku(s, base) {
    if (base !== undefined || s.modo_venta === 'GRANEL') {
        const gramos = base !== null && base !== void 0 ? base : s.gramos_unidad_stock;
        (0, pedidoV2_ts_1.exigirV2)(typeof gramos === 'number' && [100, 250, 1000].includes(gramos), 'BASE_GRANEL_INVALIDA');
        return gramos;
    }
    return s.permite_decimal === 'SI' || s.permite_decimal === true ? 1000 : 1;
}
function saldoEntero(s) {
    (0, pedidoV2_ts_1.exigirV2)(typeof s.stock_actual === 'number', 'STOCK_V2_INVALIDO');
    return enteroExacto(s.stock_actual * escalaSku(s));
}
function skuUnico(skus, id) {
    const encontrados = skus.filter(s => s.id_producto === id);
    (0, pedidoV2_ts_1.exigirV2)(encontrados.length === 1, 'SKU_INEXISTENTE_O_DUPLICADO', 409);
    return encontrados[0];
}
function validarMetadata(m) {
    (0, pedidoV2_ts_1.exigirV2)((0, pedidoV2_ts_1.idInternoV2)(m.operacion_id) && m.operacion_id.length <= 60 && typeof m.idempotency_key === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(m.idempotency_key), 'ID_OPERACION_INVALIDO');
    (0, pedidoV2_ts_1.exigirV2)(typeof m.actor === 'string' && /^[a-z0-9][a-z0-9._@-]{0,99}$/.test(m.actor) && typeof m.creado_en === 'string' && Number.isFinite(Date.parse(m.creado_en)), 'ACTOR_FECHA_INVALIDOS');
}
function validarPedido(p) {
    (0, pedidoV2_ts_1.exigirV2)((0, pedidoV2_ts_1.idInternoV2)(p.id_pedido) && p.lineas.length > 0, 'PEDIDO_V2_INVALIDO');
    (0, pedidoV2_ts_1.exigirV2)(new Set(p.lineas.map(l => l.id_detalle_pedido)).size === p.lineas.length, 'DETALLE_DUPLICADO');
    for (const l of p.lineas) {
        (0, pedidoV2_ts_1.exigirV2)(l.id_pedido === p.id_pedido, 'DETALLE_OTRO_PEDIDO');
        (0, pedidoV2_ts_1.leerOfertaSnapshotV2)(l);
    }
}
/** Operación decide el reparto. Cada SKU distinto aparece una vez por detalle. */
function validarYCongelarAsignacionesV2(linea, seleccion, skus, contexto, meta, inicioId = 0) {
    validarMetadata(meta);
    const familia = (0, pedidoV2_ts_1.leerOfertaSnapshotV2)(linea);
    (0, pedidoV2_ts_1.exigirV2)(seleccion.length > 0 && new Set(seleccion.map(s => s.producto_id)).size === seleccion.length, 'ASIGNACION_DUPLICADA_O_VACIA');
    const escala = familia.modo_venta === 'GRANEL' || familia.permite_decimal === 'NO' ? 1 : 1000;
    let total = 0;
    const resultado = seleccion.map((s, i) => {
        var _a, _b;
        const sku = skuUnico(skus, s.producto_id);
        (0, pedidoV2_ts_1.exigirV2)(sku.familia_id === familia.familia_id && (0, familiasProducto_ts_1.validarRelacionSkuFamilia)(sku, familia).valido, 'SKU_NO_EQUIVALENTE');
        const vista = (0, familiasProducto_ts_1.agregarDisponibilidadFamilia)(familia, [sku], contexto);
        (0, pedidoV2_ts_1.exigirV2)(vista.inconsistencias.length === 0 && vista.sku_elegibles.includes(sku.id_producto), 'SKU_NO_ELEGIBLE', 409);
        const cantidad = (0, pedidoV2_ts_1.validarCantidadFamiliaV2)(familia, s.cantidad_asignada);
        (0, pedidoV2_ts_1.exigirV2)(Number.isSafeInteger(total + cantidad), 'ASIGNACION_FUERA_RANGO');
        total += cantidad;
        const fisica = familia.modo_venta === 'GRANEL' ? cantidad : enteroExacto(s.cantidad_asignada * escalaSku(sku));
        (0, pedidoV2_ts_1.exigirV2)(fisica <= saldoEntero(sku), 'STOCK_INSUFICIENTE', 409);
        const a = { asignacion_id: meta.operacion_id + '-A-' + (inicioId + i), id_detalle_pedido: linea.id_detalle_pedido,
            producto_id: sku.id_producto, cantidad_asignada: cantidad / escala, cantidad_stock: fisica / escalaSku(sku),
            unidad_stock_snapshot: sku.unidad_medida, ...(familia.modo_venta === 'GRANEL' ? { gramos_unidad_stock_snapshot: sku.gramos_unidad_stock } : {}),
            nombre_sku_snapshot: sku.nombre, marca_snapshot: (_a = sku.marca) !== null && _a !== void 0 ? _a : '', presentacion_snapshot: (_b = sku.presentacion) !== null && _b !== void 0 ? _b : '',
            operacion_id: meta.operacion_id, actor: meta.actor, creado_en: meta.creado_en };
        (0, pedidoV2_ts_1.validarContratoAsignacionV2)(a);
        return a;
    });
    (0, pedidoV2_ts_1.exigirV2)(total === (0, pedidoV2_ts_1.validarCantidadFamiliaV2)(familia, linea.cantidad_solicitada), 'ASIGNACION_NO_COMPLETA');
    return resultado;
}
function mover(stocks, producto_id, cantidad, devolver, base, unidad, meta, indice) {
    const s = skuUnico(stocks, producto_id);
    (0, pedidoV2_ts_1.exigirV2)(s.unidad_medida === unidad && (base === undefined ? s.modo_venta !== 'GRANEL' : s.modo_venta === 'GRANEL' && s.gramos_unidad_stock === base), 'BASE_HISTORICA_CAMBIADA', 409);
    const escala = escalaSku(s, base), anterior = saldoEntero(s), delta = enteroExacto(cantidad * escala, 'CANTIDAD_STOCK_INVALIDA');
    const nuevo = devolver ? anterior + delta : anterior - delta;
    (0, pedidoV2_ts_1.exigirV2)(Number.isSafeInteger(nuevo) && nuevo >= 0, 'STOCK_INSUFICIENTE_O_DESBORDE', 409);
    const m = { movimiento_id: meta.operacion_id + '-M-' + indice, operacion_id: meta.operacion_id, producto_id,
        tipo: devolver ? 'DEVOLUCION_V2' : 'ASIGNACION_V2', cantidad_stock: devolver ? cantidad : -cantidad,
        stock_anterior: anterior / escala, stock_resultante: nuevo / escala, unidad_stock_snapshot: unidad, escala_stock_snapshot: escala,
        ...(base !== undefined ? { gramos_unidad_stock_snapshot: base } : {}), actor: meta.actor, creado_en: meta.creado_en };
    s.stock_actual = nuevo / escala;
    return m;
}
function asignarPedido(p, stocks, reparto, contexto, meta, movimientos) {
    (0, pedidoV2_ts_1.exigirV2)(reparto.length === p.lineas.length && new Set(reparto.map(r => r.id_detalle_pedido)).size === reparto.length, 'REPARTO_LINEAS_INCOMPLETO');
    (0, pedidoV2_ts_1.exigirV2)(reparto.every(r => p.lineas.some(l => l.id_detalle_pedido === r.id_detalle_pedido)), 'REPARTO_LINEA_DESCONOCIDA');
    const asignaciones = [];
    for (const l of p.lineas) {
        const selecciones = reparto.find(r => r.id_detalle_pedido === l.id_detalle_pedido).selecciones;
        const a = validarYCongelarAsignacionesV2(l, selecciones, stocks, contexto, meta, asignaciones.length);
        for (const s of a)
            movimientos.push(mover(stocks, s.producto_id, s.cantidad_stock, false, s.gramos_unidad_stock_snapshot, s.unidad_stock_snapshot, meta, movimientos.length));
        asignaciones.push(...a);
    }
    return asignaciones;
}
/** Reversión exclusivamente histórica; activo/familia/marca vigente no decide devoluciones. */
function devolverPedido(p, stocks, meta, movimientos) {
    (0, pedidoV2_ts_1.exigirV2)(p.asignaciones.length > 0 && new Set(p.asignaciones.map(a => a.asignacion_id)).size === p.asignaciones.length, 'HISTORICO_ASIGNACION_INVALIDO');
    (0, pedidoV2_ts_1.exigirV2)(p.asignaciones.every(a => p.lineas.some(l => l.id_detalle_pedido === a.id_detalle_pedido) && a.operacion_id === p.operacion_asignacion_vigente), 'HISTORICO_ASIGNACION_AJENO');
    for (const l of p.lineas) {
        const f = (0, pedidoV2_ts_1.leerOfertaSnapshotV2)(l), asignadas = p.asignaciones.filter(a => a.id_detalle_pedido === l.id_detalle_pedido);
        (0, pedidoV2_ts_1.exigirV2)(new Set(asignadas.map(a => a.producto_id)).size === asignadas.length, 'HISTORICO_SKU_DUPLICADO');
        let suma = 0;
        for (const a of asignadas) {
            (0, pedidoV2_ts_1.validarContratoAsignacionV2)(a);
            const cantidad = (0, pedidoV2_ts_1.validarCantidadFamiliaV2)(f, a.cantidad_asignada);
            (0, pedidoV2_ts_1.exigirV2)(Number.isSafeInteger(suma + cantidad), 'HISTORICO_FUERA_RANGO');
            suma += cantidad;
            const sku = skuUnico(stocks, a.producto_id);
            const esperado = f.modo_venta === 'GRANEL' ? a.cantidad_asignada / Number(a.gramos_unidad_stock_snapshot) : a.cantidad_asignada;
            (0, pedidoV2_ts_1.exigirV2)(Math.abs(esperado - a.cantidad_stock) < 1e-10, 'SNAPSHOT_STOCK_INCOHERENTE');
            // Escala/unidad física conserva significado histórico, aunque SKU esté inactivo.
            (0, pedidoV2_ts_1.exigirV2)(f.modo_venta === 'GRANEL' ? a.gramos_unidad_stock_snapshot !== undefined : a.gramos_unidad_stock_snapshot === undefined, 'SNAPSHOT_BASE_INCOHERENTE');
            saldoEntero(sku);
            movimientos.push(mover(stocks, a.producto_id, a.cantidad_stock, true, a.gramos_unidad_stock_snapshot, a.unidad_stock_snapshot, meta, movimientos.length));
        }
        (0, pedidoV2_ts_1.exigirV2)(suma === (0, pedidoV2_ts_1.validarCantidadFamiliaV2)(f, l.cantidad_solicitada), 'HISTORICO_NO_COMPLETO');
    }
}
function repartoCanon(reparto) {
    return reparto.map(r => ({ id_detalle_pedido: r.id_detalle_pedido, selecciones: r.selecciones.map(s => ({ producto_id: s.producto_id, cantidad_asignada: s.cantidad_asignada })).sort((a, b) => a.producto_id.localeCompare(b.producto_id)) })).sort((a, b) => a.id_detalle_pedido.localeCompare(b.id_detalle_pedido));
}
function snapshotPlan(plan) {
    return Object.fromEntries(Object.entries(plan).filter(([k]) => !['estado', 'paso', 'error_codigo', 'snapshot_hash'].includes(k)));
}
function prepararOperacion(tipo, pedido, skus, reparto, contexto, meta, previo) {
    var _a;
    validarMetadata(meta);
    // NaN/Infinity no se pueden canonizar como null ni compartir key accidentalmente.
    for (const r of reparto)
        for (const s of r.selecciones)
            (0, pedidoV2_ts_1.exigirV2)(typeof s.cantidad_asignada === 'number' && Number.isFinite(s.cantidad_asignada), 'CANTIDAD_ASIGNACION_INVALIDA');
    const payload_hash = sha({ tipo, id_pedido: pedido.id_pedido, actor: meta.actor, reparto: repartoCanon(reparto), apertura_id: (_a = contexto.apertura_id) !== null && _a !== void 0 ? _a : '' });
    if (previo) {
        (0, pedidoV2_ts_1.exigirV2)(previo.idempotency_key === meta.idempotency_key && previo.payload_hash === payload_hash, 'CONFLICTO_IDEMPOTENCIA', 409);
        (0, pedidoV2_ts_1.exigirV2)(previo.snapshot_hash === sha(snapshotPlan(previo)), 'PLAN_ALTERADO', 409);
        return copia(previo); // Ni master ni snapshots se recalculan en replay.
    }
    validarPedido(pedido);
    const stocks = copia([...skus]), antes = copia(pedido), nuevo = copia(pedido), movimientos = [];
    (0, pedidoV2_ts_1.exigirV2)(new Set(stocks.map(s => s.id_producto)).size === stocks.length, 'SKU_DUPLICADO', 409);
    if (tipo === 'CONFIRMAR_V2') {
        (0, pedidoV2_ts_1.exigirV2)(pedido.estado === 'recibido' && pedido.asignaciones.length === 0 && !pedido.operacion_asignacion_vigente, 'ESTADO_CONFIRMACION_INVALIDO', 409);
        nuevo.asignaciones = asignarPedido(pedido, stocks, reparto, contexto, meta, movimientos);
        nuevo.estado = 'pendiente';
        nuevo.operacion_asignacion_vigente = meta.operacion_id;
    }
    else {
        (0, pedidoV2_ts_1.exigirV2)(['recibido', 'pendiente', 'listo'].includes(pedido.estado), 'ESTADO_REVERSA_INVALIDO', 409);
        if (pedido.estado === 'recibido')
            (0, pedidoV2_ts_1.exigirV2)(pedido.asignaciones.length === 0 && !pedido.operacion_asignacion_vigente, 'RECIBIDO_CON_ASIGNACION');
        else
            devolverPedido(pedido, stocks, meta, movimientos);
        if (tipo === 'CANCELAR_V2') {
            (0, pedidoV2_ts_1.exigirV2)(reparto.length === 0, 'CANCELACION_SIN_REPARTO');
            nuevo.estado = 'cancelado';
        }
        else {
            (0, pedidoV2_ts_1.exigirV2)(pedido.estado !== 'recibido', 'REASIGNACION_NO_CONFIRMADA', 409);
            nuevo.asignaciones = asignarPedido(pedido, stocks, reparto, contexto, meta, movimientos);
            nuevo.operacion_asignacion_vigente = meta.operacion_id;
        }
    }
    const plan = { ...meta, tipo, estado: 'PREPARADA', paso: 0, payload_hash, snapshot_hash: '', pedido_antes: antes, pedido_resultante: nuevo, contexto_snapshot: copia(contexto), movimientos };
    plan.snapshot_hash = sha(snapshotPlan(plan));
    return plan;
}
function prepararConfirmacionFamiliaV2(p, skus, reparto, contexto, meta, previo) {
    return prepararOperacion('CONFIRMAR_V2', p, skus, reparto, contexto, meta, previo);
}
function prepararCancelacionFamiliaV2(p, skus, meta, previo) {
    return prepararOperacion('CANCELAR_V2', p, skus, [], {}, meta, previo);
}
function reasignarAsignacionPedido(p, skus, reparto, contexto, meta, previo) {
    return prepararOperacion('REASIGNAR_V2', p, skus, reparto, contexto, meta, previo);
}
/** Un paso local es atómico en memoria. El adaptador futuro debe persistir intentos y reconciliar ambas escrituras bajo lock. */
function avanzarPlanDurableV2(plan, estado) {
    var _a, _b;
    const p = copia(plan), e = copia(estado);
    const revision = (codigo) => ({ plan: { ...p, estado: 'REQUIERE_REVISION', error_codigo: codigo }, estado: e });
    if (p.snapshot_hash !== sha(snapshotPlan(p)))
        return revision('PLAN_ALTERADO');
    if (p.estado === 'COMPLETADA' || p.estado === 'REQUIERE_REVISION')
        return { plan: p, estado: e };
    if (!Number.isSafeInteger(p.paso) || p.paso < 0 || p.paso > p.movimientos.length)
        return revision('PASO_INVALIDO');
    if (p.estado === 'PREPARADA') {
        if (p.paso !== 0)
            return revision('PASO_INVALIDO');
        p.estado = 'APLICANDO';
        return { plan: p, estado: e };
    }
    if (p.estado !== 'APLICANDO')
        return revision('ESTADO_PLAN_INVALIDO');
    if (canon(e.pedido) !== canon(p.pedido_antes) && canon(e.pedido) !== canon(p.pedido_resultante))
        return revision('PEDIDO_CAMBIO_CONCURRENTE');
    const anteriores = p.movimientos.slice(0, p.paso);
    for (const m of anteriores)
        if (e.movimientos.filter(x => x.movimiento_id === m.movimiento_id).length !== 1 || !e.movimientos.some(x => canon(x) === canon(m)))
            return revision('PROGRESO_SIN_EVIDENCIA');
    const ultimoAnterior = new Map(anteriores.map(m => [m.producto_id, m]));
    for (const [id, m] of ultimoAnterior) {
        const actual = p.movimientos[p.paso];
        const recuperable = (actual === null || actual === void 0 ? void 0 : actual.producto_id) === id && e.movimientos.some(x => canon(x) === canon(actual));
        const esperado = recuperable ? actual.stock_resultante : m.stock_resultante;
        if (e.skus.filter(s => s.id_producto === id && s.stock_actual === esperado).length !== 1)
            return revision('STOCK_PROGRESO_INCOHERENTE');
    }
    if (p.paso < p.movimientos.length) {
        const m = p.movimientos[p.paso], matches = e.movimientos.filter(x => x.movimiento_id === m.movimiento_id);
        let s;
        try {
            s = skuUnico(e.skus, m.producto_id);
            saldoEntero(s);
        }
        catch {
            return revision('STOCK_IDENTIDAD_INVALIDOS');
        }
        if (s.unidad_medida !== m.unidad_stock_snapshot || escalaSku(s) !== m.escala_stock_snapshot || (m.gramos_unidad_stock_snapshot === undefined ? s.modo_venta === 'GRANEL' : s.modo_venta !== 'GRANEL' || s.gramos_unidad_stock !== m.gramos_unidad_stock_snapshot))
            return revision('BASE_HISTORICA_CAMBIADA');
        if (m.tipo === 'ASIGNACION_V2') {
            const a = p.pedido_resultante.asignaciones.find(x => x.producto_id === s.id_producto);
            const l = p.pedido_resultante.lineas.find(x => x.id_detalle_pedido === (a === null || a === void 0 ? void 0 : a.id_detalle_pedido));
            if (!a || !l || s.activo !== 'SI' || ((_a = s.marca) !== null && _a !== void 0 ? _a : '') !== a.marca_snapshot || ((_b = s.presentacion) !== null && _b !== void 0 ? _b : '') !== a.presentacion_snapshot)
                return revision('IDENTIDAD_FISICA_CAMBIADA');
            const vista = (0, familiasProducto_ts_1.agregarDisponibilidadFamilia)((0, pedidoV2_ts_1.leerOfertaSnapshotV2)(l), [s], p.contexto_snapshot);
            if (vista.inconsistencias.length || !vista.sku_elegibles.includes(s.id_producto))
                return revision('ELEGIBILIDAD_CAMBIADA');
        }
        if (matches.length) {
            if (matches.length !== 1 || canon(matches[0]) !== canon(m) || s.stock_actual !== m.stock_resultante)
                return revision('MOVIMIENTO_STOCK_INCOHERENTE');
        }
        else {
            if (s.stock_actual !== m.stock_anterior || canon(e.pedido) !== canon(p.pedido_antes))
                return revision('ESCRITURA_PARCIAL_O_CONCURRENCIA');
            s.stock_actual = m.stock_resultante;
            e.movimientos.push(copia(m));
        }
        p.paso++;
        return { plan: p, estado: e };
    }
    // Antes de cerrar, cada efecto debe estar completo y cada saldo final verificado.
    for (const m of p.movimientos)
        if (e.movimientos.filter(x => x.movimiento_id === m.movimiento_id && canon(x) === canon(m)).length !== 1 || e.movimientos.filter(x => x.movimiento_id === m.movimiento_id).length !== 1)
            return revision('MOVIMIENTO_FALTANTE_O_DUPLICADO');
    const ultimos = new Map(p.movimientos.map(m => [m.producto_id, m]));
    for (const [id, m] of ultimos)
        if (e.skus.filter(s => s.id_producto === id && s.stock_actual === m.stock_resultante).length !== 1)
            return revision('STOCK_FINAL_INCOHERENTE');
    for (const a of p.pedido_resultante.asignaciones) {
        const existentes = e.asignaciones_historicas.filter(x => x.asignacion_id === a.asignacion_id);
        if (existentes.length && (existentes.length !== 1 || canon(existentes[0]) !== canon(a)))
            return revision('ASIGNACION_HISTORICA_INCOHERENTE');
    }
    const audits = e.auditoria.filter(a => a.operacion_id === p.operacion_id);
    const evento = { operacion_id: p.operacion_id, tipo: p.tipo, actor: p.actor, creado_en: p.creado_en, antes: p.pedido_antes, despues: p.pedido_resultante };
    if (audits.length && (audits.length !== 1 || canon(audits[0]) !== canon(evento)))
        return revision('AUDITORIA_INCOHERENTE');
    e.pedido = copia(p.pedido_resultante);
    for (const a of p.pedido_resultante.asignaciones)
        if (!e.asignaciones_historicas.some(x => x.asignacion_id === a.asignacion_id))
            e.asignaciones_historicas.push(copia(a));
    if (!audits.length)
        e.auditoria.push(copia(evento));
    p.estado = 'COMPLETADA';
    return { plan: p, estado: e };
}
function ejecutarPlanLocalV2(plan, estado) {
    let r = { plan: copia(plan), estado: copia(estado) };
    for (let i = 0; i <= plan.movimientos.length + 2 && !['COMPLETADA', 'REQUIERE_REVISION'].includes(r.plan.estado); i++)
        r = avanzarPlanDurableV2(r.plan, r.estado);
    return r;
}

},
"familias/planMixtoV2.ts":function(require,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.copiaV2 = copiaV2;
exports.canonV2 = canonV2;
exports.hashV2 = hashV2;
exports.hashInputV2 = hashInputV2;
exports.construirPlanMixtoV2 = construirPlanMixtoV2;
exports.validarHashPlanSheetsV2 = validarHashPlanSheetsV2;
exports.evidenciaPlanV2 = evidenciaPlanV2;
exports.productoResultanteV2 = productoResultanteV2;
exports.pedidoResultanteV2 = pedidoResultanteV2;
const pedidoV2_ts_1 = require("./pedidoV2.ts");
const asignacionV2_ts_1 = require("./asignacionV2.ts");
function copiaV2(v) { return structuredClone(v); }
function canonV2(v) {
    if (Array.isArray(v))
        return '[' + v.map(canonV2).join(',') + ']';
    if (v && typeof v === 'object')
        return '{' + Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => JSON.stringify(k) + ':' + canonV2(x)).join(',') + '}';
    return JSON.stringify(v);
}
function hashV2(v) {
    return require("./sha256.ts").sha256Texto(canonV2(v));
}
function hashInputV2(tipo, input) {
    var _a;
    (0, pedidoV2_ts_1.exigirV2)((0, pedidoV2_ts_1.idInternoV2)(input.id_pedido) && typeof input.actor === 'string' && /^[a-z0-9][a-z0-9._@-]{0,99}$/.test(input.actor)
        && typeof input.idempotency_key === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(input.idempotency_key), 'INPUT_DURABLE_INVALIDO');
    (0, pedidoV2_ts_1.exigirV2)(['recibido', 'pendiente', 'listo', 'entregado', 'cancelado'].includes(input.estado_esperado)
        && typeof input.apertura_id_esperada === 'string' && (input.apertura_id_esperada === '' || /^APE-\d{8}$/.test(input.apertura_id_esperada)), 'CONTEXTO_ESPERADO_INVALIDO');
    const reparto = (_a = input.asignaciones) !== null && _a !== void 0 ? _a : [];
    (0, pedidoV2_ts_1.exigirV2)(Array.isArray(reparto), 'REPARTO_INVALIDO');
    if (tipo === 'CANCELAR_V2')
        (0, pedidoV2_ts_1.exigirV2)(reparto.length === 0, 'CANCELACION_SIN_REPARTO');
    for (const r of reparto) {
        (0, pedidoV2_ts_1.exigirV2)(r && (0, pedidoV2_ts_1.idInternoV2)(r.id_detalle_pedido) && Array.isArray(r.selecciones), 'REPARTO_INVALIDO');
        for (const s of r.selecciones)
            (0, pedidoV2_ts_1.exigirV2)(s && typeof s.producto_id === 'string' && typeof s.cantidad_asignada === 'number' && Number.isFinite(s.cantidad_asignada), 'CANTIDAD_ASIGNACION_INVALIDA');
    }
    return hashV2({ tipo, id_pedido: input.id_pedido, actor: input.actor, estado_esperado: input.estado_esperado,
        apertura_id_esperada: input.apertura_id_esperada,
        reparto: reparto.map(r => ({ id_detalle_pedido: r.id_detalle_pedido, selecciones: r.selecciones.map(s => ({ producto_id: s.producto_id, cantidad_asignada: s.cantidad_asignada })).sort((a, b) => a.producto_id.localeCompare(b.producto_id)) })).sort((a, b) => a.id_detalle_pedido.localeCompare(b.id_detalle_pedido)) });
}
function exacto(n, codigo) {
    (0, pedidoV2_ts_1.exigirV2)(Number.isFinite(n) && n >= 0 && Number.isSafeInteger(Math.round(n)) && Math.abs(n - Math.round(n)) < 1e-7, codigo);
    return Math.round(n);
}
function escala(s) {
    if (s.modo_venta === 'GRANEL') {
        (0, pedidoV2_ts_1.exigirV2)([100, 250, 1000].includes(Number(s.gramos_unidad_stock)), 'BASE_GRANEL_INVALIDA');
        return Number(s.gramos_unidad_stock);
    }
    return s.permite_decimal === 'SI' || s.permite_decimal === true ? 1000 : 1;
}
function unico(skus, id) {
    const r = skus.filter(s => s.id_producto === id);
    (0, pedidoV2_ts_1.exigirV2)(r.length === 1, 'SKU_INEXISTENTE_O_DUPLICADO', 409);
    return r[0];
}
function moverV1(stocks, r, devolver, meta) {
    const s = unico(stocks, r.producto_id), base = r.gramos_unidad_stock_snapshot;
    (0, pedidoV2_ts_1.exigirV2)(s.unidad_medida === r.unidad_stock_snapshot && escala(s) === r.escala_stock_snapshot
        && (base === undefined ? s.modo_venta !== 'GRANEL' : s.modo_venta === 'GRANEL' && s.gramos_unidad_stock === base), 'BASE_HISTORICA_CAMBIADA', 409);
    const anterior = exacto(s.stock_actual * escala(s), 'STOCK_V1_INVALIDO'), delta = exacto(r.cantidad_stock * escala(s), 'CANTIDAD_V1_INVALIDA');
    const nuevo = anterior + (devolver ? delta : -delta);
    (0, pedidoV2_ts_1.exigirV2)(Number.isSafeInteger(nuevo) && nuevo >= 0, 'STOCK_INSUFICIENTE_O_DESBORDE', 409);
    s.stock_actual = nuevo / escala(s);
    return { ...meta, movimiento_id: '', producto_id: r.producto_id, tipo: devolver ? 'DEVOLUCION_SKU_V1' : 'SALIDA_SKU_V1',
        cantidad_stock: devolver ? r.cantidad_stock : -r.cantidad_stock, stock_anterior: anterior / escala(s), stock_resultante: s.stock_actual,
        unidad_stock_snapshot: r.unidad_stock_snapshot, escala_stock_snapshot: r.escala_stock_snapshot,
        ...(base !== undefined ? { gramos_unidad_stock_snapshot: base } : {}),
        id_detalle_pedido: r.id_detalle_pedido, asignacion_ids: [], referencia_id: meta.operacion_id, payload_hash: '' };
}
function reservarV1(l, stocks, contexto) {
    var _a, _b, _c;
    const s = unico(stocks, l.id_producto);
    (0, pedidoV2_ts_1.exigirV2)(s.activo === 'SI' && (((_a = s.tipo_disponibilidad) !== null && _a !== void 0 ? _a : 'REGULAR') === 'REGULAR' || s.tipo_disponibilidad === 'POR_APERTURA'
        && !!contexto.apertura_id && ((_b = contexto.sku_habilitados) === null || _b === void 0 ? void 0 : _b.includes(s.id_producto))), 'SKU_V1_NO_ELEGIBLE', 409);
    (0, pedidoV2_ts_1.exigirV2)(typeof l.cantidad === 'number' && l.cantidad > 0, 'CANTIDAD_V1_INVALIDA');
    // Ausencia histórica significa UNIDAD. Nunca reinterpretar cantidad V1 como gramos.
    const granel = l.modo_venta === 'GRANEL';
    (0, pedidoV2_ts_1.exigirV2)(granel ? s.modo_venta === 'GRANEL' && l.gramos_unidad_stock === s.gramos_unidad_stock : s.modo_venta !== 'GRANEL', 'BASE_HISTORICA_CAMBIADA', 409);
    if (l.unidad_medida)
        (0, pedidoV2_ts_1.exigirV2)(l.unidad_medida === s.unidad_medida, 'BASE_HISTORICA_CAMBIADA', 409);
    exacto(l.cantidad * escala(s), 'CANTIDAD_V1_INVALIDA');
    if (granel)
        (0, pedidoV2_ts_1.exigirV2)(Number.isSafeInteger(l.gramos_solicitados) && Number(l.gramos_solicitados) > 0
            && Math.abs(l.cantidad * Number(l.gramos_unidad_stock) - Number(l.gramos_solicitados)) < 1e-7, 'SNAPSHOT_GRANEL_V1_INVALIDO');
    return { id_detalle_pedido: l.id_detalle_pedido, producto_id: l.id_producto, cantidad_stock: l.cantidad,
        unidad_stock_snapshot: (_c = l.unidad_medida) !== null && _c !== void 0 ? _c : s.unidad_medida, escala_stock_snapshot: escala(s),
        ...(granel ? { gramos_unidad_stock_snapshot: l.gramos_unidad_stock } : {}) };
}
/** Valida TODO antes de cualquier efecto. C2 continúa siendo autoridad de cada línea V2. */
function construirPlanMixtoV2(args) {
    var _a, _b;
    const { tipo, input, pedido, detalles, contexto, meta, vigente } = args;
    (0, pedidoV2_ts_1.exigirV2)(pedido.estado === input.estado_esperado && ((_a = pedido.contexto_apertura_snapshot.apertura_id) !== null && _a !== void 0 ? _a : '') === input.apertura_id_esperada, 'PEDIDO_CONTEXTO_CAMBIO', 409);
    (0, pedidoV2_ts_1.exigirV2)(detalles.length > 0 && new Set(detalles.map(l => l.id_detalle_pedido)).size === detalles.length
        && detalles.every(l => l.id_pedido === pedido.id_pedido && (0, pedidoV2_ts_1.idInternoV2)(l.id_detalle_pedido)), 'DETALLE_MIXTO_INVALIDO');
    (0, pedidoV2_ts_1.exigirV2)(new Set(args.productos.map(s => s.id_producto)).size === args.productos.length, 'SKU_DUPLICADO', 409);
    const v2 = detalles.filter(l => (0, pedidoV2_ts_1.modeloLineaPedido)(l) === 'FAMILIA_V2');
    const v1 = detalles.filter(l => (0, pedidoV2_ts_1.modeloLineaPedido)(l) === 'SKU_V1');
    // C4 es un flujo nuevo explícito; no se enruta un pedido enteramente V1 a él.
    (0, pedidoV2_ts_1.exigirV2)(v2.length > 0, 'PEDIDO_SIN_LINEAS_V2');
    for (const l of v2)
        (0, pedidoV2_ts_1.leerOfertaSnapshotV2)(l);
    const stocks = copiaV2(args.productos), movimientos = [];
    let reservas = [];
    if (tipo === 'CONFIRMAR_V2') {
        (0, pedidoV2_ts_1.exigirV2)(pedido.estado === 'recibido' && !pedido.operacion_asignacion_vigente && args.asignaciones_vigentes.length === 0, 'ESTADO_CONFIRMACION_INVALIDO', 409);
        reservas = v1.map(l => { const r = reservarV1(l, stocks, contexto); movimientos.push(moverV1(stocks, r, false, meta)); return r; });
    }
    else if (pedido.estado !== 'recibido') {
        (0, pedidoV2_ts_1.exigirV2)(!!vigente && vigente.operacion_id === pedido.operacion_asignacion_vigente
            && canonV2(vigente.detalles) === canonV2(detalles), 'HISTORICO_VIGENTE_INVALIDO', 409);
        reservas = copiaV2(vigente.reservas_v1);
        (0, pedidoV2_ts_1.exigirV2)(reservas.length === v1.length && reservas.every(r => v1.some(l => l.id_detalle_pedido === r.id_detalle_pedido && l.id_producto === r.producto_id && l.cantidad === r.cantidad_stock)), 'HISTORICO_V1_INVALIDO', 409);
        if (tipo === 'CANCELAR_V2')
            for (const r of reservas)
                movimientos.push(moverV1(stocks, r, true, meta));
    }
    const p = { id_pedido: pedido.id_pedido, estado: pedido.estado, lineas: v2,
        asignaciones: copiaV2(args.asignaciones_vigentes), operacion_asignacion_vigente: pedido.operacion_asignacion_vigente };
    const reparto = (_b = input.asignaciones) !== null && _b !== void 0 ? _b : [];
    const c2 = tipo === 'CONFIRMAR_V2' ? (0, asignacionV2_ts_1.prepararConfirmacionFamiliaV2)(p, stocks, reparto, contexto, meta)
        : tipo === 'CANCELAR_V2' ? (0, asignacionV2_ts_1.prepararCancelacionFamiliaV2)(p, stocks, meta)
            : (0, asignacionV2_ts_1.reasignarAsignacionPedido)(p, stocks, reparto, contexto, meta);
    const nuevas = tipo === 'CANCELAR_V2' ? [] : c2.pedido_resultante.asignaciones;
    const referencias = tipo === 'CONFIRMAR_V2' ? nuevas : tipo === 'CANCELAR_V2' ? p.asignaciones : [...p.asignaciones, ...nuevas];
    (0, pedidoV2_ts_1.exigirV2)(referencias.length === c2.movimientos.length, 'PLAN_C2_INCOHERENTE');
    c2.movimientos.forEach((m, i) => movimientos.push({ ...m, id_detalle_pedido: referencias[i].id_detalle_pedido,
        asignacion_ids: [referencias[i].asignacion_id], referencia_id: meta.operacion_id, payload_hash: '' }));
    movimientos.forEach((m, i) => { m.movimiento_id = meta.operacion_id + '-M-' + i; m.payload_hash = args.payload_hash; });
    const saldos = [];
    for (const id of new Set(movimientos.map(m => m.producto_id))) {
        const ms = movimientos.filter(m => m.producto_id === id), antes = copiaV2(unico(args.productos, id));
        (0, pedidoV2_ts_1.exigirV2)(ms[0].stock_anterior === antes.stock_actual && ms.every((m, i) => i === 0 || m.stock_anterior === ms[i - 1].stock_resultante), 'CADENA_STOCK_INVALIDA');
        saldos.push({ producto_id: id, antes, stock_resultante: ms[ms.length - 1].stock_resultante,
            movimiento_ids: ms.map(m => m.movimiento_id), asignacion_ids: [...new Set(ms.flatMap(m => m.asignacion_ids))] });
    }
    const plan = { ...meta, modelo: 'PEDIDO_MIXTO_V2_1', tipo, payload_hash: args.payload_hash, plan_hash: '',
        pedido_antes: copiaV2(pedido), pedido_resultante: { ...copiaV2(pedido), estado: c2.pedido_resultante.estado,
            ...(c2.pedido_resultante.operacion_asignacion_vigente ? { operacion_asignacion_vigente: c2.pedido_resultante.operacion_asignacion_vigente } : {}) },
        detalles: copiaV2(detalles), contexto_snapshot: copiaV2(contexto), familias_observadas: copiaV2(args.familias_observadas),
        decisiones_familia: copiaV2(args.decisiones_familia), asignaciones_anteriores: copiaV2(p.asignaciones),
        asignaciones_nuevas: copiaV2(nuevas), reservas_v1: reservas, movimientos, saldos };
    plan.plan_hash = hashV2({ ...plan, plan_hash: '' });
    return plan;
}
function validarHashPlanSheetsV2(plan) {
    (0, pedidoV2_ts_1.exigirV2)(plan.modelo === 'PEDIDO_MIXTO_V2_1' && plan.plan_hash === hashV2({ ...plan, plan_hash: '' }), 'PLAN_ALTERADO', 409);
}
function evidenciaPlanV2(p, efecto_id) {
    return { operacion_id: p.operacion_id, payload_hash: p.payload_hash, plan_hash: p.plan_hash, efecto_id };
}
function productoResultanteV2(p, s) {
    var _a;
    const revision = (_a = s.antes.revision_stock_v2) !== null && _a !== void 0 ? _a : 0;
    (0, pedidoV2_ts_1.exigirV2)(Number.isSafeInteger(revision) && revision >= 0 && Number.isSafeInteger(revision + 1), 'REVISION_STOCK_INVALIDA');
    return { ...copiaV2(s.antes), stock_actual: s.stock_resultante, revision_stock_v2: revision + 1,
        evidencia_stock_v2: evidenciaPlanV2(p, p.operacion_id + '-S-' + s.producto_id) };
}
function pedidoResultanteV2(p, conPuntero = true) {
    const result = { ...copiaV2(p.pedido_antes), estado: p.pedido_resultante.estado,
        evidencia_estado_v2: evidenciaPlanV2(p, p.operacion_id + '-ESTADO') };
    return conPuntero ? { ...result, operacion_asignacion_vigente: p.pedido_resultante.operacion_asignacion_vigente,
        evidencia_puntero_v2: evidenciaPlanV2(p, p.operacion_id + '-PUNTERO') } : result;
}

},
"familias/adaptadorDurableV2.ts":function(require,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POLITICA_FAMILIA_DESACTIVADA = void 0;
exports.obtenerBloqueosOperativos = obtenerBloqueosOperativos;
exports.exigirRecursosLibresV2 = exigirRecursosLibresV2;
exports.verificarOperacionV2 = verificarOperacionV2;
exports.confirmarPedidoV2Durable = confirmarPedidoV2Durable;
exports.cancelarPedidoV2Durable = cancelarPedidoV2Durable;
exports.reasignarPedidoV2Durable = reasignarPedidoV2Durable;
/** C4: puerto local sobre hojas simuladas. Ninguna implementación Google/HTTP. */
const pedidoV2_ts_1 = require("./pedidoV2.ts");
const revisionV1_ts_1 = require("./revisionV1.ts");
const planMixtoV2_ts_1 = require("./planMixtoV2.ts");
/** D50: decisión de Omar. Afecta pedidos recibidos; C1 sigue rechazando nuevas ofertas inactivas. */
exports.POLITICA_FAMILIA_DESACTIVADA = 'PERMITIR_SNAPSHOT';
/** Un diario antiguo/desconocido incompleto no se reinterpreta: bloqueo conservador global. */
function obtenerBloqueosOperativos(ops, excluir = '') {
    var _a, _b;
    const pedidos = new Set(), sku = new Set(), operaciones = [];
    let global = false;
    for (const op of ops) {
        if (op.estado_operacion === 'COMPLETADA' || op.operacion_id === excluir)
            continue;
        const identidadUnica = ops.filter(x => x.operacion_id === op.operacion_id || x.idempotency_key === op.idempotency_key).length === 1;
        if (identidadUnica && (0, revisionV1_ts_1.revisionV1Acreditada)(op))
            continue;
        operaciones.push(op.operacion_id);
        pedidos.add(op.id_pedido);
        if (/^(PLAN_|DIARIO_|RESULTADO_)/.test((_a = op.error_codigo) !== null && _a !== void 0 ? _a : '')
            || ops.filter(x => x.operacion_id === op.operacion_id || x.idempotency_key === op.idempotency_key).length !== 1)
            global = true;
        try {
            const p = JSON.parse(op.snapshot_json);
            if (p.modelo !== 'PEDIDO_MIXTO_V2_1' || p.operacion_id !== op.operacion_id || ((_b = p.pedido_antes) === null || _b === void 0 ? void 0 : _b.id_pedido) !== op.id_pedido
                || !Array.isArray(p.saldos) || !p.saldos.every(s => typeof s.producto_id === 'string'))
                global = true;
            else
                p.saldos.forEach(s => sku.add(s.producto_id));
        }
        catch {
            global = true;
        }
    }
    return { pedidos: [...pedidos].sort(), sku: [...sku].sort(), operaciones, global };
}
function exigirRecursosLibresV2(b, recursos) {
    (0, pedidoV2_ts_1.exigirV2)(!b.global && (!recursos.id_pedido || !b.pedidos.includes(recursos.id_pedido))
        && !recursos.sku.some(s => b.sku.includes(s)), 'RECURSO_BLOQUEADO_OPERACION_INCOMPLETA', 423);
}
function uno(filas, campo, id, codigo) {
    const r = filas.filter(f => f[campo] === id);
    (0, pedidoV2_ts_1.exigirV2)(r.length === 1, codigo, 409);
    return r[0];
}
function resultado(p) {
    var _a;
    return { operacion_id: p.operacion_id, id_pedido: p.pedido_antes.id_pedido, tipo_operacion: p.tipo,
        estado_operacion: 'COMPLETADA', estado_pedido: p.pedido_resultante.estado,
        operacion_asignacion_vigente: (_a = p.pedido_resultante.operacion_asignacion_vigente) !== null && _a !== void 0 ? _a : '',
        asignacion_ids: (p.tipo === 'CANCELAR_V2' ? p.asignaciones_anteriores : p.asignaciones_nuevas).map(a => a.asignacion_id),
        stocks: p.saldos.map(s => ({ producto_id: s.producto_id, stock_resultante: s.stock_resultante })) };
}
function leerPlan(op) {
    let p;
    try {
        p = JSON.parse(op.snapshot_json);
    }
    catch {
        throw new pedidoV2_ts_1.ErrorPedidoFamilia('PLAN_JSON_INVALIDO', 409);
    }
    (0, pedidoV2_ts_1.exigirV2)(p && typeof p === 'object' && !Array.isArray(p), 'PLAN_JSON_INVALIDO', 409);
    (0, planMixtoV2_ts_1.validarHashPlanSheetsV2)(p);
    (0, pedidoV2_ts_1.exigirV2)(p.operacion_id === op.operacion_id && p.pedido_antes.id_pedido === op.id_pedido && p.tipo === op.tipo_operacion
        && p.actor === op.actor && p.payload_hash === op.payload_hash && p.idempotency_key === op.idempotency_key
        && p.creado_en === op.creado_en, 'DIARIO_PLAN_INCOHERENTE', 409);
    (0, pedidoV2_ts_1.exigirV2)(['PREPARADA', 'APLICANDO', 'COMPLETADA', 'REQUIERE_REVISION'].includes(op.estado_operacion)
        && Number.isSafeInteger(op.paso) && op.paso >= 0 && op.paso <= 7, 'DIARIO_PROGRESO_INVALIDO', 409);
    return p;
}
function contextoActual(a, pedido) {
    const id = pedido.contexto_apertura_snapshot.apertura_id;
    if (!id)
        return {};
    const filas = (a.leer('APERTURA_PRODUCTOS')).filter(f => f.apertura_id === id);
    (0, pedidoV2_ts_1.exigirV2)(new Set(filas.map(f => f.producto_id)).size === filas.length && filas.every(f => ['SI', 'NO'].includes(f.habilitado)), 'APERTURA_DUPLICADA_O_INVALIDA', 409);
    return { apertura_id: id, sku_habilitados: filas.filter(f => f.habilitado === 'SI').map(f => f.producto_id).sort() };
}
function resolverFamilias(a, ds) {
    const familias = a.leer('FAMILIAS_PRODUCTO'), observadas = [], decisiones = [];
    for (const l of ds.filter(l => l.modelo_linea === 'FAMILIA_V2')) {
        const snapshot = (0, pedidoV2_ts_1.leerOfertaSnapshotV2)(l);
        if (observadas.some(f => f.familia_id === snapshot.familia_id))
            continue;
        const actual = uno(familias, 'familia_id', snapshot.familia_id, 'FAMILIA_ACTUAL_INEXISTENTE_O_DUPLICADA');
        (0, pedidoV2_ts_1.exigirV2)(actual.activo === 'SI' || actual.activo === 'NO', 'FAMILIA_ACTUAL_INVALIDA', 409);
        if (actual.activo === 'NO') {
            decisiones.push({ familia_id: actual.familia_id, decision: exports.POLITICA_FAMILIA_DESACTIVADA });
        }
        observadas.push((0, planMixtoV2_ts_1.copiaV2)(actual));
    }
    return { observadas, decisiones };
}
function comprobarFilas(actuales, esperadas, campo, obligatorio) {
    for (const fila of esperadas) {
        const r = actuales.filter(x => x[campo] === fila[campo]);
        (0, pedidoV2_ts_1.exigirV2)(r.length <= 1 && (!obligatorio || r.length === 1) && (!r.length || (0, planMixtoV2_ts_1.canonV2)(r[0]) === (0, planMixtoV2_ts_1.canonV2)(fila)), 'EFECTO_FALTANTE_DUPLICADO_O_ALTERADO', 409);
    }
}
/** Preflight reconoce solo antes exacto o después con recibo exacto. Nunca saldo aislado. */
function inspeccionar(a, p, paso, final) {
    (0, planMixtoV2_ts_1.validarHashPlanSheetsV2)(p);
    const [pedidos, detalles, productos, asignaciones, movimientos, familias] = [
        a.leer('PEDIDOS'), a.leer('DETALLE_PEDIDOS'), a.leer('PRODUCTOS'), a.leer('ASIGNACIONES_PEDIDO'), a.leer('MOVIMIENTOS_STOCK'), a.leer('FAMILIAS_PRODUCTO'),
    ];
    const pedido = uno(pedidos, 'id_pedido', p.pedido_antes.id_pedido, 'PEDIDO_INEXISTENTE_O_DUPLICADO');
    (0, pedidoV2_ts_1.exigirV2)((0, planMixtoV2_ts_1.canonV2)(detalles.filter(l => l.id_pedido === pedido.id_pedido)) === (0, planMixtoV2_ts_1.canonV2)(p.detalles), 'DETALLE_CAMBIO_CONCURRENTE', 409);
    (0, pedidoV2_ts_1.exigirV2)([p.pedido_antes, (0, planMixtoV2_ts_1.pedidoResultanteV2)(p, false), (0, planMixtoV2_ts_1.pedidoResultanteV2)(p)].some(x => (0, planMixtoV2_ts_1.canonV2)(x) === (0, planMixtoV2_ts_1.canonV2)(pedido)), 'PEDIDO_CAMBIO_SIN_AUTORIA', 409);
    if (final || paso >= 6)
        (0, pedidoV2_ts_1.exigirV2)((0, planMixtoV2_ts_1.canonV2)(pedido) === (0, planMixtoV2_ts_1.canonV2)((0, planMixtoV2_ts_1.pedidoResultanteV2)(p)), 'PEDIDO_O_PUNTERO_INCOMPLETO', 409);
    if (paso >= 5)
        (0, pedidoV2_ts_1.exigirV2)((0, planMixtoV2_ts_1.canonV2)(pedido) !== (0, planMixtoV2_ts_1.canonV2)(p.pedido_antes), 'ESTADO_PEDIDO_SIN_EVIDENCIA', 409);
    const propias = asignaciones.filter(x => x.operacion_id === p.operacion_id);
    (0, pedidoV2_ts_1.exigirV2)(propias.every(x => p.asignaciones_nuevas.some(e => e.asignacion_id === x.asignacion_id)), 'ASIGNACION_INESPERADA', 409);
    comprobarFilas(asignaciones, p.asignaciones_anteriores, 'asignacion_id', true);
    comprobarFilas(asignaciones, p.asignaciones_nuevas, 'asignacion_id', final || paso >= 2);
    const ms = movimientos.filter(x => x.operacion_id === p.operacion_id || x.referencia_id === p.operacion_id);
    (0, pedidoV2_ts_1.exigirV2)(ms.every(x => p.movimientos.some(e => e.movimiento_id === x.movimiento_id)), 'MOVIMIENTO_INESPERADO', 409);
    comprobarFilas(movimientos, p.movimientos, 'movimiento_id', final || paso >= 3);
    for (const s of p.saldos) {
        const actual = uno(productos, 'id_producto', s.producto_id, 'SKU_INEXISTENTE_O_DUPLICADO');
        const aplicado = (0, planMixtoV2_ts_1.canonV2)(actual) === (0, planMixtoV2_ts_1.canonV2)((0, planMixtoV2_ts_1.productoResultanteV2)(p, s));
        (0, pedidoV2_ts_1.exigirV2)(aplicado || (!final && paso < 4 && (0, planMixtoV2_ts_1.canonV2)(actual) === (0, planMixtoV2_ts_1.canonV2)(s.antes)), 'STOCK_SIN_AUTORIA_O_CONCURRENCIA', 409);
        if (aplicado) {
            comprobarFilas(movimientos, p.movimientos, 'movimiento_id', true);
            comprobarFilas(asignaciones, p.asignaciones_nuevas, 'asignacion_id', true);
        }
    }
    // Cancelar usa identidad histórica y omite familia/apertura actual. Otras operaciones congelan ambas.
    if (p.tipo !== 'CANCELAR_V2') {
        for (const f of p.familias_observadas)
            (0, pedidoV2_ts_1.exigirV2)((0, planMixtoV2_ts_1.canonV2)(uno(familias, 'familia_id', f.familia_id, 'FAMILIA_CAMBIO')) === (0, planMixtoV2_ts_1.canonV2)(f), 'FAMILIA_CAMBIO_DURANTE_OPERACION', 409);
        (0, pedidoV2_ts_1.exigirV2)((0, planMixtoV2_ts_1.canonV2)(contextoActual(a, p.pedido_antes)) === (0, planMixtoV2_ts_1.canonV2)(p.contexto_snapshot), 'APERTURA_CAMBIO_DURANTE_OPERACION', 409);
    }
}
/** Readback integral público y puro respecto de mutaciones: no marca COMPLETADA por sí mismo. */
function verificarOperacionV2(a, id) {
    try {
        const op = uno(a.leer('OPERACIONES_PEDIDOS'), 'operacion_id', id, 'DIARIO_INEXISTENTE_O_DUPLICADO');
        const p = leerPlan(op);
        (0, pedidoV2_ts_1.exigirV2)(['APLICANDO', 'COMPLETADA'].includes(op.estado_operacion) && op.paso >= 6, 'READBACK_OPERACION_NO_CERRABLE', 409);
        inspeccionar(a, p, op.paso, true);
        return { valido: true };
    }
    catch (e) {
        if (e instanceof pedidoV2_ts_1.ErrorPedidoFamilia)
            return { valido: false, error_codigo: e.codigo };
        throw e;
    }
}
function guardarOp(a, op, cambios, punto) {
    const nuevo = { ...op, ...cambios };
    a.reemplazar('OPERACIONES_PEDIDOS', 'operacion_id', op.operacion_id, op, nuevo, punto);
    return nuevo;
}
function avanzarPaso(a, op, paso) {
    return op.paso >= paso ? op : guardarOp(a, op, { paso }, 'CHECKPOINT_' + paso);
}
function marcarRevision(a, op, codigo) {
    const actual = uno(a.leer('OPERACIONES_PEDIDOS'), 'operacion_id', op.operacion_id, 'DIARIO_INEXISTENTE_O_DUPLICADO');
    return guardarOp(a, actual, { estado_operacion: 'REQUIERE_REVISION', error_codigo: codigo }, 'REQUIERE_REVISION');
}
function resultadoRevision(a, op, tipo, codigo) {
    var _a;
    const pedidos = (a.leer('PEDIDOS')).filter(x => x.id_pedido === op.id_pedido);
    const pedido = pedidos.length === 1 ? pedidos[0] : undefined;
    // La respuesta incierta nunca presenta saldos/resultados previstos como hechos completados.
    return { operacion_id: op.operacion_id, id_pedido: op.id_pedido, tipo_operacion: tipo, estado_operacion: 'REQUIERE_REVISION',
        estado_pedido: pedido === null || pedido === void 0 ? void 0 : pedido.estado, operacion_asignacion_vigente: (_a = pedido === null || pedido === void 0 ? void 0 : pedido.operacion_asignacion_vigente) !== null && _a !== void 0 ? _a : '',
        asignacion_ids: [], stocks: [], error_codigo: codigo };
}
function reanudar(a, opInicial, p) {
    var _a, _b;
    let op = opInicial;
    if (op.estado_operacion === 'REQUIERE_REVISION')
        return resultadoRevision(a, op, p.tipo, op.error_codigo);
    if (op.estado_operacion === 'COMPLETADA') {
        let res;
        try {
            res = JSON.parse(op.resultado_json);
        }
        catch {
            throw new pedidoV2_ts_1.ErrorPedidoFamilia('RESULTADO_JSON_INVALIDO', 409);
        }
        (0, pedidoV2_ts_1.exigirV2)((0, planMixtoV2_ts_1.canonV2)(res) === (0, planMixtoV2_ts_1.canonV2)(resultado(p)), 'RESULTADO_PERSISTIDO_ALTERADO', 409);
        return res; // Histórico: no validar contra stock de operaciones posteriores.
    }
    try {
        exigirRecursosLibresV2(obtenerBloqueosOperativos(a.leer('OPERACIONES_PEDIDOS'), op.operacion_id), { id_pedido: op.id_pedido, sku: p.saldos.map(s => s.producto_id) });
        inspeccionar(a, p, op.paso, false);
        if (op.estado_operacion === 'PREPARADA')
            op = guardarOp(a, op, { estado_operacion: 'APLICANDO', paso: 1 }, 'APLICANDO');
        for (const [i, fila] of p.asignaciones_nuevas.entries()) {
            const existentes = (a.leer('ASIGNACIONES_PEDIDO')).filter(x => x.asignacion_id === fila.asignacion_id);
            if (!existentes.length)
                a.insertar('ASIGNACIONES_PEDIDO', fila, 'ASIGNACION_' + (i + 1));
        }
        op = avanzarPaso(a, op, 2);
        for (const [i, fila] of p.movimientos.entries()) {
            const existentes = (a.leer('MOVIMIENTOS_STOCK')).filter(x => x.movimiento_id === fila.movimiento_id);
            if (!existentes.length)
                a.insertar('MOVIMIENTOS_STOCK', fila, 'MOVIMIENTO_' + (i + 1));
        }
        op = avanzarPaso(a, op, 3);
        inspeccionar(a, p, op.paso, false); // Evidencia completa ANTES de aplicar saldos.
        for (const [i, saldo] of p.saldos.entries()) {
            const actual = uno(a.leer('PRODUCTOS'), 'id_producto', saldo.producto_id, 'SKU_INEXISTENTE_O_DUPLICADO');
            const despues = (0, planMixtoV2_ts_1.productoResultanteV2)(p, saldo);
            if ((0, planMixtoV2_ts_1.canonV2)(actual) !== (0, planMixtoV2_ts_1.canonV2)(despues))
                a.reemplazar('PRODUCTOS', 'id_producto', saldo.producto_id, saldo.antes, despues, 'STOCK_' + (i + 1));
        }
        op = avanzarPaso(a, op, 4);
        let pedido = uno(a.leer('PEDIDOS'), 'id_pedido', op.id_pedido, 'PEDIDO_INEXISTENTE_O_DUPLICADO');
        const intermedio = (0, planMixtoV2_ts_1.pedidoResultanteV2)(p, false), final = (0, planMixtoV2_ts_1.pedidoResultanteV2)(p);
        if ((0, planMixtoV2_ts_1.canonV2)(pedido) === (0, planMixtoV2_ts_1.canonV2)(p.pedido_antes)) {
            a.reemplazar('PEDIDOS', 'id_pedido', op.id_pedido, pedido, intermedio, 'ESTADO_PEDIDO');
            pedido = intermedio;
        }
        op = avanzarPaso(a, op, 5);
        if ((0, planMixtoV2_ts_1.canonV2)(pedido) !== (0, planMixtoV2_ts_1.canonV2)(final))
            a.reemplazar('PEDIDOS', 'id_pedido', op.id_pedido, intermedio, final, 'PUNTERO_VIGENTE');
        op = avanzarPaso(a, op, 6);
        a.punto('ANTES_READBACK');
        const check = verificarOperacionV2(a, op.operacion_id);
        (0, pedidoV2_ts_1.exigirV2)(check.valido, (_a = check.error_codigo) !== null && _a !== void 0 ? _a : 'READBACK_INCORRECTO', 409);
        a.punto('DESPUES_READBACK');
        op = avanzarPaso(a, op, 7);
        // Segunda lectura bajo el mismo lock: también detecta corrupción inyectada entre readback y cierre.
        const ultima = verificarOperacionV2(a, op.operacion_id);
        (0, pedidoV2_ts_1.exigirV2)(ultima.valido, (_b = ultima.error_codigo) !== null && _b !== void 0 ? _b : 'READBACK_INCORRECTO', 409);
        const res = resultado(p);
        guardarOp(a, op, { estado_operacion: 'COMPLETADA', resultado_json: JSON.stringify(res) }, 'COMPLETADA');
        return res;
    }
    catch (e) {
        if (!(e instanceof pedidoV2_ts_1.ErrorPedidoFamilia))
            throw e; // Caída/timeout no compensa ni inventa progreso.
        marcarRevision(a, op, e.codigo);
        return resultadoRevision(a, op, p.tipo, e.codigo);
    }
}
function mutar(a, tipo, input, opciones) {
    return a.conLock(() => {
        var _a;
        const payload_hash = (0, planMixtoV2_ts_1.hashInputV2)(tipo, input), ops = a.leer('OPERACIONES_PEDIDOS');
        const previas = ops.filter(o => o.idempotency_key === input.idempotency_key);
        (0, pedidoV2_ts_1.exigirV2)(previas.length <= 1, 'KEY_DUPLICADA', 409);
        if (previas.length) {
            const op = previas[0];
            (0, pedidoV2_ts_1.exigirV2)(op.id_pedido === input.id_pedido && op.tipo_operacion === tipo && op.payload_hash === payload_hash, 'CONFLICTO_IDEMPOTENCIA', 409);
            try {
                return reanudar(a, op, leerPlan(op));
            }
            catch (e) {
                if (!(e instanceof pedidoV2_ts_1.ErrorPedidoFamilia))
                    throw e;
                marcarRevision(a, op, e.codigo);
                return resultadoRevision(a, op, tipo, e.codigo);
            }
        }
        const pedido = uno(a.leer('PEDIDOS'), 'id_pedido', input.id_pedido, 'PEDIDO_INEXISTENTE_O_DUPLICADO');
        const detalles = (a.leer('DETALLE_PEDIDOS')).filter(l => l.id_pedido === input.id_pedido);
        const productos = a.leer('PRODUCTOS');
        exigirRecursosLibresV2(obtenerBloqueosOperativos(ops), { id_pedido: input.id_pedido,
            sku: [...detalles.filter(l => l.modelo_linea !== 'FAMILIA_V2').map(l => l.id_producto), ...((_a = input.asignaciones) !== null && _a !== void 0 ? _a : []).flatMap(r => r.selecciones.map(s => s.producto_id))] });
        let vigente;
        let asignaciones_vigentes = [];
        if (pedido.operacion_asignacion_vigente) {
            const anterior = uno(ops, 'operacion_id', pedido.operacion_asignacion_vigente, 'PUNTERO_DIARIO_INVALIDO');
            (0, pedidoV2_ts_1.exigirV2)(anterior.estado_operacion === 'COMPLETADA', 'ASIGNACION_VIGENTE_INCOMPLETA', 423);
            vigente = leerPlan(anterior);
            (0, pedidoV2_ts_1.exigirV2)(vigente.tipo !== 'CANCELAR_V2' && vigente.pedido_antes.id_pedido === pedido.id_pedido, 'PUNTERO_DIARIO_AJENO', 409);
            (0, pedidoV2_ts_1.exigirV2)((0, planMixtoV2_ts_1.canonV2)(pedido.evidencia_puntero_v2) === (0, planMixtoV2_ts_1.canonV2)((0, planMixtoV2_ts_1.pedidoResultanteV2)(vigente).evidencia_puntero_v2), 'PUNTERO_SIN_AUTORIA', 409);
            asignaciones_vigentes = (a.leer('ASIGNACIONES_PEDIDO')).filter(x => x.operacion_id === anterior.operacion_id);
            (0, pedidoV2_ts_1.exigirV2)((0, planMixtoV2_ts_1.canonV2)(asignaciones_vigentes) === (0, planMixtoV2_ts_1.canonV2)(vigente.asignaciones_nuevas), 'HISTORICO_VIGENTE_ALTERADO', 409);
        }
        const contexto = tipo === 'CANCELAR_V2' ? {} : contextoActual(a, pedido);
        const f = tipo === 'CANCELAR_V2' ? { observadas: [], decisiones: [] } : resolverFamilias(a, detalles);
        const operacion_id = 'OP-C4-' + ((0, planMixtoV2_ts_1.hashV2)({ id_pedido: input.id_pedido, key: input.idempotency_key })).slice(0, 32);
        (0, pedidoV2_ts_1.exigirV2)(!ops.some(o => o.operacion_id === operacion_id), 'OPERACION_ID_COLISION', 409);
        const meta = { operacion_id, idempotency_key: input.idempotency_key, actor: input.actor, creado_en: opciones.ahora() };
        const plan = (0, planMixtoV2_ts_1.construirPlanMixtoV2)({ tipo, input, pedido, detalles, productos, contexto, meta, payload_hash,
            vigente, asignaciones_vigentes, familias_observadas: f.observadas, decisiones_familia: f.decisiones });
        exigirRecursosLibresV2(obtenerBloqueosOperativos(ops), { id_pedido: input.id_pedido, sku: plan.saldos.map(s => s.producto_id) });
        const op = { operacion_id, id_pedido: input.id_pedido, idempotency_key: input.idempotency_key,
            tipo_operacion: tipo, actor: input.actor, estado_operacion: 'PREPARADA', paso: 0, payload_hash,
            snapshot_json: JSON.stringify(plan), resultado_json: '', creado_en: meta.creado_en, actualizado_en: meta.creado_en };
        a.insertar('OPERACIONES_PEDIDOS', op, 'PREPARADA');
        return reanudar(a, op, plan);
    });
}
function confirmarPedidoV2Durable(a, input, opciones) { return mutar(a, 'CONFIRMAR_V2', input, opciones); }
function cancelarPedidoV2Durable(a, input, opciones) { return mutar(a, 'CANCELAR_V2', input, opciones); }
function reasignarPedidoV2Durable(a, input, opciones) { return mutar(a, 'REASIGNAR_V2', input, opciones); }

},
"familias/esquemaDurableV2.ts":function(require,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODELO_OBSERVACION_MOVIMIENTO_C5 = exports.CAMPOS_OBSERVACION_MOVIMIENTO_C5 = exports.MAPEO_MOVIMIENTO_C5 = exports.CAMPOS_RECIBO_DURABLE_V2 = exports.COLUMNAS_DIARIO_REQUERIDAS_C5 = exports.COLUMNAS_ASIGNACIONES_PEDIDO = exports.COLUMNAS_ADITIVAS_C5 = exports.COLUMNA_APERTURA_PEDIDO_C5 = exports.COLUMNAS_PEDIDOS_DURABLE_V2 = exports.COLUMNAS_PRODUCTOS_DURABLE_V2 = void 0;
/** C5-A: esquema futuro mínimo. No crea hojas ni conecta rutas o servicios. */
const pedidoV2_ts_1 = require("./pedidoV2.ts");
Object.defineProperty(exports, "COLUMNAS_ASIGNACIONES_PEDIDO", { enumerable: true, get: function () { return pedidoV2_ts_1.COLUMNAS_ASIGNACIONES_PEDIDO; } });
exports.COLUMNAS_PRODUCTOS_DURABLE_V2 = ['revision_stock_v2', 'evidencia_stock_v2'];
exports.COLUMNAS_PEDIDOS_DURABLE_V2 = [
    'operacion_asignacion_vigente', 'evidencia_estado_v2', 'evidencia_puntero_v2',
];
/** El puerto derivará contexto_apertura_snapshot.apertura_id del ID ya congelado en PEDIDOS.
 * Habilitaciones se leen para ese ID al confirmar y se congelan en el plan, como C4.
 * No duplicar apertura_id en otra columna JSON. */
exports.COLUMNA_APERTURA_PEDIDO_C5 = 'apertura_id';
exports.COLUMNAS_ADITIVAS_C5 = {
    PRODUCTOS: exports.COLUMNAS_PRODUCTOS_DURABLE_V2,
    PEDIDOS: exports.COLUMNAS_PEDIDOS_DURABLE_V2,
    DETALLE_PEDIDOS: pedidoV2_ts_1.COLUMNAS_DETALLE_PEDIDOS_V2_ADITIVAS,
};
/** OPERACIONES_PEDIDOS ya tiene estos campos; no necesita columnas nuevas. */
exports.COLUMNAS_DIARIO_REQUERIDAS_C5 = [
    'operacion_id', 'idempotency_key', 'tipo_operacion', 'id_pedido', 'actor',
    'estado_operacion', 'paso', 'payload_hash', 'snapshot_json', 'resultado_json',
    'error_codigo', 'error_detalle', 'creado_en', 'actualizado_en',
];
/** Los recibos son JSON; nunca se acepta saldo final sin autoría. */
exports.CAMPOS_RECIBO_DURABLE_V2 = ['operacion_id', 'payload_hash', 'plan_hash', 'efecto_id'];
/** Diseño de serialización para el futuro puerto, aún sin implementación GAS.
 * Campos directos existentes + observacion JSON versionado cubren el movimiento C4 completo.
 * No se requiere una columna nueva por cada atributo del snapshot físico. */
exports.MAPEO_MOVIMIENTO_C5 = {
    movimiento_id: 'movimiento_id', operacion_id: 'operacion_id', producto_id: 'producto_id',
    tipo: 'tipo_movimiento', cantidad_stock: 'cantidad', stock_anterior: 'stock_anterior',
    stock_resultante: 'stock_resultante', actor: 'usuario', creado_en: 'fecha_hora',
    referencia_id: 'referencia_id', payload_hash: 'payload_hash',
};
exports.CAMPOS_OBSERVACION_MOVIMIENTO_C5 = [
    'id_detalle_pedido', 'asignacion_ids', 'unidad_stock_snapshot',
    'gramos_unidad_stock_snapshot', 'escala_stock_snapshot',
    'idempotency_key', // Metadata C4 presente en movimientos de reserva V1 dentro de un plan mixto.
];
exports.MODELO_OBSERVACION_MOVIMIENTO_C5 = 'MOVIMIENTO_PEDIDO_V2_1';

}
},cache={};
function load(id){if(cache[id])return cache[id];var exports=cache[id]={};factories[id](function(rel){var parts=id.split("/");parts.pop();rel.split("/").forEach(function(x){if(x==="..")parts.pop();else if(x!==".")parts.push(x);});return load(parts.join("/"));},exports);return exports;}
return {pedido:load("familias/pedidoV2.ts"),motor:load("familias/asignacionV2.ts"),plan:load("familias/planMixtoV2.ts"),durable:load("familias/adaptadorDurableV2.ts"),revision:load("familias/revisionV1.ts"),esquema:load("familias/esquemaDurableV2.ts"),sha:load("familias/sha256.ts")};
})();
// FIN DOMINIO DURABLE C5 GENERADO

// ================= PUERTO DURABLE C5: TEST + FIXTURES QA EXCLUSIVOS =============
function destinoDurableC5_() {
  var ss = destinoFamiliasAdminB3_();
  var d = DominioPedidoDurableC5;
  var contratos = Object.assign({ ASIGNACIONES_PEDIDO: d.esquema.COLUMNAS_ASIGNACIONES_PEDIDO,
    OPERACIONES_PEDIDOS: d.revision.COLUMNAS_ORIGINALES_OPERACION.concat(d.revision.COLUMNAS_RESOLUCION_REVISION) }, d.esquema.COLUMNAS_ADITIVAS_C5);
  Object.keys(contratos).forEach(function (n) {
    var h = leerHoja_(ss, n);
    if (new Set(h.headers).size !== h.headers.length || h.headers.some(function (x) { return !x; })) lanzar_('C5_HEADERS_AMBIGUOS', 409);
    contratos[n].forEach(function (k) { if (h.mapa[k] === undefined) lanzar_('C5_ESQUEMA_INCOMPLETO', 409); });
  });
  if (d.sha.sha256Texto('abc') !== 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad') lanzar_('C5_RUNTIME_HASH_INCOMPATIBLE', 409);
  return ss;
}
function exigirQaC5_(id, prefijo) {
  if (typeof id !== 'string' || !(new RegExp('^' + prefijo + '-QA-C5-[A-Za-z0-9-]{1,60}$')).test(id)) lanzar_('C5_RECURSO_NO_QA', 403);
}
function seleccionarCamposC5_(obj, campos, obligatorios) {
  var r = {};
  campos.forEach(function (k) { if ((obligatorios || []).indexOf(k) !== -1 || obj[k] !== '' && obj[k] !== undefined && obj[k] !== null) r[k] = obj[k]; });
  return r;
}
function normalizarFilaC5_(tabla, raw) {
  var d = DominioPedidoDurableC5, o = serializarRegistroF78_(raw);
  if (tabla === 'PEDIDOS') {
    var p = { id_pedido: o.id_pedido, estado: o.estado_pedido, contexto_apertura_snapshot: o.apertura_id ? { apertura_id: o.apertura_id } : {} };
    ['operacion_asignacion_vigente','evidencia_estado_v2','evidencia_puntero_v2'].forEach(function (k) { if (o[k]) p[k] = k.indexOf('evidencia') === 0 ? JSON.parse(o[k]) : o[k]; });
    return p;
  }
  if (tabla === 'PRODUCTOS') {
    var s = seleccionarCamposC5_(o, ['id_producto','nombre','categoria','activo','modo_venta','unidad_medida','permite_decimal','paso_venta','gramos_referencia','gramos_unidad_stock','tipo_disponibilidad','stock_actual','precio_costo','precio_venta','familia_id','marca','presentacion','contenido_cantidad','contenido_unidad','revision_stock_v2','evidencia_stock_v2'], ['id_producto','nombre','categoria','activo','unidad_medida','stock_actual']);
    if (s.evidencia_stock_v2) s.evidencia_stock_v2 = JSON.parse(s.evidencia_stock_v2);
    return s;
  }
  if (tabla === 'DETALLE_PEDIDOS') return seleccionarCamposC5_(o, o.modelo_linea === 'FAMILIA_V2'
    ? ['id_pedido','id_detalle_pedido','modelo_linea','id_producto','cantidad','familia_id','cantidad_solicitada','unidad_solicitada','nombre_producto','precio_unitario','subtotal','presentacion_publica_snapshot','version_oferta_snapshot','oferta_snapshot_json']
    : ['id_pedido','id_detalle_pedido','modelo_linea','id_producto','cantidad','nombre_producto','precio_unitario','subtotal','unidad_medida','modo_venta','gramos_solicitados','gramos_referencia','gramos_unidad_stock'],
    o.modelo_linea === 'FAMILIA_V2' ? ['id_producto','cantidad'] : []);
  if (tabla === 'OPERACIONES_PEDIDOS') return seleccionarCamposC5_(o, d.revision.COLUMNAS_ORIGINALES_OPERACION.concat(d.revision.COLUMNAS_RESOLUCION_REVISION), ['resultado_json']);
  if (tabla === 'ASIGNACIONES_PEDIDO') return seleccionarCamposC5_(o, d.esquema.COLUMNAS_ASIGNACIONES_PEDIDO, d.esquema.COLUMNAS_ASIGNACIONES_PEDIDO.filter(function(k){return k !== 'gramos_unidad_stock_snapshot';}));
  if (tabla === 'FAMILIAS_PRODUCTO') return seleccionarCamposC5_(o, COLUMNAS_FAMILIAS_PRODUCTO);
  if (tabla === 'APERTURA_PRODUCTOS') return seleccionarCamposC5_(o, ['apertura_id','producto_id','habilitado']);
  if (tabla === 'MOVIMIENTOS_STOCK') {
    var extra;
    try { extra = JSON.parse(o.observacion); } catch (_) { extra = null; }
    if (!extra || extra.modelo !== d.esquema.MODELO_OBSERVACION_MOVIMIENTO_C5) {
      if (o.referencia_tipo === 'PEDIDO_V2_QA') lanzar_('C5_MOVIMIENTO_SNAPSHOT_CORRUPTO', 409);
      return { movimiento_id: o.movimiento_id || o.id_movimiento, operacion_id: o.operacion_id || '', referencia_id: o.referencia_id || '' };
    }
    if (!o.movimiento_id) lanzar_('C5_MOVIMIENTO_CANONICO_REQUERIDO', 409);
    var m = {};
    Object.keys(d.esquema.MAPEO_MOVIMIENTO_C5).forEach(function (k) { m[k] = o[d.esquema.MAPEO_MOVIMIENTO_C5[k]]; });
    d.esquema.CAMPOS_OBSERVACION_MOVIMIENTO_C5.forEach(function (k) { if (extra[k] !== undefined) m[k] = extra[k]; });
    return m;
  }
  lanzar_('C5_TABLA_NO_PERMITIDA', 403);
}
/** Frontera C4 -> Sheet: conservar tipos lógicos modernos y enums legacy vigentes. */
function serializarMovimientoV2ParaSheet_(fila, plan, recuperacion) {
  var d=DominioPedidoDurableC5,canon=d.plan.canonV2;
  if(!plan)lanzar_('C5_MOVIMIENTO_PLAN_REQUERIDO',409);
  d.plan.validarHashPlanSheetsV2(plan);
  var esperados=plan.movimientos.filter(function(m){return m.movimiento_id===fila.movimiento_id;});
  if(esperados.length!==1||canon(esperados[0])!==canon(fila))lanzar_('C5_MOVIMIENTO_FUERA_PLAN',409);
  var salida=['ASIGNACION_V2','SALIDA_SKU_V1'].includes(fila.tipo),devolucion=['DEVOLUCION_V2','DEVOLUCION_SKU_V1'].includes(fila.tipo);
  if(!salida&&!devolucion)lanzar_('C5_TIPO_LOGICO_INVALIDO',409);
  ['cantidad_stock','stock_anterior','stock_resultante','escala_stock_snapshot'].forEach(function(k){if(typeof fila[k]!=='number'||!Number.isFinite(fila[k]))lanzar_('C5_MOVIMIENTO_NUMERO_INVALIDO',409);});
  if((salida?fila.cantidad_stock>=0:fila.cantidad_stock<=0)||fila.stock_anterior<0||fila.stock_resultante<0||!Number.isSafeInteger(fila.escala_stock_snapshot)||fila.escala_stock_snapshot<=0||Math.abs(fila.stock_anterior+fila.cantidad_stock-fila.stock_resultante)>1e-8)lanzar_('C5_MOVIMIENTO_DELTA_INVALIDO',409);
  ['movimiento_id','operacion_id','producto_id','actor','creado_en','referencia_id','payload_hash','id_detalle_pedido','unidad_stock_snapshot'].forEach(function(k){if(typeof fila[k]!=='string'||!fila[k])lanzar_('C5_MOVIMIENTO_CAMPO_REQUERIDO',409);});
  exigirQaC5_(fila.producto_id,'PROD');
  if(!Array.isArray(fila.asignacion_ids)||!Number.isFinite(Date.parse(fila.creado_en))||fila.operacion_id!==plan.operacion_id||fila.payload_hash!==plan.payload_hash||fila.referencia_id!==plan.operacion_id)lanzar_('C5_MOVIMIENTO_IDENTIDAD_INVALIDA',409);
  if(fila.gramos_unidad_stock_snapshot!==undefined&&(![100,250,1000].includes(fila.gramos_unidad_stock_snapshot)||fila.escala_stock_snapshot!==fila.gramos_unidad_stock_snapshot))lanzar_('C5_MOVIMIENTO_BASE_INVALIDA',409);
  var r={},extra={modelo:d.esquema.MODELO_OBSERVACION_MOVIMIENTO_C5,tipo_logico_v2:fila.tipo,plan_hash:plan.plan_hash};
  Object.keys(d.esquema.MAPEO_MOVIMIENTO_C5).forEach(function(k){r[d.esquema.MAPEO_MOVIMIENTO_C5[k]]=fila[k];});
  d.esquema.CAMPOS_OBSERVACION_MOVIMIENTO_C5.forEach(function(k){if(fila[k]!==undefined)extra[k]=fila[k];});
  if(recuperacion)extra.recuperacion=recuperacion;
  r.observacion=JSON.stringify(extra);r.observaciones=r.observacion;
  r.id_movimiento=fila.movimiento_id;r.id_producto=fila.producto_id;
  r.tipo=salida?'salida':'devolucion';r.origen=plan.tipo==='CANCELAR_V2'?'cancelacion':'pedido';
  r.id_origen=plan.pedido_antes.id_pedido;r.referencia_tipo='PEDIDO_V2_QA';
  r.apertura_id=plan.contexto_snapshot.apertura_id||'';
  return r;
}
/** Validar la fila COMPLETA antes de cualquier setValues o formato. Sin promesa ACID. */
function validarFilaPersistenciaC5_(h,row,raw) {
  if(raw.length!==h.headers.length||new Set(h.headers).size!==h.headers.length)lanzar_('C5_FILA_DIMENSION_INVALIDA',409);
  var rules=h.sheet.getRange(row,1,1,h.headers.length).getDataValidations()[0];
  raw.forEach(function(v,i){
    if(typeof v==='number'&&!Number.isFinite(v)||typeof v==='string'&&v.length>49000)lanzar_('C5_CELDA_INVALIDA',409);
    var rule=rules[i];if(!rule||rule.getAllowInvalid()||v==='')return;
    if(String(rule.getCriteriaType())!=='VALUE_IN_LIST')lanzar_('C5_VALIDACION_NO_SOPORTADA_'+h.headers[i],409);
    if(!rule.getCriteriaValues()[0].includes(String(v)))lanzar_('C5_VALIDACION_RECHAZA_'+h.headers[i],409);
  });
}
function planMovimientoPersistenciaC5_(ss,id) {
  var ops=filasQaPreparacionC5_(ss,'OPERACIONES_PEDIDOS').filter(function(o){return o.operacion_id===id;});
  if(ops.length!==1)lanzar_('C5_MOVIMIENTO_DIARIO_NO_UNICO',409);
  var p=JSON.parse(ops[0].snapshot_json);DominioPedidoDurableC5.plan.validarHashPlanSheetsV2(p);
  if(p.operacion_id!==id||p.payload_hash!==ops[0].payload_hash||p.tipo!==ops[0].tipo_operacion)lanzar_('C5_MOVIMIENTO_DIARIO_INCOHERENTE',409);
  return p;
}
/** Preflight de todas las representaciones/validaciones nativas antes del primer efecto. */
function validarPlanPersistenciaC5_(ss,op) {
  var d=DominioPedidoDurableC5,p=JSON.parse(op.snapshot_json);d.plan.validarHashPlanSheetsV2(p);
  function check(tabla,fila,row){var h=leerHoja_(ss,tabla),obj=serializarFilaC5_(tabla,fila,p),raw=row?h.filas[row-2].slice():h.headers.map(function(){return '';});
    Object.keys(obj).forEach(function(k){if(h.mapa[k]===undefined)lanzar_('C5_COLUMNA_NO_EXISTE',409);raw[h.mapa[k]]=obj[k]===undefined?'':obj[k];});
    validarFilaPersistenciaC5_(h,row||h.sheet.getLastRow()+1,raw);
  }
  p.asignaciones_nuevas.forEach(function(a){check('ASIGNACIONES_PEDIDO',a);});
  p.movimientos.forEach(function(m){check('MOVIMIENTOS_STOCK',m);});
  p.saldos.forEach(function(s){var h=leerHoja_(ss,'PRODUCTOS'),i=h.filas.findIndex(function(f){return f[h.mapa.id_producto]===s.producto_id;});if(i<0)lanzar_('C5_SKU_INEXISTENTE',409);check('PRODUCTOS',d.plan.productoResultanteV2(p,s),i+2);});
  var hp=leerHoja_(ss,'PEDIDOS'),ip=hp.filas.findIndex(function(f){return f[hp.mapa.id_pedido]===p.pedido_antes.id_pedido;});if(ip<0)lanzar_('C5_PEDIDO_INEXISTENTE',409);
  check('PEDIDOS',d.plan.pedidoResultanteV2(p),ip+2);
}
function serializarFilaC5_(tabla, fila, plan) {
  var d = DominioPedidoDurableC5, r = Object.assign({}, fila);
  if (tabla === 'PEDIDOS') {
    r = { estado_pedido: fila.estado, operacion_asignacion_vigente: fila.operacion_asignacion_vigente || '',
      evidencia_estado_v2: fila.evidencia_estado_v2 ? JSON.stringify(fila.evidencia_estado_v2) : '',
      evidencia_puntero_v2: fila.evidencia_puntero_v2 ? JSON.stringify(fila.evidencia_puntero_v2) : '' };
  } else if (tabla === 'PRODUCTOS') {
    r = { stock_actual: fila.stock_actual, revision_stock_v2: fila.revision_stock_v2,
      evidencia_stock_v2: JSON.stringify(fila.evidencia_stock_v2) };
  } else if (tabla === 'MOVIMIENTOS_STOCK') {
    r = serializarMovimientoV2ParaSheet_(fila,plan);
  }
  return r;
}
/** Puerto síncrono: LockService compartido; CAS fila+recibo, flush y readback. No ACID. */
function crearPuertoDurableC5_(ss, fallo) {
  var d = DominioPedidoDurableC5, canon = d.plan.canonV2, enLock = false, utilizado = false;
  var claves = { PEDIDOS:'id_pedido', PRODUCTOS:'id_producto', OPERACIONES_PEDIDOS:'operacion_id', ASIGNACIONES_PEDIDO:'asignacion_id', MOVIMIENTOS_STOCK:'movimiento_id' };
  function leer(tabla) {
    var h = leerHoja_(ss, tabla);
    if (new Set(h.headers).size !== h.headers.length) lanzar_('C5_HEADERS_AMBIGUOS', 409);
    return h.filas.filter(function (f) { return f.some(function (v) { return v !== '' && v !== undefined; }); }).map(function (f) { return normalizarFilaC5_(tabla, filaAObjeto_(h, f)); });
  }
  function guard(fila, tabla) {
    if (!enLock) lanzar_('C5_ESCRITURA_SIN_LOCK', 423);
    if (tabla === 'PRODUCTOS') exigirQaC5_(fila.id_producto, 'PROD');
    else if (tabla === 'PEDIDOS') exigirQaC5_(fila.id_pedido, 'PED');
    else if (tabla === 'MOVIMIENTOS_STOCK' || tabla === 'ASIGNACIONES_PEDIDO') exigirQaC5_(fila.producto_id, 'PROD');
    else if (tabla === 'OPERACIONES_PEDIDOS') {
      exigirQaC5_(fila.id_pedido, 'PED');
      if (!/^OP-C4-[a-f0-9]{32}$/.test(fila.operacion_id) || !['CONFIRMAR_V2','CANCELAR_V2','REASIGNAR_V2'].includes(fila.tipo_operacion)) lanzar_('C5_DIARIO_NO_V2', 403);
      var p = JSON.parse(fila.snapshot_json);
      p.saldos.forEach(function (s) { exigirQaC5_(s.producto_id, 'PROD'); });
    } else lanzar_('C5_ESCRITURA_NO_PERMITIDA', 403);
  }
  function punto(nombre) {
    if (!utilizado && fallo === nombre) { utilizado = true; var e = new Error('C5_INTERRUPCION_QA_' + nombre); e.codigo = 503; throw e; }
  }
  function escribir(h, row, raw, nuevas) {
    Object.keys(nuevas).forEach(function (k) {
      if (h.mapa[k] === undefined) lanzar_('C5_COLUMNA_NO_EXISTE', 409);
      if (typeof nuevas[k] === 'string' && nuevas[k].length > 49000) lanzar_('C5_CELDA_EXCEDE_LIMITE', 409);
      raw[h.mapa[k]] = nuevas[k] === undefined ? '' : nuevas[k];
    });
    validarFilaPersistenciaC5_(h,row,raw);
    h.headers.forEach(function(k,i){if(typeof raw[i]==='string'&&nuevas[k]!==undefined)h.sheet.getRange(row,i+1).setNumberFormat('@');});
    h.sheet.getRange(row, 1, 1, h.headers.length).setValues([raw]); SpreadsheetApp.flush();
  }
  return {
    conLock: function (trabajo) {
      var lock = LockService.getScriptLock(); if (!lock.tryLock(30000)) lanzar_('C5_LOCK_OCUPADO', 503);
      enLock = true; try { return trabajo(); } finally { enLock = false; lock.releaseLock(); }
    }, leer: leer,
    insertar: function (tabla, fila, evento) {
      guard(fila, tabla); var k = claves[tabla];
      if(tabla==='OPERACIONES_PEDIDOS')validarPlanPersistenciaC5_(ss,fila);
      if (leer(tabla).some(function (x) { return x[k] === fila[k]; })) lanzar_('C5_APPEND_ID_DUPLICADO', 409);
      var h = leerHoja_(ss, tabla), raw = h.headers.map(function () { return ''; }), nueva = serializarFilaC5_(tabla, fila,tabla==='MOVIMIENTOS_STOCK'?planMovimientoPersistenciaC5_(ss,fila.operacion_id):undefined), row = h.sheet.getLastRow() + 1;
      escribir(h,row,raw,nueva);
      var actual = leer(tabla).filter(function (x) { return x[claves[tabla]] === fila[claves[tabla]]; });
      if (actual.length !== 1 || canon(actual[0]) !== canon(fila)) throw new d.pedido.ErrorPedidoFamilia('C5_APPEND_READBACK_INCIERTO',409);
      punto(evento);
    },
    reemplazar: function (tabla, clave, id, esperado, nuevo, evento) {
      guard(nuevo, tabla); if (tabla === 'ASIGNACIONES_PEDIDO' || tabla === 'MOVIMIENTOS_STOCK') lanzar_('C5_APPEND_ONLY', 403);
      var h = leerHoja_(ss, tabla), indices = [];
      h.filas.forEach(function (f,i) { if (filaAObjeto_(h,f)[clave] === id) indices.push(i); });
      if (indices.length !== 1 || canon(normalizarFilaC5_(tabla,filaAObjeto_(h,h.filas[indices[0]]))) !== canon(esperado)) throw new d.pedido.ErrorPedidoFamilia('C5_CAS_CONFLICTO',409);
      var row = indices[0]+2, raw = h.filas[indices[0]].slice(), formulas = h.sheet.getRange(row,1,1,h.headers.length).getFormulas()[0];
      formulas.forEach(function (f,i) { if (f) raw[i]=f; });
      punto('ANTES_' + evento); escribir(h,row,raw,serializarFilaC5_(tabla,nuevo));
      var despues = normalizarFilaC5_(tabla,filaAObjeto_(h,h.sheet.getRange(row,1,1,h.headers.length).getValues()[0]));
      if (canon(despues)!==canon(nuevo)) throw new d.pedido.ErrorPedidoFamilia('C5_CAS_READBACK_INCIERTO',409);
      punto(evento);
    }, eliminar: function () { lanzar_('C5_HISTORICO_APPEND_ONLY',403); }, punto: punto
  };
}
function obtenerBloqueosDurableC5_(ss) {
  if (!ss.getSheetByName('ASIGNACIONES_PEDIDO')) return { pedidos:[],sku:[],operaciones:[],global:false };
  var h = leerHoja_(ss,'OPERACIONES_PEDIDOS');
  return DominioPedidoDurableC5.durable.obtenerBloqueosOperativos(h.filas.map(function (f) { return normalizarFilaC5_('OPERACIONES_PEDIDOS',filaAObjeto_(h,f)); }));
}
/** Reportes operativos omiten intenciones V2 inciertas. V1 conserva exactamente su filtro. */
function operacionesMovimientoReporteC5_() {
  var ss=SpreadsheetApp.openById(SPREADSHEET_ID);if(!ss.getSheetByName('ASIGNACIONES_PEDIDO'))return [];
  return filasQaPreparacionC5_(ss,'OPERACIONES_PEDIDOS').filter(function(o){return /^(CONFIRMAR|CANCELAR|REASIGNAR)_V2$/.test(o.tipo_operacion);});
}
function movimientoCompletadoReporteC5_(m,ops) {
  if(m.referencia_tipo!=='PEDIDO_V2_QA'&&!/^OP-C4-/.test(m.id_movimiento||m.movimiento_id||''))return true;
  var candidatos=ops.filter(function(o){return o.operacion_id===m.operacion_id;});
  if(candidatos.length!==1||candidatos[0].estado_operacion!=='COMPLETADA')return false;
  try{var d=DominioPedidoDurableC5,p=JSON.parse(candidatos[0].snapshot_json);d.plan.validarHashPlanSheetsV2(p);
    var expected=p.movimientos.filter(function(x){return x.movimiento_id===m.movimiento_id;});
    return expected.length===1&&d.plan.canonV2(normalizarFilaC5_('MOVIMIENTOS_STOCK',m))===d.plan.canonV2(expected[0]);
  }catch(_){return false;}
}
/** Guardrail futuro/compartido: solo diarios V2 pendientes; sin V2 no cambia comportamiento V1. */
function exigirSinBloqueoDurableC5_(ss, pedidoId, skuIds) {
  if (!ss.getSheetByName('ASIGNACIONES_PEDIDO')) return;
  var h = leerHoja_(ss,'OPERACIONES_PEDIDOS');
  var hayV2 = h.filas.some(function (f) { var o=filaAObjeto_(h,f); return /^(CONFIRMAR|CANCELAR|REASIGNAR)_V2$/.test(o.tipo_operacion) && o.estado_operacion !== 'COMPLETADA'; });
  if (!hayV2) return;
  try { DominioPedidoDurableC5.durable.exigirRecursosLibresV2(obtenerBloqueosDurableC5_(ss),{id_pedido:pedidoId,sku:skuIds || []}); }
  catch(e){ if(e instanceof DominioPedidoDurableC5.pedido.ErrorPedidoFamilia)lanzar_(e.codigo,e.status);throw e; }
}
function appendQaC5_(ss, tabla, obj, clave) {
  var h=leerHoja_(ss,tabla), matches=h.filas.filter(function(f){return filaAObjeto_(h,f)[clave]===obj[clave];});
  Object.keys(obj).forEach(function(k){if(h.mapa[k]===undefined)lanzar_('C5_FIXTURE_COLUMNA_FALTANTE',409);});
  if(matches.length) { if(matches.length!==1) lanzar_('C5_FIXTURE_ID_DUPLICADO',409);return false; }
  var row=h.sheet.getLastRow()+1;
  h.headers.forEach(function(k,i){if(typeof obj[k]==='string')h.sheet.getRange(row,i+1).setNumberFormat('@');});
  h.sheet.getRange(row,1,1,h.headers.length).setValues([h.headers.map(function(k){return obj[k]===undefined?'':obj[k];})]);SpreadsheetApp.flush();
  var after=leerHoja_(ss,tabla), created=after.filas.filter(function(f){return filaAObjeto_(after,f)[clave]===obj[clave];});
  if(created.length!==1) lanzar_('C5_FIXTURE_APPEND_INCIERTO',409);
  Object.keys(obj).forEach(function(k){if(k in after.mapa && DominioPedidoDurableC5.plan.canonV2(filaAObjeto_(after,created[0])[k])!==DominioPedidoDurableC5.plan.canonV2(obj[k])) lanzar_('C5_FIXTURE_READBACK_INCIERTO',409);});
  return true;
}
function auditarQaC5_(ss, accion, entidad, antes, despues, referencia) {
  var campos={modelo:'AUDITORIA_QA_C5_1',antes:antes,despues:despues};
  var hash=DominioPedidoDurableC5.revision.hashRevision(campos);
  appendQaC5_(ss,'AUDITORIA_PRODUCTOS',{auditoria_id:'AUD-QA-C5-'+hash.slice(0,32),fecha_hora:new Date().toISOString(),producto_id:'',accion:accion,
    cambios_json:JSON.stringify(campos),responsable:'qa-c5',referencia_id:referencia || entidad,entidad_tipo:'QA_C5',entidad_id:entidad,payload_hash:hash,resultado_json:JSON.stringify({ok:true})},'auditoria_id');
}
/** Fixtures definidos por servidor, nunca identidad/costo/stock arbitrarios del navegador. */
function filasQaPreparacionC5_(ss,tabla){var h=leerHoja_(ss,tabla);if(new Set(h.headers).size!==h.headers.length)lanzar_('C5_HEADERS_AMBIGUOS',409);return h.filas.map(function(f){return serializarRegistroF78_(filaAObjeto_(h,f));});}
function equivalenteTextoQaC5_(actual,esperado){
  // Texto QA generado por el deploy Windows anterior; preservar bytes históricos, no corregir nombres.
  var legacy=esperado.replace(/é/g,'Ã©').replace(/ó/g,'Ã³');return actual===esperado||actual===legacy;
}
function construirPlanPreparacionC5_(ss,body){
  var grupo=body.grupo,escenario=body.escenario||'UNIDAD',id=body.id_pedido,d=DominioPedidoDurableC5;
  if(typeof grupo!=='string'||!/^[A-Z0-9-]{1,35}$/.test(grupo)||!['UNIDAD','MIXTO','INSUFICIENTE','GRANEL100','GRANEL250','GRANEL1000'].includes(escenario))lanzar_('C5_FIXTURE_INVALIDO',400);
  exigirQaC5_(id,'PED');var filas=[];
  function registrar(tabla,obj,clave){filas.push({tabla:tabla,clave:clave,esperado:obj});}
  var granel=escenario.indexOf('GRANEL')===0, base=granel?Number(escenario.slice(6)):0, familia_id='FAM-QA-C5-'+grupo, ahora=new Date().toISOString();
  var familia={familia_id:familia_id,activo:'SI',nombre_publico:granel?'Granel QA C5':'Cloro QA Económico 1 L',categoria:granel?'Granel':'Limpieza',precio_venta:granel?1350:650,
    modo_venta:granel?'GRANEL':'UNIDAD',unidad_venta:granel?'g':'unidad',permite_decimal:'NO',paso_venta:1,presentacion_publica:granel?'Granel libre QA':'Botella 1 L',
    politica_marca:granel?'NO_APLICA':'VARIABLE',version_oferta:1,actualizado_en:ahora};
  if(granel) familia.gramos_referencia=1000;else {familia.contenido_cantidad=1000;familia.contenido_unidad='ml';}
  var previa=filasQaPreparacionC5_(ss,'FAMILIAS_PRODUCTO').filter(function(f){return f.familia_id===familia_id;});
  if(previa.length>1)lanzar_('C5_FIXTURE_ID_DUPLICADO',409);
  if(previa.length && previa[0].activo!=='SI')lanzar_('FAMILIA_NO_VENDIBLE',409);
  if(previa.length && equivalenteTextoQaC5_(previa[0].nombre_publico,familia.nombre_publico))familia.nombre_publico=previa[0].nombre_publico;
  registrar('FAMILIAS_PRODUCTO',familia,'familia_id');
  if(previa.length)familia=seleccionarCamposC5_(previa[0],COLUMNAS_FAMILIAS_PRODUCTO);
  var skuIds=['A','B'].map(function(letra){return 'PROD-QA-C5-'+grupo+'-'+letra;});
  skuIds.forEach(function(sku,i){
    var b=granel?(i?1000:base):0, stock=granel?2:i?7:4;
    var obj={id_producto:sku,activo:'SI',nombre:(granel?'Granel':'Cloro')+' QA C5 '+grupo+' '+(i?'B':'A'),categoria:familia.categoria,prioridad:'media',unidad_medida:'unidad',
      permite_decimal:granel?'SI':'NO',paso_venta:granel?1/b:1,precio_costo:i?610:590,precio_venta:granel?1350:700,stock_actual:stock,stock_minimo:0,
      tipo_disponibilidad:'POR_APERTURA',modo_venta:granel?'GRANEL':'UNIDAD',familia_id:familia_id,marca:granel?'':'QA-'+(i?'B':'A'),presentacion:granel?'Granel QA base '+b+' g':'Botella 1 L',
      observaciones:JSON.stringify({modelo:'FIXTURE_C5_1',grupo:grupo,stock_inicial:stock}),actualizado_en:ahora};
    if(granel){obj.gramos_referencia=1000;obj.gramos_unidad_stock=b;}else{obj.contenido_cantidad=1000;obj.contenido_unidad='ml';}
    registrar('PRODUCTOS',obj,'id_producto');
  });
  var x='PROD-QA-C5-'+grupo+'-X';
  if(escenario==='MIXTO') {
    registrar('PRODUCTOS',{id_producto:x,activo:'SI',nombre:'SKU V1 QA C5 '+grupo,categoria:'Alimentos',prioridad:'media',unidad_medida:'unidad',permite_decimal:'NO',paso_venta:1,
      precio_costo:400,precio_venta:500,stock_actual:6,stock_minimo:0,tipo_disponibilidad:'POR_APERTURA',modo_venta:'UNIDAD',observaciones:JSON.stringify({modelo:'FIXTURE_C5_1',grupo:grupo,stock_inicial:6}),actualizado_en:ahora},'id_producto');
  }
  var ids=skuIds.concat(escenario==='MIXTO'?[x]:[]);
  ids.forEach(function(sku){registrar('APERTURA_PRODUCTOS',{apertura_id:'APE-20991231',producto_id:sku,habilitado:'SI',actualizado_por:'qa-c5',actualizado_en:ahora},'producto_id');});
  var l=d.pedido.crearDetallePedidoFamiliaV2(id,'DPE-'+id+'-F',{modelo_linea:'FAMILIA_V2',familia_id:familia_id,cantidad_solicitada:granel?150:6,unidad_solicitada:granel?'g':'unidad',version_oferta:familia.version_oferta},familia);
  var detalles=[l];
  if(escenario==='MIXTO'||escenario==='INSUFICIENTE')detalles.unshift({id_pedido:id,id_detalle_pedido:'DPE-'+id+'-V1',modelo_linea:'SKU_V1',id_producto:escenario==='MIXTO'?x:skuIds[0],cantidad:2,nombre_producto:'SKU V1 QA C5',precio_unitario:500,subtotal:1000,unidad_medida:'unidad',modo_venta:'UNIDAD'});
  // Detalles primero; cabecera recibida solo al finalizar la preparación QA. Retry no reconstruye históricos.
  detalles.forEach(function(linea){registrar('DETALLE_PEDIDOS',linea,'id_detalle_pedido');});
  registrar('PEDIDOS',{id_pedido:id,fecha_hora:ahora,canal:'QA_C5',nombre_cliente:'Fixture sintético C5',telefono:'QA-C5',total:detalles.reduce(function(n,a){return n+a.subtotal;},0),estado_pedido:'recibido',estado_pago:'pendiente',forma_pago:'efectivo_al_retirar',observaciones:'Fixture sintético C5 '+grupo,apertura_id:'APE-20991231',origen_pedido:'QA_C5'},'id_pedido');

  var apertura=validarYNormalizarApertura_({apertura_id:'APE-20991231',fecha_apertura:'2099-12-31',hora_inicio:'11:00',hora_termino:'15:00',lugar:'QA C5 sintético; no apertura comercial',cierre_pedidos_anticipados:'2099-12-30T23:59',estado_apertura:'por_confirmar',pedidos_anticipados_estado:'pausado',modo_presencial_estado:'inactivo',mensaje_publico:'',observaciones_internas:'FIXTURE_QA_C5: apertura sintética aislada, no operativa ni comercial'});
  Object.assign(apertura,{creada_por:'qa-c5',actualizada_por:'qa-c5',creado_en:ahora,actualizado_en:ahora});
  filas.unshift({tabla:'APERTURAS',clave:'apertura_id',esperado:apertura});
  return {modelo:'PREPARACION_FIXTURE_C5_2',fixture_id:id,grupo:grupo,escenario:escenario,actor:'qa-c5',timestamp:ahora,filas:filas};
}
function analizarPreparacionC5_(ss,plan){
  var d=DominioPedidoDurableC5,canon=d.plan.canonV2,pendientes=[],presentes=0;
  var sku=plan.filas.filter(function(e){return e.tabla==='PRODUCTOS';}).map(function(e){return e.esperado.id_producto;});
  exigirSinBloqueoDurableC5_(ss,plan.fixture_id,sku);
  var ops=filasQaPreparacionC5_(ss,'OPERACIONES_PEDIDOS');
  if(ops.some(function(o){return o.id_pedido===plan.fixture_id;}))lanzar_('C5_PREPARACION_EFECTOS_EXISTENTES',409);
  var asignaciones=filasQaPreparacionC5_(ss,'ASIGNACIONES_PEDIDO');
  if(asignaciones.some(function(a){return plan.filas.some(function(e){return e.tabla==='DETALLE_PEDIDOS'&&e.esperado.id_detalle_pedido===a.id_detalle_pedido;});}))lanzar_('C5_PREPARACION_EFECTOS_EXISTENTES',409);
  asignaciones.forEach(function(a){if(sku.includes(a.producto_id)&&!ops.some(function(o){return o.operacion_id===a.operacion_id&&o.estado_operacion==='COMPLETADA'&&/^PED-QA-C5-/.test(o.id_pedido);}))lanzar_('C5_PREPARACION_ASIGNACION_NO_ACREDITADA',409);});
  var movimientos=filasQaPreparacionC5_(ss,'MOVIMIENTOS_STOCK');
  if(movimientos.some(function(m){return m.referencia_id===plan.fixture_id||m.id_origen===plan.fixture_id;}))lanzar_('C5_PREPARACION_EFECTOS_EXISTENTES',409);
  // No aceptar efectos huérfanos en SKU: históricos completos de otros pedidos QA se preservan.
  movimientos.forEach(function(m){if(sku.includes(m.producto_id||m.id_producto)&&!ops.some(function(o){return o.operacion_id===(m.operacion_id||m.id_origen)&&o.estado_operacion==='COMPLETADA'&&/^PED-QA-C5-/.test(o.id_pedido);}))lanzar_('C5_PREPARACION_MOVIMIENTO_NO_ACREDITADO',409);});
  var detalleActual=filasQaPreparacionC5_(ss,'DETALLE_PEDIDOS').filter(function(l){return l.id_pedido===plan.fixture_id;});
  var detalleIds=plan.filas.filter(function(e){return e.tabla==='DETALLE_PEDIDOS';}).map(function(e){return e.esperado.id_detalle_pedido;});
  if(detalleActual.some(function(l){return !detalleIds.includes(l.id_detalle_pedido);}))lanzar_('C5_PREPARACION_DETALLE_INCOMPATIBLE',409);
  var parcialLegacy=false;
  plan.filas.forEach(function(e){
    var h=leerHoja_(ss,e.tabla),obj=e.esperado;
    Object.keys(obj).forEach(function(k){if(h.mapa[k]===undefined)lanzar_('C5_PREPARACION_COLUMNA_FALTANTE',409);});
    var matches=filasQaPreparacionC5_(ss,e.tabla).filter(function(a){return a[e.clave]===obj[e.clave]&&(e.tabla!=='APERTURA_PRODUCTOS'||a.apertura_id===obj.apertura_id);});
    if(matches.length>1)lanzar_('C5_FIXTURE_ID_DUPLICADO',409);
    if(e.tabla==='APERTURA_PRODUCTOS'&&filasQaPreparacionC5_(ss,e.tabla).some(function(a){return a.producto_id===obj.producto_id&&a.apertura_id!=='APE-20991231';}))lanzar_('C5_PREPARACION_APERTURA_INESPERADA',409);
    if(!matches.length){pendientes.push({entrada:e,insertar:true,campos:Object.keys(obj)});return;}
    presentes++;var actual=matches[0],faltantes={};
    Object.keys(obj).forEach(function(k){
      if(['actualizado_en','creado_en','fecha_hora'].includes(k)){if(!actual[k]||!Number.isFinite(Date.parse(actual[k])))lanzar_('C5_PREPARACION_FECHA_INVALIDA',409);return;}
      if(['nombre_publico','nombre_cliente','observaciones'].includes(k)&&equivalenteTextoQaC5_(actual[k],obj[k]))return;
      if(canon(actual[k])===canon(obj[k]))return;
      if(e.tabla==='PEDIDOS'&&['apertura_id','forma_pago','origen_pedido','observaciones'].includes(k)&&actual[k]===''){faltantes[k]=obj[k];parcialLegacy=true;return;}
      lanzar_('C5_PREPARACION_INCONSISTENTE_'+e.tabla+'_'+k,409);
    });
    if(e.tabla==='PEDIDOS'&&Object.keys(faltantes).length&&detalleActual.length!==detalleIds.length)lanzar_('C5_PREPARACION_PARCIAL_NO_ACREDITABLE',409);
    if(Object.keys(faltantes).length)pendientes.push({entrada:e,insertar:false,campos:Object.keys(faltantes),cambios:faltantes});
  });
  return {estado:pendientes.length?(presentes?'PARCIAL_ACREDITABLE':'AUSENTE'):'COMPLETO',fixture_c5_parcial_acreditado:parcialLegacy,pendientes:pendientes};
}
function validarCeldasPreparacionC5_(ss,entrada,campos){
  var h=leerHoja_(ss,entrada.tabla),row=h.sheet.getLastRow()+1;
  var i=h.filas.findIndex(function(f){return filaAObjeto_(h,f)[entrada.clave]===entrada.esperado[entrada.clave]&&(entrada.tabla!=='APERTURA_PRODUCTOS'||filaAObjeto_(h,f).apertura_id===entrada.esperado.apertura_id);});
  if(i>=0)row=i+2;
  var validations=h.sheet.getRange(row,1,1,h.headers.length).getDataValidations()[0];
  campos.forEach(function(k){var rule=validations[h.mapa[k]],v=entrada.esperado[k];if(!rule||rule.getAllowInvalid()||v==='')return;
    if(String(rule.getCriteriaType())!=='VALUE_IN_LIST')lanzar_('C5_PREPARACION_VALIDACION_NO_SOPORTADA',409);
    if(!rule.getCriteriaValues()[0].includes(String(v)))lanzar_('C5_PREPARACION_VALIDACION_RECHAZA_'+k,409);
  });
}
/** Plan previo en auditoría QA; faltantes acreditados, nunca descuentos ni reconstrucción histórica. */
function prepararFixtureC5_(ss,body){
  var d=DominioPedidoDurableC5,canon=d.plan.canonV2;
  // Validar input incluso cuando existe plan persistido.
  var esperado=construirPlanPreparacionC5_(ss,body),auditId='AUD-QA-C5-PREP-'+d.revision.hashRevision({id:body.id_pedido,grupo:body.grupo,escenario:body.escenario||'UNIDAD'}).slice(0,24);
  var audits=filasQaPreparacionC5_(ss,'AUDITORIA_PRODUCTOS').filter(function(a){return a.auditoria_id===auditId;});
  if(audits.length>1)lanzar_('C5_PREPARACION_DIARIO_DUPLICADO',409);
  var plan=esperado,registro;
  if(audits.length){registro=JSON.parse(audits[0].cambios_json);plan=registro.plan;if(registro.modelo!=='PREPARACION_FIXTURE_C5_2'||d.revision.hashRevision(plan)!==registro.hash_plan||audits[0].payload_hash!==registro.hash_plan||plan.fixture_id!==body.id_pedido||plan.grupo!==body.grupo||plan.escenario!==(body.escenario||'UNIDAD'))lanzar_('C5_PREPARACION_PLAN_CORRUPTO',409);}
  var analisis=analizarPreparacionC5_(ss,plan);
  analisis.pendientes.forEach(function(p){validarCeldasPreparacionC5_(ss,p.entrada,p.campos);});
  if(!registro){
    registro={modelo:'PREPARACION_FIXTURE_C5_2',estado:'PREPARADA',plan:plan,hash_plan:d.revision.hashRevision(plan),estado_anterior:analisis.estado,fixture_c5_parcial_acreditado:analisis.fixture_c5_parcial_acreditado,campos_previstos:analisis.pendientes.map(function(p){return {tabla:p.entrada.tabla,id:p.entrada.esperado[p.entrada.clave],campos:p.campos};})};
    appendQaC5_(ss,'AUDITORIA_PRODUCTOS',{auditoria_id:auditId,fecha_hora:plan.timestamp,producto_id:'',accion:'PREPARAR_FIXTURE_C5',cambios_json:JSON.stringify(registro),responsable:'qa-c5',referencia_id:plan.fixture_id,entidad_tipo:'QA_C5',entidad_id:plan.fixture_id,payload_hash:registro.hash_plan,resultado_json:''},'auditoria_id');
  }
  var cambios=0,completados=[];
  analisis.pendientes.forEach(function(p){
    var e=p.entrada;
    if(p.insertar){appendQaC5_(ss,e.tabla,e.esperado,e.clave);cambios++;}
    else{var h=leerHoja_(ss,e.tabla),i=h.filas.findIndex(function(f){return filaAObjeto_(h,f)[e.clave]===e.esperado[e.clave];});
      p.campos.forEach(function(k){if(h.filas[i][h.mapa[k]]!=='')lanzar_('C5_PREPARACION_CAS_CONFLICTO',409);h.sheet.getRange(i+2,h.mapa[k]+1).setNumberFormat('@');h.sheet.getRange(i+2,h.mapa[k]+1).setValues([[p.cambios[k]]]);cambios++;});
    }
    completados.push({tabla:e.tabla,id:e.esperado[e.clave],campos:p.campos});SpreadsheetApp.flush();
  });
  var after=analizarPreparacionC5_(ss,plan);if(after.estado!=='COMPLETO')lanzar_('C5_PREPARACION_READBACK_INCIERTO',409);
  var evidencia={fixture_id:plan.fixture_id,estado_anterior:registro.estado_anterior,estado_final:'COMPLETO',fixture_c5_parcial_acreditado:registro.fixture_c5_parcial_acreditado,campos_completados:registro.campos_previstos,hash_plan:registro.hash_plan,readback_ok:true,timestamp:plan.timestamp,actor:plan.actor};
  if(registro.estado!=='COMPLETADA'){registro.estado='COMPLETADA';registro.evidencia=evidencia;
    var h=leerHoja_(ss,'AUDITORIA_PRODUCTOS'),i=h.filas.findIndex(function(f){return filaAObjeto_(h,f).auditoria_id===auditId;});
    h.sheet.getRange(i+2,h.mapa.cambios_json+1).setValues([[JSON.stringify(registro)]]);h.sheet.getRange(i+2,h.mapa.resultado_json+1).setValues([[JSON.stringify(evidencia)]]);SpreadsheetApp.flush();
    var ver=filasQaPreparacionC5_(ss,'AUDITORIA_PRODUCTOS').filter(function(a){return a.auditoria_id===auditId;})[0];if(ver.cambios_json!==JSON.stringify(registro)||ver.resultado_json!==JSON.stringify(evidencia))lanzar_('C5_PREPARACION_EVIDENCIA_INCIERTA',409);
  }
  var result=estadoFixtureC5_(crearPuertoDurableC5_(ss),plan.fixture_id);result.preparacion=Object.assign({cambios:cambios,aplicado_en_esta_llamada:completados},evidencia);return result;
}
function estadoFixtureC5_(puerto,id) {
  exigirQaC5_(id,'PED');
  var p=puerto.leer('PEDIDOS').filter(function(x){return x.id_pedido===id;}), ds=puerto.leer('DETALLE_PEDIDOS').filter(function(x){return x.id_pedido===id;});
  if(p.length!==1) lanzar_('C5_PEDIDO_INEXISTENTE_DUPLICADO',409);
  var familias=ds.filter(function(x){return x.modelo_linea==='FAMILIA_V2';}).map(function(x){return x.familia_id;});
  var sku=puerto.leer('PRODUCTOS').filter(function(s){return familias.includes(s.familia_id)||ds.some(function(l){return l.id_producto===s.id_producto;});});
  sku.forEach(function(s){exigirQaC5_(s.id_producto,'PROD');});
  var ops=puerto.leer('OPERACIONES_PEDIDOS').filter(function(o){return o.id_pedido===id;}), opids=ops.map(function(o){return o.operacion_id;});
  return {entorno:'TEST',contrato:'C5_DURABLE_QA_1',pedido:p[0],detalles:ds,productos:sku,
    asignaciones:puerto.leer('ASIGNACIONES_PEDIDO').filter(function(a){return opids.includes(a.operacion_id);}),movimientos:puerto.leer('MOVIMIENTOS_STOCK').filter(function(m){return opids.includes(m.operacion_id);}),operaciones:ops,bloqueos:DominioPedidoDurableC5.durable.obtenerBloqueosOperativos(puerto.leer('OPERACIONES_PEDIDOS'))};
}
function actualizarQaC5_(ss,tabla,clave,id,cambios) {
  var h=leerHoja_(ss,tabla),indices=[];h.filas.forEach(function(f,i){if(filaAObjeto_(h,f)[clave]===id)indices.push(i);});
  if(indices.length!==1) lanzar_('C5_QA_IDENTIDAD_NO_UNICA',409);
  var raw=h.filas[indices[0]].slice(),antes=serializarRegistroF78_(filaAObjeto_(h,raw));
  if(Object.keys(cambios).every(function(k){return antes[k]===cambios[k];}))return false;
  Object.keys(cambios).forEach(function(k){if(h.mapa[k]===undefined)lanzar_('C5_COLUMNA_NO_EXISTE',409);raw[h.mapa[k]]=cambios[k];});
  h.sheet.getRange(indices[0]+2,1,1,h.headers.length).setValues([raw]);SpreadsheetApp.flush();
  var nuevo=serializarRegistroF78_(filaAObjeto_(h,h.sheet.getRange(indices[0]+2,1,1,h.headers.length).getValues()[0]));
  Object.keys(cambios).forEach(function(k){if(nuevo[k]!==cambios[k])lanzar_('C5_QA_READBACK_INCIERTO',409);});
  auditarQaC5_(ss,'CONFIGURAR_FIXTURE_C5',id,antes,nuevo,id);
  return true;
}
function configurarFixtureC5_(ss,body) {
  var d=DominioPedidoDurableC5, puerto=crearPuertoDurableC5_(ss), id=body.id;
  if(body.cambio==='DESACTIVAR_FAMILIA') {
    exigirQaC5_(id,'FAM');
    d.durable.exigirRecursosLibresV2(obtenerBloqueosDurableC5_(ss),{sku:puerto.leer('PRODUCTOS').filter(function(s){return s.familia_id===id;}).map(function(s){return s.id_producto;})});
    actualizarQaC5_(ss,'FAMILIAS_PRODUCTO','familia_id',id,{activo:'NO'});
  }else if(body.cambio==='INACTIVAR_SKU') {
    exigirQaC5_(id,'PROD');exigirSinBloqueoDurableC5_(ss,'',[id]);actualizarQaC5_(ss,'PRODUCTOS','id_producto',id,{activo:'NO'});
  }else if(body.cambio==='PERDER_RECIBO_STOCK_QA') {
    exigirQaC5_(id,'PROD');var s=puerto.leer('PRODUCTOS').filter(function(x){return x.id_producto===id;})[0];
    if(!s?.evidencia_stock_v2)lanzar_('C5_QA_SIN_RECIBO',409);
    var op=puerto.leer('OPERACIONES_PEDIDOS').filter(function(o){return o.operacion_id===s.evidencia_stock_v2.operacion_id;})[0];
    if(!op || op.estado_operacion!=='APLICANDO')lanzar_('C5_QA_OPERACION_NO_INTERMEDIA',409);
    exigirQaC5_(op.id_pedido,'PED');
    auditarQaC5_(ss,'QA_C5_RECIBO_ANTES_FALLO',id,s,{motivo:'Fallo QA controlado, restaurable'},op.operacion_id);
    actualizarQaC5_(ss,'PRODUCTOS','id_producto',id,{evidencia_stock_v2:''});
  }else lanzar_('C5_CONFIG_QA_NO_PERMITIDA',403);
  return {ok:true,entorno:'TEST',id:id,cambio:body.cambio};
}
function reconciliarFixtureC5_(ss,body) {
  var d=DominioPedidoDurableC5,puerto=crearPuertoDurableC5_(ss),ops=puerto.leer('OPERACIONES_PEDIDOS'),op=ops.filter(function(o){return o.operacion_id===body.operacion_id;})[0];
  if(!op || op.estado_operacion!=='REQUIERE_REVISION')lanzar_('C5_QA_REVISION_REQUERIDA',409);
  exigirQaC5_(op.id_pedido,'PED');var plan=JSON.parse(op.snapshot_json);d.plan.validarHashPlanSheetsV2(plan);
  var h=leerHoja_(ss,'AUDITORIA_PRODUCTOS'), restores=[];
  plan.saldos.forEach(function(saldo){
    exigirQaC5_(saldo.producto_id,'PROD');var actual=puerto.leer('PRODUCTOS').filter(function(s){return s.id_producto===saldo.producto_id;})[0],esperado=d.plan.productoResultanteV2(plan,saldo);
    if(d.plan.canonV2(actual)===d.plan.canonV2(saldo.antes)||d.plan.canonV2(actual)===d.plan.canonV2(esperado))return;
    var pruebas=h.filas.map(function(f){return filaAObjeto_(h,f);}).filter(function(a){return a.accion==='QA_C5_RECIBO_ANTES_FALLO'&&a.entidad_id===saldo.producto_id&&a.referencia_id===op.operacion_id;});
    if(pruebas.length!==1)lanzar_('C5_QA_AUTORIA_NO_ACREDITABLE',409);
    var prueba=JSON.parse(pruebas[0].cambios_json),sinRecibo=Object.assign({},prueba.antes);delete sinRecibo.evidencia_stock_v2;
    if(d.revision.hashRevision(prueba)!==pruebas[0].payload_hash || d.plan.canonV2(prueba.antes)!==d.plan.canonV2(esperado)||d.plan.canonV2(actual)!==d.plan.canonV2(sinRecibo))lanzar_('C5_QA_AUTORIA_NO_ACREDITABLE',409);
    restores.push({id:saldo.producto_id,recibo:JSON.stringify(esperado.evidencia_stock_v2)});
  });
  restores.forEach(function(r){actualizarQaC5_(ss,'PRODUCTOS','id_producto',r.id,{evidencia_stock_v2:r.recibo});});
  auditarQaC5_(ss,'QA_C5_RECONCILIAR',op.id_pedido,{estado:op.estado_operacion,error:op.error_codigo},{recibos:restores.map(function(x){return x.id;}),estado:'APLICANDO'},op.operacion_id);
  actualizarQaC5_(ss,'OPERACIONES_PEDIDOS','operacion_id',op.operacion_id,{estado_operacion:'APLICANDO'});
  return {entorno:'TEST',reconciliada:op.operacion_id,recibos_restaurados:restores.length};
}
/** Recuperación autorizada del prefijo v23. No borra filas ni aplica inventario. */
function recuperarMovimientoParcialC5_(ss,body) {
  var d=DominioPedidoDurableC5,canon=d.plan.canonV2,puerto=crearPuertoDurableC5_(ss);
  var id='OP-C4-bde46db073f83e4dd1bb7f37ac6c7f6f',key='qa_c5_eco_confirmar';
  if(body.operacion_id!==id||body.idempotency_key!==key)lanzar_('C5_RECOVERY_FUERA_ALCANCE',403);
  var ops=puerto.leer('OPERACIONES_PEDIDOS'),matches=ops.filter(function(o){return o.operacion_id===id||o.idempotency_key===key;});
  if(matches.length!==1)lanzar_('C5_RECOVERY_DIARIO_AMBIGUO',409);
  var op=matches[0],p=JSON.parse(op.snapshot_json);d.plan.validarHashPlanSheetsV2(p);
  if(op.estado_operacion!=='APLICANDO'||op.paso!==2||op.id_pedido!=='PED-QA-C5-ECO-PRINCIPAL'||op.tipo_operacion!=='CONFIRMAR_V2'||op.actor!=='qa-c5'||op.resultado_json!==''||op.error_codigo||p.operacion_id!==id||p.idempotency_key!==key||p.payload_hash!==op.payload_hash||p.creado_en!==op.creado_en||p.tipo!==op.tipo_operacion||p.actor!==op.actor)lanzar_('C5_RECOVERY_PLAN_INCOHERENTE',409);
  if(p.plan_hash!=='2725af3817e762bfa48116bd2282c9205311688a0a3da1f16e9cba376dc6f3d9'||p.movimientos.length!==2||p.asignaciones_nuevas.length!==2||p.saldos.length!==2)lanzar_('C5_RECOVERY_PLAN_NO_ACREDITADO',409);
  d.durable.exigirRecursosLibresV2(d.durable.obtenerBloqueosOperativos(ops,id),{id_pedido:op.id_pedido,sku:p.saldos.map(function(s){return s.producto_id;})});
  var esperadoPedido=p.pedido_antes,actualPedido=puerto.leer('PEDIDOS').filter(function(x){return x.id_pedido===op.id_pedido;});
  if(actualPedido.length!==1||canon(actualPedido[0])!==canon(esperadoPedido)||esperadoPedido.estado!=='recibido'||esperadoPedido.contexto_apertura_snapshot.apertura_id!=='APE-20991231')lanzar_('C5_RECOVERY_PEDIDO_CAMBIO',409);
  var cab=filasQaPreparacionC5_(ss,'PEDIDOS').filter(function(x){return x.id_pedido===op.id_pedido;})[0];
  if(cab.canal!=='QA_C5'||cab.telefono!=='QA-C5'||cab.total!==3900||!equivalenteTextoQaC5_(cab.nombre_cliente,'Fixture sintético C5'))lanzar_('C5_RECOVERY_PEDIDO_NO_QA',409);
  if(canon(puerto.leer('DETALLE_PEDIDOS').filter(function(l){return l.id_pedido===op.id_pedido;}))!==canon(p.detalles))lanzar_('C5_RECOVERY_DETALLE_CAMBIO',409);
  var as=puerto.leer('ASIGNACIONES_PEDIDO').filter(function(a){return a.operacion_id===id||p.asignaciones_nuevas.some(function(e){return e.asignacion_id===a.asignacion_id;});});
  if(as.length!==2||p.asignaciones_nuevas.some(function(e){return as.filter(function(a){return canon(a)===canon(e);}).length!==1;}))lanzar_('C5_RECOVERY_ASIGNACION_CAMBIO',409);
  p.saldos.forEach(function(s){exigirQaC5_(s.producto_id,'PROD');var sku=puerto.leer('PRODUCTOS').filter(function(a){return a.id_producto===s.producto_id;});if(sku.length!==1||canon(sku[0])!==canon(s.antes))lanzar_('C5_RECOVERY_STOCK_CAMBIO',409);});
  var h=leerHoja_(ss,'MOVIMIENTOS_STOCK'),m=p.movimientos[0],indices=[];
  h.filas.forEach(function(f,i){var r=filaAObjeto_(h,f);if(r.id_movimiento===m.movimiento_id||r.movimiento_id===m.movimiento_id)indices.push(i);
    if((r.operacion_id===id||r.referencia_id===id||r.id_origen===id||p.movimientos.some(function(e){return e.movimiento_id===r.id_movimiento||e.movimiento_id===r.movimiento_id;}))&&r.id_movimiento!==m.movimiento_id)lanzar_('C5_RECOVERY_MOVIMIENTO_INESPERADO',409);
  });
  if(indices.length!==1)lanzar_('C5_RECOVERY_MOVIMIENTO_NO_UNICO',409);
  var index=indices[0],raw=h.filas[index].slice(),obj=serializarRegistroF78_(filaAObjeto_(h,raw));
  var auditId='AUD-QA-C5-REC-M0-'+id.slice(6),evidencia={modelo:'MOVIMIENTO_V2_PARCIAL_ACREDITADO',operacion_id:id,movimiento_id:m.movimiento_id,plan_hash:p.plan_hash,actor:'qa-c5',fecha_original:m.creado_en};
  var serial=serializarMovimientoV2ParaSheet_(m,p,evidencia),row=h.headers.map(function(k){return serial[k]===undefined?'':serial[k];});
  var completo=canon(raw)===canon(row),parcial=raw.every(function(v,i){return h.headers[i]==='id_movimiento'?v===m.movimiento_id:h.headers[i]==='fecha_hora'?String(obj.fecha_hora)===m.creado_en:v==='';});
  if(!completo&&!parcial)lanzar_('C5_RECOVERY_PREFIJO_NO_ACREDITABLE',409);
  var audits=filasQaPreparacionC5_(ss,'AUDITORIA_PRODUCTOS').filter(function(a){return a.auditoria_id===auditId;});
  var prueba={modelo:'RECOVERY_MOVIMIENTO_C5_1',clasificacion:'MOVIMIENTO_V2_PARCIAL_ACREDITADO',operacion_id:id,plan_hash:p.plan_hash,antes:{id_movimiento:m.movimiento_id,fecha_hora:m.creado_en},fila_serializada:serial};
  var hash=d.revision.hashRevision(prueba);
  if(audits.length>1||audits.length===1&&(audits[0].payload_hash!==hash||audits[0].cambios_json!==JSON.stringify(prueba))||completo&&audits.length!==1)lanzar_('C5_RECOVERY_AUDITORIA_INCOHERENTE',409);
  validarFilaPersistenciaC5_(h,index+2,row);validarPlanPersistenciaC5_(ss,op);
  if(!audits.length)appendQaC5_(ss,'AUDITORIA_PRODUCTOS',{auditoria_id:auditId,fecha_hora:new Date().toISOString(),producto_id:'',accion:'RECUPERAR_MOVIMIENTO_PARCIAL_C5',cambios_json:JSON.stringify(prueba),responsable:'qa-c5',referencia_id:id,entidad_tipo:'QA_C5',entidad_id:m.movimiento_id,payload_hash:hash,resultado_json:''},'auditoria_id');
  if(!completo){
    if(canon(h.sheet.getRange(index+2,1,1,h.headers.length).getValues()[0])!==canon(raw))lanzar_('C5_RECOVERY_CAS_CONFLICTO',409);
    h.headers.forEach(function(k,i){if(typeof row[i]==='string')h.sheet.getRange(index+2,i+1).setNumberFormat('@');});
    h.sheet.getRange(index+2,1,1,h.headers.length).setValues([row]);SpreadsheetApp.flush();
  }
  var after=h.sheet.getRange(index+2,1,1,h.headers.length).getValues()[0];
  if(canon(after)!==canon(row)||canon(normalizarFilaC5_('MOVIMIENTOS_STOCK',filaAObjeto_(h,after)))!==canon(m))lanzar_('C5_RECOVERY_READBACK_INCIERTO',409);
  var resultado={entorno:'TEST',clasificacion:'MOVIMIENTO_V2_PARCIAL_ACREDITADO',operacion_id:id,movimiento_id:m.movimiento_id,plan_hash:p.plan_hash,hash_evidencia:hash,readback_ok:true,stock_modificado:false};
  var auditActual=filasQaPreparacionC5_(ss,'AUDITORIA_PRODUCTOS').filter(function(a){return a.auditoria_id===auditId;})[0];
  if(auditActual.resultado_json!==JSON.stringify(resultado))actualizarQaC5_(ss,'AUDITORIA_PRODUCTOS','auditoria_id',auditId,{resultado_json:JSON.stringify(resultado)});
  return Object.assign({cambios:completo?0:1},resultado);
}
function cleanupFixturesC5_(ss) {
  var d=DominioPedidoDurableC5,puerto=crearPuertoDurableC5_(ss),bloqueos=obtenerBloqueosDurableC5_(ss);
  if(bloqueos.global || bloqueos.operaciones.length)lanzar_('C5_CLEANUP_OPERACION_INCOMPLETA',423);
  var h=leerHoja_(ss,'PRODUCTOS'),sku=h.filas.map(function(f){return filaAObjeto_(h,f);}).filter(function(s){return /^PROD-QA-C5-/.test(s.id_producto);});
  sku.forEach(function(s){exigirQaC5_(s.id_producto,'PROD');var m=JSON.parse(s.observaciones);if(m.modelo!=='FIXTURE_C5_1'||s.stock_actual!==m.stock_inicial)lanzar_('C5_CLEANUP_STOCK_NO_RESTAURADO',409);});
  var pedidosQa=filasQaPreparacionC5_(ss,'PEDIDOS').filter(function(p){return /^PED-QA-C5-/.test(p.id_pedido);});
  if(pedidosQa.some(function(p){return p.estado_pedido!=='cancelado';}))lanzar_('C5_CLEANUP_PEDIDO_NO_CANCELADO',409);
  var aperturasQa=filasQaPreparacionC5_(ss,'APERTURAS').filter(function(a){return a.apertura_id==='APE-20991231';});
  if(aperturasQa.length!==1||aperturasQa[0].creada_por!=='qa-c5'||!/^FIXTURE_QA_C5:/.test(aperturasQa[0].observaciones_internas))lanzar_('C5_CLEANUP_APERTURA_NO_QA',409);
  var relacionesQa=filasQaPreparacionC5_(ss,'APERTURA_PRODUCTOS').filter(function(a){return /^PROD-QA-C5-/.test(a.producto_id);});
  if(relacionesQa.some(function(a){return a.apertura_id!=='APE-20991231';}))lanzar_('C5_CLEANUP_APERTURA_INESPERADA',409);
  // No reconstruir stock: confirmar/cancelar deben haberlo restituido con evidencia durable.
  var cambios=0;sku.forEach(function(s){if(s.activo!=='NO'){actualizarQaC5_(ss,'PRODUCTOS','id_producto',s.id_producto,{activo:'NO'});cambios++;}});
  puerto.leer('FAMILIAS_PRODUCTO').filter(function(f){return /^FAM-QA-C5-/.test(f.familia_id);}).forEach(function(f){exigirQaC5_(f.familia_id,'FAM');if(f.activo!=='NO'){actualizarQaC5_(ss,'FAMILIAS_PRODUCTO','familia_id',f.familia_id,{activo:'NO'});cambios++;}});
  relacionesQa.forEach(function(a){if(a.habilitado!=='NO'){actualizarQaC5_(ss,'APERTURA_PRODUCTOS','producto_id',a.producto_id,{habilitado:'NO'});cambios++;}});
  if(aperturasQa[0].estado_apertura!=='cancelada'){actualizarQaC5_(ss,'APERTURAS','apertura_id','APE-20991231',{estado_apertura:'cancelada',pedidos_anticipados_estado:'cerrado',modo_presencial_estado:'cerrado'});cambios++;}
  return {entorno:'TEST',cambios:cambios,sku_qa:sku.length,apertura_qa_cancelada:true,habilitaciones_qa_desactivadas:true,pedidos_qa_cancelados:pedidosQa.length,evidencia_conservada:true,stock_qa_restaurado:true};
}
function ejecutarAccionDurableC5Test_(accion,body) {
  var ss=destinoDurableC5_(),d=DominioPedidoDurableC5;
  var fallos=['PREPARADA','APLICANDO','ASIGNACION_1','ASIGNACION_2','MOVIMIENTO_1','MOVIMIENTO_2','ANTES_STOCK_1','STOCK_1','STOCK_2','ANTES_ESTADO_PEDIDO','ESTADO_PEDIDO','PUNTERO_VIGENTE','ANTES_READBACK','DESPUES_READBACK','COMPLETADA'];
  if(body.fallo_punto && !fallos.includes(body.fallo_punto))lanzar_('C5_FALLO_QA_INVALIDO',400);
  var puerto=crearPuertoDurableC5_(ss,body.fallo_punto),input;
  try {
    if(['confirmarPedidoV2Test','cancelarPedidoV2Test','reasignarPedidoV2Test'].includes(accion)) {
      exigirQaC5_(body.id_pedido,'PED');(body.asignaciones||[]).forEach(function(r){r.selecciones.forEach(function(s){exigirQaC5_(s.producto_id,'PROD');});});
      input={id_pedido:body.id_pedido,actor:'qa-c5',idempotency_key:body.idempotency_key,estado_esperado:body.estado_esperado,apertura_id_esperada:body.apertura_id_esperada,asignaciones:body.asignaciones||[]};
      var fn=accion==='confirmarPedidoV2Test'?'confirmarPedidoV2Durable':accion==='cancelarPedidoV2Test'?'cancelarPedidoV2Durable':'reasignarPedidoV2Durable';
      return d.durable[fn](puerto,input,{ahora:function(){return new Date().toISOString();}});
    }
    return puerto.conLock(function(){
      if(accion==='prepararFixturePedidoV2Test')return prepararFixtureC5_(ss,body);
      if(accion==='configurarFixtureC5Test')return configurarFixtureC5_(ss,body);
      if(accion==='reconciliarFixtureC5Test')return reconciliarFixtureC5_(ss,body);
      if(accion==='recuperarMovimientoParcialC5Test')return recuperarMovimientoParcialC5_(ss,body);
      if(accion==='cleanupFixturesC5Test')return cleanupFixturesC5_(ss);
      if(accion==='obtenerAsignacionesPedidoV2Test')return estadoFixtureC5_(puerto,body.id_pedido);
      var op=puerto.leer('OPERACIONES_PEDIDOS').filter(function(o){return o.operacion_id===body.operacion_id;});
      if(op.length!==1)lanzar_('C5_DIARIO_NO_UNICO',409);exigirQaC5_(op[0].id_pedido,'PED');
      if(accion==='obtenerOperacionV2Test')return {entorno:'TEST',operacion:op[0]};
      if(accion==='verificarOperacionV2Test')return d.durable.verificarOperacionV2(puerto,body.operacion_id);
      lanzar_('C5_ACCION_NO_PERMITIDA',403);
    });
  }catch(e){if(e instanceof d.pedido.ErrorPedidoFamilia)lanzar_(e.codigo,e.status);throw e;}
}
