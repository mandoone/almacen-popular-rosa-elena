import { NextResponse } from 'next/server';
import { ajustarStockAdmin } from '@/lib/appsScriptPedidos';
import { idempotencyKeyValida, respuestaErrorAdmin } from '@/lib/fase8/apiAdmin';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !idempotencyKeyValida(body.idempotency_key)) {
      return NextResponse.json({ ok: false, error: 'Falta idempotency_key válida.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: await ajustarStockAdmin(body) });
  } catch (error) { return respuestaErrorAdmin(error); }
}
