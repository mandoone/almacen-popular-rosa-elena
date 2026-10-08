import test from 'node:test';
import assert from 'node:assert/strict';
import {verificarReadbackC5} from '../scripts/lib/readback-familias-c5.mjs';
import {ID_TEST_B2,NOMBRE_TEST_B2} from '../scripts/lib/familias-b2.mjs';
import {COLUMNAS_ADITIVAS_C5,COLUMNAS_ASIGNACIONES_PEDIDO} from '../src/lib/familias/esquemaDurableV2.ts';
function fixture(){
  const rows=[['id_producto','stock_actual','precio_costo'],['PROD-001',4,590]],cells=rows.map(r=>r.map(v=>({userEnteredValue:typeof v==='number'?{numberValue:v}:{stringValue:v}})));
  const antes={meta:{spreadsheetId:ID_TEST_B2,properties:{title:NOMBRE_TEST_B2},sheets:[{properties:{title:'PRODUCTOS',gridProperties:{rowCount:3,columnCount:3}}}]},valores:{PRODUCTOS:rows},celdas:{PRODUCTOS:cells}};
  const despues=structuredClone(antes);despues.meta.sheets[0].properties.gridProperties.columnCount=5;despues.meta.sheets.push({properties:{title:'ASIGNACIONES_PEDIDO',gridProperties:{rowCount:3,columnCount:13}}});
  despues.valores.PRODUCTOS[0].push(...COLUMNAS_ADITIVAS_C5.PRODUCTOS);despues.valores.ASIGNACIONES_PEDIDO=[[...COLUMNAS_ASIGNACIONES_PEDIDO]];despues.celdas.ASIGNACIONES_PEDIDO=[];
  return {antes,despues};
}
test('C5 readback puro: huellas históricas iguales, QA explícito y headers mínimos',()=>{
  const {antes,despues}=fixture();despues.valores.PRODUCTOS.push(['PROD-QA-C5-A',4,590]);despues.celdas.PRODUCTOS.push([{userEnteredValue:{stringValue:'PROD-QA-C5-A'}}]);
  const r=verificarReadbackC5(antes,despues);assert.equal(r.seguro,true);assert.equal(r.filas_qa_nuevas,1);assert.equal(r.headers_existentes_nuevos,2);assert.equal(r.hash_valores_preexistentes,r.hash_valores_readback);
  antes.meta.sheets.push({properties:{title:'APERTURAS',gridProperties:{rowCount:3,columnCount:1}}});despues.meta.sheets.push(structuredClone(antes.meta.sheets.at(-1)));
  antes.valores.APERTURAS=[['apertura_id']];antes.celdas.APERTURAS=[];despues.celdas.APERTURAS=[];
  despues.valores.APERTURAS=[['apertura_id'],['APE-20991231-EXTRA']];assert.throws(()=>verificarReadbackC5(antes,despues),/APERTURA_NO_QA/);
  despues.valores.APERTURAS[1][0]='APE-20991231';assert.equal(verificarReadbackC5(antes,despues).seguro,true);
});
for(const caso of ['stock','filaComercial','metadataFueraRango'])test('C5 readback STOP '+caso,()=>{
  const {antes,despues}=fixture();
  if(caso==='stock')despues.valores.PRODUCTOS[1][1]=0;
  if(caso==='filaComercial')despues.valores.PRODUCTOS.push(['PROD-002',4,590]);
  if(caso==='metadataFueraRango'){despues.celdas.PRODUCTOS[2]=[];despues.celdas.PRODUCTOS[2][2]={note:'NO AUTORIZADA'};}
  assert.throws(()=>verificarReadbackC5(antes,despues),/STOP_READBACK/);
});
