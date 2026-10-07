import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { validarIdentidadSkuFisica, COLUMNAS_IDENTIDAD_SKU_FAMILIA } from '../src/lib/familiasProducto.ts';
import { validarCambioProducto } from '../src/lib/fase8/productosAdmin.ts';
import { validarYCalcularCompra } from '../src/lib/fase7/compras.ts';
import { dtoCompraAdmin, dtoActualizacionProductoAdmin, dtoCreacionProductoAdmin } from '../src/lib/fase9/dtoAdmin.ts';
import { crearEscenarioCompra, objetos } from './helpers/compra-identidad-escenario.mjs';

const plano = v => JSON.parse(JSON.stringify(v));
const identidad = { familia_id: 'FAM-CLORO-1L-ECO', marca: 'Marca A', presentacion: 'Botella 1 L', contenido_cantidad: 1000, contenido_unidad: 'ml' };

test('B1: contrato TS/GAS admite identidad opcional, limpia texto y conserva valores físicos', async () => {
  const c = await crearEscenarioCompra();
  assert.equal(validarIdentidadSkuFisica({}).valido, true);
  assert.deepEqual(validarCambioProducto(identidad), []);
  const cambios = c.contexto.normalizarCambioProductoAdmin_({ producto_id: 'PROD-QA', cambios: { ...identidad, marca: ' Marca A ', presentacion: ' Botella 1 L ' } }).cambios;
  assert.deepEqual(plano(cambios), identidad);
  assert.deepEqual(plano(c.contexto.normalizarCambioProductoAdmin_({ producto_id: 'PROD-QA', cambios: { nombre: 'Legado' } }).cambios), { nombre: 'Legado' });
  assert.deepEqual(validarCambioProducto({ marca: '', presentacion: '', familia_id: '', contenido_cantidad: '', contenido_unidad: '' }), []);
});

for (const [campo, valor] of [['familia_id', 'PROD-QA'], ['familia_id', true], ['marca', 'A'.repeat(121)], ['marca', {}],
  ['presentacion', 'A'.repeat(201)], ['contenido_cantidad', 0], ['contenido_cantidad', -1], ['contenido_cantidad', Infinity],
  ['contenido_cantidad', '1000'], ['contenido_cantidad', true], ['contenido_unidad', 'litro']]) {
  test(`B1: ambos validadores rechazan identidad inválida ${campo}/${String(valor).slice(0, 16)}`, async () => {
    const c = await crearEscenarioCompra(), cambio = { [campo]: valor };
    assert.equal(validarIdentidadSkuFisica(cambio).valido, false);
    assert.ok(validarCambioProducto(cambio).length);
    assert.throws(() => c.contexto.normalizarCambioProductoAdmin_({ producto_id: 'PROD-QA', cambios: cambio }), /Identidad fisica invalida/);
  });
}

test('B1: DTO admin permite identidad pero excluye stock directo, snapshots y proveedor', () => {
  for (const [dto, campo] of [[dtoCreacionProductoAdmin, 'producto'], [dtoActualizacionProductoAdmin, 'cambios']]) {
    const r = dto({ producto_id: 'PROD-QA', [campo]: { ...identidad, stock_actual: 99, marca_snapshot: 'Falsa', proveedor: 'Falso' } });
    assert.deepEqual(r[campo], identidad);
  }
});

test('B1: administración interna persiste identidad y la audita sin cambiar stock/costo/precio', async () => {
  const c = await crearEscenarioCompra(), antes = objetos(c.productos)[0];
  const actualizado = c.contexto.actualizarProductoAdmin_({ producto_id: antes.id_producto, cambios: { ...identidad, presentacion: 'Envase físico A' }, responsable: 'qa-local', idempotency_key: 'sku_identidad_123456789' });
  assert.equal(actualizado.presentacion, 'Envase físico A');
  for (const campo of ['stock_actual', 'precio_costo', 'precio_venta', 'unidad_medida', 'modo_venta', 'gramos_unidad_stock']) assert.equal(actualizado[campo], antes[campo]);
  assert.equal(c.hojas.AUDITORIA_PRODUCTOS.filas.length, 1);
  assert.equal(c.hojas.HISTORIAL_COSTOS.filas.length, 0);
  const p = { ...antes, ...identidad, nombre: 'SKU QA nuevo', permite_decimal: 'NO', paso_venta: 1 };
  delete p.id_producto; delete p.stock_actual;
  const creado = c.contexto.crearProductoAdmin_({ producto_id: 'PROD-QA-NUEVO-B1', producto: dtoCreacionProductoAdmin({ producto: p }).producto, responsable: 'qa-local', idempotency_key: 'sku_nuevo_123456789' });
  assert.equal(creado.marca, 'Marca A');
  assert.equal(creado.stock_actual, 0);
  const r = c.contexto.crearCompra_(c.bodyCompra);
  assert.equal(r.detalle[0].presentacion_snapshot, 'Envase físico A');
  assert.notEqual(r.detalle[0].presentacion_snapshot, c.economico.presentacion_publica);
});

