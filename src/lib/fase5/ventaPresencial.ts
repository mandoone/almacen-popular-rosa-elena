/**
 * Base puramente local para Fase 5: venta presencial y comanda.
 *
 * No lee ni escribe Google Sheets, no llama Apps Script y no asigna IDs.
 * En la implementación real, estas reglas se deben repetir en Apps Script
 * usando catálogo, stock, precios y apertura obtenidos en el servidor.
 */

export const FORMAS_PAGO_VENTA_PRESENCIAL = [
  'efectivo',
  'transferencia',
  'pendiente',
] as const;

export type FormaPagoVentaPresencial =
  (typeof FORMAS_PAGO_VENTA_PRESENCIAL)[number];

export type EstadoPagoVentaPresencial = 'pagado' | 'pendiente_de_pago';

export interface ProductoVentaPresencial {
  id_producto: string;
  nombre: string;
  precio_venta: number;
  stock_actual: number;
  activo: boolean;
  permite_decimal: boolean;
  paso_venta?: number;
}

export interface LineaVentaPresencialInput {
  producto_id: string;
  cantidad: number;
}

export interface VentaPresencialInput {
  apertura_id: string;
  /** Hora de pared de Santiago, en formato yyyy-MM-ddTHH:mm. */
  fecha_hora: string;
  lineas: readonly LineaVentaPresencialInput[];
  forma_pago: FormaPagoVentaPresencial;
  vendedor: string;
  observaciones?: string;
}

/** Resultado de la comprobación de apertura que entregará el backend futuro. */
export interface AperturaHabilitadaParaVenta {
  apertura_id: string;
  habilitada: boolean;
}

export interface LineaVentaCalculada {
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface VentaPresencialCalculada {
  apertura_id: string;
  fecha_hora: string;
  lineas: readonly LineaVentaCalculada[];
  total: number;
  forma_pago: FormaPagoVentaPresencial;
  estado_pago: EstadoPagoVentaPresencial;
  vendedor: string;
  observaciones?: string;
}

export interface ResultadoValidacionVentaPresencial {
  valido: boolean;
  errores: string[];
  venta?: VentaPresencialCalculada;
}

export type ResultadoSolicitudVentaPresencial =
  | { ok: true; venta: VentaPresencialInput }
  | { ok: false; error: string };

/** APERTURAS utiliza este formato de identificador desde Fase 3B. */
export function esAperturaIdValido(aperturaId: unknown): aperturaId is string {
  return /^APE-\d{8}$/.test(String(aperturaId ?? ''));
}

function esFechaHoraLocalValida(valor: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor);
}

function esFormaPagoValida(valor: unknown): valor is FormaPagoVentaPresencial {
  return (FORMAS_PAGO_VENTA_PRESENCIAL as readonly string[]).includes(
    String(valor ?? '')
  );
}

/**
 * Valida la forma de una solicitud antes de enviarla a Apps Script. Esta
 * comprobación no reemplaza la validación de catálogo, apertura, precios ni
 * stock que se ejecuta nuevamente dentro del lock en el backend TEST.
 */
export function validarSolicitudVentaPresencial(
  valor: unknown
): ResultadoSolicitudVentaPresencial {
  if (!valor || typeof valor !== 'object') {
    return { ok: false, error: 'La venta enviada no es válida.' };
  }

  const entrada = valor as Record<string, unknown>;
  const aperturaId = String(entrada.apertura_id ?? '').trim();
  const fechaHora = String(entrada.fecha_hora ?? '').trim();
  const vendedor = String(entrada.vendedor ?? '').trim();
  const observaciones = String(entrada.observaciones ?? '').trim();
  const formaPago = entrada.forma_pago;
  const lineasCrudas = entrada.lineas;

  if (!esAperturaIdValido(aperturaId)) {
    return { ok: false, error: 'Falta una apertura_id válida.' };
  }
  if (!esFechaHoraLocalValida(fechaHora)) {
    return { ok: false, error: 'La fecha_hora debe usar el formato yyyy-MM-ddTHH:mm.' };
  }
  if (!vendedor || vendedor.length > 100) {
    return { ok: false, error: 'Falta un vendedor válido.' };
  }
  if (observaciones.length > 500) {
    return { ok: false, error: 'Las observaciones no pueden superar 500 caracteres.' };
  }
  if (!esFormaPagoValida(formaPago)) {
    return { ok: false, error: 'La forma de pago no es válida.' };
  }
  if (!Array.isArray(lineasCrudas) || lineasCrudas.length === 0 || lineasCrudas.length > 100) {
    return { ok: false, error: 'La venta debe incluir entre 1 y 100 productos.' };
  }

  const ids = new Set<string>();
  const lineas: LineaVentaPresencialInput[] = [];
  for (const lineaCruda of lineasCrudas) {
    if (!lineaCruda || typeof lineaCruda !== 'object') {
      return { ok: false, error: 'Hay una línea de venta inválida.' };
    }
    const linea = lineaCruda as Record<string, unknown>;
    const productoId = String(linea.producto_id ?? '').trim();
    const cantidad = Number(linea.cantidad);
    if (!productoId || productoId.length > 100) {
      return { ok: false, error: 'Hay una línea sin producto_id válido.' };
    }
    if (ids.has(productoId)) {
      return { ok: false, error: `El producto "${productoId}" está repetido.` };
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return { ok: false, error: `La cantidad de "${productoId}" debe ser mayor que cero.` };
    }
    ids.add(productoId);
    lineas.push({ producto_id: productoId, cantidad });
  }

  return {
    ok: true,
    venta: {
      apertura_id: aperturaId,
      fecha_hora: fechaHora,
      lineas,
      forma_pago: formaPago,
      vendedor,
      ...(observaciones ? { observaciones } : {}),
    },
  };
}

