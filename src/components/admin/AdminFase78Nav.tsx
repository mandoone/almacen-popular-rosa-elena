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
  ['/admin/familias', 'Familias y SKU · TEST', 'productos:gestionar'],
];

export default function AdminFase78Nav() {
  const { tiene } = useSesionAdmin();
  return (
    <nav aria-label="Administración operativa" className="mb-6 flex flex-wrap gap-2">
      {enlaces.filter(([href, , capacidad]) => tiene(capacidad) && (href !== '/admin/familias' || process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase() === 'test')).map(([href, label]) => (
        <Link key={href} href={href} className="rounded-full border border-primary/30 bg-white px-3 py-2 text-sm font-medium text-primary-dark hover:bg-primary/10">
          {label}
        </Link>
      ))}
    </nav>
  );
}
