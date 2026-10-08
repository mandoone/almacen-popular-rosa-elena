import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {hashRevision} from '../src/lib/familias/revisionV1.ts';
import {auditoriaRecoveryQaC5Valida} from '../scripts/lib/readback-familias-c5.mjs';
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
