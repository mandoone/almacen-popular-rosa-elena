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
  assertFase56SoloTest,
  assertFase78SoloTest,
  obtenerEntornoAplicacion,
  resolverConfigPorEntorno,
} from './env';
import type { VentaPresencialInput } from './fase5/ventaPresencial';
import { payloadAdminFase78 } from './fase9/dtoAdmin';
import {
  diagnosticarRespuestaNoJson,
  clasificarFalloRespuestaNoJson,
  mensajeRespuestaNoJsonSeguro,
  mensajePostMutacionAmbiguaSeguro,
  RESPUESTA_POST_MUTACION_AMBIGUA,
  type TipoFalloAppsScript,
  type DestinoAppsScript,
} from './appsScriptRespuesta';

const MAX_INTENTOS_GET = 2;
const ESPERA_REINTENTO_GET_MS = 1000;

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
  apertura_id?: string;
  origen_pedido?: 'online_anticipado';
  idempotency_key: string;
}

export interface CrearPedidoResult {
  id_pedido: string;
  total: number;
  estado_pedido: string;
  items: number;
  apertura_id?: string;
  origen_pedido?: string;
  operacion_id?: string;
  idempotency_key?: string;
  consistencia?: string;
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
export interface DiagnosticoAppsScriptSeguro {
  clasificacion: 'RESPUESTA_NO_JSON' | 'ERROR_JSON_LOGICO';
  httpStatus: number;
  backendCodigo?: number;
  contentType: 'text/html' | 'application/json' | 'text/plain' | 'otro';
  redireccion: boolean;
  destino: DestinoAppsScript;
}

export class AppsScriptError extends Error {
  status: number;
  transitorioLectura: boolean;
  tipoFallo?: TipoFalloAppsScript;
  diagnostico?: DiagnosticoAppsScriptSeguro;
  constructor(
    message: string,
    status = 502,
    transitorioLectura = false,
    tipoFallo?: TipoFalloAppsScript,
    diagnostico?: DiagnosticoAppsScriptSeguro
  ) {
    super(message);
    this.name = 'AppsScriptError';
    this.status = status;
    this.transitorioLectura = transitorioLectura;
    this.tipoFallo = tipoFallo;
    this.diagnostico = diagnostico;
  }
}

interface ScriptResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  codigo?: number;
}

function contentTypeParaRegistro(valor: string | null): DiagnosticoAppsScriptSeguro['contentType'] {
  const tipo = String(valor || '').split(';', 1)[0].trim().toLowerCase();
  return tipo === 'text/html' || tipo === 'application/json' || tipo === 'text/plain'
    ? tipo
    : 'otro';
}

function registrarFalloGetSeguro(
  accion: string,
  intento: number,
  reintentara: boolean,
  duracionMs: number,
  error: unknown
): void {
  const clasificacion = error instanceof AppsScriptError
    ? error.diagnostico?.clasificacion ?? 'ERROR_APPS_SCRIPT'
    : error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)
      ? 'TIMEOUT'
      : error instanceof TypeError ? 'TRANSPORTE' : 'DESCONOCIDO';
  const diagnostico = error instanceof AppsScriptError ? error.diagnostico : undefined;
  console.warn(JSON.stringify({
    evento: 'apps_script_get_fallo', accion, intento,
    intentos_maximos: MAX_INTENTOS_GET, reintentara,
    duracion_ms: Math.max(0, duracionMs), clasificacion,
    status_proxy: error instanceof AppsScriptError ? error.status : undefined,
    http_status: diagnostico?.httpStatus,
    codigo_backend: diagnostico?.backendCodigo,
    content_type: diagnostico?.contentType,
    redireccion: diagnostico?.redireccion,
    destino: diagnostico?.destino,
  }));
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

function exigirEntornoTestParaFase56(): void {
  try {
    assertFase56SoloTest(entornoActual());
  } catch (err) {
    throw new AppsScriptError(
      err instanceof Error ? err.message : 'Ventas y caja bloqueadas.',
      403
    );
  }
}

