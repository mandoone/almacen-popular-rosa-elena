import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {escenarioGasC5} from './helpers/sheets-c5-escenario.mjs';

async function parcial(){
  const c=await escenarioGasC5();
  vm.runInContext(await readFile('tests/fixtures/preparacion-c5-v22.gs','utf8'),c.contexto);
  assert.throws(()=>c.contexto.prepararFixtureC5V22_(c.ss,{grupo:'ECO',escenario:'UNIDAD',id_pedido:'PED-QA-C5-ECO-PRINCIPAL'}),/VALIDACION_RECHAZA_forma_pago/);
  return c;
}
test('C5 causa raíz v22: validación J interrumpe cabecera después de I; falta apertura por omisión',async()=>{
  const c=await parcial(),p=c.hojas.PEDIDOS;
  assert.deepEqual(c.plain(p.grid[1].slice(0,9)),['PED-QA-C5-ECO-PRINCIPAL',c.utc,'QA_C5','','Fixture sintÃ©tico C5','QA-C5',3900,'recibido','pendiente']);
  assert.equal(p.grid[1].slice(9).every(v=>v===''),true);
  assert.equal(c.hojas.APERTURAS.getLastRow(),1);assert.equal(c.hojas.APERTURA_PRODUCTOS.getLastRow(),3);
  assert.equal(c.hojas.DETALLE_PEDIDOS.getLastRow(),2);assert.equal(c.hojas.OPERACIONES_PEDIDOS.getLastRow(),1);
  const f=c.accion('obtenerAsignacionesPedidoV2Test',{id_pedido:p.grid[1][0]});
  assert.throws(()=>c.accion('confirmarPedidoV2Test',c.input(f)),/PEDIDO_CONTEXTO_CAMBIO/);
});
test('C5 preparación ausente: plan previo, apertura válida aislada y segundo llamado cero',async()=>{
  const c=await escenarioGasC5(),f=c.preparar();assert.equal(f.preparacion.estado_anterior,'AUSENTE');assert.equal(f.preparacion.readback_ok,true);
  assert.equal(c.estado.escrituras[0].hoja,'AUDITORIA_PRODUCTOS');assert.equal(c.hojas.APERTURAS.grid[1][0],'APE-20991231');
  assert.equal(c.contexto.validarYNormalizarApertura_(c.contexto.filaAObjeto_(c.contexto.leerHoja_(c.ss,'APERTURAS'),c.hojas.APERTURAS.grid[1])).estado_apertura,'por_confirmar');
  const antes=c.estado.escrituras.length,r=c.preparar();assert.equal(r.preparacion.cambios,0);assert.equal(r.preparacion.hash_plan,f.preparacion.hash_plan);assert.equal(c.estado.escrituras.length,antes);
});
test('C5 recuperación exacta del fixture real: solo J/K/N/O; fecha/detalle/SKU intactos',async()=>{
  const c=await parcial(),p=c.hojas.PEDIDOS,ds=JSON.stringify(c.hojas.DETALLE_PEDIDOS.grid),skus=JSON.stringify(c.hojas.PRODUCTOS.grid),prefix=p.grid[1].slice(0,9);
  const f=c.preparar('ECO','UNIDAD','PRINCIPAL');assert.equal(f.preparacion.fixture_c5_parcial_acreditado,true);assert.equal(f.preparacion.estado_anterior,'PARCIAL_ACREDITABLE');
  assert.deepEqual(c.plain(p.grid[1].slice(0,9)),c.plain(prefix));assert.equal(p.grid[1][9],'efectivo_al_retirar');assert.equal(p.grid[1][13],'APE-20991231');assert.equal(p.grid[1][14],'QA_C5');
  assert.equal(JSON.stringify(c.hojas.DETALLE_PEDIDOS.grid),ds);assert.equal(JSON.stringify(c.hojas.PRODUCTOS.grid),skus);
  assert.equal(f.movimientos.length+f.asignaciones.length+f.operaciones.length,0);
  const antes=c.estado.escrituras.length,r=c.preparar('ECO','UNIDAD','PRINCIPAL');assert.equal(r.preparacion.cambios,0);assert.equal(c.estado.escrituras.length,antes);
  assert.deepEqual(r.preparacion.campos_completados.find(x=>x.tabla==='PEDIDOS').campos,['forma_pago','observaciones','apertura_id','origen_pedido']);
});
for(const [nombre,mutar] of [
  ['detalle incompatible',c=>{c.hojas.DETALLE_PEDIDOS.grid[1][c.hojas.DETALLE_PEDIDOS.grid[0].indexOf('cantidad_solicitada')]=7;}],
  ['stock alterado',c=>{c.hojas.PRODUCTOS.grid[1][c.hojas.PRODUCTOS.grid[0].indexOf('stock_actual')]=3;}],
  ['precio familiar alterado',c=>{c.hojas.FAMILIAS_PRODUCTO.grid[1][c.hojas.FAMILIAS_PRODUCTO.grid[0].indexOf('precio_venta')]=660;}],
  ['apertura inesperada',c=>{c.hojas.PEDIDOS.grid[1][13]='APE-20991230';}],
  ['otra identidad',c=>{c.hojas.PEDIDOS.grid[1][4]='OTRO';}],
  ['movimiento existente',c=>{const h=c.hojas.MOVIMIENTOS_STOCK;h.grid.push(h.grid[0].map(k=>k==='producto_id'?'PROD-QA-C5-ECO-A':k==='referencia_id'?'PED-QA-C5-ECO-PRINCIPAL':''));}],
  ['operación existente',c=>{const h=c.hojas.OPERACIONES_PEDIDOS;h.grid.push(h.grid[0].map(k=>k==='id_pedido'?'PED-QA-C5-ECO-PRINCIPAL':k==='estado_operacion'?'COMPLETADA':k==='tipo_operacion'?'CONFIRMAR_V2':''));}],
  ['asignación existente',c=>{const h=c.hojas.ASIGNACIONES_PEDIDO;h.grid.push(h.grid[0].map(k=>k==='id_detalle_pedido'?'DPE-PED-QA-C5-ECO-PRINCIPAL-F':''));}],
])test('C5 preparación STOP sin cambios: '+nombre,async()=>{
  const c=await parcial();mutar(c);const antes=JSON.stringify(Object.fromEntries(Object.entries(c.hojas).map(([k,s])=>[k,s.grid])));
  assert.throws(()=>c.preparar('ECO','UNIDAD','PRINCIPAL'),/C5_PREPARACION|RECURSO_BLOQUEADO/);assert.equal(JSON.stringify(Object.fromEntries(Object.entries(c.hojas).map(([k,s])=>[k,s.grid]))),antes);
});
for(const hoja of ['AUDITORIA_PRODUCTOS','APERTURAS','FAMILIAS_PRODUCTO','PRODUCTOS','APERTURA_PRODUCTOS','DETALLE_PEDIDOS','PEDIDOS'])test('C5 preparación caída tras '+hoja+': nuevo proceso continúa plan sin duplicados',async()=>{
  const c=await escenarioGasC5();c.estado.fallo={hoja,row:2};assert.throws(()=>c.preparar(),/Caída después/);
  const f=c.preparar(),antes=c.estado.escrituras.length;assert.equal(f.preparacion.readback_ok,true);assert.equal(c.preparar().preparacion.cambios,0);assert.equal(c.estado.escrituras.length,antes);
  assert.equal(c.hojas.PEDIDOS.getLastRow(),2);assert.equal(c.hojas.DETALLE_PEDIDOS.getLastRow(),2);
});
test('C5 preparación readback corrupto y plan adulterado STOP',async()=>{
  const c=await escenarioGasC5();c.estado.fallo={hoja:'PEDIDOS',row:2};assert.throws(()=>c.preparar(),/Caída después/);
  c.hojas.PEDIDOS.grid[1][6]=3901;assert.throws(()=>c.preparar(),/INCONSISTENTE/);
  const h=c.hojas.AUDITORIA_PRODUCTOS,col=h.grid[0].indexOf('cambios_json'),p=JSON.parse(h.grid[1][col]);p.plan.grupo='OTRA';h.grid[1][col]=JSON.stringify(p);
  assert.throws(()=>c.preparar(),/PLAN_CORRUPTO/);
});
