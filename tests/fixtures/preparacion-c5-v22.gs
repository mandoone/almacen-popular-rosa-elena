// Reproducción inmutable del código TEST v21/v22 de preparación; sin configuración privada.
function appendQaC5V22_(ss, tabla, obj, clave) {
  var h=leerHoja_(ss,tabla), matches=h.filas.filter(function(f){return filaAObjeto_(h,f)[clave]===obj[clave];});
  if(matches.length) { if(matches.length!==1) lanzar_('C5_FIXTURE_ID_DUPLICADO',409);return false; }
  var row=h.sheet.getLastRow()+1;
  h.headers.forEach(function(k,i){if(typeof obj[k]==='string')h.sheet.getRange(row,i+1).setNumberFormat('@');});
  h.sheet.getRange(row,1,1,h.headers.length).setValues([h.headers.map(function(k){return obj[k]===undefined?'':obj[k];})]);SpreadsheetApp.flush();
  var after=leerHoja_(ss,tabla), created=after.filas.filter(function(f){return filaAObjeto_(after,f)[clave]===obj[clave];});
  if(created.length!==1) lanzar_('C5_FIXTURE_APPEND_INCIERTO',409);
  Object.keys(obj).forEach(function(k){if(k in after.mapa && DominioPedidoDurableC5.plan.canonV2(filaAObjeto_(after,created[0])[k])!==DominioPedidoDurableC5.plan.canonV2(obj[k])) lanzar_('C5_FIXTURE_READBACK_INCIERTO',409);});
  return true;
}
function auditarQaC5V22_(ss, accion, entidad, antes, despues, referencia) {
  var campos={modelo:'AUDITORIA_QA_C5_1',antes:antes,despues:despues};
  var hash=DominioPedidoDurableC5.revision.hashRevision(campos);
  appendQaC5V22_(ss,'AUDITORIA_PRODUCTOS',{auditoria_id:'AUD-QA-C5-'+hash.slice(0,32),fecha_hora:new Date().toISOString(),producto_id:'',accion:accion,
    cambios_json:JSON.stringify(campos),responsable:'qa-c5',referencia_id:referencia || entidad,entidad_tipo:'QA_C5',entidad_id:entidad,payload_hash:hash,resultado_json:JSON.stringify({ok:true})},'auditoria_id');
}
/** Fixtures definidos por servidor, nunca identidad/costo/stock arbitrarios del navegador. */
function prepararFixtureC5V22_(ss, body) {
  var grupo=body.grupo, escenario=body.escenario || 'UNIDAD', id=body.id_pedido;
  if(typeof grupo!=='string' || !/^[A-Z0-9-]{1,35}$/.test(grupo) || !['UNIDAD','MIXTO','INSUFICIENTE','GRANEL100','GRANEL250','GRANEL1000'].includes(escenario)) lanzar_('C5_FIXTURE_INVALIDO',400);
  exigirQaC5_(id,'PED');
  var d=DominioPedidoDurableC5, puerto=crearPuertoDurableC5_(ss), existente=puerto.leer('PEDIDOS').filter(function(p){return p.id_pedido===id;});
  if(existente.length) {
    if(existente.length!==1) lanzar_('C5_PEDIDO_DUPLICADO',409);
    return estadoFixtureC5_(puerto,id);
  }
  var granel=escenario.indexOf('GRANEL')===0, base=granel?Number(escenario.slice(6)):0, familia_id='FAM-QA-C5-'+grupo, ahora=new Date().toISOString();
  var familia={familia_id:familia_id,activo:'SI',nombre_publico:granel?'Granel QA C5':'Cloro QA EconÃ³mico 1 L',categoria:granel?'Granel':'Limpieza',precio_venta:granel?1350:650,
    modo_venta:granel?'GRANEL':'UNIDAD',unidad_venta:granel?'g':'unidad',permite_decimal:'NO',paso_venta:1,presentacion_publica:granel?'Granel libre QA':'Botella 1 L',
    politica_marca:granel?'NO_APLICA':'VARIABLE',version_oferta:1,actualizado_en:ahora};
  if(granel) familia.gramos_referencia=1000;else {familia.contenido_cantidad=1000;familia.contenido_unidad='ml';}
  appendQaC5V22_(ss,'FAMILIAS_PRODUCTO',familia,'familia_id');
  familia=puerto.leer('FAMILIAS_PRODUCTO').filter(function(f){return f.familia_id===familia_id;})[0];
  if(!familia || familia.activo!=='SI') lanzar_('FAMILIA_NO_VENDIBLE',409);
  var skuIds=['A','B'].map(function(letra){return 'PROD-QA-C5-'+grupo+'-'+letra;});
  skuIds.forEach(function(sku,i){
    var b=granel?(i?1000:base):0, stock=granel?2:i?7:4;
    var obj={id_producto:sku,activo:'SI',nombre:(granel?'Granel':'Cloro')+' QA C5 '+grupo+' '+(i?'B':'A'),categoria:familia.categoria,prioridad:'media',unidad_medida:'unidad',
      permite_decimal:granel?'SI':'NO',paso_venta:granel?1/b:1,precio_costo:i?610:590,precio_venta:granel?1350:700,stock_actual:stock,stock_minimo:0,
      tipo_disponibilidad:'POR_APERTURA',modo_venta:granel?'GRANEL':'UNIDAD',familia_id:familia_id,marca:granel?'':'QA-'+(i?'B':'A'),presentacion:granel?'Granel QA base '+b+' g':'Botella 1 L',
      observaciones:JSON.stringify({modelo:'FIXTURE_C5_1',grupo:grupo,stock_inicial:stock}),actualizado_en:ahora};
    if(granel){obj.gramos_referencia=1000;obj.gramos_unidad_stock=b;}else{obj.contenido_cantidad=1000;obj.contenido_unidad='ml';}
    appendQaC5V22_(ss,'PRODUCTOS',obj,'id_producto');
  });
  var x='PROD-QA-C5-'+grupo+'-X';
  if(escenario==='MIXTO') {
    appendQaC5V22_(ss,'PRODUCTOS',{id_producto:x,activo:'SI',nombre:'SKU V1 QA C5 '+grupo,categoria:'Alimentos',prioridad:'media',unidad_medida:'unidad',permite_decimal:'NO',paso_venta:1,
      precio_costo:400,precio_venta:500,stock_actual:6,stock_minimo:0,tipo_disponibilidad:'POR_APERTURA',modo_venta:'UNIDAD',observaciones:JSON.stringify({modelo:'FIXTURE_C5_1',grupo:grupo,stock_inicial:6}),actualizado_en:ahora},'id_producto');
  }
  var ids=skuIds.concat(escenario==='MIXTO'?[x]:[]);
  ids.forEach(function(sku){
    var h=leerHoja_(ss,'APERTURA_PRODUCTOS'), match=h.filas.filter(function(f){var o=filaAObjeto_(h,f);return o.apertura_id==='APE-20991231'&&o.producto_id===sku;});
    if(match.length>1) lanzar_('C5_APERTURA_DUPLICADA',409);
    if(!match.length) agregarFila_(h,{apertura_id:'APE-20991231',producto_id:sku,habilitado:'SI',actualizado_por:'qa-c5',actualizado_en:ahora});
  });SpreadsheetApp.flush();
  var l=d.pedido.crearDetallePedidoFamiliaV2(id,'DPE-'+id+'-F',{modelo_linea:'FAMILIA_V2',familia_id:familia_id,cantidad_solicitada:granel?150:6,unidad_solicitada:granel?'g':'unidad',version_oferta:familia.version_oferta},familia);
  var detalles=[l];
  if(escenario==='MIXTO'||escenario==='INSUFICIENTE')detalles.unshift({id_pedido:id,id_detalle_pedido:'DPE-'+id+'-V1',modelo_linea:'SKU_V1',id_producto:escenario==='MIXTO'?x:skuIds[0],cantidad:2,nombre_producto:'SKU V1 QA C5',precio_unitario:500,subtotal:1000,unidad_medida:'unidad',modo_venta:'UNIDAD'});
  // Detalles primero; cabecera recibida solo al finalizar la preparaciÃ³n QA. Retry no reconstruye histÃ³ricos.
  detalles.forEach(function(linea){appendQaC5V22_(ss,'DETALLE_PEDIDOS',linea,'id_detalle_pedido');});
  appendQaC5V22_(ss,'PEDIDOS',{id_pedido:id,fecha_hora:ahora,canal:'QA_C5',nombre_cliente:'Fixture sintÃ©tico C5',telefono:'QA-C5',total:detalles.reduce(function(n,a){return n+a.subtotal;},0),estado_pedido:'recibido',estado_pago:'pendiente',forma_pago:'efectivo',observaciones:'Fixture sintÃ©tico C5 '+grupo,apertura_id:'APE-20991231',origen_pedido:'QA_C5'},'id_pedido');
  auditarQaC5V22_(ss,'CREAR_FIXTURE_C5',id,null,{familia_id:familia_id,sku:ids,escenario:escenario},id);
  return estadoFixtureC5_(puerto,id);
}
