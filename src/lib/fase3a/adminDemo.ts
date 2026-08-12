/**
 * Datos efimeros para revisar el panel admin sin llamar a Apps Script.
 *
 * El modo demo solo se habilita en desarrollo local con `/admin?demo=1`.
 * Cada carga recibe copias nuevas: las acciones viven solo en memoria y se
 * reinician al refrescar la pagina.
 */

export interface PedidoAdminDemo {
  id_pedido: string;
  fecha_hora: string;
  nombre_cliente: string;
  telefono: string;
  total: number;
  estado_pedido: string;
  estado_pago: string;
  forma_pago: string;
}

export interface LineaAdminDemo {
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  unidad_medida?: string;
}

const PEDIDOS_DEMO: readonly PedidoAdminDemo[] = [
  ['recibido', 'Rosa Recibido'],
  ['pendiente', 'Pedro Pendiente'],
  ['listo', 'Laura Listo'],
  ['entregado', 'Elena Entregado'],
  ['cancelado', 'Camila Cancelado'],
  ['revision_manual', 'Daniel Estado desconocido'],
].map(([estado, nombre], indice) => ({
  id_pedido: `DEMO-${String(indice + 1).padStart(3, '0')}`,
  fecha_hora: `2026-08-11T${String(10 + indice).padStart(2, '0')}:00:00-04:00`,
  nombre_cliente: nombre,
  telefono: `+5690000000${indice + 1}`,
  total: 2500 + indice * 500,
  estado_pedido: estado,
  estado_pago: indice === 3 ? 'pagado_efectivo' : 'pendiente',
  forma_pago: indice === 3 ? 'efectivo' : 'transferencia',
}));

const DETALLE_DEMO: readonly LineaAdminDemo[] = [
  {
    nombre_producto: 'Producto de demostracion',
    cantidad: 2,
    precio_unitario: 1250,
    subtotal: 2500,
    unidad_medida: 'unidad',
  },
];

export function esModoDemoAdmin(
  entorno: string | undefined,
  pathname: string,
  parametroDemo: string | null
): boolean {
  return (
    entorno === 'development' &&
    pathname === '/admin' &&
    parametroDemo === '1'
  );
}

export function crearPedidosAdminDemo(): PedidoAdminDemo[] {
  return PEDIDOS_DEMO.map((pedido) => ({ ...pedido }));
}

export function obtenerDetalleAdminDemo(idPedido: string): LineaAdminDemo[] {
  if (!PEDIDOS_DEMO.some((pedido) => pedido.id_pedido === idPedido)) return [];
  return DETALLE_DEMO.map((linea) => ({ ...linea }));
}
