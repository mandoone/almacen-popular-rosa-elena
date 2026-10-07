import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { escenarioC4, opcionesC4, cancelarInputC4, reasignarInputC4 } from './fixtures/familias-durable-c4.mjs';
import { confirmarPedidoV2Durable, cancelarPedidoV2Durable, reasignarPedidoV2Durable, obtenerBloqueosOperativos, exigirRecursosLibresV2, verificarOperacionV2 } from '../src/lib/familias/adaptadorDurableV2.ts';
import { llamadaHttpMockV2, InterrupcionSimuladaV2 } from '../src/lib/familias/almacenSheetsMemoriaV2.ts';
import { crearDetallePedidoFamiliaV2 } from '../src/lib/familias/pedidoV2.ts';

const stocks = c => c.estado.hojas.PRODUCTOS.map(s => s.stock_actual);
const plan = (c, n = 0) => JSON.parse(c.estado.hojas.OPERACIONES_PEDIDOS[n].snapshot_json);
const confirmar = c => confirmarPedidoV2Durable(c.almacen, c.input, opcionesC4);
const assertUnico = c => {
  for (const [tabla, id] of [['OPERACIONES_PEDIDOS', 'operacion_id'], ['ASIGNACIONES_PEDIDO', 'asignacion_id'], ['MOVIMIENTOS_STOCK', 'movimiento_id']])
    assert.equal(new Set(c.estado.hojas[tabla].map(f => f[id])).size, c.estado.hojas[tabla].length, tabla);
};
function clonarPedido(c, id = 'PED-C4-2', cantidad = 6, sku = c.estado.hojas.PRODUCTOS[0].id_producto) {
  c.estado.hojas.PEDIDOS.push({ ...structuredClone(c.estado.hojas.PEDIDOS[0]), id_pedido: id, estado: 'recibido', operacion_asignacion_vigente: undefined, evidencia_estado_v2: undefined, evidencia_puntero_v2: undefined });
  c.estado.hojas.DETALLE_PEDIDOS.push(crearDetallePedidoFamiliaV2(id, id + '-D', { modelo_linea: 'FAMILIA_V2', familia_id: c.familia.familia_id, cantidad_solicitada: cantidad, unidad_solicitada: 'unidad', version_oferta: 1 }, c.familia));
  return { ...c.input, id_pedido: id, idempotency_key: 'key_' + id.replaceAll('-', '_') + '_12345',
    asignaciones: [{ id_detalle_pedido: id + '-D', selecciones: [{ producto_id: sku, cantidad_asignada: cantidad }] }] };
}

test('C4 confirma A4+B2 en un diario, snapshots y recibos; readback integral y orden de escrituras', async () => {
  const c = escenarioC4(), original = structuredClone(c.estado.hojas.DETALLE_PEDIDOS), res = await confirmar(c);
  assert.equal(res.estado_operacion, 'COMPLETADA'); assert.equal(res.estado_pedido, 'pendiente'); assert.deepEqual(stocks(c), [0, 5]);
  assert.equal(c.estado.hojas.ASIGNACIONES_PEDIDO.length, 2); assert.equal(c.estado.hojas.MOVIMIENTOS_STOCK.length, 2);
  assert.deepEqual(c.estado.hojas.DETALLE_PEDIDOS, original); assertUnico(c);
  assert.deepEqual(await verificarOperacionV2(c.almacen, res.operacion_id), { valido: true });
  const puntos = c.estado.eventos.map(e => e.punto);
  for (const [antes, despues] of [['PREPARADA', 'APLICANDO'], ['ASIGNACION_2', 'MOVIMIENTO_1'], ['MOVIMIENTO_2', 'STOCK_1'], ['STOCK_2', 'ESTADO_PEDIDO'], ['ESTADO_PEDIDO', 'PUNTERO_VIGENTE'], ['DESPUES_READBACK', 'COMPLETADA']]) assert.ok(puntos.indexOf(antes) < puntos.indexOf(despues));
  for (const s of c.estado.hojas.PRODUCTOS) assert.equal(s.evidencia_stock_v2.plan_hash, plan(c).plan_hash);
});
test('C4 confirmación simple de un SKU y precio/costo intactos', async () => {
  const c = escenarioC4(); c.input.asignaciones[0].selecciones = [{ producto_id: c.cloros[1].id_producto, cantidad_asignada: 6 }];
  const original = c.estado.hojas.PRODUCTOS.map(s => [s.precio_costo, s.precio_venta]);
  await confirmar(c); assert.deepEqual(stocks(c), [4, 1]); assert.equal(c.estado.hojas.ASIGNACIONES_PEDIDO.length, 1);
  assert.deepEqual(c.estado.hojas.PRODUCTOS.map(s => [s.precio_costo, s.precio_venta]), original);
  assert.equal(c.estado.hojas.FAMILIAS_PRODUCTO[0].precio_venta, 650);
});
test('C4 mixed V1 vacío histórico + V2 comparte un plan, sin reescribir ni reinterpretar detalle', async () => {
  const c = escenarioC4({ mixto: true }), antes = structuredClone(c.estado.hojas.DETALLE_PEDIDOS);
  await confirmar(c); assert.deepEqual(stocks(c), [0, 5, 4]);
  assert.equal(c.estado.hojas.OPERACIONES_PEDIDOS.length, 1); assert.equal(c.estado.hojas.MOVIMIENTOS_STOCK.length, 3);
  assert.equal(c.estado.hojas.ASIGNACIONES_PEDIDO.length, 2); assert.equal(plan(c).reservas_v1[0].cantidad_stock, 2);
  assert.deepEqual(c.estado.hojas.DETALLE_PEDIDOS, antes);
  await cancelarPedidoV2Durable(c.nuevoProceso(), cancelarInputC4(c), opcionesC4); assert.deepEqual(stocks(c), [4, 7, 6]); assertUnico(c);
});
test('C4 mixed: fallo V1 o V2 rechaza globalmente antes de PREPARADA', async () => {
  for (const cambiar of [c => { c.estado.hojas.PRODUCTOS[2].stock_actual = 1; }, c => { c.estado.hojas.PRODUCTOS[0].stock_actual = 3; }]) {
    const c = escenarioC4({ mixto: true }); cambiar(c); const antes = structuredClone(c.estado.hojas);
    await assert.rejects(confirmar(c)); assert.deepEqual(c.estado.hojas, antes); assert.equal(c.estado.eventos.length, 0);
  }
});
test('C4 saldo acumulado V1+V2: SKU3+4 con stock6 rechaza globalmente', async () => {
  const c = escenarioC4({ mixto: true }); c.estado.hojas.PRODUCTOS[0].stock_actual = 6;
  const l = c.estado.hojas.DETALLE_PEDIDOS[0]; l.id_producto = c.cloros[0].id_producto; l.cantidad = 3;
  c.estado.hojas.DETALLE_PEDIDOS[1] = crearDetallePedidoFamiliaV2('PED-C4', 'DPE-C4', { modelo_linea: 'FAMILIA_V2', familia_id: c.familia.familia_id, cantidad_solicitada: 4, unidad_solicitada: 'unidad', version_oferta: 1 }, c.familia);
  c.input.asignaciones[0].selecciones = [{ producto_id: l.id_producto, cantidad_asignada: 4 }];
  const antes = structuredClone(c.estado.hojas); await assert.rejects(confirmar(c), /STOCK_INSUFICIENTE/); assert.deepEqual(c.estado.hojas, antes);
});
test('C4 varias líneas familiares comparten stock sin doble cálculo independiente', async () => {
  const c = escenarioC4(); c.estado.hojas.PRODUCTOS[0].stock_actual = 6;
  c.estado.hojas.DETALLE_PEDIDOS = [3, 4].map((cantidad_solicitada, i) => crearDetallePedidoFamiliaV2('PED-C4', 'DPE-' + i,
    { modelo_linea: 'FAMILIA_V2', familia_id: c.familia.familia_id, cantidad_solicitada, unidad_solicitada: 'unidad', version_oferta: 1 }, c.familia));
  c.input.asignaciones = c.estado.hojas.DETALLE_PEDIDOS.map(l => ({ id_detalle_pedido: l.id_detalle_pedido, selecciones: [{ producto_id: c.cloros[0].id_producto, cantidad_asignada: l.cantidad_solicitada }] }));
  await assert.rejects(confirmar(c), /STOCK_INSUFICIENTE/); assert.equal(c.estado.hojas.OPERACIONES_PEDIDOS.length, 0);
  c.estado.hojas.PRODUCTOS[0].stock_actual = 7; await confirmar(c); assert.deepEqual(stocks(c), [0, 7]);
});

