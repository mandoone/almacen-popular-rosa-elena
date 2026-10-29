/** Solo localhost/memoria. Se bloquea toda red externa, también Google. No deploy. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {crearEscenarioCompra,objetos} from '../tests/helpers/compra-identidad-escenario.mjs';
import {makeSessionToken} from '../src/lib/session.ts';
assert.ok(process.argv.includes('--local-mocks'));
const require=createRequire(import.meta.url),original=fs.readFileSync('tsconfig.json'),originalFetch=fetch;
for(const k of Object.keys(process.env))if(/GOOGLE|SCRIPT|SHEET|CSV|ADMIN_|NEXT_PUBLIC_APP_ENV/.test(k))process.env[k]='';
for(const name of ['.env.local','.env.development.local'])if(fs.existsSync(name))for(const line of fs.readFileSync(name,'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_0-9]+)=/);if(m&&/GOOGLE|SCRIPT|SHEET|CSV|ADMIN_/.test(m[1]))process.env[m[1]]='';}
const actor='qa-visual-admin',secret=randomBytes(32).toString('hex'),token=randomBytes(24).toString('hex');
process.env.NEXT_PUBLIC_APP_ENV='test';process.env.NODE_ENV='development';process.env.NEXT_TEST_WASM='1';
process.env.ADMIN_SESSION_SECRET=secret;process.env.ADMIN_SESSION_SECRET_VERSION='v1';process.env.ADMIN_USERS_JSON='base64url:'+Buffer.from(JSON.stringify([{actor_id:actor,nombre:'ENSAYO-TEST visual',rol:'administracion',active:true,session_version:1,password_hash:'pbkdf2-sha256$310000$'+randomBytes(24).toString('base64url')+'$'+randomBytes(32).toString('base64url')}])).toString('base64url');
process.env.ADMIN_LEGACY_RECOVERY_ENABLED='false';process.env.GOOGLE_SCRIPT_PEDIDOS_URL_TEST='https://script.google.com/macros/s/LOCAL_VISUAL_TURNO/exec';process.env.GOOGLE_SCRIPT_ADMIN_TOKEN_TEST=token;
const c=await crearEscenarioCompra(),x=c.contexto,Hoja=c.productos.constructor;
x.SPREADSHEET_ID='1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM';x.ADMIN_TOKEN=token;
x.ContentService={MimeType:{JSON:'application/json'},createTextOutput:t=>({setMimeType(){return this;},getContent:()=>t})};
for(const n of ['GASTOS_EXTRA','CAJA_COMPRA'])c.hojas[n]=new Hoja(n,[...x.COLUMNAS_FASE_7_8[n]],[],c.control);
c.hojas.CIERRES_CAJA=new Hoja('CIERRES_CAJA',[...x.COLUMNAS_CIERRES_CAJA_TURNO],[],c.control);
for(const n of ['VENTAS','DETALLE_VENTAS'])c.hojas[n]=new Hoja(n,[...x.COLUMNAS_VENTA_PRESENCIAL[n],'idempotency_key','payload_hash'],[],c.control);
const ps=objetos(c.productos).map((p,i)=>({...p,id_producto:i?'PROD-TEST-VISUAL-G':'PROD-TEST-VISUAL-U',nombre:i?'ENSAYO-TEST Arroz granel':'ENSAYO-TEST Unidad QA',familia_id:'',marca:'QA interna',precio_venta:i?1350:1000,precio_costo:i?250:600,stock_actual:i?10.8:8,modo_venta:i?'GRANEL':'UNIDAD',gramos_referencia:i?1000:0,gramos_unidad_stock:i?250:0,contenido_unidad:i?'g':'unidad',contenido_cantidad:i?250:1}));
c.productos.filas=ps.map(p=>c.productos.headers.map(h=>p[h]??''));
x.obtenerResumenApertura_=()=>({apertura_id:'APE-20260924',total_pedidos_anticipados:0,total_ventas_presenciales:2203,total_general:2203,cantidad_pedidos_anticipados:0,cantidad_ventas_presenciales:1,total_pendiente_pago:0,cantidad_pendientes_pago:0,total_cancelado:1203,cantidad_cancelados:1,total_cobrado:2203,total_efectivo_esperado:2203,total_transferencia:0,total_efectivo_al_retirar:0,advertencias:[]});
const cookie=await makeSessionToken(secret,{actor_id:actor,nombre:'ENSAYO-TEST visual',rol:'administracion',session_version:1,secret_version:'v1'});
globalThis.fetch=async(input,init={})=>{
 const u=new URL(typeof input==='string'?input:input.url??String(input));
 if(['localhost','127.0.0.1'].includes(u.hostname))return originalFetch(input,init);
 if(u.href.startsWith(process.env.GOOGLE_SCRIPT_PEDIDOS_URL_TEST)){
  const post=init.method==='POST',data=post?x.doPost({postData:{contents:init.body}}):x.doGet({parameter:Object.fromEntries(u.searchParams)});
  return Response.json(JSON.parse(data.getContent()));
 }
 throw Error('RED_REMOTA_BLOQUEADA_QA_VISUAL');
};
const baseBuild=fs.mkdtempSync(path.join(os.tmpdir(),'almacen-turno-visual-'));
fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(baseBuild,'node_modules'),'junction');
const destino=path.join(baseBuild,'build');
const configPath=require.resolve('next/dist/server/config'),config=require(configPath),load=config.default;
require.cache[configPath].exports={...config,__esModule:true,default:async(...args)=>{
 const cfg=await load(...args);cfg.distDir=path.relative(process.cwd(),destino);cfg.experimental={...cfg.experimental,useWasmBinary:true};return cfg;
}};
const app=require('next')({dev:true,dir:process.cwd(),hostname:'localhost',port:3106,conf:{distDir:path.relative(process.cwd(),destino),experimental:{useWasmBinary:true}}});
await app.prepare();const handle=app.getRequestHandler();
const server=createServer((req,res)=>{if(req.url==='/__qa_ingreso'){res.writeHead(302,{'Set-Cookie':`admin_session=${cookie}; Path=/; HttpOnly; SameSite=Strict`,Location:'/admin/inventario'});res.end();}else handle(req,res);});
server.listen(3106,'127.0.0.1',()=>console.log('READY localhost:3106/__qa_ingreso | solo memoria; red externa bloqueada; ninguna credencial impresa'));
const cerrar=()=>{fs.writeFileSync('tsconfig.json',original);server.close();process.exit(0);};process.on('SIGINT',cerrar);process.on('SIGTERM',cerrar);
