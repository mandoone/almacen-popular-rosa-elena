import { notFound } from 'next/navigation';
import { obtenerEntornoAplicacion } from '@/lib/env';
import FamiliasAdmin from '@/components/admin/FamiliasAdmin';

export const dynamic = 'force-dynamic';
export default function Page() {
  if (obtenerEntornoAplicacion(process.env.NEXT_PUBLIC_APP_ENV) !== 'test') notFound();
  return <FamiliasAdmin />;
}
