import { NextResponse } from 'next/server';
import {
  obtenerPedido,
  actualizarEstadoPedido,
  cancelarPedido,
  AppsScriptError,
} from '@/lib/appsScriptPedidos';

// Proxy admin por pedido:
//   GET    -> detalle (cabecera + lineas)
//   PATCH  -> actualizar estado_pedido (y estado_pago opcional)
//   POST   -> cancelar pedido (devuelve stock en el backend)
//
// DEUDA TECNICA: sin autenticacion de servidor (ver docs/TASKS.md).
export const dynamic = 'force-dynamic';

function manejarError(err: unknown) {
  const status = err instanceof AppsScriptError ? err.status : 500;
  const message = err instanceof Error ? err.message : 'Error inesperado.';
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await obtenerPedido(params.id);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return manejarError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.estado_pedido && !body.estado_pago) {
      return NextResponse.json(
        { ok: false, error: 'Falta estado_pedido o estado_pago.' },
        { status: 400 }
      );
    }
    const data = await actualizarEstadoPedido({
      id_pedido: params.id,
      estado_pedido: String(body.estado_pedido || ''),
      estado_pago: body.estado_pago ? String(body.estado_pago) : undefined,
    });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return manejarError(err);
  }
}

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await cancelarPedido(params.id);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return manejarError(err);
  }
}
