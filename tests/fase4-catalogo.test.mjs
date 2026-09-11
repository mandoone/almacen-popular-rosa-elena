import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  CATEGORIAS_CATALOGO,
  descripcionFormatoVenta,
  esProductoGranel,
  idCategoriaVisible,
  nombreCategoriaVisible,
  rutaImagenProducto,
} from '../src/lib/fase4/catalogo.ts';

test('las categorías largas corresponden a las tres categorías confirmadas', () => {
  assert.deepEqual(
    CATEGORIAS_CATALOGO.map(({ nombre }) => nombre),
    ['Productos a granel', 'Abarrotes envasados', 'Productos de higiene']
  );
  assert.equal(nombreCategoriaVisible('Granel'), 'Productos a granel');
  assert.equal(nombreCategoriaVisible('Alimento'), 'Abarrotes envasados');
  assert.equal(nombreCategoriaVisible('Higiene'), 'Productos de higiene');
});

test('una categoría desconocida se conserva y no se normaliza inventando datos', () => {
  assert.equal(nombreCategoriaVisible('Categoría por revisar'), 'Categoría por revisar');
  assert.equal(idCategoriaVisible('Categoría por revisar'), 'categoria por revisar');
});

test('identifica granel y describe la unidad sin cambiar cantidades ni precios', () => {
  const granel = {
    nombre: 'Avena',
    categoria: 'Granel',
    unidad_medida: 'KILO',
    permite_decimal: 'SI',
    paso_venta: 0.25,
  };
  assert.equal(esProductoGranel(granel), true);
  assert.equal(
    descripcionFormatoVenta(granel),
    'Venta a granel · Unidad: KILO'
  );
  assert.equal(
    descripcionFormatoVenta({
      nombre: 'Lavaloza',
      categoria: 'Higiene',
      unidad_medida: 'ENVASE',
    }),
    'Unidad de venta: ENVASE'
  );
});

test('un producto sin imagen obtiene una ruta estable y mantiene placeholder en UI', async () => {
  assert.equal(
    rutaImagenProducto({ nombre: 'Té verde', imagen_url: '' }),
    '/images/productos/te-verde.jpg'
  );
  assert.equal(
    rutaImagenProducto({ nombre: 'Avena', imagen_url: '/images/productos/prod-001.jpg' }),
    '/images/productos/prod-001.jpg'
  );

  const tienda = await readFile(
    new URL('../src/app/tienda/page.tsx', import.meta.url),
    'utf8'
  );
  assert.match(tienda, /Imagen por incorporar/);
  assert.match(tienda, /Imagen pendiente para/);
});

test('el endpoint público agrega metadatos de presentación sin campos internos de precio', async () => {
  const ruta = await readFile(
    new URL('../src/app/api/productos/route.ts', import.meta.url),
    'utf8'
  );
  for (const campo of [
    'categoria',
    'unidad_medida',
    'permite_decimal',
    'paso_venta',
    'imagen_url',
  ]) {
    assert.match(ruta, new RegExp(campo));
  }
  assert.doesNotMatch(ruta, /precio_costo|margen_pct/);
});

test('el aviso TEST de apertura en tienda es compacto y no expone el lugar', async () => {
  const tienda = await readFile(
    new URL('../src/app/tienda/page.tsx', import.meta.url),
    'utf8'
  );
  assert.match(tienda, /Próxima apertura: \{formatearFechaApertura/);
  assert.match(tienda, /Pedidos hasta/);
  assert.match(tienda, /flex flex-wrap items-center justify-center/);
  assert.doesNotMatch(tienda, /apertura\.lugar|apertura\.mensaje_publico/);
});
