/** C2: motor puro local. Sin red, Sheets, rutas, selección automática ni deploy. */
import { agregarDisponibilidadFamilia, validarRelacionSkuFamilia, type SkuFamilia, type ContextoDisponibilidadFamilia } from '../familiasProducto.ts';
import { exigirV2, idInternoV2, leerOfertaSnapshotV2, validarCantidadFamiliaV2, validarContratoAsignacionV2, type DetallePedidoFamiliaV2, type AsignacionPedido } from './pedidoV2.ts';

export interface SeleccionSkuV2 { producto_id: string; cantidad_asignada: number }
export interface RepartoLineaV2 { id_detalle_pedido: string; selecciones: SeleccionSkuV2[] }
export interface PedidoOperativoV2 {
  id_pedido: string;
  estado: 'recibido' | 'pendiente' | 'listo' | 'entregado' | 'cancelado';
  lineas: DetallePedidoFamiliaV2[];
  asignaciones: AsignacionPedido[];
  operacion_asignacion_vigente?: string; // Puntero futuro; historial de asignaciones no se edita.
}
export interface MetadataOperacionV2 {
  operacion_id: string; idempotency_key: string; actor: string; creado_en: string;
}
export interface MovimientoPlanV2 {
  movimiento_id: string; operacion_id: string; producto_id: string;
  tipo: 'ASIGNACION_V2' | 'DEVOLUCION_V2';
  cantidad_stock: number; stock_anterior: number; stock_resultante: number;
  unidad_stock_snapshot: string; gramos_unidad_stock_snapshot?: number;
  escala_stock_snapshot: number;
  actor: string; creado_en: string;
}
export type EstadoPlanV2 = 'PREPARADA' | 'APLICANDO' | 'COMPLETADA' | 'REQUIERE_REVISION';
export interface PlanDurableV2 extends MetadataOperacionV2 {
  tipo: 'CONFIRMAR_V2' | 'CANCELAR_V2' | 'REASIGNAR_V2';
  estado: EstadoPlanV2;
  paso: number;
  payload_hash: string;
  snapshot_hash: string;
  pedido_antes: PedidoOperativoV2;
  pedido_resultante: PedidoOperativoV2;
  contexto_snapshot: ContextoDisponibilidadFamilia;
  movimientos: MovimientoPlanV2[];
  error_codigo?: string;
}
export interface EstadoMotorV2 {
  pedido: PedidoOperativoV2; skus: SkuFamilia[]; movimientos: MovimientoPlanV2[];
  asignaciones_historicas: AsignacionPedido[];
  auditoria: { operacion_id: string; tipo: string; actor: string; creado_en: string; antes: PedidoOperativoV2; despues: PedidoOperativoV2 }[];
}

function copia<T>(valor: T): T { return structuredClone(valor); }
function canon(valor: unknown): string {
  if (Array.isArray(valor)) return '[' + valor.map(canon).join(',') + ']';
  if (valor && typeof valor === 'object') return '{' + Object.entries(valor).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ':' + canon(v)).join(',') + '}';
  return JSON.stringify(valor);
}
async function sha(valor: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canon(valor)));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
function enteroExacto(n: number, codigo = 'STOCK_V2_INVALIDO'): number {
  exigirV2(Number.isFinite(n) && n >= 0 && Number.isSafeInteger(Math.round(n)) && Math.abs(n - Math.round(n)) < 1e-7, codigo);
  return Math.round(n);
}
function escalaSku(s: SkuFamilia, base?: number): number {
  if (base !== undefined || s.modo_venta === 'GRANEL') {
    const gramos = base ?? s.gramos_unidad_stock;
    exigirV2(typeof gramos === 'number' && [100, 250, 1000].includes(gramos), 'BASE_GRANEL_INVALIDA');
    return gramos;
  }
  return s.permite_decimal === 'SI' || s.permite_decimal === true ? 1000 : 1;
}
function saldoEntero(s: SkuFamilia): number {
  exigirV2(typeof s.stock_actual === 'number', 'STOCK_V2_INVALIDO');
  return enteroExacto(s.stock_actual * escalaSku(s));
}
function skuUnico(skus: readonly SkuFamilia[], id: string): SkuFamilia {
  const encontrados = skus.filter(s => s.id_producto === id);
  exigirV2(encontrados.length === 1, 'SKU_INEXISTENTE_O_DUPLICADO', 409);
  return encontrados[0];
}
function validarMetadata(m: MetadataOperacionV2) {
  exigirV2(idInternoV2(m.operacion_id) && m.operacion_id.length <= 60 && typeof m.idempotency_key === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(m.idempotency_key), 'ID_OPERACION_INVALIDO');
  exigirV2(typeof m.actor === 'string' && /^[a-z0-9][a-z0-9._@-]{0,99}$/.test(m.actor) && typeof m.creado_en === 'string' && Number.isFinite(Date.parse(m.creado_en)), 'ACTOR_FECHA_INVALIDOS');
}
function validarPedido(p: PedidoOperativoV2) {
  exigirV2(idInternoV2(p.id_pedido) && p.lineas.length > 0, 'PEDIDO_V2_INVALIDO');
  exigirV2(new Set(p.lineas.map(l => l.id_detalle_pedido)).size === p.lineas.length, 'DETALLE_DUPLICADO');
  for (const l of p.lineas) { exigirV2(l.id_pedido === p.id_pedido, 'DETALLE_OTRO_PEDIDO'); leerOfertaSnapshotV2(l); }
}

