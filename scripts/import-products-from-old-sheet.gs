/**
 * import-products-from-old-sheet.gs
 * ------------------------------------------------------------------------------
 * Importacion INICIAL de productos desde la planilla antigua (CSV publicado) hacia
 * la hoja PRODUCTOS de la nueva base operativa
 * (BD_WEB_ALMACEN_ROSA_ELENA_MORALES, creada con scripts/setup-google-sheet.gs).
 *
 * IMPORTANTE:
 *   - La planilla antigua se usa SOLO como fuente de datos inicial, NO como base
 *     operativa final.
 *   - Esta es una herramienta de migracion de una sola vez (re-ejecutable).
 *   - No contiene URLs ni IDs reales: se pegan a mano en Apps Script antes de
 *     ejecutar. No commitear valores reales.
 *
 * USO: ver docs/IMPORT_PRODUCTS.md
 * ------------------------------------------------------------------------------
 */

// ====== CONFIGURAR AQUI (editar en Apps Script, NO commitear valores reales) ====
var OLD_PRODUCTS_CSV_URL = 'PEGAR_URL_CSV_ANTIGUA_AQUI';
var TARGET_SPREADSHEET_ID = 'PEGAR_ID_NUEVA_BD_AQUI';
// ===============================================================================

var HOJA_DESTINO = 'PRODUCTOS';

// Orden EXACTO de columnas de la hoja PRODUCTOS (debe coincidir con setup-google-sheet.gs).
var COLUMNAS_PRODUCTOS = [
  'id_producto', 'activo', 'nombre', 'categoria', 'prioridad', 'unidad_medida',
  'permite_decimal', 'paso_venta', 'precio_costo', 'margen_pct', 'precio_venta',
  'stock_actual', 'stock_minimo', 'imagen_url', 'observaciones', 'actualizado_en'
];

/**
 * FUNCION PRINCIPAL - ejecutar esta.
 */
function importarProductosDesdeCSVAntiguo() {
  validarConfig_();

  // 1. Leer el CSV antiguo.
  var resp = UrlFetchApp.fetch(OLD_PRODUCTS_CSV_URL, { muteHttpExceptions: true });
  var codigo = resp.getResponseCode();
  if (codigo < 200 || codigo >= 300) {
    throw new Error('No se pudo leer el CSV antiguo. Codigo HTTP: ' + codigo);
  }
  var texto = resp.getContentText('UTF-8');

  // 2. Parsear productos (misma logica que src/app/api/productos/route.ts).
  var resultado = parseProductos_(texto);
  var productos = resultado.productos;

  // 3. Construir las filas para la hoja PRODUCTOS.
  var ahora = nuevaMarcaTiempo_();
  var filas = [];
  for (var i = 0; i < productos.length; i++) {
    filas.push(filaProducto_(productos[i], i + 1, ahora));
  }

  // 4. Escribir en la hoja destino (sin tocar encabezados ni validaciones).
  escribirEnDestino_(filas);

  // 5. Logs de resumen.
  Logger.log('==============================================================');
  Logger.log('Importacion de productos finalizada.');
  Logger.log('Filas leidas (CSV):        ' + resultado.filasLeidas);
  Logger.log('Productos importados:      ' + productos.length);
  Logger.log('Filas ignoradas:           ' + resultado.filasIgnoradas);
  if (resultado.advertencias.length > 0) {
    Logger.log('Advertencias (' + resultado.advertencias.length + '):');
    for (var a = 0; a < resultado.advertencias.length; a++) {
      Logger.log('  - ' + resultado.advertencias[a]);
    }
  }
  Logger.log('Primeros productos importados:');
  for (var p = 0; p < Math.min(5, productos.length); p++) {
    Logger.log('  ' + filas[p][0] + '  ' + productos[p].nombre +
      '  -> precio_venta=' + productos[p].precio);
  }
  Logger.log('Revisa manualmente: categoria, prioridad, unidad_medida, stock e imagenes.');
  Logger.log('==============================================================');

  return { importados: productos.length, ignoradas: resultado.filasIgnoradas };
}

/**
 * Valida que la configuracion fue editada antes de ejecutar.
 */
function validarConfig_() {
  if (!OLD_PRODUCTS_CSV_URL || OLD_PRODUCTS_CSV_URL.indexOf('PEGAR_') === 0) {
    throw new Error('Configura OLD_PRODUCTS_CSV_URL antes de ejecutar.');
  }
  if (!TARGET_SPREADSHEET_ID || TARGET_SPREADSHEET_ID.indexOf('PEGAR_') === 0) {
    throw new Error('Configura TARGET_SPREADSHEET_ID antes de ejecutar.');
  }
}

/**
 * Parsea una linea CSV respetando comillas (equivalente a parseCSVLine del route.ts).
 */
function parseCSVLine_(line) {
  var cells = [];
  var current = '';
  var inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var char = line.charAt(i);
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current.replace(/^\s+|\s+$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.replace(/^\s+|\s+$/g, ''));
  return cells;
}

/**
 * Replica parseProductos() de src/app/api/productos/route.ts:
 *  - localiza la fila de encabezado cuya columna 1 contiene "RT" y "CUL"
 *    (cubre "ARTICULO" con cualquier encoding); usa la ULTIMA coincidencia;
 *  - desde ahi toma columna 1 = nombre, columna 2 = precio;
 *  - corta al encontrar fila vacia o "TOTAL";
 *  - ignora filas cuyo precio no es numerico.
 * Devuelve productos + metricas para los logs.
 */
