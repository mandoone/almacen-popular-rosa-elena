'use client';
import { useState } from 'react';
import { formatoPeso, gramosValidos } from '@/lib/granel';

export default function CantidadGranel({ nombre, cantidad, onCantidad }: { nombre: string; cantidad: number; onCantidad: (g: number) => void }) {
  const [otra, setOtra] = useState(false);
  const [texto, setTexto] = useState('');
  return <div className="space-y-2 text-xs">
    <div className="flex flex-wrap gap-1">{[250, 500, 750, 1000].map(g => <button type="button" key={g} onClick={() => onCantidad(g)} className="rounded border border-primary px-2 py-1 text-primary-dark">{formatoPeso(g)}</button>)}</div>
    <button type="button" className="underline" onClick={() => setOtra(!otra)}>Otra cantidad</button>
    {otra && <label className="block">Gramos de {nombre}<input type="number" min="1" step="1" value={texto} onChange={e => setTexto(e.target.value)} className="my-1 w-full rounded border p-2" /><button type="button" disabled={!gramosValidos(Number(texto))} onClick={() => onCantidad(Number(texto))} className="rounded bg-primary px-2 py-1 text-white disabled:opacity-40">Usar cantidad</button></label>}
    {cantidad > 0 && <p>{formatoPeso(cantidad)} en el pedido <button type="button" onClick={() => onCantidad(0)} className="ml-1 underline">Quitar</button></p>}
  </div>;
}
