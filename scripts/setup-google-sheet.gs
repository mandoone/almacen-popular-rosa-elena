/**
 * setup-google-sheet.gs
 * ------------------------------------------------------------------------------
 * Crea la base de datos operativa del sistema web del
 * Almacen Popular Rosa Elena Morales en una Google Sheet nueva y exclusiva.
 *
 * USO (ver docs/GOOGLE_SHEET_SETUP.md):
 *   1. Abrir https://script.google.com/ y crear un proyecto nuevo.
 *   2. Pegar TODO el contenido de este archivo.
 *   3. Ejecutar la funcion crearBaseDatosAlmacen().
 *   4. Autorizar permisos cuando lo solicite.
 *   5. Copiar la URL y el ID de la planilla desde el registro (Ver > Registros).
 *
 * No requiere credenciales ni secretos. Se ejecuta una sola vez.
 * Si se ejecuta de nuevo, crea OTRA planilla nueva (no modifica la anterior).
 * ------------------------------------------------------------------------------
 */

var NOMBRE_PLANILLA = 'BD_WEB_ALMACEN_ROSA_ELENA_MORALES';

/**
 * Definicion de cada hoja: nombre + encabezados (fila 1).
 * El orden de este arreglo es el orden en que se crean las pestanas.
 */
var HOJAS = [
  {
    nombre: 'CONFIG',
    encabezados: ['clave', 'valor', 'descripcion', 'actualizado_en']
  },
  {
    nombre: 'PRODUCTOS',
    encabezados: [
      'id_producto', 'activo', 'nombre', 'categoria', 'prioridad',
      'unidad_medida', 'permite_decimal', 'paso_venta', 'precio_costo',
      'margen_pct', 'precio_venta', 'stock_actual', 'stock_minimo',
      'imagen_url', 'observaciones', 'actualizado_en'
    ]
  },
  {
    nombre: 'CLIENTES',
    encabezados: [
      'id_cliente', 'nombre', 'telefono', 'direccion_sector', 'observaciones',
      'fecha_creacion', 'ultima_compra', 'total_compras', 'activo'
    ]
  },
  {
    nombre: 'PEDIDOS',
    encabezados: [
      'id_pedido', 'fecha_hora', 'canal', 'id_cliente', 'nombre_cliente',
      'telefono', 'total', 'estado_pedido', 'estado_pago', 'forma_pago',
      'observaciones', 'vendedor_admin', 'fecha_entrega'
    ]
  },
  {
    nombre: 'DETALLE_PEDIDOS',
    encabezados: [
      'id_pedido', 'id_producto', 'nombre_producto', 'cantidad',
      'unidad_medida', 'precio_unitario', 'subtotal'
    ]
  },
  {
    nombre: 'VENTAS',
    encabezados: [
      'id_venta', 'fecha_hora', 'canal', 'id_cliente', 'nombre_cliente',
      'telefono', 'total', 'forma_pago', 'estado_pago', 'vendedor',
      'observaciones'
    ]
  },
  {
    nombre: 'DETALLE_VENTAS',
    encabezados: [
      'id_venta', 'id_producto', 'nombre_producto', 'cantidad',
      'unidad_medida', 'precio_unitario', 'subtotal'
    ]
  },
  {
    nombre: 'COMPRAS',
    encabezados: [
      'id_compra', 'fecha', 'proveedor', 'responsable', 'total_compra',
      'observaciones'
    ]
  },
  {
    nombre: 'DETALLE_COMPRAS',
    encabezados: [
      'id_compra', 'id_producto', 'nombre_producto', 'cantidad_comprada',
      'unidad_medida', 'precio_costo_unitario', 'subtotal', 'nuevo_precio_venta'
    ]
  },
  {
    nombre: 'MOVIMIENTOS_STOCK',
    encabezados: [
      'id_movimiento', 'fecha_hora', 'tipo', 'origen', 'id_origen',
      'id_producto', 'cantidad', 'stock_anterior', 'stock_resultante',
      'usuario', 'observaciones'
    ]
  }
];

