/** Solo GET: evidencia privada de TEST, nunca imprime tokens, URLs ni registros. */
import { createHash } from 'node:crypto';
import { mkdir,writeFile } from 'node:fs/promises';
import { validarConfiguracionF78,validarDestinoF78 } from './lib/fase78-e2e-guardrails.mjs';
const config=validarConfiguracionF78(process.env);
if(!config.ok)throw new Error('Configuración TEST inválida; abortar lectura.');
async function get(action,params={}){
  for(let i=0;i<3;i++){
    try{
      const url=new URL(config.config.url);url.search=new URLSearchParams({action,token:config.config.token,...params,_request_id:crypto.randomUUID()});
      const r=await fetch(url,{signal:AbortSignal.timeout(30000),cache:'no-store'}),j=await r.json();
      if(!r.ok||!j.ok)throw 0;return j.data;
    }catch{if(i===2)throw new Error('Lectura TEST falló; salida privada suprimida.');}
  }
}
try{
  const destino=await get('verificarDestinoFase78Test');if(!validarDestinoF78(destino))throw new Error('Destino TEST no verificado.');
  const evidencia={destino};
  for(const action of ['obtenerEsquemaFase78Test','listarProductosAdmin','listarProductos','listarCompras'])evidencia[action]=await get(action);
  const compras=evidencia.listarCompras.compras??evidencia.listarCompras;
  evidencia.detalles=[];for(const c of compras)evidencia.detalles.push(await get('obtenerCompra',{compra_id:c.compra_id}));
  const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
  await mkdir('operativa.local',{recursive:true});await writeFile('operativa.local/familias-test-readonly.json',JSON.stringify(evidencia),'utf8');
  console.log(JSON.stringify({destino:'TEST verificado',esquema:evidencia.obtenerEsquemaFase78Test.hojas.map(h=>({nombre:h.nombre,columnas:h.headers.length,filas:h.filas})),catalogo_hash:sha(evidencia.listarProductos),compras:compras.length,detalles_leidos:evidencia.detalles.length,solo_GET:true}));
}catch{console.error('FAIL | verificación read-only TEST; salida privada suprimida');process.exitCode=1;}
