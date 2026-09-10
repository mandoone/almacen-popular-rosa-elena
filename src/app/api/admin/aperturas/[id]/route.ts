import { NextResponse } from 'next/server';
import {
  AppsScriptError,
  actualizarApertura,
  obtenerApertura,
} from '@/lib/appsScriptPedidos';
import { validarAperturaEditable } from '@/lib/fase3b/adminAperturas';

export const dynamic = 'force-dynamic';

function manejarError(err: unknown) {
  const status = err instanceof AppsScriptError ? err.status : 500;
  const message = err instanceof Error ? err.message : 'Error inesperado.';
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const apertura = await obtenerApertura(params.id);
    return NextResponse.json({ ok: true, data: apertura });
  } catch (err) {
    return manejarError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
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
    const validacion = validarAperturaEditable(body.apertura);
    if (!validacion.ok) {
      return NextResponse.json({ ok: false, error: validacion.error }, { status: 400 });
    }
    if (validacion.apertura.apertura_id !== params.id) {
      return NextResponse.json(
        { ok: false, error: 'apertura_id no coincide con la ruta.' },
        { status: 400 }
      );
    }
    const apertura = await actualizarApertura({
      apertura_id: params.id,
      apertura: validacion.apertura,
      actualizado_en_esperado: body.actualizado_en_esperado,
      idempotency_key: body.idempotency_key,
    });
    return NextResponse.json({ ok: true, data: apertura });
  } catch (err) {
    return manejarError(err);
  }
}
