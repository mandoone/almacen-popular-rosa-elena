import { NextResponse } from 'next/server';
import { crearCompraAdmin, listarComprasAdmin } from '@/lib/appsScriptPedidos';
import { filtrosLectura, idempotencyKeyValida, respuestaErrorAdmin } from '@/lib/fase8/apiAdmin';
import { actorIdFromRequest } from '@/lib/session';
import { dtoCompraAdmin } from '@/lib/fase9/dtoAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { desde, hasta } = filtrosLectura(req.url);
    return NextResponse.json({ ok: true, data: await listarComprasAdmin({ desde, hasta }) });
  } catch (error) { return respuestaErrorAdmin(error); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !idempotencyKeyValida(body.idempotency_key)) {
      return NextResponse.json({ ok: false, error: 'Falta idempotency_key válida.' }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      data: await crearCompraAdmin(dtoCompraAdmin(body), actorIdFromRequest(req)),
    }, { status: 201 });
  } catch (error) { return respuestaErrorAdmin(error); }
}