function exigirEntornoTestParaFase78(): void {
  try {
    assertFase78SoloTest(entornoActual());
  } catch (err) {
    throw new AppsScriptError(
      err instanceof Error ? err.message : 'Compras e inventario bloqueados.',
      403
    );
  }
}

function relanzarErrorFase56(err: unknown): never {
  if (
    err instanceof AppsScriptError &&
    /Accion (GET|POST) no reconocida/.test(err.message)
  ) {
    throw new AppsScriptError(
      'Apps Script TEST todavía no está desplegado con las acciones de Fase 5/6.',
      503
    );
  }
  throw err;
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

async function leerRespuesta<T>(
  res: Response,
  operacion: string,
  metodo: 'GET' | 'POST'
): Promise<T> {
  const texto = await res.text();
  let json: ScriptResponse<T>;
  try {
    json = JSON.parse(texto);
  } catch {
    const diagnostico = diagnosticarRespuestaNoJson({
      httpStatus: res.status,
      contentType: res.headers.get('content-type'),
      redirected: res.redirected,
      responseUrl: res.url,
      cuerpo: texto,
    });
    const tipoFallo = clasificarFalloRespuestaNoJson(metodo, diagnostico);
    throw new AppsScriptError(
      tipoFallo === RESPUESTA_POST_MUTACION_AMBIGUA
        ? mensajePostMutacionAmbiguaSeguro(operacion)
        : mensajeRespuestaNoJsonSeguro(operacion, diagnostico),
      502,
      diagnostico.transitorioLectura,
      tipoFallo,
      {
        clasificacion: 'RESPUESTA_NO_JSON',
        httpStatus: diagnostico.httpStatus,
        contentType: contentTypeParaRegistro(diagnostico.contentType),
        redireccion: diagnostico.redireccion,
        destino: diagnostico.destino,
      }
    );
  }
  if (!json.ok) {
    const codigo = Number(json.codigo || res.status || 502);
    throw new AppsScriptError(
      json.error || 'Error en el backend de pedidos.',
      codigo,
      // Un JSON de error de Apps Script es lógico: no se reintenta solo por 5xx.
      false,
      undefined,
      {
        clasificacion: 'ERROR_JSON_LOGICO',
        httpStatus: res.status,
        backendCodigo: codigo,
        contentType: contentTypeParaRegistro(res.headers.get('content-type')),
        redireccion: res.redirected,
        destino: 'desconocido',
      }
    );
  }
  return json.data as T;
}

function nombreAccionSeguro(valor: unknown): string {
  const accion = typeof valor === 'string' ? valor : '';
  return /^[A-Za-z0-9_]{1,80}$/.test(accion) ? accion : 'acción-desconocida';
}

function esFalloReintentableGet(error: unknown): boolean {
  return (error instanceof AppsScriptError && error.transitorioLectura) ||
    (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) ||
    error instanceof TypeError;
}

function errorRedSeguro(error: unknown): AppsScriptError {
  if (error instanceof AppsScriptError) return error;
  if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) {
    return new AppsScriptError('Tiempo de espera agotado contra el backend de pedidos.', 504);
  }
  return new AppsScriptError('No se pudo contactar el backend de pedidos.', 502);
}

async function postScript<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(baseUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    redirect: 'follow',
    cache: 'no-store',
  });
  return leerRespuesta<T>(res, `POST ${nombreAccionSeguro(body.action)}`, 'POST');
}

