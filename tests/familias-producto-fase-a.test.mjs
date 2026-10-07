import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import * as dominio from '../src/lib/familiasProducto.ts';
import { crearFixturesFamilias } from './fixtures/familias-producto.mjs';
import { crearEscenario } from './helpers/granel-escenario.mjs';

const fuente = await readFile(new URL('../scripts/apps-script-pedidos.gs', import.meta.url), 'utf8');
const gas = {};
vm.runInNewContext(fuente, gas);
const plano = v => JSON.parse(JSON.stringify(v));
const tiene = (validacion, codigo) => validacion.inconsistencias.some(i => i.codigo === codigo);

for (const [nombre, motor] of [['TypeScript', dominio], ['Apps Script local', gas.DominioFamiliasFaseA]]) {
  test(`${nombre}: familias VARIABLE, EXPLICITA y GRANEL válidas`, () => {
    const { economico, clorinda, arroz } = crearFixturesFamilias();
    for (const f of [economico, clorinda, arroz]) assert.equal(motor.validarFamiliaProducto(f).valido, true);
  });
  test(`${nombre}: marca explícita faltante o ajena se rechaza`, () => {
    const { clorinda, skuClorinda } = crearFixturesFamilias();
    assert.ok(tiene(motor.validarFamiliaProducto({ ...clorinda, marca_publica: '' }), 'MARCA_PUBLICA_REQUERIDA'));
    assert.ok(tiene(motor.validarRelacionSkuFamilia({ ...skuClorinda, marca: 'Marca A' }, clorinda), 'MARCA_NO_EQUIVALENTE'));
  });
  test(`${nombre}: auditoría rechaza familia duplicada e inexistente`, () => {
    const { economico, cloros } = crearFixturesFamilias();
    assert.ok(tiene(motor.auditarModeloFamilias([economico, economico], cloros), 'FAMILIA_DUPLICADA'));
    assert.ok(tiene(motor.auditarModeloFamilias([], cloros), 'FAMILIA_INEXISTENTE'));
  });
  test(`${nombre}: SKU V1 sin familia ni campos nuevos sigue válido`, () => {
    const { legado } = crearFixturesFamilias();
    assert.equal(motor.validarRelacionSkuFamilia(legado).valido, true);
    assert.equal(motor.auditarModeloFamilias([], [legado]).valido, true);
    assert.equal(motor.validarRelacionSkuFamilia({ ...legado, familia_id: '' }).valido, true);
  });
  test(`${nombre}: contenido 750 ml válido y 1 L incompatible; no se infiere del nombre`, () => {
    const { shampoo, shampoos, shampooIncompatible } = crearFixturesFamilias();
    for (const sku of shampoos) assert.equal(motor.validarRelacionSkuFamilia(sku, shampoo).valido, true);
    assert.equal(motor.presentacionesEquivalentes(shampoo, shampooIncompatible), false);
    const vista = motor.agregarDisponibilidadFamilia(shampoo, [...shampoos, { ...shampooIncompatible, nombre: shampoo.nombre_publico }]);
    assert.equal(vista.cantidad_agregada, 5);
    assert.ok(tiene(vista, 'CONTENIDO_NO_EQUIVALENTE'));
    assert.equal(vista.disponible, false);
  });
  test(`${nombre}: Cloro A+B=11, costos distintos y precios SKU no alteran $650`, () => {
    const { economico, cloros } = crearFixturesFamilias();
    const vista = motor.agregarDisponibilidadFamilia(economico, cloros.map((s, i) => ({ ...s, precio_costo: 590 + i * 20, precio_venta: 900 + i * 500 })));
    assert.equal(vista.cantidad_agregada, 11);
    assert.equal(vista.precio_venta, 650);
    assert.equal(vista.disponible, true);
    assert.equal(vista.sku_elegibles.length, 2);
  });
  test(`${nombre}: Clorinda permanece independiente y asociación explícita es necesaria`, () => {
    const { economico, clorinda, cloros, skuClorinda } = crearFixturesFamilias();
    const lista = [...cloros, skuClorinda];
    assert.equal(motor.agregarDisponibilidadFamilia(economico, lista).cantidad_agregada, 11);
    assert.equal(motor.agregarDisponibilidadFamilia(clorinda, lista).cantidad_agregada, 9);
    assert.ok(tiene(motor.validarRelacionSkuFamilia(cloros[0], clorinda), 'FAMILIA_INEXISTENTE'));
  });
  test(`${nombre}: inactivo no suma; especial solo suma con apertura y habilitación`, () => {
    const { economico, cloros, inactivo, especial } = crearFixturesFamilias();
    const lista = [...cloros, inactivo, especial];
    assert.equal(motor.agregarDisponibilidadFamilia(economico, lista).cantidad_agregada, 11);
    assert.equal(motor.agregarDisponibilidadFamilia(economico, lista, { apertura_id: 'APE-20261007' }).cantidad_agregada, 11);
    assert.equal(motor.agregarDisponibilidadFamilia(economico, lista, { sku_habilitados: [especial.id_producto] }).cantidad_agregada, 11);
    assert.equal(motor.agregarDisponibilidadFamilia(economico, lista, { apertura_id: 'APE-20261007', sku_habilitados: [especial.id_producto] }).cantidad_agregada, 41);
  });
  test(`${nombre}: granel agrega 4×250 + 2×1000 = 3000 g, nunca 6`, () => {
    const { arroz, granel } = crearFixturesFamilias();
    const vista = motor.agregarDisponibilidadFamilia(arroz, granel);
    assert.equal(vista.cantidad_agregada, 3000);
    assert.equal(vista.unidad_disponibilidad, 'g');
    assert.equal(vista.disponible, true);
    assert.equal(vista.precio_venta, 1350);
  });
  test(`${nombre}: granel conserva 1 g y rechaza medio gramo/base inválida`, () => {
    const { arroz, granel } = crearFixturesFamilias();
    assert.equal(motor.agregarDisponibilidadFamilia(arroz, [{ ...granel[0], stock_actual: 0.004 }]).cantidad_agregada, 1);
    assert.ok(tiene(motor.agregarDisponibilidadFamilia(arroz, [{ ...granel[0], stock_actual: 0.002 }]), 'STOCK_INVALIDO'));
    assert.ok(tiene(motor.validarRelacionSkuFamilia({ ...granel[1], gramos_unidad_stock: 250 }, arroz), 'BASE_STOCK_GRANEL_INVALIDA'));
  });
  test(`${nombre}: categoría, modo, unidad y regla comercial deben coincidir`, () => {
    const { economico, cloros } = crearFixturesFamilias();
    for (const [cambio, codigo] of [
      [{ categoria: 'Higiene' }, 'CATEGORIA_NO_EQUIVALENTE'], [{ modo_venta: 'GRANEL' }, 'MODO_NO_EQUIVALENTE'],
      [{ unidad_medida: 'pack' }, 'UNIDAD_NO_EQUIVALENTE'], [{ paso_venta: 2 }, 'REGLA_CANTIDAD_NO_EQUIVALENTE'],
      [{ marca: '' }, 'MARCA_FISICA_REQUERIDA'], [{ presentacion: '' }, 'PRESENTACION_FISICA_REQUERIDA'],
    ]) assert.ok(tiene(motor.validarRelacionSkuFamilia({ ...cloros[0], ...cambio }, economico), codigo));
  });
  test(`${nombre}: familias no admiten stock, costo ni proveedor`, () => {
    const { economico } = crearFixturesFamilias();
    for (const campo of ['stock_actual', 'precio_costo', 'proveedor']) assert.ok(tiene(motor.validarFamiliaProducto({ ...economico, [campo]: 0 }), 'CAMPO_FISICO_EN_FAMILIA'));
  });
  test(`${nombre}: ID, versión y enums inválidos fallan sin coerción`, () => {
    const { economico } = crearFixturesFamilias();
    for (const [campo, valor, codigo] of [
      ['familia_id', 'PROD-QA', 'FAMILIA_ID_INVALIDO'], ['familia_id', '', 'FAMILIA_ID_INVALIDO'],
      ['version_oferta', 0, 'VERSION_OFERTA_INVALIDA'], ['version_oferta', 1.5, 'VERSION_OFERTA_INVALIDA'],
      ['activo', ['SI'], 'ACTIVO_INVALIDO'], ['politica_marca', ['VARIABLE'], 'POLITICA_MARCA_INVALIDA'],
      ['permite_decimal', ['NO'], 'DECIMALES_INVALIDOS'], ['marca_publica', 'Oculta', 'MARCA_PUBLICA_NO_CORRESPONDE'],
    ]) assert.ok(tiene(motor.validarFamiliaProducto({ ...economico, [campo]: valor }), codigo));
  });
  test(`${nombre}: apertura inválida, tipo desconocido y desborde fallan cerrado`, () => {
    const { economico, cloros } = crearFixturesFamilias();
    assert.ok(tiene(motor.agregarDisponibilidadFamilia(economico, cloros, { apertura_id: 'APE-INVENTADA' }), 'APERTURA_INVALIDA'));
    assert.ok(tiene(motor.agregarDisponibilidadFamilia(economico, [{ ...cloros[0], tipo_disponibilidad: 'OTRO' }]), 'TIPO_DISPONIBILIDAD_INVALIDO'));
    const vista = motor.agregarDisponibilidadFamilia(economico, cloros.map(s => ({ ...s, stock_actual: Number.MAX_SAFE_INTEGER })));
    assert.ok(tiene(vista, 'AGREGADO_FUERA_RANGO'));
    assert.equal(vista.disponible, false);
  });
  for (const precio of [-1, 1.5, '650', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    test(`${nombre}: precio familiar inválido ${String(precio)}`, () => {
      assert.ok(tiene(motor.validarFamiliaProducto({ ...crearFixturesFamilias().economico, precio_venta: precio }), 'PRECIO_FAMILIAR_INVALIDO'));
    });
  }
  test(`${nombre}: cero precio es contrato válido pero no vendible; familia inactiva no suma`, () => {
    const { economico, cloros } = crearFixturesFamilias();
    assert.equal(motor.validarFamiliaProducto({ ...economico, precio_venta: 0 }).valido, true);
    assert.equal(motor.agregarDisponibilidadFamilia({ ...economico, precio_venta: 0 }, cloros).disponible, false);
    assert.equal(motor.agregarDisponibilidadFamilia({ ...economico, activo: 'NO' }, cloros).cantidad_agregada, 0);
    assert.equal(motor.agregarDisponibilidadFamilia(economico, cloros.map(s => ({ ...s, stock_actual: 0 }))).disponible, false);
  });
  for (const stock of [-1, 0.5, '4', NaN, Infinity]) {
    test(`${nombre}: stock envasado inválido ${String(stock)} no aporta`, () => {
      const { economico, cloros } = crearFixturesFamilias();
      const vista = motor.agregarDisponibilidadFamilia(economico, [{ ...cloros[0], stock_actual: stock }]);
      assert.equal(vista.cantidad_agregada, 0);
      assert.equal(vista.disponible, false);
      assert.ok(tiene(vista, 'STOCK_INVALIDO'));
    });
  }
  test(`${nombre}: duplicados no inflan saldo y la vista falla cerrada`, () => {
    const { economico, cloros } = crearFixturesFamilias();
    const vista = motor.agregarDisponibilidadFamilia(economico, [cloros[0], ...cloros]);
    assert.equal(vista.cantidad_agregada, 7);
    assert.equal(vista.disponible, false);
    assert.ok(tiene(vista, 'SKU_DUPLICADO'));
    assert.equal(motor.leerVistaFamiliasParalela([economico, economico], cloros).familias[0].disponible, false);
  });
  test(`${nombre}: lectura pura conserva objetos, stock, costos y precios`, () => {
    const { economico, cloros } = crearFixturesFamilias();
    const antes = structuredClone({ economico, cloros });
    Object.freeze(economico); cloros.forEach(Object.freeze); Object.freeze(cloros);
    motor.leerVistaFamiliasParalela([economico], cloros);
    assert.deepEqual({ economico, cloros }, antes);
  });
}

test('contrato GAS generado está actualizado y coincide con el setup futuro', async () => {
  execFileSync(process.execPath, ['scripts/generar-contrato-familias-gs.mjs', '--check']);
  const setup = {};
  vm.runInNewContext(await readFile(new URL('../scripts/setup-google-sheet.gs', import.meta.url), 'utf8'), setup);
  assert.deepEqual(plano(gas.COLUMNAS_FAMILIAS_PRODUCTO), [...dominio.COLUMNAS_FAMILIAS_PRODUCTO]);
  assert.deepEqual(plano(setup.HOJAS.find(h => h.nombre === 'FAMILIAS_PRODUCTO').encabezados), [...dominio.COLUMNAS_FAMILIAS_PRODUCTO]);
  assert.deepEqual(plano(setup.HOJAS.find(h => h.nombre === 'PRODUCTOS').encabezados.slice(-5)), [...dominio.COLUMNAS_IDENTIDAD_SKU_FAMILIA]);
  assert.doesNotMatch(fuente, /case\s+['"][^'"]*(?:Familias|familias)[^'"]*['"]/);
});

function hojaSoloLectura(registros, columnas = Object.keys(registros[0] ?? {})) {
  const filas = registros.map(r => columnas.map(c => r[c] ?? ''));
  return {
    getLastRow: () => filas.length + 1, getLastColumn: () => columnas.length,
    getRange: (fila, col, cantidadFilas = 1, cantidadCols = 1) => ({
      getValues: () => [columnas, ...filas].slice(fila - 1, fila - 1 + cantidadFilas).map(r => r.slice(col - 1, col - 1 + cantidadCols)),
    }),
  };
}

test('helper de lectura TEST no crea hoja, no escribe y normaliza celdas vacías/fecha', () => {
  const { economico, cloros, legado } = crearFixturesFamilias();
  const hojas = { PRODUCTOS: hojaSoloLectura([...cloros, legado]) };
  const ss = { getName: () => 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES', getSheetByName: n => hojas[n] };
  const entorno = { PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'TEST' }) } };
  vm.runInNewContext(fuente, entorno);
  assert.deepEqual(plano(entorno.leerFamiliasProductoFaseA_(ss)), []);
  hojas.FAMILIAS_PRODUCTO = hojaSoloLectura([{ ...economico, actualizado_en: new Date(economico.actualizado_en) }], [...dominio.COLUMNAS_FAMILIAS_PRODUCTO]);
  const vista = entorno.leerVistaFamiliasFaseA_(ss, {});
  assert.equal(vista.auditoria.valido, true);
  assert.equal(vista.familias[0].cantidad_agregada, 11);
  assert.equal(entorno.leerFamiliasProductoFaseA_(ss)[0].actualizado_en, economico.actualizado_en);
  assert.throws(() => entorno.leerVistaFamiliasFaseA_({ ...ss, getName: () => 'Base productiva' }), /TEST/);
});

test('V1: catálogo/pedido/confirmación/cancelación ignoran campos familia sin cambiar stock/precio', async () => {
  const c = await crearEscenario();
  const agregar = (campo, valor) => { c.productos.headers.push(campo); c.productos.filas.forEach(f => f.push(valor)); };
  for (const [campo, valor] of [['categoria', 'Alimentos'], ['prioridad', 'media'], ['paso_venta', 1], ['stock_minimo', 0], ['imagen_url', '']]) agregar(campo, valor);
  const catalogoAntes = plano(c.contexto.listarProductos_());
  for (const [campo, valor] of [['familia_id', 'FAM-QA-INEXISTENTE'], ['marca', 'Marca QA'], ['presentacion', 'Sintética'], ['contenido_cantidad', 750], ['contenido_unidad', 'ml']]) agregar(campo, valor);
  assert.deepEqual(plano(c.contexto.listarProductos_()), catalogoAntes);
  const antes = c.productos.filas.map(f => f[6]);
  const creado = c.contexto.crearPedido_(c.body);
  assert.deepEqual(c.productos.filas.map(f => f[6]), antes);
  assert.equal(creado.total, 600);
  c.contexto.actualizarEstadoPedido_({ id_pedido: creado.id_pedido, estado_pedido: 'pendiente', actor: 'qa-local', idempotency_key: 'fasea_confirmar_1234' });
  assert.deepEqual(c.productos.filas.map(f => f[6]), [5.5, 9]);
  c.contexto.cancelarPedido_({ id_pedido: creado.id_pedido, actor: 'qa-local', idempotency_key: 'fasea_cancelar_1234' });
  assert.deepEqual(c.productos.filas.map(f => f[6]), antes);
});
