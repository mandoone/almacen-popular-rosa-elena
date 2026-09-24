import { NextResponse } from 'next/server';
import { ajustarStockAdmin } from '@/lib/appsScriptPedidos';
import { idempotencyKeyValida, respuestaErrorAdmin } from '@/lib/fase8/apiAdmin';
import { actorIdFromRequest } from '@/lib/session';
import { dtoAjusteStockAdmin } from '@/lib/fase9/dtoAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !idempotencyKeyValida(body.idempotency_key)) {
      return NextResponse.json({ ok: false, error: 'Falta idempotency_key válida.' }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      data: await ajustarStockAdmin(dtoAjusteStockAdmin(body), actorIdFromRequest(req)),
    });
  } catch (error) { return respuestaErrorAdmin(error); }
}