async function getScript<T>(params: Record<string, string>): Promise<T> {
  const accion = nombreAccionSeguro(params.action);
  let ultimoError: unknown;
  for (let intento = 1; intento <= MAX_INTENTOS_GET; intento++) {
    const inicio = Date.now();
    try {
      const url = new URL(baseUrl());
      url.searchParams.set('_request_id', crypto.randomUUID());
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      const res = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
      });
      return await leerRespuesta<T>(res, `GET ${accion}`, 'GET');
    } catch (error) {
      ultimoError = error;
      const reintentara = esFalloReintentableGet(error) && intento < MAX_INTENTOS_GET;
      registrarFalloGetSeguro(accion, intento, reintentara, Date.now() - inicio, error);
      if (!reintentara) {
        throw errorRedSeguro(error);
      }
      await new Promise((resolve) => setTimeout(resolve, ESPERA_REINTENTO_GET_MS));
    }
  }
  throw errorRedSeguro(ultimoError);
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
  return postScript<CrearPedidoResult>({
    nombre_cliente: input.nombre_cliente,
    telefono: input.telefono,
    forma_pago: input.forma_pago,
    observaciones: input.observaciones,
    carrito: input.carrito.map((item) => ({
      id_producto: item.id_producto,
      cantidad: item.cantidad,
      nombre: item.nombre,
    })),
    apertura_id: input.apertura_id,
    origen_pedido: input.origen_pedido,
    idempotency_key: input.idempotency_key,
    action: 'crearPedido',
  });
}

export interface VentaPresencialCabecera {
  venta_id: string;
  fecha_hora: string;
  apertura_id: string;
  origen_venta: 'presencial';
  vendedor: string;
  total: number;
  estado_venta: 'vigente';
  estado_pago: 'pagado' | 'pendiente_de_pago';
  forma_pago: 'efectivo' | 'transferencia' | 'pendiente';
  observaciones?: string;
  creado_en: string;
  actualizado_en: string;
}

export interface DetalleVentaPresencial {
  detalle_id: string;
  venta_id: string;
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  unidad_medida: string;
  precio_unitario: number;
  subtotal: number;
}

export interface VentaPresencialRegistrada {
  venta: VentaPresencialCabecera;
  detalle: DetalleVentaPresencial[];
  comanda: {
    venta_id: string;
    fecha_hora: string;
    apertura_id: string;
    detalle: DetalleVentaPresencial[];
    total: number;
    estado_pago: VentaPresencialCabecera['estado_pago'];
    estado_impresion: 'pendiente_de_impresion';
  };
}

export interface ResumenAperturaBackend {
  apertura_id: string;
  total_pedidos_anticipados: number;
  total_ventas_presenciales: number;
  total_general: number;
  cantidad_pedidos_anticipados: number;
  cantidad_ventas_presenciales: number;
  total_pendiente_pago: number;
  cantidad_pendientes_pago: number;
  total_cancelado: number;
  cantidad_cancelados: number;
  total_cobrado: number;
  total_efectivo_esperado: number;
  total_transferencia: number;
  total_efectivo_al_retirar: number;
  advertencias: string[];
}

export async function verificarContratoPedidosAnticipadosTest(): Promise<void> {
  exigirEntornoTestParaCalendario();
  try {
    const capacidad = await getScript<{ pedidos_anticipados_publicos: string }>({
      action: 'obtenerCapacidadesFase3b',
      token: adminToken(),
    });
    if (capacidad.pedidos_anticipados_publicos !== 'v1') {
      throw new Error('Capacidad no disponible.');
    }
  } catch {
    throw new AppsScriptError(
      'El backend TEST todavía no tiene habilitado el contrato de pedidos anticipados.',
      503
    );
  }
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
  actor: string;
  idempotency_key: string;
}): Promise<unknown> {
  return postScript({
    id_pedido: args.id_pedido,
    estado_pedido: args.estado_pedido,
    estado_pago: args.estado_pago,
    actor: args.actor,
    idempotency_key: args.idempotency_key,
    action: 'actualizarEstadoPedido',
    token: adminToken(),
  });
}