/**
 * Validaciones de lista desplegable por hoja.
 * Cada entrada aplica una lista de valores permitidos a TODA la columna
 * (desde la fila 2 hacia abajo) de la columna cuyo encabezado coincide.
 */
var VALIDACIONES = {
  PRODUCTOS: {
    activo: ['SI', 'NO'],
    prioridad: ['alta', 'media', 'baja'],
    unidad_medida: ['unidad', 'kg', 'litro', 'pack'],
    permite_decimal: ['SI', 'NO']
  },
  PEDIDOS: {
    estado_pedido: ['pendiente', 'listo', 'entregado', 'cancelado'],
    estado_pago: ['pendiente', 'pagado_transferencia', 'pagado_efectivo', 'anulado'],
    forma_pago: ['transferencia', 'efectivo_al_retirar']
  },
  VENTAS: {
    forma_pago: ['efectivo', 'transferencia'],
    estado_pago: ['pagado', 'pendiente']
  },
  MOVIMIENTOS_STOCK: {
    tipo: ['entrada', 'salida', 'ajuste', 'devolucion'],
    origen: ['pedido', 'venta', 'compra', 'ajuste', 'cancelacion']
  }
};

/**
 * Valores iniciales para la hoja CONFIG.
 * NO incluir secretos reales aqui: estos son marcadores para completar a mano
 * en la planilla una vez creada.
 * Filas: [clave, valor, descripcion, actualizado_en]
 */
function valoresConfigIniciales(ahora) {
  return [
    ['whatsapp_pedidos',    '', 'Numero WhatsApp que recibe los pedidos (formato 569XXXXXXXX)', ahora],
    ['whatsapp_contacto',   '', 'Numero WhatsApp de contacto general', ahora],
    ['margen_default_pct',  '', 'Margen por defecto en porcentaje para calcular precio_venta', ahora],
    ['proxima_apertura',    '', 'Texto/fecha de la proxima apertura mostrada en el Home', ahora],
    ['banco_aportes',       '', 'Banco para aportes/transferencias', ahora],
    ['cuenta_aportes',      '', 'Numero de cuenta para aportes', ahora],
    ['titular_aportes',     '', 'Nombre del titular de la cuenta', ahora],
    ['rut_aportes',         '', 'RUT del titular de la cuenta', ahora],
    ['email_contacto',      '', 'Email de contacto del almacen', ahora],
    ['mensaje_home',        '', 'Mensaje destacado para mostrar en el Home', ahora]
  ];
}

/**
 * FUNCION PRINCIPAL - ejecutar esta.
 */
function crearBaseDatosAlmacen() {
  var ahora = nuevaMarcaTiempo_();

  // 1. Crear la planilla nueva.
  var ss = SpreadsheetApp.create(NOMBRE_PLANILLA);

  // 2. Crear todas las hojas con encabezados, formato y validaciones.
  for (var i = 0; i < HOJAS.length; i++) {
    crearHoja_(ss, HOJAS[i]);
  }

  // 3. Cargar valores iniciales en CONFIG.
  cargarConfig_(ss, ahora);

  // 4. Eliminar la hoja inicial "Hoja 1" / "Sheet1" que crea Google por defecto.
  eliminarHojaInicial_(ss);

  // 5. Dejar como activa la primera hoja definida (CONFIG).
  var primera = ss.getSheetByName(HOJAS[0].nombre);
  if (primera) ss.setActiveSheet(primera);

  // 6. Registrar URL e ID en el log.
  var url = ss.getUrl();
  var id = ss.getId();
  Logger.log('==============================================================');
  Logger.log('Planilla creada: ' + NOMBRE_PLANILLA);
  Logger.log('ID:  ' + id);
  Logger.log('URL: ' + url);
  Logger.log('Guarda el ID para usarlo en FASE 1.');
  Logger.log('==============================================================');

  return { id: id, url: url };
}

