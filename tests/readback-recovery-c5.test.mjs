import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {hashRevision} from '../src/lib/familias/revisionV1.ts';
import {auditoriaRecoveryQaC5Valida,auditoriaReconciliacionOperacionQaC5Valida} from '../scripts/lib/readback-familias-c5.mjs';
import {escenarioGasC5} from './helpers/sheets-c5-escenario.mjs';
const plan=JSON.parse(await readFile('tests/fixtures/c5-v23-plan-parcial.json','utf8'));
async function fixture(){
  const c=await escenarioGasC5(),m=plan.movimientos[0];
  const serial=c.plain(c.contexto.serializarMovimientoV2ParaSheet_(m,plan,{modelo:'MOVIMIENTO_V2_PARCIAL_ACREDITADO',plan_hash:plan.plan_hash}));
  const p={modelo:'RECOVERY_MOVIMIENTO_C5_1',clasificacion:'MOVIMIENTO_V2_PARCIAL_ACREDITADO',operacion_id:plan.operacion_id,plan_hash:plan.plan_hash,antes:{id_movimiento:m.movimiento_id,fecha_hora:m.creado_en},fila_serializada:serial};
  const audit={auditoria_id:'AUD-QA-C5-REC-M0-'+plan.operacion_id.slice(6),accion:'RECUPERAR_MOVIMIENTO_PARCIAL_C5',entidad_tipo:'QA_C5',entidad_id:m.movimiento_id,referencia_id:plan.operacion_id,cambios_json:JSON.stringify(p),payload_hash:hashRevision(p),resultado_json:'completado'};
  const valores={MOVIMIENTOS_STOCK:[Object.keys(serial),Object.values(serial)],OPERACIONES_PEDIDOS:[['operacion_id','id_pedido','snapshot_json'],[plan.operacion_id,plan.pedido_antes.id_pedido,JSON.stringify(plan)]],AUDITORIA_PRODUCTOS:[Object.keys(audit),Object.values(audit)]};
  return {audit,valores};
}
test('C5 readback admite exclusivamente auditoría recovery ligada a plan/M0/fila/hash',async()=>{const f=await fixture();assert.equal(auditoriaRecoveryQaC5Valida(f.audit,f.valores),true);});
for(const cambio of ['hash','entidad','referencia','plan','movimiento','duplicado'])test('C5 readback recovery rechaza '+cambio,async()=>{
  const f=await fixture();if(cambio==='hash')f.audit.payload_hash='falso';if(cambio==='entidad')f.audit.entidad_id='OP-C4-OTRO-M-0';if(cambio==='referencia')f.audit.referencia_id='OTRA';
  if(cambio==='plan'){const p=JSON.parse(f.valores.OPERACIONES_PEDIDOS[1][2]);p.saldos[0].stock_resultante=9;f.valores.OPERACIONES_PEDIDOS[1][2]=JSON.stringify(p);}
  if(cambio==='movimiento')f.valores.MOVIMIENTOS_STOCK[1][f.valores.MOVIMIENTOS_STOCK[0].indexOf('cantidad')]=-99;
  if(cambio==='duplicado')f.valores.MOVIMIENTOS_STOCK.push(f.valores.MOVIMIENTOS_STOCK[1].slice());
  assert.equal(auditoriaRecoveryQaC5Valida(f.audit,f.valores),false);
});
test('C5 auditoría de resultado recovery solo cambia resultado_json del target acreditado',async()=>{
  const {audit,valores}=await fixture(),prueba={modelo:'AUDITORIA_QA_C5_1',antes:{...audit,resultado_json:''},despues:audit};
  const a={accion:'CONFIGURAR_FIXTURE_C5',entidad_tipo:'QA_C5',entidad_id:audit.auditoria_id,referencia_id:audit.auditoria_id,cambios_json:JSON.stringify(prueba),payload_hash:hashRevision(prueba)};
  assert.equal(auditoriaRecoveryQaC5Valida(a,valores),true);prueba.antes.payload_hash='falso';a.cambios_json=JSON.stringify(prueba);a.payload_hash=hashRevision(prueba);assert.equal(auditoriaRecoveryQaC5Valida(a,valores),false);
});