const puntosObligatorios = ['PREPARADA', 'APLICANDO', 'ASIGNACION_1', 'ASIGNACION_2', 'MOVIMIENTO_1', 'MOVIMIENTO_2', 'STOCK_1', 'STOCK_2', 'ESTADO_PEDIDO', 'PUNTERO_VIGENTE', 'ANTES_READBACK', 'DESPUES_READBACK'];
const puntosConfirmar = [...puntosObligatorios, ...[2, 3, 4, 5, 6, 7].map(n => 'CHECKPOINT_' + n), 'COMPLETADA'];
for (const modo of ['CAIDA', 'TIMEOUT']) for (const punto of puntosConfirmar) test(`C4 confirmar: ${modo} después de ${punto}, nuevo proceso recupera exactamente una vez`, async () => {
  const c = escenarioC4(); c.almacen.programarFallo(punto, modo);
  await assert.rejects(confirmar(c), e => e instanceof InterrupcionSimuladaV2 && e.punto === punto);
  const fin = await confirmarPedidoV2Durable(c.nuevoProceso(), c.input, opcionesC4);
  assert.equal(fin.estado_operacion, 'COMPLETADA'); assert.deepEqual(stocks(c), [0, 5]);
  assert.equal(c.estado.hojas.ASIGNACIONES_PEDIDO.length, 2); assert.equal(c.estado.hojas.MOVIMIENTOS_STOCK.length, 2); assertUnico(c);
  const antes = structuredClone(c.estado.hojas); assert.deepEqual(await confirmarPedidoV2Durable(c.nuevoProceso(), c.input, opcionesC4), fin); assert.deepEqual(c.estado.hojas, antes);
});
test('C4 fault matrix cubre realmente cada escritura y ambos puntos de readback', async () => {
  const c = escenarioC4(); await confirmar(c);
  assert.deepEqual([...new Set(c.estado.eventos.map(e => e.punto))].sort(), [...puntosConfirmar].sort());
});
for (const modo of ['TIMEOUT', '502']) test(`C4 HTTP ${modo}: backend completado y respuesta perdida, retry histórico sin efectos`, async () => {
  const c = escenarioC4(); await assert.rejects(llamadaHttpMockV2(() => confirmar(c), modo), InterrupcionSimuladaV2);
  const antes = structuredClone(c.estado.hojas); await confirmarPedidoV2Durable(c.nuevoProceso(), c.input, opcionesC4); assert.deepEqual(c.estado.hojas, antes);
});
test('C4 key misma/payload distinto, actor/estado/apertura/tipo distinto:409 sin mutaciones', async () => {
  const c = escenarioC4(); await confirmar(c); const antes = structuredClone(c.estado.hojas);
  for (const cambio of [{ actor: 'otro' }, { estado_esperado: 'pendiente' }, { apertura_id_esperada: 'APE-20261011' }, { asignaciones: [] }])
    await assert.rejects(confirmarPedidoV2Durable(c.nuevoProceso(), { ...c.input, ...cambio }, opcionesC4), e => e.status === 409);
  await assert.rejects(cancelarPedidoV2Durable(c.nuevoProceso(), { ...cancelarInputC4(c), idempotency_key: c.input.idempotency_key }, opcionesC4), e => e.status === 409);
  assert.deepEqual(c.estado.hojas, antes);
});
test('C4 replay canoniza selección y retorna stock histórico tras una operación posterior legítima', async () => {
  const c = escenarioC4(), confirmado = await confirmar(c);
  await cancelarPedidoV2Durable(c.nuevoProceso(), cancelarInputC4(c), opcionesC4);
  const antes = structuredClone(c.estado.hojas), invertido = structuredClone(c.input); invertido.asignaciones[0].selecciones.reverse();
  assert.deepEqual(await confirmarPedidoV2Durable(c.nuevoProceso(), invertido, opcionesC4), confirmado); assert.deepEqual(c.estado.hojas, antes);
});

