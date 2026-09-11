import assert from 'node:assert/strict';
import test from 'node:test';
import {
  esAperturaIdValido,
  prepararComanda,
  validarSolicitudVentaPresencial,
  validarYCalcularVentaPresencial,
} from '../src/lib/fase5/ventaPresencial.ts';

const apertura = { apertura_id: 'APE-20260919', habilitada: true };
const productos = [
  {
    id_producto: 'PROD-UNIDAD',
    nombre: 'Producto por unidad',
    precio_venta: 1200,
    stock_actual: 4,
    activo: true,
    permite_decimal: false,
  },
  {
    id_producto: 'PROD-GRANEL',
    nombre: 'Producto a granel',
    precio_venta: 1500,
    stock_actual: 2,
    activo: true,
    permite_decimal: true,
    paso_venta: 0.25,
  },
];

function entrada(lineas) {
  return {
    apertura_id: 'APE-20260919',
    fecha_hora: '2026-09-19T11:15',
    lineas,
    forma_pago: 'efectivo',
    vendedor: 'Lucía',
  };
}

test('Fase 5: calcula total desde el catálogo confiable y respeta unidades', () => {
  const resultado = validarYCalcularVentaPresencial(
    entrada([
      { producto_id: 'PROD-UNIDAD', cantidad: 2 },
      { producto_id: 'PROD-GRANEL', cantidad: 0.5 },
    ]),
    productos,
    apertura
  );

  assert.equal(resultado.valido, true);
  assert.equal(resultado.venta.total, 3150);
  assert.equal(resultado.venta.estado_pago, 'pagado');
  assert.deepEqual(resultado.venta.lineas.map((linea) => linea.subtotal), [2400, 750]);
});

test('Fase 5: rechaza fracciones indebidas, pasos inválidos y productos repetidos', () => {
  const resultado = validarYCalcularVentaPresencial(
    entrada([
      { producto_id: 'PROD-UNIDAD', cantidad: 1.5 },
      { producto_id: 'PROD-GRANEL', cantidad: 0.3 },
      { producto_id: 'PROD-UNIDAD', cantidad: 6 },
    ]),
    productos,
    apertura
  );

  assert.equal(resultado.valido, false);
  assert.match(resultado.errores.join(' '), /fracciones/);
  assert.match(resultado.errores.join(' '), /paso de venta/);
  assert.match(resultado.errores.join(' '), /repetido/);
});

test('Fase 5: rechaza una cantidad que supera el stock disponible', () => {
  const resultado = validarYCalcularVentaPresencial(
    entrada([{ producto_id: 'PROD-UNIDAD', cantidad: 6 }]),
    productos,
    apertura
  );

  assert.equal(resultado.valido, false);
  assert.match(resultado.errores.join(' '), /Stock insuficiente/);
});

test('Fase 5: exige apertura válida y habilitada para venta presencial', () => {
  assert.equal(esAperturaIdValido('APE-20260919'), true);
  assert.equal(esAperturaIdValido('sin-apertura'), false);

  const resultado = validarYCalcularVentaPresencial(
    { ...entrada([{ producto_id: 'PROD-UNIDAD', cantidad: 1 }]), apertura_id: '' },
    productos,
    null
  );
  assert.equal(resultado.valido, false);
  assert.match(resultado.errores.join(' '), /apertura_id válida/);
  assert.match(resultado.errores.join(' '), /no está habilitada/);
});

test('Fase 5: prepara una comanda sin asignar ni escribir la venta', () => {
  const resultado = validarYCalcularVentaPresencial(
    { ...entrada([{ producto_id: 'PROD-UNIDAD', cantidad: 1 }]), forma_pago: 'pendiente' },
    productos,
    apertura
  );
  const comanda = prepararComanda('VEN-TEST-001', resultado.venta);

  assert.deepEqual(comanda, {
    venta_id: 'VEN-TEST-001',
    fecha_hora: '2026-09-19T11:15',
    apertura_id: 'APE-20260919',
    detalle: [{ producto_id: 'PROD-UNIDAD', nombre_producto: 'Producto por unidad', cantidad: 1, precio_unitario: 1200, subtotal: 1200 }],
    total: 1200,
    estado_pago: 'pendiente_de_pago',
    estado_impresion: 'pendiente_de_impresion',
  });
});

test('Fase 5: valida y normaliza la solicitud que recibe la ruta admin', () => {
  const resultado = validarSolicitudVentaPresencial({
    ...entrada([{ producto_id: 'PROD-UNIDAD', cantidad: 2 }]),
    observaciones: '  Entregar comanda  ',
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.venta.observaciones, 'Entregar comanda');
});

test('Fase 5: rechaza formas de pago, líneas e identificadores inválidos antes del backend', () => {
  const forma = validarSolicitudVentaPresencial({
    ...entrada([{ producto_id: 'PROD-UNIDAD', cantidad: 1 }]),
    forma_pago: 'tarjeta',
  });
  const repetido = validarSolicitudVentaPresencial(entrada([
    { producto_id: 'PROD-UNIDAD', cantidad: 1 },
    { producto_id: 'PROD-UNIDAD', cantidad: 1 },
  ]));
  const sinApertura = validarSolicitudVentaPresencial({
    ...entrada([{ producto_id: 'PROD-UNIDAD', cantidad: 1 }]),
    apertura_id: '',
  });

  assert.deepEqual(forma, { ok: false, error: 'La forma de pago no es válida.' });
  assert.equal(repetido.ok, false);
  assert.match(repetido.error, /repetido/);
  assert.equal(sinApertura.ok, false);
  assert.match(sinApertura.error, /apertura_id válida/);
});
