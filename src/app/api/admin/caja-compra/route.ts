import { NextResponse } from 'next/server';
import { obtenerCajaCompraAdmin, registrarCajaCompraAdmin } from '@/lib/appsScriptPedidos';
import { idempotencyKeyValida, respuestaErrorAdmin } from '@/lib/fase8/apiAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try { return NextResponse.json({ ok: true, data: await obtenerCajaCompraAdmin() }); }
  catch (error) { return respuestaErrorAdmin(error); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !idempotencyKeyValida(body.idempotency_key)) {
      return NextResponse.json({ ok: false, error: 'Falta idempotency_key válida.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true, data: await registrarCajaCompraAdmin(body) }, { status: 201 });
  } catch (error) { return respuestaErrorAdmin(error); }
}