test('C4 cancelar recibido: cero stock/asignaciones/movimientos; replay único', async () => {
  const c = escenarioC4(), input = { ...cancelarInputC4(c), estado_esperado: 'recibido' };
  const r = await cancelarPedidoV2Durable(c.almacen, input, opcionesC4);
  assert.equal(r.estado_pedido, 'cancelado'); assert.deepEqual(stocks(c), [4, 7]);
  assert.equal(c.estado.hojas.ASIGNACIONES_PEDIDO.length, 0); assert.equal(c.estado.hojas.MOVIMIENTOS_STOCK.length, 0);
  assert.deepEqual(await cancelarPedidoV2Durable(c.nuevoProceso(), input, opcionesC4), r);
});
test('C4 cancelar pendiente/listo usa snapshots aunque familia/SKU inactivos, otra marca/familia y costos/precios', async () => {
  for (const estado of ['pendiente', 'listo']) {
    const c = escenarioC4(); await confirmar(c); const historico = structuredClone(c.estado.hojas.ASIGNACIONES_PEDIDO);
    c.estado.hojas.PEDIDOS[0].estado = estado; c.estado.hojas.FAMILIAS_PRODUCTO[0].activo = 'NO';
    c.estado.hojas.PRODUCTOS.forEach(s => Object.assign(s, { activo: 'NO', marca: 'Cambio', familia_id: 'FAM-OTRA', precio_costo: 999, precio_venta: 999 }));
    const input = { ...cancelarInputC4(c), estado_esperado: estado }, r = await cancelarPedidoV2Durable(c.nuevoProceso(), input, opcionesC4);
    assert.equal(r.estado_operacion, 'COMPLETADA'); assert.deepEqual(stocks(c), [4, 7]); assert.deepEqual(c.estado.hojas.ASIGNACIONES_PEDIDO, historico);
    const antes = structuredClone(c.estado.hojas); assert.deepEqual(await cancelarPedidoV2Durable(c.nuevoProceso(), input, opcionesC4), r); assert.deepEqual(c.estado.hojas, antes);
  }
});
const puntosCancelar = ['PREPARADA', 'APLICANDO', 'CHECKPOINT_2', 'MOVIMIENTO_1', 'MOVIMIENTO_2', 'CHECKPOINT_3', 'STOCK_1', 'STOCK_2', 'CHECKPOINT_4', 'ESTADO_PEDIDO', 'CHECKPOINT_5', 'PUNTERO_VIGENTE', 'CHECKPOINT_6', 'ANTES_READBACK', 'DESPUES_READBACK', 'CHECKPOINT_7', 'COMPLETADA'];
for (const punto of puntosCancelar) test(`C4 cancelación falla en ${punto}; nuevo proceso restaura una vez`, async () => {
  const c = escenarioC4(); await confirmar(c); const input = cancelarInputC4(c), a = c.nuevoProceso(); a.programarFallo(punto);
  await assert.rejects(cancelarPedidoV2Durable(a, input, opcionesC4), InterrupcionSimuladaV2);
  const r = await cancelarPedidoV2Durable(c.nuevoProceso(), input, opcionesC4);
  assert.equal(r.estado_operacion, 'COMPLETADA'); assert.deepEqual(stocks(c), [4, 7]); assertUnico(c);
  assert.equal(c.estado.hojas.ASIGNACIONES_PEDIDO.length, 2); assert.equal(c.estado.hojas.MOVIMIENTOS_STOCK.length, 4);
});
test('C4 reasignar A4+B2→A1+B5 mantiene historia append-only, puntero nuevo y subtotal', async () => {
  const c = escenarioC4({ mixto: true }); await confirmar(c);
  const hist = structuredClone(c.estado.hojas.ASIGNACIONES_PEDIDO), ds = structuredClone(c.estado.hojas.DETALLE_PEDIDOS);
  const r = await reasignarPedidoV2Durable(c.nuevoProceso(), reasignarInputC4(c), opcionesC4);
  assert.equal(r.estado_operacion, 'COMPLETADA'); assert.deepEqual(stocks(c), [3, 2, 4]);
  assert.deepEqual(c.estado.hojas.ASIGNACIONES_PEDIDO.slice(0, 2), hist); assert.equal(c.estado.hojas.ASIGNACIONES_PEDIDO.length, 4);
  assert.deepEqual(c.estado.hojas.DETALLE_PEDIDOS, ds); assert.equal(c.estado.hojas.PEDIDOS[0].operacion_asignacion_vigente, r.operacion_id);
  await cancelarPedidoV2Durable(c.nuevoProceso(), cancelarInputC4(c), opcionesC4); assert.deepEqual(stocks(c), [4, 7, 6]); assertUnico(c);
});
const puntosReasignar = [...puntosConfirmar, 'MOVIMIENTO_3', 'MOVIMIENTO_4'];
for (const punto of puntosReasignar) test(`C4 reasignación falla en ${punto}; conserva anteriores y reparto final único`, async () => {
  const c = escenarioC4(); await confirmar(c); const hist = structuredClone(c.estado.hojas.ASIGNACIONES_PEDIDO), input = reasignarInputC4(c), a = c.nuevoProceso(); a.programarFallo(punto);
  await assert.rejects(reasignarPedidoV2Durable(a, input, opcionesC4), InterrupcionSimuladaV2);
  const r = await reasignarPedidoV2Durable(c.nuevoProceso(), input, opcionesC4);
  assert.equal(r.estado_operacion, 'COMPLETADA'); assert.deepEqual(stocks(c), [3, 2]); assertUnico(c);
  assert.deepEqual(c.estado.hojas.ASIGNACIONES_PEDIDO.slice(0, 2), hist); assert.equal(c.estado.hojas.ASIGNACIONES_PEDIDO.length, 4);
  assert.equal(c.estado.hojas.MOVIMIENTOS_STOCK.length, 6);
  const antes = structuredClone(c.estado.hojas); assert.deepEqual(await reasignarPedidoV2Durable(c.nuevoProceso(), input, opcionesC4), r); assert.deepEqual(c.estado.hojas, antes);
});

