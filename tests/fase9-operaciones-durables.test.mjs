import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const HEADERS_OPERACIONES = [
  'operacion_id', 'idempotency_key', 'tipo_operacion', 'id_pedido', 'actor',
  'estado_operacion', 'paso', 'payload_hash', 'snapshot_json', 'resultado_json',
  'error_codigo', 'error_detalle', 'creado_en', 'actualizado_en',
];

class ControlFallos {
  constructor() {
    this.reglas = [];
    this.eventos = [];
  }

  fallarUnaVez({ hoja = '*', operacion, numero = 1, fase = 'antes', predicado, accion }) {
    this.reglas.push({ hoja, operacion, numero, fase, predicado, accion, vistos: 0, usada: false });
  }

  ejecutar(hoja, operacion, fase, payload) {
    this.eventos.push({ hoja, operacion, fase });
    for (const regla of this.reglas) {
      if (regla.usada || regla.fase !== fase || regla.operacion !== operacion) continue;
      if (regla.hoja !== '*' && regla.hoja !== hoja) continue;
      if (regla.predicado && !regla.predicado(payload)) continue;
      regla.vistos++;
      if (regla.vistos !== regla.numero) continue;
      regla.usada = true;
      if (regla.accion) regla.accion(payload);
      else throw new Error(`fallo simulado ${hoja}.${operacion}.${fase}`);
    }
  }
}

class HojaDurableMock {
  constructor(nombre, headers, filas, control) {
    this.nombre = nombre;
    this.headers = [...headers];
    this.filas = filas.map((fila) => [...fila]);
    this.control = control;
    this.historialEstados = [];
  }

  getName() { return this.nombre; }
  getLastRow() { return this.filas.length + 1; }
  getLastColumn() { return this.headers.length; }
  setFrozenRows() {}

  getRange(fila, columna, cantidadFilas = 1, cantidadColumnas = 1) {
    const hoja = this;
    return {
      getValues() {
        hoja.control.ejecutar(hoja.nombre, 'getValues', 'antes', { fila, columna });
        const valores = Array.from({ length: cantidadFilas }, (_, i) =>
          Array.from({ length: cantidadColumnas }, (_, j) =>
            fila + i === 1
              ? hoja.headers[columna + j - 1]
              : hoja.filas[fila + i - 2]?.[columna + j - 1]
          )
        );
        hoja.control.ejecutar(hoja.nombre, 'getValues', 'despues', { fila, columna, valores });
        return valores;
      },
      setValue(valor) {
        const payload = { fila, columna, valor, hoja };
        hoja.control.ejecutar(hoja.nombre, 'setValue', 'antes', payload);
        hoja.filas[fila - 2][columna - 1] = valor;
        hoja.control.ejecutar(hoja.nombre, 'setValue', 'despues', payload);
      },
      setValues(valores) {
        const payload = { fila, columna, valores, hoja };
        hoja.control.ejecutar(hoja.nombre, 'setValues', 'antes', payload);
        for (let i = 0; i < valores.length; i++) {
          if (fila + i === 1) {
            hoja.headers.splice(columna - 1, valores[i].length, ...valores[i]);
          } else {
            hoja.filas[fila + i - 2].splice(columna - 1, valores[i].length, ...valores[i]);
          }
        }
        hoja.registrarEstado(valores[0]);
        hoja.control.ejecutar(hoja.nombre, 'setValues', 'despues', payload);
      },
    };
  }

  appendRow(fila) {
    const payload = { fila, hoja: this };
    this.control.ejecutar(this.nombre, 'appendRow', 'antes', payload);
    this.filas.push([...fila]);
    this.registrarEstado(fila);
    this.control.ejecutar(this.nombre, 'appendRow', 'despues', payload);
  }

  registrarEstado(fila) {
    if (this.nombre !== 'OPERACIONES_PEDIDOS') return;
    const indice = this.headers.indexOf('estado_operacion');
    if (indice !== -1 && fila[indice]) this.historialEstados.push(fila[indice]);
  }
}

