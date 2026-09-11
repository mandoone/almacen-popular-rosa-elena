import { NextResponse } from 'next/server';
import {
  AppsScriptError,
  crearVentaPresencial,
  listarAperturas,
  listarCatalogoVentaPresencial,
} from '@/lib/appsScriptPedidos';
import { validarSolicitudVentaPresencial } from '@/lib/fase5/ventaPresencial';

export const dynamic = 'force-dynamic';

function manejarError(err: unknown) {
  const status = err instanceof AppsScriptError ? err.status : 500;
  const message = err instanceof Error ? err.message : 'Error inesperado.';
  return NextResponse.json({ ok: false, error: message }, { status });
}

function idempotencyKeyValida(valor: unknown): valor is string {
  return typeof valor === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(valor);
}

/** Datos de preparación del panel vendedor, siempre resueltos contra TEST. */
export async function GET() {
  try {
    const [productos, aperturas] = await Promise.all([
      listarCatalogoVentaPresencial(),
      listarAperturas(),
    ]);
    return NextResponse.json({ ok: true, data: { productos, aperturas } });
  } catch (err) {
    return manejarError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !idempotencyKeyValida(body.idempotency_key)) {
      return NextResponse.json(
        { ok: false, error: 'Falta una idempotency_key válida.' },
        { status: 400 }
      );
    }
    const validacion = validarSolicitudVentaPresencial(body);
    if (!validacion.ok) {
      return NextResponse.json(
        { ok: false, error: validacion.error },
        { status: 400 }
      );
    }
    const venta = await crearVentaPresencial(validacion.venta, body.idempotency_key);
    return NextResponse.json({ ok: true, data: venta }, { status: 201 });
  } catch (err) {
    return manejarError(err);
  }
}
