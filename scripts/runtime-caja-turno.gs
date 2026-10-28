// Fuente versionada del bloque CAJA_TURNO. Incorporar con generar-caja-turno.mjs.
// TEST exclusivo. No se atribuye atomicidad a Sheets: diario, readback y replay.
var COLUMNAS_CIERRES_CAJA_TURNO = ['cierre_id','apertura_id','fecha_hora','responsable','estado_cierre','saldo_inicial','efectivo_cobrado','transferencias_cobradas','pagos_pendientes','gastos_efectivo','efectivo_esperado','efectivo_contado','diferencia','observaciones','snapshot_json','fuente_hash','idempotency_key','payload_hash'];

function destinoCajaTurno_(ss) {
  validarEntornoTestFase78_();
  if (SPREADSHEET_ID !== '1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM' ||
      ss.getName() !== 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES') lanzar_('Destino de caja TEST no acreditado.', 403);
}

function asociacionGastoTurno_(observaciones) {
  var texto = limpiar_(observaciones), dato;
  if (texto.charAt(0) !== '{') return null;
  try { dato = JSON.parse(texto); } catch (e) { return null; }
  if (!dato || dato.modelo !== 'GASTO_CAJA_V1') return null;
  if (!/^APE-[0-9]{8}$/.test(dato.apertura_id) || ['efectivo','transferencia'].indexOf(dato.forma_pago) === -1 ||
      typeof dato.observacion !== 'string') lanzar_('Asociacion de gasto invalida.', 400);
  return dato;
}

function exigirCajaNoCerradaTurno_(ss, aperturaId) {
  // Ausencia de contrato = mismo comportamiento legacy. Nunca crea hojas al leer.
  if (!aperturaId || !ss.getSheetByName('CIERRES_CAJA')) return;
  var hoja = leerHoja_(ss, 'CIERRES_CAJA');
  exigirColumnas_(hoja, COLUMNAS_CIERRES_CAJA_TURNO);
  var filas = hoja.filas.filter(function (f) { return limpiar_(f[col_(hoja,'apertura_id')]) === aperturaId; });
  if (filas.length) lanzar_('CAJA_CERRADA_O_EN_REVISION: requiere rectificacion auditada; no alterar el turno cerrado.', 409);
}

function fuenteCajaTurno_(ss, aperturaId) {
  destinoCajaTurno_(ss);
  var resumen = obtenerResumenApertura_(aperturaId);
  var todos = listarGastosExtra_('', ''), gastos = [], sinAsociar = 0;
  todos.forEach(function (g) {
    if (g.estado !== 'vigente') return;
    var a = asociacionGastoTurno_(g.observaciones);
    if (!a) { sinAsociar++; return; }
    if (a.apertura_id === aperturaId) gastos.push({ gasto_id:g.gasto_id, apertura_id:a.apertura_id,
      forma_pago:a.forma_pago, monto:Number(g.monto), descripcion:g.descripcion, responsable:g.responsable });
  });
  gastos.sort(function (a,b) { return a.gasto_id.localeCompare(b.gasto_id); });
  // La fuente conserva recibos comerciales, no solo totales que podrian coincidir.
  var pedidos = leerHoja_(ss, HOJAS.PEDIDOS);
  var recibos = pedidos.filas.map(function(f){return serializarRegistroF78_(filaAObjeto_(pedidos,f));})
    .filter(function(p){return p.apertura_id === aperturaId;});
  var idsPedidos = recibos.map(function(p){return p.id_pedido;});
  var ops = leerHoja_(ss,HOJAS.OPERACIONES_PEDIDOS);
  ops.filas.forEach(function(f){
    var o=filaAObjeto_(ops,f);
    if (idsPedidos.indexOf(o.id_pedido)!==-1 && ['PREPARADA','APLICANDO','REQUIERE_REVISION'].indexOf(o.estado_operacion)!==-1)
      lanzar_('CAJA_OPERACION_INCIERTA: reconciliar pedido antes del arqueo.',409);
  });
  var fuente = {resumen:resumen,gastos:gastos,pedidos:recibos,ventas:listarVentasPorApertura_(aperturaId)};
  return {resumen:resumen,gastos:gastos,gastos_sin_asociacion:sinAsociar,fuente_hash:hashPayload_(fuente)};
}

function calcularArqueoTurno_(fuente, inicial, contado) {
  var r = fuente.resumen, gastos = fuente.gastos;
  [inicial,contado,r.total_cobrado,r.total_efectivo_esperado,r.total_transferencia,r.total_pendiente_pago]
    .concat(gastos.map(function(g){return g.monto;})).forEach(function(n){
      if (!Number.isSafeInteger(n) || n < 0) lanzar_('Monto CLP entero no negativo requerido.',400);
    });
  var ids = {};
  var egresos = gastos.reduce(function(s,g){
    if (ids[g.gasto_id]) lanzar_('Gasto duplicado.',409);
    ids[g.gasto_id]=true;
    if (['efectivo','transferencia'].indexOf(g.forma_pago) === -1) lanzar_('Medio de gasto no acreditado.',409);
    return s+(g.forma_pago === 'efectivo' ? g.monto : 0);
  },0);
  var esperado = inicial+r.total_efectivo_esperado-egresos;
  if (!Number.isSafeInteger(esperado) || !Number.isSafeInteger(contado-esperado)) lanzar_('Monto fuera de rango.',400);
  return {saldo_inicial:inicial,efectivo_cobrado:r.total_efectivo_esperado,transferencias_cobradas:r.total_transferencia,
    pagos_pendientes:r.total_pendiente_pago,gastos_efectivo:egresos,efectivo_esperado:esperado,efectivo_contado:contado,diferencia:contado-esperado};
}

function obtenerCajaTurnoTest_(aperturaId) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) lanzar_('Caja ocupada.',503);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var fuente = fuenteCajaTurno_(ss, limpiar_(aperturaId));
    if (!ss.getSheetByName('CIERRES_CAJA')) lanzar_('Contrato CIERRES_CAJA no instalado. Guardado BLOQUEADO.',409);
    var hoja = leerHoja_(ss,'CIERRES_CAJA'); exigirColumnas_(hoja,COLUMNAS_CIERRES_CAJA_TURNO);
    fuente.cierres = hoja.filas.map(function(f){return serializarRegistroF78_(filaAObjeto_(hoja,f));})
      .filter(function(c){return c.apertura_id === aperturaId;});
    return fuente;
  } finally { lock.releaseLock(); }
}

