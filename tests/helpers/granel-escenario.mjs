import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import {
  firmaIntentoCreacionPedido,
  idempotencyKeyCreacionValida,
  obtenerIntentoCreacionPedido,
} from '../../src/lib/fase9/idempotenciaCreacionPedido.ts';
import { ejecutarMutacionDurableConReplay } from '../../src/lib/fase9/resilienciaPedidos.ts';
import { RESPUESTA_POST_MUTACION_AMBIGUA } from '../../src/lib/appsScriptRespuesta.ts';
import { ESTADOS_PEDIDO as ESTADOS_PEDIDO_NEXT } from '../../src/lib/fase3a/estados.ts';

const OPERACIONES = [
  'operacion_id', 'idempotency_key', 'tipo_operacion', 'id_pedido', 'actor',
  'estado_operacion', 'paso', 'payload_hash', 'snapshot_json', 'resultado_json',
  'error_codigo', 'error_detalle', 'creado_en', 'actualizado_en',
];
const ESTADOS_PEDIDO = ['recibido', 'pendiente', 'listo', 'entregado', 'cancelado'];

function reglaLista(valores, permiteInvalidos = false) {
  return {
    getCriteriaType: () => 'VALUE_IN_LIST',
    getCriteriaValues: () => [[...valores], true],
    getAllowInvalid: () => permiteInvalidos,
  };
}

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
    this.validaciones = new Map();
    this.validacionPorDefecto = nombre === 'PEDIDOS' ? reglaLista(ESTADOS_PEDIDO) : null;
    this.escriturasValidacion = 0;
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
      getDataValidations: () => Array.from({ length: cantidadFilas }, (_, i) =>
        Array.from({ length: cantidadColumnas }, (_, j) =>
          this.validaciones.get(`${fila + i}:${columna + j}`) ??
          (this.nombre === 'PEDIDOS' && columna + j === 8 && fila + i >= 2
            ? this.validacionPorDefecto : null))),
      setDataValidation: (regla) => {
        this.escriturasValidacion++;
        for (let i = 0; i < cantidadFilas; i++) {
          for (let j = 0; j < cantidadColumnas; j++) {
            this.validaciones.set(`${fila + i}:${columna + j}`, regla);
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

export async function crearEscenario() {
  const fuente = await readFile(new URL('../../scripts/apps-script-pedidos.gs', import.meta.url), 'utf8');
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
    SpreadsheetApp: {
      openById: () => spreadsheet,
      flush() {},
      DataValidationCriteria: { VALUE_IN_LIST: 'VALUE_IN_LIST' },
      newDataValidation: () => {
        let valores = [];
        let permitir = true;
        return {
          requireValueInList(v) { valores = [...v]; return this; },
          setAllowInvalid(v) { permitir = v; return this; },
          setHelpText() { return this; },
          build() { return reglaLista(valores, permitir); },
        };
      },
    },
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
  return { contexto, control, body, pedidos, detalles, productos, movimientos, operaciones, hojas, spreadsheet };
}