export function cancelarPedido(
  idPedido: string,
  actor: string,
  idempotencyKey: string
): Promise<unknown> {
  return postScript({
    action: 'cancelarPedido',
    token: adminToken(),
    id_pedido: idPedido,
    actor,
    idempotency_key: idempotencyKey,
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
  actor: string;
}): Promise<AperturaAdmin> {
  exigirEntornoTestParaCalendario();
  return postScript<AperturaAdmin>({
    apertura: args.apertura,
    idempotency_key: args.idempotency_key,
    actor: args.actor,
    action: 'crearApertura',
    token: adminToken(),
  });
}

export function actualizarApertura(args: {
  apertura_id: string;
  apertura: AperturaInput;
  actualizado_en_esperado: string;
  idempotency_key: string;
  actor: string;
}): Promise<AperturaAdmin> {
  exigirEntornoTestParaCalendario();
  return postScript<AperturaAdmin>({
    apertura_id: args.apertura_id,
    apertura: args.apertura,
    actualizado_en_esperado: args.actualizado_en_esperado,
    idempotency_key: args.idempotency_key,
    actor: args.actor,
    action: 'actualizarApertura',
    token: adminToken(),
  });
}

export function cambiarEstadoApertura(args: {
  apertura_id: string;
  estado_apertura: string;
  actualizado_en_esperado: string;
  idempotency_key: string;
  actor: string;
}): Promise<AperturaAdmin> {
  exigirEntornoTestParaCalendario();
  return postScript<AperturaAdmin>({
    apertura_id: args.apertura_id,
    estado_apertura: args.estado_apertura,
    actualizado_en_esperado: args.actualizado_en_esperado,
    idempotency_key: args.idempotency_key,
    actor: args.actor,
    action: 'cambiarEstadoApertura',
    token: adminToken(),
  });
}

// ── Fase 5 + Fase 6 (exclusivamente TEST) ─────────────────────────────────

export function listarCatalogoVentaPresencial(): Promise<ProductoCatalogo[]> {
  exigirEntornoTestParaFase56();
  return listarProductos();
}

export function crearVentaPresencial(
  venta: VentaPresencialInput,
  idempotencyKey: string
): Promise<VentaPresencialRegistrada> {
  exigirEntornoTestParaFase56();
  return postScript<VentaPresencialRegistrada>({
    apertura_id: venta.apertura_id,
    fecha_hora: venta.fecha_hora,
    lineas: venta.lineas.map((linea) => ({
      producto_id: linea.producto_id,
      cantidad: linea.cantidad,
    })),
    forma_pago: venta.forma_pago,
    vendedor: venta.vendedor,
    observaciones: venta.observaciones,
    idempotency_key: idempotencyKey,
    action: 'crearVentaPresencial',
    token: adminToken(),
  }).catch(relanzarErrorFase56);
}

export function obtenerVentaPresencial(
  ventaId: string
): Promise<VentaPresencialRegistrada> {
  exigirEntornoTestParaFase56();
  return getScript<VentaPresencialRegistrada>({
    action: 'obtenerVentaPresencial',
    token: adminToken(),
    venta_id: ventaId,
  }).catch(relanzarErrorFase56);
}

export function listarVentasPorApertura(
  aperturaId: string
): Promise<VentaPresencialCabecera[]> {
  exigirEntornoTestParaFase56();
  return getScript<{ ventas: VentaPresencialCabecera[] }>({
    action: 'listarVentasPorApertura',
    token: adminToken(),
    apertura_id: aperturaId,
  }).then((data) => data.ventas).catch(relanzarErrorFase56);
}

export function obtenerResumenApertura(
  aperturaId: string
): Promise<ResumenAperturaBackend> {
  exigirEntornoTestParaFase56();
  return getScript<ResumenAperturaBackend>({
    action: 'obtenerResumenApertura',
    token: adminToken(),
    apertura_id: aperturaId,
  }).catch(relanzarErrorFase56);
}

// ── Fases 7 + 8 (exclusivamente TEST) ──────────────────────────────────────

export interface CompraAdmin {
  compra_id: string;
  fecha: string;
  fecha_hora: string;
  proveedor: string;
  responsable: string;
  estado: 'confirmada';
  total: number;
  observaciones: string;
  creado_en: string;
  actualizado_en: string;
}

export interface DetalleCompraAdmin {
  detalle_compra_id: string;
  compra_id: string;
  producto_id: string;
  nombre_producto: string;
  unidad_medida: string;
  cantidad: number;
  costo_unitario: number;
  costo_total: number;
  stock_anterior: number;
  stock_nuevo: number;
  costo_anterior: number | '';
  costo_nuevo: number;
}

export interface CompraConDetalle {
  compra: CompraAdmin;
  detalle: DetalleCompraAdmin[];
}

export interface GastoExtraAdmin {
  gasto_id: string;
  fecha_hora: string;
  categoria: string;
  descripcion: string;
  monto: number;
  responsable: string;
  observaciones: string;
  estado: 'vigente';
}

export interface ProductoAdmin extends ProductoCatalogo {
  precio_costo: number | '';
  activo: string;
}

export interface ReportesFase78 {
  compras: CompraAdmin[];
  gastos: GastoExtraAdmin[];
  movimientos_stock: Array<Record<string, unknown>>;
  historial_costos: Array<Record<string, unknown>>;
  auditoria_productos: Array<Record<string, unknown>>;
  ventas: Array<Record<string, unknown>>;
  pedidos: Array<Record<string, unknown>>;
  productos_mas_vendidos: Array<{
    producto_id: string;
    nombre_producto: string;
    cantidad: number;
    total: number;
  }>;
  productos_bajo_stock: ProductoAdmin[];
  resumen: {
    cantidad_compras: number;
    total_compras: number;
    cantidad_gastos: number;
    total_gastos: number;
  };
  resumen_apertura: ResumenAperturaBackend | null;
  advertencia_abastecimiento: string;
}

export interface CajaCompraAdmin {
  ultimo_registro: Record<string, unknown> | null;
  pendientes_por_cobrar: number;
  advertencia: string;
}

export interface PropuestaAbastecimientoAdmin {
  presupuesto: number;
  total_propuesto: number;
  saldo_sin_asignar: number;
  lineas: Array<Record<string, unknown>>;
  omitidos: Array<{ producto_id: string; motivo: string }>;
  advertencia: string;
}

function getAdminFase78<T>(params: Record<string, string>): Promise<T> {
  exigirEntornoTestParaFase78();
  return getScript<T>({ ...params, token: adminToken() });
}

function postAdminFase78<T>(
  action: string,
  actor: string,
  body: Record<string, unknown>
): Promise<T> {
  exigirEntornoTestParaFase78();
  return postScript<T>(payloadAdminFase78(action, actor, adminToken(), body));
}

export function verificarDestinoFase78Test(): Promise<Record<string, string>> {
  return getAdminFase78({ action: 'verificarDestinoFase78Test' });
}

export function obtenerEsquemaFase78Test(): Promise<Record<string, unknown>> {
  return getAdminFase78({ action: 'obtenerEsquemaFase78Test' });
}

export function listarComprasAdmin(filtros: { desde?: string; hasta?: string } = {}): Promise<CompraAdmin[]> {
  return getAdminFase78<{ compras: CompraAdmin[] }>({
    action: 'listarCompras', desde: filtros.desde ?? '', hasta: filtros.hasta ?? '',
  }).then((data) => data.compras);
}

export function obtenerCompraAdmin(compraId: string): Promise<CompraConDetalle> {
  return getAdminFase78({ action: 'obtenerCompra', compra_id: compraId });
}

export function crearCompraAdmin(input: {
  fecha: string;
  proveedor: string;
  observaciones?: string;
  idempotency_key: string;
  lineas: Array<{ producto_id: string; cantidad: number; costo_unitario: number }>;
}, actor: string): Promise<CompraConDetalle> {
  return postAdminFase78('crearCompra', actor, {
    fecha: input.fecha,
    proveedor: input.proveedor,
    observaciones: input.observaciones,
    idempotency_key: input.idempotency_key,
    lineas: input.lineas.map((linea) => ({
      producto_id: linea.producto_id,
      cantidad: linea.cantidad,
      costo_unitario: linea.costo_unitario,
    })),
  });
}

export function listarGastosExtraAdmin(filtros: { desde?: string; hasta?: string } = {}): Promise<GastoExtraAdmin[]> {
  return getAdminFase78<{ gastos: GastoExtraAdmin[] }>({
    action: 'listarGastosExtra', desde: filtros.desde ?? '', hasta: filtros.hasta ?? '',
  }).then((data) => data.gastos);
}

export function crearGastoExtraAdmin(input: {
  categoria: string;
  descripcion: string;
  monto: number;
  observaciones?: string;
  idempotency_key: string;
}, actor: string): Promise<GastoExtraAdmin> {
  return postAdminFase78('crearGastoExtra', actor, {
    categoria: input.categoria,
    descripcion: input.descripcion,
    monto: input.monto,
    observaciones: input.observaciones,
    idempotency_key: input.idempotency_key,
  });
}

export function listarProductosAdmin(): Promise<ProductoAdmin[]> {
  return getAdminFase78<{ productos: ProductoAdmin[] }>({ action: 'listarProductosAdmin' })
    .then((data) => data.productos);
}

export function actualizarProductoAdmin(input: {
  producto_id: string;
  cambios: Record<string, unknown>;
  idempotency_key: string;
}, actor: string): Promise<ProductoAdmin> {
  return postAdminFase78('actualizarProductoAdmin', actor, {
    producto_id: input.producto_id,
    cambios: input.cambios,
    idempotency_key: input.idempotency_key,
  });
}

export function crearProductoAdmin(input: {
  producto_id: string;
  producto: Record<string, unknown>;
  idempotency_key: string;
}, actor: string): Promise<ProductoAdmin> {
  return postAdminFase78('crearProductoAdmin', actor, {
    producto_id: input.producto_id,
    producto: input.producto,
    idempotency_key: input.idempotency_key,
  });
}

export function ajustarStockAdmin(input: {
  producto_id: string;
  delta: number;
  motivo: string;
  observaciones?: string;
  idempotency_key: string;
}, actor: string): Promise<{ producto_id: string; stock_anterior: number; stock_nuevo: number; delta: number }> {
  return postAdminFase78('ajustarStockAdmin', actor, {
    producto_id: input.producto_id,
    delta: input.delta,
    motivo: input.motivo,
    observaciones: input.observaciones,
    idempotency_key: input.idempotency_key,
  });
}

export function obtenerReportesFase78(filtros: {
  desde?: string;
  hasta?: string;
  apertura_id?: string;
  producto_id?: string;
} = {}): Promise<ReportesFase78> {
  return getAdminFase78({
    action: 'obtenerReportesFase78', desde: filtros.desde ?? '', hasta: filtros.hasta ?? '',
    apertura_id: filtros.apertura_id ?? '', producto_id: filtros.producto_id ?? '',
  });
}

export function obtenerCajaCompraAdmin(): Promise<CajaCompraAdmin> {
  return getAdminFase78({ action: 'obtenerCajaCompra' });
}

export function obtenerPropuestaAbastecimientoAdmin(presupuesto: number): Promise<PropuestaAbastecimientoAdmin> {
  return getAdminFase78({ action: 'obtenerPropuestaAbastecimiento', presupuesto: String(presupuesto) });
}

export function registrarCajaCompraAdmin(input: {
  saldo_cuenta: number;
  efectivo_disponible: number;
  pendientes_referencia: number;
  presupuesto_confirmado: number;
  observaciones?: string;
  idempotency_key: string;
}, actor: string): Promise<Record<string, unknown>> {
  return postAdminFase78('registrarCajaCompra', actor, {
    saldo_cuenta: input.saldo_cuenta,
    efectivo_disponible: input.efectivo_disponible,
    pendientes_referencia: input.pendientes_referencia,
    presupuesto_confirmado: input.presupuesto_confirmado,
    observaciones: input.observaciones,
    idempotency_key: input.idempotency_key,
  });
}
