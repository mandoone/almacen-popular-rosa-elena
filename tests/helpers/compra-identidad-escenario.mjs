/** Solo hojas en memoria: nunca abre servicios reales. */
import assert from 'node:assert/strict';
import { crearEscenario } from './granel-escenario.mjs';
import { crearFixturesFamilias } from '../fixtures/familias-producto.mjs';

export function objetos(hoja) {
  return hoja.filas.map(f => Object.fromEntries(hoja.headers.map((h, i) => [h, f[i] ?? ''])));
}

export async function crearEscenarioCompra({ identidad = true, columnasNuevas = true } = {}) {
  const c = await crearEscenario(), { economico, cloros } = crearFixturesFamilias();
  const HojaMock = c.productos.constructor;
  const camposIdentidad = [...c.contexto.COLUMNAS_IDENTIDAD_SKU_FAMILIA];
  const camposSnapshot = [...c.contexto.COLUMNAS_SNAPSHOTS_COMPRA_B1];
  const columnasProductos = [...c.contexto.COLUMNAS_FASE_7_8.PRODUCTOS_ADMIN]
    .filter(h => columnasNuevas || !camposIdentidad.includes(h));
  columnasProductos.push('modo_venta', 'gramos_referencia', 'gramos_unidad_stock');
  c.productos.headers = columnasProductos;
  c.productos.filas = cloros.map((p, i) => {
    const maestro = { ...p, precio_costo: 500 + i * 10, prioridad: 'media', stock_minimo: 0, imagen_url: '' };
    if (!identidad) camposIdentidad.forEach(h => delete maestro[h]);
    return columnasProductos.map(h => maestro[h] ?? '');
  });
  for (const nombre of ['COMPRAS', 'DETALLE_COMPRAS', 'HISTORIAL_COSTOS', 'AUDITORIA_PRODUCTOS', 'MOVIMIENTOS_STOCK']) {
    const headers = [...c.contexto.COLUMNAS_FASE_7_8[nombre]]
      .filter(h => columnasNuevas || !camposSnapshot.includes(h));
    c.hojas[nombre] = new HojaMock(nombre, headers, [], c.control);
  }
  c.hojas.FAMILIAS_PRODUCTO = new HojaMock('FAMILIAS_PRODUCTO', [...c.contexto.COLUMNAS_FAMILIAS_PRODUCTO],
    [[...c.contexto.COLUMNAS_FAMILIAS_PRODUCTO].map(h => economico[h] ?? '')], c.control);
  for (const hoja of Object.values(c.hojas)) {
    hoja.deleteRows = (inicio, cantidad) => hoja.filas.splice(inicio - 2, cantidad);
  }
  let bloqueado = false;
  const lock = {
    tryLock: () => { assert.equal(bloqueado, false); bloqueado = true; return true; },
    releaseLock: () => { assert.equal(bloqueado, true); bloqueado = false; },
  };
  c.contexto.LockService.getScriptLock = () => lock;
  const propiedades = new Map([['APP_ENV', 'TEST']]);
  c.contexto.PropertiesService.getScriptProperties = () => ({
    getProperty: nombre => propiedades.get(nombre) ?? '',
    setProperty: (nombre, valor) => propiedades.set(nombre, valor),
  });
  const abrir = c.contexto.SpreadsheetApp.openById;
  c.contexto.SpreadsheetApp.openById = (...args) => {
    if (c.exigirLock) assert.equal(bloqueado, true, 'lectura del maestro y persistencia bajo lock');
    return abrir(...args);
  };
  c.bodyCompra = {
    fecha: '2026-10-07', proveedor: 'La Oferta QA', responsable: 'qa-local',
    observaciones: 'Fixture sintético B1', idempotency_key: 'compra_b1_1234567890',
    lineas: cloros.map((p, i) => ({ producto_id: p.id_producto, cantidad: i ? 10 : 12, costo_unitario: i ? 610 : 590 })),
  };
  c.economico = economico;
  c.bloqueado = () => bloqueado;
  c.estado = () => Object.fromEntries(['PRODUCTOS', 'COMPRAS', 'DETALLE_COMPRAS', 'MOVIMIENTOS_STOCK', 'HISTORIAL_COSTOS', 'AUDITORIA_PRODUCTOS', 'FAMILIAS_PRODUCTO']
    .map(nombre => [nombre, structuredClone(c.hojas[nombre].filas)]));
  return c;
}
