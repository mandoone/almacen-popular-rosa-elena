/** Cantidad de entrada GRANEL en gramos; saldo histórico conserva su base. */
export interface ModeloGranel {
  modo_venta?: string;
  gramos_referencia?: number;
  gramos_unidad_stock?: number;
}

export function esGranel(p: ModeloGranel): boolean { return p.modo_venta === 'GRANEL'; }
export function gramosValidos(n: number): boolean { return Number.isSafeInteger(n) && n > 0; }
export function cantidadStock(p: ModeloGranel, cantidad: number): number {
  if (!esGranel(p)) return cantidad;
  if (!gramosValidos(cantidad) || ![100, 250, 1000].includes(Number(p.gramos_unidad_stock))) throw new Error('Peso o base de stock inválidos.');
  return cantidad / Number(p.gramos_unidad_stock);
}
export function subtotalVenta(p: ModeloGranel, precio: number, cantidad: number): number {
  if (!esGranel(p)) return Math.round(precio * cantidad);
  if (!gramosValidos(cantidad) || !gramosValidos(Number(p.gramos_referencia)) || !Number.isSafeInteger(precio) || precio <= 0 || !Number.isSafeInteger(precio * cantidad)) throw new Error('Referencia de precio o peso inválidos.');
  const numerador = precio * cantidad, referencia = Number(p.gramos_referencia);
  return Math.floor(numerador / referencia) + (numerador % referencia >= referencia / 2 ? 1 : 0);
}
export function formatoPeso(g: number): string { return g % 1000 === 0 ? `${g / 1000} kg` : `${g} g`; }
export function formatoCantidad(p: ModeloGranel, cantidad: number): string { return esGranel(p) ? formatoPeso(cantidad) : String(cantidad); }
export function referenciaPrecio(p: ModeloGranel, precio: number): string {
  const valor = '$' + precio.toLocaleString('es-CL');
  return esGranel(p) ? `${valor} / ${Number(p.gramos_referencia) === 1000 ? 'kg' : formatoPeso(Number(p.gramos_referencia))}` : valor;
}
export function formatoDetalle(p: { gramos_solicitados?: number | string; cantidad: number; unidad_medida?: string }): string {
  return Number(p.gramos_solicitados) > 0 ? formatoPeso(Number(p.gramos_solicitados)) : `${p.cantidad} ${p.unidad_medida ?? ''}`.trim();
}
