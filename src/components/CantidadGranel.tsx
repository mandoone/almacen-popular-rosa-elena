'use client';
import { useEffect, useRef, useState } from 'react';
import { formatoPeso, subtotalVenta } from '@/lib/granel';
import { gramosDesdeEntrada } from '@/lib/fase8/inventario';

export default function CantidadGranel({ nombre, cantidad, onCantidad, precio, gramosReferencia, stockGramos }: {
  nombre: string; cantidad: number; onCantidad: (g: number) => void; precio?: number; gramosReferencia?: number; stockGramos?: number;
}) {
  const [unidad, setUnidad] = useState<'g' | 'kg'>('g');
  const [texto, setTexto] = useState(cantidad ? String(cantidad) : '');
  const [error, setError] = useState('');
  const emitido = useRef(cantidad);
  useEffect(() => { if (cantidad !== emitido.current) { setTexto(cantidad ? String(cantidad / (unidad === 'kg' ? 1000 : 1)) : ''); setError(''); emitido.current = cantidad; } }, [cantidad, unidad]);
  function comunicar(g: number) { emitido.current = g; onCantidad(g); }
  function elegir(g: number, u = unidad) {
    setTexto(g ? String(g / (u === 'kg' ? 1000 : 1)) : ''); setError('');
    if (stockGramos !== undefined && g > stockGramos) { setError('Supera el stock disponible. Reduce el peso.'); comunicar(0); } else comunicar(g);
  }
  function escribir(t: string) {
    setTexto(t); setError(''); if (!t.trim()) return comunicar(0);
    try { const g = gramosDesdeEntrada(t, unidad); if (stockGramos !== undefined && g > stockGramos) throw new Error('Supera el stock disponible. Reduce el peso.'); comunicar(g); }
    catch (e) { setError(e instanceof Error ? e.message : 'Peso inválido.'); comunicar(0); }
  }
  const subtotal = cantidad > 0 && precio && gramosReferencia ? subtotalVenta({ modo_venta: 'GRANEL', gramos_referencia: gramosReferencia }, precio, cantidad) : null;
  return <fieldset className="min-w-0 space-y-2 text-xs"><legend className="sr-only">Peso de {nombre}</legend>
    <div className="flex flex-wrap gap-2"><label className="min-w-0 flex-1">Cantidad de {nombre}<input type="text" inputMode="decimal" value={texto} onChange={e => escribir(e.target.value)} aria-invalid={!!error} className="mt-1 w-full rounded border p-2 text-sm" placeholder={unidad === 'kg' ? 'Ej. 1,7' : 'Ej. 750'} /></label><label>Unidad de peso<select value={unidad} onChange={e => { const u = e.target.value as 'g' | 'kg'; setUnidad(u); elegir(cantidad, u); }} className="mt-1 block rounded border p-2 text-sm"><option value="g">g</option><option value="kg">kg</option></select></label></div>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={() => elegir(Math.max(0, cantidad - 100))} className="rounded border px-3 py-2">−100 g</button><button type="button" onClick={() => elegir(cantidad + 100)} className="rounded border px-3 py-2">+100 g</button>{[250, 500, 1000].map(g => <button type="button" key={g} onClick={() => elegir(g)} className="rounded border px-3 py-2">{formatoPeso(g)}</button>)}</div>
    {error && <p role="alert" className="text-red-800">{error}</p>}
    {cantidad > 0 && <p>{formatoPeso(cantidad)}{subtotal !== null ? ` · $${subtotal.toLocaleString('es-CL')}` : ''} <button type="button" onClick={() => elegir(0)} className="ml-2 underline">Quitar</button></p>}
    {stockGramos !== undefined && <p className="text-gray-600">Disponible: {formatoPeso(stockGramos)}.</p>}
    <p className="text-gray-600">Gramos enteros libres. Total redondeado al peso chileno; el servidor confirma el cálculo.</p>
  </fieldset>;
}