test('B1: administración rechaza identidad si sus columnas no existen, sin efectos parciales', async () => {
  const c = await crearEscenarioCompra({ identidad: false, columnasNuevas: false }), antes = c.estado();
  assert.throws(() => c.contexto.actualizarProductoAdmin_({ producto_id: c.bodyCompra.lineas[0].producto_id, cambios: { nombre: 'Nuevo', marca: 'A' }, responsable: 'qa-local', idempotency_key: 'sin_columnas_123456789' }), /columna|contrato/i);
  const producto = { nombre: 'Nuevo', categoria: 'Limpieza', unidad_medida: 'unidad', permite_decimal: 'NO', paso_venta: 1, precio_venta: 650, stock_minimo: 0, prioridad: 'media', activo: 'SI', marca: 'A' };
  assert.throws(() => c.contexto.crearProductoAdmin_({ producto_id: 'PROD-QA-NUEVO', producto, responsable: 'qa-local', idempotency_key: 'alta_sin_columnas_123456789' }), /columna|contrato/i);
  assert.deepEqual(c.estado(), antes);
  assert.equal(c.bloqueado(), false);
});

test('B1: Marca A/B congeladas desde PRODUCTOS bajo lock; proveedor en cabecera, costos por SKU', async () => {
  const c = await crearEscenarioCompra(), antesFamilia = c.estado().FAMILIAS_PRODUCTO;
  c.exigirLock = true;
  const r = c.contexto.crearCompra_(c.bodyCompra);
  assert.equal(c.bloqueado(), false);
  assert.equal(r.compra.proveedor, 'La Oferta QA');
  assert.equal(r.compra.total, 12 * 590 + 10 * 610);
  for (const [i, marca, costo, stock] of [[0, 'Marca A', 590, 16], [1, 'Marca B', 610, 17]]) {
    const d = r.detalle[i];
    assert.equal(d.producto_id, c.bodyCompra.lineas[i].producto_id);
    assert.equal(d.familia_id_snapshot, 'FAM-CLORO-1L-ECO');
    assert.equal(d.marca_snapshot, marca);
    assert.equal(d.presentacion_snapshot, c.economico.presentacion_publica);
    assert.equal(d.contenido_cantidad_snapshot, 1000);
    assert.equal(d.contenido_unidad_snapshot, 'ml');
    assert.equal(d.gramos_unidad_stock_snapshot, '');
    assert.equal(d.costo_unitario, costo);
    assert.equal(d.stock_nuevo, stock);
    assert.equal('proveedor' in d, false);
    assert.equal(objetos(c.productos)[i].precio_costo, costo);
    assert.equal(objetos(c.hojas.HISTORIAL_COSTOS)[i].producto_id, d.producto_id);
  }
  assert.deepEqual(c.estado().FAMILIAS_PRODUCTO, antesFamilia);
  assert.equal(objetos(c.hojas.FAMILIAS_PRODUCTO)[0].precio_venta, 650);
  assert.equal('precio_costo' in objetos(c.hojas.FAMILIAS_PRODUCTO)[0], false);
  assert.deepEqual(objetos(c.productos).map(p => p.precio_venta), [700, 700]);
});

for (const campo of ['marca_snapshot', 'familia_id_snapshot', 'presentacion_snapshot', 'contenido_cantidad_snapshot', 'contenido_unidad_snapshot', 'gramos_unidad_stock_snapshot']) {
  test(`B1: navegador no puede inyectar ${campo}; tampoco altera el hash de compra`, async () => {
    const c = await crearEscenarioCompra();
    const hostil = { ...c.bodyCompra, [campo]: 'FALSO', lineas: c.bodyCompra.lineas.map(l => ({ ...l, [campo]: 'FALSO', marca: 'FALSA', familia_id: 'FAM-FALSA' })) };
    const dto = dtoCompraAdmin(hostil);
    assert.deepEqual(dto.lineas, c.bodyCompra.lineas);
    assert.equal(campo in dto, false);
    assert.deepEqual(plano(c.contexto.normalizarCompra_(hostil)), plano(c.contexto.normalizarCompra_(c.bodyCompra)));
    const r = plano(c.contexto.crearCompra_(hostil));
    assert.notEqual(r.detalle[0][campo], 'FALSO');
    assert.deepEqual(plano(c.contexto.crearCompra_(c.bodyCompra)), r);
    assert.equal(c.hojas.COMPRAS.filas.length, 1);
  });
}

