import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { crearFixturesFamilias } from './fixtures/familias-producto.mjs';
import { crearDetallePedidoFamiliaV2 } from '../src/lib/familias/pedidoV2.ts';
import { prepararConfirmacionFamiliaV2, prepararCancelacionFamiliaV2, reasignarAsignacionPedido, avanzarPlanDurableV2, ejecutarPlanLocalV2 } from '../src/lib/familias/asignacionV2.ts';

const meta = (n = 1) => ({ operacion_id: `OP-QA-${n}`, idempotency_key: `operacion_qa_${n}_12345`, actor: 'qa-local', creado_en: '2026-10-07T08:00:00Z' });
function escenario() {
  const f = crearFixturesFamilias();
  const l = crearDetallePedidoFamiliaV2('PED-QA', 'DPE-QA', { modelo_linea: 'FAMILIA_V2', familia_id: f.economico.familia_id, cantidad_solicitada: 6, unidad_solicitada: 'unidad', version_oferta: 1 }, f.economico);
  const pedido = { id_pedido: 'PED-QA', estado: 'recibido', lineas: [l], asignaciones: [] };
  const reparto = [{ id_detalle_pedido: l.id_detalle_pedido, selecciones: [{ producto_id: f.cloros[0].id_producto, cantidad_asignada: 4 }, { producto_id: f.cloros[1].id_producto, cantidad_asignada: 2 }] }];
  const estado = { pedido, skus: f.cloros, movimientos: [], asignaciones_historicas: [], auditoria: [] };
  return { ...f, pedido, reparto, estado };
}
async function confirmar(c = escenario()) {
  const plan = await prepararConfirmacionFamiliaV2(c.pedido, c.estado.skus, c.reparto, {}, meta());
  return { c, ...await ejecutarPlanLocalV2(plan, c.estado) };
}

test('C2: A4+B2 completa solicitud6; stock A0/B5, identidad congelada, precio650, inputs intactos', async () => {
  const c = escenario(), antes = structuredClone(c);
  const p = await prepararConfirmacionFamiliaV2(c.pedido, c.cloros, c.reparto, {}, meta());
  assert.equal(p.estado, 'PREPARADA'); assert.equal(p.pedido_resultante.lineas[0].subtotal, 3900);
  const r = await ejecutarPlanLocalV2(p, c.estado);
  assert.equal(r.plan.estado, 'COMPLETADA'); assert.deepEqual(r.estado.skus.map(s => s.stock_actual), [0, 5]);
  assert.equal(r.estado.pedido.estado, 'pendiente'); assert.equal(r.estado.movimientos.length, 2);
  assert.deepEqual(r.estado.pedido.asignaciones.map(a => [a.marca_snapshot, a.cantidad_asignada]), [['Marca A', 4], ['Marca B', 2]]);
  assert.equal(r.estado.auditoria.length, 1); assert.equal(r.estado.asignaciones_historicas.length, 2);
  assert.deepEqual(c, antes);
});

for (const [nombre, mutar] of [
  ['otra familia', c => { c.cloros[0].familia_id = 'FAM-OTRA'; }],
  ['inactivo', c => { c.cloros[0].activo = 'NO'; }],
  ['especial no habilitado', c => { c.cloros[0].tipo_disponibilidad = 'POR_APERTURA'; }],
  ['contenido diferente', c => { c.cloros[0].contenido_cantidad = 750; }],
  ['marca ausente', c => { c.cloros[0].marca = ''; }],
  ['incompleto', c => { c.reparto[0].selecciones[1].cantidad_asignada = 1; }],
  ['excedido', c => { c.reparto[0].selecciones[1].cantidad_asignada = 3; }],
  ['stock insuficiente', c => { c.cloros[0].stock_actual = 3; }],
  ['SKU duplicado', c => { c.cloros.push(structuredClone(c.cloros[0])); }],
  ['asignación duplicada', c => { c.reparto[0].selecciones.push({ ...c.reparto[0].selecciones[0] }); }],
  ['reparto línea ajena', c => { c.reparto[0].id_detalle_pedido = 'DPE-OTRA'; }],
  ['NaN', c => { c.reparto[0].selecciones[0].cantidad_asignada = NaN; }],
  ['overflow', c => { c.reparto[0].selecciones[0].cantidad_asignada = Number.MAX_SAFE_INTEGER + 1; }],
  ['stock fraccional envasado', c => { c.cloros[0].stock_actual = 4.5; }],
]) test(`C2: rechaza ${nombre} sin mutación`, async () => {
  const c = escenario(); mutar(c); const antes = structuredClone(c);
  await assert.rejects(prepararConfirmacionFamiliaV2(c.pedido, c.cloros, c.reparto, {}, meta())); assert.deepEqual(c, antes);
});

