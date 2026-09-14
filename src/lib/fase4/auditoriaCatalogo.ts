export interface ProductoAuditoriaCatalogo {
  id_producto: unknown;
  nombre: unknown;
  categoria: unknown;
  prioridad: unknown;
  unidad_medida: unknown;
  permite_decimal: unknown;
  paso_venta: unknown;
  precio_venta: unknown;
  stock_actual: unknown;
  stock_minimo: unknown;
  imagen_url: unknown;
}

export type TipoHallazgoCatalogo = 'ERROR' | 'ADVERTENCIA' | 'HUMAN_DECISION_REQUIRED';

export interface HallazgoCatalogo {
  tipo: TipoHallazgoCatalogo;
  codigo: string;
  producto_id?: string;
  detalle: string;
}

export interface ResultadoAuditoriaCatalogo {
  productos: number;
  errores: number;
  advertencias: number;
  decisiones_humanas: number;
  hallazgos: HallazgoCatalogo[];
}

function texto(valor: unknown): string {
  return String(valor ?? '').trim();
}

function numero(valor: unknown): number {
  if (typeof valor === 'string' && !valor.trim()) return Number.NaN;
  return Number(valor);
}

function normalizarNombre(valor: unknown): string {
  return texto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CL')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function esSi(valor: unknown): boolean {
  return normalizarNombre(valor) === 'si';
}

function agregar(
  hallazgos: HallazgoCatalogo[],
  tipo: TipoHallazgoCatalogo,
  codigo: string,
  detalle: string,
  productoId?: string
) {
  hallazgos.push({ tipo, codigo, detalle, ...(productoId ? { producto_id: productoId } : {}) });
}

export function auditarCatalogo(
  productos: readonly ProductoAuditoriaCatalogo[]
): ResultadoAuditoriaCatalogo {
  const hallazgos: HallazgoCatalogo[] = [];
  const ids = new Map<string, number>();
  const nombres = new Map<string, string[]>();

  productos.forEach((producto, indice) => {
    const id = texto(producto.id_producto);
    const etiqueta = id || `fila-${indice + 1}`;
    const nombre = texto(producto.nombre);
    const nombreNormalizado = normalizarNombre(nombre);
    const categoria = texto(producto.categoria);
    const unidad = texto(producto.unidad_medida);
    const decimal = normalizarNombre(producto.permite_decimal);
    const paso = numero(producto.paso_venta);
    const precio = numero(producto.precio_venta);
    const stock = numero(producto.stock_actual);
    const stockMinimo = numero(producto.stock_minimo);
    const imagen = texto(producto.imagen_url);

    ids.set(id, (ids.get(id) ?? 0) + 1);
    if (nombreNormalizado) {
      nombres.set(nombreNormalizado, [...(nombres.get(nombreNormalizado) ?? []), etiqueta]);
    }

    if (!/^PROD-[A-Za-z0-9-]{1,80}$/.test(id)) {
      agregar(hallazgos, 'ERROR', 'ID_INVALIDO', 'El id_producto no cumple el contrato.', etiqueta);
    }
    if (!nombre) agregar(hallazgos, 'ERROR', 'NOMBRE_VACIO', 'Falta nombre visible.', etiqueta);
    if (!categoria) {
      agregar(hallazgos, 'HUMAN_DECISION_REQUIRED', 'CATEGORIA_VACIA', 'Falta confirmar categoría.', etiqueta);
    }
    if (!texto(producto.prioridad)) {
      agregar(hallazgos, 'HUMAN_DECISION_REQUIRED', 'PRIORIDAD_VACIA', 'Falta confirmar prioridad.', etiqueta);
    }
    if (!unidad) {
      agregar(hallazgos, 'HUMAN_DECISION_REQUIRED', 'UNIDAD_VACIA', 'Falta confirmar unidad de venta.', etiqueta);
    }
    if (!['si', 'no'].includes(decimal)) {
      agregar(hallazgos, 'ERROR', 'DECIMAL_INVALIDO', 'permite_decimal debe ser SI o NO.', etiqueta);
    }
    if (!Number.isFinite(paso) || paso <= 0) {
      agregar(hallazgos, 'ERROR', 'PASO_INVALIDO', 'paso_venta debe ser mayor que cero.', etiqueta);
    } else if (!esSi(producto.permite_decimal) && paso !== 1) {
      agregar(hallazgos, 'ERROR', 'PASO_ENTERO_INVALIDO', 'Un producto entero debe usar paso_venta 1.', etiqueta);
    }
    if (!Number.isFinite(precio) || precio <= 0) {
      agregar(hallazgos, 'ERROR', 'PRECIO_INVALIDO', 'precio_venta debe ser mayor que cero.', etiqueta);
    }
    if (!Number.isFinite(stock) || stock < 0) {
      agregar(hallazgos, 'ERROR', 'STOCK_INVALIDO', 'stock_actual debe ser cero o positivo.', etiqueta);
    }
    if (!Number.isFinite(stockMinimo) || stockMinimo < 0) {
      agregar(hallazgos, 'ERROR', 'STOCK_MINIMO_INVALIDO', 'stock_minimo debe ser cero o positivo.', etiqueta);
    } else if (Number.isFinite(stock) && stock < stockMinimo) {
      agregar(hallazgos, 'ADVERTENCIA', 'BAJO_STOCK', 'stock_actual está bajo stock_minimo.', etiqueta);
    }
    if (!imagen) {
      agregar(hallazgos, 'HUMAN_DECISION_REQUIRED', 'IMAGEN_PENDIENTE', 'Falta imagen aprobada.', etiqueta);
    } else if (!imagen.startsWith('/images/')) {
      agregar(hallazgos, 'ADVERTENCIA', 'IMAGEN_NO_LOCAL', 'La imagen no usa la ruta local esperada.', etiqueta);
    }
  });

  ids.forEach((cantidad, id) => {
    if (id && cantidad > 1) {
      agregar(hallazgos, 'ERROR', 'ID_DUPLICADO', `El id aparece ${cantidad} veces.`, id);
    }
  });
  nombres.forEach((productosMismoNombre) => {
    if (productosMismoNombre.length > 1) {
      agregar(
        hallazgos,
        'HUMAN_DECISION_REQUIRED',
        'NOMBRE_DUPLICADO_NORMALIZADO',
        `Coinciden al normalizar: ${productosMismoNombre.join(', ')}.`
      );
    }
  });

  return {
    productos: productos.length,
    errores: hallazgos.filter((item) => item.tipo === 'ERROR').length,
    advertencias: hallazgos.filter((item) => item.tipo === 'ADVERTENCIA').length,
    decisiones_humanas: hallazgos.filter((item) => item.tipo === 'HUMAN_DECISION_REQUIRED').length,
    hallazgos,
  };
}
