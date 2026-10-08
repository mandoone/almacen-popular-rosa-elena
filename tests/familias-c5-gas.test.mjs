import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {escenarioGasC5} from './helpers/sheets-c5-escenario.mjs';
import {crearEstadoSheetsMemoriaV2,AlmacenSheetsMemoriaV2} from '../src/lib/familias/almacenSheetsMemoriaV2.ts';
import {confirmarPedidoV2Durable} from '../src/lib/familias/adaptadorDurableV2.ts';
import {canonV2} from '../src/lib/familias/planMixtoV2.ts';
import {GUARDS_V1_C5,sinLineasVacias} from '../scripts/lib/auditoria-guardrails-c5.mjs';
import {ejecutarE2eC5} from '../scripts/e2e-familias-c5.mjs';
const cancelar=(c,f,key='cancelar_qa_c5_12345')=>c.accion('cancelarPedidoV2Test',{id_pedido:f.pedido.id_pedido,idempotency_key:key,estado_esperado:'pendiente',apertura_id_esperada:'APE-20991231'});
const estado=(c,f)=>c.accion('obtenerAsignacionesPedidoV2Test',{id_pedido:f.pedido.id_pedido});
const stock=f=>f.productos.filter(s=>s.familia_id).map(s=>s.stock_actual);
test('C5 generador sincroniza nueve módulos sin Promise/subtle ni dominio reescrito',()=>{execFileSync(process.execPath,['scripts/generar-durable-c5-gs.mjs','--check']);});
test('C5 runtime ES2019 sin Array.at: confirma usando el mismo plan C4',async()=>{
  const c=await escenarioGasC5();vm.runInContext('Array.prototype.at=undefined',c.contexto);
  const f=c.preparar(),r=c.accion('confirmarPedidoV2Test',c.input(f));assert.equal(r.estado_operacion,'COMPLETADA');assert.deepEqual(stock(estado(c,f)),[0,5]);
});
test('C5 STOP real v23: enum legacy tipo rechaza ASIGNACION_V2 y conserva stock/pedido',async()=>{
  const c=await escenarioGasC5(),f=c.preparar();c.hojas.MOVIMIENTOS_STOCK.validaciones.tipo=['entrada','salida','ajuste','devolucion'];
  vm.runInContext(await readFile('tests/fixtures/serializador-c5-v23.gs','utf8'),c.contexto);
  c.contexto.validarPlanPersistenciaC5_=()=>{};c.contexto.validarFilaPersistenciaC5_=()=>{}; // Reproducción aislada del puerto v23, conservado.
  assert.throws(()=>c.accion('confirmarPedidoV2Test',c.input(f)),/VALIDACION_RECHAZA_tipo/);
  const x=estado(c,f),op=x.operaciones[0],plan=JSON.parse(op.snapshot_json),row=c.hojas.MOVIMIENTOS_STOCK.grid[1];
  assert.equal(op.estado_operacion,'APLICANDO');assert.equal(x.asignaciones.length,2);assert.deepEqual(stock(x),[4,7]);assert.equal(x.pedido.estado,'recibido');assert.equal(x.pedido.operacion_asignacion_vigente,undefined);
  assert.equal(row[0],plan.movimientos[0].movimiento_id);assert.equal(row[1],plan.creado_en);assert.equal(row.slice(2).every(v=>v===''),true);
  assert.equal(plan.movimientos[0].tipo,'ASIGNACION_V2');assert.equal(x.bloqueos.sku.length,2);assert.equal(x.bloqueos.pedidos[0],f.pedido.id_pedido);
});
test('C5 movimiento parcial sin metadata: retry local exige revisión, jamás adivina ni descuenta',async()=>{
  const c=await escenarioGasC5(),f=c.preparar();c.hojas.MOVIMIENTOS_STOCK.validaciones.tipo=['entrada','salida','ajuste','devolucion'];const i=c.input(f);
  vm.runInContext(await readFile('tests/fixtures/serializador-c5-v23.gs','utf8'),c.contexto);
  c.contexto.validarPlanPersistenciaC5_=()=>{};c.contexto.validarFilaPersistenciaC5_=()=>{};
  assert.throws(()=>c.accion('confirmarPedidoV2Test',i),/VALIDACION_RECHAZA_tipo/);const r=c.accion('confirmarPedidoV2Test',i),x=estado(c,f);
  assert.equal(r.estado_operacion,'REQUIERE_REVISION');assert.deepEqual(stock(x),[4,7]);assert.equal(x.asignaciones.length,2);assert.equal(c.hojas.MOVIMIENTOS_STOCK.getLastRow(),2);assert.equal(x.bloqueos.sku.length,2);
});
test('C5 confirmación conserva rechazo de contexto parcial; no asume apertura QA',async()=>{
  const c=await escenarioGasC5(),f=c.preparar(),p=c.hojas.PEDIDOS;
  p.grid[1][p.grid[0].indexOf('apertura_id')]='';const antes=c.estado.escrituras.length;
  assert.throws(()=>c.accion('confirmarPedidoV2Test',c.input(c.accion('obtenerAsignacionesPedidoV2Test',{id_pedido:f.pedido.id_pedido}))),/PEDIDO_CONTEXTO_CAMBIO/);assert.equal(c.estado.escrituras.length,antes);
  assert.equal(p.grid[1][p.grid[0].indexOf('apertura_id')],'');assert.equal(c.puerto().leer('OPERACIONES_PEDIDOS').length,0);assert.equal(f.pedido.estado,'recibido');
});
test('C5 preparación con mismo ID y distinta familia sintética rechaza sin efecto',async()=>{
  const c=await escenarioGasC5(),f=c.preparar(),antes=c.estado.escrituras.length;
  assert.throws(()=>c.accion('prepararFixturePedidoV2Test',{id_pedido:f.pedido.id_pedido,grupo:'OTRA',escenario:'UNIDAD'}),/PREPARACION_/);assert.equal(c.estado.escrituras.length,antes);
});

