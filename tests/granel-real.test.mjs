import test from 'node:test';
import assert from 'node:assert/strict';
import { crearEscenario } from './helpers/granel-escenario.mjs';
import { subtotalVenta, cantidadStock, referenciaPrecio } from '../src/lib/granel.ts';
import { validarYCalcularVentaPresencial } from '../src/lib/fase5/ventaPresencial.ts';

async function escenario(base = 1000) {
  const c = await crearEscenario();
  c.productos.headers.push('modo_venta','gramos_referencia','gramos_unidad_stock');
  c.productos.filas[0].push('GRANEL',1000,base);
  c.productos.filas[0][2] = 'Arroz';
  c.productos.filas[0][5] = 1350;
  c.productos.filas[0][3] = base === 1000 ? 'kg' : 'unidad';
  c.detalles.headers.push('modo_venta','gramos_solicitados','gramos_referencia','gramos_unidad_stock');
  c.body.carrito = [{id_producto:'PROD-1',cantidad:250,precio_unitario:1,subtotal:1,modo_venta:'UNIDAD',gramos_referencia:1}];
  return c;
}

for (const [nombre,precio,ref,g,esperado] of [['Arroz',1350,1000,250,338],['Harina',900,1000,750,675],['Poroto blanco',2000,1000,250,500],['Pimienta',1350,100,150,2025],['Té',2300,250,500,4600]]) {
  test(`${nombre}: ${g} g = ${esperado} CLP en ambas capas`, async () => {
    const {contexto} = await escenario();
    const p = {modo_venta:'GRANEL',gramos_referencia:ref,gramos_unidad_stock:1000,unidad_medida:'kg',precio_venta:precio};
    assert.equal(contexto.calcularLineaVenta_(p,g).subtotal,esperado);
    assert.equal(subtotalVenta(p,precio,g),esperado);
    const entrada = { apertura_id:'APE-20261004',fecha_hora:'2026-10-04T12:00',vendedor:'actor-test',forma_pago:'efectivo',lineas:[{producto_id:'PROD-1',cantidad:g}] };
    const productos = [{...p,id_producto:'PROD-1',nombre,activo:true,stock_actual:10,permite_decimal:true}];
    const apertura = {apertura_id:entrada.apertura_id,habilitada:true};
    const venta = validarYCalcularVentaPresencial(entrada,productos,apertura);
    assert.equal(venta.venta.lineas[0].cantidad,g/1000);
    assert.equal(venta.venta.lineas[0].gramos_solicitados,g);
    assert.equal(venta.venta.total,esperado);
    assert.equal(validarYCalcularVentaPresencial({...entrada,lineas:[{producto_id:'PROD-1',cantidad:1.5}]},productos,apertura).valido,false);
  });
}
for (const g of [1,150,250,751,1500]) test(`acepta peso libre ${g} g`, async () => {
  const c=await escenario();c.body.carrito[0].cantidad=g;
  const r=c.contexto.crearPedido_(c.body);
  assert.equal(r.resumen[0].gramos_solicitados,g);
  assert.equal(c.productos.filas[0][6],5.6);
});
for (const g of [0,-1,NaN,Infinity,1.5,'250','abc',null,true]) test(`rechaza peso inválido ${String(g)}`, async () => {
  const c=await escenario();c.body.carrito[0].cantidad=g;
  assert.throws(()=>c.contexto.crearPedido_(c.body),/Cantidad|cantidad|gramos/);
  assert.equal(c.pedidos.filas.length,0);
});
test('pedido recalcula manipulación y congela referencia, peso y precio', async () => {
  const c=await escenario();const r=c.contexto.crearPedido_(c.body);
  assert.equal(r.total,338);
  const obj=Object.fromEntries(c.detalles.headers.map((k,i)=>[k,c.detalles.filas[0][i]]));
  assert.equal(obj.gramos_solicitados,250);assert.equal(obj.gramos_referencia,1000);assert.equal(obj.precio_unitario,1350);
  const repetido=c.contexto.crearPedido_(c.body);assert.equal(repetido.id_pedido,r.id_pedido);assert.equal(c.pedidos.filas.length,1);
});
for (const base of [100,250,1000]) test(`1 g, confirmación/cancelación/replay exactos con base ${base}`, async () => {
  const c=await escenario(base);c.body.carrito[0].cantidad=1;
  const r=c.contexto.crearPedido_(c.body);
  const confirmar={id_pedido:r.id_pedido,estado_pedido:'pendiente',actor:'actor-test',idempotency_key:'confirm_granel_123'};
  const cancelar={id_pedido:r.id_pedido,actor:'actor-test',idempotency_key:'cancel_granel_123'};
  c.contexto.actualizarEstadoPedido_(confirmar);c.contexto.actualizarEstadoPedido_(confirmar);
  assert.equal(c.productos.filas[0][6],Math.round((5.6-1/base)*1000)/1000);
  c.contexto.cancelarPedido_(cancelar);c.contexto.cancelarPedido_(cancelar);
  assert.equal(c.productos.filas[0][6],5.6);assert.equal(c.movimientos.filas.length,2);
});
test('stock insuficiente y duplicados que exceden saldo se rechazan', async () => {
  const c=await escenario();c.body.carrito=[{id_producto:'PROD-1',cantidad:3000},{id_producto:'PROD-1',cantidad:3000}];
  assert.throws(()=>c.contexto.crearPedido_(c.body),/Stock insuficiente/);
});
test('unitario y ausencia del modelo conservan contrato', async () => {
  const c=await escenario();c.body.carrito=[{id_producto:'PROD-2',cantidad:2}];
  assert.equal(c.contexto.crearPedido_(c.body).total,1000);
  assert.equal(cantidadStock({modo_venta:'GRANEL',gramos_unidad_stock:250},150),0.6);
  assert.equal(referenciaPrecio({modo_venta:'GRANEL',gramos_referencia:1000},1350),'$1.350 / kg');
});
test('venta presencial 150 g: precio hostil ignorado, snapshot y replay', async () => {
  const c=await escenario(); const ctx=c.contexto;
  c.productos.headers.push('paso_venta');c.productos.filas.forEach(r=>r.push(1));
  const props=new Map();ctx.PropertiesService.getScriptProperties=()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)});
  ctx.LockService.getScriptLock=()=>({tryLock:()=>true,releaseLock(){}});
  ctx.validarAperturaVentaPresencial_=()=>{};
  const clase=c.productos.constructor;
  for(const n of ['VENTAS','DETALLE_VENTAS']) c.hojas[n]=new clase(n,[...ctx.COLUMNAS_VENTA_PRESENCIAL[n]],[],c.control);
  c.hojas.DETALLE_VENTAS.headers.push('modo_venta','gramos_solicitados','gramos_referencia','gramos_unidad_stock');
  for(const k of ctx.COLUMNAS_VENTA_PRESENCIAL.MOVIMIENTOS_STOCK) if(!c.movimientos.headers.includes(k)) c.movimientos.headers.push(k);
  const body={apertura_id:'APE-20260924',vendedor:'actor-test',forma_pago:'efectivo',idempotency_key:'venta_granel_12345',lineas:[{producto_id:'PROD-1',cantidad:150,precio:1,gramos_referencia:1,modo_venta:'UNIDAD'}],total:1};
  const r=ctx.crearVentaPresencial_(body);ctx.crearVentaPresencial_(body);
  assert.equal(r.venta.total,203);assert.equal(r.detalle[0].gramos_solicitados,150);assert.equal(c.productos.filas[0][6],5.45);
  assert.equal(c.hojas.VENTAS.filas.length,1);assert.equal(c.movimientos.filas.length,1);
});
