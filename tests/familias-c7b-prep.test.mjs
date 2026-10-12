import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generarPlanMigracionFamiliasC7, simularPlanMigracionC7, extraerAprobadosC7, hashC7 } from '../src/lib/familias/preparacionC7b.ts';
import { validarRespuestasNadiaC7, proyectarRespuestasNadiaC7 } from '../src/lib/familias/respuestasNadiaC7.ts';
const manifest=JSON.parse(await readFile(new URL('../docs/operativa/MAPA_COMERCIAL_C7B_PREP_2026-10-12.json',import.meta.url),'utf8'));
const template=JSON.parse(await readFile(new URL('../docs/operativa/C7_RESPUESTAS_NADIA_TEMPLATE_2026-10-12.json',import.meta.url),'utf8'));
const m=()=>structuredClone(manifest), t=()=>structuredClone(template);
const base=()=>({familias:[],skus:manifest.entradas.map(e=>({id_producto:e.producto_id,nombre:e.nombre_actual,categoria:e.contrato_aprobado?.categoria??'Limpieza',activo:'SI',modo_venta:e.estado==='POSTERGADO_GRANEL'?'GRANEL':'UNIDAD',unidad_medida:'unidad',permite_decimal:'NO',paso_venta:1,stock_actual:10,precio_costo:500,precio_venta:600,familia_id:'',marca:'',presentacion:'',contenido_cantidad:'',contenido_unidad:''}))});
const recibida=(id='PROD-023')=>({producto_id:id,estado:'RECIBIDA',marca_fisica:'Marca sintética A',contenido_cantidad:1,contenido_unidad:'L',presentacion:'Botella 1 L',respuesta_fuente:'Respuesta SINTÉTICA de prueba, no Nadia real',fecha_acreditacion:'2026-10-12'});
const aplicarRespuesta=(p=recibida())=>{const r=t();r.productos[r.productos.findIndex(x=>x.producto_id===p.producto_id)]=p;return r};
test('C7-B manifest54: tres aprobados, pendientes no contratos y10 cardinalidades pendientes',()=>{
 assert.equal(manifest.entradas.length,54);assert.equal(extraerAprobadosC7(manifest).length,3);
 assert.equal(manifest.entradas.filter(e=>e.cardinalidad.propuesta==='PROPUESTO_NO_REQUIERE_MULTI_SKU').length,10);
 assert.ok(manifest.entradas.every(e=>e.cardinalidad.estado==='PENDIENTE_OMAR'&&e.cardinalidad.decision===null));
 assert.ok(manifest.entradas.filter(e=>e.estado!=='APROBADO').every(e=>!e.contrato_aprobado&&!e.identidad_aprobada));
 assert.equal(new Set(manifest.entradas.map(e=>e.oferta_propuesta.familia_id)).size,54);
});
test('C7-B VARIABLE público Económico, marca pública vacía; Clorinda sin SKU',()=>{
 for(const id of ['PROD-033','PROD-023','PROD-044','PROD-048']){const e=manifest.entradas.find(e=>e.producto_id===id);assert.equal(e.estado,'PENDIENTE_NADIA');assert.equal(e.oferta_propuesta.politica_propuesta,'VARIABLE');assert.equal(e.oferta_propuesta.marca_publica,'');assert.match(e.oferta_propuesta.nombre_publico,/Económico/)}
 assert.equal(manifest.ofertas_sin_sku[0].estado_oferta,'OFERTA_APROBADA_SIN_SKU_ACREDITADO');assert.equal('sku_a_acreditar' in manifest.ofertas_sin_sku[0],false);
});
test('C7-B plan9 cambios, solo tres SKU, hashes/precondiciones/evidencia e inverso sin borrar',async()=>{
 const b=base(),antes=JSON.stringify(b),p=await generarPlanMigracionFamiliasC7(m(),b);
 assert.equal(p.cambios.length,9);assert.equal(p.inverso.length,9);assert.equal(p.bloqueados.length,51);
 assert.deepEqual([...new Set(p.cambios.filter(o=>o.tipo!=='CREATE_FAMILIA').map(o=>o.entidad_id))],['PROD-040','PROD-046','PROD-047']);
 assert.ok(p.cambios.every(o=>o.hash.length===64&&o.evidencia&&o.estado_aprobacion==='APROBADO'));
 assert.equal(p.inverso.filter(o=>o.tipo==='DESACTIVAR_FAMILIA_CREADA').length,3);assert.equal(JSON.stringify(b),antes);
});
test('C7-B simulación/replay0/rollback9; stock,costo,precio preservados e historia familiar inactiva',async()=>{
 const b=base(),p=await generarPlanMigracionFamiliasC7(m(),b),one=await simularPlanMigracionC7(p,{...b,recibos:[]});
 assert.equal(one.cambios,9);assert.equal((await simularPlanMigracionC7(p,one.estado)).cambios,0);
 const back=await simularPlanMigracionC7(p,one.estado,true);assert.equal(back.cambios,9);assert.deepEqual(back.estado.skus,b.skus);assert.ok(back.estado.familias.every(f=>f.activo==='NO'));
 assert.equal((await simularPlanMigracionC7(p,back.estado,true)).cambios,0);
});
for(const campo of ['stock_actual','precio_costo','precio_venta','nombre'])test(`C7-B fila cambió ${campo}: bloqueo previo sin mutación`,async()=>{
 const b=base(),p=await generarPlanMigracionFamiliasC7(m(),b);b.skus.find(s=>s.id_producto==='PROD-040')[campo]=campo==='nombre'?'Otro':333;
 const antes=JSON.stringify(b);await assert.rejects(simularPlanMigracionC7(p,{...b,recibos:[]}),/PRECONDICION_FILA_CAMBIO/);assert.equal(JSON.stringify(b),antes);
});
test('C7-B saldo coincidente sin recibo no prueba autoría; stock cambiado tras replay bloquea',async()=>{
 const b=base(),p=await generarPlanMigracionFamiliasC7(m(),b),one=await simularPlanMigracionC7(p,{...b,recibos:[]});
 await assert.rejects(simularPlanMigracionC7(p,{...one.estado,recibos:[]}),/PRECONDICION_FAMILIA_CAMBIO/);
 one.estado.skus.find(s=>s.id_producto==='PROD-040').stock_actual++;
 await assert.rejects(simularPlanMigracionC7(p,one.estado),/REPLAY_FILA_CAMBIO/);
});
test('C7-B plan adulterado/recibos parciales/duplicados se rechazan',async()=>{
 const b=base(),p=await generarPlanMigracionFamiliasC7(m(),b),bad=structuredClone(p);bad.cambios[0].valor_nuevo.precio_venta=1;
 await assert.rejects(simularPlanMigracionC7(bad,{...b,recibos:[]}),/PLAN_HASH_INVALIDO/);
 await assert.rejects(simularPlanMigracionC7(p,{...b,recibos:[{id:p.cambios[0].id,hash:p.cambios[0].hash}]}),/OPERACION_PARCIAL/);
 const one=await simularPlanMigracionC7(p,{...b,recibos:[]});one.estado.recibos.push(one.estado.recibos[0]);await assert.rejects(simularPlanMigracionC7(p,one.estado),/RECIBO_DUPLICADO/);
});
test('C7-B rollback bloquea si familia ahora utilizada por otro SKU',async()=>{
 const b=base(),p=await generarPlanMigracionFamiliasC7(m(),b),one=await simularPlanMigracionC7(p,{...b,recibos:[]});one.estado.skus[0].familia_id=p.cambios[0].entidad_id;
 await assert.rejects(simularPlanMigracionC7(p,one.estado,true),/ROLLBACK_FAMILIA_EN_USO/);
});
test('C7-B promover pendiente sin contrato/evidencia se rechaza',async()=>{
 const mm=m();mm.entradas.find(e=>e.producto_id==='PROD-023').estado='APROBADO';await assert.rejects(generarPlanMigracionFamiliasC7(mm,base()),/APROBACION_INCOMPLETA/);
});
test('Nadia template pendiente válido, ninguna identidad/aprobación fabricada',()=>{
 const r=validarRespuestasNadiaC7(t(),base().skus,m());assert.equal(r.aprobadas.length,0);assert.equal(r.human_gates.length,9);
});
test('Nadia futura sintética normaliza L→ml y proyecta cuarta familia VARIABLE sin marca pública',()=>{
 const mm=m(),ss=base().skus,antes=JSON.stringify({mm,ss});const r=proyectarRespuestasNadiaC7(aplicarRespuesta(),ss,mm);
 assert.equal(r.identidades[0].contenido_cantidad,1000);assert.equal(r.identidades[0].contenido_unidad,'ml');assert.equal(r.dry_run.estado,'CUMPLE');assert.equal(r.mapa.length,4);
 const f=r.dry_run.catalogo_propuesto.find(f=>f.oferta.familia_id==='FAM-ACEITE-VEGETAL-ECO');assert.equal(f.oferta.precio_venta,1700);assert.equal('marca_publica' in f.oferta,false);assert.equal(JSON.stringify({mm,ss}),antes);
});
for(const campo of ['stock_actual','precio_costo','precio_venta','familia_id','id_producto'])test(`Nadia no puede inyectar ${campo}`,()=>{
 const r=aplicarRespuesta();r.productos[0][campo]=1;assert.throws(()=>validarRespuestasNadiaC7(r,base().skus,m()),/CAMPOS_RESPUESTA_NO_PERMITIDOS/);
});
test('Nadia SKU desconocido, campos vacíos, fecha inválida y unidad inválida bloquean',()=>{
 for(const cambio of [{producto_id:'PROD-INVENTADO'},{marca_fisica:''},{contenido_cantidad:null},{fecha_acreditacion:'2026-02-30'},{contenido_unidad:'botella'}]){
  const r=aplicarRespuesta();Object.assign(r.productos.find(p=>p.producto_id==='PROD-023'),cambio);assert.throws(()=>validarRespuestasNadiaC7(r,base().skus,m()));
 }
});
test('Nadia conflicto con aprobación Fuzol, granel y Cloro900ml se rechazan',()=>{
 const b=base(), mm=m();
 const r=t();r.productos.push(recibida('PROD-040'));assert.throws(()=>validarRespuestasNadiaC7(r,b.skus,mm),/CONFLICTO_IDENTIDAD_ACREDITADA/);
 r.productos=[recibida('PROD-001')];assert.throws(()=>validarRespuestasNadiaC7(r,b.skus,mm),/GRANEL_POSTERGADO/);
 assert.throws(()=>validarRespuestasNadiaC7(aplicarRespuesta({...recibida('PROD-033'),contenido_cantidad:900,contenido_unidad:'ml'}),b.skus,mm),/CLORO_PRESENTACION_NO_EQUIVALENTE/);
});
test('Nadia variantes respondidas no fusionan SKU ni inventan precio/mapa',()=>{
 const r=t();Object.assign(r.variantes[0],{estado:'RECIBIDA',conviven_actualmente:true,politica_publica:'VARIABLE',observacion:'Sintético: coexistencia',respuesta_fuente:'Fixture local',fecha_acreditacion:'2026-10-12'});
 const p=proyectarRespuestasNadiaC7(r,base().skus,m());assert.equal(p.mapa.length,3);assert.ok(p.human_gates.some(g=>g.includes('PRECIO_MAPA_VARIANTE')));
});
test('Nadia evidencia parcial, duplicado y overflow no acreditan identidad',()=>{
 const r=t();r.productos[0].marca_fisica='Parcial';assert.throws(()=>validarRespuestasNadiaC7(r,base().skus,m()),/PARCIAL_NO_ACREDITADA/);
 const d=t();d.productos.push(d.productos[0]);assert.throws(()=>validarRespuestasNadiaC7(d,base().skus,m()),/DUPLICADA/);
 assert.throws(()=>validarRespuestasNadiaC7(aplicarRespuesta({...recibida(),contenido_cantidad:Number.MAX_SAFE_INTEGER}),base().skus,m()),/IDENTIDAD_RESPUESTA_INVALIDA/);
});
test('C7-B código de plan/ingesta no importa transporte ni Google; hashes estables',async()=>{
 assert.equal(await hashC7({a:1,b:2}),await hashC7({b:2,a:1}));
 for(const f of ['../src/lib/familias/preparacionC7b.ts','../src/lib/familias/respuestasNadiaC7.ts','../scripts/preparar-paquete-c7b.mjs']){
  const source=await readFile(new URL(f,import.meta.url),'utf8');assert.doesNotMatch(source,/\bfetch\s*\(|SpreadsheetApp|UrlFetchApp|appsScriptPedidos|appendRow\s*\(|setValues\s*\(/);
 }
});
