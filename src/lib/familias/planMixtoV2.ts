/** C4 local: composición de C2 con líneas históricas V1. No es un transporte. */
import { type FamiliaProducto, type SkuFamilia, type ContextoDisponibilidadFamilia } from '../familiasProducto.ts';
import { modeloLineaPedido, leerOfertaSnapshotV2, exigirV2, idInternoV2, type DetallePedidoFamiliaV2, type AsignacionPedido } from './pedidoV2.ts';
import { prepararConfirmacionFamiliaV2, prepararCancelacionFamiliaV2, reasignarAsignacionPedido, type PedidoOperativoV2, type MetadataOperacionV2, type RepartoLineaV2, type MovimientoPlanV2 } from './asignacionV2.ts';

export function copiaV2<T>(v: T): T { return structuredClone(v); }
export function canonV2(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canonV2).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => JSON.stringify(k) + ':' + canonV2(x)).join(',') + '}';
  return JSON.stringify(v);
}
export async function hashV2(v: unknown): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonV2(v)));
  return Array.from(new Uint8Array(h), b => b.toString(16).padStart(2, '0')).join('');
}
export type TipoOperacionSheetsV2 = 'CONFIRMAR_V2' | 'CANCELAR_V2' | 'REASIGNAR_V2';
export interface DetalleSkuV1Local {
  id_pedido: string;
  id_detalle_pedido: string; // Identificador local estable; no se asigna a históricos reales.
  modelo_linea?: 'SKU_V1' | '';
  id_producto: string;
  cantidad: number; // Base nativa YA congelada en V1, también cuando fue GRANEL.
  nombre_producto: string;
  precio_unitario: number;
  subtotal: number;
  unidad_medida?: string;
  modo_venta?: 'UNIDAD' | 'GRANEL' | '';
  gramos_solicitados?: number;
  gramos_unidad_stock?: number;
  gramos_referencia?: number;
}
export type DetalleMixtoV2 = DetalleSkuV1Local | DetallePedidoFamiliaV2;
export interface EvidenciaEscrituraV2 {
  operacion_id: string; payload_hash: string; plan_hash: string; efecto_id: string;
}
export interface PedidoSheetsV2 {
  id_pedido: string;
  estado: PedidoOperativoV2['estado'];
  contexto_apertura_snapshot: ContextoDisponibilidadFamilia;
  operacion_asignacion_vigente?: string;
  evidencia_estado_v2?: EvidenciaEscrituraV2;
  evidencia_puntero_v2?: EvidenciaEscrituraV2;
}
export interface ProductoSheetsV2 extends SkuFamilia {
  revision_stock_v2?: number;
  evidencia_stock_v2?: EvidenciaEscrituraV2;
}
export interface ReservaSkuV1 {
  id_detalle_pedido: string; producto_id: string; cantidad_stock: number;
  unidad_stock_snapshot: string; gramos_unidad_stock_snapshot?: number; escala_stock_snapshot: number;
}
export interface MovimientoSheetsV2 extends Omit<MovimientoPlanV2, 'tipo'> {
  tipo: MovimientoPlanV2['tipo'] | 'SALIDA_SKU_V1' | 'DEVOLUCION_SKU_V1';
  id_detalle_pedido: string;
  asignacion_ids: string[];
  referencia_id: string;
  payload_hash: string;
}
export interface SaldoPlanSheetsV2 {
  producto_id: string; antes: ProductoSheetsV2; stock_resultante: number;
  movimiento_ids: string[]; asignacion_ids: string[];
}
export interface PlanSheetsV2 extends MetadataOperacionV2 {
  modelo: 'PEDIDO_MIXTO_V2_1'; tipo: TipoOperacionSheetsV2;
  payload_hash: string; plan_hash: string;
  pedido_antes: PedidoSheetsV2; pedido_resultante: PedidoSheetsV2;
  detalles: DetalleMixtoV2[];
  contexto_snapshot: ContextoDisponibilidadFamilia;
  familias_observadas: FamiliaProducto[];
  decisiones_familia: { familia_id: string; decision: 'PERMITIR_SNAPSHOT' }[];
  asignaciones_anteriores: AsignacionPedido[]; asignaciones_nuevas: AsignacionPedido[];
  reservas_v1: ReservaSkuV1[];
  movimientos: MovimientoSheetsV2[]; saldos: SaldoPlanSheetsV2[];
}
export interface InputMutacionV2 {
  id_pedido: string; actor: string; idempotency_key: string;
  estado_esperado: PedidoSheetsV2['estado']; apertura_id_esperada: string;
  asignaciones?: RepartoLineaV2[];
}
export async function hashInputV2(tipo: TipoOperacionSheetsV2, input: InputMutacionV2): Promise<string> {
  exigirV2(idInternoV2(input.id_pedido) && typeof input.actor === 'string' && /^[a-z0-9][a-z0-9._@-]{0,99}$/.test(input.actor)
    && typeof input.idempotency_key === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(input.idempotency_key), 'INPUT_DURABLE_INVALIDO');
  exigirV2(['recibido', 'pendiente', 'listo', 'entregado', 'cancelado'].includes(input.estado_esperado)
    && typeof input.apertura_id_esperada === 'string' && (input.apertura_id_esperada === '' || /^APE-\d{8}$/.test(input.apertura_id_esperada)), 'CONTEXTO_ESPERADO_INVALIDO');
  const reparto = input.asignaciones ?? [];
  exigirV2(Array.isArray(reparto), 'REPARTO_INVALIDO');
  if (tipo === 'CANCELAR_V2') exigirV2(reparto.length === 0, 'CANCELACION_SIN_REPARTO');
  for (const r of reparto) {
    exigirV2(r && idInternoV2(r.id_detalle_pedido) && Array.isArray(r.selecciones), 'REPARTO_INVALIDO');
    for (const s of r.selecciones) exigirV2(s && typeof s.producto_id === 'string' && typeof s.cantidad_asignada === 'number' && Number.isFinite(s.cantidad_asignada), 'CANTIDAD_ASIGNACION_INVALIDA');
  }
  return hashV2({ tipo, id_pedido: input.id_pedido, actor: input.actor, estado_esperado: input.estado_esperado,
    apertura_id_esperada: input.apertura_id_esperada,
    reparto: reparto.map(r => ({ id_detalle_pedido: r.id_detalle_pedido, selecciones: r.selecciones.map(s => ({ producto_id: s.producto_id, cantidad_asignada: s.cantidad_asignada })).sort((a, b) => a.producto_id.localeCompare(b.producto_id)) })).sort((a, b) => a.id_detalle_pedido.localeCompare(b.id_detalle_pedido)) });
}
function exacto(n: number, codigo: string): number {
  exigirV2(Number.isFinite(n) && n >= 0 && Number.isSafeInteger(Math.round(n)) && Math.abs(n - Math.round(n)) < 1e-7, codigo);
  return Math.round(n);
}
function escala(s: SkuFamilia): number {
  if (s.modo_venta === 'GRANEL') { exigirV2([100, 250, 1000].includes(Number(s.gramos_unidad_stock)), 'BASE_GRANEL_INVALIDA'); return Number(s.gramos_unidad_stock); }
  return s.permite_decimal === 'SI' || s.permite_decimal === true ? 1000 : 1;
}
function unico(skus: readonly ProductoSheetsV2[], id: string): ProductoSheetsV2 {
  const r = skus.filter(s => s.id_producto === id); exigirV2(r.length === 1, 'SKU_INEXISTENTE_O_DUPLICADO', 409); return r[0];
}
function moverV1(stocks: ProductoSheetsV2[], r: ReservaSkuV1, devolver: boolean, meta: MetadataOperacionV2): MovimientoSheetsV2 {
  const s = unico(stocks, r.producto_id), base = r.gramos_unidad_stock_snapshot;
  exigirV2(s.unidad_medida === r.unidad_stock_snapshot && escala(s) === r.escala_stock_snapshot
    && (base === undefined ? s.modo_venta !== 'GRANEL' : s.modo_venta === 'GRANEL' && s.gramos_unidad_stock === base), 'BASE_HISTORICA_CAMBIADA', 409);
  const anterior = exacto(s.stock_actual * escala(s), 'STOCK_V1_INVALIDO'), delta = exacto(r.cantidad_stock * escala(s), 'CANTIDAD_V1_INVALIDA');
  const nuevo = anterior + (devolver ? delta : -delta);
  exigirV2(Number.isSafeInteger(nuevo) && nuevo >= 0, 'STOCK_INSUFICIENTE_O_DESBORDE', 409);
  s.stock_actual = nuevo / escala(s);
  return { ...meta, movimiento_id: '', producto_id: r.producto_id, tipo: devolver ? 'DEVOLUCION_SKU_V1' : 'SALIDA_SKU_V1',
    cantidad_stock: devolver ? r.cantidad_stock : -r.cantidad_stock, stock_anterior: anterior / escala(s), stock_resultante: s.stock_actual,
    unidad_stock_snapshot: r.unidad_stock_snapshot, escala_stock_snapshot: r.escala_stock_snapshot,
    ...(base !== undefined ? { gramos_unidad_stock_snapshot: base } : {}),
    id_detalle_pedido: r.id_detalle_pedido, asignacion_ids: [], referencia_id: meta.operacion_id, payload_hash: '' };
}
function reservarV1(l: DetalleSkuV1Local, stocks: ProductoSheetsV2[], contexto: ContextoDisponibilidadFamilia): ReservaSkuV1 {
  const s = unico(stocks, l.id_producto);
  exigirV2(s.activo === 'SI' && ((s.tipo_disponibilidad ?? 'REGULAR') === 'REGULAR' || s.tipo_disponibilidad === 'POR_APERTURA'
    && !!contexto.apertura_id && contexto.sku_habilitados?.includes(s.id_producto)), 'SKU_V1_NO_ELEGIBLE', 409);
  exigirV2(typeof l.cantidad === 'number' && l.cantidad > 0, 'CANTIDAD_V1_INVALIDA');
  // Ausencia histórica significa UNIDAD. Nunca reinterpretar cantidad V1 como gramos.
  const granel = l.modo_venta === 'GRANEL';
  exigirV2(granel ? s.modo_venta === 'GRANEL' && l.gramos_unidad_stock === s.gramos_unidad_stock : s.modo_venta !== 'GRANEL', 'BASE_HISTORICA_CAMBIADA', 409);
  if (l.unidad_medida) exigirV2(l.unidad_medida === s.unidad_medida, 'BASE_HISTORICA_CAMBIADA', 409);
  exacto(l.cantidad * escala(s), 'CANTIDAD_V1_INVALIDA');
  if (granel) exigirV2(Number.isSafeInteger(l.gramos_solicitados) && Number(l.gramos_solicitados) > 0
    && Math.abs(l.cantidad * Number(l.gramos_unidad_stock) - Number(l.gramos_solicitados)) < 1e-7, 'SNAPSHOT_GRANEL_V1_INVALIDO');
  return { id_detalle_pedido: l.id_detalle_pedido, producto_id: l.id_producto, cantidad_stock: l.cantidad,
    unidad_stock_snapshot: l.unidad_medida ?? s.unidad_medida, escala_stock_snapshot: escala(s),
    ...(granel ? { gramos_unidad_stock_snapshot: l.gramos_unidad_stock } : {}) };
}

