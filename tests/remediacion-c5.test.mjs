import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { sha256Texto } from '../src/lib/familias/sha256.ts';
import { hashRevision, hashOriginalOperacion, revisionV1Acreditada, COLUMNAS_RESOLUCION_REVISION } from '../src/lib/familias/revisionV1.ts';
import { obtenerBloqueosOperativos } from '../src/lib/familias/adaptadorDurableV2.ts';
import { acreditarRemediacionC5, MAPEO_R2 } from '../scripts/lib/remediacion-c5.mjs';
const timestamp='2026-10-07T23:00:00.000Z';
function fixture() {
  const movimientos=Array.from({length:72},(_,i)=>({id_movimiento:'MOV-SINT-'+i,movimiento_id:'MOV-SINT-'+i}));
  const compra_id='COM-20260917-142720-e4baeedd';
  const detallesCompra=MAPEO_R2.map(m=>({detalle_compra_id:m.detalle,compra_id,producto_id:m.producto,cantidad:m.cantidad,costo_unitario:m.costo,stock_anterior:m.anterior,stock_nuevo:m.resultante}));
  MAPEO_R2.forEach(m=>movimientos[m.fila-2]={id_movimiento:m.legacy,movimiento_id:m.legacy,producto_id:m.producto,id_producto:m.producto,referencia_id:compra_id,id_origen:compra_id,cantidad:m.cantidad,stock_anterior:m.anterior,stock_resultante:m.resultante,tipo:'entrada',origen:'compra'});
  const cabeceras=[0,1].map(i=>({id_pedido:['PED-20260924-233415-4d4ab88e','PED-20260924-235720-349b0a5b'][i],fecha_hora:'2026-09-24 20:34:15',telefono:i?'QA-SINTETICO':'000000000',total:100,estado_pedido:'recibido',estado_pago:'pendiente',forma_pago:'efectivo',observaciones:'QA local',apertura_id:'APE-20260926',origen_pedido:'web'}));
  const ds=cabeceras.map(p=>({id_pedido:p.id_pedido,id_producto:'PROD-TEST-DECIMAL',cantidad:0.1,precio_unitario:1000,subtotal:100}));
  const ops=cabeceras.map((p,i)=>({operacion_id:['OPE-20260924-233415-1ca1a5b3','OPE-20260924-235720-04b91125'][i],idempotency_key:'KEY-SINTETICA-'+i,tipo_operacion:'CREAR_PEDIDO',id_pedido:p.id_pedido,estado_operacion:'REQUIERE_REVISION',error_codigo:i?'FALLO_CREACION':'CONSISTENCIA_INCIERTA',resultado_json:'',snapshot_json:JSON.stringify({version:1,tipo_operacion:'CREAR_PEDIDO',id_pedido:p.id_pedido,cabecera:p,detalles:[ds[i]],resultado:{id_pedido:p.id_pedido}})}));
  const pedidos=structuredClone(cabeceras);pedidos[0].telefono=0;
  for(const k of ['estado_pedido','estado_pago','forma_pago','observaciones','apertura_id','origen_pedido']) pedidos[1][k]='';
  const data={PRODUCTOS:[{id_producto:'PROD-SINT',stock_actual:100,precio_costo:1,precio_venta:2}],COMPRAS:[{compra_id,proveedor:'Proveedor controlado PILOTO TEST'}],DETALLE_COMPRAS:detallesCompra,HISTORIAL_COSTOS:MAPEO_R2.map(m=>({referencia_id:compra_id,producto_id:m.producto,costo_nuevo:m.costo})),MOVIMIENTOS_STOCK:movimientos,PEDIDOS:pedidos,DETALLE_PEDIDOS:[ds[0]],OPERACIONES_PEDIDOS:ops};
  const catalogo={entorno:'TEST',sheet_nombre:'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES',hojas:Object.entries(data).map(([nombre,registros])=>({nombre,existe:true,headers:Object.keys(registros[0]),registros}))};
  return {catalogo,data,ops};
}
function resuelta(tipo=0) {const f=fixture(),p=acreditarRemediacionC5(f.catalogo,timestamp);return {...f.ops[tipo],...p.revisiones[tipo].campos};}
for(const texto of ['', 'abc','a'.repeat(100000),'ñá💚','\ud800','\udfff',JSON.stringify({precio:650,marca:'QA',lista:[1,2]})]) test('SHA256 UTF8 coincide con crypto longitud'+texto.length,()=>assert.equal(sha256Texto(texto),createHash('sha256').update(texto).digest('hex')));
test('R hash original reconoce timestamps serial Sheet y lectura GAS sin modificar fila',()=>{
  const a={creado_en:46289.98212921296,actualizado_en:46289.982225023145}, b={creado_en:'2026-09-24T23:34:15.964',actualizado_en:'2026-09-24T23:34:24.242'};
  assert.equal(hashOriginalOperacion(a),hashOriginalOperacion(b));assert.notEqual(hashOriginalOperacion(a),hashOriginalOperacion({...b,actualizado_en:'2026-09-24T23:34:24.243'}));
});
test('R1–R4 acreditación completa, plano limitado, entrada intacta',()=>{const f=fixture(),antes=structuredClone(f.catalogo),p=acreditarRemediacionC5(f.catalogo,timestamp);assert.equal(p.cambios,5);assert.deepEqual(p.mapping.map(x=>x.canonico),MAPEO_R2.map(x=>x.canonico));assert.deepEqual(f.catalogo,antes);assert.deepEqual(p.revisiones.map(x=>x.tipo),['CREACION_V1_ACREDITADA','FALLO_PARCIAL_V1_ACREDITADO']);});
for(const i of [0,1]) test('R5 revisión acreditada '+i+' preserva estado y deja de bloquear',()=>{const o=resuelta(i);assert.equal(o.estado_operacion,'REQUIERE_REVISION');assert.equal(o.resultado_json,'');assert.equal(revisionV1Acreditada(o),true);assert.deepEqual(obtenerBloqueosOperativos([o]),{pedidos:[],sku:[],operaciones:[],global:false});});
for(const [campo,valor] of [['estado_operacion','PREPARADA'],['estado_operacion','APLICANDO'],['revision_resuelta',''],['revision_tipo','LIBRE'],['revision_evidencia_hash','bad'],['revision_resuelta_por','otro'],['revision_resuelta_en','fecha mala'],['snapshot_json','{}'],['resultado_json','resultado alterado'],['payload_hash','alterado'],['paso','alterado']]) test('R6 acreditación alterada '+campo+'/'+valor+' conserva bloqueo',()=>{const o=resuelta();o[campo]=valor;assert.equal(revisionV1Acreditada(o),false);assert.equal(obtenerBloqueosOperativos([o]).global,true);});
test('R6 hashes no permiten saltar pruebas/modelo ni duplicados',()=>{const o=resuelta(),e=JSON.parse(o.revision_detalle);e.pruebas.movimientos=1;o.revision_detalle=JSON.stringify(e);o.revision_evidencia_hash=hashRevision(e);assert.equal(revisionV1Acreditada(o),false);const b=resuelta();assert.equal(obtenerBloqueosOperativos([b,{...b}]).global,true);});
for(const caso of ['referencia','stock','detalle','historial','cabecera','movimientoPedido','otraOperacion','preacreditacion']) test('R STOP ante '+caso+' sin plan de escritura',()=>{const f=fixture();if(caso==='referencia') f.data.COMPRAS[0].observaciones=MAPEO_R2[0].legacy;if(caso==='stock')f.data.MOVIMIENTOS_STOCK[57].stock_resultante=99;if(caso==='detalle')f.data.DETALLE_COMPRAS[0].cantidad=2;if(caso==='historial')f.data.HISTORIAL_COSTOS.splice(0);if(caso==='cabecera')f.data.PEDIDOS[0].total=101;if(caso==='movimientoPedido')f.data.MOVIMIENTOS_STOCK[0].referencia_id=f.ops[0].id_pedido;if(caso==='otraOperacion')f.ops.push({...f.ops[0],operacion_id:'OTRA',idempotency_key:'OTRA'});if(caso==='preacreditacion')f.ops[0].revision_tipo='TEXTO_LIBRE';assert.throws(()=>acreditarRemediacionC5(f.catalogo,timestamp),/STOP_R/);});
test('R9 segunda ejecución0 cambios, no regenera timestamp ni hash',()=>{const f=fixture(),p=acreditarRemediacionC5(f.catalogo,timestamp);for(const m of p.mapping)f.data.MOVIMIENTOS_STOCK[m.fila-2].movimiento_id=m.canonico;for(let i=0;i<2;i++)Object.assign(f.ops[i],p.revisiones[i].campos);f.catalogo.hojas.find(h=>h.nombre==='OPERACIONES_PEDIDOS').headers.push(...COLUMNAS_RESOLUCION_REVISION);const p2=acreditarRemediacionC5(f.catalogo,'2026-10-08T23:00:00.000Z');assert.equal(p2.cambios,0);assert.deepEqual(p2.revisiones.map(r=>r.campos),p.revisiones.map(r=>r.campos));});

