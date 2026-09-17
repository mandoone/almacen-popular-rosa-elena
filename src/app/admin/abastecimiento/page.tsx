'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import AdminFase78Nav from '@/components/admin/AdminFase78Nav';
import type { CajaCompraAdmin, ProductoAdmin } from '@/lib/appsScriptPedidos';
import { proponerAbastecimiento, type ProductoCompra } from '@/lib/fase7/compras';
import { pesos, resolverIntentoIdempotente, solicitarAdmin, type IntentoIdempotente } from '@/lib/fase8/clienteAdmin';

function productoParaPropuesta(producto: ProductoAdmin): ProductoCompra {
  const costoTexto = String(producto.precio_costo ?? '').trim();
  return {
    id_producto: producto.id_producto, nombre: producto.nombre,
    unidad_medida: producto.unidad_medida,
    permite_decimal: String(producto.permite_decimal).toUpperCase() === 'SI',
    paso_venta: Number(producto.paso_venta), stock_actual: Number(producto.stock_actual),
    stock_minimo: Number(producto.stock_minimo),
    ...(costoTexto ? { precio_costo: Number(producto.precio_costo) } : {}),
    precio_venta: Number(producto.precio_venta),
    prioridad: ['alta', 'media', 'baja'].includes(String(producto.prioridad)) ? producto.prioridad as 'alta' | 'media' | 'baja' : 'media',
    activo: String(producto.activo).toUpperCase() === 'SI',
  };
}

export default function AbastecimientoPage() {
  const [productos, setProductos] = useState<ProductoAdmin[]>([]);
  const [caja, setCaja] = useState<CajaCompraAdmin | null>(null);
  const [saldo, setSaldo] = useState(0); const [efectivo, setEfectivo] = useState(0);
  const [presupuesto, setPresupuesto] = useState(0); const [responsable, setResponsable] = useState('');
  const [estado, setEstado] = useState('Cargando información TEST...');
  const intentoCaja = useRef<IntentoIdempotente | null>(null);

  async function cargar() {
    try {
      const [p, c] = await Promise.all([solicitarAdmin<ProductoAdmin[]>('/api/admin/productos'), solicitarAdmin<CajaCompraAdmin>('/api/admin/caja-compra')]);
      setProductos(p); setCaja(c); setEstado('');
      const ultimo = c.ultimo_registro;
      if (ultimo) setPresupuesto(Number(ultimo.presupuesto_confirmado || ultimo.presupuesto_calculado || 0));
    } catch (error) { setEstado(error instanceof Error ? error.message : 'No se pudo cargar abastecimiento.'); }
  }
  useEffect(() => { void cargar(); }, []);
  const propuesta = useMemo(() => proponerAbastecimiento(productos.map(productoParaPropuesta), presupuesto), [productos, presupuesto]);

  async function guardarCaja(evento: FormEvent) {
    evento.preventDefault();
    try {
      const payload = { saldo_cuenta: saldo, efectivo_disponible: efectivo, pendientes_referencia: caja?.pendientes_por_cobrar ?? 0, presupuesto_confirmado: presupuesto, responsable, observaciones: 'Caja para abastecimiento TEST' };
      intentoCaja.current = resolverIntentoIdempotente(intentoCaja.current, 'CAJA', payload);
      await solicitarAdmin('/api/admin/caja-compra', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, idempotency_key: intentoCaja.current.clave }) });
      intentoCaja.current = null;
      setEstado('Caja TEST registrada y auditada.'); await cargar();
    } catch (error) { setEstado(error instanceof Error ? error.message : 'No se pudo registrar la caja.'); }
  }

  return <main className="min-h-screen bg-background px-4 py-8"><div className="mx-auto max-w-6xl"><AdminFase78Nav />
    <div className="mb-5 rounded-xl border-2 border-amber-400 bg-amber-50 p-4"><h1 className="font-serif text-3xl font-bold text-primary-dark">Propuesta de abastecimiento TEST</h1><p className="font-semibold text-amber-900">NO USAR COMO RECOMENDACIÓN OPERATIVA REAL</p><p className="text-sm text-amber-800">Los mínimos, costos y prioridades aún pueden ser sintéticos.</p></div>
    {estado && <p role="status" className="mb-4 rounded-lg bg-blue-50 p-3 text-sm">{estado}</p>}
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]"><form onSubmit={guardarCaja} className="space-y-3 rounded-xl bg-white p-5 shadow-sm"><h2 className="font-semibold">Caja para compra</h2>
      <label className="block text-sm">Saldo en cuenta<input type="number" min="0" step="1" value={saldo} onChange={(e) => setSaldo(Number(e.target.value))} className="mt-1 w-full rounded border p-2" /></label>
      <label className="block text-sm">Efectivo disponible<input type="number" min="0" step="1" value={efectivo} onChange={(e) => setEfectivo(Number(e.target.value))} className="mt-1 w-full rounded border p-2" /></label>
      <p className="rounded bg-gray-50 p-2 text-sm">Pendientes por cobrar: <strong>{pesos(caja?.pendientes_por_cobrar ?? 0)}</strong><br /><span className="text-xs text-gray-500">Solo referencia; no forman parte del presupuesto.</span></p>
      <label className="block text-sm">Presupuesto final confirmado<input type="number" min="0" step="1" value={presupuesto} onChange={(e) => setPresupuesto(Number(e.target.value))} className="mt-1 w-full rounded border p-2" /></label>
      <label className="block text-sm">Responsable<input required value={responsable} onChange={(e) => setResponsable(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
      <button className="rounded bg-primary px-4 py-2 font-semibold text-white">Registrar caja TEST</button>
    </form><section className="rounded-xl bg-white p-5 shadow-sm"><div className="mb-4 flex justify-between"><h2 className="font-semibold">Propuesta editable antes de comprar</h2><strong>{pesos(propuesta.total_propuesto)}</strong></div>
      {propuesta.lineas.length === 0 ? <p className="text-sm text-gray-500">No hay productos elegibles bajo mínimo con costo y presupuesto disponibles.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Producto</th><th className="p-2">Prioridad</th><th className="p-2">Cantidad</th><th className="p-2">Costo</th><th className="p-2">Subtotal</th></tr></thead><tbody>{propuesta.lineas.map((linea) => <tr key={linea.producto_id} className="border-t"><td className="p-2">{linea.nombre_producto}</td><td className="p-2">{linea.prioridad}</td><td className="p-2">{linea.cantidad_sugerida}</td><td className="p-2">{pesos(linea.costo_unitario)}</td><td className="p-2">{pesos(linea.subtotal)}</td></tr>)}</tbody></table></div>}
      <p className="mt-4 text-sm">Saldo sin asignar: {pesos(propuesta.saldo_sin_asignar)}</p>{propuesta.omitidos.length > 0 && <details className="mt-4 text-sm"><summary>{propuesta.omitidos.length} producto(s) omitido(s)</summary><ul className="mt-2 list-disc pl-5">{propuesta.omitidos.map((item) => <li key={item.producto_id}>{item.producto_id}: {item.motivo}</li>)}</ul></details>}
    </section></div>
  </div></main>;
}
