/**
 * productos.ts — Reglas de catálogo, stock y granel para FASE 3A.
 *
 * Fuente: docs/fase-3a/levantamiento_operativo_fase_3a_consolidado.md (§5, §6.3).
 *
 * Categorías heredadas se conservan; modo/referencias se acreditan en maestro
 * según D40/D41. Las constantes de propuesta no sustituyen esas evidencias.
 */

import { esGranel, cantidadStock, gramosValidos } from '../granel.ts';
/** Estado editorial del producto (§5.4, §5.5). */
export const ESTADOS_PRODUCTO = ['activo', 'inactivo', 'borrador'] as const;
export type EstadoProducto = (typeof ESTADOS_PRODUCTO)[number];

/** Compatibilidad del contrato decimal legado; GRANEL usa gramos libres (D40). */
export const PASO_GRANEL_KG = 0.25;

/**
 * PROPUESTA BASE — pendiente de validación por Administración (§2.6, §2.8).
 * No tratar como decisión cerrada.
 */
export const CATEGORIAS_PROPUESTAS = [
  'Granel',
  'Alimentos',
  'Limpieza',
  'Higiene',
  'Otros',
] as const;

export const UNIDADES_PROPUESTAS = [
  'unidad',
  'kilo',
  'gramos',
  'litro',
  'mililitro',
  'pack',
] as const;

export interface ProductoFase3A {
  modo_venta?: 'UNIDAD' | 'GRANEL';
  gramos_referencia?: number;
  gramos_unidad_stock?: number;
  id_producto: string;
  nombre: string;
  estado: EstadoProducto;
  precio_venta: number;
  stock_actual: number;
  permite_decimal: boolean;
  /** Incremento decimal legado; GRANEL explícito usa gramos enteros libres. */
  paso_venta?: number;
  /** §5.9: el costo cambió y el precio público aún no se revisa. */
  requiere_revision_precio?: boolean;
  imagen_url?: string | null;
}

/**
 * Un producto es vendible online solo si está activo, tiene precio confirmado y
 * no está marcado para revisión de precio (§5.4, §5.5, §5.9).
 * La falta de imagen NO impide la venta (§5.3).
 */
export function esVendible(producto: ProductoFase3A): boolean {
  if (producto.estado !== 'activo') return false;
  if (producto.requiere_revision_precio) return false;
  if (!(producto.precio_venta > 0)) return false;
  return true;
}

/** §5.2: sin stock se muestra "Agotado", pero no se puede agregar al pedido. */
export function estaAgotado(producto: ProductoFase3A): boolean {
  return !(producto.stock_actual > 0);
}

export interface ResultadoCantidad {
  valido: boolean;
  errores: string[];
}

/**
 * Valida la cantidad pedida de un producto.
 *
 * Reglas:
 *   - cantidad > 0;
 *   - GRANEL explícito: gramos enteros libres y conversión a base de stock;
 *   - contrato legado: entero, o múltiplo del paso decimal configurado;
 *   - no puede superar el stock disponible.
 *
 * La comparación con el paso se hace en centésimas enteras para evitar los
 * errores de coma flotante (0.1 + 0.2 !== 0.3).
 */
export function validarCantidad(
  producto: ProductoFase3A,
  cantidad: number
): ResultadoCantidad {
  const errores: string[] = [];
  if (esGranel(producto)) {
    if (!gramosValidos(cantidad)) return {valido:false, errores:['Granel requiere gramos enteros positivos.']};
    try { if (cantidadStock(producto,cantidad) > producto.stock_actual) errores.push('Stock insuficiente.'); }
    catch { errores.push('Base de stock inválida.'); }
    return {valido:errores.length === 0,errores};
  }

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return { valido: false, errores: ['La cantidad debe ser mayor que cero.'] };
  }

  if (!producto.permite_decimal) {
    if (!Number.isInteger(cantidad)) {
      errores.push(
        `"${producto.nombre}" no se vende en fracciones (cantidad ${cantidad}).`
      );
    }
  } else {
    const paso = producto.paso_venta ?? PASO_GRANEL_KG;
    if (paso > 0) {
      const cantCent = Math.round(cantidad * 100);
      const pasoCent = Math.round(paso * 100);
      if (cantCent % pasoCent !== 0) {
        errores.push(
          `"${producto.nombre}" se vende de a ${paso} (cantidad ${cantidad} no es múltiplo).`
        );
      }
    }
  }

  if (cantidad > producto.stock_actual) {
    errores.push(
      `Stock insuficiente de "${producto.nombre}": disponible ${producto.stock_actual}, solicitado ${cantidad}.`
    );
  }

  return { valido: errores.length === 0, errores };
}

/**
 * Marcas diacríticas combinantes (U+0300–U+036F). Se construye desde una cadena
 * ASCII para que el archivo fuente no contenga caracteres combinantes sueltos,
 * que son invisibles y fáciles de romper al editar.
 */
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

/**
 * Normaliza el nombre de un archivo de imagen según §6.3:
 * minúsculas, sin tildes, sin ñ, sin espacios ni caracteres especiales,
 * palabras separadas por guion bajo.
 *
 *   normalizarNombreArchivoImagen('Avena Integral', 1) -> 'avena_integral_01.jpg'
 *   normalizarNombreArchivoImagen('Piñones Ñuñoa', 2)  -> 'pinones_nunoa_02.jpg'
 */
export function normalizarNombreArchivoImagen(
  nombreProducto: string,
  indice = 1,
  extension = 'jpg'
): string {
  const base = String(nombreProducto ?? '')
    .normalize('NFD')
    // Quita los diacríticos que NFD dejó sueltos (tildes, diéresis y la
    // virgulilla de la ñ, que queda descompuesta como n + U+0303).
    .replace(DIACRITICOS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const sufijo = String(Math.max(1, Math.trunc(indice))).padStart(2, '0');
  const ext = String(extension).toLowerCase().replace(/[^a-z0-9]/g, '');

  return `${base}_${sufijo}.${ext}`;
}

/** true si el nombre de archivo ya cumple la convención de §6.3. */
export function cumpleConvencionImagen(nombreArchivo: string): boolean {
  return /^[a-z0-9]+(_[a-z0-9]+)*_\d{2}\.[a-z0-9]+$/.test(
    String(nombreArchivo ?? '')
  );
}
