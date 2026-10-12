import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolverImagenPublicaFamiliaC7 } from '../src/lib/familias/imagenPublicaC7.ts';
import { construirCatalogoFamiliasShadow } from '../src/lib/familias/catalogoShadow.ts';
import { crearFixturesFamilias } from './fixtures/familias-producto.mjs';
const familia=()=>({...crearFixturesFamilias().economico,nombre_publico:'Aceite vegetal Económico',imagen_url:'/qa/familia.png'});
const evaluar=(f,cambios={})=>({familia_id:f.familia_id,imagen_url:f.imagen_url,clasificacion:'APTA_GENERICA',evidencia:'Fixture visual sintético local',...cambios});
for(const [politica_marca,origen] of [['VARIABLE','PLACEHOLDER_GENERICO'],['EXPLICITA','SIN_IMAGEN'],['NO_APLICA','SIN_IMAGEN']])test(`C7 imagen ausente ${politica_marca}: ${origen}, sin fallback`,()=>{
 const r=resolverImagenPublicaFamiliaC7({...familia(),politica_marca,imagen_url:undefined});assert.equal(r.origen,origen);assert.equal('url' in r,false);
});
test('C7 VARIABLE con foto Reyes bloqueada sin URL pública ni marca en representación',()=>{
 const f=familia(),r=resolverImagenPublicaFamiliaC7(f,evaluar(f,{clasificacion:'NO_APTA_VARIABLE_MARCA_VISIBLE',marca_visible:'DE REYES'}));
 assert.equal(r.origen,'BLOQUEADA_POR_MARCA');assert.equal('url' in r,false);assert.equal(r.nombre_publico,'Aceite vegetal Económico');assert.equal(JSON.stringify(r).includes('REYES'),false);assert.ok(r.avisos.length);
});
test('C7 URL familiar no auditada o evaluaciones cruzadas/ambiguas no acreditan genérica',()=>{
 const f=familia();for(const e of [undefined,evaluar(f,{familia_id:'FAM-OTRA'}),evaluar(f,{imagen_url:'/otra.png'}),evaluar(f,{evidencia:''}),evaluar(f,{clasificacion:'AMBIGUA_REVISAR'})])assert.equal(resolverImagenPublicaFamiliaC7(f,e).origen,'BLOQUEADA_POR_MARCA');
});
test('C7 genérica acreditada solo autoridad familia; derechos siguen gate separado',()=>{
 const f=familia(),r=resolverImagenPublicaFamiliaC7(f,evaluar(f));assert.equal(r.origen,'IMAGEN_FAMILIA');assert.equal(r.url,f.imagen_url);assert.match(r.avisos[0],/HUMAN_GATE/);
 assert.deepEqual(resolverImagenPublicaFamiliaC7(f,evaluar(f,{derechos_validados:true})).avisos,[]);
});
test('C7 clasificación genérica con marca visible es contradictoria y se bloquea',()=>{
 const f=familia();assert.equal(resolverImagenPublicaFamiliaC7(f,evaluar(f,{marca_visible:'Marca X'})).origen,'BLOQUEADA_POR_MARCA');
});
test('C7 EXPLICITA marca y presentación exactas, sin imagen SKU',()=>{
 const f={...familia(),politica_marca:'EXPLICITA',marca_publica:'Fuzol',presentacion_publica:'900 ml'};
 const e=evaluar(f,{clasificacion:'APTA_EXPLICITA',marca_visible:'Fuzol',presentacion_publica:'900 ml'});
 assert.equal(resolverImagenPublicaFamiliaC7(f,e).origen,'IMAGEN_FAMILIA');
 for(const cambio of [{marca_visible:'Otra'},{presentacion_publica:'750 ml'},{clasificacion:'APTA_GENERICA'}])assert.equal(resolverImagenPublicaFamiliaC7(f,{...e,...cambio}).origen,'BLOQUEADA_POR_MARCA');
});
test('C7 NO_APLICA usa foto genérica de oferta, nunca marca de SKU',()=>{
 const f={...familia(),politica_marca:'NO_APLICA'};assert.equal(resolverImagenPublicaFamiliaC7(f,evaluar(f)).origen,'IMAGEN_FAMILIA');
 assert.equal(resolverImagenPublicaFamiliaC7(f,evaluar(f,{marca_visible:'Marca'})).origen,'BLOQUEADA_POR_MARCA');
});
for(const imagen_url of ['javascript:alert(1)','data:image/png;base64,AAAA','http://example.test/foto.png','//example.test/img.png','https://usuario:clave@example.test/foto.png'])test(`C7 imagen URL rechazada ${imagen_url.split(':')[0]}`,()=>{
 const f={...familia(),imagen_url};const r=resolverImagenPublicaFamiliaC7(f,evaluar(f));assert.equal(r.origen,'SIN_IMAGEN');assert.equal('url' in r,false);
});
test('C7 shadow nunca usa primera/mayor stock/última imagen SKU ni costo',()=>{
 const f=crearFixturesFamilias(),a=construirCatalogoFamiliasShadow([f.economico],f.cloros.map((s,n)=>({...s,imagen_url:`/marca-${n}.png`,precio_costo:9000,stock_actual:20-n})))[0];
 assert.equal(a.imagen_publica.origen,'PLACEHOLDER_GENERICO');assert.equal('url' in a.imagen_publica,false);assert.equal(a.oferta.precio_venta,650);
});
test('C7 shadow imágenes genéricas acreditadas y evaluación duplicada fail-closed',()=>{
 const f=crearFixturesFamilias(),family={...f.economico,imagen_url:'/generica.png'},e=evaluar(family);
 assert.equal(construirCatalogoFamiliasShadow([family],f.cloros,{},[e])[0].imagen_publica.origen,'IMAGEN_FAMILIA');
 assert.equal(construirCatalogoFamiliasShadow([family],f.cloros,{},[e,e])[0].imagen_publica.origen,'BLOQUEADA_POR_MARCA');
});
test('C7 imagen/shadow no mutan familia y la UI ofrece simulación sin guardar',async()=>{
 const f=familia(),antes=JSON.stringify(f);resolverImagenPublicaFamiliaC7(f,evaluar(f));assert.equal(JSON.stringify(f),antes);
 const ui=await readFile(new URL('../src/components/admin/FamiliasSimulador.tsx',import.meta.url),'utf8');assert.match(ui,/Simular foto de SKU con marca/);assert.doesNotMatch(ui,/method:\s*['"](?:POST|PATCH|PUT|DELETE)|guardarImagen|actualizarProducto/);
});
