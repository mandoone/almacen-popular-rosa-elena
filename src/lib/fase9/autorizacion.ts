import type { Capacidad } from './roles.ts';

export function rutaEsODescendiente(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function capacidadParaCambioPedido(estadoSolicitado: unknown): Capacidad {
  return String(estadoSolicitado ?? '').trim().toLowerCase() === 'entregado'
    ? 'pedidos:entregar'
    : 'pedidos:confirmar';
}

/** Capacidad exigida por el backend para una ruta autenticada. */
export function capacidadParaRuta(pathname: string, metodo = 'GET'): Capacidad | null {
  const method = metodo.toUpperCase();

  if (rutaEsODescendiente(pathname, '/api/admin/auth')) return null;
  if (pathname.startsWith('/api/admin/pedidos/')) {
    if (method === 'GET') return 'pedidos:ver';
    if (method === 'POST') return 'pedidos:cancelar';
    // PATCH se autoriza por transición dentro del handler. Aquí solo se exige
    // acceso al pedido para no bloquear futuros perfiles que solo entreguen.
    if (method === 'PATCH') return 'pedidos:ver';
    return 'configuracion:gestionar';
  }
  if (pathname === '/api/admin/pedidos') {
    return method === 'GET' ? 'pedidos:ver' : 'configuracion:gestionar';
  }
  if (rutaEsODescendiente(pathname, '/api/admin/ventas')) return 'venta_presencial:registrar';
  if (rutaEsODescendiente(pathname, '/api/admin/aperturas')) {
    return method === 'GET' ? 'aperturas:ver' : 'configuracion:gestionar';
  }
  if (rutaEsODescendiente(pathname, '/api/admin/stock')) return 'stock:ajustar';
  if (pathname === '/api/admin/productos') {
    return method === 'GET' ? 'stock:ver' : 'productos:gestionar';
  }
  if (rutaEsODescendiente(pathname, '/api/admin/compras')) return 'compras:gestionar';
  if (rutaEsODescendiente(pathname, '/api/admin/gastos')) return 'gastos:gestionar';
  if (rutaEsODescendiente(pathname, '/api/admin/abastecimiento')) return 'abastecimiento:gestionar';
  if (rutaEsODescendiente(pathname, '/api/admin/caja-compra')) return 'caja:gestionar';
  if (rutaEsODescendiente(pathname, '/api/admin/reportes')) return 'reportes:ver';

  if (pathname === '/admin' || rutaEsODescendiente(pathname, '/admin/ventas')) return 'pedidos:ver';
  if (rutaEsODescendiente(pathname, '/admin/vendedor')) return 'venta_presencial:registrar';
  if (rutaEsODescendiente(pathname, '/admin/compras')) return 'compras:gestionar';
  if (rutaEsODescendiente(pathname, '/admin/gastos')) return 'gastos:gestionar';
  if (rutaEsODescendiente(pathname, '/admin/abastecimiento')) return 'abastecimiento:gestionar';
  if (rutaEsODescendiente(pathname, '/admin/caja')) return 'caja:gestionar';
  if (rutaEsODescendiente(pathname, '/admin/historiales')) return 'reportes:ver';
  if (rutaEsODescendiente(pathname, '/admin/productos')) return 'stock:ver';

  // Cierre seguro: cualquier nueva superficie admin requiere administración
  // hasta que se le asigne una capacidad explícita.
  return 'configuracion:gestionar';
}
