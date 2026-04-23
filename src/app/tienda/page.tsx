'use client';

import { useState, useEffect } from 'react';

const WA_NUMBER = '56950807172';

interface Producto {
  id: string;
  nombre: string;
  precio: number;
}

interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}

interface CarritoPanelProps {
  carrito: ItemCarrito[];
  nombre: string;
  telefono: string;
  total: number;
  onNombre: (v: string) => void;
  onTelefono: (v: string) => void;
  onAgregar: (p: Producto) => void;
  onReducir: (id: string) => void;
  onVaciar: () => void;
  onEnviar: () => void;
}

function formatPrecio(n: number) {
  return '$' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function CarritoPanel({
  carrito,
  nombre,
  telefono,
  total,
  onNombre,
  onTelefono,
  onAgregar,
  onReducir,
  onVaciar,
  onEnviar,
}: CarritoPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl font-bold text-primary-dark">
          Tu pedido
        </h2>
        <button
          onClick={onVaciar}
          className="text-xs text-red-500 hover:text-red-700 transition-colors"
        >
          Vaciar
        </button>
      </div>

      {/* Lista de productos */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {carrito.map(({ producto, cantidad }) => (
          <div key={producto.id} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {producto.nombre}
              </p>
              <p className="text-xs text-gray-500">
                {formatPrecio(producto.precio)} c/u
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onReducir(producto.id)}
                className="w-7 h-7 rounded-full bg-primary-light text-primary-dark font-bold text-sm flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-semibold">
                {cantidad}
              </span>
              <button
                onClick={() => onAgregar(producto)}
                className="w-7 h-7 rounded-full bg-primary-light text-primary-dark font-bold text-sm flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
              >
                +
              </button>
            </div>
            <p className="text-sm font-semibold text-primary-dark w-20 text-right shrink-0">
              {formatPrecio(producto.precio * cantidad)}
            </p>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="border-t border-gray-200 pt-4 mb-4">
        <div className="flex justify-between font-bold text-lg text-primary-dark">
          <span>Total</span>
          <span>{formatPrecio(total)}</span>
        </div>
      </div>

      {/* Datos cliente */}
      <div className="space-y-3 mb-4">
        <input
          type="text"
          placeholder="Tu nombre *"
          value={nombre}
          onChange={(e) => onNombre(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="tel"
          placeholder="Tu teléfono *"
          value={telefono}
          onChange={(e) => onTelefono(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Botón enviar */}
      <button
        onClick={onEnviar}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-md transition-colors flex items-center justify-center gap-2 text-sm"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
        Enviar pedido por WhatsApp
      </button>
    </div>
  );
}

export default function TiendaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('carrito-almacen');
      if (saved) setCarrito(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem('carrito-almacen', JSON.stringify(carrito));
  }, [carrito]);

  useEffect(() => {
    fetch('/api/productos')
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar el catálogo');
        return res.json();
      })
      .then((data: Producto[]) => {
        if (!data.length)
          throw new Error('El catálogo está vacío o no tiene el formato esperado');
        setProductos(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const cantidadEnCarrito = (id: string) =>
    carrito.find((i) => i.producto.id === id)?.cantidad ?? 0;

  const agregar = (producto: Producto) => {
    setCarrito((prev) => {
      const existe = prev.find((i) => i.producto.id === producto.id);
      if (existe)
        return prev.map((i) =>
          i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const reducir = (id: string) => {
    setCarrito((prev) =>
      prev
        .map((i) => (i.producto.id === id ? { ...i, cantidad: i.cantidad - 1 } : i))
        .filter((i) => i.cantidad > 0)
    );
  };

  const vaciarCarrito = () => setCarrito([]);

  const total = carrito.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0);
  const totalItems = carrito.reduce((acc, i) => acc + i.cantidad, 0);

  const enviarPedido = () => {
    if (!nombre.trim() || !telefono.trim()) {
      alert('Por favor ingresa tu nombre y teléfono para enviar el pedido.');
      return;
    }
    const lista = carrito
      .map((i) => `• ${i.producto.nombre} x${i.cantidad} = ${formatPrecio(i.producto.precio * i.cantidad)}`)
      .join('\n');

    const mensaje =
      `Hola! Quiero hacer un pedido del Almacén Popular Rosa Elena Morales Morales:\n\n` +
      `${lista}\n\n` +
      `Total: ${formatPrecio(total)}\n` +
      `Nombre: ${nombre}\n` +
      `Teléfono: ${telefono}\n\n` +
      `Iré a retirar el próximo sábado de apertura. ¡Gracias!`;

    // Guardar pedido en localStorage para el panel de admin
    const pedido = {
      id: Date.now().toString(),
      nombre,
      telefono,
      productos: carrito.map((i) => ({
        nombre: i.producto.nombre,
        cantidad: i.cantidad,
        precio: i.producto.precio,
      })),
      total,
      fecha: new Date().toISOString(),
      estado: 'pendiente',
    };
    try {
      const existentes = JSON.parse(localStorage.getItem('pedidos-almacen') ?? '[]');
      localStorage.setItem('pedidos-almacen', JSON.stringify([pedido, ...existentes]));
    } catch {}

    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const carritoProps: CarritoPanelProps = {
    carrito,
    nombre,
    telefono,
    total,
    onNombre: setNombre,
    onTelefono: setTelefono,
    onAgregar: agregar,
    onReducir: reducir,
    onVaciar: vaciarCarrito,
    onEnviar: enviarPedido,
  };

  return (
    <div className="flex flex-col w-full">
      {/* HERO */}
      <section className="bg-primary-dark text-white py-20 px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="font-serif font-bold text-white text-2xl md:text-4xl mb-4">
          Productos disponibles
        </h1>
        <p className="text-primary-light text-sm md:text-lg">
          Precios al costo • Sin fines de lucro • Retiro en Gamero 2670, Independencia
        </p>
      </section>

      {/* AVISO */}
      <section className="bg-primary-light py-4 px-4 text-center">
        <p className="text-primary-dark font-medium">
          🗓 Los productos se actualizan cada sábado de apertura. Haz tu pedido
          online y retíralo en el almacén.
        </p>
      </section>

      {/* CATÁLOGO + CARRITO */}
      <section className="bg-background py-12 px-4 sm:px-6 lg:px-8 flex-1">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
          {/* Grid de productos */}
          <div className="flex-1 min-w-0">
            {loading && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <svg
                  className="animate-spin w-10 h-10 text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <p className="text-primary font-medium">Cargando catálogo...</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <p className="text-red-600 font-semibold text-lg">No se pudo cargar el catálogo</p>
                <p className="text-gray-500 text-sm">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 px-2">
                {productos.map((producto) => {
                  const cantidad = cantidadEnCarrito(producto.id);
                  return (
                    <div key={producto.id} className="bg-white rounded-xl shadow-sm p-2 md:p-4 flex flex-col gap-2">
                      <h3 className="text-xs md:text-sm font-semibold text-primary-dark leading-tight">
                        {producto.nombre}
                      </h3>
                      <p className="font-bold text-sm md:text-lg text-primary">
                        {formatPrecio(producto.precio)}
                      </p>
                      {cantidad === 0 ? (
                        <button
                          onClick={() => agregar(producto)}
                          className="mt-auto bg-primary text-white rounded-md text-xs py-1.5 w-full font-medium hover:bg-primary-dark transition-colors"
                        >
                          Agregar
                        </button>
                      ) : (
                        <div className="mt-auto flex items-center gap-3">
                          <button
                            onClick={() => reducir(producto.id)}
                            className="w-9 h-9 rounded-full bg-primary-light text-primary-dark font-bold text-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                          >
                            −
                          </button>
                          <span className="flex-1 text-center font-semibold text-primary-dark text-lg">
                            {cantidad}
                          </span>
                          <button
                            onClick={() => agregar(producto)}
                            className="w-9 h-9 rounded-full bg-primary-light text-primary-dark font-bold text-lg flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CARRITO — sidebar desktop */}
          {carrito.length > 0 && (
            <div className="hidden lg:block w-96 shrink-0">
              <div className="sticky top-24 bg-white rounded-xl shadow-md p-6 max-h-[calc(100vh-7rem)] overflow-y-auto">
                <CarritoPanel {...carritoProps} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CARRITO — barra inferior móvil */}
      {carrito.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
          {carritoAbierto && (
            <div className="bg-white border-t border-primary-light shadow-2xl px-4 pt-4 pb-6 max-h-[80vh] overflow-y-auto">
              <CarritoPanel {...carritoProps} />
            </div>
          )}
          <button
            onClick={() => setCarritoAbierto((o) => !o)}
            className="w-full bg-primary text-white flex items-center justify-between px-5 py-4 font-semibold"
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
            </span>
            <span className="flex items-center gap-2">
              {formatPrecio(total)}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 transition-transform ${carritoAbierto ? 'rotate-180' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </span>
          </button>
        </div>
      )}

      {carrito.length > 0 && <div className="lg:hidden h-16" />}
    </div>
  );
}
