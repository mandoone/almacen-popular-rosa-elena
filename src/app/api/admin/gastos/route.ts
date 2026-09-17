import { NextResponse } from 'next/server';
import { crearGastoExtraAdmin, listarGastosExtraAdmin } from '@/lib/appsScriptPedidos';
import { filtrosLectura, idempotencyKeyValida, respuestaErrorAdmin } from '@/lib/fase8/apiAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { desde, hasta } = filtrosLectura(req.url);
    return NextResponse.json({ ok: true, data: await listarGastosExtraAdmin({ desde, hasta }) });
  } catch (error) { return respuestaErrorAdmin(error); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !idempotencyKeyValida(body.idempotency_key)) {
      return NextResponse.json({ ok: false, error: 'Falta idempotency_key válida.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: await crearGastoExtraAdmin(body) }, { status: 201 });
  } catch (error) { return respuestaErrorAdmin(error); }
}
