import { NextResponse } from 'next/server';
import { obtenerEntornoAplicacion } from '@/lib/env';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'web-almacen-popular',
      environment: obtenerEntornoAplicacion(process.env.NEXT_PUBLIC_APP_ENV),
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