/** Operación decide el reparto. Cada SKU distinto aparece una vez por detalle. */
export function validarYCongelarAsignacionesV2(
  linea: DetallePedidoFamiliaV2, seleccion: readonly SeleccionSkuV2[], skus: readonly SkuFamilia[],
  contexto: ContextoDisponibilidadFamilia, meta: MetadataOperacionV2, inicioId = 0,
): AsignacionPedido[] {
  validarMetadata(meta);
  const familia = leerOfertaSnapshotV2(linea);
  exigirV2(seleccion.length > 0 && new Set(seleccion.map(s => s.producto_id)).size === seleccion.length, 'ASIGNACION_DUPLICADA_O_VACIA');
  const escala = familia.modo_venta === 'GRANEL' || familia.permite_decimal === 'NO' ? 1 : 1000;
  let total = 0;
  const resultado = seleccion.map((s, i) => {
    const sku = skuUnico(skus, s.producto_id);
    exigirV2(sku.familia_id === familia.familia_id && validarRelacionSkuFamilia(sku, familia).valido, 'SKU_NO_EQUIVALENTE');
    const vista = agregarDisponibilidadFamilia(familia, [sku], contexto);
    exigirV2(vista.inconsistencias.length === 0 && vista.sku_elegibles.includes(sku.id_producto), 'SKU_NO_ELEGIBLE', 409);
    const cantidad = validarCantidadFamiliaV2(familia, s.cantidad_asignada);
    exigirV2(Number.isSafeInteger(total + cantidad), 'ASIGNACION_FUERA_RANGO'); total += cantidad;
    const fisica = familia.modo_venta === 'GRANEL' ? cantidad : enteroExacto(s.cantidad_asignada * escalaSku(sku));
    exigirV2(fisica <= saldoEntero(sku), 'STOCK_INSUFICIENTE', 409);
    const a: AsignacionPedido = { asignacion_id: meta.operacion_id + '-A-' + (inicioId + i), id_detalle_pedido: linea.id_detalle_pedido,
      producto_id: sku.id_producto, cantidad_asignada: cantidad / escala, cantidad_stock: fisica / escalaSku(sku),
      unidad_stock_snapshot: sku.unidad_medida, ...(familia.modo_venta === 'GRANEL' ? { gramos_unidad_stock_snapshot: sku.gramos_unidad_stock } : {}),
      nombre_sku_snapshot: sku.nombre, marca_snapshot: sku.marca ?? '', presentacion_snapshot: sku.presentacion ?? '',
      operacion_id: meta.operacion_id, actor: meta.actor, creado_en: meta.creado_en };
    validarContratoAsignacionV2(a); return a;
  });
  exigirV2(total === validarCantidadFamiliaV2(familia, linea.cantidad_solicitada), 'ASIGNACION_NO_COMPLETA');
  return resultado;
}

