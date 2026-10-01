import { NextResponse } from 'next/server';
import { configurarProductoPorAperturaAdmin, listarProductosPorAperturaAdmin } from '@/lib/appsScriptPedidos';
import { actorIdFromRequest, sesionTieneCapacidad } from '@/lib/session';
import { idempotencyKeyValida, respuestaErrorAdmin } from '@/lib/fase8/apiAdmin';

export const dynamic = 'force-dynamic';

type Contexto = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Contexto) {
  if (!sesionTieneCapacidad(req, 'productos:gestionar')) {
    return NextResponse.json({ ok: false, error: 'Acceso denegado.' }, { status: 403 });
  }
  try {
    const { id } = await params;
    return NextResponse.json({ ok: true, data: await listarProductosPorAperturaAdmin(id) });
  } catch (error) { return respuestaErrorAdmin(error); }
}

export async function PATCH(req: Request, { params }: Contexto) {
  if (!sesionTieneCapacidad(req, 'productos:gestionar')) {
    return NextResponse.json({ ok: false, error: 'Acceso denegado.' }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body || !idempotencyKeyValida(body.idempotency_key) ||
        typeof body.habilitado !== 'boolean' || typeof body.habilitado_esperado !== 'boolean' ||
        typeof body.producto_id !== 'string') {
      return NextResponse.json({ ok: false, error: 'Configuración inválida.' }, { status: 400 });
    }
    const data = await configurarProductoPorAperturaAdmin(id, {
      producto_id: body.producto_id, habilitado: body.habilitado,
      habilitado_esperado: body.habilitado_esperado, idempotency_key: body.idempotency_key,
    }, actorIdFromRequest(req));
    return NextResponse.json({ ok: true, data });
  } catch (error) { return respuestaErrorAdmin(error); }
}