async function crearEscenario({ estado = 'recibido', stocks = [10, 10, 10] } = {}) {
  const fuente = await readFile(new URL('../scripts/apps-script-pedidos.gs', import.meta.url), 'utf8');
  const control = new ControlFallos();
  const hojas = {};
  const nuevaHoja = (nombre, headers, filas = []) => {
    const hoja = new HojaDurableMock(nombre, headers, filas, control);
    hojas[nombre] = hoja;
    return hoja;
  };
  const pedidos = nuevaHoja(
    'PEDIDOS',
    ['id_pedido', 'estado_pedido', 'estado_pago', 'vendedor_admin'],
    [['PED-1', estado, 'pendiente', '']]
  );
  nuevaHoja(
    'DETALLE_PEDIDOS',
    ['id_pedido', 'id_producto', 'cantidad'],
    stocks.map((_stock, indice) => ['PED-1', `P-${indice + 1}`, 2])
  );
  const productos = nuevaHoja(
    'PRODUCTOS',
    ['id_producto', 'stock_actual'],
    stocks.map((stock, indice) => [`P-${indice + 1}`, stock])
  );
  const movimientos = nuevaHoja('MOVIMIENTOS_STOCK', [
    'id_movimiento', 'fecha_hora', 'tipo', 'origen', 'id_origen',
    'id_producto', 'cantidad', 'stock_anterior', 'stock_resultante',
    'usuario', 'observaciones', 'operacion_id',
  ]);
  const operaciones = nuevaHoja('OPERACIONES_PEDIDOS', HEADERS_OPERACIONES);
  let uuid = 0;
  let lockActivo = false;
  let adquisicionesLock = 0;
  const lock = {
    waitLock() {
      assert.equal(lockActivo, false, 'el mock detectó una mutación sin serialización');
      lockActivo = true;
      adquisicionesLock++;
    },
    releaseLock() { lockActivo = false; },
  };
  const spreadsheet = {
    getName: () => 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES',
    getSheetByName: (nombre) => hojas[nombre],
    insertSheet(nombre) { return nuevaHoja(nombre, []); },
  };
  const contexto = {
    LockService: { getScriptLock: () => lock },
    SpreadsheetApp: {
      openById: () => spreadsheet,
      flush() {
        control.ejecutar('SpreadsheetApp', 'flush', 'antes', {});
        control.ejecutar('SpreadsheetApp', 'flush', 'despues', {});
      },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (nombre) => nombre === 'APP_ENV' ? 'TEST' : '',
      }),
    },
    Session: { getScriptTimeZone: () => 'America/Santiago' },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      computeDigest: (_algoritmo, texto) => [...createHash('sha256').update(String(texto)).digest()],
      formatDate: (_fecha, _zona, formato) => formato === 'yyyyMMdd-HHmmss'
        ? '20260922-120000'
        : formato.includes('SSS') ? '2026-09-22T12:00:00.000-03:00' : '2026-09-22 12:00:00',
      getUuid: () => `${(++uuid).toString(16).padStart(8, '0')}-0000-0000-0000-000000000000`,
    },
  };
  vm.runInNewContext(fuente, contexto, { filename: 'apps-script-pedidos.gs' });
  return {
    contexto, control, pedidos, productos, movimientos, operaciones,
    adquisicionesLock: () => adquisicionesLock,
  };
}

function confirmar(caso, key = 'confirmar_durable_1', actor = 'actor-test') {
  return caso.contexto.actualizarEstadoPedido_({
    id_pedido: 'PED-1',
    estado_pedido: 'pendiente',
    actor,
    idempotency_key: key,
  });
}

function cancelar(caso, key = 'cancelar_durable_1', actor = 'actor-test') {
  return caso.contexto.cancelarPedido_({
    id_pedido: 'PED-1',
    actor,
    idempotency_key: key,
  });
}

function objetoFila(hoja, indice = 0) {
  return Object.fromEntries(hoja.headers.map((header, i) => [header, hoja.filas[indice][i]]));
}

function estadoOperacion(caso) {
  return objetoFila(caso.operaciones).estado_operacion;
}

function stocks(caso) {
  return caso.productos.filas.map((fila) => fila[1]);
}

function cambiarEstadoOperacion(caso, estado) {
  const indice = caso.operaciones.headers.indexOf('estado_operacion');
  caso.operaciones.filas[0][indice] = estado;
}

