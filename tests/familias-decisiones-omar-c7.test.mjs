import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { proyectarPoliticaPublicaC7c, requiereNuevoSkuC7c, crearBaseSinteticaC7c } from '../src/lib/familias/revisionAdminC7c.ts';
import { revisarPreparacionLocalC7c } from '../src/lib/familias/revisionIngestaC7c.ts';
import { crearDetallePedidoFamiliaV2, leerOfertaSnapshotV2 } from '../src/lib/familias/pedidoV2.ts';
import { construirCatalogoFamiliasShadow } from '../src/lib/familias/catalogoShadow.ts';
const manifest=JSON.parse(await readFile(new URL('../docs/operativa/MAPA_COMERCIAL_C7B_PREP_2026-10-12.json',import.meta.url),'utf8'));
const anterior=JSON.parse(execFileSync('git',['show','48eb4ecd06129b3182b2eeb3b5f1bab50ed93433:docs/operativa/MAPA_COMERCIAL_C7B_PREP_2026-10-12.json'],{encoding:'utf8'}));
const card=['PROD-020','PROD-021','PROD-035','PROD-040','PROD-041','PROD-042','PROD-046','PROD-047','PROD-053','PROD-054'];
const explicitas=['PROD-020','PROD-021','PROD-022','PROD-025','PROD-026','PROD-028','PROD-029','PROD-030','PROD-041','PROD-043'];
const fuzol=()=>structuredClone(manifest.entradas.find(e=>e.producto_id==='PROD-040').contrato_aprobado);
const sku=()=>({id_producto:'PROD-040',nombre:'Fuzol 900 ml',familia_id:fuzol().familia_id,marca:'Fuzol',presentacion:'900 ml',contenido_cantidad:900,contenido_unidad:'ml',categoria:'Limpieza',activo:'SI',modo_venta:'UNIDAD',unidad_medida:'unidad',permite_decimal:'NO',paso_venta:1,stock_actual:4,precio_costo:500,precio_venta:1000});
test('Omar: exactamente diez cardinalidades iniciales aprobadas, sin aprobar identidad ni migración',()=>{
 assert.deepEqual(manifest.entradas.filter(e=>e.cardinalidad.estado==='CARDINALIDAD_INICIAL_APROBADA').map(e=>e.producto_id).sort(),card);
 assert.ok(manifest.entradas.filter(e=>card.includes(e.producto_id)).every(e=>e.cardinalidad.decision==='SI'&&/alcance inicial/.test(e.cardinalidad.evidencia)));
 assert.deepEqual(manifest.entradas.filter(e=>e.estado==='APROBADO').map(e=>e.producto_id),['PROD-040','PROD-046','PROD-047']);
});
test('Omar: exactamente diez políticas públicas actuales EXPLICITA, sin inferir marca física',()=>{
 assert.deepEqual(manifest.entradas.filter(e=>e.oferta_propuesta.estado_politica==='POLITICA_PUBLICA_ACTUAL_APROBADA').map(e=>e.producto_id).sort(),explicitas);
 for(const id of explicitas){const e=manifest.entradas.find(e=>e.producto_id===id);assert.equal(e.oferta_propuesta.politica_propuesta,'EXPLICITA');assert.equal(e.oferta_propuesta.politica_revisable,true);assert.ok(e.oferta_propuesta.marca_publica);assert.equal(e.identidad_aprobada,undefined);assert.equal(e.contrato_aprobado,undefined)}
});
test('Omar: IDs/precios/identidades/contratos previos y respuestas Nadia permanecen idénticos',async()=>{
 for(const e of manifest.entradas){const old=anterior.entradas.find(x=>x.producto_id===e.producto_id);assert.equal(e.oferta_propuesta.familia_id,old.oferta_propuesta.familia_id);assert.equal(e.oferta_propuesta.precio_comanda,old.oferta_propuesta.precio_comanda);assert.deepEqual(e.identidad_aprobada,old.identidad_aprobada);assert.deepEqual(e.contrato_aprobado,old.contrato_aprobado);if(old.estado==='PENDIENTE_NADIA'||old.estado==='POSTERGADO_GRANEL')assert.deepEqual(e,old)}
 const file='docs/operativa/C7_RESPUESTAS_NADIA_TEMPLATE_2026-10-12.json';assert.equal(await readFile(new URL('../'+file,import.meta.url),'utf8'),execFileSync('git',['show','48eb4ecd06129b3182b2eeb3b5f1bab50ed93433:'+file],{encoding:'utf8'}));
});
test('Omar: EXPLICITA→VARIABLE cambia versión, conserva familia_id/SKU y snapshots anteriores',()=>{
 const familia={...fuzol(),imagen_url:'/foto-fuzol.png'},fisico=sku(),antes=JSON.stringify({familia,fisico});
 const linea=crearDetallePedidoFamiliaV2('PED-QA-OMAR','DPE-QA-OMAR',{modelo_linea:'FAMILIA_V2',familia_id:familia.familia_id,cantidad_solicitada:2,unidad_solicitada:'unidad',version_oferta:1},familia),snapshot=JSON.stringify(linea);
 const nueva={...proyectarPoliticaPublicaC7c(familia,'VARIABLE'),nombre_publico:'Lavaloza Económico 900 ml'};
 assert.equal(nueva.familia_id,familia.familia_id);assert.equal(nueva.version_oferta,2);assert.equal(nueva.marca_publica,'');assert.equal(nueva.imagen_url,'');assert.equal(JSON.stringify({familia,fisico}),antes);
 assert.equal(fisico.marca,'Fuzol');assert.equal(JSON.stringify(linea),snapshot);
 const original=leerOfertaSnapshotV2(linea);assert.equal(original.marca_publica,'Fuzol');assert.equal(original.nombre_publico,'Lavaloza Fuzol 900 ml');assert.equal(original.version_oferta,1);
});
test('Omar: segunda proyección idéntica no vuelve a incrementar; overflow bloqueado',()=>{
 const uno=proyectarPoliticaPublicaC7c(fuzol(),'VARIABLE');assert.equal(proyectarPoliticaPublicaC7c(uno,'VARIABLE').version_oferta,2);
 assert.throws(()=>proyectarPoliticaPublicaC7c({...fuzol(),version_oferta:Number.MAX_SAFE_INTEGER},'VARIABLE'),/VERSION_OFERTA_FUERA_RANGO/);
});
test('Omar: cardinalidad inicial permite segundo SKU equivalente; otro formato no suma',()=>{
 const f={...proyectarPoliticaPublicaC7c(fuzol(),'VARIABLE'),nombre_publico:'Lavaloza Económico 900 ml'},a=sku(),b={...sku(),id_producto:'PROD-QA-X',marca:'Marca X',stock_actual:7};
 assert.equal(construirCatalogoFamiliasShadow([f],[a])[0].stock_agregado_interno,4);
 const dos=construirCatalogoFamiliasShadow([f],[a,b])[0];assert.equal(dos.stock_agregado_interno,11);assert.deepEqual(dos.sku_elegibles,['PROD-040','PROD-QA-X']);
 const incompatible={...b,id_producto:'PROD-QA-1L',contenido_cantidad:1000,presentacion:'1 L'};
 const tres=construirCatalogoFamiliasShadow([f],[a,b,incompatible])[0];assert.equal(tres.stock_agregado_interno,11);assert.ok(tres.inconsistencias.some(i=>i.codigo==='CONTENIDO_NO_EQUIVALENTE'));
});
test('Omar: proveedor distinto mantiene SKU; marca/formato distinto exige otro',()=>{
 const s=sku();assert.equal(requiereNuevoSkuC7c({...s,proveedor:'La Oferta'},{...s,proveedor:'Mayorista X',precio_costo:590}),false);
 assert.equal(requiereNuevoSkuC7c(s,{...s,marca:'Marca X'}),true);assert.equal(requiereNuevoSkuC7c(s,{...s,contenido_cantidad:1000}),true);
});
test('Omar: gates cerrados no promueven manifest a contratos; plan sigue tres9/replay0',async()=>{
 const template=await readFile(new URL('../docs/operativa/C7_RESPUESTAS_NADIA_TEMPLATE_2026-10-12.json',import.meta.url),'utf8');
 const r=await revisarPreparacionLocalC7c(template,manifest,crearBaseSinteticaC7c(manifest));assert.equal(r.cardinalidades_pendientes.length,0);assert.equal(r.plan.cambios.length,9);assert.equal(r.simulacion.segunda,0);assert.equal(r.autorizacion_remota,false);
});
