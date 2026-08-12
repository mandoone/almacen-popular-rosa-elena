'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ETIQUETA_ESTADO,
  esEstadoPedido,
  transicionesPosibles,
  type EstadoPedido,
} from '@/lib/fase3a/estados';

// 'recibido' aún NO lo emite el backend (Apps Script crea los pedidos en
// 'pendiente'), pero se declara desde ya para que el panel no se rompa el día que
// la migración de FASE 3A lo empiece a devolver.
// Ver docs/fase-3a/DIAGNOSTICO_ACTUAL.md (hallazgo 11).
type Filtro = 'todos' | EstadoPedido;

interface Pedido {
  id_pedido: string;
  fecha_hora: string;
  nombre_cliente: string;
  telefono: string;
  total: number;
  estado_pedido: string;
  estado_pago: string;
  forma_pago: string;
}

interface LineaDetalle {
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  unidad_medida?: string;
}

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function formatPrecio(n: number) {
  return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatFecha(valor: string) {
  const d = new Date(valor);
  if (isNaN(d.getTime())) return valor; // el backend ya envia texto legible
  return d.toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const BADGE: Record<EstadoPedido, string> = {
  recibido: 'bg-blue-100 text-blue-700',
  pendiente: 'bg-orange-100 text-orange-700',
  listo: 'bg-yellow-100 text-yellow-700',
  entregado: 'bg-green-100 text-green-700',
  cancelado: 'bg-gray-200 text-gray-600',
};
const BADGE_DESCONOCIDO = 'bg-gray-100 text-gray-500';

// El estado llega como texto libre desde la hoja: si algún día trae un valor que
// el panel no conoce, se muestra tal cual en vez de romper el badge.
function badgeDe(estado: string) {
  return esEstadoPedido(estado) ? BADGE[estado] : BADGE_DESCONOCIDO;
}
function labelDe(estado: string) {
  return esEstadoPedido(estado) ? ETIQUETA_ESTADO[estado] : estado || 'Sin estado';
}

const ESTADO_PAGO_OPCIONES = [
  'pendiente',
  'pagado_transferencia',
  'pagado_efectivo',
  'anulado',
];

// ── PANEL ──────────────────────────────────────────────────────────────────────
function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accionId, setAccionId] = useState<string | null>(null); // pedido con accion en curso

  // Detalle por pedido (cargado bajo demanda).
  const [detalles, setDetalles] = useState<Record<string, LineaDetalle[]>>({});
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});

  const cargarPedidos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/pedidos', { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'No se pudieron cargar los pedidos.');
      }
      const lista: Pedido[] = (json.data as Record<string, unknown>[]).map((p) => ({
        id_pedido: String(p.id_pedido ?? ''),
        fecha_hora: String(p.fecha_hora ?? ''),
        nombre_cliente: String(p.nombre_cliente ?? ''),
        telefono: String(p.telefono ?? ''),
        total: num(p.total),
        estado_pedido: String(p.estado_pedido ?? 'pendiente'),
        estado_pago: String(p.estado_pago ?? ''),
        forma_pago: String(p.forma_pago ?? ''),
      }));
      setPedidos(lista);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarPedidos(); }, [cargarPedidos]);

  const verDetalle = async (id: string) => {
    const abierto = !!abiertos[id];
    setAbiertos((prev) => ({ ...prev, [id]: !abierto }));
    if (abierto || detalles[id]) return; // ya cargado o se esta cerrando
    try {
      const res = await fetch(`/api/admin/pedidos/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Error al cargar detalle.');
      const lineas: LineaDetalle[] = (json.data.detalle as Record<string, unknown>[]).map((l) => ({
        nombre_producto: String(l.nombre_producto ?? ''),
        cantidad: num(l.cantidad),
        precio_unitario: num(l.precio_unitario),
        subtotal: num(l.subtotal),
        unidad_medida: l.unidad_medida ? String(l.unidad_medida) : undefined,
      }));
      setDetalles((prev) => ({ ...prev, [id]: lineas }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cargar detalle.');
      setAbiertos((prev) => ({ ...prev, [id]: false }));
    }
  };

  const cambiarEstado = async (pedido: Pedido, estado: EstadoPedido) => {
    setAccionId(pedido.id_pedido);
    try {
      const res = await fetch(`/api/admin/pedidos/${encodeURIComponent(pedido.id_pedido)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_pedido: estado }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'No se pudo actualizar el estado.');
      setPedidos((prev) => prev.map((p) =>
        p.id_pedido === pedido.id_pedido ? { ...p, estado_pedido: estado } : p));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar.');
    } finally {
      setAccionId(null);
    }
  };

  const cambiarPago = async (pedido: Pedido, estadoPago: string) => {
    setAccionId(pedido.id_pedido);
    try {
      const res = await fetch(`/api/admin/pedidos/${encodeURIComponent(pedido.id_pedido)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // El backend exige estado_pedido: reenviamos el actual.
        body: JSON.stringify({ estado_pedido: pedido.estado_pedido, estado_pago: estadoPago }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'No se pudo actualizar el pago.');
      setPedidos((prev) => prev.map((p) =>
        p.id_pedido === pedido.id_pedido ? { ...p, estado_pago: estadoPago } : p));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar el pago.');
    } finally {
      setAccionId(null);
    }
  };

  const cancelar = async (pedido: Pedido) => {
    if (!window.confirm('¿Cancelar este pedido? Se devolverá el stock de sus productos.')) return;
    setAccionId(pedido.id_pedido);
    try {
      const res = await fetch(`/api/admin/pedidos/${encodeURIComponent(pedido.id_pedido)}`, {
        method: 'POST',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'No se pudo cancelar el pedido.');
      setPedidos((prev) => prev.map((p) =>
        p.id_pedido === pedido.id_pedido ? { ...p, estado_pedido: 'cancelado' } : p));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cancelar.');
    } finally {
      setAccionId(null);
    }
  };

  const filtrados = filtro === 'todos' ? pedidos : pedidos.filter((p) => p.estado_pedido === filtro);
  const pendientes = pedidos.filter((p) => p.estado_pedido === 'pendiente').length;

  const filtrosBtns: { key: Filtro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'pendiente', label: 'Pendiente' },
    { key: 'listo', label: 'Listo' },
    { key: 'entregado', label: 'Entregado' },
    { key: 'cancelado', label: 'Cancelado' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="bg-white border-b border-primary-light sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/images/logo.png" alt="Logo" width={40} height={40} className="object-contain" />
            <span className="font-serif text-primary-dark font-bold text-lg">Panel Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={cargarPedidos} className="text-sm text-primary hover:text-primary-dark transition-colors">
              Actualizar
            </button>
            <button onClick={onLogout} className="text-sm text-gray-500 hover:text-primary-dark transition-colors">
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="font-serif text-2xl font-bold text-primary-dark">Pedidos</h1>
          {pendientes > 0 && (
            <span className="bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {pendientes} pendiente{pendientes > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap mb-6">
          {filtrosBtns.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filtro === key
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary hover:text-primary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Estados de carga / error */}
        {cargando && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <svg className="animate-spin w-8 h-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-primary font-medium">Cargando pedidos...</p>
          </div>
        )}

        {error && !cargando && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <p className="text-red-600 font-semibold">No se pudieron cargar los pedidos</p>
            <p className="text-gray-500 text-sm">{error}</p>
            <button onClick={cargarPedidos} className="mt-2 bg-primary text-white text-sm px-4 py-2 rounded-md hover:bg-primary-dark transition-colors">
              Reintentar
            </button>
          </div>
        )}

        {/* Lista */}
        {!cargando && !error && (
          filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <p className="text-gray-400 font-medium">No hay pedidos para este filtro</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtrados.map((pedido) => {
                const detalle = detalles[pedido.id_pedido];
                const abierto = !!abiertos[pedido.id_pedido];
                const ocupado = accionId === pedido.id_pedido;
                const cancelado = pedido.estado_pedido === 'cancelado';
                const transiciones = esEstadoPedido(pedido.estado_pedido)
                  ? transicionesPosibles(pedido.estado_pedido)
                  : [];

                return (
                  <div key={pedido.id_pedido} className="bg-white rounded-xl shadow-sm p-6">
                    {/* Cabecera */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                      <div>
                        <p className="font-semibold text-primary-dark text-lg">{pedido.nombre_cliente}</p>
                        <a href={`tel:${pedido.telefono}`} className="text-sm text-primary hover:underline">
                          {pedido.telefono}
                        </a>
                        <p className="text-xs text-gray-400 mt-1">
                          {pedido.id_pedido} · {formatFecha(pedido.fecha_hora)}
                        </p>
                      </div>
                      <span className={`self-start text-xs font-semibold px-3 py-1 rounded-full ${badgeDe(pedido.estado_pedido)}`}>
                        {labelDe(pedido.estado_pedido)}
                      </span>
                    </div>

                    {/* Detalle */}
                    {abierto && (
                      <ul className="space-y-1.5 mb-4 border-t border-gray-100 pt-4">
                        {!detalle ? (
                          <li className="text-sm text-gray-400">Cargando detalle...</li>
                        ) : detalle.length === 0 ? (
                          <li className="text-sm text-gray-400">Sin líneas de detalle.</li>
                        ) : detalle.map((item, idx) => (
                          <li key={idx} className="flex justify-between text-sm text-gray-600">
                            <span>{item.nombre_producto} <span className="text-gray-400">×{item.cantidad}</span></span>
                            <span>{formatPrecio(item.subtotal)}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* Total + pago + acciones */}
                    <div className="flex flex-col gap-3 border-t border-gray-100 pt-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <p className="font-bold text-xl text-primary">{formatPrecio(pedido.total)}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>Pago:</span>
                          <select
                            value={ESTADO_PAGO_OPCIONES.includes(pedido.estado_pago) ? pedido.estado_pago : 'pendiente'}
                            disabled={ocupado || cancelado}
                            onChange={(e) => cambiarPago(pedido, e.target.value)}
                            className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                          >
                            {ESTADO_PAGO_OPCIONES.map((op) => (
                              <option key={op} value={op}>{op}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap items-center">
                        <button
                          onClick={() => verDetalle(pedido.id_pedido)}
                          className="text-sm text-primary-dark border border-gray-200 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          {abierto ? 'Ocultar detalle' : 'Ver detalle'}
                        </button>

                        {transiciones.includes('pendiente') && (
                          <button
                            onClick={() => cambiarEstado(pedido, 'pendiente')}
                            disabled={ocupado}
                            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                          >
                            {pedido.estado_pedido === 'recibido' ? 'Confirmar pendiente' : 'Volver a pendiente'}
                          </button>
                        )}
                        {transiciones.includes('listo') && (
                          <button
                            onClick={() => cambiarEstado(pedido, 'listo')}
                            disabled={ocupado}
                            className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                          >
                            Marcar listo
                          </button>
                        )}
                        {transiciones.includes('entregado') && (
                          <button
                            onClick={() => cambiarEstado(pedido, 'entregado')}
                            disabled={ocupado}
                            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                          >
                            Entregado
                          </button>
                        )}
                        {transiciones.includes('cancelado') && (
                          <button
                            onClick={() => cancelar(pedido)}
                            disabled={ocupado}
                            className="flex items-center gap-1.5 text-sm text-red-500 border border-red-200 px-3 py-2 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        )}
                        {ocupado && <span className="text-xs text-gray-400">Procesando...</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── ROOT ───────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return <AdminPanel onLogout={handleLogout} />;
}
