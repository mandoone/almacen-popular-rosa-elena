import test from 'node:test';
import assert from 'node:assert/strict';
import {csvConteo,leerCsvConteo,plantillaConteo,validarConteo} from '../scripts/lib/conteo-test.mjs';
import {crearEscenario} from './helpers/granel-escenario.mjs';
const producto={id_producto:'PROD-001',nombre:'Arroz',activo:'SI',modo_venta:'GRANEL',unidad_medida:'unidad',gramos_referencia:1000,gramos_unidad_stock:1000,precio_costo:1200,precio_venta:1350,stock_actual:2,stock_minimo:0,prioridad:'media'};
function row(p=producto){return Object.fromEntries(Object.entries({...plantillaConteo([p])[0],stock_contado:'1,751',minimo:'0,001',prioridad:'alta',observacion:'conteo "doble"\npor revisor'}).map(([k,v])=>[k,String(v)]));}
test('conteo: 1g exacto y kg convertidos a las tres bases históricas',()=>{
  for(const base of [100,250,1000]){
    const p={...producto,gramos_unidad_stock:base};
    const r=validarConteo([p],[row(p)]);
    assert.equal(r.ok,true);assert.equal(r.plan[0].stock_objetivo,1751/base);assert.equal(r.plan[0].stock_minimo,1/base);
  }
});
test('conteo: CSV preserva comillas, multilínea y BOM',()=>{
  const r=row();assert.deepEqual(leerCsvConteo(csvConteo([r])),[r]);
  assert.throws(()=>leerCsvConteo('id_producto;id_producto\n'),/encabezados/);
  assert.throws(()=>leerCsvConteo(csvConteo([r]).replace('""doble""','"doble')),/CSV/);
});
for(const [campo,valor,codigo]of [['stock_contado','-1','STOCK_NEGATIVO'],['stock_contado','NaN','STOCK_NEGATIVO'],['stock_contado','0.0001','STOCK_NEGATIVO'],['stock_contado','','STOCK_NEGATIVO'],['unidad_conteo','g','IDENTIDAD'],['modo_venta','UNIDAD','IDENTIDAD'],['precio_venta','0','PRECIO'],['costo_vigente','','COSTO'],['minimo','-1','MINIMO'],['prioridad','urgente','PRIORIDAD']]){
  test('conteo rechaza '+campo+'='+valor,()=>{
    const r=validarConteo([producto],[{...row(),[campo]:valor}]);assert.equal(r.ok,false);assert.ok(r.errores.some(e=>e.codigo.startsWith(codigo)));
  });
}
test('conteo: duplicados, inactivos y cobertura completa',()=>{
  assert.equal(validarConteo([producto],[row(),row()]).errores[0].codigo,'ID_DUPLICADO');
  assert.equal(validarConteo([{...producto,activo:'NO'}],[row()]).errores[0].codigo,'INACTIVO_O_FIXTURE');
  assert.equal(validarConteo([producto],[]).errores[0].codigo,'PRODUCTO_ACTIVO_SIN_CONTEO');
  assert.equal(plantillaConteo([{...producto,id_producto:'PROD-TEST-FIXTURE'},producto,{...producto,activo:'NO'}]).length,1);
});
test('conteo: unidad envasada no admite fracciones; cero contado es válido',()=>{
  const p={...producto,modo_venta:'UNIDAD',gramos_unidad_stock:'',gramos_referencia:''},r={...row(p),stock_contado:'0',minimo:'0'};
  assert.equal(validarConteo([p],[r]).ok,true);
  assert.ok(validarConteo([p],[{...r,stock_contado:'1.5'}]).errores.some(e=>e.codigo==='STOCK_UNITARIO_FRACCIONADO'));
});
async function stockScenario(){
  const c=await crearEscenario();
  c.contexto.LockService.getScriptLock().tryLock=()=>true;
  c.productos.headers.push('modo_venta','gramos_referencia','gramos_unidad_stock');
  c.productos.filas[0].push('GRANEL',1000,1000);
  const h=c.hojas.MOVIMIENTOS_STOCK;h.headers.push('referencia_tipo','referencia_id','payload_hash','producto_id');
  return c;
}
test('maestro admin: modo histórico vacío se expone como UNIDAD sin escribir datos',async()=>{
  const c=await stockScenario();
  for(const col of c.contexto.COLUMNAS_FASE_7_8.PRODUCTOS_ADMIN){
    if(c.productos.headers.includes(col))continue;
    c.productos.headers.push(col);
    for(const fila of c.productos.filas)fila.push('');
  }
  c.productos.filas[0][c.productos.headers.indexOf('modo_venta')]='';
  const antes=JSON.stringify(c.productos.filas);
  assert.equal(c.contexto.listarProductosAdmin_()[0].modo_venta,'UNIDAD');
  assert.equal(JSON.stringify(c.productos.filas),antes);
});
test('ajuste: conflicto del stock esperado no escribe; 1g y replay sí exactos',async()=>{
  const c=await stockScenario(),b={producto_id:'PROD-1',delta:.001,motivo:'recuento_fisico',responsable:'test-operacion',stock_esperado:5.6,idempotency_key:'stock_guard_123456'};
  assert.throws(()=>c.contexto.ajustarStockAdmin_({...b,stock_esperado:0}),/cambio desde/);
  assert.equal(c.productos.filas[0][6],5.6);
  const r=c.contexto.ajustarStockAdmin_(b);assert.equal(r.stock_nuevo,5.601);
  assert.equal(c.contexto.ajustarStockAdmin_(b).stock_nuevo,5.601);
  assert.equal(c.hojas.MOVIMIENTOS_STOCK.filas.length,1);
});
test('ajuste: medio gramo no se redondea silenciosamente',async()=>{
  const c=await stockScenario();
  assert.throws(()=>c.contexto.ajustarStockAdmin_({producto_id:'PROD-1',delta:.0005,motivo:'merma',responsable:'test-operacion',idempotency_key:'stock_half_123456'}),/gramos enteros/);
  assert.equal(c.productos.filas[0][6],5.6);assert.equal(c.hojas.MOVIMIENTOS_STOCK.filas.length,0);
});
test('abastecimiento: propuesta conserva el gramo faltante',async()=>{
  const c=await crearEscenario();
  c.contexto.listarProductosAdmin_=()=>[{...producto,permite_decimal:'SI',paso_venta:.001,stock_actual:.999,stock_minimo:1}];
  const r=c.contexto.obtenerPropuestaAbastecimiento_(100);
  assert.equal(r.lineas[0].cantidad_sugerida,.001);
});
