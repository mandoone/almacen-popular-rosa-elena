import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {clienteCatalogoTest} from './lib/catalogo-operativo-test.mjs';
import {fechaHoraSantiago,seleccionarAperturaActivaParaPedidos} from '../src/lib/fase3b/pedidosAnticipados.ts';

const modo=process.argv[2], fichero='operativa.local/e2e-disponibilidad.json';
const origen=process.env.CATALOGO_QA_LOCAL_URL;
if(!['--prepare-test','--verify-test','--restore-test'].includes(modo)||origen!=='http://localhost:3100')throw Error('Solo QA local TEST en puerto 3100.');
const cliente=clienteCatalogoTest();
const health=await fetch(origen+'/api/health',{signal:AbortSignal.timeout(10000)});
assert.equal(health.status,200,'Health local indisponible');
const identidadLocal=await health.json();
assert.equal(identidadLocal.service,'web-almacen-popular');
assert.equal(identidadLocal.environment,'test','La app local debe demostrar entorno TEST');
await cliente.verificar();
const cookies=JSON.parse(await readFile('operativa.local/sesiones-qa.json','utf8'));
const clave=()=> 'oferta_'+randomUUID().replaceAll('-','');
async function http(path,rol,metodo='GET',body,status=200,intento=1){
  let response;
  try {
    response=await fetch(origen+path,{method:metodo,headers:{...(rol?{Cookie:'admin_session='+cookies[rol]}:{}),Origin:origen,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(120000)});
  } catch (error) {
    if(intento<4&&(metodo==='GET'||body?.idempotency_key)&&(error.name==='TimeoutError'||error instanceof TypeError))return http(path,rol,metodo,body,status,intento+1);
    throw error;
  }
  const json=await response.json();
  const getSinAccion=response.status===400&&/^Acci[oó]n GET no reconocida:\s*""\.?$/i.test(String(json.error||'').trim());
  if((response.status>=500||getSinAccion)&&intento<4&&(metodo==='GET'||body?.idempotency_key))return http(path,rol,metodo,body,status,intento+1);
  assert.equal(response.status,status,path+': '+JSON.stringify(json));return json.data??json;
}
const productoDe=(s,id)=>s.hojas.find(h=>h.nombre==='PRODUCTOS').registros.find(p=>p.id_producto===id);
const guardar=async(s)=>writeFile(fichero,JSON.stringify(s,null,2)+'\n');
let estado;
async function restaurar(){
  if(!estado)return;
  if(estado.pedido_id){const p=await cliente.get('obtenerPedido',{id_pedido:estado.pedido_id});if(p.pedido.estado_pedido!=='cancelado')await http('/api/admin/pedidos/'+estado.pedido_id,'operacion','POST',{idempotency_key:estado.cancel_key});}
  const ofertas=await http('/api/admin/aperturas/'+estado.apertura_id+'/productos','administracion');
  const especial=ofertas.find(p=>p.producto_id===estado.producto_id);
  if(especial?.habilitado)await http('/api/admin/aperturas/'+estado.apertura_id+'/productos','administracion','PATCH',{producto_id:estado.producto_id,habilitado:false,habilitado_esperado:true,idempotency_key:clave()});
  await http('/api/admin/productos','administracion','PATCH',{producto_id:estado.producto_id,cambios:{tipo_disponibilidad:estado.producto_antes.tipo_disponibilidad},idempotency_key:clave()});
  const apertura=await http('/api/admin/aperturas/'+estado.apertura_id,'administracion');
  if(apertura.estado_apertura!=='cerrada')await http('/api/admin/aperturas/'+estado.apertura_id+'/estado','administracion','POST',{estado_apertura:'cerrada',actualizado_en_esperado:apertura.actualizado_en,idempotency_key:clave()});
  const despues=await cliente.get('obtenerCatalogoOperativoTest');
  const p=productoDe(despues,estado.producto_id);
  assert.equal(Number(p.stock_actual),Number(estado.producto_antes.stock_actual));
  assert.equal(p.tipo_disponibilidad,estado.producto_antes.tipo_disponibilidad);
  for(const previo of estado.antes.hojas.find(h=>h.nombre==='PRODUCTOS').registros)assert.deepEqual(productoDe(despues,previo.id_producto),previo,'Producto fuera del contrato final');
  const hojasInmutables=['DETALLE_VENTAS','VENTAS','COMPRAS','DETALLE_COMPRAS','GASTOS_EXTRA','CAJA_COMPRA','HISTORIAL_COSTOS','CONFIG'];
  for(const h of estado.antes.integridad.filter(h=>hojasInmutables.includes(h.nombre)))assert.deepEqual(despues.integridad.find(d=>d.nombre===h.nombre),h);
  const aperturas=(await cliente.get('listarAperturas')).aperturas;
  for(const previo of estado.aperturas_antes)assert.deepEqual(aperturas.find(a=>a.apertura_id===previo.apertura_id),previo,'Apertura preexistente modificada');
  assert.ok(!despues.hojas.find(h=>h.nombre==='APERTURA_PRODUCTOS').registros.some(r=>r.producto_id==='PROD-054'&&String(r.habilitado).toUpperCase()==='SI'),'Empanadas habilitadas por error');
  estado.restauracion='PASS';await guardar(estado);
  console.log('PASS | fixture/stock restaurados, apertura sintética cerrada, aperturas reales intactas');
}
try{
  if(modo==='--prepare-test'){
    const antes=await cliente.get('obtenerCatalogoOperativoTest');
    const producto=productoDe(antes,'PROD-TEST-DECIMAL');
    assert.equal(producto.nombre,'Producto decimal TEST');assert.equal(producto.unidad_medida,'kg');assert.equal(producto.tipo_disponibilidad,'REGULAR');assert.equal(producto.activo,'SI');
    const aperturas=(await cliente.get('listarAperturas')).aperturas;
    assert.equal(seleccionarAperturaActivaParaPedidos(aperturas,fechaHoraSantiago()).tipo,'no_disponible');
    const fecha=process.env.CATALOGO_QA_FECHA;
    assert.match(fecha??'',/^\d{4}-\d{2}-\d{2}$/);assert.ok(fecha+'T11:00'>fechaHoraSantiago());
    const id='APE-'+fecha.replaceAll('-','');
    const existente=aperturas.find(a=>a.apertura_id===id);
    if(existente){
      const previo=JSON.parse(await readFile(fichero,'utf8'));
      assert.equal(previo.restauracion,'PASS');assert.equal(previo.apertura_id,id);
      assert.equal(existente.estado_apertura,'cerrada');assert.equal(existente.observaciones_internas,previo.marcador,'No reutilizar apertura real');
    }
    const marcador='PILOTO-TEST-'+randomUUID().replaceAll('-','').slice(0,24);
    await cliente.post('crearBackupPilotoTest',{marcador,idempotency_key:clave()});
    estado={antes,producto_antes:producto,producto_id:producto.id_producto,aperturas_antes:aperturas.filter(a=>a.apertura_id!==id),apertura_id:id,marcador,cancel_key:clave(),preparacion:'EN_CURSO'};await guardar(estado);
    const apertura={apertura_id:id,fecha_apertura:fecha,hora_inicio:'11:00',hora_termino:'15:00',lugar:'QA SINTETICA TEST',cierre_pedidos_anticipados:fecha+'T10:00',estado_apertura:'activa',pedidos_anticipados_estado:'activo',modo_presencial_estado:'inactivo',mensaje_publico:'QA SINTETICA TEST',observaciones_internas:marcador};
    if(existente)await http('/api/admin/aperturas/'+id,'administracion','PATCH',{idempotency_key:clave(),actualizado_en_esperado:existente.actualizado_en,apertura});
    else await http('/api/admin/aperturas','administracion','POST',{idempotency_key:clave(),apertura},201);
    await http('/api/admin/productos','administracion','PATCH',{producto_id:producto.id_producto,cambios:{tipo_disponibilidad:'POR_APERTURA'},idempotency_key:clave()});
    estado.preparacion='PASS';await guardar(estado);console.log('PASS | apertura sintética y fixture especial preparados; sin habilitación');
  }else{
    estado=JSON.parse(await readFile(fichero,'utf8'));
    if(modo==='--verify-test'){
      assert.equal(estado.preparacion,'PASS');
      assert.ok(!estado.restauracion,'Preparar de nuevo antes de repetir el flujo restaurado');
      const publico=async(apertura='')=>http('/api/productos'+(apertura?'?apertura_id='+apertura:''));
      const contiene=(ps)=>ps.some(p=>p.id===estado.producto_id);
      assert.equal(contiene(await publico()),false);assert.equal(contiene(await publico(estado.apertura_id)),false);
      assert.equal((await http('/api/aperturas/relevante')).apertura.apertura_id,estado.apertura_id);
      const body={nombre_cliente:'QA SINTETICA DISPONIBILIDAD',telefono:'+56900000000',forma_pago:'efectivo_al_retirar',observaciones:estado.marcador,carrito:[{id_producto:estado.producto_id,cantidad:0.1}],idempotency_key:clave()};
      await http('/api/pedidos',null,'POST',body,409);
      console.log('PASS | especial no visible y pedido manipulado rechazado');
      await http('/api/admin/aperturas/'+estado.apertura_id+'/productos','venta','PATCH',{producto_id:estado.producto_id,habilitado:true,habilitado_esperado:false,idempotency_key:clave()},403);
      await http('/api/admin/aperturas/'+estado.apertura_id+'/productos','administracion','PATCH',{producto_id:estado.producto_id,habilitado:true,habilitado_esperado:false,idempotency_key:clave()});
      assert.equal(contiene(await publico(estado.apertura_id)),true);assert.equal(contiene(await publico()),false);
      const pedido=await http('/api/pedidos',null,'POST',{...body,idempotency_key:clave()});
      estado.pedido_id=pedido.id_pedido;await guardar(estado);
      console.log('PASS | habilitación administrativa y pedido especial persistido');
      const stock=async()=>Number(productoDe(await cliente.get('obtenerCatalogoOperativoTest'),estado.producto_id).stock_actual);
      assert.equal(await stock(),Number(estado.producto_antes.stock_actual));
      const confirmar={estado_pedido:'pendiente',idempotency_key:clave()};
      await http('/api/admin/pedidos/'+pedido.id_pedido,'venta','PATCH',confirmar);
      assert.ok(Math.abs(await stock()-(Number(estado.producto_antes.stock_actual)-0.1))<0.000001);
      await http('/api/admin/pedidos/'+pedido.id_pedido,'venta','PATCH',confirmar);
      await http('/api/admin/pedidos/'+pedido.id_pedido,'venta','POST',{idempotency_key:clave()},403);
      assert.ok(Math.abs(await stock()-(Number(estado.producto_antes.stock_actual)-0.1))<0.000001);
      await http('/api/admin/pedidos/'+pedido.id_pedido,'operacion','POST',{idempotency_key:estado.cancel_key});
      await http('/api/admin/pedidos/'+pedido.id_pedido,'operacion','POST',{idempotency_key:estado.cancel_key});
      assert.equal(await stock(),Number(estado.producto_antes.stock_actual));
      const historico={...body,carrito:[{id_producto:'PROD-010',cantidad:1}],idempotency_key:clave()};
      await assert.rejects(cliente.post('crearPedido',{...historico,apertura_id:estado.apertura_id,origen_pedido:'online_anticipado'}),/inactivo/);
      const leido=await http('/api/admin/pedidos/'+pedido.id_pedido,'administracion');assert.equal(leido.pedido.estado_pedido,'cancelado');assert.equal(leido.detalle.length,1);
      estado.verificacion='PASS';await guardar(estado);
      console.log('PASS | catálogo, pedido manipulado DENY, confirmación Venta, cancelación Venta 403/Operación PASS y replay sin duplicar stock');
    }
    await restaurar();
  }
}catch(error){
  console.error('FAIL | '+error.message);process.exitCode=1;
  if(estado){estado.error=error.message;await guardar(estado);try{await restaurar();}catch(cleanup){console.error('FAIL | restauración pendiente: '+cleanup.message);}}
}
