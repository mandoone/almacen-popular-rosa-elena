import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import {
  firmaIntentoCreacionPedido,
  idempotencyKeyCreacionValida,
  obtenerIntentoCreacionPedido,
} from '../src/lib/fase9/idempotenciaCreacionPedido.ts';
import { ejecutarMutacionDurableConReplay } from '../src/lib/fase9/resilienciaPedidos.ts';
import { RESPUESTA_POST_MUTACION_AMBIGUA } from '../src/lib/appsScriptRespuesta.ts';

const OPERACIONES = [
  'operacion_id', 'idempotency_key', 'tipo_operacion', 'id_pedido', 'actor',
  'estado_operacion', 'paso', 'payload_hash', 'snapshot_json', 'resultado_json',
  'error_codigo', 'error_detalle', 'creado_en', 'actualizado_en',
];

class ControlFallos {
  reglas = [];
  fallarUnaVez(hoja, operacion, numero = 1) {
    this.reglas.push({ hoja, operacion, numero, vistos: 0, usada: false });
  }
  ejecutar(hoja, operacion) {
    for (const regla of this.reglas) {
      if (regla.usada || regla.hoja !== hoja || regla.operacion !== operacion) continue;
      regla.vistos++;
      if (regla.vistos === regla.numero) {
        regla.usada = true;
        throw new Error(`fallo simulado ${hoja}.${operacion}`);
      }
    }
  }
}

class HojaMock {
  constructor(nombre, headers, filas, control) {
    this.nombre = nombre;
    this.headers = [...headers];
    this.filas = filas.map((fila) => [...fila]);
    this.control = control;
    this.historialEstados = [];
    this.formatos = new Map();
    this.maxFilas = 1000;
  }
  getName() { return this.nombre; }
  getLastRow() { return this.filas.length + 1; }
  getMaxRows() { return this.maxFilas; }
  insertRowsAfter(_fila, cantidad) { this.maxFilas += cantidad; }
  getLastColumn() { return this.headers.length; }
  valorCelda(valor, fila, columna) {
    if (this.formatos.get(`${fila}:${columna}`) === '@') return String(valor);
    return typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : valor;
  }
  getRange(fila, columna, cantidadFilas = 1, cantidadColumnas = 1) {
    return {
      getValues: () => Array.from({ length: cantidadFilas }, (_, i) =>
        Array.from({ length: cantidadColumnas }, (_, j) =>
          fila + i === 1
            ? this.headers[columna + j - 1]
            : this.filas[fila + i - 2]?.[columna + j - 1]
        )
      ),
      setValue: (valor) => { this.filas[fila - 2][columna - 1] = valor; },
      setNumberFormat: (formato) => {
        for (let i = 0; i < cantidadFilas; i++) {
          for (let j = 0; j < cantidadColumnas; j++) {
            this.formatos.set(`${fila + i}:${columna + j}`, formato);
          }
        }
      },
      setValues: (valores) => {
        this.control.ejecutar(this.nombre, 'setValues');
        for (let i = 0; i < valores.length; i++) {
          if (fila + i === 1) this.headers.splice(columna - 1, valores[i].length, ...valores[i]);
          else {
            if (!this.filas[fila + i - 2]) this.filas[fila + i - 2] = Array(this.headers.length).fill('');
            this.filas[fila + i - 2].splice(columna - 1, valores[i].length,
              ...valores[i].map((valor, j) => this.valorCelda(valor, fila + i, columna + j)));
          }
        }
        this.registrarEstado(valores[0]);
      },
    };
  }
  appendRow(fila) {
    this.control.ejecutar(this.nombre, 'appendRow');
    const siguiente = this.getLastRow() + 1;
    this.filas.push(fila.map((valor, i) => this.valorCelda(valor, siguiente, i + 1)));
    this.registrarEstado(fila);
  }
  registrarEstado(fila) {
    if (this.nombre !== 'OPERACIONES_PEDIDOS') return;
    const indice = this.headers.indexOf('estado_operacion');
    if (fila[indice]) this.historialEstados.push(fila[indice]);
  }
}

function objetoFila(hoja, indice = 0) {
  return Object.fromEntries(hoja.headers.map((header, i) => [header, hoja.filas[indice][i]]));
}

