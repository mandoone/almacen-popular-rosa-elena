import { notFound } from 'next/navigation';
import { obtenerEntornoAplicacion } from '@/lib/env';
import FamiliasPreparacionC7c from '@/components/admin/FamiliasPreparacionC7c';

export const dynamic = 'force-dynamic';
export default function Page() {
  if (obtenerEntornoAplicacion(process.env.NEXT_PUBLIC_APP_ENV) !== 'test') notFound();
  return <FamiliasPreparacionC7c />;
}