function parseProductos_(text) {
  var lines = String(text).split('\n');

  var inicioIdx = -1;
  for (var i = 0; i < lines.length; i++) {
    var cells = parseCSVLine_(lines[i]);
    var col1 = (cells[1] ? cells[1] : '').replace(/"/g, '');
    col1 = col1.replace(/^\s+|\s+$/g, '').toUpperCase();
    if (col1.indexOf('RT') !== -1 && col1.indexOf('CUL') !== -1) {
      inicioIdx = i;
    }
  }

  var productos = [];
  var advertencias = [];
  var filasLeidas = 0;
  var filasIgnoradas = 0;

  if (inicioIdx === -1) {
    advertencias.push('No se encontro la fila de encabezado ("ARTICULO"). Nada que importar.');
    return {
      productos: productos, advertencias: advertencias,
      filasLeidas: 0, filasIgnoradas: 0
    };
  }

  for (var j = inicioIdx + 1; j < lines.length; j++) {
    filasLeidas++;
    var celdas = parseCSVLine_(lines[j]);
    var nombre = (celdas[1] ? celdas[1] : '').replace(/"/g, '').replace(/^\s+|\s+$/g, '');
    var precioRaw = (celdas[2] ? celdas[2] : '').replace(/"/g, '').replace(/^\s+|\s+$/g, '');

    // Corte: fila vacia o totales.
    if (!nombre || nombre.toUpperCase().indexOf('TOTAL') !== -1) {
      break;
    }

    var precio = parseInt(precioRaw.replace(/[^0-9]/g, ''), 10);
    if (!precio) {
      filasIgnoradas++;
      if (precioRaw) {
        advertencias.push('Precio invalido para "' + nombre + '": "' + precioRaw + '" (fila ignorada).');
      }
      continue;
    }

    productos.push({ nombre: nombre, precio: precio });
  }

  return {
    productos: productos, advertencias: advertencias,
    filasLeidas: filasLeidas, filasIgnoradas: filasIgnoradas
  };
}

/**
 * Construye una fila de la hoja PRODUCTOS segun el mapeo de importacion inicial.
 * indice = posicion 1-based para generar id_producto (PROD-001...).
 */
function filaProducto_(prod, indice, ahora) {
  var id = 'PROD-' + ('00' + indice).slice(-3);
  return [
    id,                               // id_producto
    'SI',                             // activo
    prod.nombre,                      // nombre
    'pendiente',                      // categoria
    'media',                          // prioridad
    'unidad',                         // unidad_medida
    'NO',                             // permite_decimal
    1,                                // paso_venta
    '',                               // precio_costo
    '',                               // margen_pct
    prod.precio,                      // precio_venta
    0,                                // stock_actual
    0,                                // stock_minimo
    '',                               // imagen_url
    'Importado desde planilla antigua', // observaciones
    ahora                             // actualizado_en
  ];
}

/**
 * Abre la nueva base operativa, valida la hoja PRODUCTOS, limpia solo los datos
 * (desde la fila 2) y escribe las filas. No toca encabezados ni validaciones.
 */
function escribirEnDestino_(filas) {
  var ss = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  var sheet = ss.getSheetByName(HOJA_DESTINO);
  if (!sheet) {
    throw new Error('La hoja "' + HOJA_DESTINO + '" no existe en la planilla destino. ' +
      'Crea primero la base con setup-google-sheet.gs.');
  }

  verificarEncabezados_(sheet);

  var numCols = COLUMNAS_PRODUCTOS.length;

  // Limpiar SOLO datos desde la fila 2 hacia abajo (conserva encabezados y validaciones).
  var ultimaFila = sheet.getLastRow();
  if (ultimaFila >= 2) {
    sheet.getRange(2, 1, ultimaFila - 1, numCols).clearContent();
  }

  if (filas.length === 0) return;

  // Escribir los datos importados.
  sheet.getRange(2, 1, filas.length, numCols).setValues(filas);
}

/**
 * Comprueba que la fila 1 de la hoja coincide con el orden esperado de columnas.
 * Si no coincide, lanza error para evitar escribir datos desalineados.
 */
function verificarEncabezados_(sheet) {
  var numCols = COLUMNAS_PRODUCTOS.length;
  var actuales = sheet.getRange(1, 1, 1, numCols).getValues()[0];
  for (var c = 0; c < numCols; c++) {
    var esperado = COLUMNAS_PRODUCTOS[c];
    var actual = (actuales[c] ? String(actuales[c]) : '').replace(/^\s+|\s+$/g, '');
    if (actual !== esperado) {
      throw new Error('Los encabezados de PRODUCTOS no coinciden con el modelo. ' +
        'Columna ' + (c + 1) + ': esperado "' + esperado + '", encontrado "' + actual + '". ' +
        'Re-crea la base con setup-google-sheet.gs.');
    }
  }
}

/**
 * Marca de tiempo legible para la columna actualizado_en.
 */
function nuevaMarcaTiempo_() {
  var tz = Session.getScriptTimeZone() || 'America/Santiago';
  return Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
}