test('C5 ejecutor E2E completo sobre puerto GAS simulado, sin red',async()=>{
  const c=await escenarioGasC5(),etapas=[];
  const r=await ejecutarE2eC5(async(_label,action,body)=>{
    try{return {ok:true,data:c.accion(action,body)};}catch(e){return {ok:false,error:e.message,codigo:e.codigo};}
  },label=>etapas.push(label));
  assert.equal(r.solo_fixtures,true);assert.equal(etapas.length,20);assert.equal(r.escenarios.at(-1).segunda_ejecucion_cambios,0);
});
test('C5 puerto GAS A4+B2, readback, replay y cancelación exacta',async()=>{
  const c=await escenarioGasC5(),f=c.preparar(),i=c.input(f),r=c.accion('confirmarPedidoV2Test',i);
  assert.equal(r.estado_operacion,'COMPLETADA');assert.deepEqual(stock(estado(c,f)),[0,5]);assert.deepEqual(c.accion('confirmarPedidoV2Test',i),r);
  assert.equal(c.accion('verificarOperacionV2Test',{operacion_id:r.operacion_id}).valido,true);
  const antes=c.estado.escrituras.length;cancelar(c,f);assert.deepEqual(stock(estado(c,f)),[4,7]);const despues=c.estado.escrituras.length;
  assert.deepEqual(cancelar(c,f),c.accion('cancelarPedidoV2Test',{id_pedido:f.pedido.id_pedido,idempotency_key:'cancelar_qa_c5_12345',estado_esperado:'pendiente',apertura_id_esperada:'APE-20991231'}));assert.equal(c.estado.escrituras.length,despues);assert.ok(despues>antes);
});
test('C5 plan/resultados GAS coinciden con dominio Node C4 sobre mismo estado normalizado',async()=>{
  const c=await escenarioGasC5(),f=c.preparar(),i=c.input(f),p=c.puerto();
  const initial=Object.fromEntries(['PEDIDOS','DETALLE_PEDIDOS','PRODUCTOS','FAMILIAS_PRODUCTO','APERTURA_PRODUCTOS','MOVIMIENTOS_STOCK','ASIGNACIONES_PEDIDO','OPERACIONES_PEDIDOS'].map(n=>[n,c.plain(p.leer(n))]));
  const memory=crearEstadoSheetsMemoriaV2(initial),node=await confirmarPedidoV2Durable(new AlmacenSheetsMemoriaV2(memory),{...i,actor:'qa-c5'},{ahora:()=>c.utc}),gas=c.accion('confirmarPedidoV2Test',i);
  assert.deepEqual(gas,node);assert.equal(canonV2(JSON.parse(c.puerto().leer('OPERACIONES_PEDIDOS')[0].snapshot_json)),canonV2(JSON.parse(memory.hojas.OPERACIONES_PEDIDOS[0].snapshot_json)));
});
test('C5 mixto: un plan, tres SKU y dos asignaciones familiares; cancelación revierte V1+V2',async()=>{
  const c=await escenarioGasC5(),f=c.preparar('MIX','MIXTO'),r=c.accion('confirmarPedidoV2Test',c.input(f));
  const x=estado(c,f);assert.equal(x.operaciones.length,1);assert.equal(x.movimientos.length,3);assert.equal(x.asignaciones.length,2);assert.deepEqual(x.detalles.map(l=>l.modelo_linea),['SKU_V1','FAMILIA_V2']);assert.equal(r.stocks.length,3);
  cancelar(c,f);assert.deepEqual(estado(c,f).productos.map(s=>s.stock_actual),[4,7,6]);
});
test('C5 insuficiencia compartida entre V1 y V2: cero efecto/diario',async()=>{const c=await escenarioGasC5(),f=c.preparar('INS','INSUFICIENTE'),antes=c.estado.escrituras.length;assert.throws(()=>c.accion('confirmarPedidoV2Test',c.input(f)),/STOCK|ASIGNACION|INSUFICIENTE/);assert.equal(c.estado.escrituras.length,antes);assert.deepEqual(stock(estado(c,f)),[4,7]);});
for(const punto of ['PREPARADA','APLICANDO','ASIGNACION_1','ASIGNACION_2','MOVIMIENTO_1','MOVIMIENTO_2','ANTES_STOCK_1','STOCK_1','STOCK_2','ANTES_ESTADO_PEDIDO','ESTADO_PEDIDO','PUNTERO_VIGENTE','ANTES_READBACK','DESPUES_READBACK','COMPLETADA'])test('C5 GAS interrupción '+punto+'→nuevo puerto/replay único',async()=>{
  const c=await escenarioGasC5(),f=c.preparar(),i=c.input(f);assert.throws(()=>c.accion('confirmarPedidoV2Test',{...i,fallo_punto:punto}),/INTERRUPCION_QA/);
  const r=c.accion('confirmarPedidoV2Test',i),x=estado(c,f);assert.equal(r.estado_operacion,'COMPLETADA');assert.deepEqual(stock(x),[0,5]);assert.equal(x.operaciones.length,1);assert.equal(x.movimientos.length,2);assert.equal(x.asignaciones.length,2);assert.equal(new Set(x.movimientos.map(m=>m.movimiento_id)).size,2);cancelar(c,f);assert.deepEqual(stock(estado(c,f)),[4,7]);
});
test('C5 reasignación append-only/replay/cancelar distribución vigente',async()=>{const c=await escenarioGasC5(),f=c.preparar(),i=c.input(f);c.accion('confirmarPedidoV2Test',i);const nuevo={...c.input(f,'reasignar_qa_c5_12345',[1,5]),estado_esperado:'pendiente'};const r=c.accion('reasignarPedidoV2Test',nuevo);assert.deepEqual(stock(estado(c,f)),[3,2]);assert.equal(estado(c,f).asignaciones.length,4);assert.deepEqual(c.accion('reasignarPedidoV2Test',nuevo),r);cancelar(c,f);assert.deepEqual(stock(estado(c,f)),[4,7]);});
for(const tipo of ['CANCELAR','REASIGNAR'])for(const punto of ['PREPARADA','APLICANDO',...(tipo==='REASIGNAR'?['ASIGNACION_1','ASIGNACION_2']:[]),'MOVIMIENTO_1','MOVIMIENTO_2','ANTES_STOCK_1','STOCK_1','STOCK_2','ANTES_ESTADO_PEDIDO','ESTADO_PEDIDO','PUNTERO_VIGENTE','ANTES_READBACK','DESPUES_READBACK','COMPLETADA'])test('C5 GAS '+tipo+' fallo '+punto+'→replay sin doble reversión',async()=>{
  const c=await escenarioGasC5(),f=c.preparar();c.accion('confirmarPedidoV2Test',c.input(f));
  const action=tipo==='CANCELAR'?'cancelarPedidoV2Test':'reasignarPedidoV2Test',i={...c.input(f,'mutar_qa_c5_12345',[1,5]),estado_esperado:'pendiente',...(tipo==='CANCELAR'?{asignaciones:[]}: {})};
  assert.throws(()=>c.accion(action,{...i,fallo_punto:punto}),/INTERRUPCION_QA/);const r=c.accion(action,i);assert.equal(r.estado_operacion,'COMPLETADA');assert.deepEqual(c.accion(action,i),r);
  assert.deepEqual(stock(estado(c,f)),tipo==='CANCELAR'?[4,7]:[3,2]);if(tipo==='REASIGNAR')cancelar(c,f);assert.deepEqual(stock(estado(c,f)),[4,7]);
});
test('C5 caída después de setValues stock, antes de readback: receipt permite recuperar',async()=>{const c=await escenarioGasC5(),f=c.preparar(),i=c.input(f);c.estado.fallo={hoja:'PRODUCTOS',row:2};assert.throws(()=>c.accion('confirmarPedidoV2Test',i),/Caída después/);assert.equal(c.accion('confirmarPedidoV2Test',i).estado_operacion,'COMPLETADA');assert.deepEqual(stock(estado(c,f)),[0,5]);});
for(const base of [100,250,1000])test('C5 granel base'+base+' 150g/$203, revertir y replay exacto',async()=>{const c=await escenarioGasC5(),f=c.preparar('G'+base,'GRANEL'+base),i=c.input(f,'confirmar_granel_'+base,[75,75]);assert.equal(f.detalles[0].subtotal,203);c.accion('confirmarPedidoV2Test',i);assert.deepEqual(stock(estado(c,f)),[2-75/base,1.925]);assert.equal(estado(c,f).detalles[0].subtotal,203);cancelar(c,f);cancelar(c,f);assert.deepEqual(stock(estado(c,f)),[2,2]);});
test('C5 PERMITIR_SNAPSHOT, nuevo pedido inactivo rechazado, cancelación con SKU inactivo',async()=>{const c=await escenarioGasC5(),f=c.preparar();const ds=structuredClone(f.detalles);c.accion('configurarFixtureC5Test',{id:'FAM-QA-C5-ECO',cambio:'DESACTIVAR_FAMILIA'});assert.throws(()=>c.preparar('ECO','UNIDAD','NUEVO'),/FAMILIA_NO_VENDIBLE/);c.accion('confirmarPedidoV2Test',c.input(f));c.accion('configurarFixtureC5Test',{id:f.productos[0].id_producto,cambio:'INACTIVAR_SKU'});cancelar(c,f);assert.deepEqual(stock(estado(c,f)),[4,7]);assert.deepEqual(estado(c,f).detalles,ds);});
test('C5 autoría perdida: REVIEW/bloqueo, reconciliación QA probada, replay y cleanup',async()=>{
  const c=await escenarioGasC5(),f=c.preparar(),i=c.input(f);assert.throws(()=>c.accion('confirmarPedidoV2Test',{...i,fallo_punto:'STOCK_1'}),/INTERRUPCION_QA/);
  c.accion('configurarFixtureC5Test',{id:f.productos[0].id_producto,cambio:'PERDER_RECIBO_STOCK_QA'});
  const r=c.accion('confirmarPedidoV2Test',i);assert.equal(r.estado_operacion,'REQUIERE_REVISION');assert.equal(estado(c,f).bloqueos.sku.length,2);
  assert.throws(()=>c.accion('cleanupFixturesC5Test'),/INCOMPLETA/);assert.throws(()=>c.contexto.exigirSinBloqueoDurableC5_(c.ss,'',[f.productos[0].id_producto]),/RECURSO_BLOQUEADO/);
  const a=c.accion('reconciliarFixtureC5Test',{operacion_id:r.operacion_id});assert.equal(a.recibos_restaurados,1);assert.equal(c.accion('confirmarPedidoV2Test',i).estado_operacion,'COMPLETADA');cancelar(c,f);
  const cleanup=c.accion('cleanupFixturesC5Test');assert.equal(cleanup.stock_qa_restaurado,true);assert.equal(c.accion('cleanupFixturesC5Test').cambios,0);assert.equal(estado(c,f).productos.every(s=>s.activo==='NO'),true);
});
test('C5 guards: destino/token/schema/noQA/lock/conflicto key no mutan',async()=>{
  const c=await escenarioGasC5(),f=c.preparar(),i=c.input(f),antes=c.estado.escrituras.length;
  assert.throws(()=>c.accion('confirmarPedidoV2Test',{...i,id_pedido:'PED-COMERCIAL'}),/NO_QA/);
  assert.throws(()=>c.accion('confirmarPedidoV2Test',{...i,asignaciones:[{id_detalle_pedido:i.asignaciones[0].id_detalle_pedido,selecciones:[{producto_id:'PROD-COMERCIAL',cantidad_asignada:6}]}]}),/NO_QA/);
  c.estado.lock=true;assert.throws(()=>c.accion('confirmarPedidoV2Test',i),/LOCK/);c.estado.lock=false;assert.equal(c.estado.escrituras.length,antes);
  c.accion('confirmarPedidoV2Test',i);assert.throws(()=>c.accion('confirmarPedidoV2Test',{...i,asignaciones:[{...i.asignaciones[0],selecciones:i.asignaciones[0].selecciones.map(s=>({...s,cantidad_asignada:3}))}]}),/CONFLICTO_IDEMPOTENCIA/);
  const http=JSON.parse(c.contexto.doPost({postData:{contents:JSON.stringify({action:'cleanupFixturesC5Test',token:'incorrecto'})}}).getContent());assert.equal(http.ok,false);
  c.contexto.SPREADSHEET_ID='PRODUCCION';assert.throws(()=>c.accion('cleanupFixturesC5Test'),/Destino|destino/);
});
test('C5 fuente operativa original: doPost y seis guards exactos; resto idéntico',async()=>{
  const old=execFileSync('git',['show','30e047e:scripts/apps-script-pedidos.gs'],{encoding:'utf8'}).replaceAll('\r\n','\n'),current=(await readFile('scripts/apps-script-pedidos.gs','utf8')).replaceAll('\r\n','\n');
  const añadido=current.slice(current.indexOf('// INICIO DOMINIO DURABLE C5 GENERADO'));assert.ok(añadido.includes('crearPuertoDurableC5_'));
  const prefix=current.slice(0,current.indexOf('// INICIO DOMINIO DURABLE C5 GENERADO'));
  // Casos nuevos son el único cambio dentro del código preexistente en este punto.
  let sinCasos=prefix.replace(/      case 'prepararFixturePedidoV2Test':[\s\S]*?        return jsonOk_\(ejecutarAccionDurableC5Test_\(action, body\)\);\n/,'');
  for(const guard of Object.values(GUARDS_V1_C5))sinCasos=sinCasos.replace(guard,'');
  sinCasos=sinCasos.replace(' && movimientoCompletadoReporteC5_(movimiento, operacionesV2Reporte)','');
  assert.equal(sinLineasVacias(sinCasos),sinLineasVacias(old));
});
