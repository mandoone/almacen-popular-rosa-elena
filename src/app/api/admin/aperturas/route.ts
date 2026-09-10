import { NextResponse } from 'next/server';
import {
  AppsScriptError,
  crearApertura,
  listarAperturas,
} from '@/lib/appsScriptPedidos';
import { validarAperturaEditable } from '@/lib/fase3b/adminAperturas';

export const dynamic = 'force-dynamic';

function manejarError(err: unknown) {
  const status = err instanceof AppsScriptError ? err.status : 500;
  const message = err instanceof Error ? err.message : 'Error inesperado.';
  return NextResponse.json({ ok: false, error: message }, { status });
}

function idempotencyKeyValida(valor: unknown): valor is string {
  return typeof valor === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(valor);
}

export async function GET() {
  try {
    const aperturas = await listarAperturas();
    return NextResponse.json({ ok: true, data: aperturas });
  } catch (err) {
    return manejarError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!idempotencyKeyValida(body.idempotency_key)) {
      return NextResponse.json(
        { ok: false, error: 'Falta una idempotency_key valida.' },
        { status: 400 }
      );
    }
    const validacion = validarAperturaEditable(body.apertura);
    if (!validacion.ok) {
      return NextResponse.json({ ok: false, error: validacion.error }, { status: 400 });
    }
    const apertura = await crearApertura({
      apertura: validacion.apertura,
      idempotency_key: body.idempotency_key,
    });
    return NextResponse.json({ ok: true, data: apertura }, { status: 201 });
  } catch (err) {
    return manejarError(err);
  }
}
