import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

class HojaMock {
  constructor(headers, filas = [], opciones = {}) {
    this.headers = headers;
    this.filas = filas.map((fila) => [...fila]);
    this.appendIntentos = 0;
    this.fallarAppendEn = opciones.fallarAppendEn ?? null;
    this.fallarDelete = opciones.fallarDelete ?? false;
  }
  getLastRow() { return this.filas.length + 1; }
  getLastColumn() { return this.headers.length; }
  getRange(fila, columna, cantidadFilas = 1, cantidadColumnas = 1) {
    return {
      getValues: () => Array.from({ length: cantidadFilas }, (_, i) =>
        Array.from({ length: cantidadColumnas }, (_, j) =>
          fila + i === 1 ? this.headers[columna + j - 1] : this.filas[fila + i - 2]?.[columna + j - 1]
        )
      ),
      setValue: (valor) => {
        this.filas[fila - 2][columna - 1] = valor;
      },
      setValues: (valores) => {
        for (let i = 0; i < valores.length; i++) {
          if (fila + i === 1) this.headers.splice(columna - 1, valores[i].length, ...valores[i]);
          else this.filas[fila + i - 2].splice(columna - 1, valores[i].length, ...valores[i]);
        }
      },
    };
  }
  appendRow(fila) {
    this.appendIntentos++;
    if (this.appendIntentos === this.fallarAppendEn) throw new Error('fallo append simulado');
    this.filas.push([...fila]);
  }
  deleteRows(inicio, cantidad) {
    if (this.fallarDelete) throw new Error('fallo compensación simulado');
    this.filas.splice(inicio - 2, cantidad);
  }
}

async function escenario(estado = 'recibido', stocks = [10]) {
  const fuente = await readFile(new URL('../scripts/apps-script-pedidos.gs', import.meta.url), 'utf8');
  const pedidos = new HojaMock(
    ['id_pedido', 'estado_pedido', 'estado_pago', 'vendedor_admin'],
    [['PED-1', estado, 'pendiente', '']]
  );
  const detalles = new HojaMock(
    ['id_pedido', 'id_producto', 'cantidad'],
    stocks.map((_stock, indice) => ['PED-1', `P-${indice + 1}`, 2])
  );
  const productos = new HojaMock(
    ['id_producto', 'stock_actual'],
    stocks.map((stock, indice) => [`P-${indice + 1}`, stock])
  );
  const movimientos = new HojaMock([
    'id_movimiento', 'fecha_hora', 'tipo', 'origen', 'id_origen',
    'id_producto', 'cantidad', 'stock_anterior', 'stock_resultante',
    'usuario', 'observaciones', 'operacion_id',
  ]);
  const operaciones = new HojaMock([
    'operacion_id', 'idempotency_key', 'tipo_operacion', 'id_pedido', 'actor',
    'estado_operacion', 'paso', 'payload_hash', 'snapshot_json', 'resultado_json',
    'error_codigo', 'error_detalle', 'creado_en', 'actualizado_en',
  ]);
  const hojas = {
    PEDIDOS: pedidos, DETALLE_PEDIDOS: detalles, PRODUCTOS: productos,
    MOVIMIENTOS_STOCK: movimientos, OPERACIONES_PEDIDOS: operaciones,
  };
  const lock = { waitLock() {}, releaseLock() {} };
  let uuid = 0;
  const contexto = {
    LockService: { getScriptLock: () => lock },
    SpreadsheetApp: {
      openById: () => ({
        getName: () => 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES',
        getSheetByName: (nombre) => hojas[nombre],
      }),
      flush() {},
    },
    Session: { getScriptTimeZone: () => 'America/Santiago' },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (nombre) => nombre === 'APP_ENV' ? 'TEST' : '' }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      computeDigest: (_algoritmo, texto) => Array.from(Buffer.from(String(texto))).slice(0, 32),
      formatDate: (_fecha, _zona, formato) => formato === 'yyyyMMdd-HHmmss'
        ? '20260922-120000' : '2026-09-22 12:00:00',
      getUuid: () => `${(++uuid).toString(16).padStart(8, '0')}-0000-0000-0000-000000000000`,
    },
  };
  vm.runInNewContext(fuente, contexto, { filename: 'apps-script-pedidos.gs' });
  return { contexto, pedidos, productos, movimientos, operaciones };
}

