import { NextResponse } from 'next/server';
import {
  obtenerPedido,
  actualizarEstadoPedido,
  cancelarPedido,
  AppsScriptError,
} from '@/lib/appsScriptPedidos';
import {
  decidirPatchEstado,
  decidirCancelacion,
  type DecisionProxy,
} from '@/lib/fase3a/proxyAdmin';

// Proxy admin por pedido:
//   GET    -> detalle (cabecera + lineas)
//   PATCH  -> actualizar estado_pedido (y estado_pago opcional)
//   POST   -> cancelar pedido (devuelve stock en el backend)
//
// Autenticacion: la cubre `src/middleware.ts` (matcher '/api/admin/:path+').
//
// VALIDACION DE TRANSICIONES (FASE 3A, etapa 1.5a):
// Antes de reenviar un cambio de estado se lee el estado actual del pedido y se
// decide con las funciones puras de `@/lib/fase3a/proxyAdmin`. Cierra por el lado
// de Next.js los hallazgos 3, 4 y 5 de docs/fase-3a/DIAGNOSTICO_ACTUAL.md.
//
// LIMITACION CONOCIDA: es un leer-luego-escribir en dos llamadas HTTP, asi que
// queda una ventana de carrera entre el GET y la escritura. Es una mitigacion
// fuerte, no una garantia; la garantia exige el bloqueo optimista dentro de Apps
// Script (ver docs/fase-3a/CONTRATO_APPS_SCRIPT_PROPUESTO.md §2).
export const dynamic = 'force-dynamic';

function manejarError(err: unknown) {
  const status = err instanceof AppsScriptError ? err.status : 500;
  const message = err instanceof Error ? err.message : 'Error inesperado.';
  return NextResponse.json({ ok: false, error: message }, { status });
}

function rechazo(decision: DecisionProxy) {
  return NextResponse.json(
    { ok: false, error: decision.motivo ?? 'Operacion no permitida.' },
    { status: decision.status ?? 409 }
  );
}

/**
 * Lee el estado actual del pedido desde la hoja.
 *
 * Usa la accion `obtenerPedido`, que YA existe en el Apps Script desplegado: no
 * hace falta ninguna accion nueva ni columna nueva para validar transiciones.
 */
async function leerEstadoActual(idPedido: string): Promise<string> {
  const { pedido } = await obtenerPedido(idPedido);
  return String(pedido?.estado_pedido ?? '');
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

    // Solo se consulta el estado actual si la peticion pretende cambiarlo; una
    // actualizacion de pago sola no necesita la llamada extra a Apps Script.
    if (body.estado_pedido) {
      const estadoActual = await leerEstadoActual(params.id);
      const decision = decidirPatchEstado(estadoActual, body.estado_pedido);
      if (!decision.permitido) return rechazo(decision);
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
    const estadoActual = await leerEstadoActual(params.id);
    const decision = decidirCancelacion(estadoActual);
    if (!decision.permitido) return rechazo(decision);

    const data = await cancelarPedido(params.id);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return manejarError(err);
  }
}