async function prepararOperacionInterrumpida(key = 'operacion_interrumpida') {
  const caso = await crearEscenario();
  caso.control.fallarUnaVez({ hoja: 'PRODUCTOS', operacion: 'setValue' });
  assert.throws(() => confirmar(caso, key), /OPERACION_EN_CURSO/);
  assert.deepEqual(stocks(caso), [10, 10, 10]);
  assert.equal(caso.movimientos.filas.length, 0);
  assert.equal(caso.pedidos.filas[0][1], 'recibido');
  return caso;
}

test('F9A-02 A/B/K/Q: confirmación durable completa y retry no duplica', async () => {
  const caso = await crearEscenario();
  const primero = confirmar(caso);
  const segundo = confirmar(caso);
  assert.equal(JSON.stringify(primero), JSON.stringify(segundo));
  assert.deepEqual(caso.operaciones.historialEstados.slice(0, 3), ['PREPARADA', 'APLICANDO', 'COMPLETADA']);
  assert.deepEqual(stocks(caso), [8, 8, 8]);
  assert.equal(caso.pedidos.filas[0][1], 'pendiente');
  assert.equal(caso.movimientos.filas.length, 3);
  const operacionId = objetoFila(caso.operaciones).operacion_id;
  assert.ok(operacionId.startsWith('OPE-20260922-120000-'));
  assert.deepEqual(new Set(caso.movimientos.filas.map((fila) => fila[11])), new Set([operacionId]));
  assert.ok(caso.adquisicionesLock() >= 2);
  const primerWriteStock = caso.control.eventos.findIndex((e) => e.hoja === 'PRODUCTOS' && e.operacion === 'setValue');
  const intencion = caso.control.eventos.findIndex((e) => e.hoja === 'OPERACIONES_PEDIDOS' && e.operacion === 'appendRow');
  assert.ok(intencion !== -1 && intencion < primerWriteStock);
});

test('F9A-02 C: misma key con actor/payload distinto produce IDEMPOTENCY_CONFLICT', async () => {
  const caso = await crearEscenario();
  confirmar(caso, 'misma_key_conflicto', 'actor-a');
  assert.throws(
    () => confirmar(caso, 'misma_key_conflicto', 'actor-b'),
    /IDEMPOTENCY_CONFLICT/
  );
  assert.deepEqual(stocks(caso), [8, 8, 8]);
  assert.equal(caso.movimientos.filas.length, 3);
});

for (const [etiqueta, slug, estado] of [
  ['vacío', 'vacio', ''],
  ['whitespace', 'whitespace', ' '],
  ['null', 'null', null],
  ['desconocido', 'desconocido', 'DESCONOCIDO'],
  ['minúsculas', 'minusculas', 'completada'],
  ['espacios alrededor', 'espacios_alrededor', ' COMPLETADA '],
]) {
  test(`F9A-FINAL-01: estado durable ${etiqueta} falla cerrado con misma y nueva key`, async () => {
    const keyOriginal = `estado_invalido_${slug}`;
    const caso = await prepararOperacionInterrumpida(keyOriginal);
    cambiarEstadoOperacion(caso, estado);

    assert.throws(() => confirmar(caso, `nueva_${keyOriginal}`), /CONSISTENCIA_INCIERTA/);
    assert.throws(() => confirmar(caso, keyOriginal), /CONSISTENCIA_INCIERTA/);
    assert.deepEqual(stocks(caso), [10, 10, 10]);
    assert.equal(caso.movimientos.filas.length, 0);
    assert.equal(caso.pedidos.filas[0][1], 'recibido');
  });
}

for (const estado of ['PREPARADA', 'APLICANDO']) {
  test(`F9A-FINAL-01: ${estado} bloquea otra key y solo la misma key reanuda`, async () => {
    const keyOriginal = `reanudar_${estado.toLowerCase()}`;
    const caso = await prepararOperacionInterrumpida(keyOriginal);
    cambiarEstadoOperacion(caso, estado);
    assert.throws(() => confirmar(caso, `otra_${keyOriginal}`), /OPERACION_EN_CURSO/);
    const resultado = confirmar(caso, keyOriginal);
    assert.equal(resultado.consistencia, 'VERIFICADA_POR_READBACK');
    assert.equal(estadoOperacion(caso), 'COMPLETADA');
    assert.deepEqual(stocks(caso), [8, 8, 8]);
    assert.equal(caso.movimientos.filas.length, 3);
  });
}

