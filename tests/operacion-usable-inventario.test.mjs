import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import {readFile} from 'node:fs/promises';
import {gramosDesdeEntrada,prepararLineaConteo,acreditarMovimientoConteo} from '../src/lib/fase8/inventario.ts';
import {lineaCompraNatural} from '../src/lib/fase8/compraNatural.ts';
import {idProductoAutomatico} from '../src/lib/fase8/altaProducto.ts';
import * as dtos from '../src/lib/fase9/dtoAdmin.ts';
import {capacidadParaRuta} from '../src/lib/fase9/autorizacion.ts';
import {crearEscenarioCompra,objetos} from './helpers/compra-identidad-escenario.mjs';
const unidad={id_producto:'PROD-TEST-TURNO',nombre:'QA unidad',stock_actual:4,modo_venta:'UNIDAD'};
for(const [t,u,g] of [['750','g',750],['1,7','kg',1700],['5','kg',5000],['0,001','kg',1],['0','g',0]])test(`Turno: peso ${t}${u} = ${g}g`,()=>assert.equal(gramosDesdeEntrada(t,u,g===0),g));
for(const t of ['','NaN','-1','1e3','1.7','0.5','9007199254740992'])test(`Turno: peso inválido ${t}`,()=>assert.throws(()=>gramosDesdeEntrada(t,'g')));
for(const base of [100,250,1000])test(`Turno: inventario/compra natural en base${base} sin cambiar costo público`,()=>{
 const p={...unidad,modo_venta:'GRANEL',gramos_unidad_stock:base};
 const l=prepararLineaConteo(p,'1,7','kg','SESION1234','QA revisado');assert.equal(l.stock_contado,1700/base);assert.equal(l.stock_esperado,4);
 const c=lineaCompraNatural(p,'1,7','kg','1500');assert.equal(c.cantidad,1700/base);assert.equal(c.costo_unitario,1500*base/1000);assert.equal(c.subtotal,2550);
});
test('Turno: unidades enteras/cero, sin ceros inferidos ni contador negativo',()=>{
 assert.equal(prepararLineaConteo(unidad,'0','unidad','SESION1234','revisado').delta,-4);
 assert.throws(()=>prepararLineaConteo(unidad,'1.5','unidad','SESION1234','revisado'));
 assert.throws(()=>prepararLineaConteo(unidad,'5','unidad','SESION1234',''));
 assert.throws(()=>lineaCompraNatural(unidad,'1.5','unidad','100'));
});
test('Turno: saldo solo no acredita; referencia/autor/hash/efecto y duplicados',()=>{
 const l=prepararLineaConteo(unidad,'7','unidad','SESION1234','revisado');assert.equal(acreditarMovimientoConteo(l,'qa',[]),false);
 const m={referencia_tipo:'ajuste_admin',referencia_id:l.idempotency_key,producto_id:l.producto_id,usuario:'qa',payload_hash:'hash-servidor',cantidad:3,stock_anterior:4,stock_resultante:7,observaciones:l.observaciones};
 assert.equal(acreditarMovimientoConteo(l,'qa',[m]),true);
 const {observaciones,...moderno}=m;assert.equal(acreditarMovimientoConteo(l,'qa',[{...moderno,observacion:observaciones}]),true);
 for(const patch of [{usuario:'otro'},{stock_resultante:8},{payload_hash:''},{cantidad:4}])assert.throws(()=>acreditarMovimientoConteo(l,'qa',[{...m,...patch}]),/REVISION/);
 assert.throws(()=>acreditarMovimientoConteo(l,'qa',[m,m]),/duplicada/);
});
test('Turno: ajuste GAS real CAS y replay después de respuesta perdida, sin doble movimiento',async()=>{
 const c=await crearEscenarioCompra(),p=objetos(c.productos)[0];
 const input={producto_id:p.id_producto,stock_esperado:p.stock_actual,delta:3,motivo:'recuento_fisico',responsable:'qa',observaciones:'Inventario fixture',idempotency_key:'INV-PRUEBA-123456'};
 const r=c.contexto.ajustarStockAdmin_(input);assert.equal(r.stock_nuevo,7);
 assert.equal(c.contexto.ajustarStockAdmin_(input).stock_nuevo,7);assert.equal(c.hojas.MOVIMIENTOS_STOCK.filas.length,1);
 assert.throws(()=>c.contexto.ajustarStockAdmin_({...input,idempotency_key:'INV-OTRA-123456',stock_esperado:4}),/stock cambio/);
 assert.equal(objetos(c.productos)[0].stock_actual,7);assert.equal(c.hojas.MOVIMIENTOS_STOCK.filas.length,1);
});
test('Turno: ID alta estable por sesión/key, distinto actor/key produce otro SKU',async()=>{
 const a=await idProductoAutomatico('qa-admin','ALTA-KEY-123456');assert.match(a,/^PROD-TEST-WEB-[a-f0-9]{32}$/);assert.equal(a,await idProductoAutomatico('qa-admin','ALTA-KEY-123456'));
 assert.notEqual(a,await idProductoAutomatico('qa-otro','ALTA-KEY-123456'));assert.notEqual(a,await idProductoAutomatico('qa-admin','ALTA-KEY-987654'));
});
test('Turno: POST alta real usa actor de sesión, ID automático e inactivo; ignora stock/suplantación',async()=>{
 const source=await readFile(new URL('../src/app/api/admin/productos/route.ts',import.meta.url),'utf8'),exports={},llamadas=[];
 const mocks={'next/server':{NextResponse:{json:(x,o)=>Response.json(x,o)}},'@/lib/fase8/altaProducto':{idProductoAutomatico},'@/lib/appsScriptPedidos':{crearProductoAdmin:async(d,a)=>{llamadas.push({d,a});return {id_producto:d.producto_id,activo:d.producto.activo,stock_actual:0}}},'@/lib/fase8/apiAdmin':{idempotencyKeyValida:()=>true,respuestaErrorAdmin:e=>Response.json({ok:false,error:e.message},{status:500})},'@/lib/session':{actorIdFromRequest:()=> 'qa-sesion',sesionTieneCapacidad:()=>true},'@/lib/fase9/dtoAdmin':dtos};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>mocks[n]??assert.fail(n)});
 const input={idempotency_key:'ALTA-KEY-123456',actor:'fake',responsable:'fake',producto:{nombre:'QA',activo:'SI',stock_actual:999,marca:'QA'}};
 const r=await exports.POST(new Request('https://local/api/admin/productos',{method:'POST',body:JSON.stringify(input)}));assert.equal(r.status,201);assert.equal(llamadas[0].a,'qa-sesion');assert.equal(llamadas[0].d.producto.activo,'NO');assert.equal('stock_actual' in llamadas[0].d.producto,false);assert.equal('actor' in llamadas[0].d,false);
});
test('Turno: roles inventario/configuración y spoofing compras/gastos/ajustes',()=>{
 assert.equal(capacidadParaRuta('/admin/inventario'),'stock:ajustar');assert.equal(capacidadParaRuta('/admin/configuracion-inicial'),'configuracion:gestionar');
 for(const dto of [dtos.dtoCompraAdmin,dtos.dtoGastoAdmin,dtos.dtoAjusteStockAdmin]){const r=dto({actor:'fake',responsable:'fake',rol:'administracion'});assert.equal('responsable' in r,false);assert.equal('actor' in r,false);}
});

test('Turno: compra de SKU inactivo falla sin efectos; revisión/activación permite misma compra sin relajar backend',async()=>{
 const c=await crearEscenarioCompra(),h=c.productos.headers,activo=h.indexOf('activo');c.productos.filas[0][activo]='NO';
 const antes=c.estado();assert.throws(()=>c.contexto.crearCompra_(c.bodyCompra),/Producto inactivo/);assert.deepEqual(c.estado(),antes);
 c.contexto.actualizarProductoAdmin_({producto_id:c.bodyCompra.lineas[0].producto_id,cambios:{activo:'SI'},responsable:'qa-admin',idempotency_key:'ACTIVAR-REVISION-12345'});
 const r=c.contexto.crearCompra_(c.bodyCompra);assert.equal(r.compra.total,12*590+10*610);assert.equal(r.detalle.length,2);assert.equal(c.hojas.COMPRAS.filas.length,1);
});
