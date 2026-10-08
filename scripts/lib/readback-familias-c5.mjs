/** Verificador puro de evidencia nativa C5: no Google, sin reparación. */
import {createHash} from 'node:crypto';
import {firmaEstadoB2,ID_TEST_B2,NOMBRE_TEST_B2} from './familias-b2.mjs';
import {COLUMNAS_ADITIVAS_C5,COLUMNAS_ASIGNACIONES_PEDIDO} from '../../src/lib/familias/esquemaDurableV2.ts';
const exigir=(v,c)=>{if(!v)throw new Error('STOP_READBACK_C5_'+c);};
const idsQa={APERTURAS:['apertura_id','APE-20991231'],PRODUCTOS:['id_producto','PROD-QA-C5-'],FAMILIAS_PRODUCTO:['familia_id','FAM-QA-C5-'],PEDIDOS:['id_pedido','PED-QA-C5-'],DETALLE_PEDIDOS:['id_pedido','PED-QA-C5-'],APERTURA_PRODUCTOS:['producto_id','PROD-QA-C5-'],ASIGNACIONES_PEDIDO:['producto_id','PROD-QA-C5-'],MOVIMIENTOS_STOCK:['producto_id','PROD-QA-C5-'],OPERACIONES_PEDIDOS:['id_pedido','PED-QA-C5-'],AUDITORIA_PRODUCTOS:['entidad_id','']};
const objeto=(rows,r)=>Object.fromEntries(rows[0].map((h,c)=>[h,rows[r]?.[c]??'']));
export function verificarReadbackC5(antes,despues){
  exigir(despues.meta.spreadsheetId===ID_TEST_B2&&despues.meta.properties.title===NOMBRE_TEST_B2,'DESTINO');
  exigir(despues.meta.sheets.length===antes.meta.sheets.length+1,'PESTANAS');
  const projection={},projectionAfter={},nativeProjection={},nativeAfter={};let headers=0,nuevas=0;
  for(const [hoja,rows] of Object.entries(antes.valores)){
    const actual=despues.valores[hoja];exigir(actual,'HOJA_AUSENTE');
    headers+=(COLUMNAS_ADITIVAS_C5[hoja]?.length??0);
    exigir(firmaEstadoB2(actual[0])===firmaEstadoB2([...rows[0],...(COLUMNAS_ADITIVAS_C5[hoja]??[])]),'HEADERS');
    projection[hoja]=rows;projectionAfter[hoja]=rows.map((row,r)=>row.map((v,c)=>actual[r]?.[c]??''));
    exigir(firmaEstadoB2(projection[hoja])===firmaEstadoB2(projectionAfter[hoja]),'VALORES_HISTORICOS');
    for(let r=1;r<rows.length;r++)for(const campo of COLUMNAS_ADITIVAS_C5[hoja]??[])exigir((actual[r]?.[actual[0].indexOf(campo)]??'')==='','RELLENO_HISTORICO');
    const qaRows=new Set();
    for(let r=rows.length;r<actual.length;r++){
      const [campo,prefijo]=idsQa[hoja]??[];const obj=objeto(actual,r);
      exigir(campo&&typeof obj[campo]==='string'&&obj[campo].startsWith(prefijo),'FILA_NO_QA');
      if(hoja==='AUDITORIA_PRODUCTOS')exigir(obj.entidad_tipo==='QA_C5'&&(/^(FAM|PROD|PED)-QA-C5-/.test(obj.entidad_id)||obj.entidad_id==='APE-20991231'),'AUDITORIA_NO_QA');
      if(hoja==='APERTURAS')exigir(obj.apertura_id==='APE-20991231','APERTURA_NO_QA');
      if(hoja==='APERTURA_PRODUCTOS')exigir(obj.apertura_id==='APE-20991231','APERTURA_NO_QA');
      qaRows.add(r);nuevas++;
    }
    nativeProjection[hoja]=[];nativeAfter[hoja]=[];
    const grid=antes.meta.sheets.find(s=>s.properties.title===hoja).properties.gridProperties;
    for(let r=0;r<grid.rowCount;r++){
      if(qaRows.has(r))continue;
      const a=[],b=[];
      for(let c=0;c<grid.columnCount;c++){
        if(r===0&&c>=rows[0].length&&c<actual[0].length)continue;
        a.push(antes.celdas[hoja][r]?.[c]??{});b.push(despues.celdas[hoja]?.[r]?.[c]??{});
      }
      nativeProjection[hoja].push(a);nativeAfter[hoja].push(b);
    }
  }
  exigir(firmaEstadoB2(despues.valores.ASIGNACIONES_PEDIDO?.[0])===firmaEstadoB2(COLUMNAS_ASIGNACIONES_PEDIDO),'ASIGNACIONES');
  exigir(firmaEstadoB2(nativeProjection)===firmaEstadoB2(nativeAfter),'CELDAS_FORMATOS_HISTORICOS');
  const sha=v=>createHash('sha256').update(firmaEstadoB2(v)).digest('hex');
  return {seguro:true,celdas_historicas_modificadas:0,stock_costo_precio_comercial_modificado:false,headers_existentes_nuevos:headers,filas_qa_nuevas:nuevas,
    hash_valores_preexistentes:sha(projection),hash_valores_readback:sha(projectionAfter),hash_celdas_preservadas:sha(nativeProjection),hash_celdas_readback:sha(nativeAfter),
    conteos:Object.fromEntries(Object.entries(despues.valores).map(([k,v])=>[k,v.length-1]))};
}
