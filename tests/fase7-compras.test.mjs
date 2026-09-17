import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clasificarPrioridad,
  proponerAbastecimiento,
  resumirCajaParaCompra,
  validarGastoExtra,
  validarYCalcularCompra,
} from '../src/lib/fase7/compras.ts';

function producto(overrides = {}) {
  return {
    id_producto: 'PROD-001',
    nombre: 'Arroz',
    unidad_medida: 'unidad',
    permite_decimal: false,
    paso_venta: 1,
    stock_actual: 2,
    stock_minimo: 5,
    precio_costo: 800,
    precio_venta: 1000,
    prioridad: 'alta',
    activo: true,
    ...overrides,
  };
}

function compra(overrides = {}) {
  return {
    fecha: '2026-09-14',
    proveedor: 'Proveedor TEST',
    responsable: 'Responsable TEST',
    idempotency_key: 'COMPRA-TEST-00000001',
    lineas: [{ producto_id: 'PROD-001', cantidad: 3, costo_unitario: 900 }],
    ...overrides,
  };
}

test('Fase 7: calcula compra, entrada de stock y revisión de precio sin aplicarlos', () => {
  const resultado = validarYCalcularCompra(compra(), [producto()]);
  assert.equal(resultado.valido, true);
  assert.equal(resultado.compra.total_compra, 2700);
  assert.deepEqual(resultado.compra.lineas[0], {
    producto_id: 'PROD-001',
    nombre_producto: 'Arroz',
    unidad_medida: 'unidad',
    cantidad_comprada: 3,
    precio_costo_anterior: 800,
    precio_costo_unitario: 900,
    subtotal: 2700,
    stock_anterior: 2,
    stock_resultante: 5,
    requiere_revision_precio: true,
  });
});

test('Fase 7: exige idempotencia, evita duplicados y respeta pasos de cantidad', () => {
  const resultado = validarYCalcularCompra(compra({
    idempotency_key: '',
    lineas: [
      { producto_id: 'PROD-001', cantidad: 0.5, costo_unitario: 900 },
      { producto_id: 'PROD-001', cantidad: 1, costo_unitario: 900 },
    ],
  }), [producto()]);
  assert.equal(resultado.valido, false);
  assert.ok(resultado.errores.some((error) => error.includes('idempotencia')));
  assert.ok(resultado.errores.some((error) => error.includes('repetido')));
  assert.ok(resultado.errores.some((error) => error.includes('paso')));
});

test('Fase 7: admite compra decimal solo en múltiplos del paso', () => {
  const decimal = producto({ id_producto: 'PROD-DEC', permite_decimal: true, paso_venta: 0.1, unidad_medida: 'kg' });
  const valido = validarYCalcularCompra(compra({ lineas: [{ producto_id: 'PROD-DEC', cantidad: 0.5, costo_unitario: 700 }] }), [decimal]);
  const invalido = validarYCalcularCompra(compra({ lineas: [{ producto_id: 'PROD-DEC', cantidad: 0.15, costo_unitario: 700 }] }), [decimal]);
  assert.equal(valido.valido, true);
  assert.equal(invalido.valido, false);
});

test('Fase 7: gastos extra usan categorías cerradas y CLP entero positivo', () => {
  assert.deepEqual(validarGastoExtra({
    fecha: '2026-09-14', categoria: 'transporte', descripcion: 'Traslado TEST', monto: 3000,
    responsable: 'Responsable TEST',
  }), []);
  assert.ok(validarGastoExtra({
    fecha: 'mal', categoria: 'otros', descripcion: '', monto: 1.5, responsable: '',
  }).length >= 3);
});

test('Fase 7: caja no cuenta pendientes por cobrar como fondos disponibles', () => {
  const resumen = resumirCajaParaCompra({
    saldo_cuenta: 10000,
    efectivo_disponible: 5000,
    pendientes_por_cobrar: 7000,
    gastos_extra: [{
      fecha: '2026-09-14', categoria: 'bolsas', descripcion: 'Bolsas TEST', monto: 1000,
      responsable: 'Responsable TEST',
    }],
  });
  assert.equal(resumen.fondos_confirmados, 15000);
  assert.equal(resumen.pendientes_referencia, 7000);
  assert.equal(resumen.presupuesto_utilizable, 14000);
});

test('Fase 7: diferencia en caja confirmada queda como revisión humana', () => {
  const resumen = resumirCajaParaCompra({
    saldo_cuenta: 10000,
    efectivo_disponible: 0,
    pendientes_por_cobrar: 0,
    gastos_extra: [],
    caja_final_confirmada: 9000,
  });
  assert.equal(resumen.presupuesto_utilizable, 9000);
  assert.ok(resumen.alertas.some((alerta) => alerta.includes('revisión humana')));
});

test('Fase 7: propuesta repone solo mínimos por prioridad y respeta presupuesto', () => {
  const propuesta = proponerAbastecimiento([
    producto({ id_producto: 'PROD-BAJA', prioridad: 'baja', precio_costo: 500 }),
    producto({ id_producto: 'PROD-ALTA', prioridad: 'alta', precio_costo: 1000 }),
  ], 3500);
  assert.deepEqual(propuesta.lineas.map((linea) => linea.producto_id), ['PROD-ALTA', 'PROD-BAJA']);
  assert.equal(propuesta.lineas[0].cantidad_sugerida, 3);
  assert.equal(propuesta.lineas[1].cantidad_sugerida, 1);
  assert.equal(propuesta.total_propuesto, 3500);
  assert.equal(propuesta.saldo_sin_asignar, 0);
});

test('Fase 7: propuesta omite productos sin costo y productos inactivos', () => {
  const propuesta = proponerAbastecimiento([
    producto({ id_producto: 'PROD-SIN-COSTO', precio_costo: undefined }),
    producto({ id_producto: 'PROD-INACTIVO', activo: false }),
  ], 10000);
  assert.equal(propuesta.lineas.length, 0);
  assert.deepEqual(propuesta.omitidos, [{ producto_id: 'PROD-SIN-COSTO', motivo: 'Falta costo vigente válido.' }]);
});

test('Fase 7: prioridad combina señales solo mediante pesos y umbrales configurables', () => {
  assert.deepEqual(clasificarPrioridad(
    { rotacion: 80, esencialidad: 100, necesidad_reposicion: 50 },
    { peso_rotacion: 0.4, peso_esencialidad: 0.4, peso_reposicion: 0.2, umbral_alta: 75, umbral_media: 40 }
  ), { prioridad: 'alta', puntaje: 82 });
  assert.ok('errores' in clasificarPrioridad(
    { rotacion: 101, esencialidad: 0, necesidad_reposicion: 0 },
    { peso_rotacion: 1, peso_esencialidad: 1, peso_reposicion: 0, umbral_alta: 75, umbral_media: 40 }
  ));
});