test('C4 familia desactivada: sin política HUMAN_GATE423, snapshot intacto y cero escrituras', async () => {
  const c = escenarioC4(); c.estado.hojas.FAMILIAS_PRODUCTO[0].activo = 'NO'; const antes = structuredClone(c.estado.hojas);
  await assert.rejects(confirmar(c), e => e.status === 423 && e.codigo === 'HUMAN_GATE_FAMILIA_DESACTIVADA');
  assert.deepEqual(c.estado.hojas, antes); assert.equal(c.estado.eventos.length, 0);
});
test('C4 política inyectada explícita permite snapshot o bloquea; ninguna queda elegida por defecto', async () => {
  for (const decision of ['PERMITIR_SNAPSHOT', 'BLOQUEAR']) {
    const c = escenarioC4(); c.estado.hojas.FAMILIAS_PRODUCTO[0].activo = 'NO'; c.estado.hojas.FAMILIAS_PRODUCTO[0].precio_venta = 1000;
    const opciones = { ...opcionesC4, resolverPoliticaFamiliaDesactivada: caso => { assert.equal(caso.snapshot.precio_venta, 650); return decision; } };
    if (decision === 'BLOQUEAR') { await assert.rejects(confirmarPedidoV2Durable(c.almacen, c.input, opciones), /POLITICA_BLOQUEAR/); assert.deepEqual(stocks(c), [4, 7]); }
    else { await confirmarPedidoV2Durable(c.almacen, c.input, opciones); assert.deepEqual(stocks(c), [0, 5]); assert.equal(plan(c).decisiones_familia[0].decision, decision); }
  }
});
test('C4 apertura congelada por ID, habilitación actual exigida según C2', async () => {
  const c = escenarioC4({ apertura: true }); await confirmar(c); assert.equal(plan(c).contexto_snapshot.apertura_id, 'APE-20261010');
  const d = escenarioC4({ apertura: true }); d.estado.hojas.APERTURA_PRODUCTOS[0].habilitado = 'NO';
  await assert.rejects(confirmar(d), /NO_ELEGIBLE/); assert.deepEqual(stocks(d), [4, 7]);
  await assert.rejects(confirmarPedidoV2Durable(d.almacen, { ...d.input, apertura_id_esperada: 'APE-20261011' }, opcionesC4), /CONTEXTO_CAMBIO/);
});

for (const base of [100, 250, 1000]) for (const punto of ['STOCK_1', 'DESPUES_READBACK', 'COMPLETADA']) test(`C4 granel base${base}, caída${punto},150g75+75=$203 y cancelación exacta sin redondeo acumulado`, async () => {
  const c = escenarioC4({ base }), antes = structuredClone(c.estado.hojas.DETALLE_PEDIDOS); c.almacen.programarFallo(punto);
  await assert.rejects(confirmar(c), InterrupcionSimuladaV2); const r = await confirmarPedidoV2Durable(c.nuevoProceso(), c.input, opcionesC4);
  assert.equal(r.estado_operacion, 'COMPLETADA'); assert.deepEqual(stocks(c), [2 - 75 / base, 1.925]);
  assert.deepEqual(c.estado.hojas.ASIGNACIONES_PEDIDO.map(a => a.cantidad_stock), [75 / base, 0.075]);
  assert.equal(c.estado.hojas.DETALLE_PEDIDOS[0].subtotal, 203); assert.deepEqual(c.estado.hojas.DETALLE_PEDIDOS, antes);
  const input = cancelarInputC4(c); const a = c.nuevoProceso(); a.programarFallo('STOCK_1', 'TIMEOUT');
  await assert.rejects(cancelarPedidoV2Durable(a, input, opcionesC4), InterrupcionSimuladaV2);
  await cancelarPedidoV2Durable(c.nuevoProceso(), input, opcionesC4); assert.deepEqual(stocks(c), [2, 2]); assertUnico(c);
  await cancelarPedidoV2Durable(c.nuevoProceso(), input, opcionesC4); assert.deepEqual(stocks(c), [2, 2]);
});

