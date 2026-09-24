'use client';

import Link from 'next/link';
import { useSesionAdmin } from '@/lib/fase9/useSesionAdmin';
import type { Capacidad } from '@/lib/fase9/roles';

const enlaces: ReadonlyArray<readonly [string, string, Capacidad]> = [
  ['/admin', 'Pedidos', 'pedidos:ver'],
  ['/admin/vendedor', 'Panel vendedor', 'venta_presencial:registrar'],
  ['/admin/compras', 'Compras', 'compras:gestionar'],
  ['/admin/gastos', 'Gastos', 'gastos:gestionar'],
  ['/admin/abastecimiento', 'Abastecimiento', 'abastecimiento:gestionar'],
  ['/admin/historiales', 'Historiales y reportes', 'reportes:ver'],
  ['/admin/productos', 'Productos y stock', 'stock:ver'],
];

export default function AdminFase78Nav() {
  const { tiene } = useSesionAdmin();
  return (
    <nav aria-label="Administración operativa" className="mb-6 flex flex-wrap gap-2">
      {enlaces.filter(([, , capacidad]) => tiene(capacidad)).map(([href, label]) => (
        <Link key={href} href={href} className="rounded-full border border-primary/30 bg-white px-3 py-2 text-sm font-medium text-primary-dark hover:bg-primary/10">
          {label}
        </Link>
      ))}
    </nav>
  );
}
