import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchAppsScriptTestSeguro} from '../src/lib/appsScriptTransporteTest.ts';
const url='https://script.google.com/macros/s/SOLO_LOCAL_NO_DEPLOY/exec';
const responseUrl='https://script.googleusercontent.com/macros/echo?respuesta=qa-efimera';
test('TEST transport: un POST, tres lecturas de su misma respuesta; sin repetir efectos',async()=>{
 const llamadas=[];
 const request=async(u,i)=>{llamadas.push({u,i});if(llamadas.length===1)return new Response(null,{status:302,headers:{location:responseUrl}});if(llamadas.length<4)return new Response('<html>temporal</html>',{status:404,headers:{'content-type':'text/html'}});return Response.json({ok:true,data:{id:'QA'}});};
 const r=await fetchAppsScriptTestSeguro(url,{method:'POST',body:'{"idempotency_key":"QA-12345678"}'},request);
 assert.equal(r.redirected,true);assert.equal((await r.json()).data.id,'QA');assert.equal(llamadas.filter(l=>l.i.method==='POST').length,1);assert.equal(llamadas.slice(1).every(l=>l.u===responseUrl&&l.i.method==='GET'),true);
});
for(const location of ['https://evil.invalid/','https://script.googleusercontent.com.evil.invalid/','http://script.googleusercontent.com/','https://user:pass@script.googleusercontent.com/'])test(`TEST transport bloquea redirect no acreditado ${new URL(location).hostname}`,async()=>{
 let n=0;await assert.rejects(fetchAppsScriptTestSeguro(url,{method:'POST'},async()=>{n++;return new Response(null,{status:302,headers:{location}});}));assert.equal(n,1);
});
test('TEST transport no reenvía payload/token en GET ni sigue otro redirect',async()=>{
 const calls=[];const r=await fetchAppsScriptTestSeguro(url,{method:'POST',body:'privado'},async(u,i)=>{calls.push({u,i});return new Response(null,{status:302,headers:{location:calls.length===1?responseUrl:'https://evil.invalid/'}});});
 assert.equal(r.status,302);assert.equal(calls.length,2);assert.equal(calls[1].i.body,undefined);assert.equal(calls[1].i.headers,undefined);
});
test('TEST transport devuelve HTML inicial como error verificable sin asumir mutación ejecutada',async()=>{
 let n=0;const r=await fetchAppsScriptTestSeguro(url,{method:'POST'},async()=>{n++;return new Response('<html>sin respuesta</html>',{headers:{'content-type':'text/html'}});});assert.equal(n,1);assert.equal(await r.text(),'<html>sin respuesta</html>');
});
test('TEST transport falla de forma segura tras tres timeouts de respuesta; un único POST',async()=>{
 let n=0;await assert.rejects(fetchAppsScriptTestSeguro(url,{method:'POST'},async()=>{n++;if(n===1)return new Response(null,{status:303,headers:{location:responseUrl}});throw Error('timeout');}),/incierto/);assert.equal(n,4);
});