function mover(
  stocks: SkuFamilia[], producto_id: string, cantidad: number, devolver: boolean,
  base: number | undefined, unidad: string, meta: MetadataOperacionV2, indice: number,
): MovimientoPlanV2 {
  const s = skuUnico(stocks, producto_id);
  exigirV2(s.unidad_medida === unidad && (base === undefined ? s.modo_venta !== 'GRANEL' : s.modo_venta === 'GRANEL' && s.gramos_unidad_stock === base), 'BASE_HISTORICA_CAMBIADA', 409);
  const escala = escalaSku(s, base), anterior = saldoEntero(s), delta = enteroExacto(cantidad * escala, 'CANTIDAD_STOCK_INVALIDA');
  const nuevo = devolver ? anterior + delta : anterior - delta;
  exigirV2(Number.isSafeInteger(nuevo) && nuevo >= 0, 'STOCK_INSUFICIENTE_O_DESBORDE', 409);
  const m: MovimientoPlanV2 = { movimiento_id: meta.operacion_id + '-M-' + indice, operacion_id: meta.operacion_id, producto_id,
    tipo: devolver ? 'DEVOLUCION_V2' : 'ASIGNACION_V2', cantidad_stock: devolver ? cantidad : -cantidad,
    stock_anterior: anterior / escala, stock_resultante: nuevo / escala, unidad_stock_snapshot: unidad, escala_stock_snapshot: escala,
    ...(base !== undefined ? { gramos_unidad_stock_snapshot: base } : {}), actor: meta.actor, creado_en: meta.creado_en };
  s.stock_actual = nuevo / escala; return m;
}

function asignarPedido(p: PedidoOperativoV2, stocks: SkuFamilia[], reparto: readonly RepartoLineaV2[], contexto: ContextoDisponibilidadFamilia, meta: MetadataOperacionV2, movimientos: MovimientoPlanV2[]): AsignacionPedido[] {
  exigirV2(reparto.length === p.lineas.length && new Set(reparto.map(r => r.id_detalle_pedido)).size === reparto.length, 'REPARTO_LINEAS_INCOMPLETO');
  exigirV2(reparto.every(r => p.lineas.some(l => l.id_detalle_pedido === r.id_detalle_pedido)), 'REPARTO_LINEA_DESCONOCIDA');
  const asignaciones: AsignacionPedido[] = [];
  for (const l of p.lineas) {
    const selecciones = reparto.find(r => r.id_detalle_pedido === l.id_detalle_pedido)!.selecciones;
    const a = validarYCongelarAsignacionesV2(l, selecciones, stocks, contexto, meta, asignaciones.length);
    for (const s of a) movimientos.push(mover(stocks, s.producto_id, s.cantidad_stock, false, s.gramos_unidad_stock_snapshot, s.unidad_stock_snapshot, meta, movimientos.length));
    asignaciones.push(...a);
  }
  return asignaciones;
}

/** Reversión exclusivamente histórica; activo/familia/marca vigente no decide devoluciones. */
function devolverPedido(p: PedidoOperativoV2, stocks: SkuFamilia[], meta: MetadataOperacionV2, movimientos: MovimientoPlanV2[]) {
  exigirV2(p.asignaciones.length > 0 && new Set(p.asignaciones.map(a => a.asignacion_id)).size === p.asignaciones.length, 'HISTORICO_ASIGNACION_INVALIDO');
  exigirV2(p.asignaciones.every(a => p.lineas.some(l => l.id_detalle_pedido === a.id_detalle_pedido) && a.operacion_id === p.operacion_asignacion_vigente), 'HISTORICO_ASIGNACION_AJENO');
  for (const l of p.lineas) {
    const f = leerOfertaSnapshotV2(l), asignadas = p.asignaciones.filter(a => a.id_detalle_pedido === l.id_detalle_pedido);
    exigirV2(new Set(asignadas.map(a => a.producto_id)).size === asignadas.length, 'HISTORICO_SKU_DUPLICADO');
    let suma = 0;
    for (const a of asignadas) {
      validarContratoAsignacionV2(a);
      const cantidad = validarCantidadFamiliaV2(f, a.cantidad_asignada);
      exigirV2(Number.isSafeInteger(suma + cantidad), 'HISTORICO_FUERA_RANGO'); suma += cantidad;
      const sku = skuUnico(stocks, a.producto_id);
      const esperado = f.modo_venta === 'GRANEL' ? a.cantidad_asignada / Number(a.gramos_unidad_stock_snapshot) : a.cantidad_asignada;
      exigirV2(Math.abs(esperado - a.cantidad_stock) < 1e-10, 'SNAPSHOT_STOCK_INCOHERENTE');
      // Escala/unidad física conserva significado histórico, aunque SKU esté inactivo.
      exigirV2(f.modo_venta === 'GRANEL' ? a.gramos_unidad_stock_snapshot !== undefined : a.gramos_unidad_stock_snapshot === undefined, 'SNAPSHOT_BASE_INCOHERENTE');
      saldoEntero(sku);
      movimientos.push(mover(stocks, a.producto_id, a.cantidad_stock, true, a.gramos_unidad_stock_snapshot, a.unidad_stock_snapshot, meta, movimientos.length));
    }
    exigirV2(suma === validarCantidadFamiliaV2(f, l.cantidad_solicitada), 'HISTORICO_NO_COMPLETO');
  }
}