/** Valida TODO antes de cualquier efecto. C2 continúa siendo autoridad de cada línea V2. */
export async function construirPlanMixtoV2(args: {
  tipo: TipoOperacionSheetsV2; input: InputMutacionV2; pedido: PedidoSheetsV2; detalles: DetalleMixtoV2[];
  productos: ProductoSheetsV2[]; contexto: ContextoDisponibilidadFamilia; meta: MetadataOperacionV2; payload_hash: string;
  vigente?: PlanSheetsV2; asignaciones_vigentes: AsignacionPedido[];
  familias_observadas: FamiliaProducto[]; decisiones_familia: PlanSheetsV2['decisiones_familia'];
}): Promise<PlanSheetsV2> {
  const { tipo, input, pedido, detalles, contexto, meta, vigente } = args;
  exigirV2(pedido.estado === input.estado_esperado && (pedido.contexto_apertura_snapshot.apertura_id ?? '') === input.apertura_id_esperada, 'PEDIDO_CONTEXTO_CAMBIO', 409);
  exigirV2(detalles.length > 0 && new Set(detalles.map(l => l.id_detalle_pedido)).size === detalles.length
    && detalles.every(l => l.id_pedido === pedido.id_pedido && idInternoV2(l.id_detalle_pedido)), 'DETALLE_MIXTO_INVALIDO');
  exigirV2(new Set(args.productos.map(s => s.id_producto)).size === args.productos.length, 'SKU_DUPLICADO', 409);
  const v2 = detalles.filter(l => modeloLineaPedido(l as unknown as Record<string, unknown>) === 'FAMILIA_V2') as DetallePedidoFamiliaV2[];
  const v1 = detalles.filter(l => modeloLineaPedido(l as unknown as Record<string, unknown>) === 'SKU_V1') as DetalleSkuV1Local[];
  // C4 es un flujo nuevo explícito; no se enruta un pedido enteramente V1 a él.
  exigirV2(v2.length > 0, 'PEDIDO_SIN_LINEAS_V2');
  for (const l of v2) leerOfertaSnapshotV2(l);
  const stocks = copiaV2(args.productos), movimientos: MovimientoSheetsV2[] = [];
  let reservas: ReservaSkuV1[] = [];
  if (tipo === 'CONFIRMAR_V2') {
    exigirV2(pedido.estado === 'recibido' && !pedido.operacion_asignacion_vigente && args.asignaciones_vigentes.length === 0, 'ESTADO_CONFIRMACION_INVALIDO', 409);
    reservas = v1.map(l => { const r = reservarV1(l, stocks, contexto); movimientos.push(moverV1(stocks, r, false, meta)); return r; });
  } else if (pedido.estado !== 'recibido') {
    exigirV2(!!vigente && vigente.operacion_id === pedido.operacion_asignacion_vigente
      && canonV2(vigente.detalles) === canonV2(detalles), 'HISTORICO_VIGENTE_INVALIDO', 409);
    reservas = copiaV2(vigente.reservas_v1);
    exigirV2(reservas.length === v1.length && reservas.every(r => v1.some(l => l.id_detalle_pedido === r.id_detalle_pedido && l.id_producto === r.producto_id && l.cantidad === r.cantidad_stock)), 'HISTORICO_V1_INVALIDO', 409);
    if (tipo === 'CANCELAR_V2') for (const r of reservas) movimientos.push(moverV1(stocks, r, true, meta));
  }
  const p: PedidoOperativoV2 = { id_pedido: pedido.id_pedido, estado: pedido.estado, lineas: v2,
    asignaciones: copiaV2(args.asignaciones_vigentes), operacion_asignacion_vigente: pedido.operacion_asignacion_vigente };
  const reparto = input.asignaciones ?? [];
  const c2 = tipo === 'CONFIRMAR_V2' ? await prepararConfirmacionFamiliaV2(p, stocks, reparto, contexto, meta)
    : tipo === 'CANCELAR_V2' ? await prepararCancelacionFamiliaV2(p, stocks, meta)
      : await reasignarAsignacionPedido(p, stocks, reparto, contexto, meta);
  const nuevas = tipo === 'CANCELAR_V2' ? [] : c2.pedido_resultante.asignaciones;
  const referencias = tipo === 'CONFIRMAR_V2' ? nuevas : tipo === 'CANCELAR_V2' ? p.asignaciones : [...p.asignaciones, ...nuevas];
  exigirV2(referencias.length === c2.movimientos.length, 'PLAN_C2_INCOHERENTE');
  c2.movimientos.forEach((m, i) => movimientos.push({ ...m, id_detalle_pedido: referencias[i].id_detalle_pedido,
    asignacion_ids: [referencias[i].asignacion_id], referencia_id: meta.operacion_id, payload_hash: '' }));
  movimientos.forEach((m, i) => { m.movimiento_id = meta.operacion_id + '-M-' + i; m.payload_hash = args.payload_hash; });
  const saldos: SaldoPlanSheetsV2[] = [];
  for (const id of new Set(movimientos.map(m => m.producto_id))) {
    const ms = movimientos.filter(m => m.producto_id === id), antes = copiaV2(unico(args.productos, id));
    exigirV2(ms[0].stock_anterior === antes.stock_actual && ms.every((m, i) => i === 0 || m.stock_anterior === ms[i - 1].stock_resultante), 'CADENA_STOCK_INVALIDA');
    saldos.push({ producto_id: id, antes, stock_resultante: ms.at(-1)!.stock_resultante,
      movimiento_ids: ms.map(m => m.movimiento_id), asignacion_ids: [...new Set(ms.flatMap(m => m.asignacion_ids))] });
  }
  const plan: PlanSheetsV2 = { ...meta, modelo: 'PEDIDO_MIXTO_V2_1', tipo, payload_hash: args.payload_hash, plan_hash: '',
    pedido_antes: copiaV2(pedido), pedido_resultante: { ...copiaV2(pedido), estado: c2.pedido_resultante.estado,
      ...(c2.pedido_resultante.operacion_asignacion_vigente ? { operacion_asignacion_vigente: c2.pedido_resultante.operacion_asignacion_vigente } : {}) },
    detalles: copiaV2(detalles), contexto_snapshot: copiaV2(contexto), familias_observadas: copiaV2(args.familias_observadas),
    decisiones_familia: copiaV2(args.decisiones_familia), asignaciones_anteriores: copiaV2(p.asignaciones),
    asignaciones_nuevas: copiaV2(nuevas), reservas_v1: reservas, movimientos, saldos };
  plan.plan_hash = await hashV2({ ...plan, plan_hash: '' });
  return plan;
}

