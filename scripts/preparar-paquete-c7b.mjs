/** Paquete local: archivos → plan/inverso → simulación. No aplica a Sheets. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { generarPlanMigracionFamiliasC7, simularPlanMigracionC7 } from '../src/lib/familias/preparacionC7b.ts';
import { esSkuFixtureConocido } from '../src/lib/familias/auditoriaIdentidad.ts';
const [entrada,salida]=process.argv.slice(2);
if(!entrada||!salida||path.resolve(entrada)===path.resolve(salida))throw new Error('Uso: captura.json paquete-local.json');
const bytes=await fs.readFile(entrada), c=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));
if(c.meta?.spreadsheetId!=='1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM'||c.meta?.properties?.title!=='TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES')throw new Error('CAPTURA_DESTINO_INVALIDO');
const records=nombre=>{const rs=c.valores[nombre],hs=rs?.[0];if(!Array.isArray(hs)||new Set(hs).size!==hs.length)throw new Error('HEADERS_INVALIDOS');return rs.slice(1).filter(r=>r[0]).map(r=>Object.fromEntries(hs.map((h,i)=>[h,r[i]??''])))};
const base={familias:records('FAMILIAS_PRODUCTO').filter(f=>!f.familia_id.startsWith('FAM-QA-')),skus:records('PRODUCTOS').filter(s=>!esSkuFixtureConocido(s)).map(s=>({...s,modo_venta:s.modo_venta||'UNIDAD',contenido_cantidad:s.contenido_cantidad===''?undefined:Number(s.contenido_cantidad)}))};
const manifest=JSON.parse(await fs.readFile(new URL('../docs/operativa/MAPA_COMERCIAL_C7B_PREP_2026-10-12.json',import.meta.url),'utf8'));
const plan=await generarPlanMigracionFamiliasC7(manifest,base), primero=await simularPlanMigracionC7(plan,{...base,recibos:[]}), replay=await simularPlanMigracionC7(plan,primero.estado), rollback=await simularPlanMigracionC7(plan,primero.estado,true);
const hashBytes=b=>createHash('sha256').update(b).digest('hex');
if(hashBytes(await fs.readFile(entrada))!==hashBytes(bytes))throw new Error('ENTRADA_CAMBIO');
await fs.writeFile(salida,JSON.stringify({plan,simulacion:{primera:primero.cambios,segunda:replay.cambios,rollback:rollback.cambios,familias_revertidas:'inactivas, sin borrar historia'},escrituras_remotas:0},null,2)+'\n');
console.log(JSON.stringify({aprobados:3,operaciones:plan.cambios.length,primera:primero.cambios,segunda:replay.cambios,rollback:rollback.cambios,bloqueados:plan.bloqueados.length,escrituras_remotas:0}));
