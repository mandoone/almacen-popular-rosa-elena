/** R1–R9: forense/plano puro, limitado a los tres casos expresamente autorizados. Cero red. */
import { COLUMNAS_RESOLUCION_REVISION, hashOriginalOperacion, hashRevision, revisionV1Acreditada } from '../../src/lib/familias/revisionV1.ts';
export const ACTOR_REMediacion = 'REMEDIACION-C5-2026-10-07';
export const MAPEO_R2 = [
  { fila:59, legacy:'MOV-20260917-142720', canonico:'MOV-20260917-142720-D001', producto:'PROD-TEST-F78-64C8BE2C22E0', detalle:'COM-20260917-142720-e4baeedd-D001', cantidad:1, anterior:1, resultante:2, costo:1100 },
  { fila:60, legacy:'MOV-20260917-142720', canonico:'MOV-20260917-142720-D002', producto:'PROD-TEST-DECIMAL', detalle:'COM-20260917-142720-e4baeedd-D002', cantidad:0.1, anterior:5.5, resultante:5.6, costo:1000 },
];
const targets = ['OPE-20260924-233415-1ca1a5b3','OPE-20260924-235720-04b91125'];
const tipos = ['CREACION_V1_ACREDITADA','FALLO_PARCIAL_V1_ACREDITADO'];
const assert = (ok,c) => { if(!ok) throw new Error('STOP_R:'+c); };
const equal = (a,b) => hashRevision(a) === hashRevision(b);
const diff = (a,b) => Object.keys(a).filter(k=>!equal(a[k]??'',b[k]??''));
const uniq = (rows,k,id) => { const x=rows.filter(r=>r[k]===id);assert(x.length===1,'IDENTIDAD_NO_UNICA');return x[0]; };
const fecha = x => typeof x==='number' ? new Date(Date.UTC(1899,11,30)+Math.round(x*86400000)).toISOString().slice(0,19).replace('T',' ') : x;
export function acreditarRemediacionC5(catalogo, timestamp) {
  assert(catalogo.entorno==='TEST' && catalogo.sheet_nombre==='TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES','DESTINO');
  assert(Number.isFinite(Date.parse(timestamp)),'TIMESTAMP');
  const hojas=Object.fromEntries(catalogo.hojas.map(h=>[h.nombre,h]));
  assert(Object.keys(hojas).length===catalogo.hojas.length && catalogo.hojas.every(h=>new Set(h.headers).size===h.headers.length),'HEADERS');
  const rows=n=>{assert(hojas[n]?.existe,'HOJA_FALTANTE');return hojas[n].registros;};
  const compra=uniq(rows('COMPRAS'),'compra_id','COM-20260917-142720-e4baeedd');
  assert(compra.proveedor==='Proveedor controlado PILOTO TEST','COMPRA_NO_QA');
  const mapping=[];
  for(const m of MAPEO_R2) {
    const mov=rows('MOVIMIENTOS_STOCK')[m.fila-2];
    const d=uniq(rows('DETALLE_COMPRAS'),'detalle_compra_id',m.detalle);
    const historial=rows('HISTORIAL_COSTOS').filter(h=>h.referencia_id===compra.compra_id && h.producto_id===m.producto);
    assert(mov?.id_movimiento===m.legacy && [m.legacy,m.canonico].includes(mov.movimiento_id),'MOVIMIENTO_IDENTIDAD');
    assert(mov.producto_id===m.producto && mov.id_producto===m.producto && mov.referencia_id===compra.compra_id && mov.id_origen===compra.compra_id
      && mov.cantidad===m.cantidad && mov.stock_anterior===m.anterior && mov.stock_resultante===m.resultante && mov.tipo==='entrada' && mov.origen==='compra','MOVIMIENTO_LINEA');
    assert(d.compra_id===compra.compra_id && d.producto_id===m.producto && d.cantidad===m.cantidad && d.costo_unitario===m.costo && d.stock_anterior===m.anterior && d.stock_nuevo===m.resultante,'DETALLE_COMPRA');
    assert(historial.length===1 && historial[0].costo_nuevo===m.costo,'HISTORIAL_COSTO');
    mapping.push({...m,compra:compra.compra_id,requiere_cambio:mov.movimiento_id!==m.canonico});
  }
  // Referencias exactas y embebidas en JSON/textos: solo los dos aliases previstos.
  for(const h of catalogo.hojas) for(let i=0;i<h.registros.length;i++) for(const [k,v] of Object.entries(h.registros[i]))
    if(typeof v==='string' && v.includes(MAPEO_R2[0].legacy))
      assert(h.nombre==='MOVIMIENTOS_STOCK' && [57,58].includes(i) && ['id_movimiento','movimiento_id'].includes(k),'REFERENCIA_EXTERNA');
  const inventario_hash=hashRevision(rows('PRODUCTOS'));
  const revisiones=[];
  for(let i=0;i<targets.length;i++) {
    const op=uniq(rows('OPERACIONES_PEDIDOS'),'operacion_id',targets[i]);
    assert(rows('OPERACIONES_PEDIDOS').filter(x=>x.idempotency_key===op.idempotency_key).length===1,'KEY_DUPLICADA');
    assert(op.estado_operacion==='REQUIERE_REVISION' && op.tipo_operacion==='CREAR_PEDIDO' && !op.resultado_json,'DIARIO_ORIGINAL');
    const snap=JSON.parse(op.snapshot_json), p=uniq(rows('PEDIDOS'),'id_pedido',op.id_pedido);
    assert(snap.version===1 && snap.tipo_operacion==='CREAR_PEDIDO' && snap.id_pedido===op.id_pedido && snap.cabecera.id_pedido===op.id_pedido && snap.resultado.id_pedido===op.id_pedido && snap.detalles.length===1,'SNAPSHOT');
    const detalles=rows('DETALLE_PEDIDOS').filter(x=>x.id_pedido===op.id_pedido);
    const movimientos=rows('MOVIMIENTOS_STOCK').filter(m=>Object.values(m).some(v=>typeof v==='string' && (v.includes(op.id_pedido)||v.includes(op.operacion_id))));
    assert(movimientos.length===0,'EFECTO_STOCK');
    const raw=diff(snap.cabecera,p), normalized={...p,fecha_hora:fecha(p.fecha_hora)};
    if(snap.cabecera.telefono==='000000000' && p.telefono===0) normalized.telefono=snap.cabecera.telefono;
    const diferencias=diff(snap.cabecera,normalized);
    assert(fecha(snap.cabecera.fecha_hora)===normalized.fecha_hora && p.total===100 && p.total===snap.cabecera.total,'FECHA_TOTAL');
    if(i===0) {
      assert(op.error_codigo==='CONSISTENCIA_INCIERTA' && raw.includes('telefono') && raw.every(k=>['fecha_hora','telefono'].includes(k)) && diferencias.length===0,'DIFF_CREACION');
      assert(p.estado_pedido==='recibido' && p.apertura_id==='APE-20260926' && detalles.length===1 && diff(snap.detalles[0],detalles[0]).length===0,'DETALLE_CREACION');
      assert(detalles[0].id_producto==='PROD-TEST-DECIMAL' && detalles[0].cantidad===0.1 && detalles[0].precio_unitario===1000 && detalles[0].subtotal===100,'LINEA_CREACION');
    } else {
      assert(op.error_codigo==='FALLO_CREACION' && detalles.length===0 && !p.estado_pedido
        && equal(diferencias.slice().sort(),['estado_pedido','estado_pago','forma_pago','observaciones','apertura_id','origen_pedido'].sort()),'DIFF_PARCIAL');
      assert(diferencias.every(k=>!p[k]),'PARCIAL_NO_VACIO');
    }
    const explicacion=i===0 ? 'Creación recibida acreditada por cabecera, detalle y total. Teléfono 000000000 convertido a número 0 produjo cabecera_incompatible; fecha solo difiere en representación serial/fecha. Sin movimientos de stock.' : 'Creación fallida acreditada: cabecera parcial conservada, seis campos vacíos, sin detalle ni movimientos. No se reconstruye ni se declara completada.';
    const evidencia={modelo:'ACREDITACION_CREACION_V1_1',tipo:tipos[i],operacion_id:op.operacion_id,id_pedido:op.id_pedido,actor:ACTOR_REMediacion,creado_en:timestamp,operacion_original_hash:hashOriginalOperacion(op),explicacion,
      pruebas:{cabeceras:1,detalles:detalles.length,movimientos:0,estado_pedido:p.estado_pedido??'',diferencias_normalizadas:diferencias,total_coincide:true,identidad_coincide:true,fecha_coincide:true,cabecera_hash:hashRevision(p),detalles_hash:hashRevision(detalles),inventario_hash}};
    let campos={revision_resuelta:'SI',revision_tipo:tipos[i],revision_evidencia_hash:hashRevision(evidencia),revision_detalle:JSON.stringify(evidencia),revision_resuelta_por:ACTOR_REMediacion,revision_resuelta_en:timestamp};
    const existentes=COLUMNAS_RESOLUCION_REVISION.some(k=>op[k]);
    if(existentes) {
      assert(revisionV1Acreditada(op) && op.revision_tipo===tipos[i] && op.revision_resuelta_por===ACTOR_REMediacion,'RESOLUCION_PREEXISTENTE_INVALIDA');
      const prev=JSON.parse(op.revision_detalle);assert(equal(prev.pruebas,evidencia.pruebas),'EVIDENCIA_CAMBIO');
      campos=Object.fromEntries(COLUMNAS_RESOLUCION_REVISION.map(k=>[k,op[k]]));
    }
    assert(revisionV1Acreditada({...op,...campos}),'ACREDITACION_INVALIDA');
    revisiones.push({fila:rows('OPERACIONES_PEDIDOS').indexOf(op)+2,operacion_id:op.operacion_id,tipo:tipos[i],diff_original:raw,diff_normalizado:diferencias,campos,requiere_cambio:!existentes});
  }
  assert(rows('OPERACIONES_PEDIDOS').filter(o=>o.estado_operacion!=='COMPLETADA' && !targets.includes(o.operacion_id)).length===0,'OTRA_OPERACION_INCOMPLETA');
  const faltantes=COLUMNAS_RESOLUCION_REVISION.filter(k=>!hojas.OPERACIONES_PEDIDOS.headers.includes(k));
  assert(faltantes.length===0 || faltantes.length===6,'ESQUEMA_PARCIAL');
  return {mapping,revisiones,columnas_faltantes:faltantes,headers_originales:hojas.OPERACIONES_PEDIDOS.headers,
    cambios:mapping.filter(x=>x.requiere_cambio).length+revisiones.filter(x=>x.requiere_cambio).length+(faltantes.length?1:0),inventario_hash};
}
