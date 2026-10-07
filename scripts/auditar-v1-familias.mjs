/** Evidencia C3 contra HEAD inicial. Solo Git/archivos/VM locales; cero servicios. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { crearEscenario } from '../tests/helpers/granel-escenario.mjs';
import { crearEscenarioCompra } from '../tests/helpers/compra-identidad-escenario.mjs';

const inicial = 'f2730011afd139bd61d69d4246086de486f5c872';
const anterior = path => execFileSync('git', ['show', `${inicial}:${path}`], { encoding: 'utf8' });
const normal = s => s.replaceAll('\r\n', '\n');
const sha = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const pathGas = 'scripts/apps-script-pedidos.gs';
const gasInicial = anterior(pathGas), gasFinal = await readFile(pathGas, 'utf8');
const archivosV1 = [
  'src/app/api/productos/route.ts', 'src/app/tienda/page.tsx', 'src/app/api/pedidos/route.ts',
  'src/app/api/admin/pedidos/route.ts', 'src/app/api/admin/pedidos/[id]/route.ts',
  'src/app/api/admin/ventas/route.ts', 'src/app/api/admin/compras/route.ts',
  'src/app/api/admin/productos/route.ts', 'src/app/admin/productos/page.tsx',
  'src/lib/granel.ts', 'src/components/CantidadGranel.tsx',
  'src/lib/fase4/catalogo.ts', 'src/lib/fase4/planCatalogo.ts', 'src/lib/fase4/auditoriaCatalogo.ts',
  'src/lib/fase5/ventaPresencial.ts', 'src/lib/fase7/compras.ts',
  'src/lib/fase8/productosAdmin.ts', 'src/lib/fase9/dtoAdmin.ts',
  'src/lib/fase9/resilienciaPedidos.ts', 'src/lib/fase9/idempotenciaCreacionPedido.ts',
  'scripts/setup-google-sheet.gs', 'src/lib/fase9/roles.ts', 'src/lib/session.ts',
];
for (const p of archivosV1) assert.equal(normal(await readFile(p, 'utf8')), normal(anterior(p)), `V1 cambió: ${p}`);
function funciones(src, path) {
  const sf = ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return new Map(sf.statements.filter(ts.isFunctionDeclaration).map(n => [n.name.text, normal(n.getText(sf))]));
}
const oldGas = funciones(gasInicial, pathGas), newGas = funciones(gasFinal, pathGas);
const modificadas = [...oldGas].filter(([k, v]) => newGas.get(k) !== v).map(([k]) => k);
assert.deepEqual(modificadas, ['doGet', 'doPost', 'actualizarProductoAdmin_', 'crearProductoAdmin_', 'obtenerReportesFase78_']);
function casos(src, fn) {
  const sf = ts.createSourceFile(pathGas, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), out = new Map();
  const node = sf.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === fn);
  function recorrer(n) { if (ts.isCaseClause(n)) out.set(n.expression.getText(sf), n.statements.map(s => normal(s.getText(sf))).join('\n')); ts.forEachChild(n, recorrer); }
  recorrer(node); return out;
}
let casosV1 = 0;
for (const fn of ['doGet', 'doPost']) {
  const antes = casos(gasInicial, fn), despues = casos(gasFinal, fn);
  for (const [k, v] of antes) { assert.equal(despues.get(k), v, `Acción V1 cambió: ${fn}/${k}`); casosV1++; }
}
const transporte = 'src/lib/appsScriptPedidos.ts';
const antesTransporte = funciones(anterior(transporte), transporte), despuesTransporte = funciones(await readFile(transporte, 'utf8'), transporte);
for (const [k, v] of antesTransporte) assert.equal(despuesTransporte.get(k), v, `Transporte V1 cambió: ${k}`);

function cargar(c, fuente) {
  vm.runInNewContext(fuente, c.contexto);
  c.contexto.Date = class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-07T00:00:00Z'])); } };
}
function estadoHojas(c) { return Object.fromEntries(Object.entries(c.hojas).map(([n, h]) => [n, h.filas])); }
async function pedidoV1(fuente, base) {
  const c = await crearEscenario(); cargar(c, fuente);
  c.productos.headers.push('categoria', 'prioridad', 'paso_venta', 'stock_minimo', 'imagen_url');
  c.productos.filas.forEach((f, i) => f.push('Alimentos', 'media', i ? 1 : 0.1, 0, ''));
  if (base) {
    c.productos.headers.push('modo_venta', 'gramos_referencia', 'gramos_unidad_stock');
    c.productos.filas[0].push('GRANEL', 1000, base);
    c.productos.filas[0][3] = base === 1000 ? 'kg' : 'unidad'; c.productos.filas[0][5] = 1350;
    c.detalles.headers.push('modo_venta', 'gramos_solicitados', 'gramos_referencia', 'gramos_unidad_stock');
    c.body.carrito = [{ id_producto: 'PROD-1', cantidad: 150 }];
  }
  const catalogo = c.contexto.listarProductos_('APE-20260924');
  const pedido = c.contexto.crearPedido_(c.body);
  assert.equal(c.contexto.crearPedido_(c.body).id_pedido, pedido.id_pedido);
  const confirmar = { id_pedido: pedido.id_pedido, estado_pedido: 'pendiente', actor: 'qa-local', idempotency_key: 'confirmar_qa_12345' };
  c.contexto.actualizarEstadoPedido_(confirmar); c.contexto.actualizarEstadoPedido_(confirmar);
  const descontado = structuredClone(c.productos.filas);
  const cancelar = { id_pedido: pedido.id_pedido, actor: 'qa-local', idempotency_key: 'cancelar_qa_12345' };
  c.contexto.cancelarPedido_(cancelar); c.contexto.cancelarPedido_(cancelar);
  return { catalogo, pedido, descontado, hojas: estadoHojas(c) };
}
async function compraV1(fuente) {
  const c = await crearEscenarioCompra({ identidad: false }); cargar(c, fuente);
  const compra = c.contexto.crearCompra_(c.bodyCompra);
  assert.deepEqual(c.contexto.crearCompra_(c.bodyCompra), compra);
  const p = c.bodyCompra.lineas[0].producto_id;
  c.contexto.actualizarProductoAdmin_({ producto_id: p, cambios: { nombre: 'SKU QA renombrado' }, responsable: 'qa-local', idempotency_key: 'editar_qa_123456789' });
  return { compra, hojas: estadoHojas(c) };
}
async function ventaV1(fuente) {
  const c = await crearEscenario(); cargar(c, fuente);
  c.productos.headers.push('modo_venta', 'gramos_referencia', 'gramos_unidad_stock', 'paso_venta');
  c.productos.filas[0].push('GRANEL', 1000, 1000, 1); c.productos.filas[1].push('UNIDAD', '', '', 1);
  c.productos.filas[0][5] = 1350;
  const props = new Map(); c.contexto.PropertiesService.getScriptProperties = () => ({ getProperty: k => props.get(k), setProperty: (k, v) => props.set(k, v) });
  c.contexto.LockService.getScriptLock = () => ({ tryLock: () => true, releaseLock() {} });
  c.contexto.validarAperturaVentaPresencial_ = () => {}; // Fixture: no valida calendario real.
  for (const n of ['VENTAS', 'DETALLE_VENTAS']) c.hojas[n] = new c.productos.constructor(n, [...c.contexto.COLUMNAS_VENTA_PRESENCIAL[n]], [], c.control);
  c.hojas.DETALLE_VENTAS.headers.push('modo_venta', 'gramos_solicitados', 'gramos_referencia', 'gramos_unidad_stock');
  for (const k of c.contexto.COLUMNAS_VENTA_PRESENCIAL.MOVIMIENTOS_STOCK) if (!c.movimientos.headers.includes(k)) c.movimientos.headers.push(k);
  const body = { apertura_id: 'APE-20260924', vendedor: 'qa-local', forma_pago: 'efectivo', idempotency_key: 'venta_qa_123456789', lineas: [{ producto_id: 'PROD-1', cantidad: 150 }] };
  const venta = c.contexto.crearVentaPresencial_(body); assert.deepEqual(c.contexto.crearVentaPresencial_(body), venta);
  return { venta, hojas: estadoHojas(c) };
}
const diferenciales = [];
for (const [nombre, fn] of [['pedido_unidad', f => pedidoV1(f)], ...[100, 250, 1000].map(b => ['pedido_granel_' + b, f => pedidoV1(f, b)]), ['compra_legado_y_admin', compraV1], ['venta_presencial_granel', ventaV1]]) {
  const viejo = JSON.parse(JSON.stringify(await fn(gasInicial))), nuevo = JSON.parse(JSON.stringify(await fn(gasFinal)));
  assert.deepEqual(nuevo, viejo, `Resultado V1 distinto: ${nombre}`); diferenciales.push({ nombre, hash: sha(nuevo), igual: true });
}
const evidencia = { inicial, archivos_sin_cambios: archivosV1.length, funciones_GAS_iguales: oldGas.size - modificadas.length, funciones_modificadas: modificadas, acciones_V1_iguales: casosV1, funciones_transporte_iguales: antesTransporte.size, diferenciales, solo_local: true };
if (!process.argv.includes('--no-write')) {
  await mkdir('operativa.local', { recursive: true }); await writeFile('operativa.local/auditoria-v1-familias.json', JSON.stringify(evidencia, null, 2));
}
console.log(JSON.stringify(evidencia));
