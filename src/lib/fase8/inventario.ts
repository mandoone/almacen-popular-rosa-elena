import { esGranel, cantidadStock } from '../granel.ts';
import type { ModeloGranel } from '../granel.ts';

/** Entrada humana sin separador de miles. Gramos enteros; conteo admite cero. */
export function gramosDesdeEntrada(texto: string, unidad: 'g' | 'kg', admitirCero = false): number {
  if (!/^\d+(?:[.,]\d+)?$/.test(texto.trim())) throw new Error('Escribe un peso sin separadores de miles.');
  const partes = texto.trim().replace(',', '.').split('.');
  if (unidad === 'g' && partes[1]?.replace(/0+$/, '')) throw new Error('El peso debe corresponder a gramos enteros.');
  if (unidad === 'kg' && (partes[1]?.replace(/0+$/, '').length ?? 0) > 3) throw new Error('Usa hasta tres decimales en kg (1 g).');
  const n = Number(partes[0]) * (unidad === 'kg' ? 1000 : 1) + (unidad === 'kg' ? Number((partes[1] ?? '').padEnd(3, '0').slice(0, 3)) : 0);
  if (!Number.isSafeInteger(n) || n < (admitirCero ? 0 : 1)) throw new Error('El peso debe ser positivo y válido.');
  return n;
}
export interface ProductoConteo extends ModeloGranel { id_producto: string; nombre: string; stock_actual: number }
export interface LineaConteo {
  producto_id: string; nombre: string; stock_esperado: number; stock_contado: number; delta: number;
  motivo: 'recuento_fisico'; observaciones: string; idempotency_key: string;
}
export function prepararLineaConteo(p: ProductoConteo, texto: string, unidad: 'g' | 'kg' | 'unidad', sesion: string, observacion: string): LineaConteo {
  if (!/^PROD-[A-Za-z0-9-]{1,80}$/.test(p.id_producto) || !/^[A-Za-z0-9_-]{8,80}$/.test(sesion)) throw new Error('Identidad de conteo inválida.');
  if (!Number.isFinite(p.stock_actual) || p.stock_actual < 0) throw new Error('Stock de referencia inválido. Actualiza la lectura.');
  if (!observacion.trim() || observacion.length > 300) throw new Error('Registra observación y revisión del conteo (máximo300 caracteres).');
  let stock: number;
  if (esGranel(p)) {
    if (![100,250,1000].includes(Number(p.gramos_unidad_stock))) throw new Error('Base histórica no acreditada. No aplicar conteo.');
    if (unidad === 'unidad') throw new Error('Cuenta este producto en g o kg.');
    const g = gramosDesdeEntrada(texto, unidad, true);
    stock = g === 0 ? 0 : cantidadStock(p, g);
  } else {
    if (unidad !== 'unidad' || !/^\d+$/.test(texto.trim()) || !Number.isSafeInteger(Number(texto))) throw new Error('Cuenta unidades/paquetes enteros, incluyendo cero.');
    stock = Number(texto);
  }
  const key = `INV-${sesion}-${p.id_producto}`;
  if (key.length > 100) throw new Error('La referencia de este SKU requiere una sesión de conteo más corta.');
  return { producto_id: p.id_producto, nombre: p.nombre, stock_esperado: p.stock_actual, stock_contado: stock,
    delta: Number((stock - p.stock_actual).toFixed(9)), motivo: 'recuento_fisico',
    observaciones: `Inventario ${sesion}: ${observacion.trim()}`, idempotency_key: key };
}
/** Saldo coincidente no es evidencia: referencia, autor y efecto deben coincidir. */
export function acreditarMovimientoConteo(l: LineaConteo, actor: string, movimientos: Record<string, unknown>[]) {
  const filas = movimientos.filter(m => m.referencia_tipo === 'ajuste_admin' && m.referencia_id === l.idempotency_key);
  if (!filas.length) return false;
  if (filas.length !== 1) throw new Error('REQUIERE_REVISION: referencia duplicada.');
  const m = filas[0];
  if ((m.producto_id || m.id_producto) !== l.producto_id || m.usuario !== actor || !m.payload_hash
    || Number(m.stock_anterior) !== l.stock_esperado || Number(m.stock_resultante) !== l.stock_contado
    || Number(m.cantidad) !== l.delta || !String(m.observaciones || m.observacion || '').includes(l.observaciones)) throw new Error('REQUIERE_REVISION: evidencia de ajuste incompatible.');
  return true;
}