/**
 * Crea una hoja con sus encabezados, fila congelada, formato y validaciones.
 */
function crearHoja_(ss, def) {
  var sheet = ss.getSheetByName(def.nombre);
  if (!sheet) {
    sheet = ss.insertSheet(def.nombre);
  }
  sheet.clear();

  var encabezados = def.encabezados;
  var numCols = encabezados.length;

  // Encabezados en fila 1.
  var rango = sheet.getRange(1, 1, 1, numCols);
  rango.setValues([encabezados]);

  // Formato de encabezados.
  rango
    .setFontWeight('bold')
    .setFontColor('#FFFFFF')
    .setBackground('#3B0764')            // primary-dark del proyecto
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  // Congelar fila 1.
  sheet.setFrozenRows(1);

  // Ajustar ancho de columnas al contenido del encabezado.
  for (var c = 1; c <= numCols; c++) {
    sheet.autoResizeColumn(c);
    // Garantizar un ancho minimo legible.
    if (sheet.getColumnWidth(c) < 110) {
      sheet.setColumnWidth(c, 110);
    }
  }

  // Aplicar validaciones de lista si la hoja las define.
  aplicarValidaciones_(sheet, def.nombre, encabezados);
}

/**
 * Aplica validaciones de lista desplegable a las columnas configuradas.
 */
function aplicarValidaciones_(sheet, nombreHoja, encabezados) {
  var reglasHoja = VALIDACIONES[nombreHoja];
  if (!reglasHoja) return;

  var maxFilas = sheet.getMaxRows();
  var filasDatos = maxFilas - 1; // descontar fila de encabezado
  if (filasDatos < 1) return;

  Object.keys(reglasHoja).forEach(function (nombreCol) {
    var idx = encabezados.indexOf(nombreCol);
    if (idx === -1) return;

    var valores = reglasHoja[nombreCol];
    var regla = SpreadsheetApp.newDataValidation()
      .requireValueInList(valores, true)   // true = mostrar desplegable
      .setAllowInvalid(false)
      .setHelpText('Valores permitidos: ' + valores.join(' / '))
      .build();

    sheet.getRange(2, idx + 1, filasDatos, 1).setDataValidation(regla);
  });
}

/**
 * Inserta los valores iniciales en la hoja CONFIG.
 */
function cargarConfig_(ss, ahora) {
  var sheet = ss.getSheetByName('CONFIG');
  if (!sheet) return;

  var filas = valoresConfigIniciales(ahora);
  sheet.getRange(2, 1, filas.length, 4).setValues(filas);

  // Reajustar ancho tras cargar datos.
  for (var c = 1; c <= 4; c++) {
    sheet.autoResizeColumn(c);
  }
}

/**
 * Elimina la hoja por defecto ("Hoja 1" / "Sheet1") si quedo vacia y existe
 * alguna de nuestras hojas. Nunca elimina una hoja del modelo.
 */
function eliminarHojaInicial_(ss) {
  var nombresModelo = HOJAS.map(function (h) { return h.nombre; });
  var posiblesIniciales = ['Sheet1', 'Hoja 1', 'Hoja1', 'Hoja de calculo 1'];

  var hojas = ss.getSheets();
  for (var i = 0; i < hojas.length; i++) {
    var nombre = hojas[i].getName();
    var esModelo = nombresModelo.indexOf(nombre) !== -1;
    var esInicial = posiblesIniciales.indexOf(nombre) !== -1;
    // Solo borrar si NO es del modelo y queda mas de una hoja.
    if (!esModelo && esInicial && ss.getSheets().length > 1) {
      ss.deleteSheet(hojas[i]);
    }
  }
}

/**
 * Marca de tiempo legible para columnas *_en / actualizado.
 */
function nuevaMarcaTiempo_() {
  var tz = Session.getScriptTimeZone() || 'America/Santiago';
  return Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
}