async function fixtureReconciliado(){
  const c=await escenarioGasC5(),f=c.preparar('AUTORIA','UNIDAD','PRINCIPAL'),input=c.input(f,'qa_c5_autoria');
  assert.throws(()=>c.accion('confirmarPedidoV2Test',{...input,fallo_punto:'STOCK_1'}),/INTERRUPCION_QA/);
  c.accion('configurarFixtureC5Test',{id:f.productos[0].id_producto,cambio:'PERDER_RECIBO_STOCK_QA'});
  const review=c.accion('confirmarPedidoV2Test',input);assert.equal(review.estado_operacion,'REQUIERE_REVISION');
  c.accion('reconciliarFixtureC5Test',{operacion_id:review.operacion_id});c.accion('confirmarPedidoV2Test',input);
  const valores=Object.fromEntries(Object.entries(c.hojas).map(([n,s])=>[n,c.plain(s.grid)]));
  const audits=valores.AUDITORIA_PRODUCTOS.slice(1).map(r=>Object.fromEntries(valores.AUDITORIA_PRODUCTOS[0].map((h,i)=>[h,r[i]??''])));
  return {valores,audit:audits.find(a=>a.entidad_id===review.operacion_id&&a.accion==='CONFIGURAR_FIXTURE_C5')};
}
test('C5 readback acredita transición QA mediante diario inmutable y cadena auditada de recibo',async()=>{
  const f=await fixtureReconciliado();assert.equal(auditoriaReconciliacionOperacionQaC5Valida(f.audit,f.valores),true);assert.equal(auditoriaRecoveryQaC5Valida(f.audit,f.valores),true);
});
for(const caso of ['pedido','reconciliacion_ausente','reconciliacion_duplicada','pre_inyeccion_ausente','restauracion_ausente','hash_pre_inyeccion','recibo_distinto','campo_extra','transicion_distinta','actor'])test('C5 cadena de reconciliación rechaza '+caso,async()=>{
  const f=await fixtureReconciliado(),v=f.valores,h=v.AUDITORIA_PRODUCTOS[0],idx=campo=>h.indexOf(campo);
  const row=accion=>v.AUDITORIA_PRODUCTOS.find((r,i)=>i>0&&r[idx('accion')]===accion);
  const eliminar=r=>v.AUDITORIA_PRODUCTOS.splice(v.AUDITORIA_PRODUCTOS.indexOf(r),1);
  if(caso==='pedido')v.OPERACIONES_PEDIDOS[1][v.OPERACIONES_PEDIDOS[0].indexOf('id_pedido')]='PED-REAL';
  if(caso==='reconciliacion_ausente')eliminar(row('QA_C5_RECONCILIAR'));
  if(caso==='reconciliacion_duplicada')v.AUDITORIA_PRODUCTOS.push(row('QA_C5_RECONCILIAR').slice());
  if(caso==='pre_inyeccion_ausente')eliminar(row('QA_C5_RECIBO_ANTES_FALLO'));
  if(caso==='restauracion_ausente')eliminar(v.AUDITORIA_PRODUCTOS.find((r,i)=>i>0&&r[idx('accion')]==='CONFIGURAR_FIXTURE_C5'&&JSON.parse(r[idx('cambios_json')]).despues.evidencia_stock_v2));
  if(caso==='hash_pre_inyeccion')row('QA_C5_RECIBO_ANTES_FALLO')[idx('payload_hash')]='falso';
  if(caso==='recibo_distinto'){const r=row('QA_C5_RECIBO_ANTES_FALLO'),p=JSON.parse(r[idx('cambios_json')]);p.antes.evidencia_stock_v2.efecto_id='OTRO';r[idx('cambios_json')]=JSON.stringify(p);r[idx('payload_hash')]=hashRevision(p);}
  if(caso==='campo_extra'||caso==='transicion_distinta'){const p=JSON.parse(f.audit.cambios_json);if(caso==='campo_extra')p.despues.payload_hash='OTRO';else p.despues.estado_operacion='COMPLETADA';f.audit.cambios_json=JSON.stringify(p);f.audit.payload_hash=hashRevision(p);}
  if(caso==='actor')f.audit.responsable='otro';
  assert.equal(auditoriaReconciliacionOperacionQaC5Valida(f.audit,v),false);assert.equal(auditoriaRecoveryQaC5Valida(f.audit,v),false);
});