test('C2: marca explícita ajena rechazada y apertura habilitada aceptada', async () => {
  const c = escenario(); c.cloros[0].tipo_disponibilidad = 'POR_APERTURA';
  const p = await prepararConfirmacionFamiliaV2(c.pedido, c.cloros, c.reparto, { apertura_id: 'APE-20261010', sku_habilitados: [c.cloros[0].id_producto] }, meta());
  assert.equal(p.estado, 'PREPARADA');
  const l = crearDetallePedidoFamiliaV2('PED-QA', 'DPE-QA', { modelo_linea: 'FAMILIA_V2', familia_id: c.clorinda.familia_id, cantidad_solicitada: 1, unidad_solicitada: 'unidad', version_oferta: 1 }, c.clorinda);
  const s = { ...c.skuClorinda, marca: 'Marca distinta' };
  await assert.rejects(prepararConfirmacionFamiliaV2({ ...c.pedido, lineas: [l] }, [s], [{ id_detalle_pedido: 'DPE-QA', selecciones: [{ producto_id: s.id_producto, cantidad_asignada: 1 }] }], {}, meta()), /NO_EQUIVALENTE/);
});

test('C2: misma key/reparto replay histórico; orden de selección equivalente; otra cantidad409', async () => {
  const { c, plan, estado } = await confirmar();
  const cambiado = estado.skus.map(s => ({ ...s, marca: 'Cambio posterior', activo: 'NO', stock_actual: 99 }));
  const reparto = c.reparto.map(r => ({ ...r, selecciones: [...r.selecciones].reverse() }));
  const replay = await prepararConfirmacionFamiliaV2(estado.pedido, cambiado, reparto, {}, { ...meta(), creado_en: '2026-10-08T08:00:00Z', operacion_id: 'ID-NUEVO-IGNORADO' }, plan);
  assert.deepEqual(replay, plan);
  await assert.rejects(prepararConfirmacionFamiliaV2(estado.pedido, cambiado, [{ ...reparto[0], selecciones: [{ producto_id: cambiado[1].id_producto, cantidad_asignada: 6 }] }], {}, meta(), plan), e => e.status === 409 && e.codigo === 'CONFLICTO_IDEMPOTENCIA');
  const r = await ejecutarPlanLocalV2(plan, estado); assert.deepEqual(r.estado, estado);
});

test('C2: cancelación devuelve exactamente A4+B2, incluso SKU ahora inactivo/de otra familia', async () => {
  const { plan, estado } = await confirmar();
  estado.skus[0].activo = 'NO'; estado.skus[0].familia_id = 'FAM-NUEVA'; estado.skus[0].marca = 'Maestro cambiado';
  const cancel = await prepararCancelacionFamiliaV2(estado.pedido, estado.skus, meta(2));
  const r = await ejecutarPlanLocalV2(cancel, estado);
  assert.equal(r.plan.estado, 'COMPLETADA'); assert.equal(r.estado.pedido.estado, 'cancelado');
  assert.deepEqual(r.estado.skus.map(s => s.stock_actual), [4, 7]); assert.equal(r.estado.movimientos.length, 4);
  assert.deepEqual(r.estado.pedido.asignaciones, plan.pedido_resultante.asignaciones);
  const replay = await prepararCancelacionFamiliaV2(r.estado.pedido, [], meta(2), r.plan); assert.deepEqual(replay, r.plan);
});
test('C2: cancelar recibido no genera movimientos; entregado/cancelado no reabre', async () => {
  const c = escenario(), p = await prepararCancelacionFamiliaV2(c.pedido, c.cloros, meta(2));
  assert.equal(p.movimientos.length, 0); const r = await ejecutarPlanLocalV2(p, c.estado);
  assert.deepEqual(r.estado.skus, c.cloros); assert.equal(r.estado.pedido.estado, 'cancelado');
  for (const estado of ['entregado', 'cancelado']) await assert.rejects(prepararCancelacionFamiliaV2({ ...c.pedido, estado }, c.cloros, meta(3)));
});
test('C2: histórico cantidad corrupta/base alterada no se reinterpreta ni devuelve', async () => {
  const { estado } = await confirmar();
  const p = structuredClone(estado.pedido); p.asignaciones[0].cantidad_stock = 3;
  await assert.rejects(prepararCancelacionFamiliaV2(p, estado.skus, meta(2)), /SNAPSHOT/);
  const s = structuredClone(estado.skus); s[0].modo_venta = 'GRANEL'; s[0].gramos_unidad_stock = 1000;
  await assert.rejects(prepararCancelacionFamiliaV2(estado.pedido, s, meta(2)));
});

