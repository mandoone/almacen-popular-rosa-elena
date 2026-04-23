'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const PASS = 'almacen2024';
const SESSION_KEY = 'admin-session';
const PEDIDOS_KEY = 'pedidos-almacen';

type Estado = 'pendiente' | 'listo' | 'entregado';
type Filtro = 'todos' | Estado;
type Modo = 'resumen' | 'detalle' | 'edicion';

interface ProductoDisponible {
  id: string;
  nombre: string;
  precio: number;
}

interface ProductoPedido {
  nombre: string;
  cantidad: number;
  precio: number;
}

interface Pedido {
  id: string;
  nombre: string;
  telefono: string;
  productos: ProductoPedido[];
  total: number;
  fecha: string;
  estado: Estado;
}

function formatPrecio(n: number) {
  return '$' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function calcularTotal(productos: ProductoPedido[]): number {
  return productos.reduce((acc, p) => acc + p.precio * p.cantidad, 0);
}

function persistir(pedidos: Pedido[]) {
  localStorage.setItem(PEDIDOS_KEY, JSON.stringify(pedidos));
}

const BADGE: Record<Estado, string> = {
  pendiente: 'bg-orange-100 text-orange-700',
  listo: 'bg-yellow-100 text-yellow-700',
  entregado: 'bg-green-100 text-green-700',
};
const LABEL: Record<Estado, string> = {
  pendiente: 'Pendiente',
  listo: 'Listo',
  entregado: 'Entregado',
};

// ── LOGIN ──────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pass === PASS) { localStorage.setItem(SESSION_KEY, '1'); onLogin(); }
    else { setError(true); setPass(''); }
  };

  return (
    <div className="min-h-screen bg-primary-dark flex flex-col items-center justify-center px-4 gap-6">
      <Image src="/images/logo.png" alt="Logo" width={80} height={80} className="object-contain" />
      <h1 className="font-serif text-white text-3xl font-bold text-center">Panel de Administración</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
        <input
          type="password"
          placeholder="Contraseña"
          value={pass}
          onChange={(e) => { setPass(e.target.value); setError(false); }}
          className="px-4 py-3 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
          autoFocus
        />
        {error && <p className="text-red-300 text-sm text-center">Contraseña incorrecta</p>}
        <button type="submit" className="bg-white text-primary-dark font-semibold py-3 rounded-md hover:bg-gray-100 transition-colors">
          Ingresar
        </button>
      </form>
    </div>
  );
}

