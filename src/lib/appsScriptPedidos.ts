/**
 * appsScriptPedidos.ts — Helper de SERVIDOR para hablar con la Web App de Apps
 * Script (backend de pedidos reales o, si `NEXT_PUBLIC_APP_ENV=test`, backend
 * de pruebas — ver docs/fase-3b/ENTORNO_TEST_FASE_3B.md).
 *
 * IMPORTANTE:
 *   - Solo debe usarse desde route handlers / código de servidor. NUNCA importar
 *     desde componentes cliente: lee secretos de `process.env`.
 *   - No imprime la URL ni el token en consola.
 *
 * Variables de entorno:
 *   NEXT_PUBLIC_APP_ENV        -> 'test' usa las variables _TEST de abajo;
 *                                 cualquier otro valor (incluido ausente) usa
 *                                 las variables productivas, sin cambios de
 *                                 comportamiento respecto de antes de que
 *                                 existiera esta variable.
 *   GOOGLE_SCRIPT_PEDIDOS_URL       -> URL .../exec de la Web App productiva.
 *   GOOGLE_SCRIPT_ADMIN_TOKEN       -> token admin productivo.
 *   GOOGLE_SCRIPT_PEDIDOS_URL_TEST  -> URL .../exec de la Web App TEST.
 *   GOOGLE_SCRIPT_ADMIN_TOKEN_TEST  -> token admin TEST.
 *
 * La selección entre productivo y TEST, y los guardrails que la acompañan
 * (bloquear si falta configuración TEST, bloquear si TEST coincide con
 * producción), viven en `src/lib/env.ts` (`resolverConfigPorEntorno`) como
 * lógica pura y testeada — este archivo solo lee `process.env` y le pasa los
 * valores.
 */

import {
  assertCalendarioSoloTest,
  obtenerEntornoAplicacion,
  resolverConfigPorEntorno,
} from './env';

export interface CarritoItem {
  id_producto: string;
  cantidad: number;
  nombre?: string;
}

export interface CrearPedidoInput {
  nombre_cliente: string;
  telefono: string;
  forma_pago: string;
  observaciones?: string;
  carrito: CarritoItem[];
}

export interface CrearPedidoResult {
  id_pedido: string;
  total: number;
  estado_pedido: string;
  items: number;
  resumen: Array<{
    id_producto: string;
    nombre_producto: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }>;
}

export interface PedidoCabecera {
  id_pedido: string;
  fecha_hora: string;
  canal?: string;
  id_cliente?: string;
  nombre_cliente: string;
  telefono: string;
  total: number | string;
  estado_pedido: string;
  estado_pago: string;
  forma_pago: string;
  observaciones?: string;
  vendedor_admin?: string;
  fecha_entrega?: string;
}

export interface LineaDetalle {
  id_pedido: string;
  id_producto: string;
  nombre_producto: string;
  cantidad: number | string;
  unidad_medida?: string;
  precio_unitario: number | string;
  subtotal: number | string;
}

export interface PedidoConDetalle {
  pedido: PedidoCabecera;
  detalle: LineaDetalle[];
}

export interface AperturaInput {
  apertura_id: string;
  fecha_apertura: string;
  hora_inicio: string;
  hora_termino: string;
  lugar: string;
  cierre_pedidos_anticipados: string;
  estado_apertura: string;
  pedidos_anticipados_estado: string;
  modo_presencial_estado: string;
  mensaje_publico: string;
  observaciones_internas: string;
}

export interface AperturaAdmin extends AperturaInput {
  creada_por: string;
  actualizada_por: string;
  creado_en: string;
  actualizado_en: string;
}

/** Error con código HTTP propagable hacia el route handler. */
export class AppsScriptError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = 'AppsScriptError';
    this.status = status;
  }
}

interface ScriptResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  codigo?: number;
}

function entornoActual() {
  return obtenerEntornoAplicacion(process.env.NEXT_PUBLIC_APP_ENV);
}

function exigirEntornoTestParaCalendario(): void {
  try {
    assertCalendarioSoloTest(entornoActual());
  } catch (err) {
    throw new AppsScriptError(err instanceof Error ? err.message : 'Calendario bloqueado.', 403);
  }
}

function baseUrl(): string {
  const resolucion = resolverConfigPorEntorno(entornoActual(), {
    valorProduccion: process.env.GOOGLE_SCRIPT_PEDIDOS_URL,
    valorTest: process.env.GOOGLE_SCRIPT_PEDIDOS_URL_TEST,
    nombreVariableProduccion: 'GOOGLE_SCRIPT_PEDIDOS_URL',
    nombreVariableTest: 'GOOGLE_SCRIPT_PEDIDOS_URL_TEST',
  });
  if (!resolucion.ok) {
    throw new AppsScriptError(resolucion.error, 500);
  }
  return resolucion.valor;
}

