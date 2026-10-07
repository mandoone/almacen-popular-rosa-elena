import { NextResponse } from 'next/server';
import { actualizarProductoAdmin } from '@/lib/appsScriptPedidos';
import { idempotencyKeyValida, respuestaErrorAdmin } from '@/lib/fase8/apiAdmin';
import { actorIdFromRequest, sesionTieneCapacidad } from '@/lib/session';
import { obtenerEntornoAplicacion } from '@/lib/env';
import { dtoIdentidadSkuAdmin } from '@/lib/familiasAdmin';

export async function PATCH(req: Request) {
  if (obtenerEntornoAplicacion(process.env.NEXT_PUBLIC_APP_ENV) !== 'test' || !sesionTieneCapacidad(req, 'productos:gestionar')) return NextResponse.json({ ok: false, error: 'Solo administración TEST.' }, { status: 403 });
  try {
    const body = await req.json().catch(() => null);
    if (!body || !idempotencyKeyValida(body.idempotency_key)) return NextResponse.json({ ok: false, error: 'Falta clave idempotente válida.' }, { status: 400 });
    let input;
    try { input = dtoIdentidadSkuAdmin(body); } catch { return NextResponse.json({ ok: false, error: 'Solo se permite identidad física.' }, { status: 400 }); }
    return NextResponse.json({ ok: true, data: await actualizarProductoAdmin(input, actorIdFromRequest(req)) });
  } catch (error) { return respuestaErrorAdmin(error); }
}
