/**
 * origenPedido.ts — Origen de pedido y su relación con `canal` (FASE 3B).
 *
 * Fuente de verdad operativa:
 *   docs/fase-3b/MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md (§C, §D)
 *
 * IMPORTANTE — este módulo es PURO y NO está conectado al flujo real. Hoy
 * `scripts/apps-script-pedidos.gs` escribe `canal = 'web'` fijo para todo
 * pedido (CANAL_WEB, línea 33). Este módulo resuelve el solapamiento
 * conceptual entre `canal` (medio general) y `origen_pedido` (detalle
 * operativo): `canal` se DERIVA de `origen_pedido`, nunca se ingresan por
 * separado.
 */

export const ORIGENES_PEDIDO = [
  'online_anticipado',
  'presencial_qr',
  'presencial_vendedor',
  'comanda_papel',
] as const;

export type OrigenPedido = (typeof ORIGENES_PEDIDO)[number];

export const CANALES = ['web', 'presencial'] as const;
export type Canal = (typeof CANALES)[number];

const CANAL_POR_ORIGEN: Record<OrigenPedido, Canal> = {
  online_anticipado: 'web',
  presencial_qr: 'presencial',
  presencial_vendedor: 'presencial',
  comanda_papel: 'presencial',
};

export function esOrigenPedidoValido(valor: unknown): valor is OrigenPedido {
  return (
    typeof valor === 'string' && (ORIGENES_PEDIDO as readonly string[]).includes(valor)
  );
}

/**
 * Normaliza un valor crudo (por ejemplo, leído de una fila de Sheets) a un
 * `OrigenPedido` válido. Nunca lanza excepción ni inventa un valor por
 * defecto: si el valor no es uno de los cuatro orígenes conocidos, devuelve
 * `null` para que quien llama decida cómo tratar el dato faltante o corrupto
 * (ver docs/fase-3b/PLAN_PRUEBAS_FASE_3B.md §7).
 */
export function normalizarOrigenPedido(valor: unknown): OrigenPedido | null {
  return esOrigenPedidoValido(valor) ? valor : null;
}

/**
 * Deriva el `canal` general a partir del `origen_pedido` detallado
 * (docs/fase-3b/MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md §C). `canal` no se
 * ingresa por separado para evitar que quede inconsistente con el origen.
 */
export function canalPorOrigen(origen: OrigenPedido): Canal {
  return CANAL_POR_ORIGEN[origen];
}

/** `true` para los tres orígenes que ocurren en el local durante la apertura. */
export function esOrigenPresencial(origen: OrigenPedido): boolean {
  return canalPorOrigen(origen) === 'presencial';
}