function adminToken(): string {
  const resolucion = resolverConfigPorEntorno(entornoActual(), {
    valorProduccion: process.env.GOOGLE_SCRIPT_ADMIN_TOKEN,
    valorTest: process.env.GOOGLE_SCRIPT_ADMIN_TOKEN_TEST,
    nombreVariableProduccion: 'GOOGLE_SCRIPT_ADMIN_TOKEN',
    nombreVariableTest: 'GOOGLE_SCRIPT_ADMIN_TOKEN_TEST',
  });
  if (!resolucion.ok) {
    throw new AppsScriptError(resolucion.error, 500);
  }
  return resolucion.valor;
}

async function leerRespuesta<T>(res: Response): Promise<T> {
  const texto = await res.text();
  let json: ScriptResponse<T>;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new AppsScriptError('Respuesta no valida del backend de pedidos.', 502);
  }
  if (!json.ok) {
    throw new AppsScriptError(
      json.error || 'Error en el backend de pedidos.',
      json.codigo || 502
    );
  }
  return json.data as T;
}

async function postScript<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(baseUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    redirect: 'follow',
    cache: 'no-store',
  });
  return leerRespuesta<T>(res);
}

async function getScript<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(baseUrl());
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',
    cache: 'no-store',
  });
  return leerRespuesta<T>(res);
}

// ── Acciones públicas ─────────────────────────────────────────────────────────

export interface ProductoCatalogo {
  id_producto: string;
  nombre: string;
  categoria: string;
  prioridad: string;
  unidad_medida: string;
  permite_decimal: string;
  paso_venta: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  imagen_url: string;
}

export function listarProductos(): Promise<ProductoCatalogo[]> {
  return getScript<{ productos: ProductoCatalogo[] }>({
    action: 'listarProductos',
  }).then((d) => d.productos);
}

export function crearPedido(input: CrearPedidoInput): Promise<CrearPedidoResult> {
  return postScript<CrearPedidoResult>({ action: 'crearPedido', ...input });
}

// ── Acciones admin (usan token de servidor) ─────────────────────────────────

export function listarPedidos(): Promise<PedidoCabecera[]> {
  return getScript<{ pedidos: PedidoCabecera[] }>({
    action: 'listarPedidos',
    token: adminToken(),
  }).then((d) => d.pedidos);
}

export function obtenerPedido(idPedido: string): Promise<PedidoConDetalle> {
  return getScript<PedidoConDetalle>({
    action: 'obtenerPedido',
    id_pedido: idPedido,
    token: adminToken(),
  });
}

export function actualizarEstadoPedido(args: {
  id_pedido: string;
  estado_pedido: string;
  estado_pago?: string;
}): Promise<unknown> {
  return postScript({
    action: 'actualizarEstadoPedido',
    token: adminToken(),
    ...args,
  });
}

export function cancelarPedido(idPedido: string): Promise<unknown> {
  return postScript({
    action: 'cancelarPedido',
    token: adminToken(),
    id_pedido: idPedido,
  });
}

// ── Calendario admin (FASE 3B, exclusivamente TEST) ──────────────────────────

export function listarAperturas(): Promise<AperturaAdmin[]> {
  exigirEntornoTestParaCalendario();
  return getScript<{ aperturas: AperturaAdmin[] }>({
    action: 'listarAperturas',
    token: adminToken(),
  }).then((d) => d.aperturas);
}

export function obtenerApertura(idApertura: string): Promise<AperturaAdmin> {
  exigirEntornoTestParaCalendario();
  return getScript<AperturaAdmin>({
    action: 'obtenerApertura',
    apertura_id: idApertura,
    token: adminToken(),
  });
}

export function crearApertura(args: {
  apertura: AperturaInput;
  idempotency_key: string;
}): Promise<AperturaAdmin> {
  exigirEntornoTestParaCalendario();
  return postScript<AperturaAdmin>({
    action: 'crearApertura',
    token: adminToken(),
    actor: 'admin_web',
    ...args,
  });
}

export function actualizarApertura(args: {
  apertura_id: string;
  apertura: AperturaInput;
  actualizado_en_esperado: string;
  idempotency_key: string;
}): Promise<AperturaAdmin> {
  exigirEntornoTestParaCalendario();
  return postScript<AperturaAdmin>({
    action: 'actualizarApertura',
    token: adminToken(),
    actor: 'admin_web',
    ...args,
  });
}

export function cambiarEstadoApertura(args: {
  apertura_id: string;
  estado_apertura: string;
  actualizado_en_esperado: string;
  idempotency_key: string;
}): Promise<AperturaAdmin> {
  exigirEntornoTestParaCalendario();
  return postScript<AperturaAdmin>({
    action: 'cambiarEstadoApertura',
    token: adminToken(),
    actor: 'admin_web',
    ...args,
  });
}
