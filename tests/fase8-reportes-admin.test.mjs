import assert from 'node:assert/strict';
import test from 'node:test';
import { evolucionCostos, productosBajoStock, productosMasVendidos, resumirCompras } from '../src/lib/fase8/reportes.ts';
import { prepararAjusteStock, validarCambioProducto } from '../src/lib/fase8/productosAdmin.ts';

test('Fase 8: ranking suma cantidades, excluye cancelados y desempata establemente', () => {
  const ranking = productosMasVendidos([
    { fecha_hora: '2026-09-14', apertura_id: 'APE-1', producto_id: 'P2', nombre_producto: 'Dos', cantidad: 2, subtotal: 1000 },
    { fecha_hora: '2026-09-14', apertura_id: 'APE-1', producto_id: 'P1', nombre_producto: 'Uno', cantidad: 1, subtotal: 700 },
    { fecha_hora: '2026-09-14', apertura_id: 'APE-1', producto_id: 'P1', nombre_producto: 'Uno', cantidad: 1, subtotal: 700 },
    { fecha_hora: '2026-09-14', apertura_id: 'APE-1', producto_id: 'P3', nombre_producto: 'Tres', cantidad: 10, subtotal: 1, cancelada: true },
  ]);
  assert.deepEqual(ranking.map((item) => item.producto_id), ['P1', 'P2']);
  assert.equal(ranking[0].total, 1400);
});

test('Fase 8: bajo stock incluye solo activos y ordena por faltante', () => {
  const resultado = productosBajoStock([
    { producto_id: 'P1', nombre: 'Uno', stock_actual: 1, stock_minimo: 3, activo: true },
    { producto_id: 'P2', nombre: 'Dos', stock_actual: 0, stock_minimo: 5, activo: true },
    { producto_id: 'P3', nombre: 'Tres', stock_actual: 0, stock_minimo: 9, activo: false },
  ]);
  assert.deepEqual(resultado.map((item) => item.producto_id), ['P2', 'P1']);
});

test('Fase 8: resumen de compras separa gastos e invalida montos corruptos', () => {
  assert.deepEqual(resumirCompras([
    { compra_id: 'C1', fecha: '2026-09-14', total_compra: 10000, gastos_extra: 1000 },
    { compra_id: 'C2', fecha: '2026-09-14', total_compra: -1 },
  ]), {
    cantidad_compras: 1,
    total_compras: 10000,
    gastos_extra: 1000,
    costo_total_abastecimiento: 11000,
    registros_invalidos: 1,
  });
});

test('Fase 8: evolución de costos es cronológica y calcula variación', () => {
  const serie = evolucionCostos([
    { producto_id: 'P1', fecha: '2026-09-02', precio_costo: 900 },
    { producto_id: 'P1', fecha: '2026-09-01', precio_costo: 800 },
    { producto_id: 'P2', fecha: '2026-09-01', precio_costo: 1 },
  ], 'P1');
  assert.equal(serie[0].variacion, null);
  assert.equal(serie[1].variacion, 100);
});

test('Fase 8: ajuste de stock exige motivo y produce movimiento auditable', () => {
  const resultado = prepararAjusteStock({
    producto_id: 'PROD-001', stock_anterior: 5, stock_nuevo: 3,
    motivo: 'merma', responsable: 'Responsable TEST',
  });
  assert.equal(resultado.ok, true);
  assert.equal(resultado.movimiento.cantidad, -2);
  assert.equal(resultado.movimiento.tipo, 'ajuste');
});

test('Fase 8: Otro exige observación y no permite ajustes sin cambio', () => {
  const resultado = prepararAjusteStock({
    producto_id: 'PROD-001', stock_anterior: 5, stock_nuevo: 5,
    motivo: 'otro', responsable: 'Responsable TEST',
  });
  assert.equal(resultado.ok, false);
  assert.ok(resultado.errores.some((error) => error.includes('Otro')));
  assert.ok(resultado.errores.some((error) => error.includes('no cambia')));
});

test('Fase 8: edición de producto excluye stock y valida entero/paso', () => {
  assert.deepEqual(validarCambioProducto({ nombre: 'Arroz', permite_decimal: false, paso_venta: 1 }), []);
  assert.ok(validarCambioProducto({ permite_decimal: false, paso_venta: 0.5 }).length > 0);
  assert.ok(validarCambioProducto({ unidad_medida: 'caja' }).length > 0);
});