function verificarCierreTurno_(hoja, registro) {
  var coincidencias = hoja.filas.filter(function(f){return limpiar_(f[col_(hoja,'cierre_id')]) === registro.cierre_id;});
  if (coincidencias.length !== 1) lanzar_('CIERRE_REQUIERE_REVISION: identidad duplicada o ausente.',409);
  var actual = serializarRegistroF78_(filaAObjeto_(hoja,coincidencias[0]));
  COLUMNAS_CIERRES_CAJA_TURNO.forEach(function(c){
    if (String(actual[c]) !== String(registro[c])) lanzar_('CIERRE_REQUIERE_REVISION: readback incompatible en '+c,409);
  });
  return actual;
}

function registrarCierreCajaTurnoTest_(body) {
  exigirIdempotencyKey_(body.idempotency_key);
  var entrada = {apertura_id:limpiar_(body.apertura_id),responsable:limpiar_(body.responsable),
    saldo_inicial:body.saldo_inicial,efectivo_contado:body.efectivo_contado,
    observaciones:limpiar_(body.observaciones),fuente_hash:limpiar_(body.fuente_hash),revision_confirmada:body.revision_confirmada};
  if (!/^APE-[0-9]{8}$/.test(entrada.apertura_id) || !entrada.responsable || entrada.responsable.length>100 ||
      !entrada.observaciones || entrada.observaciones.length>500 || !/^[a-f0-9]{64}$/.test(entrada.fuente_hash) ||
      entrada.revision_confirmada !== true || !Number.isSafeInteger(entrada.saldo_inicial) || entrada.saldo_inicial<0 ||
      !Number.isSafeInteger(entrada.efectivo_contado) || entrada.efectivo_contado<0) lanzar_('Falta revision, observacion o montos explicitos validos.',400);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) lanzar_('Caja ocupada.',503);
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID); destinoCajaTurno_(ss);
    var hoja = leerHoja_(ss,'CIERRES_CAJA'); exigirColumnas_(hoja,COLUMNAS_CIERRES_CAJA_TURNO);
    var hash = hashPayload_(entrada), key = limpiar_(body.idempotency_key);
    var registros = hoja.filas.map(function(f){return serializarRegistroF78_(filaAObjeto_(hoja,f));});
    var previos = registros.filter(function(c){return c.idempotency_key === key;});
    if (previos.length>1) lanzar_('CIERRE_REQUIERE_REVISION: clave duplicada.',409);
    var registro = previos[0];
    if (registro) {
      if (registro.payload_hash !== hash) lanzar_('Clave de cierre usada con otro contenido.',409);
      verificarCierreTurno_(hoja,registro);
      var snapshot;
      try { snapshot=JSON.parse(registro.snapshot_json); } catch(e){lanzar_('CIERRE_REQUIERE_REVISION: snapshot invalido.',409);}
      if (snapshot.entrada_hash !== hash || hashPayload_(snapshot.fuente) !== snapshot.snapshot_hash)
        lanzar_('CIERRE_REQUIERE_REVISION: snapshot sin autoria.',409);
      if (registro.estado_cierre === 'CONFIRMADA') return registro;
      if (registro.estado_cierre !== 'PREPARADA') lanzar_('CIERRE_REQUIERE_REVISION.',409);
    } else {
      exigirCajaNoCerradaTurno_(ss,entrada.apertura_id);
    }
    var fuente = fuenteCajaTurno_(ss,entrada.apertura_id);
    if (fuente.fuente_hash !== entrada.fuente_hash) lanzar_('CAJA_FUENTE_CAMBIO: volver a revisar antes de cerrar.',409);
    if (!registro) {
      var cifras = calcularArqueoTurno_(fuente,entrada.saldo_inicial,entrada.efectivo_contado);
      registro = Object.assign({cierre_id:'CIE-'+hashPayload_({actor:entrada.responsable,key:key}).slice(0,32),
        apertura_id:entrada.apertura_id,fecha_hora:marcaIso_(new Date()),responsable:entrada.responsable,estado_cierre:'PREPARADA'},cifras,
        {observaciones:entrada.observaciones,snapshot_json:JSON.stringify({modelo:'ARQUEO_V1',entrada_hash:hash,
          snapshot_hash:hashPayload_(fuente),fuente:fuente}),fuente_hash:fuente.fuente_hash,idempotency_key:key,payload_hash:hash});
      var fila = hoja.headers.map(function(h){return registro[h] === undefined ? '' : registro[h];});
      var filaDestino=hoja.sheet.getLastRow()+1;
      hoja.headers.forEach(function(h,i){if(typeof registro[h]==='string')hoja.sheet.getRange(filaDestino,i+1).setNumberFormat('@');});
      var rango = hoja.sheet.getRange(filaDestino,1,1,hoja.headers.length);
      // Todos los campos se construyen/validan antes de la unica escritura de fila.
      rango.setValues([fila]); SpreadsheetApp.flush();
      hoja = leerHoja_(ss,'CIERRES_CAJA'); verificarCierreTurno_(hoja,registro);
    }
    var indice = buscarFila_(hoja,col_(hoja,'cierre_id'),registro.cierre_id);
    hoja.sheet.getRange(indice+2,col_(hoja,'estado_cierre')+1).setValue('CONFIRMADA'); SpreadsheetApp.flush();
    registro.estado_cierre='CONFIRMADA';
    return verificarCierreTurno_(leerHoja_(ss,'CIERRES_CAJA'),registro);
  } finally {lock.releaseLock();}
}
