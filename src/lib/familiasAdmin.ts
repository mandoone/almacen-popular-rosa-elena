import { COLUMNAS_FAMILIAS_PRODUCTO, COLUMNAS_IDENTIDAD_SKU_FAMILIA } from './familiasProducto.ts';

/** Frontera nueva: rechazo cerrado; no permite precios/stock ni actor del navegador. */
export function dtoIdentidadSkuAdmin(body: Record<string, unknown>) {
  const cambios = body.cambios;
  if (!cambios || typeof cambios !== 'object' || Array.isArray(cambios) ||
      Object.keys(cambios).some(k => !COLUMNAS_IDENTIDAD_SKU_FAMILIA.includes(k as typeof COLUMNAS_IDENTIDAD_SKU_FAMILIA[number]))) throw new Error('Solo se permite identidad física.');
  return { producto_id: String(body.producto_id ?? ''), cambios: { ...cambios } as Record<string, unknown>, idempotency_key: String(body.idempotency_key ?? '') };
}

export function dtoFamiliaAdmin(body: Record<string, unknown>) {
  const familia = body.familia;
  const campos = COLUMNAS_FAMILIAS_PRODUCTO.filter(k => k !== 'version_oferta' && k !== 'actualizado_en');
  if (!familia || typeof familia !== 'object' || Array.isArray(familia) || Object.keys(familia).some(k => !campos.includes(k as typeof campos[number]))) throw new Error('Campo de oferta no editable.');
  return { familia: { ...familia } as Record<string, unknown>, version_esperada: body.version_esperada as number | undefined, idempotency_key: String(body.idempotency_key ?? '') };
}
