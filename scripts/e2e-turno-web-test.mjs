/** Turno HTTP por las rutas Next reales, backend TEST real. Credenciales sintéticas efímeras solo en memoria.
 * Requiere backup ya verificado, despliegue verificado y autorización explícita --write-test.
 * No es una ruta de la aplicación ni se incorpora al bundle público.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {randomBytes,pbkdf2Sync} from 'node:crypto';
import {solicitarHttpC5} from './lib/http-test-c5.mjs';
import {idProductoAutomatico,unidadStockInicialGranel} from '../src/lib/fase8/altaProducto.ts';
import {leerUsuariosAdmin} from '../src/lib/fase9/identidades.ts';
import {normalizarAperturaAdminRespuesta} from '../src/lib/fase3b/adminAperturas.ts';

assert.ok(process.argv.includes('--write-test'),'Sin --write-test no se ejecuta el turno.');
assert.ok(process.argv.includes('--backup-verificado=1qf_VINtC-xif7kan7Vu9nTSZnznLAjIGnp6g2TK21E8'),'Backup verificado obligatorio.');
assert.equal(process.env.NEXT_PUBLIC_APP_ENV,'test');
assert.ok(!process.env.GOOGLE_SCRIPT_PEDIDOS_URL && !process.env.GOOGLE_SCRIPT_ADMIN_TOKEN,'Variables productivas prohibidas.');
const url=process.env.GOOGLE_SCRIPT_PEDIDOS_URL_TEST,token=process.env.GOOGLE_SCRIPT_ADMIN_TOKEN_TEST;
assert.ok(url && token);assert.equal(new URL(url).hostname,'script.google.com');
const pre=await solicitarHttpC5({url,token},'GET','verificarDestinoFase78Test');
assert.equal(pre.ok,true);assert.equal(pre.data.sheet_nombre,'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES');

const require=createRequire(import.meta.url),tsconfig=fs.readFileSync('tsconfig.json'),base='http://localhost:3108';
const claves=new Map(),usuarios=['venta','operacion','administracion'].map(rol=>{
 const password=randomBytes(24).toString('base64url'),salt=randomBytes(24),actor_id=`qa-sprint-${rol}`;
 claves.set(actor_id,password);
 return {actor_id,nombre:`ENSAYO-TEST ${rol}`,rol,active:true,session_version:1,password_hash:`pbkdf2-sha256$310000$${salt.toString('base64url')}$${pbkdf2Sync(password,salt,310000,32,'sha256').toString('base64url')}`};
});
for(const k of Object.keys(process.env))if(/^ADMIN_/.test(k))process.env[k]='';
process.env.ADMIN_USERS_JSON='base64url:'+Buffer.from(JSON.stringify(usuarios)).toString('base64url');process.env.ADMIN_SESSION_SECRET=randomBytes(32).toString('hex');
process.env.ADMIN_SESSION_SECRET_VERSION='1';process.env.ADMIN_LEGACY_RECOVERY_ENABLED='false';process.env.NODE_ENV='development';process.env.NEXT_TEST_WASM='1';
// No permitir que dotenv rellene las referencias productivas eliminadas por el wrapper.
process.env.GOOGLE_SCRIPT_PEDIDOS_URL='';process.env.GOOGLE_SCRIPT_ADMIN_TOKEN='';
const baseBuild=fs.mkdtempSync(path.join(os.tmpdir(),'almacen-turno-web-'));
fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(baseBuild,'node_modules'),'junction');
const destino=path.join(baseBuild,'build');
const configPath=require.resolve('next/dist/server/config'),config=require(configPath),load=config.default;
require.cache[configPath].exports={...config,__esModule:true,default:async(...args)=>{
 const cfg=await load(...args);cfg.distDir=path.relative(process.cwd(),destino);cfg.experimental={...cfg.experimental,useWasmBinary:true};return cfg;
}};
const app=require('next')({dev:true,dir:process.cwd(),hostname:'localhost',port:3108,conf:{distDir:path.relative(process.cwd(),destino),experimental:{useWasmBinary:true}}});
let server;const cookies=new Map(),evidencias=[];
const estadoPath='operativa.local/e2e-turno-web-20261028.json';
const estado=fs.existsSync(estadoPath)?JSON.parse(fs.readFileSync(estadoPath,'utf8')):{modelo:'ENSAYO-TEST-20261028',pasos:{}};
assert.equal(estado.modelo,'ENSAYO-TEST-20261028');
const soloLectura=process.argv.includes('--solo-readback');
if(soloLectura)assert.equal(estado.resultado,'PASS','Readback final exige turno previamente completado');
const guardar=()=>fs.writeFileSync(estadoPath,JSON.stringify(estado,null,2));
const key=s=>`TURNO-USABLE-20261028-${s}`;
async function http(ruta,metodo='GET',body,actor='qa-sprint-administracion',esperado){
 assert.ok(ruta.startsWith('/api/'));
 if(soloLectura && metodo!=='GET' && ruta!=='/api/admin/auth/logout')throw Error('READBACK_ONLY: mutacion bloqueada');
 const r=await fetch(base+ruta,{method:metodo,redirect:'manual',headers:{Origin:base,...(cookies.has(actor)?{Cookie:cookies.get(actor)}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(300000)});
 const j=await r.json().catch(()=>({error:'Respuesta no JSON'}));
 if(esperado){assert.equal(r.status,esperado,`${ruta}: estado ${r.status}`);return j;}
 if(!r.ok || !j.ok)throw Error(`${ruta}: ${r.status} ${j.error || 'sin dato'}`);
 return j.data;
}
async function paso(nombre,fn){
 if(nombre in estado.pasos){console.log('REPLAY LOCAL ACREDITADO | '+nombre);return estado.pasos[nombre];}
 const r=await fn();estado.pasos[nombre]=r??true;estado.resultado='EN_CURSO';delete estado.error;guardar();console.log('PASS | '+nombre);return r;
}
const actor='qa-sprint-administracion',idU=await idProductoAutomatico(actor,key('ALTA-U')),idG=await idProductoAutomatico(actor,key('ALTA-G')),ids=[idU,idG],apId='APE-20261028';
const productoBase={nombre:'ENSAYO-TEST unidad turno',categoria:'Alimentos',marca:'QA TURNO',presentacion:'1 unidad QA',contenido_cantidad:1,contenido_unidad:'unidad',modo_venta:'UNIDAD',unidad_medida:'unidad',permite_decimal:'NO',paso_venta:1,precio_venta:1000,precio_costo:500,stock_minimo:0,prioridad:'media',activo:'NO',tipo_disponibilidad:'POR_APERTURA',imagen_url:''};
async function stocks(u,g){const ps=await http('/api/admin/productos');for(const [i,n]of[[idU,u],[idG,g]]){const p=ps.find(p=>p.id_producto===i);assert.ok(p && p.nombre.startsWith('ENSAYO-TEST'));assert.ok(Math.abs(p.stock_actual-n)<1e-8,`saldo ${i}`);}return {unidad:u,granel_base250:g};}
async function producto(id,cambios,ref){assert.ok(ids.includes(id));return http('/api/admin/productos','PATCH',{producto_id:id,cambios,idempotency_key:key(ref),responsable:'suplantado'});}
try{
 await app.prepare();assert.equal(leerUsuariosAdmin(process.env.ADMIN_USERS_JSON).estado,'valida','Registro QA efímero válido después de dotenv');const handle=app.getRequestHandler();server=createServer((req,res)=>handle(req,res));await new Promise(r=>server.listen(3108,'127.0.0.1',r));
 for(const u of usuarios){
  const r=await fetch(base+'/api/admin/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({actor_id:u.actor_id,password:claves.get(u.actor_id)})});
  assert.equal(r.status,200);const cookie=r.headers.get('set-cookie');assert.ok(cookie);cookies.set(u.actor_id,cookie.split(';')[0]);
  const me=await http('/api/admin/auth/me','GET',null,u.actor_id);assert.equal(me.actor_id,u.actor_id);assert.equal(me.rol,u.rol);
 }
 console.log('PASS | login individual efímero y permisos de tres roles; secretos no persistidos');
 if(Object.keys(estado.pasos).length===1 && estado.pasos.alta_unidad){
  const ps=await http('/api/admin/productos'),u=ps.find(p=>p.id_producto===idU);
  assert.ok(u && u.nombre===productoBase.nombre && u.activo==='NO' && u.stock_actual===0 && u.precio_costo===500 && u.precio_venta===1000 && !u.familia_id,'Unidad existente conciliada antes de continuar');
  assert.equal(ps.some(p=>p.id_producto===idG),false,'Granel ya existe sin paso acreditado: conciliar antes de repetir');
  console.log('PASS | precondición de reanudación: unidad existente intacta, granel ausente; no se recrea unidad');
 }
 await http('/api/admin/caja-turno?apertura_id='+apId,'GET',null,'qa-sprint-venta',403);
 if(!soloLectura)await http('/api/admin/productos','POST',{idempotency_key:key('DENEGADO')},'qa-sprint-operacion',403);
 await paso('alta_unidad',async()=>{const p=await http('/api/admin/productos','POST',{producto:productoBase,idempotency_key:key('ALTA-U'),responsable:'suplantado'});assert.equal(p.id_producto,idU);assert.equal(p.activo,'NO');assert.equal(p.stock_actual,0);return {id_producto:p.id_producto};});
 await paso('alta_granel',async()=>{const p=await http('/api/admin/productos','POST',{producto:{...productoBase,nombre:'ENSAYO-TEST granel turno',modo_venta:'GRANEL',unidad_medida:unidadStockInicialGranel(250),permite_decimal:'SI',paso_venta:0.001,gramos_referencia:1000,gramos_unidad_stock:250,contenido_cantidad:250,contenido_unidad:'g',presentacion:'Granel QA base250g',precio_venta:1350,precio_costo:250},idempotency_key:key('ALTA-G')});assert.equal(p.id_producto,idG);assert.equal(p.stock_actual,0);return {id_producto:p.id_producto};});
 for(const [id,delta,label]of[[idU,5,'U'],[idG,6.8,'G']])await paso('conteo_'+label,async()=>{const b={producto_id:id,delta,stock_esperado:0,motivo:'recuento_fisico',observaciones:'Inventario ENSAYO-TEST parcial; no representa existencia comercial',idempotency_key:key('INV-'+label)};await http('/api/admin/stock/ajustes','POST',b);await http('/api/admin/stock/ajustes','POST',b);const m=await http(`/api/admin/stock/ajustes?producto_id=${id}&referencia_id=${b.idempotency_key}`);assert.equal(m.length,1);assert.equal(m[0].usuario,actor);return {movimiento_id:m[0].movimiento_id,stock_contado:delta};});
 for(const [id,label]of[[idU,'U'],[idG,'G']])await paso('activar_'+label,async()=>{await producto(id,{activo:'SI'},'ACTIVAR-'+label);return {producto_id:id,activo:'SI',publicacion:'POR_APERTURA aun sin habilitar'};});
 await paso('compra',async()=>{
  const b={fecha:'2026-10-28',proveedor:'ENSAYO-TEST Proveedor1',observaciones:'Compra sintética de turno',idempotency_key:key('COMPRA'),lineas:[{producto_id:idU,cantidad:3,costo_unitario:600},{producto_id:idG,cantidad:4,costo_unitario:250}],responsable:'suplantado'};
  let lista=await http('/api/admin/compras'),recibo=lista.find(c=>c.idempotency_key===b.idempotency_key);
  if(!recibo){await stocks(5,6.8);await http('/api/admin/compras','POST',b);lista=await http('/api/admin/compras');recibo=lista.find(c=>c.idempotency_key===b.idempotency_key);}
  assert.ok(recibo,'Readback de compra obligatorio, nunca asumir un POST exitoso');
  assert.equal(lista.filter(c=>c.idempotency_key===b.idempotency_key).length,1);
  const detalle=await http('/api/admin/compras/'+recibo.compra_id);assert.equal(detalle.compra.responsable,actor);assert.equal(detalle.compra.proveedor,b.proveedor);assert.equal(detalle.compra.total,2800);assert.equal(detalle.detalle.length,2);
  for(const l of b.lineas){const d=detalle.detalle.find(d=>d.producto_id===l.producto_id);assert.ok(d);assert.equal(d.cantidad,l.cantidad);assert.equal(d.costo_unitario,l.costo_unitario);assert.equal(d.marca_snapshot,'QA TURNO');}
  await stocks(8,10.8);return {compra_id:recibo.compra_id,total:detalle.compra.total,readback:true};
 });
 await paso('apertura',async()=>{const a={apertura_id:apId,fecha_apertura:'2026-10-28',hora_inicio:'23:58',hora_termino:'23:59',lugar:'ENSAYO-TEST TURNO SIN PUBLICACION COMERCIAL',cierre_pedidos_anticipados:'2026-10-28T23:57',estado_apertura:'activa',pedidos_anticipados_estado:'activo',modo_presencial_estado:'inactivo',mensaje_publico:'ENSAYO-TEST sintético',observaciones_internas:'Fixture aislado turno web; no apertura comercial'};const r=await http('/api/admin/aperturas','POST',{apertura:a,idempotency_key:key('APERTURA')});assert.equal(r.apertura_id,apId);return {apertura_id:apId};});
 for(const [id,label]of[[idU,'U'],[idG,'G']])await paso('habilitar_'+label,async()=>{await http(`/api/admin/aperturas/${apId}/productos`,'PATCH',{producto_id:id,habilitado:true,habilitado_esperado:false,idempotency_key:key('HABILITAR-'+label)});return {producto_id:id};});
 const ped=await paso('pedido_web',async()=>{const b={nombre_cliente:'ENSAYO-TEST turno web',telefono:'QA-TEST',forma_pago:'efectivo_al_retirar',observaciones:'ENSAYO-TEST pedido sintético',carrito:[{id_producto:idU,cantidad:1},{id_producto:idG,cantidad:150}],idempotency_key:key('PEDIDO')};const r=await http('/api/pedidos','POST',b),r2=await http('/api/pedidos','POST',b);assert.equal(r.id_pedido,r2.id_pedido);assert.equal(r.total,1203);await stocks(8,10.8);return {id_pedido:r.id_pedido,total:r.total};});
 await paso('abrir_presencial',async()=>{
  const a=normalizarAperturaAdminRespuesta(await http('/api/admin/aperturas/'+apId));
  assert.equal(a.lugar,'ENSAYO-TEST TURNO SIN PUBLICACION COMERCIAL');
  const cambio={...a,hora_inicio:'00:00',hora_termino:'23:59',cierre_pedidos_anticipados:'2026-10-27T23:59',pedidos_anticipados_estado:'cerrado',modo_presencial_estado:'activo'};
  await http('/api/admin/aperturas/'+apId,'PATCH',{apertura:cambio,actualizado_en_esperado:a.actualizado_en,idempotency_key:key('INICIAR-PRESENCIAL')});
  return {apertura_id:apId,anticipados:'cerrados',presencial:'activo',solo_apertura_qa:true};
 });
 await paso('venta_presencial',async()=>{const b={apertura_id:apId,fecha_hora:'2026-10-28T15:00',lineas:[{producto_id:idU,cantidad:2},{producto_id:idG,cantidad:150}],forma_pago:'efectivo',observaciones:'ENSAYO-TEST venta',vendedor:'suplantado',idempotency_key:key('VENTA')};const r=await http('/api/admin/ventas','POST',b, 'qa-sprint-venta');const r2=await http('/api/admin/ventas','POST',b,'qa-sprint-venta');assert.equal(r.venta.venta_id,r2.venta.venta_id);assert.equal(r.venta.vendedor,'qa-sprint-venta');assert.equal(r.venta.total,2203);await stocks(6,10.2);return {venta_id:r.venta.venta_id,total:r.venta.total};});
 const ruta='/api/admin/pedidos/'+ped.id_pedido;
 await paso('confirmacion',async()=>{const b={estado_pedido:'pendiente',idempotency_key:key('CONFIRMAR')};await http(ruta,'PATCH',b,'qa-sprint-venta');await http(ruta,'PATCH',b,'qa-sprint-venta');await stocks(5,9.6);return {estado:'pendiente'};});
 await paso('pago',async()=>{await http(ruta,'PATCH',{estado_pedido:'pendiente',estado_pago:'pagado_efectivo',idempotency_key:key('PAGO')},'qa-sprint-venta');const r=await http(ruta);assert.equal(r.pedido.estado_pago,'pagado_efectivo');return {estado_pago:r.pedido.estado_pago};});
 await paso('cancelacion',async()=>{const b={idempotency_key:key('CANCELAR')};await http(ruta,'POST',b,'qa-sprint-operacion');await http(ruta,'POST',b,'qa-sprint-operacion');await stocks(6,10.2);return {estado:'cancelado'};});
 await paso('reposicion',async()=>{const r=await http('/api/admin/compras','POST',{fecha:'2026-10-28',proveedor:'ENSAYO-TEST Proveedor2',observaciones:'Mismo SKU, proveedor distinto',idempotency_key:key('REPOSICION'),lineas:[{producto_id:idU,cantidad:2,costo_unitario:650}]},'qa-sprint-operacion');await stocks(8,10.2);assert.equal(r.compra.proveedor,'ENSAYO-TEST Proveedor2');return {compra_id:r.compra.compra_id};});
 await paso('gasto',async()=>{const b={categoria:'materiales',descripcion:'ENSAYO-TEST gasto de turno',monto:200,apertura_id:apId,forma_pago:'efectivo',observaciones:'Gasto sintético, no saldo oficial',idempotency_key:key('GASTO')};const r=await http('/api/admin/gastos','POST',b,'qa-sprint-operacion'),r2=await http('/api/admin/gastos','POST',b,'qa-sprint-operacion');assert.equal(r.gasto_id,r2.gasto_id);assert.equal(JSON.parse(r.observaciones).apertura_id,apId);return {gasto_id:r.gasto_id};});
 await paso('arqueo_cierre',async()=>{const f=await http('/api/admin/caja-turno?apertura_id='+apId);assert.equal(f.resumen.total_efectivo_esperado,2203);assert.equal(f.resumen.total_pendiente_pago,0);assert.equal(f.gastos.length,1);const b={apertura_id:apId,saldo_inicial:500,efectivo_contado:2503,observaciones:'ENSAYO-TEST revisión sintética; saldos no oficiales',fuente_hash:f.fuente_hash,revision_confirmada:true,idempotency_key:key('CIERRE')};const r=await http('/api/admin/caja-turno','POST',b,'qa-sprint-operacion'),r2=await http('/api/admin/caja-turno','POST',b,'qa-sprint-operacion');assert.equal(r.cierre_id,r2.cierre_id);assert.equal(r.estado_cierre,'CONFIRMADA');assert.equal(r.efectivo_esperado,2503);assert.equal(r.diferencia,0);const f2=await http('/api/admin/caja-turno?apertura_id='+apId);assert.equal(f2.cierres.length,1);return {cierre_id:r.cierre_id,esperado:2503,contado:2503,diferencia:0};});
 await paso('bloqueo_turno_cerrado',async()=>{await http('/api/admin/gastos','POST',{categoria:'otros',descripcion:'ENSAYO-TEST rechazo esperado',monto:1,apertura_id:apId,forma_pago:'efectivo',observaciones:'No debe escribirse',idempotency_key:key('RECHAZO')},'qa-sprint-operacion',409);return {bloqueo:true};});
 for(const [id,label,actual]of[[idU,'U',8],[idG,'G',10.2]])await paso('cleanup_'+label,async()=>{await http('/api/admin/stock/ajustes','POST',{producto_id:id,delta:-actual,stock_esperado:actual,motivo:'recuento_fisico',observaciones:'ENSAYO-TEST cleanup lógico a baseline0; historia preservada',idempotency_key:key('CLEANUP-'+label)},'qa-sprint-operacion');await producto(id,{activo:'NO'},'INACTIVAR-'+label);await http(`/api/admin/aperturas/${apId}/productos`,'PATCH',{producto_id:id,habilitado:false,habilitado_esperado:true,idempotency_key:key('DESHABILITAR-'+label)});return {producto_id:id,stock_final:0,activo:'NO'};});
 await paso('cleanup_apertura',async()=>{const a=normalizarAperturaAdminRespuesta(await http('/api/admin/aperturas/'+apId));await http('/api/admin/aperturas/'+apId,'PATCH',{apertura:{...a,estado_apertura:'cerrada',pedidos_anticipados_estado:'cerrado',modo_presencial_estado:'inactivo'},actualizado_en_esperado:a.actualizado_en,idempotency_key:key('CERRAR-AP')});return {apertura_id:apId,estado:'cerrada'};});
 await paso('historial_reportes',async()=>{
  const d=await http('/api/admin/reportes?desde=2026-10-28&hasta=2026-10-28&apertura_id='+apId,'GET',null,'qa-sprint-operacion');
  for(const id of [estado.pasos.compra.compra_id,estado.pasos.reposicion.compra_id])assert.equal(d.compras.filter(c=>c.compra_id===id).length,1);
  assert.equal(d.gastos.filter(g=>g.gasto_id===estado.pasos.gasto.gasto_id).length,1);
  const movimientos=d.movimientos_stock.filter(m=>ids.includes(m.producto_id || m.id_producto));assert.equal(movimientos.length,13);
  assert.equal(new Set(movimientos.map(m=>m.movimiento_id || m.id_movimiento)).size,13);
  assert.equal(d.historial_costos.filter(h=>ids.includes(h.producto_id)).length,3);
  assert.equal(d.pedidos.find(p=>p.id_pedido===ped.id_pedido).estado_pedido,'cancelado');
  assert.equal(d.ventas.filter(v=>v.venta_id===estado.pasos.venta_presencial.venta_id).length,1);
  assert.equal(d.resumen_apertura.total_efectivo_esperado,2203);
  return {movimientos:13,costos:3,compras:2,gastos:1,pedido_cancelado:true,solo_lectura:true};
 });
 await stocks(0,0);const final=await http('/api/admin/caja-turno?apertura_id='+apId);assert.equal(final.cierres[0].estado_cierre,'CONFIRMADA');
 const catalogo=await http('/api/admin/ventas?apertura_id='+apId);assert.equal(catalogo.productos.some(p=>ids.includes(p.id_producto)),false);
 for(const u of usuarios){await http('/api/admin/auth/logout','POST',{},u.actor_id);cookies.delete(u.actor_id);await http('/api/admin/auth/me','GET',null,u.actor_id,401);}
 estado.resultado='PASS';delete estado.error;estado.cleanup={stocks:[0,0],inactivos:true,apertura_cerrada:true,historia_preservada:true};guardar();
 console.log('PASS | TURNO WEB TEST COMPLETO, readback, tres roles, replay y cleanup lógico. Solo fixtures propios.');
}catch(e){estado.resultado='STOP_PARCIAL';estado.error=String(e.message);guardar();console.error('STOP | '+e.message);process.exitCode=1;}
finally{cookies.clear();claves.clear();if(server)await new Promise(r=>server.close(r));await app.close();fs.writeFileSync('tsconfig.json',tsconfig);}
process.exit(process.exitCode ?? 0);
