import { NextResponse } from 'next/server';
import { AppsScriptError, obtenerResumenApertura } from '@/lib/appsScriptPedidos';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const resumen = await obtenerResumenApertura(id);
    return NextResponse.json({ ok: true, data: resumen });
  } catch (err) {
    const status = err instanceof AppsScriptError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
