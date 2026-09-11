'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FORMAS_PAGO_VENTA_PRESENCIAL } from '@/lib/fase5/ventaPresencial';

interface Producto {
  id_producto: string;
  nombre: string;
  unidad_medida: string;
  permite_decimal: string;
  paso_venta: number;
  precio_venta: number;
  stock_actual: number;
}

interface Apertura {
  apertura_id: string;
  fecha_apertura: string;
  lugar: string;
  estado_apertura: string;
  modo_presencial_estado: string;
}

interface LineaComanda {
  detalle_id: string;
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  unidad_medida: string;
  precio_unitario: number;
  subtotal: number;
}

interface VentaCreada {
  venta: {
    venta_id: string;
    fecha_hora: string;
    apertura_id: string;
    total: number;
    estado_pago: string;
    forma_pago: string;
    vendedor: string;
  };
  comanda: { detalle: LineaComanda[] };
}

function formatoPrecio(valor: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(valor);
}

function fechaHoraSantiago() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const valor = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? '';
  return `${valor('year')}-${valor('month')}-${valor('day')}T${valor('hour')}:${valor('minute')}`;
}

async function datosRespuesta(res: Response) {
  const json = await res.json().catch(() => null);
  if (res.status === 401) throw new Error('La sesión expiró. Vuelve a iniciar sesión.');
  if (!res.ok || !json?.ok) throw new Error(json?.error || 'La operación no pudo completarse.');
  return json.data;
}