function repartoCanon(reparto: readonly RepartoLineaV2[]) {
  return reparto.map(r => ({ id_detalle_pedido: r.id_detalle_pedido, selecciones: r.selecciones.map(s => ({ producto_id: s.producto_id, cantidad_asignada: s.cantidad_asignada })).sort((a, b) => a.producto_id.localeCompare(b.producto_id)) })).sort((a, b) => a.id_detalle_pedido.localeCompare(b.id_detalle_pedido));
}
function snapshotPlan(plan: PlanDurableV2) {
  return Object.fromEntries(Object.entries(plan).filter(([k]) => !['estado', 'paso', 'error_codigo', 'snapshot_hash'].includes(k)));
}
async function prepararOperacion(
  tipo: PlanDurableV2['tipo'], pedido: PedidoOperativoV2, skus: readonly SkuFamilia[], reparto: readonly RepartoLineaV2[],
  contexto: ContextoDisponibilidadFamilia, meta: MetadataOperacionV2, previo?: PlanDurableV2,
): Promise<PlanDurableV2> {
  validarMetadata(meta);
  // NaN/Infinity no se pueden canonizar como null ni compartir key accidentalmente.
  for (const r of reparto) for (const s of r.selecciones) exigirV2(typeof s.cantidad_asignada === 'number' && Number.isFinite(s.cantidad_asignada), 'CANTIDAD_ASIGNACION_INVALIDA');
  const payload_hash = await sha({ tipo, id_pedido: pedido.id_pedido, actor: meta.actor, reparto: repartoCanon(reparto), apertura_id: contexto.apertura_id ?? '' });
  if (previo) {
    exigirV2(previo.idempotency_key === meta.idempotency_key && previo.payload_hash === payload_hash, 'CONFLICTO_IDEMPOTENCIA', 409);
    exigirV2(previo.snapshot_hash === await sha(snapshotPlan(previo)), 'PLAN_ALTERADO', 409);
    return copia(previo); // Ni master ni snapshots se recalculan en replay.
  }
  validarPedido(pedido);
  const stocks = copia([...skus]), antes = copia(pedido), nuevo = copia(pedido), movimientos: MovimientoPlanV2[] = [];
  exigirV2(new Set(stocks.map(s => s.id_producto)).size === stocks.length, 'SKU_DUPLICADO', 409);
  if (tipo === 'CONFIRMAR_V2') {
    exigirV2(pedido.estado === 'recibido' && pedido.asignaciones.length === 0 && !pedido.operacion_asignacion_vigente, 'ESTADO_CONFIRMACION_INVALIDO', 409);
    nuevo.asignaciones = asignarPedido(pedido, stocks, reparto, contexto, meta, movimientos);
    nuevo.estado = 'pendiente'; nuevo.operacion_asignacion_vigente = meta.operacion_id;
  } else {
    exigirV2(['recibido', 'pendiente', 'listo'].includes(pedido.estado), 'ESTADO_REVERSA_INVALIDO', 409);
    if (pedido.estado === 'recibido') exigirV2(pedido.asignaciones.length === 0 && !pedido.operacion_asignacion_vigente, 'RECIBIDO_CON_ASIGNACION');
    else devolverPedido(pedido, stocks, meta, movimientos);
    if (tipo === 'CANCELAR_V2') { exigirV2(reparto.length === 0, 'CANCELACION_SIN_REPARTO'); nuevo.estado = 'cancelado'; }
    else {
      exigirV2(pedido.estado !== 'recibido', 'REASIGNACION_NO_CONFIRMADA', 409);
      nuevo.asignaciones = asignarPedido(pedido, stocks, reparto, contexto, meta, movimientos);
      nuevo.operacion_asignacion_vigente = meta.operacion_id;
    }
  }
  const plan: PlanDurableV2 = { ...meta, tipo, estado: 'PREPARADA', paso: 0, payload_hash, snapshot_hash: '', pedido_antes: antes, pedido_resultante: nuevo, contexto_snapshot: copia(contexto), movimientos };
  plan.snapshot_hash = await sha(snapshotPlan(plan)); return plan;
}