test('F9A-FINAL-01: COMPLETADA no bloquea una transición posterior legítima', async () => {
  const caso = await crearEscenario();
  confirmar(caso, 'confirmacion_completada');
  const resultado = cancelar(caso, 'cancelacion_posterior');
  assert.equal(resultado.estado_pedido, 'cancelado');
  assert.deepEqual(stocks(caso), [10, 10, 10]);
  assert.equal(caso.operaciones.filas.length, 2);
});

test('F9A-FINAL-02: comparador durable acepta solo números inequívocos', async () => {
  const caso = await crearEscenario();
  for (const [a, b] of [
    [0, 0], [8, 8], [-3, -3], [1.5, 1.5],
    [8, '8'], [-3, '-3'], [1.5, '1.5'],
  ]) {
    assert.equal(caso.contexto.numerosOperacionIguales_(a, b), true, `${a} debe coincidir con ${b}`);
  }
  for (const [esperado, invalido] of [
    [0, ''], [0, ' '], [0, null], [0, undefined],
    [8, ' 8 '], [8, '\t8'], [8, '8 '], [8, '8\n'], [8, '\n8'],
    [8, '8 unidades'], [8, '8kg'], [8, '$8'], [1.5, '1,5'],
    [8, '1.2.3'], [8, '--8'],
    [8, Number.NaN], [8, Number.POSITIVE_INFINITY], [8, Number.NEGATIVE_INFINITY],
  ]) {
    assert.equal(
      caso.contexto.numerosOperacionIguales_(esperado, invalido),
      false,
      `${String(invalido)} no debe coincidir con ${esperado}`
    );
  }
});

for (const [etiqueta, stockInicial, valorInvalido] of [
  ['vacío con resultado cero', 2, ''],
  ['whitespace con resultado cero', 2, ' '],
  ['null con resultado cero', 2, null],
  ['espacios alrededor', 10, ' 8 '],
  ['texto con unidades', 10, '8 unidades'],
  ['texto con sufijo', 10, '8kg'],
  ['texto con moneda', 10, '$8'],
  ['NaN', 10, Number.NaN],
  ['Infinity', 10, Number.POSITIVE_INFINITY],
  ['-Infinity', 10, Number.NEGATIVE_INFINITY],
]) {
  test(`F9A-FINAL-02: readback de stock ${etiqueta} exige revisión`, async () => {
    const caso = await crearEscenario({ stocks: [stockInicial] });
    caso.control.fallarUnaVez({
      hoja: 'PEDIDOS',
      operacion: 'setValues',
      fase: 'despues',
      accion: () => { caso.productos.filas[0][1] = valorInvalido; },
    });
    assert.throws(() => confirmar(caso), /OPERACION_REQUIERE_REVISION/);
    assert.equal(estadoOperacion(caso), 'REQUIERE_REVISION');
  });
}

test('F9A-FINAL-02: movimiento con número inválido impide COMPLETADA', async () => {
  const caso = await crearEscenario({ stocks: [10] });
  caso.control.fallarUnaVez({
    hoja: 'PEDIDOS',
    operacion: 'setValues',
    fase: 'despues',
    accion: () => { caso.movimientos.filas[0][8] = ''; },
  });
  assert.throws(() => confirmar(caso), /OPERACION_REQUIERE_REVISION/);
  assert.equal(estadoOperacion(caso), 'REQUIERE_REVISION');
});

test('F9A-FINAL-02: número inválido en snapshot no se aplica y exige revisión', async () => {
  const key = 'snapshot_numerico_invalido';
  const caso = await prepararOperacionInterrumpida(key);
  const indiceSnapshot = caso.operaciones.headers.indexOf('snapshot_json');
  const snapshot = JSON.parse(caso.operaciones.filas[0][indiceSnapshot]);
  snapshot.productos[0].stock_resultante = '8kg';
  caso.operaciones.filas[0][indiceSnapshot] = JSON.stringify(snapshot);
  assert.throws(() => confirmar(caso, key), /OPERACION_REQUIERE_REVISION/);
  assert.equal(estadoOperacion(caso), 'REQUIERE_REVISION');
  assert.deepEqual(stocks(caso), [10, 10, 10]);
  assert.equal(caso.movimientos.filas.length, 0);
  assert.equal(caso.pedidos.filas[0][1], 'recibido');
});

