import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import {crearEscenarioCompra,objetos} from './helpers/compra-identidad-escenario.mjs';
import {idProductoAutomatico,unidadStockInicialGranel} from '../src/lib/fase8/altaProducto.ts';
import * as dto from '../src/lib/fase9/dtoAdmin.ts';
import * as env from '../src/lib/env.ts';
import * as respuestas from '../src/lib/appsScriptRespuesta.ts';
import {fetchAppsScriptTestSeguro} from '../src/lib/appsScriptTransporteTest.ts';
const cargar=(source,mocks,extras={})=>{const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>mocks[n]??assert.fail('Import no esperado '+n),...extras});return exports;};
async function rutaReal(){
 const c=await crearEscenarioCompra(),x=c.contexto,wire=[];
 x.SPREADSHEET_ID='1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM';x.ADMIN_TOKEN='fixture-local-no-credencial';
 x.ContentService={MimeType:{JSON:'json'},createTextOutput:t=>({setMimeType(){return this;},getContent:()=>t})};
 const request=async(url,init)=>{assert.equal(new URL(url).hostname,'script.google.com');const input=JSON.parse(init.body);wire.push(input);return Response.json(JSON.parse(x.doPost({postData:{contents:init.body}}).getContent()));};
 const client=cargar(await readFile('src/lib/appsScriptPedidos.ts','utf8'),{'./env':env,'./fase9/dtoAdmin':dto,'./appsScriptRespuesta':respuestas,'./appsScriptTransporteTest':{fetchAppsScriptTestSeguro:(u,i)=>fetchAppsScriptTestSeguro(u,i,request)}},{process:{env:{NEXT_PUBLIC_APP_ENV:'test',GOOGLE_SCRIPT_PEDIDOS_URL_TEST:'https://script.google.com/macros/s/QA_LOCAL/exec',GOOGLE_SCRIPT_ADMIN_TOKEN_TEST:x.ADMIN_TOKEN}},fetch:request,URL,crypto,console,setTimeout});
 const route=cargar(await readFile('src/app/api/admin/productos/route.ts','utf8'),{'next/server':{NextResponse:{json:(x,o)=>Response.json(x,o)}},'@/lib/fase8/altaProducto':{idProductoAutomatico},'@/lib/appsScriptPedidos':client,'@/lib/fase8/apiAdmin':{idempotencyKeyValida:v=>/^[A-Za-z0-9_-]{8,100}$/.test(v),respuestaErrorAdmin:e=>Response.json({ok:false,error:e.message},{status:e.status||500})},'@/lib/session':{actorIdFromRequest:()=> 'qa-regresion',sesionTieneCapacidad:()=>true},'@/lib/fase9/dtoAdmin':dto});
 return {c,wire,post:b=>route.POST(new Request('https://local/api/admin/productos',{method:'POST',body:JSON.stringify(b)}))};
}
const producto=base=>({nombre:'ENSAYO-TEST granel',categoria:'Granel',unidad_medida:unidadStockInicialGranel(base),modo_venta:'GRANEL',permite_decimal:'SI',paso_venta:0.001,gramos_referencia:1000,gramos_unidad_stock:base,precio_venta:1350,precio_costo:base,stock_minimo:0,prioridad:'media',activo:'SI',tipo_disponibilidad:'POR_APERTURA',imagen_url:''});
for(const base of [100,250,1000])test(`Alta granel base${base}: formulario→DTO→ruta→transporte→GAS; campo conservado, stock0 y replay`,async()=>{
 const r=await rutaReal(),antes=structuredClone(r.c.productos.filas),b={producto:producto(base),idempotency_key:'ALTA-BASE-'+base+'-123456',actor:'suplantado',responsable:'suplantado'};
 assert.equal(dto.dtoCreacionProductoAdmin(b).producto.gramos_unidad_stock,base);
 const http=await r.post(b),json=await http.json();assert.equal(http.status,201,JSON.stringify(json));
 const p=json.data;assert.equal(p.gramos_unidad_stock,base);assert.equal(p.unidad_medida,base===1000?'kg':'unidad');assert.equal(p.activo,'NO');assert.equal(p.stock_actual,0);
 assert.equal(r.wire[0].producto.gramos_unidad_stock,base);assert.equal(r.wire[0].responsable,'qa-regresion');assert.equal(r.wire[0].action,'crearProductoAdmin');
 assert.deepEqual(r.c.productos.filas.slice(0,antes.length),antes);assert.equal(r.c.hojas.AUDITORIA_PRODUCTOS.filas.length,1);
 const replay=await (await r.post(b)).json();assert.equal(replay.data.id_producto,p.id_producto);assert.equal(r.c.productos.filas.length,antes.length+1);assert.equal(r.c.hojas.AUDITORIA_PRODUCTOS.filas.length,1);
 const stored=objetos(r.c.productos).find(s=>s.id_producto===p.id_producto);assert.equal(stored.gramos_unidad_stock,base);
 assert.throws(()=>r.c.contexto.actualizarProductoAdmin_({producto_id:p.id_producto,cambios:{gramos_unidad_stock:base===250?100:250,unidad_medida:'unidad'},responsable:'qa-regresion',idempotency_key:'BASE-INMUTABLE-12345'}),/base historica/);
 assert.equal(objetos(r.c.productos).find(s=>s.id_producto===p.id_producto).gramos_unidad_stock,base);
});
test('Reproduce exactamente el 409 anterior: kg+base250 llega íntegro y falla sin crear producto/auditoría',async()=>{
 const r=await rutaReal(),antes=structuredClone(r.c.productos.filas),b={producto:{...producto(250),unidad_medida:'kg'},idempotency_key:'REGRESION-INVALIDA-123'};
 const res=await r.post(b);assert.equal(res.status,409);assert.match((await res.json()).error,/Modelo de granel incompleto/);assert.equal(r.wire[0].producto.gramos_unidad_stock,250);assert.deepEqual(r.c.productos.filas,antes);assert.equal(r.c.hojas.AUDITORIA_PRODUCTOS.filas.length,0);
});
test('Sin relajar D40/DTO: base inválida se rechaza y whitelist remota/local conserva el campo',async()=>{
 for(const b of [0,1,500,NaN,Infinity])assert.throws(()=>unidadStockInicialGranel(b));
 const remoto=execFileSync('git',['show','9200139:src/lib/fase9/dtoAdmin.ts'],{encoding:'utf8'});assert.match(remoto,/'gramos_unidad_stock'/);
 const d40=await readFile('src/lib/granel.ts','utf8'),old=execFileSync('git',['show','9200139:src/lib/granel.ts'],{encoding:'utf8'});assert.equal(d40.replaceAll('\r\n','\n'),old.replaceAll('\r\n','\n'));
});
