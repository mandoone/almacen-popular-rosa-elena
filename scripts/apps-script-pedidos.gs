/**
 * apps-script-pedidos.gs
 * ------------------------------------------------------------------------------
 * Web App de Google Apps Script para PEDIDOS REALES del Almacen Popular Rosa Elena
 * Morales, sobre la base operativa BD_WEB_ALMACEN_ROSA_ELENA_MORALES.
 *
 * Acciones:
 *   POST publico:        crearPedido
 *   GET  con token:      listarPedidos, obtenerPedido
 *   POST con token:      actualizarEstadoPedido, cancelarPedido
 *
 * IMPORTANTE:
 *   - SPREADSHEET_ID y ADMIN_TOKEN se editan a mano en Apps Script antes de
 *     desplegar. NO commitear valores reales.
 *   - La URL de la Web App y el token NO se guardan en el repo.
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
  PEDIDOS: 'PEDIDOS',
  DETALLE_PEDIDOS: 'DETALLE_PEDIDOS',
  MOVIMIENTOS_STOCK: 'MOVIMIENTOS_STOCK'
};

var CANAL_WEB = 'web';

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
        return jsonOk_({ productos: listarProductos_() });
      case 'listarPedidos':
        exigirToken_(params.token);
        return jsonOk_({ pedidos: listarPedidos_() });
      case 'obtenerPedido':
        exigirToken_(params.token);
        return jsonOk_(obtenerPedido_(params.id_pedido));
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
      case 'actualizarEstadoPedido':
        exigirToken_(body.token);
        return jsonOk_(actualizarEstadoPedido_(body));
      case 'cancelarPedido':
        exigirToken_(body.token);
        return jsonOk_(cancelarPedido_(body));
      default:
        return jsonError_('Accion POST no reconocida: "' + action + '".', 400);
    }
  } catch (err) {
    return jsonError_(err.message || String(err), err.codigo || 500);
  }
}

// ============================== ACCIONES =======================================

/**
 * Crea un pedido real. Precios y validaciones SIEMPRE desde PRODUCTOS (no se
 * confia en los precios enviados por el frontend). Usa LockService para evitar
 * condiciones de carrera de stock.
 */