for (const punto of ['PREPARADA', 'APLICANDO', 'STOCK_1']) test(`C4 ${punto} bloquea pedido/SKU para confirmación/compra/venta/ajuste conceptual`, async () => {
  const c = escenarioC4(); const p2 = clonarPedido(c, 'PED-OTRO', 1); c.almacen.programarFallo(punto);
  await assert.rejects(confirmar(c), InterrupcionSimuladaV2);
  const b = obtenerBloqueosOperativos(c.estado.hojas.OPERACIONES_PEDIDOS); assert.deepEqual(b.pedidos, ['PED-C4']); assert.equal(b.sku.length, 2);
  for (const accion of ['COMPRA', 'VENTA', 'AJUSTE', 'REASIGNACION']) assert.throws(() => exigirRecursosLibresV2(b, { sku: [c.cloros[0].id_producto], accion }), e => e.status === 423);
  await assert.rejects(confirmarPedidoV2Durable(c.nuevoProceso(), p2, opcionesC4), e => e.status === 423);
  const fin = await confirmarPedidoV2Durable(c.nuevoProceso(), c.input, opcionesC4); assert.equal(fin.estado_operacion, 'COMPLETADA');
  assert.deepEqual(obtenerBloqueosOperativos(c.estado.hojas.OPERACIONES_PEDIDOS).sku, []);
});
test('C4 doble clic concurrente: misma key produce un resultado/plan/descuento', async () => {
  const c = escenarioC4(); const [a, b] = await Promise.all([confirmar(c), confirmarPedidoV2Durable(c.nuevoProceso(), c.input, opcionesC4)]);
  assert.deepEqual(a, b); assert.deepEqual(stocks(c), [0, 5]); assert.equal(c.estado.hojas.OPERACIONES_PEDIDOS.length, 1); assertUnico(c);
});
test('C4 P1/P2 concurrentes no calculan desde el mismo saldo inicial', async () => {
  const c = escenarioC4(); const p2 = clonarPedido(c, 'PED-SEGUNDO', 4);
  const [a, b] = await Promise.allSettled([confirmar(c), confirmarPedidoV2Durable(c.nuevoProceso(), p2, opcionesC4)]);
  assert.equal(a.status, 'fulfilled'); assert.equal(b.status, 'rejected'); assert.equal(b.reason.status, 409);
  assert.deepEqual(stocks(c), [0, 5]); assert.equal(c.estado.hojas.PEDIDOS[1].estado, 'recibido'); assert.equal(c.estado.hojas.OPERACIONES_PEDIDOS.length, 1);
});

