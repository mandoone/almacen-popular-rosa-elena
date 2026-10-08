/** C5: solo fixtures QA, destino TEST comprobado por cliente y por cada acción del servidor. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {validarConfiguracionF78,validarDestinoF78} from './lib/fase78-e2e-guardrails.mjs';
import {solicitarHttpC5} from './lib/http-test-c5.mjs';

export async function ejecutarE2eC5(call, progreso=()=>{}) {
  const results=[];
  const action=async(label,action,body={})=>{
    const response=await call(label,action,body);
    assert.equal(response.ok,true,`${label}: ${response.error ?? 'respuesta incierta'}`);
    return response.data;
  };
  const reject=async(label,act,body,pattern)=>{
    const response=await call(label,act,body);assert.equal(response.ok,false,label);
    assert.match(String(response.error),pattern,label);return response;
  };
  const state=(label,f)=>action(label,'obtenerAsignacionesPedidoV2Test',{id_pedido:f.pedido.id_pedido});
  const stocks=f=>f.productos.filter(s=>s.familia_id).map(s=>s.stock_actual);
  const input=(f,key,quantities=[4,2],estado='recibido')=>({
    id_pedido:f.pedido.id_pedido,idempotency_key:`qa_c5_${key}`,estado_esperado:estado,apertura_id_esperada:'APE-20991231',
    asignaciones:[{id_detalle_pedido:f.detalles.find(l=>l.modelo_linea==='FAMILIA_V2').id_detalle_pedido,
      selecciones:f.productos.filter(s=>s.familia_id).map((s,i)=>({producto_id:s.id_producto,cantidad_asignada:quantities[i]}))}],
  });
  const prepare=(grupo,escenario='UNIDAD',sufijo='PRINCIPAL')=>action(`${grupo}_${sufijo}_preparar`,'prepararFixturePedidoV2Test',{grupo,escenario,id_pedido:`PED-QA-C5-${grupo}-${sufijo}`});
  const verify=async(label,r)=>{assert.equal(r.estado_operacion,'COMPLETADA');assert.equal((await action(label,'verificarOperacionV2Test',{operacion_id:r.operacion_id})).valido,true);};
  const cancel=async(label,f)=>{
    const i={...input(f,`${label}_cancelar`),estado_esperado:'pendiente',asignaciones:[]};
    const r=await action(`${label}_cancelar`,'cancelarPedidoV2Test',i);await verify(`${label}_verificar_cancelacion`,r);
    assert.deepEqual(await action(`${label}_replay_cancelacion`,'cancelarPedidoV2Test',i),r);return state(`${label}_cancelado`,f);
  };
  const note=(escenario,evidencia)=>{results.push({escenario,...evidencia});progreso(escenario);};
  const f=await prepare('ECO'),i=input(f,'eco_confirmar');
  const r=await action('eco_confirmar','confirmarPedidoV2Test',i);await verify('eco_verificar',r);
  const x=await state('eco_confirmado',f);assert.deepEqual(stocks(x),[0,5]);assert.equal(x.asignaciones.length,2);assert.equal(x.movimientos.length,2);
  assert.deepEqual(await action('eco_replay','confirmarPedidoV2Test',i),r);
  assert.deepEqual(stocks(await cancel('eco',f)),[4,7]);note('A4+B2',{resultado:[0,5],cancelacion:[4,7]});

  const re=await prepare('ECO','UNIDAD','REASIGNAR');
  await action('reasignar_confirmar','confirmarPedidoV2Test',input(re,'reasignar_confirmar'));
  const rr=await action('reasignar','reasignarPedidoV2Test',input(re,'reasignar',[1,5],'pendiente'));await verify('reasignar_verificar',rr);
  const rx=await state('reasignado',re);assert.deepEqual(stocks(rx),[3,2]);assert.equal(rx.asignaciones.length,4);
  assert.deepEqual(await action('reasignar_replay','reasignarPedidoV2Test',input(re,'reasignar',[1,5],'pendiente')),rr);
  assert.deepEqual(stocks(await cancel('reasignar',re)),[4,7]);note('REASIGNACION',{distribucion:[1,5],historicas:4,cancelacion:[4,7]});

  const m=await prepare('MIXTO','MIXTO');const mr=await action('mixto_confirmar','confirmarPedidoV2Test',input(m,'mixto_confirmar'));await verify('mixto_verificar',mr);
  const mx=await state('mixto_confirmado',m);assert.equal(mx.operaciones.length,1);assert.equal(mx.movimientos.length,3);assert.equal(mx.asignaciones.length,2);
  assert.deepEqual(await action('mixto_replay','confirmarPedidoV2Test',input(m,'mixto_confirmar')),mr);
  assert.deepEqual(mx.detalles.map(l=>l.modelo_linea),['SKU_V1','FAMILIA_V2']);
  assert.deepEqual((await cancel('mixto',m)).productos.map(s=>s.stock_actual),[4,7,6]);note('MIXTO',{planes:1,efectos:3,asignaciones_familia:2});

  const ins=await prepare('INSUF','INSUFICIENTE');await reject('insuf_confirmar','confirmarPedidoV2Test',input(ins,'insuf_confirmar'),/STOCK|INSUFICIENTE/);
  const ix=await state('insuf_readback',ins);assert.deepEqual(stocks(ix),[4,7]);assert.equal(ix.operaciones.length,0);assert.equal(ix.movimientos.length,0);note('INSUFICIENCIA_GLOBAL',{efectos:0});
  const ic=await action('insuf_cancelar_recibido','cancelarPedidoV2Test',{id_pedido:ins.pedido.id_pedido,idempotency_key:'qa_c5_insuf_cancelar_recibido',estado_esperado:'recibido',apertura_id_esperada:'APE-20991231',asignaciones:[]});await verify('insuf_cancelar_verificar',ic);
  for(const base of [100,250,1000]){
    const g=await prepare('G'+base,'GRANEL'+base),gi=input(g,'granel_'+base,[75,75]);assert.equal(g.detalles[0].subtotal,203);
    const gr=await action('granel_'+base,'confirmarPedidoV2Test',gi);await verify('granel_verificar_'+base,gr);
    const gx=await state('granel_confirmado_'+base,g);assert.deepEqual(stocks(gx),[2-75/base,1.925]);assert.equal(gx.detalles[0].subtotal,203);
    assert.deepEqual(await action('granel_replay_'+base,'confirmarPedidoV2Test',gi),gr);
    const gn=input(g,'granel_reasignar_'+base,[50,100],'pendiente'),gre=await action('granel_reasignar_'+base,'reasignarPedidoV2Test',gn);await verify('granel_reasignar_verificar_'+base,gre);
    assert.deepEqual(await action('granel_reasignar_replay_'+base,'reasignarPedidoV2Test',gn),gre);
    const grx=await state('granel_reasignado_'+base,g);assert.deepEqual(stocks(grx),[2-50/base,1.9]);assert.equal(grx.detalles[0].subtotal,203);
    assert.deepEqual(stocks(await cancel('granel_'+base,g)),[2,2]);note('GRANEL_'+base,{gramos:150,subtotal:203,reasignacion:[50,100],cancelacion:[2,2]});
  }
  const snap=await prepare('SNAPSHOT');await action('familia_desactivar','configurarFixtureC5Test',{id:'FAM-QA-C5-SNAPSHOT',cambio:'DESACTIVAR_FAMILIA'});
  await reject('familia_nuevo_rechazo','prepararFixturePedidoV2Test',{grupo:'SNAPSHOT',escenario:'UNIDAD',id_pedido:'PED-QA-C5-SNAPSHOT-NUEVO'},/FAMILIA_NO_VENDIBLE/);
  const sr=await action('snapshot_confirmar','confirmarPedidoV2Test',input(snap,'snapshot_confirmar'));await verify('snapshot_verificar',sr);
  await action('sku_inactivar','configurarFixtureC5Test',{id:snap.productos[0].id_producto,cambio:'INACTIVAR_SKU'});
  const sx=await cancel('snapshot',snap);assert.deepEqual(stocks(sx),[4,7]);assert.deepEqual(sx.detalles,snap.detalles);note('PERMITIR_SNAPSHOT',{nuevo_rechazado:true,snapshot_preservado:true});

  for(const punto of ['PREPARADA','ASIGNACION_2','MOVIMIENTO_2','ANTES_STOCK_1','STOCK_1','ANTES_ESTADO_PEDIDO','DESPUES_READBACK','COMPLETADA']){
    const grupo='F'+punto.replaceAll('_','-'),ff=await prepare(grupo),fi=input(ff,'fallo_'+punto);
    await reject('fallo_'+punto,'confirmarPedidoV2Test',{...fi,fallo_punto:punto},/INTERRUPCION_QA/);
    const antes=await state('fallo_intermedio_'+punto,ff);assert.equal(antes.operaciones.length,1);
    const fr=await action('fallo_retry_'+punto,'confirmarPedidoV2Test',fi);await verify('fallo_verificar_'+punto,fr);
    const fx=await state('fallo_recuperado_'+punto,ff);assert.deepEqual(stocks(fx),[0,5]);assert.equal(fx.asignaciones.length,2);assert.equal(fx.movimientos.length,2);
    assert.equal(new Set(fx.movimientos.map(a=>a.movimiento_id)).size,2);assert.deepEqual(stocks(await cancel('fallo_'+punto,ff)),[4,7]);note('FALLO_'+punto,{recuperada:true,efectos_unicos:2});
  }
  for(const perdida of ['TIMEOUT','502']){
    const hf=await prepare('HTTP-'+perdida),hi=input(hf,'http_'+perdida);
    const completada=await action('http_backend_'+perdida,'confirmarPedidoV2Test',hi);
    // La respuesta se pierde en el cliente simulado; no se induce una avería en Google.
    const retry=await action('http_retry_'+perdida,'confirmarPedidoV2Test',hi);assert.deepEqual(retry,completada);
    const hx=await state('http_readback_'+perdida,hf);assert.equal(hx.movimientos.length,2);assert.equal(hx.asignaciones.length,2);
    assert.deepEqual(stocks(await cancel('http_'+perdida,hf)),[4,7]);note('HTTP_'+perdida,{perdida_respuesta_simulada:true,replay_sin_duplicacion:true});
  }
  const au=await prepare('AUTORIA'),ai=input(au,'autoria');
  await reject('autoria_fallo','confirmarPedidoV2Test',{...ai,fallo_punto:'STOCK_1'},/INTERRUPCION_QA/);
  await action('autoria_perder_recibo','configurarFixtureC5Test',{id:au.productos[0].id_producto,cambio:'PERDER_RECIBO_STOCK_QA'});
  const review=await action('autoria_review','confirmarPedidoV2Test',ai);assert.equal(review.estado_operacion,'REQUIERE_REVISION');
  const ax=await state('autoria_bloqueos',au);assert.equal(ax.bloqueos.sku.length,2);
  await reject('autoria_cleanup_bloqueado','cleanupFixturesC5Test',{},/INCOMPLETA/);
  await reject('autoria_nueva_bloqueada','confirmarPedidoV2Test',input(au,'autoria_otra'),/BLOQUEAD/);
  const rc=await action('autoria_reconciliar','reconciliarFixtureC5Test',{operacion_id:review.operacion_id});assert.equal(rc.recibos_restaurados,1);
  const ar=await action('autoria_retry','confirmarPedidoV2Test',ai);await verify('autoria_verificar',ar);
  assert.deepEqual(stocks(await cancel('autoria',au)),[4,7]);note('AUTORIA_INCIERTA',{bloqueada:true,recibo_auditado_restaurado:1,stock_reconstruido:false});

  const clean=await action('cleanup','cleanupFixturesC5Test');assert.equal(clean.stock_qa_restaurado,true);assert.equal(clean.evidencia_conservada,true);
  const twice=await action('cleanup_idempotencia','cleanupFixturesC5Test');assert.equal(twice.cambios,0);note('CLEANUP',{...clean,segunda_ejecucion_cambios:0});
  return {escenarios:results,solo_fixtures:true,evidencia_append_only:true};
}

async function main(){
  const config=validarConfiguracionF78(process.env);if(!config.ok)throw new Error('STOP_CONFIG_TEST');
  const writing=process.argv.includes('--write-test');
  if(writing&&process.env.E2E_C5_ENABLE_WRITES!=='SOLO_FIXTURES_C5_TEST')throw new Error('STOP_ESCRITURAS_C5_NO_HABILITADAS');
  const c=config.config;
  const get=async(action)=>{for(let intento=0;intento<3;intento++){try{const j=await solicitarHttpC5(c,'GET',action);if(!j.ok)throw new Error('STOP_LECTURA_TEST');return j.data;}catch(e){if(intento===2)throw e;}}};
  if(!validarDestinoF78(await get('verificarDestinoFase78Test')))throw new Error('STOP_DESTINO_TEST');
  if(!writing){console.log('PASS | destino TEST; sin escrituras');return;}
  // Conservar checkpoints fallidos v22/v23; reanudar el mismo pedido/key tras recovery acreditado.
  await mkdir('operativa.local',{recursive:true});const file='operativa.local/e2e-familias-c5-movimiento-recuperado.json';
  let saved={contrato:'EVIDENCIA_E2E_C5_1',inicio:new Date().toISOString(),calls:{}};
  try{saved=JSON.parse(await readFile(file,'utf8'));assert.equal(saved.contrato,'EVIDENCIA_E2E_C5_1');}catch(e){if(e.code!=='ENOENT')throw e;}
  const persist=()=>writeFile(file,JSON.stringify(saved,null,2));
  await persist();
  const call=async(label,action,body)=>{
    const input=JSON.stringify({action,...body});
    if(saved.calls[label]){assert.equal(saved.calls[label].input,input,'STOP_CHECKPOINT_DISTINTO');return saved.calls[label].response;}
    // Solo key durable, preparación por ID fijo o lectura: mismo payload exacto.
    // Configuración/reconciliación/cleanup no se reenvían tras una respuesta incierta.
    const reintentable=!!body.idempotency_key||action==='prepararFixturePedidoV2Test'||action.startsWith('obtener')||action==='verificarOperacionV2Test';
    let response;
    for(let intento=0;intento<(reintentable?3:1);intento++){
      try{response=await solicitarHttpC5(c,'POST',action,body);break;}catch{
        (saved.transportes_ambiguos??=[]).push({label,intento:intento+1,mismo_payload:true,fecha:new Date().toISOString()});await persist();
        if(intento===(reintentable?2:0))throw new Error('STOP_RESPUESTA_AMBIGUA_'+label);
      }
    }
    saved.calls[label]={input,response};saved.ultimo_paso=label;await persist();return response;
  };
  if(!saved.calls.ECO_PRINCIPAL_preparar){
    const current=await solicitarHttpC5(c,'POST','obtenerAsignacionesPedidoV2Test',{id_pedido:'PED-QA-C5-ECO-PRINCIPAL'});
    const f=current.data;assert.equal(current.ok,true,'STOP_PRINCIPAL_LECTURA');assert.equal(f.operaciones.length,1);
    assert.equal(f.operaciones[0].operacion_id,'OP-C4-bde46db073f83e4dd1bb7f37ac6c7f6f');assert.equal(f.operaciones[0].idempotency_key,'qa_c5_eco_confirmar');
    assert.equal(f.operaciones[0].estado_operacion,'APLICANDO');assert.equal(f.operaciones[0].paso,2);assert.equal(f.movimientos.length,1);assert.equal(f.asignaciones.length,2);
    assert.deepEqual(f.productos.map(s=>s.stock_actual),[4,7]);assert.equal(f.pedido.estado,'recibido');assert.equal(f.pedido.contexto_apertura_snapshot.apertura_id,'APE-20991231');
    saved.calls.ECO_PRINCIPAL_preparar={input:JSON.stringify({action:'prepararFixturePedidoV2Test',grupo:'ECO',escenario:'UNIDAD',id_pedido:'PED-QA-C5-ECO-PRINCIPAL'}),response:current,origen:'READBACK_PRINCIPAL_RECUPERADO_SIN_REPREPARAR'};await persist();
  }
  saved.resultado=await ejecutarE2eC5(call,label=>console.log('PASS | C5 '+label));saved.fin=new Date().toISOString();await persist();console.log('PASS | C5 E2E completo; evidencia privada conservada');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message?.replace(/https?:\/\/\S+/g,'[URL omitida]')??'STOP_C5');process.exitCode=1;});
