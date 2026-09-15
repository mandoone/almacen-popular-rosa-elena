export const CATEGORIAS_CATALOGO = [
  {
    id: 'granel',
    nombre: 'Granel',
    alias: ['granel', 'productos a granel'],
  },
  {
    id: 'alimentos',
    nombre: 'Alimentos',
    alias: ['alimento', 'alimentos', 'abarrote', 'abarrotes', 'abarrotes envasados'],
  },
  {
    id: 'limpieza',
    nombre: 'Limpieza',
    alias: ['limpieza', 'productos de limpieza'],
  },
  {
    id: 'higiene',
    nombre: 'Higiene',
    alias: ['higiene', 'productos de higiene'],
  },
] as const;

export type CategoriaCatalogoId = (typeof CATEGORIAS_CATALOGO)[number]['id'];

export interface ProductoPresentable {
  nombre: string;
  categoria?: string | null;
  unidad_medida?: string | null;
  permite_decimal?: string | boolean | null;
  paso_venta?: number | null;
  imagen_url?: string | null;
}

function normalizarTexto(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function obtenerCategoriaCatalogo(categoria: unknown) {
  const normalizada = normalizarTexto(categoria);
  return CATEGORIAS_CATALOGO.find((item) =>
    item.alias.some((alias) => normalizarTexto(alias) === normalizada)
  );
}

export function nombreCategoriaVisible(categoria: unknown): string {
  const original = String(categoria ?? '').trim();
  return obtenerCategoriaCatalogo(original)?.nombre ?? original;
}

export function idCategoriaVisible(categoria: unknown): string {
  const original = String(categoria ?? '').trim();
  return obtenerCategoriaCatalogo(original)?.id ?? normalizarTexto(original);
}

export function esProductoGranel(producto: ProductoPresentable): boolean {
  return obtenerCategoriaCatalogo(producto.categoria)?.id === 'granel';
}

export function permiteVentaDecimal(producto: ProductoPresentable): boolean {
  const valorDecimal = normalizarTexto(producto.permite_decimal);
  return producto.permite_decimal === true || ['si', 'sí', 'true', '1'].includes(valorDecimal);
}

export function descripcionFormatoVenta(producto: ProductoPresentable): string {
  const unidad = String(producto.unidad_medida ?? '').trim();
  if (!unidad) return permiteVentaDecimal(producto) ? 'Venta fraccionada' : '';
  return permiteVentaDecimal(producto)
    ? `Venta fraccionada · Unidad: ${unidad}`
    : `Unidad de venta: ${unidad}`;
}

export function rutaImagenProducto(producto: ProductoPresentable): string {
  const configurada = String(producto.imagen_url ?? '').trim();
  if (configurada.startsWith('/images/')) return configurada;

  const nombre = normalizarTexto(producto.nombre)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `/images/productos/${nombre}.jpg`;
}
