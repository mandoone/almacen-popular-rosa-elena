/** Verificador puro de evidencia nativa C5: no Google, sin reparación. */
import {createHash} from 'node:crypto';
import {firmaEstadoB2,ID_TEST_B2,NOMBRE_TEST_B2} from './familias-b2.mjs';
import {COLUMNAS_ADITIVAS_C5,COLUMNAS_ASIGNACIONES_PEDIDO} from '../../src/lib/familias/esquemaDurableV2.ts';
import {hashRevision} from '../../src/lib/familias/revisionV1.ts';
import {productoResultanteV2} from '../../src/lib/familias/planMixtoV2.ts';
const exigir=(v,c)=>{if(!v)throw new Error('STOP_READBACK_C5_'+c);};
const idsQa={APERTURAS:['apertura_id','APE-20991231'],PRODUCTOS:['id_producto','PROD-QA-C5-'],FAMILIAS_PRODUCTO:['familia_id','FAM-QA-C5-'],PEDIDOS:['id_pedido','PED-QA-C5-'],DETALLE_PEDIDOS:['id_pedido','PED-QA-C5-'],APERTURA_PRODUCTOS:['producto_id','PROD-QA-C5-'],ASIGNACIONES_PEDIDO:['producto_id','PROD-QA-C5-'],MOVIMIENTOS_STOCK:['producto_id','PROD-QA-C5-'],OPERACIONES_PEDIDOS:['id_pedido','PED-QA-C5-'],AUDITORIA_PRODUCTOS:['entidad_id','']};
const objeto=(rows,r)=>Object.fromEntries(rows[0].map((h,c)=>[h,rows[r]?.[c]??'']));
/** La actualización del diario QA exige la cadena pre-inyección → recibo → reconciliación. */
export function auditoriaReconciliacionOperacionQaC5Valida(a,valores){
  try{
    const rows=n=>(valores[n]??[]).slice(1).map((_,i)=>objeto(valores[n],i+1));
    const auds=rows('AUDITORIA_PRODUCTOS'),p=JSON.parse(a.cambios_json);
    const valido=x=>x.entidad_tipo==='QA_C5'&&x.responsable==='qa-c5'&&hashRevision(JSON.parse(x.cambios_json))===x.payload_hash;
    if(!valido(a)||a.accion!=='CONFIGURAR_FIXTURE_C5'||a.entidad_id!==a.referencia_id||p.modelo!=='AUDITORIA_QA_C5_1')return false;
    const ops=rows('OPERACIONES_PEDIDOS').filter(o=>o.operacion_id===a.entidad_id);if(ops.length!==1)return false;
    const op=ops[0],plan=JSON.parse(op.snapshot_json);
    if(op.id_pedido!=='PED-QA-C5-AUTORIA-PRINCIPAL'||op.idempotency_key!=='qa_c5_autoria'||op.actor!=='qa-c5'||op.tipo_operacion!=='CONFIRMAR_V2'||op.estado_operacion!=='COMPLETADA'||op.paso!==7)return false;
    if(hashRevision({...plan,plan_hash:''})!==plan.plan_hash||plan.operacion_id!==op.operacion_id||plan.payload_hash!==op.payload_hash||plan.idempotency_key!==op.idempotency_key||plan.pedido_antes.id_pedido!==op.id_pedido)return false;
    if(p.antes.estado_operacion!=='REQUIERE_REVISION'||p.despues.estado_operacion!=='APLICANDO'||p.antes.paso!==3||p.antes.error_codigo!=='STOCK_SIN_AUTORIA_O_CONCURRENCIA')return false;
    const sin=(x,campos)=>Object.fromEntries(Object.entries(x).filter(([k])=>!campos.includes(k)));
    if(firmaEstadoB2(sin(p.antes,['estado_operacion']))!==firmaEstadoB2(sin(p.despues,['estado_operacion']))||firmaEstadoB2(sin(op,['estado_operacion','paso','resultado_json']))!==firmaEstadoB2(sin(p.despues,['estado_operacion','paso','resultado_json'])))return false;
    const recs=auds.filter(x=>x.accion==='QA_C5_RECONCILIAR'&&x.referencia_id===op.operacion_id&&x.entidad_id===op.id_pedido);
    if(recs.length!==1||!valido(recs[0]))return false;
    const rec=JSON.parse(recs[0].cambios_json),ids=rec.despues.recibos;
    if(rec.modelo!=='AUDITORIA_QA_C5_1'||rec.antes.estado!=='REQUIERE_REVISION'||rec.antes.error!==p.antes.error_codigo||rec.despues.estado!=='APLICANDO'||!Array.isArray(ids)||ids.length!==1||ids[0]!=='PROD-QA-C5-AUTORIA-A')return false;
    const saldo=plan.saldos.find(s=>s.producto_id===ids[0]);if(!saldo)return false;
    const expected=productoResultanteV2(plan,saldo),pre=auds.filter(x=>x.accion==='QA_C5_RECIBO_ANTES_FALLO'&&x.entidad_id===ids[0]&&x.referencia_id===op.operacion_id);
    if(pre.length!==1||!valido(pre[0]))return false;
    const proof=JSON.parse(pre[0].cambios_json);
    if(proof.modelo!=='AUDITORIA_QA_C5_1'||firmaEstadoB2(proof.antes)!==firmaEstadoB2(expected)||proof.despues.motivo!=='Fallo QA controlado, restaurable')return false;
    const restores=auds.filter(x=>x.accion==='CONFIGURAR_FIXTURE_C5'&&x.entidad_id===ids[0]&&x.referencia_id===ids[0]&&(()=>{try{return JSON.parse(x.cambios_json).despues.evidencia_stock_v2===JSON.stringify(expected.evidencia_stock_v2);}catch{return false;}})());
    if(restores.length!==1||!valido(restores[0]))return false;
    const restore=JSON.parse(restores[0].cambios_json);
    if(restore.modelo!=='AUDITORIA_QA_C5_1'||restore.antes.evidencia_stock_v2!==''||restore.antes.stock_actual!==saldo.stock_resultante||firmaEstadoB2(sin(restore.antes,['evidencia_stock_v2']))!==firmaEstadoB2(sin(restore.despues,['evidencia_stock_v2'])))return false;
    const fechas=[op.creado_en,pre[0].fecha_hora,restores[0].fecha_hora,recs[0].fecha_hora,a.fecha_hora].map(Date.parse);
    return fechas.every(Number.isFinite)&&fechas.every((v,i)=>i===0||v>=fechas[i-1]);
  }catch{return false;}
}
/** Evidencia adicional autorizada de recovery. No acepta un prefijo OP/AUD por sí solo. */
export function auditoriaRecoveryQaC5Valida(a,valores,profundidad=0){
  try{
    const buscar=(hoja,campo,id)=>(valores[hoja]??[]).slice(1).map((_,i)=>objeto(valores[hoja],i+1)).filter(x=>x[campo]===id);
    if(a.entidad_tipo!=='QA_C5'||profundidad>1)return false;
    const prueba=JSON.parse(a.cambios_json);if(hashRevision(prueba)!==a.payload_hash)return false;
    if(a.accion==='CONFIGURAR_FIXTURE_C5'&&/^OP-C4-/.test(a.entidad_id))return auditoriaReconciliacionOperacionQaC5Valida(a,valores);
    if(a.accion==='RECUPERAR_MOVIMIENTO_PARCIAL_C5'){
      if(prueba.modelo!=='RECOVERY_MOVIMIENTO_C5_1'||prueba.clasificacion!=='MOVIMIENTO_V2_PARCIAL_ACREDITADO'||a.entidad_id!=='OP-C4-bde46db073f83e4dd1bb7f37ac6c7f6f-M-0'||a.referencia_id!==prueba.operacion_id)return false;
      const ops=buscar('OPERACIONES_PEDIDOS','operacion_id',prueba.operacion_id),movs=buscar('MOVIMIENTOS_STOCK','movimiento_id',a.entidad_id);
      if(ops.length!==1||movs.length!==1||ops[0].id_pedido!=='PED-QA-C5-ECO-PRINCIPAL')return false;
      const plan=JSON.parse(ops[0].snapshot_json);return hashRevision({...plan,plan_hash:''})===plan.plan_hash&&plan.plan_hash===prueba.plan_hash&&plan.movimientos[0].movimiento_id===a.entidad_id&&firmaEstadoB2(movs[0])===firmaEstadoB2(prueba.fila_serializada);
    }
    if(a.accion==='CONFIGURAR_FIXTURE_C5'&&/^AUD-QA-C5-REC-M0-/.test(a.entidad_id)&&a.referencia_id===a.entidad_id){
      const targets=buscar('AUDITORIA_PRODUCTOS','auditoria_id',a.entidad_id);if(targets.length!==1||prueba.modelo!=='AUDITORIA_QA_C5_1'||prueba.antes.auditoria_id!==a.entidad_id||prueba.despues.auditoria_id!==a.entidad_id)return false;
      const target=targets[0],sinResultado=x=>Object.fromEntries(Object.entries(x).filter(([k])=>k!=='resultado_json'));
      return firmaEstadoB2(target)===firmaEstadoB2(prueba.despues)&&firmaEstadoB2(sinResultado(prueba.antes))===firmaEstadoB2(sinResultado(prueba.despues))&&auditoriaRecoveryQaC5Valida(target,valores,profundidad+1);
    }
    return false;
  }catch{return false;}
}
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
      if(hoja==='AUDITORIA_PRODUCTOS')exigir(obj.entidad_tipo==='QA_C5'&&(/^(FAM|PROD|PED)-QA-C5-/.test(obj.entidad_id)||obj.entidad_id==='APE-20991231'||auditoriaRecoveryQaC5Valida(obj,despues.valores)),'AUDITORIA_NO_QA');
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
