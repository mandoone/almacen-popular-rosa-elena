import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clienteCatalogoTest } from '../scripts/lib/catalogo-operativo-test.mjs';
import { validarMatrizCuentas } from '../scripts/validar-matriz-cuentas.mjs';

const cuentas = () => Array.from({length:10},(_,i)=>({actor_id:`qa-cuenta-${i}`,nombre:`QA ${i}`,rol:i<2?'administracion':i<4?'operacion':'venta'}));
test('matriz humana preparada admite 10 cuentas 2/2/6 sin credenciales',()=> {
  assert.equal(validarMatrizCuentas(cuentas(),{estado:'ausente'}).ok,true);
});
test('matriz rechaza colisiones, actor duplicado y rol inválido',()=> {
  const c=cuentas(); c[1].actor_id=c[0].actor_id; c[2].rol='nuevo';
  assert.equal(validarMatrizCuentas(c,{estado:'valida',usuarios:[{actor_id:c[0].actor_id}]}).ok,false);
});
test('matriz rechaza credenciales, longitud distinta, cuenta nula y registro actual inválido',()=> {
  const c=cuentas();c[0].password_hash='prohibido';c[1]=null;
  assert.equal(validarMatrizCuentas(c,{estado:'invalida'}).ok,false);
  assert.equal(validarMatrizCuentas(c.slice(1),{estado:'ausente'}).ok,false);
});
const env={NEXT_PUBLIC_APP_ENV:'test',GOOGLE_SCRIPT_PEDIDOS_URL_TEST:'https://script.google.com/macros/s/fixture_test/exec',GOOGLE_SCRIPT_ADMIN_TOKEN_TEST:'solo-token-sintetico'};
test('cliente catálogo bloquea configuración productiva antes de acceder a red',()=> {
  assert.throws(()=>clienteCatalogoTest({...env,GOOGLE_SCRIPT_PEDIDOS_URL:'https://production.invalid'}),/productivas/);
});
test('POST convertido a GET se recupera solamente con key conservando el payload',async(t)=> {
  const payloads=[];
  t.mock.method(globalThis,'fetch',async(_url,init)=>{
    payloads.push(init.body);
    const response=new Response(JSON.stringify(payloads.length===1?{ok:false,codigo:400,error:'Accion GET no reconocida: "".'}:{ok:true,data:{persistido:true}}));
    Object.defineProperties(response,{redirected:{value:true},url:{value:'https://script.googleusercontent.com/macros/echo'}});
    return response;
  });
  assert.deepEqual(await clienteCatalogoTest(env).post('accion',{idempotency_key:'qa_clave_123'}),{persistido:true});
  assert.equal(payloads.length,2);assert.equal(payloads[0],payloads[1]);
});
test('rechazo funcional no se reintenta ni expone el token',async(t)=> {
  let llamadas=0;
  t.mock.method(globalThis,'fetch',async()=>{llamadas++;return new Response(JSON.stringify({ok:false,codigo:409,error:env.GOOGLE_SCRIPT_ADMIN_TOKEN_TEST}));});
  await assert.rejects(clienteCatalogoTest(env).post('accion',{idempotency_key:'qa_clave_456'}),e=>!e.message.includes(env.GOOGLE_SCRIPT_ADMIN_TOKEN_TEST));
  assert.equal(llamadas,1);
});