export function prepararConfirmacionFamiliaV2(p: PedidoOperativoV2, skus: readonly SkuFamilia[], reparto: readonly RepartoLineaV2[], contexto: ContextoDisponibilidadFamilia, meta: MetadataOperacionV2, previo?: PlanDurableV2) {
  return prepararOperacion('CONFIRMAR_V2', p, skus, reparto, contexto, meta, previo);
}
export function prepararCancelacionFamiliaV2(p: PedidoOperativoV2, skus: readonly SkuFamilia[], meta: MetadataOperacionV2, previo?: PlanDurableV2) {
  return prepararOperacion('CANCELAR_V2', p, skus, [], {}, meta, previo);
}
export function reasignarAsignacionPedido(p: PedidoOperativoV2, skus: readonly SkuFamilia[], reparto: readonly RepartoLineaV2[], contexto: ContextoDisponibilidadFamilia, meta: MetadataOperacionV2, previo?: PlanDurableV2) {
  return prepararOperacion('REASIGNAR_V2', p, skus, reparto, contexto, meta, previo);
}

/** Un paso local es atómico en memoria. El adaptador futuro debe persistir intentos y reconciliar ambas escrituras bajo lock. */
export async function avanzarPlanDurableV2(plan: PlanDurableV2, estado: EstadoMotorV2): Promise<{ plan: PlanDurableV2; estado: EstadoMotorV2 }> {
  const p = copia(plan), e = copia(estado);
  const revision = (codigo: string) => ({ plan: { ...p, estado: 'REQUIERE_REVISION' as const, error_codigo: codigo }, estado: e });
  if (p.snapshot_hash !== await sha(snapshotPlan(p))) return revision('PLAN_ALTERADO');
  if (p.estado === 'COMPLETADA' || p.estado === 'REQUIERE_REVISION') return { plan: p, estado: e };
  if (!Number.isSafeInteger(p.paso) || p.paso < 0 || p.paso > p.movimientos.length) return revision('PASO_INVALIDO');
  if (p.estado === 'PREPARADA') { if (p.paso !== 0) return revision('PASO_INVALIDO'); p.estado = 'APLICANDO'; return { plan: p, estado: e }; }
  if (p.estado !== 'APLICANDO') return revision('ESTADO_PLAN_INVALIDO');
  if (canon(e.pedido) !== canon(p.pedido_antes) && canon(e.pedido) !== canon(p.pedido_resultante)) return revision('PEDIDO_CAMBIO_CONCURRENTE');
  const anteriores = p.movimientos.slice(0, p.paso);
  for (const m of anteriores) if (e.movimientos.filter(x => x.movimiento_id === m.movimiento_id).length !== 1 || !e.movimientos.some(x => canon(x) === canon(m))) return revision('PROGRESO_SIN_EVIDENCIA');
  const ultimoAnterior = new Map(anteriores.map(m => [m.producto_id, m]));
  for (const [id, m] of ultimoAnterior) {
    const actual = p.movimientos[p.paso];
    const recuperable = actual?.producto_id === id && e.movimientos.some(x => canon(x) === canon(actual));
    const esperado = recuperable ? actual.stock_resultante : m.stock_resultante;
    if (e.skus.filter(s => s.id_producto === id && s.stock_actual === esperado).length !== 1) return revision('STOCK_PROGRESO_INCOHERENTE');
  }
  if (p.paso < p.movimientos.length) {
    const m = p.movimientos[p.paso], matches = e.movimientos.filter(x => x.movimiento_id === m.movimiento_id);
    let s: SkuFamilia;
    try { s = skuUnico(e.skus, m.producto_id); saldoEntero(s); }
    catch { return revision('STOCK_IDENTIDAD_INVALIDOS'); }
    if (s.unidad_medida !== m.unidad_stock_snapshot || escalaSku(s) !== m.escala_stock_snapshot || (m.gramos_unidad_stock_snapshot === undefined ? s.modo_venta === 'GRANEL' : s.modo_venta !== 'GRANEL' || s.gramos_unidad_stock !== m.gramos_unidad_stock_snapshot)) return revision('BASE_HISTORICA_CAMBIADA');
    if (m.tipo === 'ASIGNACION_V2') {
      const a = p.pedido_resultante.asignaciones.find(x => x.producto_id === s.id_producto);
      const l = p.pedido_resultante.lineas.find(x => x.id_detalle_pedido === a?.id_detalle_pedido);
      if (!a || !l || s.activo !== 'SI' || (s.marca ?? '') !== a.marca_snapshot || (s.presentacion ?? '') !== a.presentacion_snapshot) return revision('IDENTIDAD_FISICA_CAMBIADA');
      const vista = agregarDisponibilidadFamilia(leerOfertaSnapshotV2(l), [s], p.contexto_snapshot);
      if (vista.inconsistencias.length || !vista.sku_elegibles.includes(s.id_producto)) return revision('ELEGIBILIDAD_CAMBIADA');
    }
    if (matches.length) {
      if (matches.length !== 1 || canon(matches[0]) !== canon(m) || s.stock_actual !== m.stock_resultante) return revision('MOVIMIENTO_STOCK_INCOHERENTE');
    } else {
      if (s.stock_actual !== m.stock_anterior || canon(e.pedido) !== canon(p.pedido_antes)) return revision('ESCRITURA_PARCIAL_O_CONCURRENCIA');
      s.stock_actual = m.stock_resultante; e.movimientos.push(copia(m));
    }
    p.paso++; return { plan: p, estado: e };
  }
  // Antes de cerrar, cada efecto debe estar completo y cada saldo final verificado.
  for (const m of p.movimientos) if (e.movimientos.filter(x => x.movimiento_id === m.movimiento_id && canon(x) === canon(m)).length !== 1 || e.movimientos.filter(x => x.movimiento_id === m.movimiento_id).length !== 1) return revision('MOVIMIENTO_FALTANTE_O_DUPLICADO');
  const ultimos = new Map(p.movimientos.map(m => [m.producto_id, m]));
  for (const [id, m] of ultimos) if (e.skus.filter(s => s.id_producto === id && s.stock_actual === m.stock_resultante).length !== 1) return revision('STOCK_FINAL_INCOHERENTE');
  for (const a of p.pedido_resultante.asignaciones) {
    const existentes = e.asignaciones_historicas.filter(x => x.asignacion_id === a.asignacion_id);
    if (existentes.length && (existentes.length !== 1 || canon(existentes[0]) !== canon(a))) return revision('ASIGNACION_HISTORICA_INCOHERENTE');
  }
  const audits = e.auditoria.filter(a => a.operacion_id === p.operacion_id);
  const evento = { operacion_id: p.operacion_id, tipo: p.tipo, actor: p.actor, creado_en: p.creado_en, antes: p.pedido_antes, despues: p.pedido_resultante };
  if (audits.length && (audits.length !== 1 || canon(audits[0]) !== canon(evento))) return revision('AUDITORIA_INCOHERENTE');
  e.pedido = copia(p.pedido_resultante);
  for (const a of p.pedido_resultante.asignaciones) if (!e.asignaciones_historicas.some(x => x.asignacion_id === a.asignacion_id)) e.asignaciones_historicas.push(copia(a));
  if (!audits.length) e.auditoria.push(copia(evento));
  p.estado = 'COMPLETADA'; return { plan: p, estado: e };
}

export async function ejecutarPlanLocalV2(plan: PlanDurableV2, estado: EstadoMotorV2) {
  let r = { plan: copia(plan), estado: copia(estado) };
  for (let i = 0; i <= plan.movimientos.length + 2 && !['COMPLETADA', 'REQUIERE_REVISION'].includes(r.plan.estado); i++) r = await avanzarPlanDurableV2(r.plan, r.estado);
  return r;
}
