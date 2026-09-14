/**
 * Dominio puro de Fase 7. No consulta ni escribe Sheets y no confirma compras.
 * Las funciones preparan datos que un backend deberá volver a validar dentro
 * de un lock antes de aplicar stock, costos o movimientos.
 */

export const CATEGORIAS_GASTO_EXTRA = [
  'bencina',
  'bolsas',
  'propina',
  'transporte',
  'materiales',
  'otros',
] as const;

export type CategoriaGastoExtra = (typeof CATEGORIAS_GASTO_EXTRA)[number];
export type PrioridadAbastecimiento = 'alta' | 'media' | 'baja';

export interface ProductoCompra {
  id_producto: string;
  nombre: string;
  unidad_medida: string;
  permite_decimal: boolean;
  paso_venta: number;
  stock_actual: number;
  stock_minimo: number;
  precio_costo?: number;
  precio_venta: number;
  prioridad: PrioridadAbastecimiento;
  activo: boolean;
}

export interface LineaCompraInput {
  producto_id: string;
  cantidad: number;
  costo_unitario: number;
}

export interface CompraInput {
  fecha: string;
  proveedor: string;
  responsable: string;
  observaciones?: string;
  idempotency_key: string;
  lineas: readonly LineaCompraInput[];
}

export interface LineaCompraCalculada {
  producto_id: string;
  nombre_producto: string;
  unidad_medida: string;
  cantidad_comprada: number;
  precio_costo_anterior: number | null;
  precio_costo_unitario: number;
  subtotal: number;
  stock_anterior: number;
  stock_resultante: number;
  requiere_revision_precio: boolean;
}

export type ResultadoCompra =
  | { valido: false; errores: string[] }
  | {
      valido: true;
      errores: [];
      compra: {
        fecha: string;
        proveedor: string;
        responsable: string;
        observaciones?: string;
        idempotency_key: string;
        total_compra: number;
        lineas: readonly LineaCompraCalculada[];
      };
    };

function texto(valor: unknown): string {
  return String(valor ?? '').trim();
}

function dineroValido(valor: number): boolean {
  return Number.isSafeInteger(valor) && valor >= 0;
}

function cantidadRespetaPaso(cantidad: number, paso: number): boolean {
  if (!Number.isFinite(cantidad) || !Number.isFinite(paso) || cantidad <= 0 || paso <= 0) {
    return false;
  }
  const cociente = cantidad / paso;
  return Math.abs(cociente - Math.round(cociente)) < 1e-9;
}