for (const [nombre, cambio] of [
  ['saldo final sin recibo de autoría', (c, p) => { c.estado.hojas.PRODUCTOS[0].stock_actual = p.saldos[0].stock_resultante; }],
  ['stock concurrente', c => { c.estado.hojas.PRODUCTOS[0].stock_actual = 3; }],
  ['marca concurrente', c => { c.estado.hojas.PRODUCTOS[0].marca = 'Alterada'; }],
  ['detalle concurrente', c => { c.estado.hojas.DETALLE_PEDIDOS[0].subtotal = 1; }],
  ['pedido cambiado sin autoría', c => { c.estado.hojas.PEDIDOS[0].estado = 'pendiente'; }],
  ['asignación duplicada', (c, p) => { c.estado.hojas.ASIGNACIONES_PEDIDO.push(p.asignaciones_nuevas[0], p.asignaciones_nuevas[0]); }],
  ['asignación alterada', (c, p) => { c.estado.hojas.ASIGNACIONES_PEDIDO.push({ ...p.asignaciones_nuevas[0], marca_snapshot: 'Falsa' }); }],
  ['movimiento duplicado', (c, p) => { c.estado.hojas.MOVIMIENTOS_STOCK.push(p.movimientos[0], p.movimientos[0]); }],
  ['movimiento inesperado', (c, p) => { c.estado.hojas.MOVIMIENTOS_STOCK.push({ ...p.movimientos[0], movimiento_id: 'AJENO' }); }],
  ['familia cambia tras preparar', c => { c.estado.hojas.FAMILIAS_PRODUCTO[0].activo = 'NO'; }],
]) test(`C4 incertidumbre ${nombre}: REQUIERE_REVISION, sin adivinar ni continuar efectos`, async () => {
  const c = escenarioC4(); c.almacen.programarFallo('APLICANDO'); await assert.rejects(confirmar(c), InterrupcionSimuladaV2);
  cambio(c, plan(c)); const antes = structuredClone(c.estado.hojas);
  const r = await confirmarPedidoV2Durable(c.nuevoProceso(), c.input, opcionesC4);
  assert.equal(r.estado_operacion, 'REQUIERE_REVISION'); assert.equal(c.estado.hojas.PEDIDOS[0].estado, antes.PEDIDOS[0].estado);
  for (const t of ['PRODUCTOS', 'ASIGNACIONES_PEDIDO', 'MOVIMIENTOS_STOCK', 'DETALLE_PEDIDOS']) assert.deepEqual(c.estado.hojas[t], antes[t]);
  assert.equal(obtenerBloqueosOperativos(c.estado.hojas.OPERACIONES_PEDIDOS).sku.length, 2);
  const sinCambios = structuredClone(c.estado.hojas); await confirmarPedidoV2Durable(c.nuevoProceso(), c.input, opcionesC4); assert.deepEqual(c.estado.hojas, sinCambios);
});
for (const [nombre, cambiar] of [
  ['movimiento faltante', c => { c.estado.hojas.MOVIMIENTOS_STOCK.pop(); }],
  ['asignación faltante', c => { c.estado.hojas.ASIGNACIONES_PEDIDO.pop(); }],
  ['recibo stock corrupto', c => { c.estado.hojas.PRODUCTOS[0].evidencia_stock_v2.payload_hash = 'incorrecto'; }],
  ['puntero alterado', c => { c.estado.hojas.PEDIDOS[0].operacion_asignacion_vigente = 'OP-AJENA'; }],
]) test(`C4 readback ${nombre}: detecta corrupción y bloquea, sin recrear evidencia comercial`, async () => {
  const c = escenarioC4(); c.almacen.programarFallo('DESPUES_READBACK'); await assert.rejects(confirmar(c), InterrupcionSimuladaV2);
  cambiar(c); const antes = structuredClone(c.estado.hojas); const check = await verificarOperacionV2(c.nuevoProceso(), plan(c).operacion_id); assert.equal(check.valido, false);
  const r = await confirmarPedidoV2Durable(c.nuevoProceso(), c.input, opcionesC4); assert.equal(r.estado_operacion, 'REQUIERE_REVISION');
  assert.deepEqual(c.estado.hojas.PRODUCTOS, antes.PRODUCTOS); assert.deepEqual(c.estado.hojas.ASIGNACIONES_PEDIDO, antes.ASIGNACIONES_PEDIDO); assert.deepEqual(c.estado.hojas.MOVIMIENTOS_STOCK, antes.MOVIMIENTOS_STOCK);
});
test('C4 corrupto entre readback y COMPLETADA es detectado por segunda lectura', async () => {
  const c = escenarioC4(); c.almacen.despuesPaso = punto => { if (punto === 'DESPUES_READBACK') c.estado.hojas.PRODUCTOS[0].stock_actual = 9; };
  const r = await confirmar(c); assert.equal(r.estado_operacion, 'REQUIERE_REVISION'); assert.notEqual(c.estado.hojas.OPERACIONES_PEDIDOS[0].estado_operacion, 'COMPLETADA');
});
test('C4 apertura deshabilitada después de PREPARADA requiere revisión antes de descontar', async () => {
  const c = escenarioC4({ apertura: true }); c.almacen.programarFallo('PREPARADA'); await assert.rejects(confirmar(c), InterrupcionSimuladaV2);
  c.estado.hojas.APERTURA_PRODUCTOS[0].habilitado = 'NO'; const r = await confirmarPedidoV2Durable(c.nuevoProceso(), c.input, opcionesC4);
  assert.equal(r.estado_operacion, 'REQUIERE_REVISION'); assert.deepEqual(stocks(c), [4, 7]);
});
test('C4 diario V1 completo se preserva; incierto desconocido bloquea conservadoramente sin migrar', async () => {
  const c = escenarioC4(); const historico = { operacion_id: 'OP-V1', id_pedido: 'PED-ANTIGUO', idempotency_key: 'key_v1_12345', tipo_operacion: 'CONFIRMAR', estado_operacion: 'COMPLETADA', paso: 3, snapshot_json: '{}', resultado_json: '{}', payload_hash: 'legado', actor: 'qa', creado_en: '2026-01-01', actualizado_en: '2026-01-01' };
  c.estado.hojas.OPERACIONES_PEDIDOS.push(historico); await confirmar(c); assert.deepEqual(c.estado.hojas.OPERACIONES_PEDIDOS[0], historico);
  assert.equal(obtenerBloqueosOperativos([{ ...historico, estado_operacion: 'REQUIERE_REVISION' }]).global, true);
});
test('C4 fuente C1/C2 y todos los archivos operativos permanecen idénticos al HEAD inicial', async () => {
  for (const p of ['src/lib/familias/pedidoV2.ts', 'src/lib/familias/asignacionV2.ts', 'scripts/apps-script-pedidos.gs', 'scripts/setup-google-sheet.gs', 'src/lib/appsScriptPedidos.ts']) {
    const original = execFileSync('git', ['show', `8b1d105b33659ce7468c92fc10413167922bc879:${p}`], { encoding: 'utf8' });
    assert.equal((await readFile(p, 'utf8')).replaceAll('\r\n', '\n'), original.replaceAll('\r\n', '\n'), p);
  }
  for (const p of ['src/app/api/pedidos/route.ts', 'src/app/api/admin/pedidos/route.ts', 'src/lib/appsScriptPedidos.ts', 'scripts/apps-script-pedidos.gs']) assert.doesNotMatch(await readFile(p, 'utf8'), /adaptadorDurableV2|planMixtoV2|almacenSheetsMemoriaV2/);
});

test('C4 respuesta incierta conserva estado observado y no anuncia stock/asignaciones previstas como aplicadas', async () => {
  const c = escenarioC4(); c.almacen.programarFallo('APLICANDO'); await assert.rejects(confirmar(c), InterrupcionSimuladaV2);
  c.estado.hojas.PRODUCTOS[0].stock_actual = 3;
  const r = await confirmarPedidoV2Durable(c.nuevoProceso(), c.input, opcionesC4);
  assert.equal(r.estado_operacion, 'REQUIERE_REVISION'); assert.equal(r.estado_pedido, 'recibido'); assert.deepEqual(r.stocks, []); assert.deepEqual(r.asignacion_ids, []);
});

