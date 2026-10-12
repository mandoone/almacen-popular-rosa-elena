import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { crearBaseSinteticaC7c } from '../src/lib/familias/revisionAdminC7c.ts';
import { leerRespuestasLocalesC7c, incorporarPropuestaLocalC7c, revisarPreparacionLocalC7c, explicarErrorRevisionC7c } from '../src/lib/familias/revisionIngestaC7c.ts';
const manifest=JSON.parse(await readFile(new URL('../docs/operativa/MAPA_COMERCIAL_C7B_PREP_2026-10-12.json',import.meta.url),'utf8'));
const template=JSON.parse(await readFile(new URL('../docs/operativa/C7_RESPUESTAS_NADIA_TEMPLATE_2026-10-12.json',import.meta.url),'utf8'));
const texto=()=>JSON.stringify(template),base=()=>crearBaseSinteticaC7c(manifest);
const propuesta=(extra={})=>({producto_id:'PROD-023',marca_fisica:'Marca QA',presentacion:'Botella 1 L',contenido_cantidad:1,contenido_unidad:'L',fuente:'NADIA',evidencia:'SINTÉTICO: solo prueba, sin respuesta humana',fecha:'2026-10-12',...extra});
test('UI C7-C template pendiente: CUMPLE, 3familias/3SKU/3asociaciones,51identidades pendientes y0 gates de las diez cardinalidades cerradas',async()=>{
 const b=base(),antes=JSON.stringify({manifest,template,b}),r=await revisarPreparacionLocalC7c(texto(),manifest,b);
 assert.equal(r.proyeccion.dry_run.estado,'CUMPLE');assert.deepEqual(r.resumen,{familias:3,skus:3,asociaciones:3,pendientes:51,bloqueados:20,warnings:0});
 assert.equal(r.autorizacion_remota,false);assert.equal(r.estado_revision,'APROBADO_PARA_DRY_RUN');assert.equal(r.cardinalidades_pendientes.length,0);
 assert.deepEqual(r.simulacion,{primera:9,segunda:0,inversa:9});assert.equal(JSON.stringify({manifest,template,b}),antes);
});
test('UI C7-C preview inverso mantiene historia y evidencia, solo3 aprobados',async()=>{
 const r=await revisarPreparacionLocalC7c(texto(),manifest,base());
 assert.equal(r.plan.inverso.filter(c=>c.tipo==='DESACTIVAR_FAMILIA_CREADA').length,3);
 assert.ok(r.plan.cambios.every(c=>c.hash.length===64&&c.evidencia&&c.estado_aprobacion==='APROBADO'));
 assert.deepEqual([...new Set(r.plan.cambios.filter(c=>c.tipo!=='CREATE_FAMILIA').map(c=>c.entidad_id))],['PROD-040','PROD-046','PROD-047']);
 assert.equal(r.plan.cambios.find(c=>c.entidad_id==='PROD-040'&&c.tipo==='UPDATE_PRODUCTO_IDENTIDAD').valor_nuevo.marca,'Fuzol');
 assert.ok(r.plan.inverso.some(c=>c.tipo==='SET_FAMILIA_ID'&&c.valor_nuevo.familia_id===''));
});
test('UI C7-C propuesta sintética normaliza y genera cuarta oferta sin promover identidades reales ni autorizar remoto',async()=>{
 const t=incorporarPropuestaLocalC7c(template,propuesta()),r=await revisarPreparacionLocalC7c(JSON.stringify(t),manifest,base());
 assert.equal(template.productos.find(p=>p.producto_id==='PROD-023').estado,'PENDIENTE');
 assert.equal(r.plan.cambios.length,12);assert.equal(r.proyeccion.identidades[0].contenido_cantidad,1000);
 const s=r.plan.resultado.skus.find(s=>s.id_producto==='PROD-023'),f=r.plan.resultado.familias.find(f=>f.familia_id===s.familia_id);
 assert.equal(s.marca,'Marca QA');assert.equal(s.stock_actual,10);assert.equal(s.precio_costo,500);assert.equal(s.precio_venta,600);
 assert.equal(f.precio_venta,1700);assert.equal(f.marca_publica,'');assert.equal(f.politica_marca,'VARIABLE');assert.equal(r.cardinalidades_pendientes.length,0);assert.equal(r.autorizacion_remota,false);
});
for(const fuente of ['NADIA','OMAR','CONTEO_FISICO','DOCUMENTO_VIGENTE'])test(`UI C7-C origen ${fuente} conserva referencia sin dar autoridad remota`,async()=>{
 const t=incorporarPropuestaLocalC7c(template,propuesta({fuente})),r=await revisarPreparacionLocalC7c(JSON.stringify(t),manifest,base());
 assert.match(r.proyeccion.identidades[0].evidencia,new RegExp(`\\[${fuente}\\]`));assert.equal(r.autorizacion_remota,false);
});
for(const campo of ['stock_actual','precio_costo','precio_venta','familia_id','id_producto'])test(`UI C7-C inyección ${campo}: BLOQUEADO antes de generar plan`,async()=>{
 const t=incorporarPropuestaLocalC7c(template,propuesta());t.productos[0][campo]=123;const b=base(),antes=JSON.stringify(b);
 await assert.rejects(revisarPreparacionLocalC7c(JSON.stringify(t),manifest,b),/CAMPOS_RESPUESTA_NO_PERMITIDOS/);assert.equal(JSON.stringify(b),antes);
});
test('UI C7-C JSON malformado, raíz inválida y UTF8 mayor200KB bloqueados',()=>{
 for(const text of ['{','null','[]','3'])assert.throws(()=>leerRespuestasLocalesC7c(text));
 assert.throws(()=>leerRespuestasLocalesC7c('é'.repeat(100001)),/ARCHIVO_DEMASIADO_GRANDE/);
 assert.match(explicarErrorRevisionC7c(new Error('CONFLICTO_IDENTIDAD_ACREDITADA')),/contradice/);
});
test('UI C7-C sin evidencia, fuente inventada y SKU fuera template no se incorporan',()=>{
 assert.throws(()=>incorporarPropuestaLocalC7c(template,propuesta({evidencia:''})),/EVIDENCIA_REQUERIDA/);
 assert.throws(()=>incorporarPropuestaLocalC7c(template,propuesta({fuente:'FOTO_INFERIDA'})),/FUENTE_INVALIDA/);
 assert.throws(()=>incorporarPropuestaLocalC7c(template,propuesta({producto_id:'PROD-NUEVO'})),/SKU_FUERA_TEMPLATE/);
});
for(const cambio of [{marca_fisica:''},{contenido_cantidad:0},{contenido_cantidad:NaN},{fecha:'2026-02-30'}])test(`UI C7-C identidad incompleta/inválida ${JSON.stringify(cambio)} rechazada`,async()=>{
 const t=incorporarPropuestaLocalC7c(template,propuesta(cambio));await assert.rejects(revisarPreparacionLocalC7c(JSON.stringify(t),manifest,base()),/RESPUESTA_OBLIGATORIOS_INVALIDOS/);
});
test('UI C7-C SKU desconocido y conflicto Fuzol no reemplazan identidad',async()=>{
 const a=JSON.parse(texto());a.productos[0].producto_id='PROD-INEXISTENTE';await assert.rejects(revisarPreparacionLocalC7c(JSON.stringify(a),manifest,base()),/SKU_DESCONOCIDO/);
 const b=JSON.parse(texto());b.productos.push({...incorporarPropuestaLocalC7c(template,propuesta()).productos.find(p=>p.producto_id==='PROD-023'),producto_id:'PROD-040'});
 await assert.rejects(revisarPreparacionLocalC7c(JSON.stringify(b),manifest,base()),/CONFLICTO_IDENTIDAD_ACREDITADA/);
});
test('UI C7-C variantes recibidas no eligen un mapa ni precio; forma pendiente no rellena marca',async()=>{
 const t=JSON.parse(texto());Object.assign(t.variantes[0],{estado:'RECIBIDA',conviven_actualmente:true,politica_publica:'VARIABLE',observacion:'SINTÉTICO',respuesta_fuente:'Prueba local',fecha_acreditacion:'2026-10-12'});
 const r=await revisarPreparacionLocalC7c(JSON.stringify(t),manifest,base());assert.equal(r.resumen.asociaciones,3);assert.ok(r.proyeccion.human_gates.some(g=>g.includes('PRECIO_MAPA_VARIANTE')));
 assert.ok(r.plan.resultado.skus.filter(s=>['PROD-031','PROD-032','PROD-052'].includes(s.id_producto)).every(s=>!s.marca&&!s.familia_id));
});
test('UI C7-C invalidación de resultado previo y ningún control de aplicación/guardado',async()=>{
 const ui=await readFile(new URL('../src/components/admin/C7cIngesta.tsx',import.meta.url),'utf8');assert.match(ui,/setRevision\(null\)/);assert.match(ui,/actual === generacion.current/);
 const preview=await readFile(new URL('../src/components/admin/C7cRevisionPlan.tsx',import.meta.url),'utf8');assert.doesNotMatch(preview,/<button/);assert.match(preview,/PLAN INVERSO/);
});
