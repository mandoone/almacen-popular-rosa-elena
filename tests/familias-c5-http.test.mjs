import test from 'node:test';
import assert from 'node:assert/strict';
import {solicitarHttpC5,esFalloServicioSheetsC5} from '../scripts/lib/http-test-c5.mjs';
const config={url:'https://script.google.com/macros/s/QA_LOCAL/exec',token:'token_sintetico'},target='https://script.googleusercontent.com/macros/echo?user_content_key=QA_LOCAL';
test('C5 HTTP 404 al leer redirect: relee la misma respuesta y ejecuta exactamente un POST',async()=>{
  const calls=[];
  const fetch=async(url,options)=>{calls.push({url:String(url),method:options.method});if(calls.length===1)return new Response('',{status:302,headers:{Location:target}});if(calls.length===2)return new Response('',{status:404});return Response.json({ok:true,data:{estado_operacion:'COMPLETADA'}});};
  const r=await solicitarHttpC5(config,'POST','confirmarPedidoV2Test',{idempotency_key:'qa_local_123'},{fetch});
  assert.equal(r.data.estado_operacion,'COMPLETADA');assert.deepEqual(calls.map(c=>c.method),['POST','GET','GET']);assert.equal(calls[1].url,calls[2].url);
});
test('C5 HTTP redirect externo/ausente: STOP sin enviar token ni payload a otro destino',async()=>{
  for(const location of [null,'https://accounts.google.com/login','http://script.googleusercontent.com/echo']){
    let n=0;const fetch=async()=>{n++;return new Response('',{status:302,headers:location?{Location:location}:{}});};
    await assert.rejects(solicitarHttpC5(config,'POST','confirmarPedidoV2Test',{}, {fetch}),/REDIRECT_C5/);assert.equal(n,1);
  }
});
test('C5 HTTP 502 inicial: nunca reenvía automáticamente una mutación',async()=>{
  let n=0;await assert.rejects(solicitarHttpC5(config,'POST','confirmarPedidoV2Test',{}, {fetch:async()=>{n++;return new Response('',{status:502});}}),/HTTP_AMBIGUO/);assert.equal(n,1);
});
test('C5 HTTP fallo funcional tras escritura: conserva respuesta 503 sin repetir POST',async()=>{
  let n=0;const fetch=async()=>++n===1?new Response('',{status:303,headers:{Location:target}}):Response.json({ok:false,error:'C5_INTERRUPCION_QA_STOCK_1',codigo:503});
  const r=await solicitarHttpC5(config,'POST','confirmarPedidoV2Test',{}, {fetch});assert.equal(r.codigo,503);assert.equal(n,2);
});

for(const [caso,response,expected] of [
  ['Sheets ES',{ok:false,codigo:500,error:'El servicio Hojas de cálculo falló al acceder al documento con el ID QA_LOCAL.'},true],
  ['Sheets EN',{ok:false,codigo:500,error:'Service Spreadsheets failed while accessing document QA_LOCAL.'},true],
  ['fallo controlado',{ok:false,codigo:500,error:'C5_INTERRUPCION_QA_STOCK_1'},false],
  ['conflicto',{ok:false,codigo:409,error:'El servicio Hojas de cálculo falló al acceder al documento QA_LOCAL.'},false],
  ['validación',{ok:false,codigo:500,error:'C5_VALIDACION_NATIVA_RECHAZA_tipo'},false],
  ['sin error de servidor',{ok:true,codigo:500,error:'Service Spreadsheets failed while accessing document QA_LOCAL.'},false],
])test('C5 retry de servicio distingue '+caso,()=>assert.equal(esFalloServicioSheetsC5(response),expected));
