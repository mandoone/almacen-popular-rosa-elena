import Link from 'next/link';

const enlaces = [
  ['/admin', 'Pedidos'],
  ['/admin/compras', 'Compras'],
  ['/admin/gastos', 'Gastos'],
  ['/admin/abastecimiento', 'Abastecimiento'],
  ['/admin/historiales', 'Historiales y reportes'],
  ['/admin/productos', 'Productos y stock'],
] as const;

export default function AdminFase78Nav() {
  return (
    <nav aria-label="Administración operativa" className="mb-6 flex flex-wrap gap-2">
      {enlaces.map(([href, label]) => (
        <Link key={href} href={href} className="rounded-full border border-primary/30 bg-white px-3 py-2 text-sm font-medium text-primary-dark hover:bg-primary/10">
          {label}
        </Link>
      ))}
    </nav>
  );
}
