import { NextResponse } from 'next/server';
import { AppsScriptError } from '@/lib/appsScriptPedidos';
import { obtenerAperturaActivaPedidosTest } from '@/lib/fase3b/aperturaActivaServer';
import { pedidosAnticipadosConCalendarioHabilitados } from '@/lib/fase3b/pedidosAnticipados';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!pedidosAnticipadosConCalendarioHabilitados(process.env.NEXT_PUBLIC_APP_ENV)) {
    return NextResponse.json({ ok: true, data: { habilitado: false, apertura: null } });
  }

  try {
    const resultado = await obtenerAperturaActivaPedidosTest();
    if (resultado.tipo === 'conflicto') {
      return NextResponse.json({ ok: false, error: resultado.error }, { status: 409 });
    }
    return NextResponse.json({
      ok: true,
      data: {
        habilitado: true,
        apertura: resultado.tipo === 'disponible' ? resultado.apertura : null,
      },
    });
  } catch (err) {
    const status = err instanceof AppsScriptError ? err.status : 500;
    const error = err instanceof Error ? err.message : 'No se pudo consultar la apertura activa.';
    return NextResponse.json({ ok: false, error }, { status });
  }
}
