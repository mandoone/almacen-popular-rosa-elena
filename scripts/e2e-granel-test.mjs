import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {writeFile,readFile,access} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {clienteCatalogoTest} from './lib/catalogo-operativo-test.mjs';
import {makeSessionToken} from '../src/lib/session.ts';
import {leerUsuariosAdmin} from '../src/lib/fase9/identidades.ts';
import {fechaHoraSantiago,seleccionarAperturaActivaParaPedidos} from '../src/lib/fase3b/pedidosAnticipados.ts';

assert.ok(process.argv.includes('--write-test')||process.argv.includes('--restore-test'));
const c=clienteCatalogoTest();await c.verificar();
const origen='http://localhost:3100';
const config=leerUsuariosAdmin(process.env.ADMIN_USERS_JSON);assert.equal(config.estado,'valida');
assert.deepEqual(config.usuarios.map(p=>p.actor_id).sort(),['test-admin','test-operacion','test-venta']);
const cookies={};
for(const p of config.usuarios) cookies[p.rol]=await makeSessionToken(process.env.ADMIN_SESSION_SECRET,{actor_id:p.actor_id,rol:p.rol,session_version:p.session_version,secret_version:process.env.ADMIN_SESSION_SECRET_VERSION});
const log=createWriteStream('operativa.local/next-granel.log');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','-p','3100'],{env:{...process.env,SITE_URL:origen},stdio:['ignore','pipe','pipe'],windowsHide:true});
child.stdout.pipe(log);child.stderr.pipe(log);
let estado;
const archivo='operativa.local/e2e-granel.json';
const guardar=()=>writeFile(archivo,JSON.stringify(estado,null,2));
const key=()=> 'granel_'+randomUUID().replaceAll('-','');
async function http(path,rol,method='GET',body,esperado=200,intento=1){
  try {
    const r=await fetch(origen+path,{method,headers:{Origin:origen,'Content-Type':'application/json',...(rol?{Cookie:'admin_session='+cookies[rol]}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(120000)});
    const j=await r.json();
    if(intento<3&&(method==='GET'||body?.idempotency_key)&&(r.status>=500||(r.status===400&&/^Acci[oó]n GET no reconocida/.test(String(j.error)))))return http(path,rol,method,body,esperado,intento+1);
    assert.equal(r.status,esperado,`HTTP ${path}: ${j.error??''}`);return j.data??j;
  }catch(e){if(intento<3&&(method==='GET'||body?.idempotency_key)&&(e.name==='TimeoutError'||e instanceof TypeError))return http(path,rol,method,body,esperado,intento+1);throw e;}
}
async function restaurar(){
  if(!estado)return;
  if(estado.pedido_id){const p=await c.get('obtenerPedido',{id_pedido:estado.pedido_id});if(p.pedido.estado_pedido!=='cancelado')await http('/api/admin/pedidos/'+estado.pedido_id,'operacion','POST',{idempotency_key:estado.cancel_key});}
  const a=await c.get('obtenerApertura',{apertura_id:estado.apertura_id});
  const apertura=a.apertura??a;
  if(apertura.estado_apertura!=='cerrada')await c.post('cambiarEstadoApertura',{apertura_id:estado.apertura_id,estado_apertura:'cerrada',actualizado_en_esperado:apertura.actualizado_en,responsable:'test-admin',idempotency_key:estado.close_key});
  const despues=await c.get('obtenerCatalogoOperativoTest');
  for(const p of estado.antes.hojas.find(h=>h.nombre==='PRODUCTOS').registros) assert.deepEqual(despues.hojas.find(h=>h.nombre==='PRODUCTOS').registros.find(d=>d.id_producto===p.id_producto),p,'Maestro/stock cambiado');
  for(const h of estado.antes.hojas.filter(h=>h.nombre!=='APERTURAS')) {
    const d=despues.hojas.find(d=>d.nombre===h.nombre);h.registros.forEach((r,i)=>assert.deepEqual(d.registros[i],r,`Historia ${h.nombre} ${i}`));
  }
  for(const a of estado.aperturas_antes) assert.deepEqual((await c.get('listarAperturas')).aperturas.find(d=>d.apertura_id===a.apertura_id),a);
  estado.restauracion='PASS';estado.despues=despues;await guardar();
  console.log('PASS | saldos/maestros e historia preexistente intactos; apertura sintetica cerrada');
}
try {
  for(let i=0;i<90;i++){try{const r=await fetch(origen+'/api/health',{signal:AbortSignal.timeout(2000)});if(r.ok){assert.equal((await r.json()).environment,'test');break;}}catch{}if(child.exitCode!==null)throw Error('Servidor local no inicio');await delay(500);}
  if(process.argv.includes('--await-ui')) {
    console.log('SERVIDOR TEST | listo para QA visual en localhost:3100');
    for(let i=0;i<300;i++){try{await access('operativa.local/granel-ui-ready');break;}catch{}if(i===299)throw Error('QA visual no confirmada');await delay(1000);}
  }
  if(process.argv.includes('--restore-test')) estado=JSON.parse(await readFile(archivo,'utf8'));
  else {
    const antes=await c.get('obtenerCatalogoOperativoTest');
    const aperturas=(await c.get('listarAperturas')).aperturas;
    assert.equal(seleccionarAperturaActivaParaPedidos(aperturas,fechaHoraSantiago()).tipo,'no_disponible','No alterar apertura real/activa');
    const fecha=process.argv[process.argv.indexOf('--fecha')+1];assert.match(fecha??'',/^\d{4}-\d{2}-\d{2}$/);assert.ok(fecha+'T11:00'>fechaHoraSantiago());
    const id='APE-'+fecha.replaceAll('-','');assert.ok(!aperturas.some(a=>a.apertura_id===id),'ID preexistente: no tocar');
    const p=antes.hojas.find(h=>h.nombre==='PRODUCTOS').registros.find(p=>p.id_producto==='PROD-001');
    assert.equal(p.modo_venta,'GRANEL');assert.equal(Number(p.precio_venta),1350);assert.ok(Number(p.stock_actual)>=0.25);
    const marcador='PILOTO-TEST-'+randomUUID().replaceAll('-','').slice(0,24);
    await c.post('crearBackupPilotoTest',{marcador,idempotency_key:key()});
    estado={antes,aperturas_antes:aperturas,apertura_id:id,marcador,cancel_key:key(),close_key:key()};await guardar();
    await c.post('crearApertura',{responsable:'test-admin',idempotency_key:key(),apertura:{apertura_id:id,fecha_apertura:fecha,hora_inicio:'11:00',hora_termino:'15:00',lugar:'QA SINTETICA GRANEL',cierre_pedidos_anticipados:fecha+'T10:00',estado_apertura:'activa',pedidos_anticipados_estado:'activo',modo_presencial_estado:'inactivo',mensaje_publico:'QA SINTETICA TEST',observaciones_internas:marcador}});
    const body={nombre_cliente:'QA SINTETICA GRANEL',telefono:'+56900000000',forma_pago:'efectivo_al_retirar',idempotency_key:key(),carrito:[{id_producto:'PROD-001',cantidad:250,precio:1,subtotal:1,modo_venta:'UNIDAD',gramos_referencia:1}],total:1};
    estado.create_body=body;await guardar();
    const pedido=await http('/api/pedidos',null,'POST',body);
    estado.pedido_id=pedido.id_pedido;await guardar();assert.equal(pedido.total,338);assert.equal(pedido.resumen[0].gramos_solicitados,250);
    const replay=await http('/api/pedidos',null,'POST',{...body,total:0});assert.equal(replay.id_pedido,pedido.id_pedido);
    const stock=async()=>Number((await c.get('obtenerCatalogoOperativoTest')).hojas.find(h=>h.nombre==='PRODUCTOS').registros.find(p=>p.id_producto==='PROD-001').stock_actual);
    assert.equal(await stock(),Number(p.stock_actual));
    const confirmar={estado_pedido:'pendiente',idempotency_key:key()};
    await http('/api/admin/pedidos/'+pedido.id_pedido,'venta','PATCH',confirmar);await http('/api/admin/pedidos/'+pedido.id_pedido,'venta','PATCH',confirmar);
    assert.equal(await stock(),Number(p.stock_actual)-250/Number(p.gramos_unidad_stock));
    await http('/api/admin/pedidos/'+pedido.id_pedido,'venta','POST',{idempotency_key:key()},403);
    await http('/api/admin/pedidos/'+pedido.id_pedido,'operacion','POST',{idempotency_key:estado.cancel_key});await http('/api/admin/pedidos/'+pedido.id_pedido,'operacion','POST',{idempotency_key:estado.cancel_key});
    assert.equal(await stock(),Number(p.stock_actual));
    estado.verificacion='PASS';await guardar();console.log('PASS | Arroz 250 g $338; precio manipulado ignorado; creacion/confirmacion/cancelacion y replay');
  }
  await restaurar();
} catch(e) {
  console.error('FAIL | '+e.message);process.exitCode=1;
  if(estado){estado.error=e.message;await guardar();try{await restaurar();}catch(r){console.error('FAIL | restauracion pendiente: '+r.message);}}
} finally {child.kill();log.end();}
