export interface ProductoAuditoriaCatalogo {
  id_producto: unknown;
  activo?: unknown;
  nombre: unknown;
  categoria: unknown;
  prioridad: unknown;
  unidad_medida: unknown;
  permite_decimal: unknown;
  paso_venta: unknown;
  precio_costo?: unknown;
  margen_pct?: unknown;
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
  productos_afectados?: string[];
  detalle: string;
}

export type EstadoRevisionProducto =
  | 'APROBABLE_AUTOMATICAMENTE'
  | 'REQUIERE_DECISION'
  | 'ERROR';

export interface EstadoProductoAuditoria {
  id_producto: string;
  estado: EstadoRevisionProducto;
}

export interface OpcionesAuditoriaCatalogo {
  /** Activa campos internos que listarProductos no publica. */
  auditoria_completa?: boolean;
  categorias_conocidas?: readonly string[];
  rutas_imagen_disponibles?: readonly string[];
}

export interface ResultadoAuditoriaCatalogo {
  productos: number;
  errores: number;
  advertencias: number;
  decisiones_humanas: number;
  hallazgos: HallazgoCatalogo[];
  estados_productos: EstadoProductoAuditoria[];
}

export interface ResumenHallazgoCatalogo {
  codigo: string;
  tipo: TipoHallazgoCatalogo;
  cantidad: number;
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

function agregarGrupo(
  hallazgos: HallazgoCatalogo[],
  tipo: TipoHallazgoCatalogo,
  codigo: string,
  detalle: string,
  productosAfectados: string[]
) {
  hallazgos.push({ tipo, codigo, detalle, productos_afectados: productosAfectados });
}

export function resumirHallazgosCatalogo(
  hallazgos: readonly HallazgoCatalogo[]
): ResumenHallazgoCatalogo[] {
  const grupos = new Map<string, ResumenHallazgoCatalogo>();
  for (const hallazgo of hallazgos) {
    const clave = `${hallazgo.tipo}:${hallazgo.codigo}`;
    const existente = grupos.get(clave);
    const cantidad = hallazgo.productos_afectados?.length ?? 1;
    if (existente) existente.cantidad += cantidad;
    else grupos.set(clave, { codigo: hallazgo.codigo, tipo: hallazgo.tipo, cantidad });
  }
  return [...grupos.values()].sort((a, b) =>
    a.tipo.localeCompare(b.tipo) || a.codigo.localeCompare(b.codigo)
  );
}

export function auditarCatalogo(
  productos: readonly ProductoAuditoriaCatalogo[],
  opciones: OpcionesAuditoriaCatalogo = {}
): ResultadoAuditoriaCatalogo {
  const hallazgos: HallazgoCatalogo[] = [];
  const ids = new Map<string, number>();
  const nombres = new Map<string, { ids: string[]; originales: Set<string> }>();
  const nombresExactos = new Map<string, string[]>();
  const imagenes = new Map<string, string[]>();
  const idsCatalogo: string[] = [];
  const costosPendientes: string[] = [];
  const minimosPendientes: string[] = [];
  const imagenesPendientes: string[] = [];
  const prioridades: string[] = [];
  const stocks: number[] = [];
  const categoriasConocidas = new Set(
    (opciones.categorias_conocidas ?? []).map(normalizarNombre)
  );
  const rutasDisponibles = opciones.rutas_imagen_disponibles
    ? new Set(opciones.rutas_imagen_disponibles.map(texto))
    : null;

  productos.forEach((producto, indice) => {
    const id = texto(producto.id_producto);
    const etiqueta = id || `fila-${indice + 1}`;
    const nombre = texto(producto.nombre);
    const nombreNormalizado = normalizarNombre(nombre);
    const categoria = texto(producto.categoria);
    const activo = normalizarNombre(producto.activo);
    const prioridad = normalizarNombre(producto.prioridad);
    const unidad = texto(producto.unidad_medida);
    const decimal = normalizarNombre(producto.permite_decimal);
    const paso = numero(producto.paso_venta);
    const costoTexto = texto(producto.precio_costo);
    const costo = numero(producto.precio_costo);
    const margenTexto = texto(producto.margen_pct);
    const margen = numero(producto.margen_pct);
    const precio = numero(producto.precio_venta);
    const stock = numero(producto.stock_actual);
    const stockMinimo = numero(producto.stock_minimo);
    const imagen = texto(producto.imagen_url);

    idsCatalogo.push(etiqueta);
    prioridades.push(prioridad);
    if (Number.isFinite(stock)) stocks.push(stock);

    ids.set(id, (ids.get(id) ?? 0) + 1);
    if (nombreNormalizado) {
      const grupo = nombres.get(nombreNormalizado) ?? { ids: [], originales: new Set<string>() };
      grupo.ids.push(etiqueta);
      grupo.originales.add(nombre);
      nombres.set(nombreNormalizado, grupo);
      nombresExactos.set(nombre, [...(nombresExactos.get(nombre) ?? []), etiqueta]);
    }

    if (!/^PROD-[A-Za-z0-9-]{1,80}$/.test(id)) {
      agregar(hallazgos, 'ERROR', 'ID_INVALIDO', 'El id_producto no cumple el contrato.', etiqueta);
    }
    if (!nombre) agregar(hallazgos, 'ERROR', 'NOMBRE_VACIO', 'Falta nombre visible.', etiqueta);
    if (producto.activo !== undefined && !['si', 'no'].includes(activo)) {
      agregar(hallazgos, 'ERROR', 'ACTIVO_INVALIDO', 'activo debe ser SI o NO.', etiqueta);
    }
    if (!categoria) {
      agregar(hallazgos, 'HUMAN_DECISION_REQUIRED', 'CATEGORIA_VACIA', 'Falta confirmar categoría.', etiqueta);
    } else if (categoriasConocidas.size > 0 && !categoriasConocidas.has(normalizarNombre(categoria))) {
      agregar(hallazgos, 'HUMAN_DECISION_REQUIRED', 'CATEGORIA_NO_CONFIRMADA', 'La categoría no está en el vocabulario confirmado.', etiqueta);
    }
    if (!prioridad) {
      agregar(hallazgos, 'HUMAN_DECISION_REQUIRED', 'PRIORIDAD_VACIA', 'Falta confirmar prioridad.', etiqueta);
    } else if (!['alta', 'media', 'baja'].includes(prioridad)) {
      agregar(hallazgos, 'ERROR', 'PRIORIDAD_INVALIDA', 'prioridad debe ser alta, media o baja.', etiqueta);
    }
    if (!unidad) {
      agregar(hallazgos, 'HUMAN_DECISION_REQUIRED', 'UNIDAD_VACIA', 'Falta confirmar unidad de venta.', etiqueta);
    } else if (!['unidad', 'kg', 'litro', 'pack'].includes(normalizarNombre(unidad))) {
      agregar(hallazgos, 'ERROR', 'UNIDAD_INVALIDA', 'unidad_medida no pertenece al vocabulario técnico.', etiqueta);
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
    if (costoTexto && (!Number.isFinite(costo) || costo < 0)) {
      agregar(hallazgos, 'ERROR', 'COSTO_INVALIDO', 'precio_costo debe ser cero o positivo.', etiqueta);
    } else if (opciones.auditoria_completa && !costoTexto) {
      costosPendientes.push(etiqueta);
    } else if (costoTexto && Number.isFinite(precio) && costo > precio) {
      agregar(hallazgos, 'ADVERTENCIA', 'COSTO_SUPERA_VENTA', 'precio_costo supera precio_venta.', etiqueta);
    }
    if (margenTexto && (!Number.isFinite(margen) || margen < 0)) {
      agregar(hallazgos, 'ERROR', 'MARGEN_INVALIDO', 'margen_pct debe ser cero o positivo.', etiqueta);
    }
    if (!Number.isFinite(stock) || stock < 0) {
      agregar(hallazgos, 'ERROR', 'STOCK_INVALIDO', 'stock_actual debe ser cero o positivo.', etiqueta);
    }
    if (!Number.isFinite(stockMinimo) || stockMinimo < 0) {
      agregar(hallazgos, 'ERROR', 'STOCK_MINIMO_INVALIDO', 'stock_minimo debe ser cero o positivo.', etiqueta);
    } else if (Number.isFinite(stock) && stock < stockMinimo) {
      agregar(hallazgos, 'ADVERTENCIA', 'BAJO_STOCK', 'stock_actual está bajo stock_minimo.', etiqueta);
    } else if (opciones.auditoria_completa && stockMinimo === 0) {
      minimosPendientes.push(etiqueta);
    }
    if (!imagen) {
      imagenesPendientes.push(etiqueta);
    } else if (!imagen.startsWith('/images/')) {
      agregar(hallazgos, 'ADVERTENCIA', 'IMAGEN_NO_LOCAL', 'La imagen no usa la ruta local esperada.', etiqueta);
    } else {
      imagenes.set(imagen, [...(imagenes.get(imagen) ?? []), etiqueta]);
      if (rutasDisponibles && !rutasDisponibles.has(imagen)) {
        agregar(hallazgos, 'ERROR', 'IMAGEN_INEXISTENTE', 'La ruta configurada no existe en los assets auditados.', etiqueta);
      }
    }
  });

  if (costosPendientes.length) {
    agregarGrupo(hallazgos, 'HUMAN_DECISION_REQUIRED', 'COSTOS_PENDIENTES', 'Falta precio_costo para abastecimiento.', costosPendientes);
  }
  if (minimosPendientes.length) {
    agregarGrupo(hallazgos, 'HUMAN_DECISION_REQUIRED', 'STOCK_MINIMO_PENDIENTE', 'stock_minimo sigue en cero y requiere criterio operativo.', minimosPendientes);
  }
  if (imagenesPendientes.length) {
    agregarGrupo(hallazgos, 'HUMAN_DECISION_REQUIRED', 'IMAGENES_PENDIENTES', 'Faltan imágenes aprobadas.', imagenesPendientes);
  }

  ids.forEach((cantidad, id) => {
    if (id && cantidad > 1) {
      agregar(hallazgos, 'ERROR', 'ID_DUPLICADO', `El id aparece ${cantidad} veces.`, id);
    }
  });
  nombresExactos.forEach((productosMismoNombre) => {
    if (productosMismoNombre.length > 1) {
      agregarGrupo(
        hallazgos,
        'HUMAN_DECISION_REQUIRED',
        'NOMBRE_DUPLICADO_EXACTO',
        'El mismo nombre visible aparece en más de un producto.',
        productosMismoNombre
      );
    }
  });
  nombres.forEach((grupo) => {
    if (grupo.ids.length > 1 && grupo.originales.size > 1) {
      agregarGrupo(
        hallazgos,
        'HUMAN_DECISION_REQUIRED',
        'NOMBRE_DUPLICADO_NORMALIZADO',
        `Coinciden al normalizar: ${grupo.ids.join(', ')}.`,
        grupo.ids
      );
    }
  });
  imagenes.forEach((productosMismaImagen, imagen) => {
    if (productosMismaImagen.length > 1) {
      agregarGrupo(
        hallazgos,
        'HUMAN_DECISION_REQUIRED',
        'IMAGEN_COMPARTIDA',
        `La ruta ${imagen} está asociada a más de un producto.`,
        productosMismaImagen
      );
    }
  });

  if (opciones.auditoria_completa && idsCatalogo.length > 1) {
    const prioridadesDistintas = new Set(prioridades.filter(Boolean));
    if (prioridadesDistintas.size === 1) {
      agregarGrupo(hallazgos, 'ADVERTENCIA', 'PRIORIDAD_UNIFORME', 'Todos los productos usan la misma prioridad.', idsCatalogo);
    }
    const frecuenciaStocks = new Map<number, number>();
    for (const stock of stocks) frecuenciaStocks.set(stock, (frecuenciaStocks.get(stock) ?? 0) + 1);
    const maxFrecuencia = Math.max(0, ...frecuenciaStocks.values());
    if (maxFrecuencia / idsCatalogo.length >= 0.8) {
      agregarGrupo(hallazgos, 'ADVERTENCIA', 'STOCK_UNIFORME_SOSPECHOSO', 'Al menos 80% del catálogo comparte exactamente el mismo stock.', idsCatalogo);
    }
  }

  const estadoPorId = new Map<string, EstadoRevisionProducto>(
    idsCatalogo.map((id) => [id, 'APROBABLE_AUTOMATICAMENTE'])
  );
  for (const hallazgo of hallazgos) {
    const afectados = hallazgo.productos_afectados ?? (hallazgo.producto_id ? [hallazgo.producto_id] : []);
    for (const id of afectados) {
      const actual = estadoPorId.get(id);
      if (hallazgo.tipo === 'ERROR') estadoPorId.set(id, 'ERROR');
      else if (hallazgo.tipo === 'HUMAN_DECISION_REQUIRED' && actual !== 'ERROR') {
        estadoPorId.set(id, 'REQUIERE_DECISION');
      }
    }
  }

  return {
    productos: productos.length,
    errores: hallazgos.filter((item) => item.tipo === 'ERROR').length,
    advertencias: hallazgos.filter((item) => item.tipo === 'ADVERTENCIA').length,
    decisiones_humanas: hallazgos.filter((item) => item.tipo === 'HUMAN_DECISION_REQUIRED').length,
    hallazgos,
    estados_productos: [...estadoPorId].map(([id_producto, estado]) => ({ id_producto, estado })),
  };
}