async function escenarioCreacion(fallarDetalleEn = null, fallarCompensacion = false) {
  const fuente = await readFile(new URL('../scripts/apps-script-pedidos.gs', import.meta.url), 'utf8');
  const pedidos = new HojaMock([
    'id_pedido', 'fecha_hora', 'canal', 'id_cliente', 'nombre_cliente',
    'telefono', 'total', 'estado_pedido', 'estado_pago', 'forma_pago',
    'observaciones', 'vendedor_admin', 'fecha_entrega', 'apertura_id', 'origen_pedido',
  ], [], { fallarDelete: fallarCompensacion });
  const detalles = new HojaMock([
    'id_pedido', 'id_producto', 'nombre_producto', 'cantidad', 'unidad_medida',
    'precio_unitario', 'subtotal',
  ], [], { fallarAppendEn: fallarDetalleEn, fallarDelete: fallarCompensacion });
  const productos = new HojaMock([
    'id_producto', 'activo', 'nombre', 'unidad_medida', 'permite_decimal',
    'precio_venta', 'stock_actual',
  ], [
    ['P-1', 'SI', 'Producto 1', 'unidad', 'NO', 100, 10],
    ['P-2', 'SI', 'Producto 2', 'unidad', 'NO', 200, 10],
    ['P-3', 'SI', 'Producto 3', 'unidad', 'NO', 300, 10],
  ]);
  const movimientos = new HojaMock([
    'id_movimiento', 'fecha_hora', 'tipo', 'origen', 'id_origen',
    'id_producto', 'cantidad', 'stock_anterior', 'stock_resultante',
    'usuario', 'observaciones', 'operacion_id',
  ]);
  const operaciones = new HojaMock([
    'operacion_id', 'idempotency_key', 'tipo_operacion', 'id_pedido', 'actor',
    'estado_operacion', 'paso', 'payload_hash', 'snapshot_json', 'resultado_json',
    'error_codigo', 'error_detalle', 'creado_en', 'actualizado_en',
  ]);
  const hojas = {
    PEDIDOS: pedidos,
    DETALLE_PEDIDOS: detalles,
    PRODUCTOS: productos,
    MOVIMIENTOS_STOCK: movimientos,
    OPERACIONES_PEDIDOS: operaciones,
  };
  const lock = { waitLock() {}, releaseLock() {} };
  let uuid = 0;
  let appEnv = '';
  const contexto = {
    LockService: { getScriptLock: () => lock },
    SpreadsheetApp: {
      openById: () => ({
        getName: () => 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES',
        getSheetByName: (nombre) => hojas[nombre],
      }),
      flush() {},
    },
    Session: { getScriptTimeZone: () => 'America/Santiago' },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (nombre) => nombre === 'APP_ENV' ? appEnv : '' }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      computeDigest: (_algoritmo, texto) => Array.from(Buffer.from(String(texto))).slice(0, 32),
      formatDate: (_fecha, _zona, formato) => formato === 'yyyyMMdd-HHmmss'
        ? '20260922-120000' : '2026-09-22 12:00:00',
      getUuid: () => `${(++uuid).toString(16).padStart(8, '0')}-0000-0000-0000-000000000000`,
    },
  };
  vm.runInNewContext(fuente, contexto, { filename: 'apps-script-pedidos.gs' });
  const body = {
    nombre_cliente: 'Cliente',
    telefono: '+56911111111',
    forma_pago: 'efectivo',
    carrito: [
      { id_producto: 'P-1', cantidad: 1 },
      { id_producto: 'P-2', cantidad: 1 },
      { id_producto: 'P-3', cantidad: 1 },
    ],
  };
  return { contexto, body, pedidos, detalles, habilitarTest: () => { appEnv = 'TEST'; } };
}

