import { NextResponse } from 'next/server';
import { obtenerPropuestaAbastecimientoAdmin } from '@/lib/appsScriptPedidos';
import { respuestaErrorAdmin } from '@/lib/fase8/apiAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const presupuestoTexto = new URL(req.url).searchParams.get('presupuesto') ?? '';
    const presupuesto = Number(presupuestoTexto);
    if (!presupuestoTexto || !Number.isSafeInteger(presupuesto) || presupuesto < 0) {
      return NextResponse.json({ ok: false, error: 'Presupuesto inválido.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: await obtenerPropuestaAbastecimientoAdmin(presupuesto) });
  } catch (error) {
    return respuestaErrorAdmin(error);
  }
}