test('C2: reasignación revierte A4+B2 y aplica B6, conserva histórico y es idempotente', async () => {
  const { estado } = await confirmar();
  const reparto = [{ id_detalle_pedido: 'DPE-QA', selecciones: [{ producto_id: estado.skus[1].id_producto, cantidad_asignada: 6 }] }];
  const p = await reasignarAsignacionPedido(estado.pedido, estado.skus, reparto, {}, meta(3));
  assert.deepEqual(p.movimientos.map(m => m.tipo), ['DEVOLUCION_V2', 'DEVOLUCION_V2', 'ASIGNACION_V2']);
  const r = await ejecutarPlanLocalV2(p, estado);
  assert.equal(r.plan.estado, 'COMPLETADA'); assert.deepEqual(r.estado.skus.map(s => s.stock_actual), [4, 1]);
  assert.equal(r.estado.asignaciones_historicas.length, 3); assert.equal(r.estado.pedido.asignaciones.length, 1);
  assert.equal(r.estado.pedido.operacion_asignacion_vigente, meta(3).operacion_id);
  assert.deepEqual(await reasignarAsignacionPedido(r.estado.pedido, [], reparto, {}, meta(3), r.plan), r.plan);
  const cancel = await prepararCancelacionFamiliaV2(r.estado.pedido, r.estado.skus, meta(4));
  assert.deepEqual((await ejecutarPlanLocalV2(cancel, r.estado)).estado.skus.map(s => s.stock_actual), [4, 7]);
});
test('C2: reasignación inválida no revierte ni altera pedido confirmado', async () => {
  const { estado } = await confirmar(), antes = structuredClone(estado);
  await assert.rejects(reasignarAsignacionPedido(estado.pedido, estado.skus, [{ id_detalle_pedido: 'DPE-QA', selecciones: [{ producto_id: 'PROD-AJENO', cantidad_asignada: 6 }] }], {}, meta(3)));
  assert.deepEqual(estado, antes);
});

test('C2: múltiples líneas comparten SKU y no sobreasignan stock acumulado', async () => {
  const c = escenario(); c.pedido.lineas[0].cantidad_solicitada = 3; c.pedido.lineas[0].subtotal = 1950;
  c.pedido.lineas.push({ ...c.pedido.lineas[0], id_detalle_pedido: 'DPE-2' });
  const reparto = c.pedido.lineas.map(l => ({ id_detalle_pedido: l.id_detalle_pedido, selecciones: [{ producto_id: c.cloros[0].id_producto, cantidad_asignada: 3 }] }));
  await assert.rejects(prepararConfirmacionFamiliaV2(c.pedido, c.cloros, reparto, {}, meta()), /STOCK_INSUFICIENTE/);
  reparto[1].selecciones[0].producto_id = c.cloros[1].id_producto;
  assert.equal((await ejecutarPlanLocalV2(await prepararConfirmacionFamiliaV2(c.pedido, c.cloros, reparto, {}, meta()), c.estado)).plan.estado, 'COMPLETADA');
});