test('F9 stock: crear pedido queda recibido y no escribe stock ni movimientos', async () => {
  const { contexto } = await escenario();
  const funcion = contexto.crearPedido_.toString();
  assert.match(funcion, /estado_pedido:\s*'recibido'/);
  assert.doesNotMatch(funcion, /registrarMovimiento_|stock_resultante|\.setValue\(/);
});

test('F9 stock: recibido -> pendiente descuenta una sola vez y registra actor', async () => {
  const { contexto, pedidos, productos, movimientos } = await escenario('recibido', [10]);
  const body = { id_pedido: 'PED-1', estado_pedido: 'pendiente', actor: 'actor-test', idempotency_key: 'confirmar_12345678' };
  contexto.actualizarEstadoPedido_(body);
  contexto.actualizarEstadoPedido_(body);
  assert.equal(pedidos.filas[0][1], 'pendiente');
  assert.equal(pedidos.filas[0][3], 'actor-test');
  assert.equal(productos.filas[0][1], 8);
  assert.equal(movimientos.filas.length, 1);
  assert.equal(movimientos.filas[0][9], 'actor-test');
});

test('F9 stock: confirmación multilínea genera un id distinto por movimiento', async () => {
  const { contexto, movimientos } = await escenario('recibido', [10, 10, 10]);
  contexto.actualizarEstadoPedido_({ id_pedido: 'PED-1', estado_pedido: 'pendiente', actor: 'actor-test', idempotency_key: 'confirmar_87654321' });
  const ids = movimientos.filas.map((fila) => fila[0]);
  assert.equal(ids.length, 3);
  assert.equal(new Set(ids).size, 3);
  for (const id of ids) assert.match(id, /^MOV-20260922-120000-[a-f0-9]{8}$/);
});

test('F9 stock: insuficiencia al confirmar no causa cambios parciales', async () => {
  const { contexto, pedidos, productos, movimientos } = await escenario('recibido', [10, 1]);
  assert.throws(
    () => contexto.actualizarEstadoPedido_({ id_pedido: 'PED-1', estado_pedido: 'pendiente', actor: 'actor-test', idempotency_key: 'confirmar_stock_1' }),
    /STOCK_INSUFICIENTE/
  );
  assert.equal(pedidos.filas[0][1], 'recibido');
  assert.deepEqual(productos.filas.map((fila) => fila[1]), [10, 1]);
  assert.equal(movimientos.filas.length, 0);
});

test('F9 stock: cancelar recibido no devuelve; cancelar pendiente o listo devuelve una vez', async () => {
  const recibido = await escenario('recibido', [10]);
  recibido.contexto.cancelarPedido_({ id_pedido: 'PED-1', actor: 'actor-test', idempotency_key: 'cancelar_recibido_1' });
  assert.equal(recibido.productos.filas[0][1], 10);
  assert.equal(recibido.movimientos.filas.length, 0);

  for (const estado of ['pendiente', 'listo']) {
    const caso = await escenario(estado, [8]);
    const body = { id_pedido: 'PED-1', actor: 'actor-test', idempotency_key: `cancelar_${estado}_1` };
    caso.contexto.cancelarPedido_(body);
    caso.contexto.cancelarPedido_(body);
    assert.equal(caso.productos.filas[0][1], 10, estado);
    assert.equal(caso.movimientos.filas.length, 1, estado);
  }
});

test('F9 stock: entregado no cancela, cancelado no reabre y entregar no toca stock', async () => {
  const entregado = await escenario('entregado', [8]);
  assert.throws(() => entregado.contexto.cancelarPedido_({ id_pedido: 'PED-1', idempotency_key: 'cancelar_entregado_1' }), /no permitida/);
  assert.equal(entregado.productos.filas[0][1], 8);

  const cancelado = await escenario('cancelado', [10]);
  assert.throws(() => cancelado.contexto.actualizarEstadoPedido_({ id_pedido: 'PED-1', estado_pedido: 'pendiente' }), /no permitida/);

  const listo = await escenario('listo', [8]);
  listo.contexto.actualizarEstadoPedido_({ id_pedido: 'PED-1', estado_pedido: 'entregado', actor: 'actor-test', idempotency_key: 'entregar_listo_1' });
  assert.equal(listo.productos.filas[0][1], 8);
  assert.equal(listo.movimientos.filas.length, 0);
});

test('F9 stock: listo -> pendiente queda rechazado también por Apps Script', async () => {
  const listo = await escenario('listo', [8]);
  assert.throws(
    () => listo.contexto.actualizarEstadoPedido_({ id_pedido: 'PED-1', estado_pedido: 'pendiente', actor: 'actor-test' }),
    /no permitida/
  );
  assert.equal(listo.pedidos.filas[0][1], 'listo');
});

test('F9 pedidos: dos creaciones en el mismo segundo reciben ids únicos', async () => {
  const caso = await escenarioCreacion();
  const primero = caso.contexto.crearPedido_(caso.body);
  const segundo = caso.contexto.crearPedido_(caso.body);
  assert.notEqual(primero.id_pedido, segundo.id_pedido);
  assert.match(primero.id_pedido, /^PED-20260922-120000-[a-f0-9]{8}$/);
  assert.match(segundo.id_pedido, /^PED-20260922-120000-[a-f0-9]{8}$/);
  assert.equal(new Set(caso.pedidos.filas.map((fila) => fila[0])).size, 2);
});

for (const [nombre, intento] of [['primera', 1], ['intermedia', 2], ['última', 3]]) {
  test(`F9 pedidos: fallo en línea ${nombre} compensa detalle y cabecera`, async () => {
    const caso = await escenarioCreacion(intento);
    assert.throws(() => caso.contexto.crearPedido_(caso.body), /fallo append simulado/);
    assert.equal(caso.pedidos.filas.length, 0);
    assert.equal(caso.detalles.filas.length, 0);
    caso.habilitarTest();
    assert.throws(
      () => caso.contexto.actualizarEstadoPedido_({
        id_pedido: 'PED-20260922-120000-00000001',
        estado_pedido: 'pendiente',
        actor: 'actor-test',
      }),
      /Pedido no encontrado/
    );
  });
}

test('F9 pedidos: si falla la compensación se informa CONSISTENCIA_INCIERTA', async () => {
  const caso = await escenarioCreacion(2, true);
  assert.throws(() => caso.contexto.crearPedido_(caso.body), /CONSISTENCIA_INCIERTA/);
});
