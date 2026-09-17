'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import AdminFase78Nav from '@/components/admin/AdminFase78Nav';
import type { CompraAdmin, CompraConDetalle, ProductoAdmin } from '@/lib/appsScriptPedidos';
import { pesos, resolverIntentoIdempotente, solicitarAdmin, type IntentoIdempotente } from '@/lib/fase8/clienteAdmin';

type Linea = { producto_id: string; cantidad: number; costo_unitario: number };

export default function ComprasPage() {
  const [compras, setCompras] = useState<CompraAdmin[]>([]);
  const [productos, setProductos] = useState<ProductoAdmin[]>([]);
  const [proveedor, setProveedor] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [responsable, setResponsable] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [lineas, setLineas] = useState<Linea[]>([{ producto_id: '', cantidad: 1, costo_unitario: 0 }]);
  const [estado, setEstado] = useState('Cargando datos TEST...');
  const [enviando, setEnviando] = useState(false);
  const intento = useRef<IntentoIdempotente | null>(null);

  async function cargar() {
    try {
      const [listaCompras, listaProductos] = await Promise.all([
        solicitarAdmin<CompraAdmin[]>('/api/admin/compras'),
        solicitarAdmin<ProductoAdmin[]>('/api/admin/productos'),
      ]);
      setCompras(listaCompras);
      setProductos(listaProductos.filter((producto) => String(producto.activo).toUpperCase() === 'SI'));
      setEstado('');
    } catch (error) { setEstado(error instanceof Error ? error.message : 'No se pudieron cargar los datos.'); }
  }

  useEffect(() => { void cargar(); }, []);
  const total = useMemo(() => lineas.reduce((suma, linea) => suma + Math.round(Number(linea.cantidad || 0) * Number(linea.costo_unitario || 0)), 0), [lineas]);

  function cambiarLinea(indice: number, cambio: Partial<Linea>) {
    setLineas((actuales) => actuales.map((linea, i) => i === indice ? { ...linea, ...cambio } : linea));
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setEstado('Registrando compra exclusivamente en TEST...');
    try {
      const payload = { fecha, proveedor, responsable, observaciones, lineas };
      intento.current = resolverIntentoIdempotente(intento.current, 'COMPRA', payload);
      const creada = await solicitarAdmin<CompraConDetalle>('/api/admin/compras', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, idempotency_key: intento.current.clave }),
      });
      intento.current = null;
      setEstado(`Compra ${creada.compra.compra_id} registrada; stock y costos auditados.`);
      setProveedor(''); setObservaciones('');
      setLineas([{ producto_id: '', cantidad: 1, costo_unitario: 0 }]);
      await cargar();
    } catch (error) { setEstado(error instanceof Error ? error.message : 'No se pudo registrar la compra.'); }
    finally { setEnviando(false); }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <AdminFase78Nav />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="font-serif text-3xl font-bold text-primary-dark">Compras</h1><p className="text-sm text-gray-600">Persistencia idempotente, stock e historial de costos.</p></div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">TEST</span>
        </div>
        {estado && <p role="status" className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{estado}</p>}
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <form onSubmit={guardar} className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-primary-dark">Nueva compra</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Fecha<input required type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-1 w-full rounded-md border p-2" /></label>
              <label className="text-sm">Proveedor<input required value={proveedor} onChange={(e) => setProveedor(e.target.value)} className="mt-1 w-full rounded-md border p-2" /></label>
              <label className="text-sm">Responsable<input required value={responsable} onChange={(e) => setResponsable(e.target.value)} className="mt-1 w-full rounded-md border p-2" /></label>
            </div>
            {lineas.map((linea, indice) => (
              <fieldset key={indice} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_100px_130px_auto]">
                <legend className="sr-only">Producto {indice + 1}</legend>
                <select required aria-label={`Producto ${indice + 1}`} value={linea.producto_id} onChange={(e) => cambiarLinea(indice, { producto_id: e.target.value })} className="rounded-md border p-2">
                  <option value="">Seleccionar producto</option>
                  {productos.map((producto) => <option key={producto.id_producto} value={producto.id_producto}>{producto.nombre} · {producto.unidad_medida}</option>)}
                </select>
                <input required aria-label={`Cantidad ${indice + 1}`} type="number" min="0.01" step="any" value={linea.cantidad} onChange={(e) => cambiarLinea(indice, { cantidad: Number(e.target.value) })} className="rounded-md border p-2" />
                <input required aria-label={`Costo unitario ${indice + 1}`} type="number" min="1" step="1" value={linea.costo_unitario} onChange={(e) => cambiarLinea(indice, { costo_unitario: Number(e.target.value) })} className="rounded-md border p-2" />
                <button type="button" disabled={lineas.length === 1} onClick={() => setLineas((actuales) => actuales.filter((_, i) => i !== indice))} className="rounded-md border px-3 disabled:opacity-40">Quitar</button>
              </fieldset>
            ))}
            <button type="button" onClick={() => setLineas((actuales) => [...actuales, { producto_id: '', cantidad: 1, costo_unitario: 0 }])} className="rounded-md border border-primary px-3 py-2 text-sm text-primary">Agregar producto</button>
            <label className="block text-sm">Observaciones<textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} maxLength={500} className="mt-1 w-full rounded-md border p-2" /></label>
            <div className="flex items-center justify-between"><strong>Total {pesos(total)}</strong><button disabled={enviando} className="rounded-md bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50">Confirmar compra TEST</button></div>
          </form>
          <section className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-primary-dark">Historial reciente</h2>
            <div className="space-y-3">{compras.length === 0 ? <p className="text-sm text-gray-500">Sin compras registradas.</p> : compras.slice(0, 20).map((compra) => <article key={compra.compra_id} className="rounded-lg border p-3 text-sm"><div className="flex justify-between gap-2"><strong>{compra.proveedor}</strong><span>{pesos(compra.total)}</span></div><p className="text-xs text-gray-500">{compra.compra_id} · {compra.fecha_hora} · {compra.responsable}</p></article>)}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
