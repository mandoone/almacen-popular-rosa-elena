/** Lecturas autenticadas TEST; contenido privado solo en operativa.local ignorado. */
import { writeFile, mkdir } from 'node:fs/promises';
import { validarConfiguracionF78, validarDestinoF78 } from './lib/fase78-e2e-guardrails.mjs';
const c = validarConfiguracionF78(process.env);
if (!c.ok) throw new Error('Configuracion TEST invalida');
async function leer(action) {
  const url = new URL(c.config.url); url.search = new URLSearchParams({action,token:c.config.token,_request_id:crypto.randomUUID()});
  const r = await fetch(url,{signal:AbortSignal.timeout(45000),cache:'no-store'}), j = await r.json();
  if (!r.ok || !j.ok) throw new Error('Lectura TEST fallida; salida suprimida'); return j.data;
}
try {
  if (!validarDestinoF78(await leer('verificarDestinoFase78Test'))) throw new Error('Destino incorrecto');
  const e = await leer('obtenerCatalogoOperativoTest');
  if(e.entorno !== 'TEST'||e.sheet_nombre !== 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES') throw new Error('Destino incorrecto');
  await mkdir('operativa.local',{recursive:true});
  await writeFile('operativa.local/forense-c5-backend.json', JSON.stringify(e),'utf8');
  console.log(JSON.stringify({solo_lectura:true,hojas:e.hojas.length,evidencia_privada:true}));
} catch { console.error('STOP | captura forense TEST; detalles privados suprimidos'); process.exitCode=1; }
