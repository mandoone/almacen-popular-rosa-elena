'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ComandaVenta,
  type VentaConComanda,
} from '@/components/admin/ComandaVenta';
import { esVentaIdValido } from '@/lib/fase5/ventaPresencial';

async function datosRespuesta(respuesta: Response): Promise<VentaConComanda> {
  const json = await respuesta.json().catch(() => null);
  if (respuesta.status === 401) {
    throw new Error('La sesión expiró. Vuelve a iniciar sesión.');
  }
  if (!respuesta.ok || !json?.ok) {
    throw new Error(json?.error || 'No se pudo cargar la venta.');
  }
  return json.data as VentaConComanda;
}

export default function ComandaVentaPage({ params }: { params: { id: string } }) {
  const [resultado, setResultado] = useState<VentaConComanda | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activa = true;
    setResultado(null);
    setError(null);

    if (!esVentaIdValido(params.id)) {
      setError('El identificador de venta no es válido.');
      return () => { activa = false; };
    }

    fetch(`/api/admin/ventas/${encodeURIComponent(params.id)}`, {
      cache: 'no-store',
    })
      .then(datosRespuesta)
      .then((data) => { if (activa) setResultado(data); })
      .catch((err) => {
        if (activa) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar la venta.');
        }
      });

    return () => { activa = false; };
  }, [params.id]);

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-gray-700 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl print:max-w-none">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div>
            <h1 className="font-serif text-2xl font-bold text-primary-dark">Comanda de venta</h1>
            <p className="text-sm text-gray-500">Consulta y reimpresión sin registrar una venta nueva.</p>
          </div>
          <Link className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm" href="/admin/vendedor">
            Volver al vendedor
          </Link>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {!error && !resultado && (
          <p className="py-16 text-center text-sm text-gray-500">Cargando comanda TEST...</p>
        )}
        {resultado && <ComandaVenta resultado={resultado} />}
      </div>
    </main>
  );
}
