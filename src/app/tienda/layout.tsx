import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tienda',
  description: 'Catálogo y pedidos anticipados para las aperturas del Almacén Popular Rosa Elena Morales.',
};

export default function TiendaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