function crearPedido_(body) {
  var nombreCliente = limpiar_(body.nombre_cliente);
  var telefono = limpiar_(body.telefono);
  var formaPago = limpiar_(body.forma_pago);
  var observaciones = limpiar_(body.observaciones);
  var carrito = body.carrito;

  if (!nombreCliente) lanzar_('Falta nombre_cliente.', 400);
  if (!telefono) lanzar_('Falta telefono.', 400);
  if (!carrito || !carrito.length) lanzar_('El carrito esta vacio.', 400);

  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // hasta 30s esperando el turno
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var prod = leerHoja_(ss, HOJAS.PRODUCTOS);

    var cId = col_(prod, 'id_producto');
    var cActivo = col_(prod, 'activo');
    var cNombre = col_(prod, 'nombre');
    var cUnidad = col_(prod, 'unidad_medida');
    var cDecimal = col_(prod, 'permite_decimal');
    var cPrecio = col_(prod, 'precio_venta');
    var cStock = col_(prod, 'stock_actual');

    // Indexar productos por id para acceso rapido.
    var indicePorId = {};
    for (var i = 0; i < prod.filas.length; i++) {
      var idP = limpiar_(prod.filas[i][cId]);
      if (idP) indicePorId[idP] = i;
    }

    // Validar items y preparar lineas (precio desde la hoja).
    var lineas = [];
    var total = 0;
    for (var k = 0; k < carrito.length; k++) {
      var item = carrito[k] || {};
      var idProd = limpiar_(item.id_producto);
      var cant = parseNum_(item.cantidad);

      if (!idProd) lanzar_('Item ' + (k + 1) + ': falta id_producto.', 400);
      if (!(cant > 0)) lanzar_('Item "' + idProd + '": cantidad invalida.', 400);

      var fi = indicePorId[idProd];
      if (fi === undefined) lanzar_('Producto no existe: "' + idProd + '".', 400);

      var fila = prod.filas[fi];
      if (String(fila[cActivo]).toUpperCase() !== 'SI') {
        lanzar_('Producto inactivo: "' + idProd + '".', 400);
      }

      var permiteDecimal = String(fila[cDecimal]).toUpperCase() === 'SI';
      if (!permiteDecimal && Math.floor(cant) !== cant) {
        lanzar_('Producto "' + idProd + '" no permite decimales (cantidad ' + cant + ').', 400);
      }

      var stockActual = parseNum_(fila[cStock]);
      if (cant > stockActual) {
        lanzar_('Stock insuficiente de "' + idProd + '": disponible ' + stockActual +
          ', solicitado ' + cant + '.', 409);
      }

      var precio = parseNum_(fila[cPrecio]);
      var subtotal = redondear2_(precio * cant);
      total += subtotal;

      lineas.push({
        filaProducto: fi,
        id_producto: idProd,
        nombre_producto: limpiar_(fila[cNombre]),
        unidad_medida: limpiar_(fila[cUnidad]),
        cantidad: cant,
        precio_unitario: precio,
        subtotal: subtotal,
        stock_anterior: stockActual,
        stock_resultante: redondear2_(stockActual - cant)
      });
    }
    total = redondear2_(total);

    var ahora = new Date();
    var idPedido = generarId_('PED', ahora);

    // 1) Escribir cabecera en PEDIDOS.
    var ped = leerHoja_(ss, HOJAS.PEDIDOS);
    agregarFila_(ped, {
      id_pedido: idPedido,
      fecha_hora: marca_(ahora),
      canal: CANAL_WEB,
      id_cliente: '',
      nombre_cliente: nombreCliente,
      telefono: telefono,
      total: total,
      estado_pedido: 'pendiente',
      estado_pago: 'pendiente',
      forma_pago: formaPago,
      observaciones: observaciones,
      vendedor_admin: '',
      fecha_entrega: ''
    });

    // 2) Escribir lineas en DETALLE_PEDIDOS.
    var det = leerHoja_(ss, HOJAS.DETALLE_PEDIDOS);
    for (var d = 0; d < lineas.length; d++) {
      var ln = lineas[d];
      agregarFila_(det, {
        id_pedido: idPedido,
        id_producto: ln.id_producto,
        nombre_producto: ln.nombre_producto,
        cantidad: ln.cantidad,
        unidad_medida: ln.unidad_medida,
        precio_unitario: ln.precio_unitario,
        subtotal: ln.subtotal
      });
    }

    // 3) Descontar stock en PRODUCTOS + 4) registrar MOVIMIENTOS_STOCK.
    var mov = leerHoja_(ss, HOJAS.MOVIMIENTOS_STOCK);
    for (var s = 0; s < lineas.length; s++) {
      var l = lineas[s];
      // Fila real en la hoja = indice de datos + 2 (encabezado en fila 1).
      prod.sheet.getRange(l.filaProducto + 2, cStock + 1).setValue(l.stock_resultante);
      registrarMovimiento_(mov, {
        tipo: 'salida',
        origen: 'pedido',
        id_origen: idPedido,
        id_producto: l.id_producto,
        cantidad: -l.cantidad,
        stock_anterior: l.stock_anterior,
        stock_resultante: l.stock_resultante,
        usuario: 'web',
        observaciones: 'Pedido web ' + idPedido,
        ahora: ahora
      });
    }

    SpreadsheetApp.flush();

    return {
      id_pedido: idPedido,
      total: total,
      estado_pedido: 'pendiente',
      items: lineas.length,
      resumen: lineas.map(function (l) {
        return {
          id_producto: l.id_producto,
          nombre_producto: l.nombre_producto,
          cantidad: l.cantidad,
          precio_unitario: l.precio_unitario,
          subtotal: l.subtotal
        };
      })
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Catalogo publico para la tienda: productos con activo = SI, en el orden de la
 * hoja PRODUCTOS. NO expone precio_costo ni margen_pct.
 */
function listarProductos_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var prod = leerHoja_(ss, HOJAS.PRODUCTOS);

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

    productos.push({
      id_producto: idProd,
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

/**
 * Actualiza estado_pedido (y estado_pago opcional). No toca stock.
 */
function actualizarEstadoPedido_(body) {
  var idPedido = limpiar_(body.id_pedido);
  var estadoPedido = limpiar_(body.estado_pedido);
  var estadoPago = (body.estado_pago === undefined) ? null : limpiar_(body.estado_pago);

  if (!idPedido) lanzar_('Falta id_pedido.', 400);
  if (!estadoPedido) lanzar_('Falta estado_pedido.', 400);

  var estadosValidos = ['pendiente', 'listo', 'entregado', 'cancelado'];
  if (estadosValidos.indexOf(estadoPedido) === -1) {
    lanzar_('estado_pedido invalido: "' + estadoPedido + '".', 400);
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var ped = leerHoja_(ss, HOJAS.PEDIDOS);
  var cPed = col_(ped, 'id_pedido');
  var cEstado = col_(ped, 'estado_pedido');
  var cPago = col_(ped, 'estado_pago');

  var fila = buscarFila_(ped, cPed, idPedido);
  if (fila === -1) lanzar_('Pedido no encontrado: "' + idPedido + '".', 404);

  ped.sheet.getRange(fila + 2, cEstado + 1).setValue(estadoPedido);
  if (estadoPago !== null && estadoPago !== '') {
    ped.sheet.getRange(fila + 2, cPago + 1).setValue(estadoPago);
  }
  SpreadsheetApp.flush();

  return { id_pedido: idPedido, estado_pedido: estadoPedido,
    estado_pago: (estadoPago !== null ? estadoPago : undefined) };
}

/**
 * Cancela un pedido y DEVUELVE el stock de cada item del detalle.
 * Idempotente: si ya estaba cancelado, no vuelve a tocar el stock.
 */
function cancelarPedido_(body) {
  var idPedido = limpiar_(body.id_pedido);
  if (!idPedido) lanzar_('Falta id_pedido.', 400);

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var ped = leerHoja_(ss, HOJAS.PEDIDOS);
    var cPed = col_(ped, 'id_pedido');
    var cEstado = col_(ped, 'estado_pedido');

    var fila = buscarFila_(ped, cPed, idPedido);
    if (fila === -1) lanzar_('Pedido no encontrado: "' + idPedido + '".', 404);

    var estadoActual = limpiar_(ped.filas[fila][cEstado]);
    if (estadoActual === 'cancelado') {
      return { id_pedido: idPedido, estado_pedido: 'cancelado', ya_cancelado: true };
    }

    // Marcar cancelado.
    ped.sheet.getRange(fila + 2, cEstado + 1).setValue('cancelado');

    // Devolver stock por cada linea del detalle.
    var det = leerHoja_(ss, HOJAS.DETALLE_PEDIDOS);
    var cDetPed = col_(det, 'id_pedido');
    var cDetProd = col_(det, 'id_producto');
    var cDetCant = col_(det, 'cantidad');

    var prod = leerHoja_(ss, HOJAS.PRODUCTOS);
    var cProdId = col_(prod, 'id_producto');
    var cProdStock = col_(prod, 'stock_actual');
    var indicePorId = {};
    for (var p = 0; p < prod.filas.length; p++) {
      var idp = limpiar_(prod.filas[p][cProdId]);
      if (idp) indicePorId[idp] = p;
    }

    var mov = leerHoja_(ss, HOJAS.MOVIMIENTOS_STOCK);
    var ahora = new Date();
    var devoluciones = 0;

    for (var j = 0; j < det.filas.length; j++) {
      if (limpiar_(det.filas[j][cDetPed]) !== idPedido) continue;
      var idProd = limpiar_(det.filas[j][cDetProd]);
      var cant = parseNum_(det.filas[j][cDetCant]);
      var fi = indicePorId[idProd];
      if (fi === undefined) continue; // producto ya no existe: se omite

      var stockAnterior = parseNum_(prod.filas[fi][cProdStock]);
      var stockResultante = redondear2_(stockAnterior + cant);
      prod.sheet.getRange(fi + 2, cProdStock + 1).setValue(stockResultante);
      // Actualizar copia en memoria por si el mismo producto aparece dos veces.
      prod.filas[fi][cProdStock] = stockResultante;

      registrarMovimiento_(mov, {
        tipo: 'devolucion',
        origen: 'cancelacion',
        id_origen: idPedido,
        id_producto: idProd,
        cantidad: cant,
        stock_anterior: stockAnterior,
        stock_resultante: stockResultante,
        usuario: 'admin',
        observaciones: 'Cancelacion pedido ' + idPedido,
        ahora: ahora
      });
      devoluciones++;
    }

    SpreadsheetApp.flush();
    return { id_pedido: idPedido, estado_pedido: 'cancelado', items_devueltos: devoluciones };
  } finally {
    lock.releaseLock();
  }
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

/**
 * Registra un movimiento de stock generando id_movimiento.
 */
function registrarMovimiento_(movHoja, m) {
  agregarFila_(movHoja, {
    id_movimiento: generarId_('MOV', m.ahora),
    fecha_hora: marca_(m.ahora),
    tipo: m.tipo,
    origen: m.origen,
    id_origen: m.id_origen,
    id_producto: m.id_producto,
    cantidad: m.cantidad,
    stock_anterior: m.stock_anterior,
    stock_resultante: m.stock_resultante,
    usuario: m.usuario,
    observaciones: m.observaciones
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

/**
 * Marca de tiempo legible (yyyy-MM-dd HH:mm:ss).
 */
function marca_(fecha) {
  var tz = Session.getScriptTimeZone() || 'America/Santiago';
  return Utilities.formatDate(fecha, tz, 'yyyy-MM-dd HH:mm:ss');
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
