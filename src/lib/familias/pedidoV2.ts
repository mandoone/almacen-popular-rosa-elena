/** C1 paralelo y local: ninguna ruta V1 ni Apps Script importa este contrato. */
import { validarFamiliaProducto, type FamiliaProducto } from '../familiasProducto.ts';
import { subtotalVenta } from '../granel.ts';

export const COLUMNAS_DETALLE_PEDIDOS_V2_ADITIVAS = [
  'id_detalle_pedido', 'modelo_linea', 'familia_id', 'cantidad_solicitada',
  'unidad_solicitada', 'presentacion_publica_snapshot', 'version_oferta_snapshot',
  'oferta_snapshot_json',
] as const;
export const COLUMNAS_ASIGNACIONES_PEDIDO = [
  'asignacion_id', 'id_detalle_pedido', 'producto_id', 'cantidad_asignada',
  'cantidad_stock', 'unidad_stock_snapshot', 'gramos_unidad_stock_snapshot',
  'nombre_sku_snapshot', 'marca_snapshot', 'presentacion_snapshot',
  'operacion_id', 'actor', 'creado_en',
] as const;
export type ModeloLineaPedido = 'SKU_V1' | 'FAMILIA_V2';

export interface SolicitudFamiliaV2 {
  modelo_linea: 'FAMILIA_V2';
  familia_id: string;
  cantidad_solicitada: number;
  unidad_solicitada: string;
  version_oferta: number;
}
export interface DetallePedidoFamiliaV2 {
  id_pedido: string;
  id_detalle_pedido: string;
  modelo_linea: 'FAMILIA_V2';
  id_producto: '';
  cantidad: ''; // No hay base nativa hasta asignar SKU físicos.
  familia_id: string;
  cantidad_solicitada: number;
  unidad_solicitada: string;
  nombre_producto: string;
  precio_unitario: number;
  subtotal: number;
  presentacion_publica_snapshot: string;
  version_oferta_snapshot: number;
  oferta_snapshot_json: string;
}
export interface AsignacionPedido {
  asignacion_id: string;
  id_detalle_pedido: string;
  producto_id: string;
  cantidad_asignada: number; // Misma unidad comercial de solicitud: g o unidad.
  cantidad_stock: number; // Base nativa física del SKU.
  unidad_stock_snapshot: string;
  gramos_unidad_stock_snapshot?: number;
  nombre_sku_snapshot: string;
  marca_snapshot: string;
  presentacion_snapshot: string;
  operacion_id: string;
  actor: string;
  creado_en: string;
}
export class ErrorPedidoFamilia extends Error {
  readonly status: number;
  readonly codigo: string;
  constructor(codigo: string, status = 400) { super(codigo); this.name = 'ErrorPedidoFamilia'; this.codigo = codigo; this.status = status; }
}
export function exigirV2(condicion: unknown, codigo: string, status = 400): asserts condicion {
  if (!condicion) throw new ErrorPedidoFamilia(codigo, status);
}
export function idInternoV2(valor: unknown): valor is string { return typeof valor === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(valor); }

/** Compatibilidad explícita: solo vacío histórico = V1; nunca inferir desde prefijos. */
export function modeloLineaPedido(fila: Record<string, unknown>): ModeloLineaPedido {
  const modelo = fila.modelo_linea;
  if (modelo === undefined || modelo === null || modelo === '' || modelo === 'SKU_V1') {
    exigirV2(typeof fila.id_producto === 'string' && !!fila.id_producto && !fila.id_producto.startsWith('FAM-'), 'SKU_V1_ID_FISICO_REQUERIDO');
    exigirV2(!fila.familia_id, 'LINEA_AMBIGUA');
    return 'SKU_V1';
  }
  exigirV2(modelo === 'FAMILIA_V2', 'MODELO_LINEA_DESCONOCIDO');
  exigirV2(!fila.id_producto && !fila.cantidad, 'V2_SIN_SKU_VIRTUAL');
  return 'FAMILIA_V2';
}

export function validarCantidadFamiliaV2(f: FamiliaProducto, cantidad: number) {
  const escala = f.modo_venta === 'GRANEL' || f.permite_decimal === 'NO' ? 1 : 1000;
  const n = cantidad * escala, paso = f.paso_venta * escala;
  exigirV2(typeof cantidad === 'number' && Number.isFinite(cantidad) && cantidad > 0 && Number.isSafeInteger(Math.round(n)) && Math.abs(n - Math.round(n)) < 1e-7, 'CANTIDAD_V2_INVALIDA');
  exigirV2(Number.isSafeInteger(Math.round(paso)) && Math.abs(paso - Math.round(paso)) < 1e-7 && paso > 0 && Math.round(n) % Math.round(paso) === 0, 'PASO_V2_INVALIDO');
  return Math.round(n);
}