test('B1: replay devuelve snapshots originales aun con maestro modificado o inválido', async () => {
  const c = await crearEscenarioCompra(), primero = plano(c.contexto.crearCompra_(c.bodyCompra));
  for (const [campo, valor] of Object.entries({ nombre: 'Otro nombre', marca: 'Otra marca', familia_id: 'invalido', presentacion: 'Otra', contenido_cantidad: 2000 })) {
    c.productos.filas[0][c.productos.headers.indexOf(campo)] = valor;
  }
  const antes = c.estado();
  assert.deepEqual(plano(c.contexto.crearCompra_(c.bodyCompra)), primero);
  assert.deepEqual(c.estado(), antes);
  assert.deepEqual(plano(c.contexto.obtenerCompra_(primero.compra.compra_id)), primero);
  assert.throws(() => c.contexto.crearCompra_({ ...c.bodyCompra, proveedor: 'Otro' }), /otro contenido/);
  assert.throws(() => c.contexto.crearCompra_({ ...c.bodyCompra, lineas: c.bodyCompra.lineas.map(l => ({ ...l, costo_unitario: 999 })) }), /otro contenido/);
  assert.deepEqual(c.estado(), antes);
});

test('B1: un SKU se puede comprar a proveedores distintos sin modificar su identidad', async () => {
  const c = await crearEscenarioCompra();
  c.contexto.crearCompra_(c.bodyCompra);
  c.contexto.crearCompra_({ ...c.bodyCompra, proveedor: 'Otro proveedor QA', idempotency_key: 'compra_otro_1234567890' });
  assert.deepEqual(objetos(c.hojas.COMPRAS).map(p => p.proveedor), ['La Oferta QA', 'Otro proveedor QA']);
  assert.equal(objetos(c.hojas.DETALLE_COMPRAS)[2].marca_snapshot, 'Marca A');
  assert.equal('proveedor' in objetos(c.productos)[0], false);
});

for (const columnasNuevas of [true, false]) {
  test(`B1: SKU legado funciona sin identidad; columnas nuevas=${columnasNuevas}`, async () => {
    const c = await crearEscenarioCompra({ identidad: false, columnasNuevas });
    const r = c.contexto.crearCompra_(c.bodyCompra);
    assert.equal(r.detalle[0].stock_nuevo, 16);
    assert.equal(r.detalle[0].costo_unitario, 590);
    for (const campo of c.contexto.COLUMNAS_SNAPSHOTS_COMPRA_B1) assert.equal(r.detalle[0][campo], columnasNuevas ? '' : undefined);
    assert.deepEqual(plano(c.contexto.crearCompra_(c.bodyCompra)), plano(r));
    assert.equal(c.contexto.listarProductosAdmin_().length, 2);
  });
}

test('B1: históricos sin snapshots se leen sin consultar identidad vigente', async () => {
  const c = await crearEscenarioCompra({ identidad: false, columnasNuevas: false });
  const r = c.contexto.crearCompra_(c.bodyCompra);
  assert.deepEqual(plano(c.contexto.obtenerCompra_(r.compra.compra_id)), plano(r));
  assert.equal('marca_snapshot' in r.detalle[0], false);
});

test('B1: identidad documentada exige destino completo; ausencia o duplicado aborta sin escritura', async () => {
  for (const duplicado of [false, true]) {
    const c = await crearEscenarioCompra();
    if (duplicado) c.hojas.DETALLE_COMPRAS.headers.push('marca_snapshot');
    else c.hojas.DETALLE_COMPRAS.headers.splice(c.hojas.DETALLE_COMPRAS.headers.indexOf('marca_snapshot'), 1);
    const antes = c.estado();
    assert.throws(() => c.contexto.crearCompra_(c.bodyCompra), /columna|contrato/i);
    assert.deepEqual(c.estado(), antes);
    assert.equal(c.bloqueado(), false);
  }
});

test('B1: compras exigen SKU PROD-* y conservan rechazo del duplicado', async () => {
  const c = await crearEscenarioCompra(), antes = c.estado();
  for (const producto_id of ['FAM-CLORO-1L-ECO', 'otro', '']) {
    const body = { ...c.bodyCompra, lineas: [{ producto_id, cantidad: 1, costo_unitario: 590 }] };
    assert.throws(() => c.contexto.crearCompra_(body), /PROD-/);
    assert.equal(validarYCalcularCompra(body, []).valido, false);
  }
  assert.throws(() => c.contexto.crearCompra_({ ...c.bodyCompra, lineas: [c.bodyCompra.lineas[0], c.bodyCompra.lineas[0]] }), /repetido/);
  assert.throws(() => c.contexto.crearCompra_({ ...c.bodyCompra, lineas: [{ producto_id: 'PROD-NO-EXISTE', cantidad: 1, costo_unitario: 590 }] }), /no existe/);
  assert.deepEqual(c.estado(), antes);
});

