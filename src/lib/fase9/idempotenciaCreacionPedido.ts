export interface LineaIntentoCreacionPedido {
  id_producto: string;
  cantidad: number;
}

export interface PayloadIntentoCreacionPedido {
  nombre_cliente: string;
  telefono: string;
  forma_pago: string;
  observaciones?: string;
  apertura_id?: string;
  carrito: LineaIntentoCreacionPedido[];
}

export interface IntentoCreacionPedido {
  firma: string;
  idempotencyKey: string;
}

export function idempotencyKeyCreacionValida(valor: unknown): valor is string {
  return typeof valor === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(valor);
}

export function firmaIntentoCreacionPedido(payload: PayloadIntentoCreacionPedido): string {
  const carrito = payload.carrito
    .map((linea) => ({
      id_producto: String(linea.id_producto).trim(),
      cantidad: Number(linea.cantidad),
    }))
    .sort((a, b) =>
      a.id_producto.localeCompare(b.id_producto) || a.cantidad - b.cantidad
    );
  return JSON.stringify({
    nombre_cliente: payload.nombre_cliente.trim(),
    telefono: payload.telefono.trim(),
    forma_pago: payload.forma_pago.trim(),
    observaciones: payload.observaciones?.trim() ?? '',
    apertura_id: payload.apertura_id?.trim() ?? '',
    carrito,
  });
}

export function obtenerIntentoCreacionPedido(
  actual: IntentoCreacionPedido | null,
  payload: PayloadIntentoCreacionPedido,
  generarUuid: () => string
): IntentoCreacionPedido {
  const firma = firmaIntentoCreacionPedido(payload);
  if (actual?.firma === firma) return actual;
  return { firma, idempotencyKey: generarUuid() };
}