/** Snapshot comercial autoritativo: precios/campos del navegador no forman parte del input. */
export function crearDetallePedidoFamiliaV2(
  id_pedido: string, id_detalle_pedido: string, solicitud: SolicitudFamiliaV2, familia: FamiliaProducto,
): DetallePedidoFamiliaV2 {
  exigirV2(idInternoV2(id_pedido) && idInternoV2(id_detalle_pedido), 'ID_DETALLE_V2_INVALIDO');
  exigirV2(solicitud.modelo_linea === 'FAMILIA_V2', 'MODELO_LINEA_DESCONOCIDO');
  exigirV2(validarFamiliaProducto(familia).valido && familia.activo === 'SI' && familia.precio_venta > 0, 'FAMILIA_NO_VENDIBLE', 409);
  exigirV2(solicitud.familia_id === familia.familia_id && solicitud.version_oferta === familia.version_oferta, 'OFERTA_DESACTUALIZADA', 409);
  exigirV2(solicitud.unidad_solicitada === familia.unidad_venta, 'UNIDAD_SOLICITADA_INVALIDA');
  validarCantidadFamiliaV2(familia, solicitud.cantidad_solicitada);
  const numerador = familia.precio_venta * solicitud.cantidad_solicitada;
  exigirV2(Number.isFinite(numerador) && numerador <= Number.MAX_SAFE_INTEGER, 'SUBTOTAL_FUERA_RANGO');
  const subtotal = subtotalVenta(familia, familia.precio_venta, solicitud.cantidad_solicitada);
  exigirV2(Number.isSafeInteger(subtotal) && subtotal >= 0, 'SUBTOTAL_FUERA_RANGO');
  return { id_pedido, id_detalle_pedido, modelo_linea: 'FAMILIA_V2', id_producto: '', cantidad: '', familia_id: familia.familia_id,
    cantidad_solicitada: solicitud.cantidad_solicitada, unidad_solicitada: solicitud.unidad_solicitada,
    nombre_producto: familia.nombre_publico, precio_unitario: familia.precio_venta, subtotal,
    presentacion_publica_snapshot: familia.presentacion_publica, version_oferta_snapshot: familia.version_oferta,
    oferta_snapshot_json: JSON.stringify(familia) };
}

export function leerOfertaSnapshotV2(linea: DetallePedidoFamiliaV2): FamiliaProducto {
  exigirV2(modeloLineaPedido(linea as unknown as Record<string, unknown>) === 'FAMILIA_V2', 'LINEA_NO_V2');
  let f: FamiliaProducto;
  try { f = JSON.parse(linea.oferta_snapshot_json); } catch { throw new ErrorPedidoFamilia('SNAPSHOT_OFERTA_INVALIDO'); }
  exigirV2(validarFamiliaProducto(f).valido && f.familia_id === linea.familia_id && f.version_oferta === linea.version_oferta_snapshot
    && f.nombre_publico === linea.nombre_producto && f.precio_venta === linea.precio_unitario && f.presentacion_publica === linea.presentacion_publica_snapshot, 'SNAPSHOT_OFERTA_INCOHERENTE');
  const esperado = crearDetallePedidoFamiliaV2(linea.id_pedido, linea.id_detalle_pedido, { modelo_linea: 'FAMILIA_V2', familia_id: f.familia_id, cantidad_solicitada: linea.cantidad_solicitada, unidad_solicitada: linea.unidad_solicitada, version_oferta: f.version_oferta }, f);
  exigirV2(esperado.subtotal === linea.subtotal, 'SUBTOTAL_SNAPSHOT_INCOHERENTE');
  return f;
}

export function validarContratoAsignacionV2(a: AsignacionPedido): void {
  exigirV2(idInternoV2(a.asignacion_id) && idInternoV2(a.id_detalle_pedido) && idInternoV2(a.operacion_id), 'ID_ASIGNACION_INVALIDO');
  exigirV2(/^PROD-[A-Za-z0-9-]{1,80}$/.test(a.producto_id), 'SKU_FISICO_REQUERIDO');
  exigirV2(Number.isFinite(a.cantidad_asignada) && a.cantidad_asignada > 0 && Number.isFinite(a.cantidad_stock) && a.cantidad_stock > 0, 'CANTIDAD_ASIGNACION_INVALIDA');
  exigirV2(typeof a.unidad_stock_snapshot === 'string' && !!a.unidad_stock_snapshot && !!a.nombre_sku_snapshot && !!a.presentacion_snapshot, 'SNAPSHOT_FISICO_INCOMPLETO');
  exigirV2(typeof a.actor === 'string' && /^[a-z0-9][a-z0-9._@-]{0,99}$/.test(a.actor) && typeof a.creado_en === 'string' && Number.isFinite(Date.parse(a.creado_en)), 'AUDITORIA_ASIGNACION_INVALIDA');
  if (a.gramos_unidad_stock_snapshot !== undefined) exigirV2([100, 250, 1000].includes(a.gramos_unidad_stock_snapshot), 'BASE_GRANEL_INVALIDA');
}