test('F9A-02 K: dos confirmaciones serializadas con keys distintas no descuentan dos veces', async () => {
  const caso = await crearEscenario();
  confirmar(caso, 'confirmacion_concurrente_a');
  const segundo = confirmar(caso, 'confirmacion_concurrente_b');
  assert.equal(segundo.stock_actualizado, false);
  assert.equal(segundo.estado_pedido, 'pendiente');
  assert.deepEqual(stocks(caso), [8, 8, 8]);
  assert.equal(caso.movimientos.filas.length, 3);
  assert.equal(caso.operaciones.filas.length, 1);
});

test('F9A-02 write-ahead: si no persiste PREPARADA no toca datos críticos', async () => {
  const caso = await crearEscenario();
  caso.control.fallarUnaVez({ hoja: 'OPERACIONES_PEDIDOS', operacion: 'appendRow' });
  assert.throws(() => confirmar(caso), /CONSISTENCIA_INCIERTA.*intención durable/);
  assert.deepEqual(stocks(caso), [10, 10, 10]);
  assert.equal(caso.pedidos.filas[0][1], 'recibido');
  assert.equal(caso.movimientos.filas.length, 0);
});

for (const [nombre, numero, esperado] of [
  ['primer producto', 1, [10, 10, 10]],
  ['producto intermedio', 2, [8, 10, 10]],
]) {
  test(`F9A-02 D/E: fallo en ${nombre} queda recuperable y retry completa`, async () => {
    const caso = await crearEscenario();
    caso.control.fallarUnaVez({ hoja: 'PRODUCTOS', operacion: 'setValue', numero });
    assert.throws(() => confirmar(caso), /OPERACION_EN_CURSO/);
    assert.equal(estadoOperacion(caso), 'APLICANDO');
    assert.deepEqual(stocks(caso), esperado);
    confirmar(caso);
    assert.deepEqual(stocks(caso), [8, 8, 8]);
    assert.equal(caso.movimientos.filas.length, 3);
    assert.equal(estadoOperacion(caso), 'COMPLETADA');
  });
}

test('F9A-02 F: fallo insertando movimiento no duplica al reintentar', async () => {
  const caso = await crearEscenario();
  caso.control.fallarUnaVez({ hoja: 'MOVIMIENTOS_STOCK', operacion: 'appendRow' });
  assert.throws(() => confirmar(caso), /OPERACION_EN_CURSO/);
  assert.deepEqual(stocks(caso), [8, 8, 8]);
  assert.equal(caso.movimientos.filas.length, 0);
  confirmar(caso);
  assert.equal(caso.movimientos.filas.length, 3);
  assert.equal(new Set(caso.movimientos.filas.map((fila) => fila[0])).size, 3);
});

test('F9A-02 G: fallo cambiando PEDIDOS se recupera sin repetir stock/movimientos', async () => {
  const caso = await crearEscenario();
  caso.control.fallarUnaVez({ hoja: 'PEDIDOS', operacion: 'setValues' });
  assert.throws(() => confirmar(caso), /OPERACION_EN_CURSO/);
  assert.equal(caso.pedidos.filas[0][1], 'recibido');
  assert.deepEqual(stocks(caso), [8, 8, 8]);
  assert.equal(caso.movimientos.filas.length, 3);
  confirmar(caso);
  assert.equal(caso.pedidos.filas[0][1], 'pendiente');
  assert.equal(caso.movimientos.filas.length, 3);
});

test('F9A-02 H: fallo de flush no afirma éxito; retry devuelve resultado guardado', async () => {
  const caso = await crearEscenario();
  caso.control.fallarUnaVez({ hoja: 'SpreadsheetApp', operacion: 'flush', numero: 3, fase: 'antes' });
  assert.throws(() => confirmar(caso), /OPERACION_EN_CURSO/);
  assert.equal(estadoOperacion(caso), 'COMPLETADA');
  const resultado = confirmar(caso);
  assert.equal(resultado.consistencia, 'VERIFICADA_POR_READBACK');
  assert.equal(caso.movimientos.filas.length, 3);
});