export async function validarHashPlanSheetsV2(plan: PlanSheetsV2): Promise<void> {
  exigirV2(plan.modelo === 'PEDIDO_MIXTO_V2_1' && plan.plan_hash === await hashV2({ ...plan, plan_hash: '' }), 'PLAN_ALTERADO', 409);
}
export function evidenciaPlanV2(p: PlanSheetsV2, efecto_id: string): EvidenciaEscrituraV2 {
  return { operacion_id: p.operacion_id, payload_hash: p.payload_hash, plan_hash: p.plan_hash, efecto_id };
}
export function productoResultanteV2(p: PlanSheetsV2, s: SaldoPlanSheetsV2): ProductoSheetsV2 {
  const revision = s.antes.revision_stock_v2 ?? 0;
  exigirV2(Number.isSafeInteger(revision) && revision >= 0 && Number.isSafeInteger(revision + 1), 'REVISION_STOCK_INVALIDA');
  return { ...copiaV2(s.antes), stock_actual: s.stock_resultante, revision_stock_v2: revision + 1,
    evidencia_stock_v2: evidenciaPlanV2(p, p.operacion_id + '-S-' + s.producto_id) };
}
export function pedidoResultanteV2(p: PlanSheetsV2, conPuntero = true): PedidoSheetsV2 {
  const result = { ...copiaV2(p.pedido_antes), estado: p.pedido_resultante.estado,
    evidencia_estado_v2: evidenciaPlanV2(p, p.operacion_id + '-ESTADO') };
  return conPuntero ? { ...result, operacion_asignacion_vigente: p.pedido_resultante.operacion_asignacion_vigente,
    evidencia_puntero_v2: evidenciaPlanV2(p, p.operacion_id + '-PUNTERO') } : result;
}