test('C2: reanuda cada checkpoint sin duplicar stocks/movimientos ni histórico', async () => {
  const c = escenario(), p = await prepararConfirmacionFamiliaV2(c.pedido, c.cloros, c.reparto, {}, meta());
  let r = { plan: p, estado: c.estado };
  for (let i = 0; i < 4; i++) {
    const terminado = await ejecutarPlanLocalV2(structuredClone(r.plan), structuredClone(r.estado));
    assert.equal(terminado.plan.estado, 'COMPLETADA'); assert.deepEqual(terminado.estado.skus.map(s => s.stock_actual), [0, 5]); assert.equal(terminado.estado.movimientos.length, 2);
    r = await avanzarPlanDurableV2(r.plan, r.estado);
  }
});
test('C2: movimiento+stock ya aplicados y cursor atrasado se reconocen sin descontar otra vez', async () => {
  const c = escenario(), p = await prepararConfirmacionFamiliaV2(c.pedido, c.cloros, c.reparto, {}, meta());
  const applying = (await avanzarPlanDurableV2(p, c.estado)).plan;
  const paso = await avanzarPlanDurableV2(applying, c.estado);
  const r = await ejecutarPlanLocalV2(applying, paso.estado);
  assert.equal(r.plan.estado, 'COMPLETADA'); assert.deepEqual(r.estado.skus.map(s => s.stock_actual), [0, 5]); assert.equal(r.estado.movimientos.length, 2);
});
for (const [nombre, mutar] of [
  ['stock escrito sin movimiento', (r, p) => { r.estado.skus[0].stock_actual = p.movimientos[0].stock_resultante; }],
  ['concurrencia', r => { r.estado.skus[0].stock_actual = 3; }],
  ['cursor sin evidencia', r => { r.plan.paso = 1; }],
  ['plan alterado', r => { r.plan.movimientos[0].stock_resultante = 10; }],
  ['pedido alterado', r => { r.estado.pedido.estado = 'entregado'; }],
  ['movimiento duplicado', (r, p) => { r.estado.movimientos.push(p.movimientos[0], p.movimientos[0]); }],
]) test(`C2: ${nombre} requiere revisión y no sigue descontando`, async () => {
  const c = escenario(), p = await prepararConfirmacionFamiliaV2(c.pedido, c.cloros, c.reparto, {}, meta());
  const r = await avanzarPlanDurableV2(p, c.estado); mutar(r, p); const antes = structuredClone(r.estado);
  const revision = await ejecutarPlanLocalV2(r.plan, r.estado);
  assert.equal(revision.plan.estado, 'REQUIERE_REVISION'); assert.deepEqual(revision.estado, antes);
});

for (const base of [100, 250, 1000]) test(`C2: granel base ${base}, 75+75g subtotal203 y reversión exacta`, async () => {
  const c = escenario(), f = { ...c.arroz, precio_venta: 1350, gramos_referencia: 1000 };
  const l = crearDetallePedidoFamiliaV2('PED-QA', 'DPE-G', { modelo_linea: 'FAMILIA_V2', familia_id: f.familia_id, cantidad_solicitada: 150, unidad_solicitada: 'g', version_oferta: 1 }, f);
  const skus = c.granel.slice(0, 2).map((s, i) => ({ ...s, stock_actual: 2, gramos_unidad_stock: i ? 1000 : base, unidad_medida: 'unidad' }));
  const pedido = { ...c.pedido, lineas: [l] }, estado = { ...c.estado, pedido, skus };
  const reparto = [{ id_detalle_pedido: 'DPE-G', selecciones: skus.map(s => ({ producto_id: s.id_producto, cantidad_asignada: 75 })) }];
  const p = await prepararConfirmacionFamiliaV2(pedido, skus, reparto, {}, meta()), r = await ejecutarPlanLocalV2(p, estado);
  assert.equal(r.plan.estado, 'COMPLETADA'); assert.equal(r.estado.pedido.lineas[0].subtotal, 203);
  assert.deepEqual(r.estado.pedido.asignaciones.map(a => a.cantidad_stock), [75 / base, 0.075]);
  const cancel = await prepararCancelacionFamiliaV2(r.estado.pedido, r.estado.skus, meta(2));
  assert.deepEqual((await ejecutarPlanLocalV2(cancel, r.estado)).estado.skus.map(s => s.stock_actual), [2, 2]);
  const mal = skus.map(s => ({ ...s, gramos_unidad_stock: 333 }));
  await assert.rejects(prepararConfirmacionFamiliaV2(pedido, mal, reparto, {}, meta()));
});
test('C2: metadata sin actor/key no se convierte a strings; módulo aislado', async () => {
  const c = escenario();
  for (const m of [{ ...meta(), actor: undefined }, { ...meta(), idempotency_key: undefined }]) await assert.rejects(prepararConfirmacionFamiliaV2(c.pedido, c.cloros, c.reparto, {}, m));
  // El puerto GAS QA C5 tiene auditoría diferencial acotada; transporte/rutas públicas siguen aislados.
  for (const p of ['src/lib/appsScriptPedidos.ts', 'src/app/api/pedidos/route.ts']) assert.doesNotMatch(await readFile(p, 'utf8'), /asignacionV2|CONFIRMAR_V2|REASIGNAR_V2/);
});