function prepararReadbackInconsistente(caso) {
  caso.control.fallarUnaVez({
    hoja: 'PEDIDOS',
    operacion: 'setValues',
    fase: 'despues',
    accion: () => { caso.productos.filas[0][1] = 7; },
  });
}

test('F9A-02 I/P: readback inconsistente marca revisión y bloquea mutaciones', async () => {
  const caso = await crearEscenario();
  prepararReadbackInconsistente(caso);
  assert.throws(() => confirmar(caso), /OPERACION_REQUIERE_REVISION/);
  assert.equal(estadoOperacion(caso), 'REQUIERE_REVISION');
  const datosAntesDelRetry = JSON.stringify({
    stocks: stocks(caso),
    movimientos: caso.movimientos.filas,
    pedido: caso.pedidos.filas[0],
  });
  assert.throws(() => confirmar(caso), /OPERACION_REQUIERE_REVISION/);
  assert.equal(JSON.stringify({
    stocks: stocks(caso),
    movimientos: caso.movimientos.filas,
    pedido: caso.pedidos.filas[0],
  }), datosAntesDelRetry);
  assert.throws(
    () => caso.contexto.actualizarEstadoPedido_({
      id_pedido: 'PED-1', estado_pedido: 'listo', actor: 'actor-test',
      idempotency_key: 'pasar_listo_bloqueado',
    }),
    /OPERACION_REQUIERE_REVISION/
  );
  assert.throws(() => cancelar(caso, 'cancelar_bloqueado_1'), /OPERACION_REQUIERE_REVISION/);
});

test('F9A-02 J: fallo registrando revisión conserva error original y bloqueo durable', async () => {
  const caso = await crearEscenario();
  prepararReadbackInconsistente(caso);
  caso.control.fallarUnaVez({
    hoja: 'OPERACIONES_PEDIDOS',
    operacion: 'setValues',
    predicado: ({ valores }) => valores[0][5] === 'REQUIERE_REVISION',
  });
  assert.throws(
    () => confirmar(caso),
    /Error original: CONSISTENCIA_INCIERTA.*no se pudo registrar el estado durable/
  );
  assert.equal(estadoOperacion(caso), 'APLICANDO');
  assert.throws(() => cancelar(caso, 'cancelar_tras_fallo_revision'), /OPERACION_EN_CURSO/);
});

test('F9A-02 L: confirmación interrumpida bloquea cancelación con otra key', async () => {
  const caso = await crearEscenario();
  caso.control.fallarUnaVez({ hoja: 'PRODUCTOS', operacion: 'setValue', numero: 2 });
  assert.throws(() => confirmar(caso), /OPERACION_EN_CURSO/);
  assert.throws(() => cancelar(caso, 'cancelar_con_confirmacion_abierta'), /OPERACION_EN_CURSO/);
  confirmar(caso);
  assert.equal(caso.pedidos.filas[0][1], 'pendiente');
});

test('F9A-02 M/N: cancelación durable y retry devuelven stock una sola vez', async () => {
  const caso = await crearEscenario({ estado: 'pendiente', stocks: [8, 8] });
  const primero = cancelar(caso);
  const segundo = cancelar(caso);
  assert.equal(JSON.stringify(primero), JSON.stringify(segundo));
  assert.deepEqual(stocks(caso), [10, 10]);
  assert.equal(caso.pedidos.filas[0][1], 'cancelado');
  assert.equal(caso.movimientos.filas.length, 2);
  assert.equal(estadoOperacion(caso), 'COMPLETADA');
});

test('F9 HTTP ambiguo: cancelado con key nueva se rechaza, misma key recupera resultado', async () => {
  const caso = await crearEscenario({ estado: 'pendiente', stocks: [8] });
  const primero = cancelar(caso, 'cancelacion_original', 'actor-test');
  const retry = cancelar(caso, 'cancelacion_original', 'actor-test');
  assert.equal(JSON.stringify(retry), JSON.stringify(primero));
  assert.throws(
    () => cancelar(caso, 'cancelacion_nueva', 'actor-test'),
    /IDEMPOTENCY_CONFLICT/
  );
  assert.deepEqual(stocks(caso), [10]);
  assert.equal(caso.movimientos.filas.length, 1);
  assert.equal(caso.operaciones.filas.length, 1);
});