async function crearEscenario() {
  const fuente = await readFile(new URL('../scripts/apps-script-pedidos.gs', import.meta.url), 'utf8');
  const control = new ControlFallos();
  const hojas = {};
  const hoja = (nombre, headers, filas = []) => {
    hojas[nombre] = new HojaMock(nombre, headers, filas, control);
    return hojas[nombre];
  };
  const pedidos = hoja('PEDIDOS', [
    'id_pedido', 'fecha_hora', 'canal', 'id_cliente', 'nombre_cliente', 'telefono',
    'total', 'estado_pedido', 'estado_pago', 'forma_pago', 'observaciones',
    'vendedor_admin', 'fecha_entrega', 'apertura_id', 'origen_pedido',
  ]);
  const detalles = hoja('DETALLE_PEDIDOS', [
    'id_pedido', 'id_producto', 'nombre_producto', 'cantidad', 'unidad_medida',
    'precio_unitario', 'subtotal',
  ]);
  const productos = hoja('PRODUCTOS', [
    'id_producto', 'activo', 'nombre', 'unidad_medida', 'permite_decimal',
    'precio_venta', 'stock_actual',
  ], [
    ['PROD-1', 'SI', 'Producto 1', 'kg', 'SI', 1000, 5.6],
    ['PROD-2', 'SI', 'Producto 2', 'unidad', 'NO', 500, 10],
  ]);
  const movimientos = hoja('MOVIMIENTOS_STOCK', [
    'id_movimiento', 'fecha_hora', 'tipo', 'origen', 'id_origen', 'id_producto',
    'cantidad', 'stock_anterior', 'stock_resultante', 'usuario', 'observaciones',
    'operacion_id',
  ]);
  const operaciones = hoja('OPERACIONES_PEDIDOS', OPERACIONES);
  hoja('APERTURAS', [
    'apertura_id', 'fecha_apertura', 'hora_inicio', 'hora_termino',
    'lugar', 'cierre_pedidos_anticipados', 'estado_apertura',
    'pedidos_anticipados_estado', 'modo_presencial_estado', 'mensaje_publico',
    'observaciones_internas', 'creada_por', 'actualizada_por', 'creado_en',
    'actualizado_en',
  ], [[
    'APE-20260924', '2026-09-24', '10:00', '20:00', 'TEST',
    '2026-09-24T23:59', 'activa', 'activo', 'inactivo', 'TEST', '',
    'actor-test', 'actor-test', '2026-09-24T10:00:00.000', '2026-09-24T10:00:00.000',
  ]]);

  let uuid = 0;
  let lockActivo = false;
  const lock = {
    waitLock() {
      assert.equal(lockActivo, false, 'la creación debe quedar serializada');
      lockActivo = true;
    },
    releaseLock() { lockActivo = false; },
  };
  const spreadsheet = {
    getName: () => 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES',
    getSheetByName: (nombre) => hojas[nombre],
  };
  const contexto = {
    LockService: { getScriptLock: () => lock },
    SpreadsheetApp: { openById: () => spreadsheet, flush() {} },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (nombre) => nombre === 'APP_ENV' ? 'TEST' : '' }),
    },
    Session: { getScriptTimeZone: () => 'America/Santiago' },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      Charset: { UTF_8: 'UTF_8' },
      computeDigest: (_algoritmo, texto) => [...createHash('sha256').update(String(texto)).digest()],
      formatDate: (_fecha, _zona, formato) => {
        if (formato === 'yyyyMMdd-HHmmss') return '20260924-120000';
        if (formato === "yyyy-MM-dd'T'HH:mm") return '2026-09-24T12:00';
        if (formato.includes('SSS')) return '2026-09-24T12:00:00.000';
        return '2026-09-24 12:00:00';
      },
      getUuid: () => `${(++uuid).toString(16).padStart(8, '0')}-0000-0000-0000-000000000000`,
    },
  };
  vm.runInNewContext(fuente, contexto, { filename: 'apps-script-pedidos.gs' });
  const body = {
    nombre_cliente: 'E2E creación TEST',
    telefono: '+56900000000',
    forma_pago: 'efectivo_al_retirar',
    observaciones: 'TEST',
    apertura_id: 'APE-20260924',
    origen_pedido: 'online_anticipado',
    idempotency_key: 'crear_pedido_12345678',
    carrito: [
      { id_producto: 'PROD-1', cantidad: 0.1 },
      { id_producto: 'PROD-2', cantidad: 1 },
    ],
  };
  return { contexto, control, body, pedidos, detalles, productos, movimientos, operaciones };
}

