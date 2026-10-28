/** Diferencial del sprint contra 9200139: todos los cálculos y funciones V1 conservados salvo guards explícitos de cierre. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const base='9200139c365483ab3fb18b85219f2c36dd9e8e64',normal=s=>s.replaceAll('\r\n','\n');
const anterior=p=>normal(execFileSync('git',['show',`${base}:${p}`],{encoding:'utf8'}));
const guardas={
 doGet:"      case 'obtenerCajaTurnoTest':\n        exigirToken_(params.token);\n        return jsonOk_(obtenerCajaTurnoTest_(params.apertura_id));\n",
 doPost:"      case 'registrarCierreCajaTurnoTest':\n        exigirToken_(body.token);\n        return jsonOk_(registrarCierreCajaTurnoTest_(body));\n",
 construirPlanCreacionPedido_:"  exigirCajaNoCerradaTurno_(ss, payload.apertura_id);\n",
 prepararPlanStockPedido_:"  var pedidoCaja = obtenerPedidoParaOperacion_(ss, idPedido);\n  var columnaCaja = pedidoCaja.hoja.headers.indexOf('apertura_id');\n  exigirCajaNoCerradaTurno_(ss, columnaCaja < 0 ? '' : limpiar_(pedidoCaja.hoja.filas[pedidoCaja.indice][columnaCaja]));\n",
 actualizarEstadoPedido_:"    var columnaCaja = pedido.hoja.headers.indexOf('apertura_id');\n    if (pedido.estado !== estadoPedido || (estadoPago && estadoPago !== limpiar_(pedido.hoja.filas[pedido.indice][col_(pedido.hoja,'estado_pago')]))) {\n      exigirCajaNoCerradaTurno_(ss, columnaCaja < 0 ? '' : limpiar_(pedido.hoja.filas[pedido.indice][columnaCaja]));\n    }\n",
 persistirVentaPresencial_:"  exigirCajaNoCerradaTurno_(ss, entrada.apertura_id);\n",
 persistirRegistroSimpleIdempotente_:"    if (hojaNombre === HOJAS.GASTOS_EXTRA) {\n      var asociacion = asociacionGastoTurno_(entrada.observaciones);\n      if (asociacion) {\n        destinoCajaTurno_(ss);\n        obtenerAperturaEnHoja_(leerHoja_(ss, HOJAS.APERTURAS), asociacion.apertura_id);\n        exigirCajaNoCerradaTurno_(ss, asociacion.apertura_id);\n      }\n    }\n",
};
const p='scripts/apps-script-pedidos.gs',parse=s=>ts.createSourceFile(p,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const old=parse(anterior(p)),current=normal(readFileSync(p,'utf8')),nuevo=parse(current.split('// BEGIN CAJA_TURNO_GENERADO')[0]);
assert.equal(nuevo.statements.length,old.statements.length);
for(let i=0;i<old.statements.length;i++){
 const a=old.statements[i],b=nuevo.statements[i],nombre=a.name?.text;
 let texto=b.getText(nuevo);
 if(guardas[nombre]){assert.equal(texto.split(guardas[nombre]).length,2,`guard exacto ${nombre}`);texto=texto.replace(guardas[nombre],'');}
 assert.equal(texto,a.getText(old),`declaración V1 ${nombre || i}`);
}
const rutas=[
 'src/lib/granel.ts','src/lib/fase4/catalogo.ts','src/lib/fase4/planCatalogo.ts','src/lib/fase7/compras.ts','src/lib/fase8/productosAdmin.ts',
 'src/app/api/productos/route.ts','src/app/api/pedidos/route.ts','src/app/api/admin/pedidos/route.ts','src/app/api/admin/pedidos/[id]/route.ts',
 'src/app/api/admin/ventas/route.ts','src/app/api/admin/compras/route.ts','src/lib/session.ts',
];
for(const ruta of rutas)assert.equal(normal(readFileSync(ruta,'utf8')),anterior(ruta),ruta);
console.log(`PASS | diferencial V1: ${old.statements.length} declaraciones GAS, ${Object.keys(guardas).length} adiciones exactas, ${rutas.length} archivos críticos íntegros; UX autorizada fuera de esta igualdad.`);
