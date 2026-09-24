import { RESPUESTA_POST_MUTACION_AMBIGUA } from '../appsScriptRespuesta.ts';

interface ErrorAppsScriptClasificado {
  tipoFallo?: string;
}

interface PedidoReadback {
  pedido?: {
    id_pedido?: unknown;
    estado_pedido?: unknown;
    estado_pago?: unknown;
    vendedor_admin?: unknown;
  };
}

export interface ResultadoTransicionReconciliada {
  id_pedido: string;
  estado_pedido: string;
  estado_pago?: string;
  actor: string;
  stock_actualizado: false;
  reconciliado: true;
}

export function esRespuestaPostMutacionAmbigua(error: unknown): boolean {
  return typeof error === 'object' && error !== null &&
    (error as ErrorAppsScriptClasificado).tipoFallo === RESPUESTA_POST_MUTACION_AMBIGUA;
}

/**
 * Un único replay controlado. La clausura conserva exactamente pedido, actor,
 * payload e idempotency_key; cualquier segundo fallo se propaga sin tercer POST.
 */
export async function ejecutarMutacionDurableConReplay<T>(
  ejecutar: () => Promise<T>
): Promise<T> {
  try {
    return await ejecutar();
  } catch (error) {
    if (!esRespuestaPostMutacionAmbigua(error)) throw error;
    return ejecutar();
  }
}

/**
 * Las transiciones sin stock no repiten POST. Solo se reconcilian cuando el
 * readback demuestra pedido, estado objetivo y actor de la sesión.
 */
export async function ejecutarTransicionSimpleConReadback<T>(args: {
  ejecutar: () => Promise<T>;
  leerPedido: () => Promise<PedidoReadback>;
  idPedido: string;
  estadoObjetivo: string;
  actor: string;
}): Promise<T | ResultadoTransicionReconciliada> {
  try {
    return await args.ejecutar();
  } catch (error) {
    if (!esRespuestaPostMutacionAmbigua(error)) throw error;

    let lectura: PedidoReadback;
    try {
      lectura = await args.leerPedido();
    } catch {
      throw error;
    }
    const pedido = lectura.pedido;
    if (
      String(pedido?.id_pedido ?? '') !== args.idPedido ||
      String(pedido?.estado_pedido ?? '') !== args.estadoObjetivo ||
      String(pedido?.vendedor_admin ?? '') !== args.actor
    ) {
      throw error;
    }

    return {
      id_pedido: args.idPedido,
      estado_pedido: args.estadoObjetivo,
      estado_pago: pedido?.estado_pago === undefined
        ? undefined
        : String(pedido.estado_pago),
      actor: args.actor,
      stock_actualizado: false,
      reconciliado: true,
    };
  }
}

export function esConfirmacionDurableReintentable(
  estadoActual: string,
  estadoObjetivo: string,
  incluyeCambioPago: boolean
): boolean {
  if (estadoObjetivo !== 'pendiente') return false;
  if (estadoActual === 'recibido') return true;
  return estadoActual === 'pendiente' && !incluyeCambioPago;
}

export function esTransicionSimpleReconciliable(
  estadoActual: string,
  estadoObjetivo: string,
  incluyeCambioPago: boolean
): boolean {
  if (incluyeCambioPago) return false;
  return (estadoObjetivo === 'listo' &&
      (estadoActual === 'pendiente' || estadoActual === 'listo')) ||
    (estadoObjetivo === 'entregado' &&
      (estadoActual === 'listo' || estadoActual === 'entregado'));
}