test('CREAR_PEDIDO normal persiste PREPARADA/APLICANDO/COMPLETADA sin stock ni movimientos', async () => {
  const caso = await crearEscenario();
  const stockAntes = caso.productos.filas.map((fila) => fila.at(-1));
  const resultado = caso.contexto.crearPedido_(caso.body);
  assert.equal(resultado.estado_pedido, 'recibido');
  assert.equal(caso.pedidos.filas.length, 1);
  assert.equal(caso.detalles.filas.length, 2);
  assert.deepEqual(caso.productos.filas.map((fila) => fila.at(-1)), stockAntes);
  assert.equal(caso.movimientos.filas.length, 0);
  const operacion = objetoFila(caso.operaciones);
  assert.equal(operacion.tipo_operacion, 'CREAR_PEDIDO');
  assert.equal(operacion.estado_operacion, 'COMPLETADA');
  assert.deepEqual(caso.operaciones.historialEstados, ['PREPARADA', 'APLICANDO', 'COMPLETADA']);
});

for (const telefono of ['000000000', '+56912345678', '001234']) {
  test(`CREAR_PEDIDO preserva telefono textual ${telefono} sin convertir números reales`, async () => {
    const caso = await crearEscenario();
    caso.body.telefono = telefono;
    const stockAntes = caso.productos.filas.map((fila) => fila.at(-1));
    const resultado = caso.contexto.crearPedido_(caso.body);
    const cabecera = objetoFila(caso.pedidos);
    const detalle = objetoFila(caso.detalles);
    assert.equal(cabecera.telefono, telefono);
    assert.equal(typeof cabecera.telefono, 'string');
    assert.equal(caso.pedidos.formatos.get('2:6'), '@');
    assert.equal(typeof cabecera.total, 'number');
    assert.equal(typeof detalle.cantidad, 'number');
    assert.equal(typeof detalle.precio_unitario, 'number');
    assert.equal(typeof detalle.subtotal, 'number');
    assert.equal(objetoFila(caso.operaciones).estado_operacion, 'COMPLETADA');
    assert.equal(caso.contexto.crearPedido_(caso.body).id_pedido, resultado.id_pedido);
    assert.equal(caso.pedidos.filas.length, 1);
    assert.deepEqual(caso.productos.filas.map((fila) => fila.at(-1)), stockAntes);
    assert.equal(caso.movimientos.filas.length, 0);
  });
}

test('misma key y payload devuelve el mismo pedido sin duplicar cabecera ni detalles', async () => {
  const caso = await crearEscenario();
  const primero = caso.contexto.crearPedido_(caso.body);
  const segundo = caso.contexto.crearPedido_(structuredClone(caso.body));
  assert.equal(segundo.id_pedido, primero.id_pedido);
  assert.equal(caso.pedidos.filas.length, 1);
  assert.equal(caso.detalles.filas.length, 2);
  assert.equal(caso.operaciones.filas.length, 1);
});

test('misma key con payload distinto falla IDEMPOTENCY_CONFLICT', async () => {
  const caso = await crearEscenario();
  caso.contexto.crearPedido_(caso.body);
  const cambiado = structuredClone(caso.body);
  cambiado.carrito[0].cantidad = 0.2;
  assert.throws(() => caso.contexto.crearPedido_(cambiado), /IDEMPOTENCY_CONFLICT/);
  assert.equal(caso.pedidos.filas.length, 1);
  assert.equal(caso.detalles.filas.length, 2);
});

test('dos solicitudes serializadas con la misma key crean un solo pedido', async () => {
  const caso = await crearEscenario();
  const resultados = [
    caso.contexto.crearPedido_(caso.body),
    caso.contexto.crearPedido_(caso.body),
  ];
  assert.equal(new Set(resultados.map((r) => r.id_pedido)).size, 1);
  assert.equal(caso.pedidos.filas.length, 1);
});

test('cabecera creada con detalles faltantes reanuda solo los detalles faltantes', async () => {
  const caso = await crearEscenario();
  caso.control.fallarUnaVez('DETALLE_PEDIDOS', 'appendRow', 1);
  assert.throws(() => caso.contexto.crearPedido_(caso.body), /OPERACION_EN_CURSO/);
  assert.equal(caso.pedidos.filas.length, 1);
  assert.equal(caso.detalles.filas.length, 0);
  const resultado = caso.contexto.crearPedido_(caso.body);
  assert.equal(resultado.id_pedido, caso.pedidos.filas[0][0]);
  assert.equal(caso.detalles.filas.length, 2);
  assert.equal(objetoFila(caso.operaciones).estado_operacion, 'COMPLETADA');
});

test('cabecera incompatible queda REQUIERE_REVISION', async () => {
  const caso = await crearEscenario();
  caso.control.fallarUnaVez('DETALLE_PEDIDOS', 'appendRow', 1);
  assert.throws(() => caso.contexto.crearPedido_(caso.body), /OPERACION_EN_CURSO/);
  caso.pedidos.filas[0][caso.pedidos.headers.indexOf('nombre_cliente')] = 'OTRO';
  assert.throws(() => caso.contexto.crearPedido_(caso.body), /OPERACION_REQUIERE_REVISION/);
  assert.equal(objetoFila(caso.operaciones).estado_operacion, 'REQUIERE_REVISION');
});