// ── PANEL ──────────────────────────────────────────────────────────────────────
function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [productosDisponibles, setProductosDisponibles] = useState<ProductoDisponible[]>([]);

  // Modo por tarjeta y borradores para edición con cancelación
  const [modos, setModos] = useState<Record<string, Modo>>({});
  const [borradores, setBorradores] = useState<Record<string, ProductoPedido[]>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PEDIDOS_KEY);
      if (raw) setPedidos(JSON.parse(raw));
    } catch {}
    fetch('/api/productos')
      .then((r) => r.json())
      .then((data: ProductoDisponible[]) => setProductosDisponibles(data))
      .catch(() => {});
  }, []);

  const getModo = (id: string): Modo => modos[id] ?? 'resumen';
  const setModo = (id: string, modo: Modo) => setModos((prev) => ({ ...prev, [id]: modo }));

  const entrarEdicion = (pedido: Pedido) => {
    setBorradores((prev) => ({ ...prev, [pedido.id]: JSON.parse(JSON.stringify(pedido.productos)) }));
    setModo(pedido.id, 'edicion');
  };

  const cancelarEdicion = (id: string) => {
    setBorradores((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setModo(id, 'detalle');
  };

  const guardarEdicion = (id: string) => {
    const draft = borradores[id];
    if (!draft) return;
    setPedidos((prev) => {
      const next = prev.map((p) => p.id === id ? { ...p, productos: draft, total: calcularTotal(draft) } : p);
      persistir(next);
      return next;
    });
    setBorradores((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setModo(id, 'detalle');
  };

  // Mutaciones sobre el borrador (solo en modo edición)
  const cambiarCantidadDraft = (pedidoId: string, idx: number, delta: number) => {
    setBorradores((prev) => {
      const draft = [...(prev[pedidoId] ?? [])];
      draft[idx] = { ...draft[idx], cantidad: draft[idx].cantidad + delta };
      return { ...prev, [pedidoId]: draft.filter((i) => i.cantidad > 0) };
    });
  };

  const eliminarItemDraft = (pedidoId: string, idx: number) => {
    setBorradores((prev) => ({
      ...prev,
      [pedidoId]: prev[pedidoId].filter((_, i) => i !== idx),
    }));
  };

  const agregarProductoDraft = (pedidoId: string, productoId: string) => {
    const prod = productosDisponibles.find((p) => p.id === productoId);
    if (!prod) return;
    setBorradores((prev) => {
      const draft = [...(prev[pedidoId] ?? [])];
      const existe = draft.findIndex((i) => i.nombre === prod.nombre);
      if (existe >= 0) draft[existe] = { ...draft[existe], cantidad: draft[existe].cantidad + 1 };
      else draft.push({ nombre: prod.nombre, precio: prod.precio, cantidad: 1 });
      return { ...prev, [pedidoId]: draft };
    });
  };

  // Mutaciones directas sobre pedidos persistidos
  const mutar = (fn: (prev: Pedido[]) => Pedido[]) => {
    setPedidos((prev) => { const next = fn(prev); persistir(next); return next; });
  };

  const actualizarEstado = (id: string, estado: Estado) =>
    mutar((prev) => prev.map((p) => p.id === id ? { ...p, estado } : p));

  const eliminarPedido = (id: string) => {
    if (!window.confirm('¿Eliminar este pedido?')) return;
    mutar((prev) => prev.filter((p) => p.id !== id));
  };

  const filtrados = filtro === 'todos' ? pedidos : pedidos.filter((p) => p.estado === filtro);
  const pendientes = pedidos.filter((p) => p.estado === 'pendiente').length;

  const filtrosBtns: { key: Filtro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'pendiente', label: 'Pendiente' },
    { key: 'listo', label: 'Listo' },
    { key: 'entregado', label: 'Entregado' },
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
          <button onClick={onLogout} className="text-sm text-gray-500 hover:text-primary-dark transition-colors">
            Cerrar sesión
          </button>
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

        {/* Lista */}
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <p className="text-gray-400 font-medium">No hay pedidos aún</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtrados.map((pedido) => {
              const modo = getModo(pedido.id);
              const draft = borradores[pedido.id] ?? pedido.productos;
              const totalDraft = calcularTotal(draft);

              return (
                <div key={pedido.id} className="bg-white rounded-xl shadow-sm p-6">

                  {/* Cabecera siempre visible */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                    <div>
                      <p className="font-semibold text-primary-dark text-lg">{pedido.nombre}</p>
                      <a href={`tel:${pedido.telefono}`} className="text-sm text-primary hover:underline">
                        {pedido.telefono}
                      </a>
                      <p className="text-xs text-gray-400 mt-1">{formatFecha(pedido.fecha)}</p>
                    </div>
                    <span className={`self-start text-xs font-semibold px-3 py-1 rounded-full ${BADGE[pedido.estado]}`}>
                      {LABEL[pedido.estado]}
                    </span>
                  </div>

                  {/* ── MODO DETALLE: lista read-only ── */}
                  {(modo === 'detalle' || modo === 'edicion') && (
                    <ul className="space-y-1.5 mb-4 border-t border-gray-100 pt-4">
                      {modo === 'detalle' && pedido.productos.map((item, idx) => (
                        <li key={idx} className="flex justify-between text-sm text-gray-600">
                          <span>{item.nombre} <span className="text-gray-400">×{item.cantidad}</span></span>
                          <span>{formatPrecio(item.precio * item.cantidad)}</span>
                        </li>
                      ))}

                      {/* ── MODO EDICIÓN: lista editable ── */}
                      {modo === 'edicion' && draft.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                          <button
                            onClick={() => cambiarCantidadDraft(pedido.id, idx, -1)}
                            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-primary hover:text-white font-bold flex items-center justify-center transition-colors shrink-0"
                          >−</button>
                          <span className="w-5 text-center font-semibold">{item.cantidad}</span>
                          <button
                            onClick={() => cambiarCantidadDraft(pedido.id, idx, 1)}
                            className="w-6 h-6 rounded-full bg-gray-100 hover:bg-primary hover:text-white font-bold flex items-center justify-center transition-colors shrink-0"
                          >+</button>
                          <span className="flex-1 truncate">{item.nombre}</span>
                          <span className="text-gray-500 shrink-0">{formatPrecio(item.precio * item.cantidad)}</span>
                          <button
                            onClick={() => eliminarItemDraft(pedido.id, idx)}
                            className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                            title="Eliminar producto"
                          >🗑</button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Agregar producto (solo edición) */}
                  {modo === 'edicion' && (
                    <div className="flex gap-2 mb-4">
                      <select
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        defaultValue=""
                        onChange={(e) => { if (e.target.value) agregarProductoDraft(pedido.id, e.target.value); e.target.value = ''; }}
                      >
                        <option value="" disabled>+ Agregar producto...</option>
                        {productosDisponibles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} — {formatPrecio(p.precio)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Total + botones de acción */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-100 pt-4">
                    <p className="font-bold text-xl text-primary">
                      {modo === 'edicion' ? formatPrecio(totalDraft) : formatPrecio(pedido.total)}
                    </p>

                    <div className="flex gap-2 flex-wrap items-center">
                      {/* Botones modo resumen */}
                      {modo === 'resumen' && (
                        <button
                          onClick={() => setModo(pedido.id, 'detalle')}
                          className="text-sm text-primary-dark border border-gray-200 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Ver detalle
                        </button>
                      )}

                      {/* Botones modo detalle */}
                      {modo === 'detalle' && (
                        <>
                          <button
                            onClick={() => setModo(pedido.id, 'resumen')}
                            className="text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Ocultar detalle
                          </button>
                          <button
                            onClick={() => entrarEdicion(pedido)}
                            className="text-sm text-primary border border-primary px-3 py-2 rounded-md hover:bg-primary hover:text-white transition-colors"
                          >
                            Editar pedido
                          </button>
                        </>
                      )}

                      {/* Botones modo edición */}
                      {modo === 'edicion' && (
                        <>
                          <button
                            onClick={() => cancelarEdicion(pedido.id)}
                            className="text-sm text-gray-500 border border-gray-200 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => guardarEdicion(pedido.id)}
                            className="text-sm bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors font-medium"
                          >
                            Guardar cambios
                          </button>
                        </>
                      )}

                      {/* Botones de estado (siempre visibles si aplica) */}
                      {pedido.estado === 'pendiente' && (
                        <button
                          onClick={() => actualizarEstado(pedido.id, 'listo')}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                        >
                          Marcar listo
                        </button>
                      )}
                      {(pedido.estado === 'pendiente' || pedido.estado === 'listo') && (
                        <button
                          onClick={() => actualizarEstado(pedido.id, 'entregado')}
                          className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
                        >
                          Entregado
                        </button>
                      )}

                      {/* Eliminar */}
                      <button
                        onClick={() => eliminarPedido(pedido.id)}
                        className="flex items-center gap-1.5 text-sm text-red-500 border border-red-200 px-3 py-2 rounded-md hover:bg-red-50 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ROOT ───────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);

  useEffect(() => { setAutenticado(localStorage.getItem(SESSION_KEY) === '1'); }, []);

  const handleLogin = () => setAutenticado(true);
  const handleLogout = () => { localStorage.removeItem(SESSION_KEY); setAutenticado(false); };

  if (autenticado === null) return null;

  return autenticado
    ? <AdminPanel onLogout={handleLogout} />
    : <LoginScreen onLogin={handleLogin} />;
}