test('F9 HTTP ambiguo: entregado sigue rechazando cancelación', async () => {
  const caso = await crearEscenario({ estado: 'entregado', stocks: [8] });
  assert.throws(
    () => cancelar(caso, 'cancelar_entregado', 'actor-test'),
    /no permitida/
  );
  assert.deepEqual(stocks(caso), [8]);
  assert.equal(caso.movimientos.filas.length, 0);
  assert.equal(caso.operaciones.filas.length, 0);
});

test('F9A-02 O: cancelación con fallo intermedio continúa sin doble devolución', async () => {
  const caso = await crearEscenario({ estado: 'listo', stocks: [8, 8, 8] });
  caso.control.fallarUnaVez({ hoja: 'MOVIMIENTOS_STOCK', operacion: 'appendRow', numero: 2 });
  assert.throws(() => cancelar(caso), /OPERACION_EN_CURSO/);
  cancelar(caso);
  assert.deepEqual(stocks(caso), [10, 10, 10]);
  assert.equal(caso.movimientos.filas.length, 3);
  assert.equal(new Set(caso.movimientos.filas.map((fila) => fila[0])).size, 3);
});

test('F9A-02 R: diario no contiene token, cookie ni secretos', async () => {
  const caso = await crearEscenario();
  confirmar(caso);
  const serializado = JSON.stringify(caso.operaciones.filas);
  assert.doesNotMatch(serializado, /token|cookie|ADMIN_SESSION|GOOGLE_SCRIPT/i);
  const operacion = objetoFila(caso.operaciones);
  const snapshot = JSON.parse(operacion.snapshot_json);
  assert.deepEqual(
    Object.keys(snapshot).sort(),
    ['actor', 'estado_anterior', 'estado_objetivo', 'id_pedido', 'idempotency_key', 'productos', 'tipo_operacion', 'version'].sort()
  );
});

test('F9A-02 schema: preparación es aditiva, idempotente y TEST-only', async () => {
  const caso = await crearEscenario();
  const fuente = caso.contexto.prepararOperacionesPedidosTest.toString();
  assert.match(fuente, /validarDestinoOperacionesPedidosTest_/);
  assert.match(fuente, /asegurarColumnasAditivas_/);
  assert.doesNotMatch(fuente, /\.clear\(|deleteSheet|deleteRows/);
  const setup = await readFile(new URL('../scripts/setup-google-sheet.gs', import.meta.url), 'utf8');
  assert.match(setup, /nombre: 'OPERACIONES_PEDIDOS'/);
  assert.match(setup, /'operacion_id'.*'idempotency_key'.*'tipo_operacion'/s);
});

test('F9A-02 HTTP: Next exige y propaga idempotency_key en confirmar/cancelar', async () => {
  const ruta = await readFile(
    new URL('../src/app/api/admin/pedidos/[id]/route.ts', import.meta.url),
    'utf8'
  );
  const helper = await readFile(
    new URL('../src/lib/appsScriptPedidos.ts', import.meta.url),
    'utf8'
  );
  assert.match(ruta, /body\.estado_pedido && !idempotencyKeyValida\(body\.idempotency_key\)/);
  assert.match(ruta, /POST[\s\S]*?!idempotencyKeyValida\(body\.idempotency_key\)/);
  assert.match(ruta, /const actor = actorIdFromRequest\(req\)[\s\S]*?actor,[\s\S]*?idempotency_key:/);
  assert.match(ruta, /const idempotencyKey = String\(body\.idempotency_key\)[\s\S]*?cancelarPedido\(id, actor, idempotencyKey\)/);
  assert.match(helper, /action: 'actualizarEstadoPedido'[\s\S]*?token: adminToken\(\)/);
  assert.match(helper, /action: 'cancelarPedido'[\s\S]*?idempotency_key: idempotencyKey/);
});