export function validarYCalcularCompra(
  entrada: CompraInput,
  productos: readonly ProductoCompra[]
): ResultadoCompra {
  const errores: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto(entrada.fecha))) errores.push('La fecha debe usar yyyy-MM-dd.');
  if (!texto(entrada.proveedor) || texto(entrada.proveedor).length > 120) errores.push('Falta un proveedor válido.');
  if (!texto(entrada.responsable) || texto(entrada.responsable).length > 100) errores.push('Falta una persona responsable válida.');
  if (texto(entrada.observaciones).length > 500) errores.push('Las observaciones superan 500 caracteres.');
  if (!/^[A-Za-z0-9_-]{16,120}$/.test(texto(entrada.idempotency_key))) {
    errores.push('Falta una clave de idempotencia válida.');
  }
  if (!Array.isArray(entrada.lineas) || entrada.lineas.length === 0 || entrada.lineas.length > 100) {
    errores.push('La compra debe incluir entre 1 y 100 productos.');
  }

  const porId = new Map(productos.map((producto) => [producto.id_producto, producto]));
  const vistos = new Set<string>();
  const lineas: LineaCompraCalculada[] = [];
  (entrada.lineas ?? []).forEach((linea) => {
    const productoId = texto(linea.producto_id);
    if (vistos.has(productoId)) {
      errores.push(`El producto "${productoId}" está repetido.`);
      return;
    }
    vistos.add(productoId);
    const producto = porId.get(productoId);
    if (!producto) {
      errores.push(`No existe el producto "${productoId}".`);
      return;
    }
    const paso = producto.permite_decimal ? producto.paso_venta : 1;
    if (!cantidadRespetaPaso(linea.cantidad, paso)) {
      errores.push(`La cantidad de "${producto.nombre}" no respeta su unidad o paso.`);
      return;
    }
    if (!dineroValido(linea.costo_unitario) || linea.costo_unitario === 0) {
      errores.push(`El costo unitario de "${producto.nombre}" no es válido.`);
      return;
    }
    if (!Number.isFinite(producto.stock_actual) || producto.stock_actual < 0) {
      errores.push(`El stock actual de "${producto.nombre}" no es válido.`);
      return;
    }
    const subtotal = Math.round(linea.cantidad * linea.costo_unitario);
    if (!dineroValido(subtotal)) {
      errores.push(`El subtotal de "${producto.nombre}" no es válido.`);
      return;
    }
    const costoAnterior = Number.isFinite(producto.precio_costo)
      ? (producto.precio_costo as number)
      : null;
    lineas.push({
      producto_id: producto.id_producto,
      nombre_producto: producto.nombre,
      unidad_medida: producto.unidad_medida,
      cantidad_comprada: linea.cantidad,
      precio_costo_anterior: costoAnterior,
      precio_costo_unitario: linea.costo_unitario,
      subtotal,
      stock_anterior: producto.stock_actual,
      stock_resultante: producto.stock_actual + linea.cantidad,
      requiere_revision_precio: costoAnterior === null || costoAnterior !== linea.costo_unitario,
    });
  });

  if (errores.length > 0) return { valido: false, errores };
  return {
    valido: true,
    errores: [],
    compra: {
      fecha: entrada.fecha,
      proveedor: entrada.proveedor.trim(),
      responsable: entrada.responsable.trim(),
      ...(entrada.observaciones?.trim() ? { observaciones: entrada.observaciones.trim() } : {}),
      idempotency_key: entrada.idempotency_key.trim(),
      total_compra: lineas.reduce((total, linea) => total + linea.subtotal, 0),
      lineas,
    },
  };
}

export interface GastoExtraInput {
  fecha: string;
  categoria: CategoriaGastoExtra;
  monto: number;
  responsable: string;
  observaciones?: string;
}

export function validarGastoExtra(gasto: GastoExtraInput): string[] {
  const errores: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto(gasto.fecha))) errores.push('La fecha del gasto no es válida.');
  if (!(CATEGORIAS_GASTO_EXTRA as readonly string[]).includes(gasto.categoria)) errores.push('La categoría del gasto no es válida.');
  if (!dineroValido(gasto.monto) || gasto.monto === 0) errores.push('El monto del gasto debe ser un entero CLP positivo.');
  if (!texto(gasto.responsable)) errores.push('Falta la persona responsable del gasto.');
  if (texto(gasto.observaciones).length > 500) errores.push('Las observaciones del gasto superan 500 caracteres.');
  return errores;
}

export interface CajaParaCompra {
  saldo_cuenta: number;
  efectivo_disponible: number;
  pendientes_por_cobrar: number;
  gastos_extra: readonly GastoExtraInput[];
  caja_final_confirmada?: number;
}

export interface ResumenCajaCompra {
  fondos_confirmados: number;
  pendientes_referencia: number;
  gastos_extra: number;
  presupuesto_calculado: number;
  presupuesto_confirmado: number | null;
  presupuesto_utilizable: number;
  alertas: string[];
}

export function resumirCajaParaCompra(entrada: CajaParaCompra): ResumenCajaCompra {
  const alertas: string[] = [];
  const valores = [entrada.saldo_cuenta, entrada.efectivo_disponible, entrada.pendientes_por_cobrar];
  if (valores.some((valor) => !dineroValido(valor))) alertas.push('La caja contiene montos inválidos.');
  entrada.gastos_extra.forEach((gasto) => alertas.push(...validarGastoExtra(gasto)));
  const fondos = dineroValido(entrada.saldo_cuenta) && dineroValido(entrada.efectivo_disponible)
    ? entrada.saldo_cuenta + entrada.efectivo_disponible
    : 0;
  const gastos = entrada.gastos_extra.reduce(
    (total, gasto) => total + (dineroValido(gasto.monto) ? gasto.monto : 0),
    0
  );
  const calculado = Math.max(0, fondos - gastos);
  const confirmado = entrada.caja_final_confirmada;
  if (confirmado !== undefined && !dineroValido(confirmado)) alertas.push('La caja final confirmada no es válida.');
  if (dineroValido(confirmado as number) && confirmado !== calculado) {
    alertas.push('La caja confirmada difiere del cálculo y requiere revisión humana.');
  }
  return {
    fondos_confirmados: fondos,
    pendientes_referencia: dineroValido(entrada.pendientes_por_cobrar) ? entrada.pendientes_por_cobrar : 0,
    gastos_extra: gastos,
    presupuesto_calculado: calculado,
    presupuesto_confirmado: dineroValido(confirmado as number) ? (confirmado as number) : null,
    presupuesto_utilizable: dineroValido(confirmado as number) ? (confirmado as number) : calculado,
    alertas,
  };
}

