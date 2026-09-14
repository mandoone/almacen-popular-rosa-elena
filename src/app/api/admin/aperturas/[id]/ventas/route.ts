import { NextResponse } from 'next/server';
import { AppsScriptError, listarVentasPorApertura } from '@/lib/appsScriptPedidos';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const ventas = await listarVentasPorApertura(id);
    return NextResponse.json({ ok: true, data: ventas });
  } catch (err) {
    const status = err instanceof AppsScriptError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
