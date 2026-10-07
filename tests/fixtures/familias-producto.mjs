/** Datos inventados exclusivamente para pruebas locales; no IDs comerciales. */
export function crearFixturesFamilias() {
  const familia = (cambios) => ({
    familia_id: 'FAM-CLORO-1L-ECO', activo: 'SI', nombre_publico: 'Cloro 1 L Económico',
    categoria: 'Limpieza', precio_venta: 650, modo_venta: 'UNIDAD', unidad_venta: 'unidad',
    permite_decimal: 'NO', paso_venta: 1, contenido_cantidad: 1000, contenido_unidad: 'ml',
    presentacion_publica: 'Botella de 1 L', politica_marca: 'VARIABLE', marca_publica: '',
    imagen_url: '', version_oferta: 1, actualizado_en: '2026-10-07T12:00:00.000Z', ...cambios,
  });
  const economico = familia({});
  const clorinda = familia({ familia_id: 'FAM-CLORO-CLORINDA-1L', nombre_publico: 'Cloro Clorinda 1 L', politica_marca: 'EXPLICITA', marca_publica: 'Clorinda' });
  const shampoo = familia({ familia_id: 'FAM-SHAMPOO-ECO-750ML', nombre_publico: 'Shampoo Económico 750 ml', categoria: 'Higiene', contenido_cantidad: 750, presentacion_publica: 'Envase de 750 ml', precio_venta: 1500 });
  const arroz = familia({ familia_id: 'FAM-ARROZ-QA', nombre_publico: 'Arroz sintético', categoria: 'Granel', modo_venta: 'GRANEL', unidad_venta: 'g', gramos_referencia: 1000, contenido_cantidad: undefined, contenido_unidad: undefined, politica_marca: 'NO_APLICA', presentacion_publica: 'Granel libre', precio_venta: 1350 });
  const sku = (id, f, marca, stock, cambios = {}) => ({
    id_producto: id, nombre: `${f.nombre_publico} ${marca}`, familia_id: f.familia_id,
    categoria: f.categoria, activo: 'SI', modo_venta: f.modo_venta,
    unidad_medida: 'unidad', permite_decimal: 'NO', paso_venta: 1,
    marca, presentacion: f.presentacion_publica, contenido_cantidad: f.contenido_cantidad,
    contenido_unidad: f.contenido_unidad, tipo_disponibilidad: 'REGULAR',
    stock_actual: stock, precio_costo: 590, precio_venta: 700, ...cambios,
  });
  const cloros = [sku('PROD-QA-CLORO-A', economico, 'Marca A', 4), sku('PROD-QA-CLORO-B', economico, 'Marca B', 7, { precio_costo: 610 })];
  const skuClorinda = sku('PROD-QA-CLORINDA', clorinda, 'Clorinda', 9);
  const shampoos = [sku('PROD-QA-SHAMPOO-A', shampoo, 'Marca A', 2), sku('PROD-QA-SHAMPOO-B', shampoo, 'Marca B', 3)];
  const shampooIncompatible = sku('PROD-QA-SHAMPOO-C', shampoo, 'Marca C', 100, { contenido_cantidad: 1000, presentacion: 'Envase de 1 L' });
  const inactivo = sku('PROD-QA-INACTIVO', economico, 'Marca D', 50, { activo: 'NO' });
  const especial = sku('PROD-QA-ESPECIAL', economico, 'Marca E', 30, { tipo_disponibilidad: 'POR_APERTURA' });
  const legado = { id_producto: 'PROD-QA-LEGADO', nombre: 'Producto V1', categoria: 'Alimentos', activo: 'SI', unidad_medida: 'unidad', stock_actual: 6, precio_venta: 500 };
  const granel = [
    sku('PROD-QA-ARROZ-A', arroz, '', 4, { gramos_unidad_stock: 250, gramos_referencia: 250, permite_decimal: 'SI', paso_venta: 0.004 }),
    sku('PROD-QA-ARROZ-B', arroz, '', 2, { unidad_medida: 'kg', gramos_unidad_stock: 1000, gramos_referencia: 1000, permite_decimal: 'SI', paso_venta: 0.001 }),
  ];
  return { economico, clorinda, shampoo, arroz, cloros, skuClorinda, shampoos, shampooIncompatible, inactivo, especial, legado, granel };
}