export interface LineaPropuestaAbastecimiento {
  producto_id: string;
  nombre_producto: string;
  prioridad: PrioridadAbastecimiento;
  cantidad_sugerida: number;
  costo_unitario: number;
  subtotal: number;
  stock_actual: number;
  stock_objetivo: number;
}

export interface PropuestaAbastecimiento {
  presupuesto: number;
  total_propuesto: number;
  saldo_sin_asignar: number;
  lineas: LineaPropuestaAbastecimiento[];
  omitidos: Array<{ producto_id: string; motivo: string }>;
}

/**
 * Propuesta conservadora: repone solo hasta stock_minimo, nunca proyecta demanda
 * ni usa pendientes por cobrar como dinero disponible. El resultado es editable
 * y no representa una compra confirmada.
 */
export function proponerAbastecimiento(
  productos: readonly ProductoCompra[],
  presupuesto: number
): PropuestaAbastecimiento {
  const disponibleInicial = dineroValido(presupuesto) ? presupuesto : 0;
  let disponible = disponibleInicial;
  const lineas: LineaPropuestaAbastecimiento[] = [];
  const omitidos: Array<{ producto_id: string; motivo: string }> = [];
  const ordenPrioridad: Record<PrioridadAbastecimiento, number> = { alta: 0, media: 1, baja: 2 };
  const candidatos = productos
    .filter((producto) => producto.activo && producto.stock_actual < producto.stock_minimo)
    .slice()
    .sort((a, b) => ordenPrioridad[a.prioridad] - ordenPrioridad[b.prioridad] || a.id_producto.localeCompare(b.id_producto));

  candidatos.forEach((producto) => {
    const costo = producto.precio_costo;
    if (!dineroValido(costo as number) || (costo as number) === 0) {
      omitidos.push({ producto_id: producto.id_producto, motivo: 'Falta costo vigente válido.' });
      return;
    }
    const paso = producto.permite_decimal ? producto.paso_venta : 1;
    if (!Number.isFinite(paso) || paso <= 0) {
      omitidos.push({ producto_id: producto.id_producto, motivo: 'El paso de compra no es válido.' });
      return;
    }
    const faltante = producto.stock_minimo - producto.stock_actual;
    const pasosNecesarios = Math.ceil((faltante - 1e-9) / paso);
    const pasosPosibles = Math.floor(disponible / ((costo as number) * paso));
    const pasos = Math.min(pasosNecesarios, pasosPosibles);
    if (pasos <= 0) {
      omitidos.push({ producto_id: producto.id_producto, motivo: 'Presupuesto insuficiente.' });
      return;
    }
    const cantidad = pasos * paso;
    const subtotal = Math.round(cantidad * (costo as number));
    disponible -= subtotal;
    lineas.push({
      producto_id: producto.id_producto,
      nombre_producto: producto.nombre,
      prioridad: producto.prioridad,
      cantidad_sugerida: cantidad,
      costo_unitario: costo as number,
      subtotal,
      stock_actual: producto.stock_actual,
      stock_objetivo: producto.stock_minimo,
    });
  });

  const total = lineas.reduce((suma, linea) => suma + linea.subtotal, 0);
  return {
    presupuesto: disponibleInicial,
    total_propuesto: total,
    saldo_sin_asignar: disponibleInicial - total,
    lineas,
    omitidos,
  };
}