test('detalle incompatible queda REQUIERE_REVISION', async () => {
  const caso = await crearEscenario();
  caso.control.fallarUnaVez('DETALLE_PEDIDOS', 'appendRow', 2);
  assert.throws(() => caso.contexto.crearPedido_(caso.body), /OPERACION_EN_CURSO/);
  caso.detalles.filas[0][caso.detalles.headers.indexOf('cantidad')] = 999;
  assert.throws(() => caso.contexto.crearPedido_(caso.body), /OPERACION_REQUIERE_REVISION/);
  assert.equal(objetoFila(caso.operaciones).estado_operacion, 'REQUIERE_REVISION');
});

test('snapshot y resultado de CREAR_PEDIDO no contienen secretos', async () => {
  const caso = await crearEscenario();
  caso.contexto.crearPedido_(caso.body);
  const operacion = objetoFila(caso.operaciones);
  assert.doesNotMatch(
    `${operacion.snapshot_json}${operacion.resultado_json}`,
    /token|cookie|ADMIN_SESSION|GOOGLE_SCRIPT/i
  );
});

test('key ausente o inválida se rechaza antes de crear', async () => {
  const caso = await crearEscenario();
  for (const key of [undefined, '', 'corta', 'espacios no']) {
    assert.throws(
      () => caso.contexto.crearPedido_({ ...caso.body, idempotency_key: key }),
      /idempotency_key invalida o ausente/
    );
  }
  assert.equal(caso.pedidos.filas.length, 0);
  assert.equal(idempotencyKeyCreacionValida('crear_12345678'), true);
  assert.equal(idempotencyKeyCreacionValida('corta'), false);
});

test('UI conserva key para el mismo intento y rota al cambiar materialmente', () => {
  const payload = {
    nombre_cliente: 'Cliente TEST', telefono: '+56900000000',
    forma_pago: 'efectivo_al_retirar', apertura_id: 'APE-1',
    carrito: [{ id_producto: 'PROD-1', cantidad: 0.1 }],
  };
  let secuencia = 0;
  const generar = () => `uuid_${++secuencia}_12345678`;
  const primero = obtenerIntentoCreacionPedido(null, payload, generar);
  const retry = obtenerIntentoCreacionPedido(primero, structuredClone(payload), generar);
  const cambiado = obtenerIntentoCreacionPedido(primero, {
    ...payload, carrito: [{ id_producto: 'PROD-1', cantidad: 0.2 }],
  }, generar);
  assert.equal(retry.idempotencyKey, primero.idempotencyKey);
  assert.notEqual(cambiado.idempotencyKey, primero.idempotencyKey);
  assert.equal(firmaIntentoCreacionPedido(payload), firmaIntentoCreacionPedido({
    ...payload, carrito: [...payload.carrito].reverse(),
  }));
});

test('respuesta ambigua de creación hace un replay y nunca un tercero', async () => {
  let intentos = 0;
  const errorAmbiguo = () => Object.assign(new Error('resultado ambiguo'), {
    tipoFallo: RESPUESTA_POST_MUTACION_AMBIGUA,
  });
  const resultado = await ejecutarMutacionDurableConReplay(async () => {
    intentos++;
    if (intentos === 1) throw errorAmbiguo();
    return { id_pedido: 'PED-1' };
  });
  assert.equal(resultado.id_pedido, 'PED-1');
  assert.equal(intentos, 2);

  intentos = 0;
  await assert.rejects(ejecutarMutacionDurableConReplay(async () => {
    intentos++;
    throw errorAmbiguo();
  }), /resultado ambiguo/);
  assert.equal(intentos, 2);
});

test('route pública exige key, usa DTO explícito y replay durable acotado', async () => {
  const ruta = await readFile(new URL('../src/app/api/pedidos/route.ts', import.meta.url), 'utf8');
  const helper = await readFile(new URL('../src/lib/appsScriptPedidos.ts', import.meta.url), 'utf8');
  assert.match(ruta, /idempotencyKeyCreacionValida\(body\.idempotency_key\)/);
  assert.match(ruta, /const input = \{[\s\S]*?idempotency_key: String\(body\.idempotency_key\)/);
  assert.match(ruta, /ejecutarMutacionDurableConReplay\(\(\) => crearPedido\(input\)\)/);
  assert.match(helper, /idempotency_key: input\.idempotency_key,[\s\S]*?action: 'crearPedido'/);
});
