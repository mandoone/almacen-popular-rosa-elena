import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { crearBaseSinteticaC7c, estadoRevisionC7c, fuentePendienteC7c, identidadEnRevisionC7c,
  proyectarPoliticaPublicaC7c, requiereNuevoSkuC7c, crearEscenarioC7c } from '../src/lib/familias/revisionAdminC7c.ts';
const manifest = JSON.parse(await readFile(new URL('../docs/operativa/MAPA_COMERCIAL_C7B_PREP_2026-10-12.json', import.meta.url), 'utf8'));

test('C7-C base sintética54 no acredita pendientes ni incluye proveedor', () => {
 const base = crearBaseSinteticaC7c(manifest);
 assert.equal(base.skus.length,54); assert.equal(base.familias.length,0);
 assert.ok(base.skus.every(s => !s.marca && !s.familia_id && !('proveedor' in s)));
 const e=manifest.entradas.find(e=>e.producto_id==='PROD-023');
 assert.equal(identidadEnRevisionC7c(e,base.skus.find(s=>s.id_producto===e.producto_id)).marca,'');
});
test('C7-C tres identidades siguen aprobadas para dry-run; diez cardinalidades siguen pendientes', () => {
 const base=crearBaseSinteticaC7c(manifest);
 assert.deepEqual(manifest.entradas.filter(e=>estadoRevisionC7c(e)==='APROBADO_PARA_DRY_RUN').map(e=>e.producto_id),['PROD-040','PROD-046','PROD-047']);
 assert.equal(manifest.entradas.filter(e=>e.cardinalidad.propuesta==='PROPUESTO_NO_REQUIERE_MULTI_SKU'&&e.cardinalidad.estado==='PENDIENTE_OMAR').length,10);
 for(const id of ['PROD-040','PROD-046','PROD-047']) {
  const e=manifest.entradas.find(e=>e.producto_id===id),s=base.skus.find(s=>s.id_producto===id), p=identidadEnRevisionC7c(e,s);
  assert.equal(p.marca,e.identidad_aprobada.marca); assert.equal(p.stock_actual,s.stock_actual); assert.equal(s.marca,'');
 }
});
test('C7-C pendientes Nadia/Conteo/Omar separados; históricos ygranel bloqueados',()=>{
 for(const id of ['PROD-033','PROD-023','PROD-044','PROD-048']) {
  const e=manifest.entradas.find(e=>e.producto_id===id);assert.equal(estadoRevisionC7c(e),'PENDIENTE');assert.equal(fuentePendienteC7c(e),'NADIA');
 }
 assert.equal(manifest.entradas.filter(e=>e.estado==='POSTERGADO_GRANEL'&&estadoRevisionC7c(e)==='BLOQUEADO').length,18);
 assert.ok(manifest.entradas.filter(e=>e.accion_futura==='CONSERVAR_HISTORICO_NO_MIGRAR').every(e=>estadoRevisionC7c(e)==='BLOQUEADO'));
 assert.equal(fuentePendienteC7c({estado:'PENDIENTE_OMAR'}),'OMAR');assert.equal(fuentePendienteC7c({estado:'PENDIENTE_CONTEO'}),'CONTEO_FISICO');
});
for(const escenario of ['ECONOMICO_UN_SKU','ECONOMICO_DOS_MARCAS'])test(`C7-C ${escenario}: marca pública oculta, marca interna intacta y stock interno`,()=>{
 const d=crearEscenarioC7c(escenario);
 assert.equal(d.familia.politica_marca,'VARIABLE'); assert.equal('marca_publica' in d.shadow.oferta,false);
 assert.ok(d.skus.every(s=>s.marca));assert.equal(d.shadow.stock_agregado_interno,escenario==='ECONOMICO_UN_SKU'?5:13);
 assert.equal(d.shadow.oferta.precio_venta,1700);assert.equal(d.imagen.origen,'PLACEHOLDER_GENERICO');assert.equal(d.shadow.disponible,true);
});
test('C7-C EXPLICITA visible y NO_APLICA sin marca artificial',()=>{
 const e=crearEscenarioC7c('MARCA_EXPLICITA'),n=crearEscenarioC7c('SIN_MARCA');
 assert.equal(e.shadow.oferta.marca_publica,'Marca QA');assert.equal(n.familia.politica_marca,'NO_APLICA');assert.equal('marca_publica' in n.shadow.oferta,false);assert.equal(n.skus[0].marca,'');assert.equal(n.shadow.disponible,true);
});
test('C7-C toggle Económico borra solo marca pública e imagen específica; identidad no cambia',()=>{
 const d=crearEscenarioC7c('MARCA_EXPLICITA'),antes=JSON.stringify(d),oferta=proyectarPoliticaPublicaC7c({...d.familia,imagen_url:'/marca.png'},'VARIABLE');
 assert.equal(oferta.politica_marca,'VARIABLE');assert.equal(oferta.marca_publica,'');assert.equal(oferta.imagen_url,'');assert.equal(JSON.stringify(d),antes);
 const local=crearEscenarioC7c('MARCA_EXPLICITA',true);assert.equal(local.skus[0].marca,'Marca QA');assert.equal(local.shadow.oferta.nombre_publico,'Aceite vegetal Económico');
});
test('C7-C imagen branded VARIABLE bloqueada, nunca devuelve URL',()=>{
 const d=crearEscenarioC7c('ECONOMICO_DOS_MARCAS',false,true);assert.equal(d.imagen.origen,'BLOQUEADA_POR_MARCA');assert.equal(d.imagen.url,undefined);assert.equal(d.shadow.imagen_publica.url,undefined);assert.equal(d.skus[0].marca,'Reyes (ejemplo sintético)');
});
test('C7-C proveedor/costo distintos no cambian SKU; marca distinta sí',()=>{
 const a={marca:'Reyes',contenido_cantidad:1000,contenido_unidad:'ml',proveedor:'La Oferta',precio_costo:1500};
 assert.equal(requiereNuevoSkuC7c(a,{...a,proveedor:'Mayorista X',precio_costo:1570}),false);
 assert.equal(requiereNuevoSkuC7c(a,{...a,marca:'Marca X'}),true);
});
test('C7-C contenido750/900/1000 y unidad definen otro SKU; etiqueta legible sola no',()=>{
 const a={marca:'Reyes',contenido_cantidad:1000,contenido_unidad:'ml',presentacion:'1 L'};
 for(const c of [750,900]) assert.equal(requiereNuevoSkuC7c(a,{...a,contenido_cantidad:c}),true);
 assert.equal(requiereNuevoSkuC7c(a,{...a,contenido_unidad:'g'}),true);
 assert.equal(requiereNuevoSkuC7c(a,{...a,presentacion:'Botella 1 L'}),false);
});
test('C7-C frontera local: página TEST/capacidad, sin API nueva ni transporte/persistencia en UI',async()=>{
 const page=await readFile(new URL('../src/app/admin/familias/preparacion/page.tsx',import.meta.url),'utf8');assert.match(page,/!== 'test'\) notFound\(\)/);
 const ui=await readFile(new URL('../src/components/admin/FamiliasPreparacionC7c.tsx',import.meta.url),'utf8');assert.match(ui,/tiene\('productos:gestionar'\)/);
 for(const f of ['../src/lib/familias/revisionAdminC7c.ts','../src/lib/familias/revisionIngestaC7c.ts','../src/components/admin/FamiliasPreparacionC7c.tsx','../src/components/admin/C7cEscenarios.tsx','../src/components/admin/C7cIngesta.tsx','../src/components/admin/C7cRevisionPlan.tsx']) {
  const code=await readFile(new URL(f,import.meta.url),'utf8');assert.doesNotMatch(code,/\bfetch\s*\(|solicitarAdmin|appsScriptPedidos|SpreadsheetApp|localStorage|sessionStorage|method:\s*['"](?:POST|PATCH|PUT|DELETE)/);
 }
});
