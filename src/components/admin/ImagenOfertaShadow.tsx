'use client';
import Image from 'next/image';
import { useState } from 'react';
import type { ImagenPublicaC7 } from '@/lib/familias/imagenPublicaC7';
/** Representación neutral reutilizable; no logos, marcas físicas ni fotos de SKU. */
export default function ImagenOfertaShadow({ imagen }: { imagen: ImagenPublicaC7 }) {
  const [fallo,setFallo]=useState(false);
  return <figure className="my-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
    {imagen.origen==='IMAGEN_FAMILIA'&&imagen.url&&!fallo
      ? <Image src={imagen.url} alt={imagen.nombre_publico} width={640} height={320} unoptimized onError={()=>setFallo(true)} className="h-40 w-full object-contain" />
      : <div role="img" aria-label={`${imagen.nombre_publico}. Representación neutral sin marca física.`} className="flex min-h-36 flex-col items-center justify-center gap-2 text-center text-primary-dark">
        <svg aria-hidden="true" width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 16h24l3 27H9l3-27Z"/><path d="M18 17v-5a6 6 0 0 1 12 0v5"/></svg>
        <span className="text-xs uppercase tracking-wide">{imagen.categoria}</span><span className="font-medium">{imagen.nombre_publico}</span>
        {imagen.economico&&<span className="rounded-full bg-white px-3 py-1 text-xs font-semibold">ECONÓMICO</span>}
      </div>}
    <figcaption className="mt-2 text-xs text-gray-600">Origen: {fallo?'SIN_IMAGEN':imagen.origen}{fallo?' · No se pudo cargar; se muestra placeholder.':''}</figcaption>
    {imagen.avisos.length>0&&<ul className="mt-2 list-inside list-disc text-sm text-amber-900">{imagen.avisos.map(a=><li key={a}>{a}</li>)}</ul>}
  </figure>;
}
