type JsonObject = Record<string, unknown>;

const CAMPOS_PRODUCTO = [
  'nombre',
  'categoria',
  'unidad_medida',
  'permite_decimal',
  'paso_venta',
  'precio_costo',
  'precio_venta',
  'stock_minimo',
  'prioridad',
  'activo',
  'imagen_url',
] as const;

function objeto(valor: unknown): JsonObject {
  return valor && typeof valor === 'object' && !Array.isArray(valor)
    ? valor as JsonObject
    : {};
}

function productoPermitido(valor: unknown): JsonObject {
  const entrada = objeto(valor);
  const salida: JsonObject = {};
  for (const campo of CAMPOS_PRODUCTO) {
    if (Object.prototype.hasOwnProperty.call(entrada, campo)) salida[campo] = entrada[campo];
  }
  return salida;
}

function lineasCompraPermitidas(valor: unknown) {
  if (!Array.isArray(valor)) return [];
  return valor.map((lineaCruda) => {
    const linea = objeto(lineaCruda);
    return {
      producto_id: String(linea.producto_id ?? ''),
      cantidad: Number(linea.cantidad),
      costo_unitario: Number(linea.costo_unitario),
    };
  });
}

/**
 * DTOs de frontera navegador -> servidor. Deliberadamente no copian campos
 * reservados (`action`, `token`, `actor`, `actor_id`, `responsable`, `rol`).
 * La identidad auditada siempre se agrega desde la sesión validada.
 */
export function dtoCompraAdmin(body: JsonObject) {
  return {
    fecha: String(body.fecha ?? ''),
    proveedor: String(body.proveedor ?? ''),
    observaciones: body.observaciones === undefined ? undefined : String(body.observaciones),
    idempotency_key: String(body.idempotency_key ?? ''),
    lineas: lineasCompraPermitidas(body.lineas),
  };
}

export function dtoGastoAdmin(body: JsonObject) {
  return {
    categoria: String(body.categoria ?? ''),
    descripcion: String(body.descripcion ?? ''),
    monto: Number(body.monto),
    observaciones: body.observaciones === undefined ? undefined : String(body.observaciones),
    idempotency_key: String(body.idempotency_key ?? ''),
  };
}

export function dtoCajaCompraAdmin(body: JsonObject) {
  return {
    saldo_cuenta: Number(body.saldo_cuenta),
    efectivo_disponible: Number(body.efectivo_disponible),
    pendientes_referencia: Number(body.pendientes_referencia),
    presupuesto_confirmado: Number(body.presupuesto_confirmado),
    observaciones: body.observaciones === undefined ? undefined : String(body.observaciones),
    idempotency_key: String(body.idempotency_key ?? ''),
  };
}

export function dtoAjusteStockAdmin(body: JsonObject) {
  return {
    producto_id: String(body.producto_id ?? ''),
    delta: Number(body.delta),
    motivo: String(body.motivo ?? ''),
    observaciones: body.observaciones === undefined ? undefined : String(body.observaciones),
    idempotency_key: String(body.idempotency_key ?? ''),
  };
}

export function dtoActualizacionProductoAdmin(body: JsonObject) {
  return {
    producto_id: String(body.producto_id ?? ''),
    cambios: productoPermitido(body.cambios),
    idempotency_key: String(body.idempotency_key ?? ''),
  };
}

export function dtoCreacionProductoAdmin(body: JsonObject) {
  return {
    producto_id: String(body.producto_id ?? ''),
    producto: productoPermitido(body.producto),
    idempotency_key: String(body.idempotency_key ?? ''),
  };
}

/** Agrega campos reservados después del DTO para impedir sobrescrituras. */
export function payloadAdminFase78(
  action: string,
  actor: string,
  token: string,
  body: JsonObject
) {
  return { ...body, responsable: actor, action, token };
}

export function solicitudModificaPrecios(body: JsonObject, creacion = false): boolean {
  const contenido = objeto(creacion ? body.producto : body.cambios);
  return Object.prototype.hasOwnProperty.call(contenido, 'precio_venta') ||
    Object.prototype.hasOwnProperty.call(contenido, 'precio_costo');
}
