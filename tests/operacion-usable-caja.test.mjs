import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {crearEscenarioCompra,objetos} from './helpers/compra-identidad-escenario.mjs';
import {prepararArqueoTurno,COLUMNAS_CIERRES_CAJA_TURNO} from '../src/lib/fase8/cajaTurno.ts';
import {dtoGastoAdmin} from '../src/lib/fase9/dtoAdmin.ts';
import {capacidadParaRuta} from '../src/lib/fase9/autorizacion.ts';
import {planEsquemaCajaTurno} from '../scripts/plan-esquema-caja-turno.mjs';
const resumen={apertura_id:'APE-20260924',total_cobrado:3000,total_efectivo_esperado:2000,total_transferencia:1000,total_pendiente_pago:500,cantidad_pendientes_pago:1,advertencias:[]};
const gastos=[{gasto_id:'GAS-QA',apertura_id:resumen.apertura_id,forma_pago:'efectivo',monto:200}];
async function escenario(){
 const c=await crearEscenarioCompra(),ctx=c.contexto,Hoja=c.productos.constructor;
 ctx.SPREADSHEET_ID='1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM';
 c.hojas.CIERRES_CAJA=new Hoja('CIERRES_CAJA',[...COLUMNAS_CIERRES_CAJA_TURNO],[],c.control);
 c.hojas.GASTOS_EXTRA=new Hoja('GASTOS_EXTRA',[...ctx.COLUMNAS_FASE_7_8.GASTOS_EXTRA],[],c.control);
 ctx.obtenerResumenApertura_=()=>structuredClone(resumen);
 ctx.listarVentasPorApertura_=()=>[];
 c.fuente=()=>ctx.obtenerCajaTurnoTest_(resumen.apertura_id);
 c.input=()=>({apertura_id:resumen.apertura_id,responsable:'qa-actor',saldo_inicial:1000,efectivo_contado:3000,observaciones:'ENSAYO-TEST revisado; pendientes identificados',fuente_hash:c.fuente().fuente_hash,revision_confirmada:true,idempotency_key:'CIERRE-QA-123456'});
 return c;
}
test('Arqueo: efectivo + saldo - gastos explícitos; transferencias y pendientes separados',()=>{
 const p=prepararArqueoTurno(resumen,[...gastos,{...gastos[0],gasto_id:'OTRO',apertura_id:'APE-20261001',monto:999}],1000,2800);
 assert.equal(p.efectivo_esperado,2800);assert.equal(p.diferencia,0);assert.equal(p.transferencias_cobradas,1000);assert.equal(p.pagos_pendientes,500);assert.equal(p.advertencias.length,1);
});
for(const n of [NaN,Infinity,-1,1.5,Number.MAX_SAFE_INTEGER+1])test(`Arqueo rechaza monto ${n}`,()=>assert.throws(()=>prepararArqueoTurno(resumen,gastos,n,0)));
test('Arqueo rechaza gasto duplicado o sin medio y conserva diferencia explícita',()=>{
 assert.throws(()=>prepararArqueoTurno(resumen,[...gastos,...gastos],0,0));
 assert.throws(()=>prepararArqueoTurno(resumen,[{...gastos[0],forma_pago:'otro'}],0,0));
 assert.equal(prepararArqueoTurno(resumen,gastos,0,1000).diferencia,-800);
});
test('GAS: tabla exacta, paridad del cálculo, cierre confirmado y replay inmutable',async()=>{
 const c=await escenario(),x=c.contexto,input=c.input();
 const r=x.registrarCierreCajaTurnoTest_(input);
 assert.equal(r.estado_cierre,'CONFIRMADA');assert.equal(r.responsable,'qa-actor');assert.equal(r.efectivo_esperado,3000);
 assert.deepEqual(JSON.parse(JSON.stringify(x.calcularArqueoTurno_({resumen,gastos},1000,2800))),Object.fromEntries(Object.entries(prepararArqueoTurno(resumen,gastos,1000,2800)).filter(([k])=>k!=='advertencias')));
 const antes=structuredClone(c.hojas.CIERRES_CAJA.filas);assert.deepEqual(x.registrarCierreCajaTurnoTest_(input),r);assert.deepEqual(c.hojas.CIERRES_CAJA.filas,antes);
 assert.throws(()=>x.registrarCierreCajaTurnoTest_({...input,efectivo_contado:1}),/otro contenido/);
 assert.throws(()=>x.registrarCierreCajaTurnoTest_({...input,idempotency_key:'OTRA-CIERRE-123456'}),/CAJA_CERRADA/);
});
test('GAS: CAS de fuente rechaza cobros cambiados antes de escribir',async()=>{
 const c=await escenario(),i=c.input();c.contexto.obtenerResumenApertura_=()=>({...resumen,total_efectivo_esperado:99});
 assert.throws(()=>c.contexto.registrarCierreCajaTurnoTest_(i),/FUENTE_CAMBIO/);assert.equal(c.hojas.CIERRES_CAJA.filas.length,0);
});
test('GAS: caída tras diario PREPARADA se recupera con la misma clave, sin duplicar',async()=>{
 const c=await escenario(),i=c.input(),flush=c.contexto.SpreadsheetApp.flush;let fallo=true;
 c.contexto.SpreadsheetApp.flush=()=>{if(fallo){fallo=false;throw Error('timeout después de escribir');}return flush();};
 assert.throws(()=>c.contexto.registrarCierreCajaTurnoTest_(i),/timeout/);assert.equal(objetos(c.hojas.CIERRES_CAJA)[0].estado_cierre,'PREPARADA');
 assert.throws(()=>c.contexto.exigirCajaNoCerradaTurno_(c.spreadsheet,resumen.apertura_id),/CAJA_CERRADA/);
 const r=c.contexto.registrarCierreCajaTurnoTest_(i);assert.equal(r.estado_cierre,'CONFIRMADA');assert.equal(c.hojas.CIERRES_CAJA.filas.length,1);
});
test('GAS: timeout después de CONFIRMADA, retry devuelve resultado sin otra fila',async()=>{
 const c=await escenario(),i=c.input();let n=0;c.contexto.SpreadsheetApp.flush=()=>{if(++n===2)throw Error('502');};
 assert.throws(()=>c.contexto.registrarCierreCajaTurnoTest_(i),/502/);assert.equal(objetos(c.hojas.CIERRES_CAJA)[0].estado_cierre,'CONFIRMADA');
 assert.equal(c.contexto.registrarCierreCajaTurnoTest_(i).estado_cierre,'CONFIRMADA');assert.equal(c.hojas.CIERRES_CAJA.filas.length,1);
});
test('GAS: fuente cambió tras PREPARADA, no adivina ni confirma',async()=>{
 const c=await escenario(),i=c.input();c.contexto.SpreadsheetApp.flush=()=>{throw Error('corte');};
 assert.throws(()=>c.contexto.registrarCierreCajaTurnoTest_(i));c.contexto.SpreadsheetApp.flush=()=>{};
 c.contexto.obtenerResumenApertura_=()=>({...resumen,total_transferencia:777});
 assert.throws(()=>c.contexto.registrarCierreCajaTurnoTest_(i),/FUENTE_CAMBIO/);assert.equal(objetos(c.hojas.CIERRES_CAJA)[0].estado_cierre,'PREPARADA');
});
test('GAS: snapshot corrupto, duplicados o readback corrupto nunca se completan',async()=>{
 const c=await escenario(),i=c.input();c.contexto.registrarCierreCajaTurnoTest_(i);
 const col=c.hojas.CIERRES_CAJA.headers.indexOf('snapshot_json');c.hojas.CIERRES_CAJA.filas[0][col]='{}';
 assert.throws(()=>c.contexto.registrarCierreCajaTurnoTest_(i),/snapshot/);
 c.hojas.CIERRES_CAJA.filas.push([...c.hojas.CIERRES_CAJA.filas[0]]);assert.throws(()=>c.contexto.registrarCierreCajaTurnoTest_(i),/duplicada/);
});
test('Gasto: asociación explícita por DTO; sin retroatribución; actor no falsificable',async()=>{
 const d=dtoGastoAdmin({apertura_id:resumen.apertura_id,forma_pago:'efectivo',monto:200,responsable:'fake',observaciones:'QA'});
 assert.equal('responsable' in d,false);assert.equal(JSON.parse(d.observaciones).apertura_id,resumen.apertura_id);
 assert.throws(()=>dtoGastoAdmin({apertura_id:resumen.apertura_id,forma_pago:'otro'}));
 const c=await escenario(),b={categoria:'otros',descripcion:'ENSAYO-TEST',monto:200,responsable:'qa',observaciones:d.observaciones,idempotency_key:'GASTO-TURNO-12345'};
 const g=c.contexto.crearGastoExtra_(b);assert.equal(c.fuente().gastos.length,1);
 c.contexto.crearGastoExtra_({...b,observaciones:'histórico sin asociación',idempotency_key:'GASTO-SIN-123456'});assert.equal(c.fuente().gastos_sin_asociacion,1);
 c.contexto.registrarCierreCajaTurnoTest_(c.input());
 assert.equal(c.contexto.crearGastoExtra_(b).gasto_id,g.gasto_id);
 assert.throws(()=>c.contexto.crearGastoExtra_({...b,idempotency_key:'GASTO-NUEVO-12345'}),/CAJA_CERRADA/);
});
test('GAS: contrato ausente conserva guard legacy y no crea tablas en GET',async()=>{
 const c=await escenario();delete c.hojas.CIERRES_CAJA;
 assert.doesNotThrow(()=>c.contexto.exigirCajaNoCerradaTurno_(c.spreadsheet,resumen.apertura_id));
 assert.throws(()=>c.fuente(),/no instalado/);assert.equal('CIERRES_CAJA' in c.hojas,false);
});
test('Cierre: TEST exacto, sin saldos implícitos, sin estado/actor suplantado',async()=>{
 const c=await escenario(),i=c.input();for(const patch of [{saldo_inicial:''},{efectivo_contado:null},{revision_confirmada:false},{observaciones:''}])assert.throws(()=>c.contexto.registrarCierreCajaTurnoTest_({...i,...patch}));
 c.contexto.SPREADSHEET_ID='otra';assert.throws(()=>c.contexto.registrarCierreCajaTurnoTest_(i),/Destino/);
 assert.equal(c.hojas.CIERRES_CAJA.filas.length,0);assert.equal(capacidadParaRuta('/api/admin/caja-turno','POST'),'caja:gestionar');
});
test('Ruta real cierre: lista cerrada y actor firmado; Venta no recibe capacidad caja',async()=>{
 const source=await fs.readFile('src/app/api/admin/caja-turno/route.ts','utf8'),exports={},llamadas=[];
 const mocks={'next/server':{NextResponse:{json:(x,o)=>Response.json(x,o)}},'@/lib/appsScriptPedidos':{obtenerCajaTurnoAdmin:()=>({}),registrarCierreCajaTurnoAdmin:(d,a)=>{llamadas.push({d,a});return{};}},'@/lib/session':{actorIdFromRequest:()=> 'actor-sesion'},'@/lib/fase8/apiAdmin':{idempotencyKeyValida:()=>true,respuestaErrorAdmin:e=>Response.json({error:e.message},{status:500})}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>mocks[n]??assert.fail(n),URL});
 const c=await escenario(),input={...c.input(),responsable:'fake',actor:'fake',estado_cierre:'CONFIRMADA',efectivo_esperado:999};
 const r=await exports.POST(new Request('https://local/api/admin/caja-turno',{method:'POST',body:JSON.stringify(input)}));assert.equal(r.status,200);
 assert.equal(llamadas[0].a,'actor-sesion');assert.equal('responsable' in llamadas[0].d,false);assert.equal('estado_cierre' in llamadas[0].d,false);assert.equal('efectivo_esperado' in llamadas[0].d,false);
});
test('Fuente runtime coincide con Apps Script desplegable',async()=>{
 const gs=await fs.readFile('scripts/apps-script-pedidos.gs','utf8'),rt=await fs.readFile('scripts/runtime-caja-turno.gs','utf8');assert.ok(gs.includes(rt.trim()));
});
test('Migrador de caja: solo hoja nueva, idempotente, destino/headers incorrectos bloqueados',()=>{
 const input={id:'1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM',nombre:'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES',hojas:[]};
 const plan=planEsquemaCajaTurno(input);assert.equal(plan.length,3);assert.equal(plan[0].addSheet.properties.title,'CIERRES_CAJA');
 assert.deepEqual(planEsquemaCajaTurno({...input,hojas:['CIERRES_CAJA'],headersExistentes:[...COLUMNAS_CIERRES_CAJA_TURNO]}),[]);
 assert.throws(()=>planEsquemaCajaTurno({...input,id:'otro'}));assert.throws(()=>planEsquemaCajaTurno({...input,hojas:['CIERRES_CAJA'],headersExistentes:['id']}));
});
