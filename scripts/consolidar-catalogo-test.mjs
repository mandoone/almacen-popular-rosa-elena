import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const estado=JSON.parse(await readFile(process.argv[2] || 'operativa.local/granel-despues.json','utf8'));
assert.equal(estado.entorno,'TEST');
const productos=estado.hojas.find(h=>h.nombre==='PRODUCTOS').registros;
const comanda=[15,16,17,18,19,20,21,22,23,null,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,null,45,47,48,49,50,null,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66];
const compra=[4,5,6,7,8,9,null,10,11,null,12,13,20,14,15,16,17,18,19,23,22,24,25,26,27,28,29,30,31,32,null,34,35,37,38,39,40,null,42,43,44,45,46,47,48,51,52,49,50,41,null,53,null,null];
function parseCsv(text) {return text.replace(/^\uFEFF/,'').trim().split(/\r?\n/).slice(1).map(l=>l.match(/"(?:[^"]|"")*"|[^;]+/g).map(v=>v.replace(/^"|"$/g,'').replaceAll('""','"')));}
const fuentes=parseCsv(await readFile('docs/operativa/FUENTES_CATALOGO_2026-10-01.csv','utf8'));
const fuente=(tipo,fila)=>fuentes.find(f=>f[0]===tipo&&Number(f[1])===fila);
const precios=new Map([[22,2150],[24,900],[27,350],[40,1000],[44,1100],[46,1400],[47,1400]]);
// Envases/paquetes inequívocos, y costo por unidad comercial de compra (no por litro/gramo).
// Nadia acredita paquete/envase/unidad; C:H de Octubre distingue cantidad diseñada × costo.
const costos=new Map([[24,690],[25,536],[26,489],[27,299],[29,659],[30,725],[34,8350],[36,1290],[37,1690],[41,630],[43,1289],[45,990],[50,100]]);
const nombres=new Map([[35,'Papel Higiénico 6u Swan'],[49,'Paños amarillos'],[53,'Pan de masa madre']]);
const pendientes=new Map([[20,'Marca VOR/VDR, no equiparar.'],[21,'Marca VOR/VDR, no equiparar.'],[28,'TEST Toddo; Nadia Vergel; comanda Colunquen.'],[31,'Comanda cloro gel sin marca; no asignar a Igenix.'],[32,'Excel/Excell y cloro gel sin marca.'],[33,'Económico/Clorinda: falta identidad del SKU.'],[52,'TEST Virutex; comanda/compra Toddo.'],[48,'TEST sin marca; Nadia/compra Wyn.']]);
const cambios=[];
const matriz=productos.map(p=>{
  const n=/^PROD-\d{3}$/.test(p.id_producto)?Number(p.id_producto.slice(5)):0;
  const v=fuente('PRECIO',comanda[n-1]),c=fuente('COSTO',compra[n-1]);
  const campos={};
  if(precios.has(n)) campos.precio_venta=precios.get(n);
  if(costos.has(n)) campos.precio_costo=costos.get(n);
  if(nombres.has(n)) campos.nombre=nombres.get(n);
  if(Object.entries(campos).some(([k,v])=>String(p[k])!==String(v))) cambios.push({producto_id:p.id_producto,esperado:Object.fromEntries(Object.keys(campos).map(k=>[k,p[k]])),cambios:campos});
  const granel=p.modo_venta==='GRANEL',inactivo=p.activo!=='SI';
  const costo=Number(p.precio_costo)>0?p.precio_costo:'PENDING';
  const pendiente=pendientes.get(n)||(!inactivo&&costo==='PENDING'?(c&&Number(c[4])>0?'Costo: falta acreditar formato/base del envase.':'Costo sin fuente positiva; cero no es costo acreditado.'):'');
  const estado=!n?'FIXTURE_EXCLUIDA':inactivo?'HISTORICO_INACTIVO':pendiente?'PENDING_HUMANO':'CONSOLIDADO_TEST';
  return {id_producto:p.id_producto,producto_TEST:p.nombre,nombre_comanda:v?.[2]||'',modo_venta:granel?'GRANEL':'UNIDAD',unidad_comercial:granel?'gramos':p.unidad_medida,unidad_stock_historica:p.unidad_medida,gramos_unidad_stock:granel?p.gramos_unidad_stock:'',referencia_precio:granel?p.gramos_referencia+' g':'1 unidad comercial',precio_actual:p.precio_venta,precio_fuente:v?.[3]||'',costo_TEST:costo,costo_fuente:c?.[4]||'',unidad_fuente:c?.[5]||'',marca_formato:granel?'Granel libre':p.nombre,activo:p.activo,tipo_disponibilidad:p.tipo_disponibilidad||'REGULAR',estado,fuente:[granel?'Nadia/Omar respuesta directa 01/10':'Avances PAGINA ALMACÉN 09/09 (unidad comercial)',v?'Comanda 03/10 B'+v[1]+':C'+v[1]:'',c?'Diseño Octubre C'+c[1]+':H'+c[1]:'',costos.has(n)?'Costo por unidad comercial; cantidad × costo en H':''].filter(Boolean).join(' | '),accion:pendiente||(!n?'Excluir de conteo':'Conservar ID e historia; conteo físico pendiente')};
});
const keys=Object.keys(matriz[0]);
await writeFile('docs/operativa/MATRIZ_CATALOGO_2026-10-01.csv','\uFEFF'+keys.join(';')+'\n'+matriz.map(r=>keys.map(k=>'"'+String(r[k]??'').replaceAll('"','""')+'"').join(';')).join('\n')+'\n');
await writeFile('operativa.local/plan-catalogo-bloque2.json',JSON.stringify({entorno:'TEST',fuente:'Nadia 09/09 + respuesta 01/10; Comanda/Diseño 03/10',actualizaciones:cambios,creaciones:[]},null,2)+'\n');
console.log(JSON.stringify({maestros:matriz.length,cambios:cambios.length,pendientes:matriz.filter(p=>p.estado==='PENDING_HUMANO').length,costos_comerciales_acreditados:matriz.filter(p=>/^PROD-\d{3}$/.test(p.id_producto)&&p.activo==='SI'&&p.costo_TEST!=='PENDING').length}));
