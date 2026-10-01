'use client';

import { useEffect, useRef, useState } from 'react';
import type { ProductoPorAperturaAdmin } from '@/lib/appsScriptPedidos';
import { resolverIntentoIdempotente, solicitarAdmin, type IntentoIdempotente } from '@/lib/fase8/clienteAdmin';

export default function ProductosPorApertura({ aperturaId }: { aperturaId: string }) {
  const [productos, setProductos] = useState<ProductoPorAperturaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [lectura, setLectura] = useState(0);
  const intento = useRef<IntentoIdempotente | null>(null);
  const url = `/api/admin/aperturas/${encodeURIComponent(aperturaId)}/productos`;

  useEffect(() => {
    const controller = new AbortController();
    setCargando(true);
    setError('');
    solicitarAdmin<ProductoPorAperturaAdmin[]>(url, { signal: controller.signal })
      .then((lista) => { if (!controller.signal.aborted) setProductos(lista); })
      .catch((err) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'No se pudo consultar la oferta.'); })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, [url, lectura]);

  async function cambiar(producto: ProductoPorAperturaAdmin) {
    if (ocupado) return;
    setOcupado(true);
    setError('');
    const payload = { producto_id: producto.producto_id, habilitado: !producto.habilitado, habilitado_esperado: producto.habilitado };
    intento.current = resolverIntentoIdempotente(intento.current, 'OFERTA', payload);
    try {
      const lista = await solicitarAdmin<ProductoPorAperturaAdmin[]>(url, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, idempotency_key: intento.current.clave }),
      });
      setProductos(lista);
      intento.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Actualiza antes de reintentar si cambió la oferta.');
    } finally { setOcupado(false); }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4" aria-busy={cargando || ocupado}>
      <p className="text-sm text-gray-600">Productos especiales para esta apertura. El precio vigente se gestiona en Productos.</p>
      <button type="button" disabled={cargando || ocupado} onClick={() => { intento.current = null; setLectura((actual) => actual + 1); }} className="rounded-md border border-gray-200 px-3 py-1 text-sm disabled:opacity-50">Actualizar oferta</button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {cargando ? <p className="text-sm">Consultando oferta...</p> : productos.length === 0 ? (
        <p className="text-sm">No hay productos por apertura en el catálogo.</p>
      ) : productos.map((producto) => (
        <label key={producto.producto_id} className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={producto.habilitado} onChange={() => cambiar(producto)}
            disabled={ocupado || (producto.activo !== 'SI' && !producto.habilitado)} />
          <span>{producto.nombre}{producto.activo !== 'SI' ? ' (inactivo, no se ofrece)' : ''}</span>
        </label>
      ))}
    </div>
  );
}
