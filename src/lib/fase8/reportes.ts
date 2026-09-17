/** Agregaciones puras para historiales y reportes de Fase 8. */

export interface LineaHistoricaVenta {
  fecha_hora: string;
  apertura_id: string;
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  subtotal: number;
  cancelada?: boolean;
}

export interface ProductoReporteStock {
  producto_id: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
}

export interface CompraHistoricaResumen {
  compra_id: string;
  fecha: string;
  total_compra: number;
  gastos_extra?: number;
}

export interface CambioCostoHistorico {
  producto_id: string;
  fecha: string;
  precio_costo: number;
}

export function productosMasVendidos(lineas: readonly LineaHistoricaVenta[]) {
  const agrupados = new Map<string, { producto_id: string; nombre_producto: string; cantidad: number; total: number }>();
  lineas.forEach((linea) => {
    if (linea.cancelada || !Number.isFinite(linea.cantidad) || linea.cantidad <= 0) return;
    const actual = agrupados.get(linea.producto_id) ?? {
      producto_id: linea.producto_id,
      nombre_producto: linea.nombre_producto,
      cantidad: 0,
      total: 0,
    };
    actual.cantidad += linea.cantidad;
    if (Number.isFinite(linea.subtotal) && linea.subtotal >= 0) actual.total += linea.subtotal;
    agrupados.set(linea.producto_id, actual);
  });
  return Array.from(agrupados.values()).sort(
    (a, b) => b.cantidad - a.cantidad || b.total - a.total || a.producto_id.localeCompare(b.producto_id)
  );
}

export function productosBajoStock(productos: readonly ProductoReporteStock[]) {
  return productos
    .filter((producto) =>
      producto.activo &&
      Number.isFinite(producto.stock_actual) &&
      Number.isFinite(producto.stock_minimo) &&
      producto.stock_actual < producto.stock_minimo
    )
    .map((producto) => ({ ...producto, faltante: producto.stock_minimo - producto.stock_actual }))
    .sort((a, b) => b.faltante - a.faltante || a.producto_id.localeCompare(b.producto_id));
}

export function resumirCompras(compras: readonly CompraHistoricaResumen[]) {
  const validas = compras.filter((compra) =>
    Number.isFinite(compra.total_compra) && compra.total_compra >= 0 &&
    (compra.gastos_extra === undefined || (Number.isFinite(compra.gastos_extra) && compra.gastos_extra >= 0))
  );
  const totalCompras = validas.reduce((total, compra) => total + compra.total_compra, 0);
  const gastosExtra = validas.reduce((total, compra) => total + (compra.gastos_extra ?? 0), 0);
  return {
    cantidad_compras: validas.length,
    total_compras: totalCompras,
    gastos_extra: gastosExtra,
    costo_total_abastecimiento: totalCompras + gastosExtra,
    registros_invalidos: compras.length - validas.length,
  };
}

export function evolucionCostos(cambios: readonly CambioCostoHistorico[], productoId: string) {
  return cambios
    .filter((cambio) =>
      cambio.producto_id === productoId &&
      /^\d{4}-\d{2}-\d{2}(?:[ T].*)?$/.test(cambio.fecha) &&
      Number.isFinite(cambio.precio_costo) && cambio.precio_costo >= 0
    )
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((cambio, indice, lista) => ({
      ...cambio,
      variacion: indice === 0 ? null : cambio.precio_costo - lista[indice - 1].precio_costo,
    }));
}

export function resumirGastosPorCategoria(
  gastos: readonly { categoria: string; monto: number; estado?: string }[]
) {
  const totales = new Map<string, number>();
  gastos.forEach((gasto) => {
    if (gasto.estado === 'cancelado' || !Number.isSafeInteger(gasto.monto) || gasto.monto <= 0) return;
    const categoria = String(gasto.categoria ?? '').trim().toLowerCase();
    if (!categoria) return;
    totales.set(categoria, (totales.get(categoria) ?? 0) + gasto.monto);
  });
  return Array.from(totales, ([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria));
}

export function resumirMovimientosStock(
  movimientos: readonly { tipo_movimiento: string; cantidad: number }[]
) {
  const resumen: Record<string, { tipo_movimiento: string; cantidad_neta: number; movimientos: number }> = {};
  movimientos.forEach((movimiento) => {
    const tipo = String(movimiento.tipo_movimiento ?? '').trim();
    if (!tipo || !Number.isFinite(movimiento.cantidad)) return;
    resumen[tipo] ??= { tipo_movimiento: tipo, cantidad_neta: 0, movimientos: 0 };
    resumen[tipo].cantidad_neta += movimiento.cantidad;
    resumen[tipo].movimientos += 1;
  });
  return Object.values(resumen).sort((a, b) => a.tipo_movimiento.localeCompare(b.tipo_movimiento));
}
