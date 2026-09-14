export const MOTIVOS_AJUSTE_STOCK = [
  'recuento_fisico',
  'merma',
  'error_carga_inicial',
  'compra_abastecimiento',
  'devolucion',
  'ajuste_pedido_cancelado',
  'otro',
] as const;

export type MotivoAjusteStock = (typeof MOTIVOS_AJUSTE_STOCK)[number];

export interface AjusteStockAdmin {
  producto_id: string;
  stock_anterior: number;
  stock_nuevo: number;
  motivo: MotivoAjusteStock;
  responsable: string;
  observaciones?: string;
}

export type ResultadoAjusteStock =
  | { ok: false; errores: string[] }
  | {
      ok: true;
      movimiento: {
        tipo: 'ajuste';
        producto_id: string;
        cantidad: number;
        stock_anterior: number;
        stock_resultante: number;
        usuario: string;
        observaciones: string;
      };
    };

export function prepararAjusteStock(entrada: AjusteStockAdmin): ResultadoAjusteStock {
  const errores: string[] = [];
  const productoId = String(entrada.producto_id ?? '').trim();
  const responsable = String(entrada.responsable ?? '').trim();
  const observaciones = String(entrada.observaciones ?? '').trim();
  if (!/^PROD-[A-Za-z0-9-]{1,80}$/.test(productoId)) errores.push('El producto_id no es válido.');
  if (!Number.isFinite(entrada.stock_anterior) || entrada.stock_anterior < 0) errores.push('El stock anterior no es válido.');
  if (!Number.isFinite(entrada.stock_nuevo) || entrada.stock_nuevo < 0) errores.push('El stock nuevo no es válido.');
  if (!(MOTIVOS_AJUSTE_STOCK as readonly string[]).includes(entrada.motivo)) errores.push('El motivo no es válido.');
  if (!responsable) errores.push('Falta la persona responsable.');
  if (entrada.motivo === 'otro' && !observaciones) errores.push('El motivo Otro exige observaciones.');
  if (observaciones.length > 500) errores.push('Las observaciones superan 500 caracteres.');
  if (entrada.stock_anterior === entrada.stock_nuevo) errores.push('El ajuste no cambia el stock.');
  if (errores.length > 0) return { ok: false, errores };
  return {
    ok: true,
    movimiento: {
      tipo: 'ajuste',
      producto_id: productoId,
      cantidad: entrada.stock_nuevo - entrada.stock_anterior,
      stock_anterior: entrada.stock_anterior,
      stock_resultante: entrada.stock_nuevo,
      usuario: responsable,
      observaciones: observaciones || entrada.motivo,
    },
  };
}

export interface CambioProductoAdmin {
  nombre?: string;
  activo?: boolean;
  unidad_medida?: string;
  permite_decimal?: boolean;
  paso_venta?: number;
  precio_costo?: number;
  precio_venta?: number;
  stock_minimo?: number;
}

/** Valida edición; stock_actual queda fuera y solo se cambia mediante ajuste auditado. */
export function validarCambioProducto(cambio: CambioProductoAdmin): string[] {
  const errores: string[] = [];
  if ('nombre' in cambio && !String(cambio.nombre ?? '').trim()) errores.push('El nombre no puede quedar vacío.');
  if ('unidad_medida' in cambio && !['unidad', 'kg', 'litro', 'pack'].includes(String(cambio.unidad_medida))) {
    errores.push('La unidad de medida no es válida.');
  }
  if ('paso_venta' in cambio && (!Number.isFinite(cambio.paso_venta) || (cambio.paso_venta ?? 0) <= 0)) {
    errores.push('El paso de venta no es válido.');
  }
  if (cambio.permite_decimal === false && cambio.paso_venta !== undefined && cambio.paso_venta !== 1) {
    errores.push('Un producto entero debe usar paso 1.');
  }
  ['precio_costo', 'precio_venta', 'stock_minimo'].forEach((campo) => {
    const valor = cambio[campo as keyof CambioProductoAdmin];
    if (valor !== undefined && (!Number.isFinite(valor) || Number(valor) < 0)) errores.push(`${campo} no es válido.`);
  });
  return errores;
}
