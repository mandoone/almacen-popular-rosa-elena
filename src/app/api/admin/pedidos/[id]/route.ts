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
import { actorIdFromRequest, sesionTieneCapacidad } from '@/lib/session';
import { capacidadParaCambioPedido } from '@/lib/fase9/autorizacion';
import { idempotencyKeyValida } from '@/lib/fase8/apiAdmin';
import {
  ejecutarMutacionDurableConReplay,
  ejecutarTransicionSimpleConReadback,
  esConfirmacionDurableReintentable,
  esTransicionSimpleReconciliable,
} from '@/lib/fase9/resilienciaPedidos';

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
// La lectura previa mejora el mensaje al usuario; la autoridad real vive dentro
// de Apps Script, que relee bajo LockService y verifica el plan durable por readback.
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
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const data = await obtenerPedido(id);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return manejarError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    let estadoActual = '';
    if (body.estado_pedido) {
      const lecturaActual = await obtenerPedido(id);
      estadoActual = String(lecturaActual.pedido?.estado_pedido ?? '');
      const decision = decidirPatchEstado(estadoActual, body.estado_pedido);
      if (!decision.permitido) return rechazo(decision);
    }
    if (body.estado_pedido && !idempotencyKeyValida(body.idempotency_key)) {
      return NextResponse.json(
        { ok: false, error: 'Falta una idempotency_key válida.' },
        { status: 400 }
      );
    }

    const capacidad = capacidadParaCambioPedido(body.estado_pedido);
    if (!sesionTieneCapacidad(req, capacidad)) {
      return NextResponse.json({ ok: false, error: 'Acceso denegado.' }, { status: 403 });
    }

    const actor = actorIdFromRequest(req);
    const estadoObjetivo = String(body.estado_pedido || '');
    const input = {
      id_pedido: id,
      estado_pedido: estadoObjetivo,
      estado_pago: body.estado_pago ? String(body.estado_pago) : undefined,
      actor,
      idempotency_key: String(body.idempotency_key || ''),
    };
    const ejecutar = () => actualizarEstadoPedido(input);
    let data: unknown;
    if (esConfirmacionDurableReintentable(
      estadoActual,
      estadoObjetivo,
      Boolean(body.estado_pago)
    )) {
      data = await ejecutarMutacionDurableConReplay(ejecutar);
    } else if (esTransicionSimpleReconciliable(
      estadoActual,
      estadoObjetivo,
      Boolean(body.estado_pago)
    )) {
      data = await ejecutarTransicionSimpleConReadback({
        ejecutar,
        leerPedido: () => obtenerPedido(id),
        idPedido: id,
        estadoObjetivo,
        actor,
      });
    } else {
      data = await ejecutar();
    }
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return manejarError(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    if (!idempotencyKeyValida(body.idempotency_key)) {
      return NextResponse.json(
        { ok: false, error: 'Falta una idempotency_key válida.' },
        { status: 400 }
      );
    }
    const lecturaActual = await obtenerPedido(id);
    const estadoActual = String(lecturaActual.pedido?.estado_pedido ?? '');
    const decision = decidirCancelacion(estadoActual);
    // CANCELADO puede ser el resultado de una primera llamada cuya respuesta se
    // perdió. Se delega al diario para distinguir la misma key de una key nueva.
    if (!decision.permitido && estadoActual !== 'cancelado') return rechazo(decision);

    const actor = actorIdFromRequest(req);
    const idempotencyKey = String(body.idempotency_key);
    const data = await ejecutarMutacionDurableConReplay(() =>
      cancelarPedido(id, actor, idempotencyKey)
    );
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return manejarError(err);
  }
}