test('C2: identidad, modo y escala cambiados tras preparar bloquean antes de descontar', async () => {
  for (const cambio of [{ activo: 'NO' }, { marca: 'Otra' }, { familia_id: 'FAM-OTRA' }, { modo_venta: 'GRANEL', gramos_unidad_stock: 1000 }, { permite_decimal: 'SI' }]) {
    const c = escenario(), p = await prepararConfirmacionFamiliaV2(c.pedido, c.cloros, c.reparto, {}, meta());
    Object.assign(c.estado.skus[0], cambio); const antes = structuredClone(c.estado);
    const r = await ejecutarPlanLocalV2(p, c.estado);
    assert.equal(r.plan.estado, 'REQUIERE_REVISION'); assert.deepEqual(r.estado, antes);
  }
});
test('C2: cantidades decimales equivalentes y costo SKU no alteran oferta/precio', async () => {
  const c = escenario(), f = { ...c.economico, permite_decimal: 'SI', paso_venta: 0.5 };
  const l = crearDetallePedidoFamiliaV2('PED-QA', 'DPE-DEC', { modelo_linea: 'FAMILIA_V2', familia_id: f.familia_id, cantidad_solicitada: 1.5, unidad_solicitada: f.unidad_venta, version_oferta: 1 }, f);
  const pedido = { ...c.pedido, lineas: [l] }, skus = c.cloros.map((s, i) => ({ ...s, permite_decimal: 'SI', paso_venta: 0.5, stock_actual: 2.5, precio_costo: i ? 610 : 590 }));
  const reparto = [{ id_detalle_pedido: l.id_detalle_pedido, selecciones: [{ producto_id: skus[0].id_producto, cantidad_asignada: 1 }, { producto_id: skus[1].id_producto, cantidad_asignada: 0.5 }] }];
  const r = await ejecutarPlanLocalV2(await prepararConfirmacionFamiliaV2(pedido, skus, reparto, {}, meta()), { ...c.estado, pedido, skus });
  assert.equal(r.plan.estado, 'COMPLETADA'); assert.equal(r.estado.pedido.lineas[0].precio_unitario, 650);
  assert.equal(r.estado.pedido.lineas[0].subtotal, 975); assert.deepEqual(r.estado.skus.map(s => s.stock_actual), [1.5, 2]);
  assert.deepEqual(r.estado.skus.map(s => s.precio_costo), [590, 610]);
});
test('C2: última escritura de pedido ya hecha se reconcilia por evidencia congelada', async () => {
  const c = escenario(), p = await prepararConfirmacionFamiliaV2(c.pedido, c.cloros, c.reparto, {}, meta());
  let r = await avanzarPlanDurableV2(p, c.estado);
  for (let i = 0; i < p.movimientos.length; i++) r = await avanzarPlanDurableV2(r.plan, r.estado);
  r.estado.pedido = structuredClone(p.pedido_resultante);
  const fin = await ejecutarPlanLocalV2(r.plan, r.estado);
  assert.equal(fin.plan.estado, 'COMPLETADA'); assert.equal(fin.estado.movimientos.length, 2); assert.equal(fin.estado.auditoria.length, 1);
});
