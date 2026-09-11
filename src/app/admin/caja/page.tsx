'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface Apertura {
  apertura_id: string;
  fecha_apertura: string;
  lugar: string;
  estado_apertura: string;
}

interface Resumen {
  apertura_id: string;
  total_pedidos_anticipados: number;
  total_ventas_presenciales: number;
  total_general: number;
  cantidad_pedidos_anticipados: number;
  cantidad_ventas_presenciales: number;
  total_pendiente_pago: number;
  cantidad_pendientes_pago: number;
  total_cancelado: number;
  cantidad_cancelados: number;
  total_cobrado: number;
  total_efectivo_esperado: number;
  total_transferencia: number;
  total_efectivo_al_retirar: number;
  advertencias: string[];
}

function formatoPrecio(valor: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(valor);
}

async function datosRespuesta(res: Response) {
  const json = await res.json().catch(() => null);
  if (res.status === 401) throw new Error('La sesión expiró. Vuelve a iniciar sesión.');
  if (!res.ok || !json?.ok) throw new Error(json?.error || 'La operación no pudo completarse.');
  return json.data;
}

export default function CajaPorAperturaPage() {
  const [aperturas, setAperturas] = useState<Apertura[]>([]);
  const [aperturaId, setAperturaId] = useState('');
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargarAperturas() {
      try {
        const data = await datosRespuesta(await fetch('/api/admin/aperturas', { cache: 'no-store' }));
        const lista = data as Apertura[];
        setAperturas(lista);
        setAperturaId(lista[0]?.apertura_id ?? '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las aperturas.');
      } finally {
        setCargando(false);
      }
    }
    cargarAperturas();
  }, []);

  const cargarResumen = useCallback(async () => {
    if (!aperturaId) {
      setResumen(null);
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const data = await datosRespuesta(await fetch(
        `/api/admin/aperturas/${encodeURIComponent(aperturaId)}/resumen`,
        { cache: 'no-store' }
      ));
      setResumen(data as Resumen);
    } catch (err) {
      setResumen(null);
      setError(err instanceof Error ? err.message : 'No se pudo calcular el resumen.');
    } finally {
      setCargando(false);
    }
  }, [aperturaId]);

  useEffect(() => { cargarResumen(); }, [cargarResumen]);

  const tarjetas = resumen ? [
    ['Ventas presenciales', resumen.total_ventas_presenciales, `${resumen.cantidad_ventas_presenciales} ventas`],
    ['Pedidos anticipados', resumen.total_pedidos_anticipados, `${resumen.cantidad_pedidos_anticipados} pedidos`],
    ['Total vigente', resumen.total_general, 'No incluye cancelados'],
    ['Pendiente por cobrar', resumen.total_pendiente_pago, `${resumen.cantidad_pendientes_pago} pendientes`],
    ['Efectivo esperado', resumen.total_efectivo_esperado, 'Incluye efectivo al retirar cobrado'],
    ['Transferencias', resumen.total_transferencia, 'Pagos registrados'],
  ] as const : [];

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-gray-700">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-primary-dark">Caja por apertura</h1>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">TEST</span>
            </div>
            <p className="text-sm text-gray-500">Cierre de lectura / borrador. Esta vista no cierra ni modifica la apertura.</p>
          </div>
          <nav className="flex gap-2 text-sm">
            <Link className="rounded-md border border-gray-200 bg-white px-3 py-2" href="/admin">Pedidos</Link>
            <Link className="rounded-md border border-gray-200 bg-white px-3 py-2" href="/admin/vendedor">Vendedor</Link>
          </nav>
        </header>

        <section className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <label className="block max-w-xl text-sm">Apertura
            <select
              value={aperturaId}
              onChange={(event) => setAperturaId(event.target.value)}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2"
            >
              <option value="">Selecciona una apertura</option>
              {aperturas.map((apertura) => (
                <option key={apertura.apertura_id} value={apertura.apertura_id}>
                  {apertura.fecha_apertura} · {apertura.lugar} · {apertura.estado_apertura}
                </option>
              ))}
            </select>
          </label>
        </section>

        {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {cargando && <p className="py-16 text-center text-sm text-gray-500">Calculando resumen TEST...</p>}

        {!cargando && resumen && (
          <>
            {(resumen.advertencias.length > 0 || resumen.cantidad_pendientes_pago > 0) && (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-semibold">Revisión necesaria antes de un cierre futuro</p>
                <ul className="mt-1 list-disc pl-5">
                  {resumen.cantidad_pendientes_pago > 0 && <li>Hay pagos pendientes por cobrar.</li>}
                  {resumen.advertencias.map((aviso) => <li key={aviso}>{aviso}</li>)}
                </ul>
              </div>
            )}

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tarjetas.map(([titulo, total, detalle]) => (
                <article key={titulo} className="rounded-xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-gray-500">{titulo}</p>
                  <p className="mt-1 text-2xl font-bold text-primary-dark">{formatoPrecio(total)}</p>
                  <p className="mt-1 text-xs text-gray-400">{detalle}</p>
                </article>
              ))}
            </section>

            <section className="mt-5 grid gap-4 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-3">
              <div><p className="text-sm text-gray-500">Total cobrado</p><strong>{formatoPrecio(resumen.total_cobrado)}</strong></div>
              <div><p className="text-sm text-gray-500">Efectivo al retirar</p><strong>{formatoPrecio(resumen.total_efectivo_al_retirar)}</strong></div>
              <div><p className="text-sm text-gray-500">Cancelados separados</p><strong>{resumen.cantidad_cancelados} · {formatoPrecio(resumen.total_cancelado)}</strong></div>
            </section>

            <p className="mt-4 text-xs text-gray-500">
              Gastos extra y cierre definitivo siguen pendientes de una decisión operativa; esta entrega no inventa tablas ni cambia estados.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