for (const [hoja, numero] of [['DETALLE_COMPRAS', 1], ['MOVIMIENTOS_STOCK', 1], ['HISTORIAL_COSTOS', 1], ['HISTORIAL_COSTOS', 2], ['COMPRAS', 1]]) {
  test(`B1: rollback completo ante fallo ${hoja} #${numero}; retry vuelve a comprar una vez`, async () => {
    const c = await crearEscenarioCompra(), antes = c.estado();
    c.control.fallarUnaVez(hoja, 'appendRow', numero);
    assert.throws(() => c.contexto.crearCompra_(c.bodyCompra), /fallo simulado/);
    assert.deepEqual(c.estado(), antes);
    assert.equal(c.bloqueado(), false);
    const r = c.contexto.crearCompra_(c.bodyCompra);
    assert.equal(r.detalle.length, 2);
    assert.equal(r.detalle[0].marca_snapshot, 'Marca A');
    assert.equal(c.hojas.COMPRAS.filas.length, 1);
    assert.equal(c.hojas.MOVIMIENTOS_STOCK.filas.length, 2);
    assert.equal(c.hojas.HISTORIAL_COSTOS.filas.length, 2);
  });
}

test('B1: rollback tras flush elimina cabecera/detalle/movimiento/costo, conserva historia previa', async () => {
  const c = await crearEscenarioCompra();
  c.contexto.crearCompra_(c.bodyCompra);
  const antes = c.estado();
  let primera = true;
  c.contexto.SpreadsheetApp.flush = () => { if (primera) { primera = false; throw new Error('fallo flush después de escribir todo'); } };
  assert.throws(() => c.contexto.crearCompra_({ ...c.bodyCompra, idempotency_key: 'compra_flush_123456789' }), /fallo flush/);
  assert.deepEqual(c.estado(), antes);
  assert.equal(c.bloqueado(), false);
});

test('B1: granel congela base nativa sin cambiar D40, costo ni cantidad comprada', async () => {
  const c = await crearEscenarioCompra({ identidad: false });
  for (const [campo, valor] of Object.entries({ modo_venta: 'GRANEL', unidad_medida: 'unidad', permite_decimal: 'SI', paso_venta: 0.004, gramos_referencia: 1000, gramos_unidad_stock: 250 })) {
    c.productos.filas[0][c.productos.headers.indexOf(campo)] = valor;
  }
  const r = c.contexto.crearCompra_({ ...c.bodyCompra, lineas: [{ producto_id: c.bodyCompra.lineas[0].producto_id, cantidad: 4, costo_unitario: 590 }] });
  assert.equal(r.detalle[0].gramos_unidad_stock_snapshot, 250);
  assert.equal(r.detalle[0].cantidad, 4);
  assert.equal(r.detalle[0].stock_nuevo, 8);
  assert.equal(r.detalle[0].costo_total, 2360);
  assert.equal(r.detalle[0].marca_snapshot, '');
});

test('B1: granel legado sin columnas snapshot conserva la compra nativa V1', async () => {
  const c = await crearEscenarioCompra({ identidad: false, columnasNuevas: false });
  for (const [campo, valor] of Object.entries({ modo_venta: 'GRANEL', unidad_medida: 'kg', permite_decimal: 'SI', paso_venta: 0.001, gramos_referencia: 1000, gramos_unidad_stock: 1000 })) {
    c.productos.filas[0][c.productos.headers.indexOf(campo)] = valor;
  }
  const r = c.contexto.crearCompra_({ ...c.bodyCompra, lineas: [{ producto_id: c.bodyCompra.lineas[0].producto_id, cantidad: 0.001, costo_unitario: 590 }] });
  assert.equal(r.detalle[0].cantidad, 0.001);
  assert.equal(r.detalle[0].stock_nuevo, 4.001);
  assert.equal('gramos_unidad_stock_snapshot' in r.detalle[0], false);
});

test('B1: setup futuro contiene snapshots aditivos y campos SKU; no se ejecuta setup', async () => {
  const setup = {}, c = await crearEscenarioCompra();
  vm.runInNewContext(await readFile(new URL('../scripts/setup-google-sheet.gs', import.meta.url), 'utf8'), setup);
  const detalles = setup.HOJAS.find(h => h.nombre === 'DETALLE_COMPRAS').encabezados;
  assert.deepEqual(plano(detalles.slice(-6)), plano(c.contexto.COLUMNAS_SNAPSHOTS_COMPRA_B1));
  for (const campo of COLUMNAS_IDENTIDAD_SKU_FAMILIA) assert.ok(setup.HOJAS.find(h => h.nombre === 'PRODUCTOS').encabezados.includes(campo));
});