for (const punto of [...puntosConfirmar, 'MOVIMIENTO_3', 'STOCK_3']) test(`C4 mixed caída${punto}: todo el pedido termina con un único plan y V1+V2 coherentes`, async () => {
  const c = escenarioC4({ mixto: true }); c.almacen.programarFallo(punto);
  await assert.rejects(confirmar(c), InterrupcionSimuladaV2); const r = await confirmarPedidoV2Durable(c.nuevoProceso(), c.input, opcionesC4);
  assert.equal(r.estado_operacion, 'COMPLETADA'); assert.deepEqual(stocks(c), [0, 5, 4]); assert.equal(c.estado.hojas.OPERACIONES_PEDIDOS.length, 1);
  assert.equal(c.estado.hojas.MOVIMIENTOS_STOCK.length, 3); assert.equal(c.estado.hojas.ASIGNACIONES_PEDIDO.length, 2); assertUnico(c);
});
for (const [nombre, cambio] of [
  ['SKU ajeno', c => { c.estado.hojas.PRODUCTOS[0].familia_id = 'FAM-OTRA'; }],
  ['SKU inactivo', c => { c.estado.hojas.PRODUCTOS[0].activo = 'NO'; }],
  ['contenido distinto', c => { c.estado.hojas.PRODUCTOS[0].contenido_cantidad = 750; }],
  ['marca explícita incompatible', c => { c.familia.politica_marca = 'EXPLICITA'; c.familia.marca_publica = 'Clorinda'; c.estado.hojas.DETALLE_PEDIDOS[0] = crearDetallePedidoFamiliaV2('PED-C4', 'DPE-C4', { modelo_linea: 'FAMILIA_V2', familia_id: c.familia.familia_id, cantidad_solicitada: 6, unidad_solicitada: 'unidad', version_oferta: 1 }, c.familia); }],
  ['reparto incompleto', c => { c.input.asignaciones[0].selecciones[1].cantidad_asignada = 1; }],
  ['reparto excedido', c => { c.input.asignaciones[0].selecciones[1].cantidad_asignada = 3; }],
  ['selección repetida', c => { c.input.asignaciones[0].selecciones.push({ ...c.input.asignaciones[0].selecciones[0] }); }],
  ['NaN', c => { c.input.asignaciones[0].selecciones[0].cantidad_asignada = NaN; }],
  ['overflow', c => { c.input.asignaciones[0].selecciones[0].cantidad_asignada = Number.MAX_SAFE_INTEGER + 1; }],
  ['actor sin tipo', c => { c.input.actor = undefined; }],
  ['modo de línea desconocido', c => { c.estado.hojas.DETALLE_PEDIDOS[0].modelo_linea = 'V3'; }],
  ['SKU repetido en maestro', c => { c.estado.hojas.PRODUCTOS.push(structuredClone(c.estado.hojas.PRODUCTOS[0])); }],
]) test(`C4 validación previa ${nombre}: no existe efecto ni plan parcial`, async () => {
  const c = escenarioC4(); cambio(c); const antes = structuredClone(c.estado.hojas);
  await assert.rejects(confirmar(c)); assert.deepEqual(c.estado.hojas, antes); assert.equal(c.estado.eventos.length, 0);
});
test('C4 base granel no válida se rechaza sin escrituras', async () => {
  const c = escenarioC4({ base: 250 }); c.estado.hojas.PRODUCTOS[0].gramos_unidad_stock = 333;
  await assert.rejects(confirmar(c)); assert.equal(c.estado.eventos.length, 0);
});
test('C4 línea V1 granel conserva cantidad nativa histórica y SKU ID legado sin exigir familia', async () => {
  const c = escenarioC4({ mixto: true }), s = c.estado.hojas.PRODUCTOS[2], l = c.estado.hojas.DETALLE_PEDIDOS[0];
  Object.assign(s, { id_producto: 'ID-HISTORICO', modo_venta: 'GRANEL', gramos_unidad_stock: 250, gramos_referencia: 1000, permite_decimal: 'SI', stock_actual: 4 });
  Object.assign(l, { id_producto: s.id_producto, cantidad: 0.6, modo_venta: 'GRANEL', gramos_unidad_stock: 250, gramos_solicitados: 150, gramos_referencia: 1000 });
  const detalle = structuredClone(l); await confirmar(c); assert.equal(stocks(c)[2], 3.4); assert.deepEqual(c.estado.hojas.DETALLE_PEDIDOS[0], detalle);
  await cancelarPedidoV2Durable(c.nuevoProceso(), cancelarInputC4(c), opcionesC4); assert.equal(stocks(c)[2], 4);
});
test('C4 pedido completamente V1 no se enruta silenciosamente al adaptador nuevo', async () => {
  const c = escenarioC4({ mixto: true }); c.estado.hojas.DETALLE_PEDIDOS.pop(); c.input.asignaciones = [];
  await assert.rejects(confirmar(c), /SIN_LINEAS_V2/); assert.equal(c.estado.eventos.length, 0);
});
test('C4 reasignación inválida no devuelve/descuenta ni escribe un plan parcial', async () => {
  const c = escenarioC4(); await confirmar(c); const antes = structuredClone(c.estado.hojas), input = reasignarInputC4(c);
  input.asignaciones[0].selecciones[0].producto_id = 'PROD-AJENO';
  await assert.rejects(reasignarPedidoV2Durable(c.nuevoProceso(), input, opcionesC4)); assert.deepEqual(c.estado.hojas, antes);
});
test('C4 puntero manipulado a una operación histórica del mismo pedido se rechaza por recibo', async () => {
  const c = escenarioC4(); const original = await confirmar(c); await reasignarPedidoV2Durable(c.nuevoProceso(), reasignarInputC4(c), opcionesC4);
  c.estado.hojas.PEDIDOS[0].operacion_asignacion_vigente = original.operacion_id; const antes = structuredClone(c.estado.hojas);
  await assert.rejects(cancelarPedidoV2Durable(c.nuevoProceso(), cancelarInputC4(c), opcionesC4), /PUNTERO_SIN_AUTORIA/); assert.deepEqual(c.estado.hojas, antes);
});
for (const [nombre, cambiar] of [
  ['JSON inválido', op => { op.snapshot_json = '{'; }],
  ['JSON null', op => { op.snapshot_json = 'null'; }],
  ['plan modificado', op => { const p = JSON.parse(op.snapshot_json); p.saldos[0].stock_resultante = 90; op.snapshot_json = JSON.stringify(p); }],
  ['cabecera diario ajena', op => { op.actor = 'otro'; }],
  ['cursor corrupto', op => { op.paso = 99; }],
]) test(`C4 diario corrupto ${nombre}: marca REQUIERE_REVISION y bloqueo global conservador`, async () => {
  const c = escenarioC4(); c.almacen.programarFallo('PREPARADA'); await assert.rejects(confirmar(c), InterrupcionSimuladaV2);
  cambiar(c.estado.hojas.OPERACIONES_PEDIDOS[0]); const antes = structuredClone(c.estado.hojas.PRODUCTOS);
  const r = await confirmarPedidoV2Durable(c.nuevoProceso(), c.input, opcionesC4); assert.equal(r.estado_operacion, 'REQUIERE_REVISION');
  assert.deepEqual(c.estado.hojas.PRODUCTOS, antes); assert.equal(obtenerBloqueosOperativos(c.estado.hojas.OPERACIONES_PEDIDOS).global, true);
});
test('C4 resultado completado corrupto se bloquea sin volver a escribir stock', async () => {
  const c = escenarioC4(); await confirmar(c); c.estado.hojas.OPERACIONES_PEDIDOS[0].resultado_json = 'no JSON'; const antes = structuredClone(c.estado.hojas.PRODUCTOS);
  const r = await confirmarPedidoV2Durable(c.nuevoProceso(), c.input, opcionesC4); assert.equal(r.estado_operacion, 'REQUIERE_REVISION'); assert.deepEqual(c.estado.hojas.PRODUCTOS, antes);
});
test('C4 evidencia perdida después de checkpoint movimiento bloquea antes del primer saldo', async () => {
  const c = escenarioC4(); c.almacen.despuesPaso = punto => { if (punto === 'CHECKPOINT_3') c.estado.hojas.MOVIMIENTOS_STOCK.pop(); };
  const r = await confirmar(c); assert.equal(r.estado_operacion, 'REQUIERE_REVISION'); assert.deepEqual(stocks(c), [4, 7]);
});
test('C4 operación en SKU A/B no bloquea un pedido independiente con otro SKU', async () => {
  const c = escenarioC4(); const otro = { ...structuredClone(c.cloros[1]), id_producto: 'PROD-QA-C', stock_actual: 10 }; c.estado.hojas.PRODUCTOS.push(otro);
  const p2 = clonarPedido(c, 'PED-INDEPENDIENTE', 1, otro.id_producto); c.almacen.programarFallo('APLICANDO'); await assert.rejects(confirmar(c), InterrupcionSimuladaV2);
  const r = await confirmarPedidoV2Durable(c.nuevoProceso(), p2, opcionesC4); assert.equal(r.estado_operacion, 'COMPLETADA'); assert.deepEqual(stocks(c), [4, 7, 9]);
});
for (const base of [100, 250, 1000]) test(`C4 reasignación granel base${base} conserva203,75+75→25+125 y reversión exacta`, async () => {
  const c = escenarioC4({ base }); await confirmar(c);
  const input = { ...reasignarInputC4(c), asignaciones: [{ id_detalle_pedido: 'DPE-C4', selecciones: c.estado.hojas.PRODUCTOS.map((s, i) => ({ producto_id: s.id_producto, cantidad_asignada: i ? 125 : 25 })) }] };
  const a = c.nuevoProceso(); a.programarFallo('STOCK_1'); await assert.rejects(reasignarPedidoV2Durable(a, input, opcionesC4), InterrupcionSimuladaV2);
  await reasignarPedidoV2Durable(c.nuevoProceso(), input, opcionesC4); assert.deepEqual(stocks(c), [2 - 25 / base, 1.875]); assert.equal(c.estado.hojas.DETALLE_PEDIDOS[0].subtotal, 203);
  await cancelarPedidoV2Durable(c.nuevoProceso(), cancelarInputC4(c), opcionesC4); assert.deepEqual(stocks(c), [2, 2]); assertUnico(c);
});
test('C4 mock exige lock/CAS y soporta eliminación compensatoria sin tocar asignaciones comerciales', async () => {
  const c = escenarioC4(), row = structuredClone(c.estado.hojas.APERTURA_PRODUCTOS[0] ?? { apertura_id: 'APE-20261010', producto_id: 'PROD-QA-MOCK', habilitado: 'SI' });
  await assert.rejects(c.almacen.insertar('APERTURA_PRODUCTOS', row, 'SIN_LOCK'), e => e.status === 423);
  await c.almacen.conLock(async () => {
    await c.almacen.insertar('APERTURA_PRODUCTOS', row, 'MOCK_INSERTAR');
    await assert.rejects(c.almacen.eliminar('APERTURA_PRODUCTOS', 'producto_id', row.producto_id, { ...row, habilitado: 'NO' }, 'MOCK_CAS_FALLA'), e => e.status === 409);
    await c.almacen.eliminar('APERTURA_PRODUCTOS', 'producto_id', row.producto_id, row, 'MOCK_COMPENSAR');
  });
  assert.equal(c.estado.hojas.APERTURA_PRODUCTOS.length, 0);
});
