import { NextResponse } from 'next/server';
import { AppsScriptError, cambiarEstadoApertura } from '@/lib/appsScriptPedidos';
import { actorIdFromRequest } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.estado_apertura !== 'cerrada') {
      return NextResponse.json(
        { ok: false, error: 'Esta ruta solo permite cerrar una apertura.' },
        { status: 400 }
      );
    }
    if (typeof body.actualizado_en_esperado !== 'string' || !body.actualizado_en_esperado) {
      return NextResponse.json(
        { ok: false, error: 'Falta actualizado_en_esperado.' },
        { status: 400 }
      );
    }
    if (typeof body.idempotency_key !== 'string' ||
        !/^[A-Za-z0-9_-]{8,100}$/.test(body.idempotency_key)) {
      return NextResponse.json(
        { ok: false, error: 'Falta una idempotency_key valida.' },
        { status: 400 }
      );
    }
    const apertura = await cambiarEstadoApertura({
      apertura_id: id,
      estado_apertura: 'cerrada',
      actualizado_en_esperado: body.actualizado_en_esperado,
      idempotency_key: body.idempotency_key,
      actor: actorIdFromRequest(req),
    });
    return NextResponse.json({ ok: true, data: apertura });
  } catch (err) {
    const status = err instanceof AppsScriptError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
