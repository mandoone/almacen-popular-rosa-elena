/** Fixtures inventados y hojas EN MEMORIA; este archivo no usa conectores ni APIs. */
import { crearFixturesFamilias } from './familias-producto.mjs';
import { crearDetallePedidoFamiliaV2 } from '../../src/lib/familias/pedidoV2.ts';
import { crearEstadoSheetsMemoriaV2, AlmacenSheetsMemoriaV2 } from '../../src/lib/familias/almacenSheetsMemoriaV2.ts';

export const opcionesC4 = { ahora: () => '2026-10-07T15:00:00.000Z' };
export function escenarioC4({ mixto = false, base, apertura = false } = {}) {
  const f = crearFixturesFamilias();
  const familia = base ? f.arroz : f.economico;
  const productos = base ? f.granel.map((s, i) => ({ ...s, gramos_unidad_stock: i ? 1000 : base, unidad_medida: 'unidad', stock_actual: 2 })) : f.cloros;
  const linea = crearDetallePedidoFamiliaV2('PED-C4', 'DPE-C4', { modelo_linea: 'FAMILIA_V2', familia_id: familia.familia_id,
    cantidad_solicitada: base ? 150 : 6, unidad_solicitada: base ? 'g' : 'unidad', version_oferta: 1 }, familia);
  const contexto = apertura ? { apertura_id: 'APE-20261010', sku_habilitados: productos.map(s => s.id_producto) } : {};
  if (apertura) productos.forEach(s => { s.tipo_disponibilidad = 'POR_APERTURA'; });
  const detalles = [linea];
  if (mixto) {
    productos.push(f.legado);
    detalles.unshift({ id_pedido: 'PED-C4', id_detalle_pedido: 'DPE-LEGADO', id_producto: f.legado.id_producto,
      cantidad: 2, nombre_producto: f.legado.nombre, precio_unitario: 500, subtotal: 1000, unidad_medida: 'unidad' });
  }
  const estado = crearEstadoSheetsMemoriaV2({
    PEDIDOS: [{ id_pedido: 'PED-C4', estado: 'recibido', contexto_apertura_snapshot: contexto }],
    DETALLE_PEDIDOS: detalles, PRODUCTOS: productos, FAMILIAS_PRODUCTO: [familia],
    APERTURA_PRODUCTOS: apertura ? productos.map(s => ({ apertura_id: contexto.apertura_id, producto_id: s.id_producto, habilitado: 'SI' })) : [],
  });
  const input = { id_pedido: 'PED-C4', actor: 'qa-local', idempotency_key: 'confirmar_c4_12345', estado_esperado: 'recibido',
    apertura_id_esperada: contexto.apertura_id ?? '',
    asignaciones: [{ id_detalle_pedido: linea.id_detalle_pedido, selecciones: productos.slice(0, 2).map((s, i) => ({ producto_id: s.id_producto, cantidad_asignada: base ? 75 : i ? 2 : 4 })) }] };
  return { ...f, familia, estado, input, almacen: new AlmacenSheetsMemoriaV2(estado), nuevoProceso: () => new AlmacenSheetsMemoriaV2(estado) };
}
export const cancelarInputC4 = c => ({ ...c.input, idempotency_key: 'cancelar_c4_12345', estado_esperado: 'pendiente', asignaciones: [] });
export const reasignarInputC4 = c => ({ ...c.input, idempotency_key: 'reasignar_c4_12345', estado_esperado: 'pendiente',
  asignaciones: [{ id_detalle_pedido: 'DPE-C4', selecciones: c.estado.hojas.PRODUCTOS.slice(0, 2).map((s, i) => ({ producto_id: s.id_producto, cantidad_asignada: i ? 5 : 1 })) }] });
