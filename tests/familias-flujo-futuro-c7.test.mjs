/** Todos los datos son sintéticos y las hojas solo memoria. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearFixturesFamilias } from './fixtures/familias-producto.mjs';
import { construirCatalogoFamiliasShadow } from '../src/lib/familias/catalogoShadow.ts';
import { validarRelacionSkuFamilia } from '../src/lib/familiasProducto.ts';
import { crearDetallePedidoFamiliaV2 } from '../src/lib/familias/pedidoV2.ts';
import { crearEstadoSheetsMemoriaV2,AlmacenSheetsMemoriaV2 } from '../src/lib/familias/almacenSheetsMemoriaV2.ts';
import { confirmarPedidoV2Durable,cancelarPedidoV2Durable } from '../src/lib/familias/adaptadorDurableV2.ts';
import { crearEscenarioCompra,objetos } from './helpers/compra-identidad-escenario.mjs';
const escenario=()=>{
 const f=crearFixturesFamilias(),familia={...f.economico,familia_id:'FAM-QA-C7-ACEITE-ECO',nombre_publico:'Aceite vegetal Económico',categoria:'Alimentos',precio_venta:1700};
 const skus=f.cloros.map((s,n)=>({...s,id_producto:n?'PROD-QA-C7-X-1L':'PROD-QA-C7-REYES-1L',familia_id:familia.familia_id,nombre:n?'SKU sintético X1L':'SKU sintético Reyes1L',marca:n?'MarcaX':'Reyes',categoria:'Alimentos',presentacion:'Botella 1 L',stock_actual:n?8:5}));
 return {familia,skus};
};
test('Futuro cliente ve Económico1700/imagen genérica/sin marca, stock interno13',()=>{
 const c=escenario(),s=construirCatalogoFamiliasShadow([c.familia],c.skus)[0];assert.equal(s.oferta.nombre_publico,'Aceite vegetal Económico');assert.equal(s.oferta.precio_venta,1700);assert.equal('marca_publica' in s.oferta,false);assert.equal(s.imagen_publica.origen,'PLACEHOLDER_GENERICO');assert.equal(s.stock_agregado_interno,13);assert.equal('stock_actual' in s.oferta,false);
});
test('Futuro cambia marca disponible, misma familia/nombre/precio/URL conceptual',()=>{
 const c=escenario(),hoy=construirCatalogoFamiliasShadow([c.familia],c.skus.map((s,n)=>({...s,stock_actual:n?0:5})))[0],manana=construirCatalogoFamiliasShadow([c.familia],c.skus.map((s,n)=>({...s,stock_actual:n?8:0})))[0];
 assert.deepEqual(hoy.oferta,manana.oferta);assert.equal(hoy.stock_agregado_interno,5);assert.equal(manana.stock_agregado_interno,8);assert.equal(`/familias/${hoy.oferta.familia_id}`,`/familias/${manana.oferta.familia_id}`);assert.notEqual(c.skus[0].id_producto,c.skus[1].id_producto);
});
test('Futuro pedido solicita familia, operación reparteReyes5+X1, replay/cancelación exactos',async()=>{
 const c=escenario(),linea=crearDetallePedidoFamiliaV2('PED-QA-C7-LOCAL','DPE-QA-C7-LOCAL',{modelo_linea:'FAMILIA_V2',familia_id:c.familia.familia_id,cantidad_solicitada:6,unidad_solicitada:'unidad',version_oferta:1},c.familia);
 assert.equal(linea.id_producto,'');assert.equal(linea.subtotal,10200);
 const estado=crearEstadoSheetsMemoriaV2({PEDIDOS:[{id_pedido:linea.id_pedido,estado:'recibido',contexto_apertura_snapshot:{}}],DETALLE_PEDIDOS:[linea],PRODUCTOS:c.skus,FAMILIAS_PRODUCTO:[c.familia]});
 const almacen=new AlmacenSheetsMemoriaV2(estado),opts={ahora:()=> '2026-10-12T15:00:00.000Z'},input={id_pedido:linea.id_pedido,actor:'qa-c7-local',idempotency_key:'qa_c7_futuro_confirmar',estado_esperado:'recibido',apertura_id_esperada:'',asignaciones:[{id_detalle_pedido:linea.id_detalle_pedido,selecciones:c.skus.map((s,n)=>({producto_id:s.id_producto,cantidad_asignada:n?1:5}))}]};
 await confirmarPedidoV2Durable(almacen,input,opts);assert.deepEqual(estado.hojas.PRODUCTOS.map(s=>s.stock_actual),[0,7]);await confirmarPedidoV2Durable(almacen,input,opts);assert.equal(estado.hojas.ASIGNACIONES_PEDIDO.length,2);
 assert.deepEqual(estado.hojas.ASIGNACIONES_PEDIDO.map(a=>a.marca_snapshot),['Reyes','MarcaX']);
 await cancelarPedidoV2Durable(almacen,{...input,estado_esperado:'pendiente',idempotency_key:'qa_c7_futuro_cancelar',asignaciones:[]},opts);assert.deepEqual(estado.hojas.PRODUCTOS.map(s=>s.stock_actual),[5,8]);assert.equal(estado.hojas.DETALLE_PEDIDOS[0].subtotal,10200);
});
test('Futuro proveedor cambia, mismo SKU Reyes1L y snapshots/historial distintos',async()=>{
 const c=await crearEscenarioCompra(),modelo=escenario(),producto=modelo.skus[0];
 for(const [campo,valor] of Object.entries({...producto,precio_costo:500,precio_venta:1700})){
  const n=c.productos.headers.indexOf(campo);if(n>=0)c.productos.filas[0][n]=valor;
 }
 c.hojas.FAMILIAS_PRODUCTO.filas=[c.hojas.FAMILIAS_PRODUCTO.headers.map(h=>modelo.familia[h]??'')];
 const compra={...c.bodyCompra,fecha:'2026-10-12',proveedor:'Proveedor1 QA',idempotency_key:'qa_c7_compra_proveedor1',lineas:[{producto_id:producto.id_producto,cantidad:2,costo_unitario:1500}]};
 c.contexto.crearCompra_(compra);c.contexto.crearCompra_({...compra,proveedor:'Proveedor2 QA',idempotency_key:'qa_c7_compra_proveedor2',lineas:[{...compra.lineas[0],costo_unitario:1570}]});
 assert.deepEqual(objetos(c.hojas.COMPRAS).map(r=>r.proveedor),['Proveedor1 QA','Proveedor2 QA']);
 const ds=objetos(c.hojas.DETALLE_COMPRAS);assert.ok(ds.every(d=>d.producto_id===producto.id_producto&&d.marca_snapshot==='Reyes'&&d.contenido_cantidad_snapshot===1000));assert.deepEqual(ds.map(d=>d.costo_unitario),[1500,1570]);
 assert.equal(objetos(c.hojas.HISTORIAL_COSTOS).length,2);assert.equal(objetos(c.hojas.FAMILIAS_PRODUCTO)[0].precio_venta,1700);assert.equal('proveedor' in objetos(c.productos)[0],false);
});
test('Futuro Reyes1L y Reyes900ml usan IDs distintos;900ml no suma a familia1L',()=>{
 const c=escenario(),otro={...c.skus[0],id_producto:'PROD-QA-C7-REYES-900ML',contenido_cantidad:900,presentacion:'Botella 900 ml'};
 assert.equal(validarRelacionSkuFamilia(otro,c.familia).valido,false);const r=construirCatalogoFamiliasShadow([c.familia],[...c.skus,otro])[0];assert.equal(r.stock_agregado_interno,13);assert.equal(r.sku_integrantes[2].elegible,false);assert.notEqual(otro.id_producto,c.skus[0].id_producto);
});
