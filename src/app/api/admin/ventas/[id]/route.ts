import { NextResponse } from 'next/server';
import { AppsScriptError, obtenerVentaPresencial } from '@/lib/appsScriptPedidos';
import { esVentaIdValido } from '@/lib/fase5/ventaPresencial';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!esVentaIdValido(params.id)) {
    return NextResponse.json(
      { ok: false, error: 'venta_id inválida.' },
      { status: 400 }
    );
  }
  try {
    const venta = await obtenerVentaPresencial(params.id);
    return NextResponse.json({ ok: true, data: venta });
  } catch (err) {
    const status = err instanceof AppsScriptError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
