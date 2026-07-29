/**
 * Tests de catálogo, granel y convención de imágenes (FASE 3A, §5 y §6.3).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PASO_GRANEL_KG,
  esVendible,
  estaAgotado,
  validarCantidad,
  normalizarNombreArchivoImagen,
  cumpleConvencionImagen,
} from '../src/lib/fase3a/productos.ts';

import { alertasDePedido } from '../src/lib/fase3a/alertas.ts';

function producto(extra = {}) {
  return {
    id_producto: 'PROD-001',
    nombre: 'Avena integral',
    estado: 'activo',
    precio_venta: 1500,
    stock_actual: 10,
    permite_decimal: false,
    ...extra,
  };
}

test('un producto inactivo o en borrador no es vendible', () => {
  assert.equal(esVendible(producto()), true);
  assert.equal(esVendible(producto({ estado: 'inactivo' })), false);
  assert.equal(esVendible(producto({ estado: 'borrador' })), false);
});

test('precio dudoso o pendiente de revisión bloquea la venta', () => {
  assert.equal(esVendible(producto({ precio_venta: 0 })), false);
  assert.equal(
    esVendible(producto({ requiere_revision_precio: true })),
    false
  );
});

test('la falta de imagen no impide vender', () => {
  assert.equal(esVendible(producto({ imagen_url: null })), true);
});

test('sin stock queda agotado', () => {
  assert.equal(estaAgotado(producto({ stock_actual: 0 })), true);
  assert.equal(estaAgotado(producto({ stock_actual: -1 })), true);
  assert.equal(estaAgotado(producto({ stock_actual: 0.25 })), false);
});

test('los productos sin decimales rechazan fracciones', () => {
  const p = producto({ permite_decimal: false });
  assert.equal(validarCantidad(p, 2).valido, true);
  assert.equal(validarCantidad(p, 2.5).valido, false);
});

test('granel acepta múltiplos de 0,25 y rechaza el resto', () => {
  assert.equal(PASO_GRANEL_KG, 0.25);
  const granel = producto({ permite_decimal: true, stock_actual: 10 });

  for (const ok of [0.25, 0.5, 0.75, 1, 1.25, 2.5]) {
    assert.equal(validarCantidad(granel, ok).valido, true, `${ok} kg debe ser válido`);
  }
  for (const malo of [0.1, 0.3, 0.33, 1.1, 0.2]) {
    assert.equal(
      validarCantidad(granel, malo).valido,
      false,
      `${malo} kg no es múltiplo de 0,25`
    );
  }
});

test('el paso de venta del producto manda sobre el default', () => {
  const p = producto({ permite_decimal: true, paso_venta: 0.5, stock_actual: 10 });
  assert.equal(validarCantidad(p, 0.5).valido, true);
  assert.equal(validarCantidad(p, 0.25).valido, false);
});

test('la cantidad no puede superar el stock ni ser cero', () => {
  const p = producto({ stock_actual: 3 });
  assert.equal(validarCantidad(p, 4).valido, false);
  assert.equal(validarCantidad(p, 0).valido, false);
  assert.equal(validarCantidad(p, -1).valido, false);
  assert.equal(validarCantidad(p, NaN).valido, false);
});

test('convención de nombres de imagen: sin tildes, sin ñ, sin espacios', () => {
  assert.equal(
    normalizarNombreArchivoImagen('Avena Integral', 1),
    'avena_integral_01.jpg'
  );
  assert.equal(normalizarNombreArchivoImagen('Garbanzos'), 'garbanzos_01.jpg');
  assert.equal(
    normalizarNombreArchivoImagen('Piñones Ñuñoa', 2),
    'pinones_nunoa_02.jpg'
  );
  assert.equal(
    normalizarNombreArchivoImagen('Café molido 1/2 kg', 3),
    'cafe_molido_1_2_kg_03.jpg'
  );
  assert.equal(
    normalizarNombreArchivoImagen('  Té   verde  ', 10),
    'te_verde_10.jpg'
  );
});

test('los nombres generados cumplen su propia convención', () => {
  const casos = ['Avena Integral', 'Piñones Ñuñoa', 'Café molido 1/2 kg', 'Té verde'];
  for (const c of casos) {
    const archivo = normalizarNombreArchivoImagen(c);
    assert.equal(cumpleConvencionImagen(archivo), true, `${archivo} debe cumplir`);
  }
  assert.equal(cumpleConvencionImagen('Avena Integral.JPG'), false);
  assert.equal(cumpleConvencionImagen('avena integral_01.jpg'), false);
  assert.equal(cumpleConvencionImagen('avena_integral.jpg'), false);
});

test('alertas del panel admin según §7.3', () => {
  assert.deepEqual(
    alertasDePedido({ estado_pedido: 'recibido', estado_pago: 'pendiente_de_pago' }),
    ['pedido_recibido_sin_revisar']
  );

  assert.deepEqual(
    alertasDePedido({
      estado_pedido: 'listo',
      estado_pago: 'pendiente_de_pago',
      metodo_pago: 'transferencia',
    }),
    ['transferencia_pendiente_revision']
  );

  // Transferencia ya pagada no genera alerta.
  assert.deepEqual(
    alertasDePedido({
      estado_pedido: 'listo',
      estado_pago: 'pagado',
      metodo_pago: 'transferencia',
      responsable: 'Nadia',
    }),
    []
  );

  assert.deepEqual(
    alertasDePedido({
      estado_pedido: 'cancelado',
      estado_pago: 'pendiente_de_pago',
      motivo_cancelacion: 'otro',
    }),
    ['cancelado_motivo_otro']
  );

  const varias = alertasDePedido({
    estado_pedido: 'recibido',
    estado_pago: 'pendiente_de_pago',
    responsable: 'Otro',
    stock_insuficiente: true,
    stock_bajo: true,
  });
  assert.deepEqual(varias, [
    'pedido_recibido_sin_revisar',
    'stock_insuficiente_al_confirmar',
    'responsable_otro_pendiente',
    'stock_bajo',
  ]);
});
