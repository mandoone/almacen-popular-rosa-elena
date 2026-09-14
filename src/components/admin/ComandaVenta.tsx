'use client';

import Link from 'next/link';

export interface LineaComandaVenta {
  detalle_id: string;
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  unidad_medida: string;
  precio_unitario: number;
  subtotal: number;
}

export interface VentaConComanda {
  venta: {
    venta_id: string;
    fecha_hora: string;
    apertura_id: string;
    total: number;
    estado_pago: string;
    forma_pago: string;
    vendedor: string;
  };
  comanda: { detalle: LineaComandaVenta[] };
}

function formatoPrecio(valor: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
  }).format(valor);
}

export function ComandaVenta({
  resultado,
  mostrarEnlacePermanente = false,
}: {
  resultado: VentaConComanda;
  mostrarEnlacePermanente?: boolean;
}) {
  const { venta, comanda } = resultado;

  return (
    <section className="rounded-xl border border-primary-light bg-white p-6 shadow-sm print:m-0 print:border-0 print:p-0 print:shadow-none">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-primary">Comanda TEST</p>
          <h1 className="break-all font-serif text-2xl font-bold text-primary-dark">
            {venta.venta_id}
          </h1>
        </div>
        <div className="flex gap-2 print:hidden">
          {mostrarEnlacePermanente && (
            <Link
              href={`/admin/ventas/${encodeURIComponent(venta.venta_id)}`}
              className="rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary"
            >
              Abrir comanda
            </Link>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Imprimir comanda
          </button>
        </div>
      </div>

      <dl className="my-4 grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-gray-400">Apertura</dt><dd>{venta.apertura_id}</dd></div>
        <div><dt className="text-gray-400">Fecha</dt><dd>{venta.fecha_hora}</dd></div>
        <div><dt className="text-gray-400">Vendedor/a</dt><dd>{venta.vendedor}</dd></div>
        <div><dt className="text-gray-400">Pago</dt><dd>{venta.forma_pago} · {venta.estado_pago}</dd></div>
      </dl>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">Producto</th>
            <th>Cantidad</th>
            <th className="text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {comanda.detalle.map((linea) => (
            <tr key={linea.detalle_id} className="border-b border-gray-100">
              <td className="py-2">{linea.nombre_producto}</td>
              <td>{linea.cantidad} {linea.unidad_medida}</td>
              <td className="text-right">{formatoPrecio(linea.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-right text-xl font-bold">
        Total {formatoPrecio(venta.total)}
      </p>
    </section>
  );
}
