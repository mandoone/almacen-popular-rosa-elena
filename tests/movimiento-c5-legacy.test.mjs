import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {escenarioGasC5} from './helpers/sheets-c5-escenario.mjs';
const frozen=JSON.parse(await readFile('tests/fixtures/c5-v23-plan-parcial.json','utf8'));
const key={operacion_id:frozen.operacion_id,idempotency_key:frozen.idempotency_key};
const head=(c,n)=>c.hojas[n].grid[0];
function append(c,n,obj){c.hojas[n].grid.push(head(c,n).map(k=>obj[k]??''));}
async function parcial(){
  const c=await escenarioGasC5(),p=structuredClone(frozen);
  append(c,'PEDIDOS',{id_pedido:p.pedido_antes.id_pedido,fecha_hora:'2026-10-08T13:15:06.909Z',canal:'QA_C5',nombre_cliente:'Fixture sintÃ©tico C5',telefono:'QA-C5',total:3900,estado_pedido:'recibido',estado_pago:'pendiente',forma_pago:'efectivo_al_retirar',apertura_id:'APE-20991231'});
  p.detalles.forEach(l=>append(c,'DETALLE_PEDIDOS',l));p.saldos.forEach(s=>append(c,'PRODUCTOS',s.antes));
  p.familias_observadas.forEach(f=>append(c,'FAMILIAS_PRODUCTO',f));
  p.contexto_snapshot.sku_habilitados.forEach(id=>append(c,'APERTURA_PRODUCTOS',{apertura_id:'APE-20991231',producto_id:id,habilitado:'SI'}));
  p.asignaciones_nuevas.forEach(a=>append(c,'ASIGNACIONES_PEDIDO',a));
  append(c,'OPERACIONES_PEDIDOS',{...key,tipo_operacion:'CONFIRMAR_V2',id_pedido:p.pedido_antes.id_pedido,actor:'qa-c5',estado_operacion:'APLICANDO',paso:2,payload_hash:p.payload_hash,snapshot_json:JSON.stringify(p),resultado_json:'',creado_en:p.creado_en,actualizado_en:p.creado_en});
  append(c,'MOVIMIENTOS_STOCK',{id_movimiento:p.movimientos[0].movimiento_id,fecha_hora:p.creado_en});
  const input={id_pedido:p.pedido_antes.id_pedido,idempotency_key:p.idempotency_key,estado_esperado:'recibido',apertura_id_esperada:'APE-20991231',asignaciones:[{id_detalle_pedido:p.detalles[0].id_detalle_pedido,selecciones:p.asignaciones_nuevas.map(a=>({producto_id:a.producto_id,cantidad_asignada:a.cantidad_asignada}))}]};
  return {c,p,input};
}
test('C5 frontera negativa preserva tipo lógico y escribe salida/pedido compatible',async()=>{
  const c=await escenarioGasC5(),r=c.plain(c.contexto.serializarMovimientoV2ParaSheet_(frozen.movimientos[0],frozen));
  assert.equal(r.tipo,'salida');assert.equal(r.origen,'pedido');assert.equal(r.tipo_movimiento,'ASIGNACION_V2');
  assert.equal(r.referencia_id,frozen.operacion_id);assert.equal(r.id_origen,frozen.pedido_antes.id_pedido);
  assert.equal(r.cantidad,-4);assert.equal(r.movimiento_id,r.id_movimiento);assert.equal(r.producto_id,r.id_producto);
  const extra=JSON.parse(r.observacion);assert.equal(extra.plan_hash,frozen.plan_hash);assert.equal(extra.tipo_logico_v2,'ASIGNACION_V2');assert.deepEqual(extra.asignacion_ids,[frozen.asignaciones_nuevas[0].asignacion_id]);
  assert.equal(r.observaciones,r.observacion);assert.equal(Object.keys(r).length,20);
});
for(const tipo of ['CANCELAR','REASIGNAR'])test('C5 frontera '+tipo+' preserva devolución y asignación separadas',async()=>{
  const c=await escenarioGasC5(),f=c.preparar();c.accion('confirmarPedidoV2Test',c.input(f));
  c.accion(tipo==='CANCELAR'?'cancelarPedidoV2Test':'reasignarPedidoV2Test',{...c.input(f,'mutacion_c5_legacy',[1,5]),estado_esperado:'pendiente',...(tipo==='CANCELAR'?{asignaciones:[]}: {})});
  const rows=c.hojas.MOVIMIENTOS_STOCK.grid.slice(3).map(row=>Object.fromEntries(head(c,'MOVIMIENTOS_STOCK').map((k,i)=>[k,row[i]])));
  assert.equal(rows[0].tipo,'devolucion');assert.equal(rows[0].origen,tipo==='CANCELAR'?'cancelacion':'pedido');assert.equal(rows[0].tipo_movimiento,'DEVOLUCION_V2');
  if(tipo==='REASIGNAR'){assert.equal(rows.length,4);assert.equal(rows[2].tipo,'salida');assert.equal(rows[2].tipo_movimiento,'ASIGNACION_V2');}
});
for(const base of [100,250,1000])test('C5 serializer granel base '+base+' sin cambiar subtotal',async()=>{
  const c=await escenarioGasC5(),f=c.preparar('G'+base,'GRANEL'+base);c.accion('confirmarPedidoV2Test',c.input(f,'granel_serializer_'+base,[75,75]));
  const h=c.hojas.MOVIMIENTOS_STOCK.grid[0],row=c.hojas.MOVIMIENTOS_STOCK.grid[1],extra=JSON.parse(row[h.indexOf('observacion')]);
  assert.equal(row[h.indexOf('cantidad')],-75/base);assert.equal(extra.gramos_unidad_stock_snapshot,base);assert.equal(extra.escala_stock_snapshot,base);assert.equal(f.detalles[0].subtotal,203);
});
for(const field of ['cantidad_stock','stock_anterior','stock_resultante','escala_stock_snapshot'])for(const value of [NaN,Infinity])test('C5 rechazo no finito '+field+' '+value+', sin escritura',async()=>{
  const c=await escenarioGasC5(),p=structuredClone(frozen);p.movimientos[0][field]=value;
  p.plan_hash=c.contexto.DominioPedidoDurableC5.plan.hashV2({...p,plan_hash:''});
  assert.throws(()=>c.contexto.serializarMovimientoV2ParaSheet_(p.movimientos[0],p),/NUMERO|DELTA/);assert.equal(c.estado.escrituras.length,0);
});
for(const field of ['actor','producto_id','creado_en','id_detalle_pedido','unidad_stock_snapshot'])test('C5 campos faltantes '+field+' no producen fila',async()=>{
  const c=await escenarioGasC5(),p=structuredClone(frozen);delete p.movimientos[0][field];p.plan_hash=c.contexto.DominioPedidoDurableC5.plan.hashV2({...p,plan_hash:''});
  assert.throws(()=>c.contexto.serializarMovimientoV2ParaSheet_(p.movimientos[0],p),/CAMPO_REQUERIDO/);assert.equal(c.estado.escrituras.length,0);
});
test('C5 enum legacy inválido se rechaza antes de diario, asignaciones y movimiento',async()=>{
  const c=await escenarioGasC5(),f=c.preparar(),antes=c.estado.escrituras.length;c.hojas.MOVIMIENTOS_STOCK.validaciones.origen=['compra'];
  assert.throws(()=>c.accion('confirmarPedidoV2Test',c.input(f)),/VALIDACION_RECHAZA_origen/);assert.equal(c.estado.escrituras.length,antes);assert.equal(c.puerto().leer('OPERACIONES_PEDIDOS').length,0);
});
test('C5 M0 acreditado: misma fila/fecha, audit antes de efecto, replay0 y operación original completa',async()=>{
  const {c,p,input}=await parcial(),antes=structuredClone(c.hojas.MOVIMIENTOS_STOCK.grid[1]);
  const r=c.accion('recuperarMovimientoParcialC5Test',key);assert.equal(r.cambios,1);assert.equal(r.stock_modificado,false);assert.equal(r.readback_ok,true);
  assert.deepEqual(c.hojas.MOVIMIENTOS_STOCK.grid[1].slice(0,2),antes.slice(0,2));assert.equal(c.hojas.MOVIMIENTOS_STOCK.grid.length,2);assert.equal(c.accion('recuperarMovimientoParcialC5Test',key).cambios,0);
  assert.equal(c.estado.escrituras[0].hoja,'AUDITORIA_PRODUCTOS');assert.equal(c.puerto().leer('PRODUCTOS')[0].stock_actual,4);
  const resultado=c.accion('confirmarPedidoV2Test',input);assert.equal(resultado.estado_operacion,'COMPLETADA');assert.equal(resultado.operacion_id,p.operacion_id);
  const x=c.accion('obtenerAsignacionesPedidoV2Test',{id_pedido:p.pedido_antes.id_pedido});assert.deepEqual(x.productos.map(s=>s.stock_actual),[0,5]);assert.equal(x.asignaciones.length,2);assert.equal(x.movimientos.length,2);assert.equal(x.bloqueos.sku.length,0);
  const escrituras=c.estado.escrituras.length;assert.deepEqual(c.accion('confirmarPedidoV2Test',input),resultado);assert.equal(c.estado.escrituras.length,escrituras);
});
const cambios={stock:c=>{c.hojas.PRODUCTOS.grid[1][head(c,'PRODUCTOS').indexOf('stock_actual')]=3;},fecha:c=>{c.hojas.MOVIMIENTOS_STOCK.grid[1][1]='2099-01-01T00:00:00Z';},extra:c=>{c.hojas.MOVIMIENTOS_STOCK.grid[1][2]='salida';},duplicado:c=>{c.hojas.MOVIMIENTOS_STOCK.grid.push(c.hojas.MOVIMIENTOS_STOCK.grid[1].slice());},M1:c=>{append(c,'MOVIMIENTOS_STOCK',{id_movimiento:frozen.movimientos[1].movimiento_id,fecha_hora:frozen.creado_en});},asignacion:c=>{c.hojas.ASIGNACIONES_PEDIDO.grid[1][head(c,'ASIGNACIONES_PEDIDO').indexOf('cantidad_asignada')]=3;},estado:c=>{c.hojas.PEDIDOS.grid[1][head(c,'PEDIDOS').indexOf('estado_pedido')]='pendiente';},paso:c=>{c.hojas.OPERACIONES_PEDIDOS.grid[1][head(c,'OPERACIONES_PEDIDOS').indexOf('paso')]=3;},hash:c=>{c.hojas.OPERACIONES_PEDIDOS.grid[1][head(c,'OPERACIONES_PEDIDOS').indexOf('payload_hash')]='falso';}};
for(const [nombre,cambiar] of Object.entries(cambios))test('C5 recovery STOP '+nombre+' sin reparar ni escribir',async()=>{
  const {c}=await parcial();cambiar(c);const antes=c.estado.escrituras.length;assert.throws(()=>c.accion('recuperarMovimientoParcialC5Test',key),/RECOVERY_/);assert.equal(c.estado.escrituras.length,antes);
});
test('C5 caída después de completar M0: nuevo proceso/recovery0 conserva evidencia',async()=>{
  const {c}=await parcial();c.estado.fallo={hoja:'MOVIMIENTOS_STOCK',row:2};assert.throws(()=>c.accion('recuperarMovimientoParcialC5Test',key),/Caída/);
  const r=c.accion('recuperarMovimientoParcialC5Test',key);assert.equal(r.cambios,0);assert.equal(r.readback_ok,true);assert.equal(c.hojas.MOVIMIENTOS_STOCK.grid.length,2);
});
test('C5 reportes: intención APPLY/REVIEW invisible; COMPLETE visible; V1 siempre idéntico',async()=>{
  const c=await escenarioGasC5(),f=c.preparar(),i=c.input(f);assert.throws(()=>c.accion('confirmarPedidoV2Test',{...i,fallo_punto:'MOVIMIENTO_2'}),/INTERRUPCION_QA/);
  const movs=c.hojas.MOVIMIENTOS_STOCK.grid.slice(1).map(row=>Object.fromEntries(head(c,'MOVIMIENTOS_STOCK').map((k,i)=>[k,row[i]])));
  assert.equal(c.contexto.movimientoCompletadoReporteC5_(movs[0],c.puerto().leer('OPERACIONES_PEDIDOS')),false);
  assert.equal(c.contexto.movimientoCompletadoReporteC5_({id_movimiento:'MOV-V1',tipo:'salida'},[]),true);
  c.accion('confirmarPedidoV2Test',i);assert.equal(c.contexto.movimientoCompletadoReporteC5_(movs[0],c.puerto().leer('OPERACIONES_PEDIDOS')),true);
  const corrupt={...movs[0],cantidad:-99};assert.equal(c.contexto.movimientoCompletadoReporteC5_(corrupt,c.puerto().leer('OPERACIONES_PEDIDOS')),false);
});
