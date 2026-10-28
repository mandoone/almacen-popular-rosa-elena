import { NextResponse } from 'next/server';
import { ajustarStockAdmin, listarMovimientosStockAdmin } from '@/lib/appsScriptPedidos';
import { idempotencyKeyValida, respuestaErrorAdmin } from '@/lib/fase8/apiAdmin';
import { actorIdFromRequest } from '@/lib/session';
import { dtoAjusteStockAdmin } from '@/lib/fase9/dtoAdmin';

export const dynamic = 'force-dynamic';
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const id = p.get('producto_id') ?? '', key = p.get('referencia_id') ?? '';
  if (!/^PROD-[A-Za-z0-9-]{1,80}$/.test(id) || !idempotencyKeyValida(key)) return NextResponse.json({ ok: false, error: 'Referencia de ajuste inválida.' }, { status: 400 });
  try { return NextResponse.json({ ok: true, data: (await listarMovimientosStockAdmin(id)).filter(m => m.referencia_tipo === 'ajuste_admin' && m.referencia_id === key) }, { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (error) { return respuestaErrorAdmin(error); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !idempotencyKeyValida(body.idempotency_key)) {
      return NextResponse.json({ ok: false, error: 'Falta idempotency_key válida.' }, { status: 400 });
    }
    if (body.stock_esperado !== undefined && (typeof body.stock_esperado !== 'number' || !Number.isFinite(body.stock_esperado) || body.stock_esperado < 0)) {
      return NextResponse.json({ok:false,error:'Stock esperado inválido.'},{status:400});
    }
    return NextResponse.json({
      ok: true,
      data: await ajustarStockAdmin(dtoAjusteStockAdmin(body), actorIdFromRequest(req)),
    });
  } catch (error) { return respuestaErrorAdmin(error); }
}
