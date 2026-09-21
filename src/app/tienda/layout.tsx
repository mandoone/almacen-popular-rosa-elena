import { crearMetadataPublica } from '@/lib/fase10/metadataPublica';

export const metadata = crearMetadataPublica({
  title: 'Tienda',
  description: 'Catálogo y pedidos anticipados para las aperturas del Almacén Popular Rosa Elena Morales.',
  path: '/tienda',
});

export default function TiendaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