function validarCantidadProducto(
  producto: ProductoVentaPresencial,
  cantidad: number
): string[] {
  const errores: string[] = [];

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    return ['La cantidad debe ser mayor que cero.'];
  }

  if (!producto.permite_decimal && !Number.isInteger(cantidad)) {
    errores.push(`\"${producto.nombre}\" no se vende en fracciones.`);
  }

  if (producto.permite_decimal) {
    const paso = producto.paso_venta ?? 0.25;
    const cantidadCent = Math.round(cantidad * 100);
    const pasoCent = Math.round(paso * 100);
    if (paso <= 0 || cantidadCent % pasoCent !== 0) {
      errores.push(`\"${producto.nombre}\" debe respetar su paso de venta.`);
    }
  }

  if (cantidad > producto.stock_actual) {
    errores.push(`Stock insuficiente de \"${producto.nombre}\".`);
  }

  return errores;
}

/**
 * Valida y calcula una venta a partir de datos confiables de catálogo.
 * `total` y `precio_unitario` no entran desde el navegador: se calculan aquí
 * desde `productos`. Es una preparación; el Apps Script futuro debe ejecutar
 * la misma comprobación dentro de un lock antes de escribir movimientos.
 */
export function validarYCalcularVentaPresencial(
  entrada: VentaPresencialInput,
  productos: readonly ProductoVentaPresencial[],
  apertura: AperturaHabilitadaParaVenta | null
): ResultadoValidacionVentaPresencial {
  const errores: string[] = [];

  if (!esAperturaIdValido(entrada.apertura_id)) {
    errores.push('Falta una apertura_id válida.');
  }
  if (!apertura || apertura.apertura_id !== entrada.apertura_id || !apertura.habilitada) {
    errores.push('La apertura no está habilitada para venta presencial.');
  }
  if (!esFechaHoraLocalValida(entrada.fecha_hora)) {
    errores.push('La fecha_hora debe usar el formato yyyy-MM-ddTHH:mm.');
  }
  if (!String(entrada.vendedor ?? '').trim()) {
    errores.push('Falta identificar al vendedor.');
  }
  if (!esFormaPagoValida(entrada.forma_pago)) {
    errores.push('La forma de pago no es válida.');
  }
  if (!Array.isArray(entrada.lineas) || entrada.lineas.length === 0) {
    errores.push('La venta debe incluir al menos un producto.');
  }

  const productosPorId = new Map(productos.map((producto) => [producto.id_producto, producto]));
  const idsVistos = new Set<string>();
  const lineas: LineaVentaCalculada[] = [];

  for (const linea of entrada.lineas ?? []) {
    if (idsVistos.has(linea.producto_id)) {
      errores.push(`El producto \"${linea.producto_id}\" está repetido.`);
      continue;
    }
    idsVistos.add(linea.producto_id);

    const producto = productosPorId.get(linea.producto_id);
    if (!producto) {
      errores.push(`No existe el producto \"${linea.producto_id}\".`);
      continue;
    }
    if (!producto.activo) {
      errores.push(`El producto \"${producto.nombre}\" no está disponible.`);
      continue;
    }
    if (!Number.isFinite(producto.precio_venta) || producto.precio_venta <= 0) {
      errores.push(`El producto \"${producto.nombre}\" no tiene precio vendible.`);
      continue;
    }

    errores.push(...validarCantidadProducto(producto, linea.cantidad));
    lineas.push({
      producto_id: producto.id_producto,
      nombre_producto: producto.nombre,
      cantidad: linea.cantidad,
      precio_unitario: producto.precio_venta,
      subtotal: Math.round(producto.precio_venta * linea.cantidad),
    });
  }

  if (errores.length > 0) return { valido: false, errores };

  const estadoPago: EstadoPagoVentaPresencial =
    entrada.forma_pago === 'pendiente' ? 'pendiente_de_pago' : 'pagado';

  return {
    valido: true,
    errores: [],
    venta: {
      apertura_id: entrada.apertura_id,
      fecha_hora: entrada.fecha_hora,
      lineas,
      total: lineas.reduce((total, linea) => total + linea.subtotal, 0),
      forma_pago: entrada.forma_pago,
      estado_pago: estadoPago,
      vendedor: entrada.vendedor.trim(),
      ...(entrada.observaciones?.trim()
        ? { observaciones: entrada.observaciones.trim() }
        : {}),
    },
  };
}

export interface ComandaPreparada {
  venta_id: string;
  fecha_hora: string;
  apertura_id: string;
  detalle: readonly LineaVentaCalculada[];
  total: number;
  estado_pago: EstadoPagoVentaPresencial;
  /** La impresión es futura; esta función solo entrega contenido preparado. */
  estado_impresion: 'pendiente_de_impresion';
}

/** Construye la representación imprimible futura una vez que el servidor asignó el ID. */
export function prepararComanda(
  ventaId: string,
  venta: VentaPresencialCalculada
): ComandaPreparada | null {
  if (!String(ventaId ?? '').trim() || venta.lineas.length === 0) return null;

  return {
    venta_id: ventaId.trim(),
    fecha_hora: venta.fecha_hora,
    apertura_id: venta.apertura_id,
    detalle: venta.lineas,
    total: venta.total,
    estado_pago: venta.estado_pago,
    estado_impresion: 'pendiente_de_impresion',
  };
}