export default function PanelVendedorPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [aperturas, setAperturas] = useState<Apertura[]>([]);
  const [aperturaId, setAperturaId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [vendedor, setVendedor] = useState('');
  const [formaPago, setFormaPago] = useState<(typeof FORMAS_PAGO_VENTA_PRESENCIAL)[number]>('efectivo');
  const [observaciones, setObservaciones] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [venta, setVenta] = useState<VentaCreada | null>(null);
  const enviandoRef = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  const marcarVentaEditada = () => {
    idempotencyKeyRef.current = null;
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ventas', { cache: 'no-store' });
      const data = await datosRespuesta(res);
      const disponibles = (data.aperturas as Apertura[]).filter(
        (a) => a.estado_apertura === 'activa' && a.modo_presencial_estado === 'activo'
      );
      setProductos(data.productos as Producto[]);
      setAperturas(disponibles);
      setAperturaId((actual) => actual || disponibles[0]?.apertura_id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo preparar el panel vendedor.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const lineas = useMemo(() => productos
    .filter((producto) => (cantidades[producto.id_producto] ?? 0) > 0)
    .map((producto) => ({ producto, cantidad: cantidades[producto.id_producto] })),
  [cantidades, productos]);

  const totalVisual = lineas.reduce(
    (total, linea) => total + linea.producto.precio_venta * linea.cantidad,
    0
  );
  const filtrados = productos.filter((producto) =>
    producto.nombre.toLocaleLowerCase('es-CL').includes(busqueda.toLocaleLowerCase('es-CL'))
  );

  const cambiarCantidad = (producto: Producto, cantidad: number) => {
    marcarVentaEditada();
    setCantidades((actual) => ({ ...actual, [producto.id_producto]: cantidad }));
  };

  const registrar = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setVenta(null);
    if (!aperturaId) return setError('No hay una apertura habilitada para venta presencial.');
    if (!vendedor.trim()) return setError('Identifica a la persona vendedora.');
    if (!lineas.length) return setError('Agrega al menos un producto.');
    if (enviandoRef.current) return;

    enviandoRef.current = true;
    setGuardando(true);
    try {
      idempotencyKeyRef.current ??= `ven_${crypto.randomUUID().replace(/-/g, '')}`;
      const res = await fetch('/api/admin/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apertura_id: aperturaId,
          fecha_hora: fechaHoraSantiago(),
          vendedor: vendedor.trim(),
          forma_pago: formaPago,
          observaciones: observaciones.trim(),
          lineas: lineas.map(({ producto, cantidad }) => ({
            producto_id: producto.id_producto,
            cantidad,
          })),
          idempotency_key: idempotencyKeyRef.current,
        }),
      });
      const data = await datosRespuesta(res) as VentaCreada;
      setVenta(data);
      idempotencyKeyRef.current = null;
      setCantidades({});
      setObservaciones('');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la venta.');
    } finally {
      enviandoRef.current = false;
      setGuardando(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-gray-700 print:bg-white print:p-0">
      <div className="mx-auto max-w-6xl print:max-w-none">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-primary-dark">Panel vendedor</h1>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">TEST</span>
            </div>
            <p className="text-sm text-gray-500">Venta presencial asistida. El servidor recalcula precios, total y stock.</p>
          </div>
          <nav className="flex gap-2 text-sm">
            <Link className="rounded-md border border-gray-200 bg-white px-3 py-2" href="/admin">Pedidos</Link>
            <Link className="rounded-md border border-gray-200 bg-white px-3 py-2" href="/admin/caja">Caja</Link>
          </nav>
        </header>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden">{error}</div>}
        {cargando ? <p className="py-16 text-center text-sm text-gray-500">Cargando datos TEST...</p> : (
          <form onSubmit={registrar} className="grid gap-6 lg:grid-cols-[1.35fr_.65fr] print:hidden">
            <section className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">Apertura habilitada
                  <select value={aperturaId} onChange={(e) => { marcarVentaEditada(); setAperturaId(e.target.value); }} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2">
                    <option value="">Sin apertura habilitada</option>
                    {aperturas.map((a) => <option key={a.apertura_id} value={a.apertura_id}>{a.fecha_apertura} · {a.lugar}</option>)}
                  </select>
                </label>
                <label className="text-sm">Buscar producto
                  <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2" placeholder="Nombre del producto" />
                </label>
              </div>
              <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                {filtrados.map((producto) => {
                  const paso = producto.permite_decimal === 'SI' ? producto.paso_venta || 0.25 : 1;
                  return <div key={producto.id_producto} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-gray-100 p-3">
                    <div><p className="font-medium text-primary-dark">{producto.nombre}</p><p className="text-xs text-gray-500">{formatoPrecio(producto.precio_venta)} · stock {producto.stock_actual} {producto.unidad_medida}</p></div>
                    <input aria-label={`Cantidad de ${producto.nombre}`} type="number" min="0" max={producto.stock_actual} step={paso} value={cantidades[producto.id_producto] ?? 0} onChange={(e) => cambiarCantidad(producto, Number(e.target.value))} className="w-24 rounded-md border border-gray-200 px-2 py-1.5 text-right" />
                  </div>;
                })}
              </div>
            </section>

            <section className="h-fit rounded-xl bg-white p-5 shadow-sm">
              <h2 className="font-serif text-xl font-bold text-primary-dark">Venta actual</h2>
              <ul className="my-4 space-y-2 text-sm">
                {lineas.length ? lineas.map(({ producto, cantidad }) => <li key={producto.id_producto} className="flex justify-between gap-3"><span>{producto.nombre} × {cantidad}</span><strong>{formatoPrecio(producto.precio_venta * cantidad)}</strong></li>) : <li className="text-gray-400">Sin productos.</li>}
              </ul>
              <p className="border-t border-gray-100 pt-3 text-xl font-bold text-primary">Total visual: {formatoPrecio(totalVisual)}</p>
              <p className="mb-4 text-xs text-gray-400">El total definitivo se calcula nuevamente en el servidor.</p>
              <label className="mb-3 block text-sm">Vendedor/a<input value={vendedor} onChange={(e) => { marcarVentaEditada(); setVendedor(e.target.value); }} maxLength={100} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2" required /></label>
              <label className="mb-3 block text-sm">Forma de pago<select value={formaPago} onChange={(e) => { marcarVentaEditada(); setFormaPago(e.target.value as typeof formaPago); }} className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2">{FORMAS_PAGO_VENTA_PRESENCIAL.map((forma) => <option key={forma} value={forma}>{forma}</option>)}</select></label>
              <label className="mb-4 block text-sm">Observación opcional<textarea value={observaciones} onChange={(e) => { marcarVentaEditada(); setObservaciones(e.target.value); }} maxLength={500} className="mt-1 min-h-20 w-full rounded-md border border-gray-200 px-3 py-2" /></label>
              <button disabled={guardando || !aperturaId} className="w-full rounded-md bg-primary px-4 py-2.5 font-semibold text-white disabled:opacity-50">{guardando ? 'Registrando...' : 'Registrar venta'}</button>
            </section>
          </form>
        )}

        {venta && <section className="mt-6 rounded-xl border border-primary-light bg-white p-6 shadow-sm print:m-0 print:border-0 print:shadow-none">
          <div className="flex justify-between gap-4"><div><p className="text-xs font-bold uppercase text-primary">Comanda TEST</p><h2 className="font-serif text-2xl font-bold text-primary-dark">{venta.venta.venta_id}</h2></div><button onClick={() => window.print()} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white print:hidden">Imprimir comanda</button></div>
          <dl className="my-4 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-gray-400">Apertura</dt><dd>{venta.venta.apertura_id}</dd></div><div><dt className="text-gray-400">Fecha</dt><dd>{venta.venta.fecha_hora}</dd></div><div><dt className="text-gray-400">Vendedor/a</dt><dd>{venta.venta.vendedor}</dd></div><div><dt className="text-gray-400">Pago</dt><dd>{venta.venta.forma_pago} · {venta.venta.estado_pago}</dd></div></dl>
          <table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-2">Producto</th><th>Cantidad</th><th className="text-right">Subtotal</th></tr></thead><tbody>{venta.comanda.detalle.map((linea) => <tr key={linea.detalle_id} className="border-b border-gray-100"><td className="py-2">{linea.nombre_producto}</td><td>{linea.cantidad} {linea.unidad_medida}</td><td className="text-right">{formatoPrecio(linea.subtotal)}</td></tr>)}</tbody></table>
          <p className="mt-4 text-right text-xl font-bold">Total {formatoPrecio(venta.venta.total)}</p>
        </section>}
      </div>
    </main>
  );
}
