/** C4: puerto local sobre hojas simuladas. Ninguna implementación Google/HTTP. */
import { ErrorPedidoFamilia, exigirV2, leerOfertaSnapshotV2, type AsignacionPedido } from './pedidoV2.ts';
import { revisionV1Acreditada, type ResolucionRevisionV1 } from './revisionV1.ts';
import { type FamiliaProducto, type ContextoDisponibilidadFamilia } from '../familiasProducto.ts';
import {
  canonV2, copiaV2, hashV2, hashInputV2, construirPlanMixtoV2, validarHashPlanSheetsV2,
  productoResultanteV2, pedidoResultanteV2,
  type PlanSheetsV2, type InputMutacionV2, type TipoOperacionSheetsV2, type PedidoSheetsV2,
  type ProductoSheetsV2, type DetalleMixtoV2, type MovimientoSheetsV2,
} from './planMixtoV2.ts';

export interface OperacionSheetsV2 extends ResolucionRevisionV1 {
  operacion_id: string; idempotency_key: string; tipo_operacion: string; id_pedido: string; actor: string;
  estado_operacion: 'PREPARADA' | 'APLICANDO' | 'COMPLETADA' | 'REQUIERE_REVISION';
  paso: number; payload_hash: string; snapshot_json: string; resultado_json: string;
  creado_en: string; actualizado_en: string; error_codigo?: string;
}
export interface AperturaSkuLocalV2 { apertura_id: string; producto_id: string; habilitado: 'SI' | 'NO' }
export interface TablasSheetsLocalV2 {
  PEDIDOS: PedidoSheetsV2;
  DETALLE_PEDIDOS: DetalleMixtoV2;
  PRODUCTOS: ProductoSheetsV2;
  MOVIMIENTOS_STOCK: MovimientoSheetsV2;
  OPERACIONES_PEDIDOS: OperacionSheetsV2;
  ASIGNACIONES_PEDIDO: AsignacionPedido;
  FAMILIAS_PRODUCTO: FamiliaProducto;
  APERTURA_PRODUCTOS: AperturaSkuLocalV2;
}
export type TablaSheetsLocalV2 = keyof TablasSheetsLocalV2;
/** CAS de una fila con saldo+evidencia en una sola escritura lógica. No garantiza ACID entre filas.
 * Un eventual puerto real debe demostrar esa garantía, lock compartido y readback, o bloquear. */
export interface AlmacenSheetsLocalV2 {
  conLock<T>(trabajo: () => Promise<T>): Promise<T>;
  leer<K extends TablaSheetsLocalV2>(tabla: K): Promise<TablasSheetsLocalV2[K][]>;
  insertar<K extends TablaSheetsLocalV2>(tabla: K, fila: TablasSheetsLocalV2[K], punto: string): Promise<void>;
  reemplazar<K extends TablaSheetsLocalV2>(tabla: K, clave: keyof TablasSheetsLocalV2[K], id: string,
    esperado: TablasSheetsLocalV2[K], nuevo: TablasSheetsLocalV2[K], punto: string): Promise<void>;
  eliminar<K extends TablaSheetsLocalV2>(tabla: K, clave: keyof TablasSheetsLocalV2[K], id: string,
    esperado: TablasSheetsLocalV2[K], punto: string): Promise<void>;
  punto(nombre: string): Promise<void>;
}
export interface OpcionesDurableV2 {
  ahora: () => string;
}
/** D50: decisión de Omar. Afecta pedidos recibidos; C1 sigue rechazando nuevas ofertas inactivas. */
export const POLITICA_FAMILIA_DESACTIVADA = 'PERMITIR_SNAPSHOT' as const;
export interface ResultadoDurableV2 {
  operacion_id: string; id_pedido: string; tipo_operacion: TipoOperacionSheetsV2;
  estado_operacion: 'COMPLETADA' | 'REQUIERE_REVISION'; estado_pedido?: PedidoSheetsV2['estado'];
  operacion_asignacion_vigente: string; asignacion_ids: string[];
  stocks: { producto_id: string; stock_resultante: number }[]; error_codigo?: string;
}
export interface BloqueosOperativosV2 {
  pedidos: string[]; sku: string[]; operaciones: string[]; global: boolean;
}
/** Un diario antiguo/desconocido incompleto no se reinterpreta: bloqueo conservador global. */
export function obtenerBloqueosOperativos(ops: readonly OperacionSheetsV2[], excluir = ''): BloqueosOperativosV2 {
  const pedidos = new Set<string>(), sku = new Set<string>(), operaciones: string[] = [];
  let global = false;
  for (const op of ops) {
    if (op.estado_operacion === 'COMPLETADA' || op.operacion_id === excluir) continue;
    const identidadUnica = ops.filter(x => x.operacion_id === op.operacion_id || x.idempotency_key === op.idempotency_key).length === 1;
    if (identidadUnica && revisionV1Acreditada(op as unknown as Record<string, unknown>)) continue;
    operaciones.push(op.operacion_id); pedidos.add(op.id_pedido);
    if (/^(PLAN_|DIARIO_|RESULTADO_)/.test(op.error_codigo ?? '')
      || ops.filter(x => x.operacion_id === op.operacion_id || x.idempotency_key === op.idempotency_key).length !== 1) global = true;
    try {
      const p = JSON.parse(op.snapshot_json) as PlanSheetsV2;
      if (p.modelo !== 'PEDIDO_MIXTO_V2_1' || p.operacion_id !== op.operacion_id || p.pedido_antes?.id_pedido !== op.id_pedido
        || !Array.isArray(p.saldos) || !p.saldos.every(s => typeof s.producto_id === 'string')) global = true;
      else p.saldos.forEach(s => sku.add(s.producto_id));
    } catch { global = true; }
  }
  return { pedidos: [...pedidos].sort(), sku: [...sku].sort(), operaciones, global };
}
export function exigirRecursosLibresV2(b: BloqueosOperativosV2, recursos: { id_pedido?: string; sku: readonly string[] }) {
  exigirV2(!b.global && (!recursos.id_pedido || !b.pedidos.includes(recursos.id_pedido))
    && !recursos.sku.some(s => b.sku.includes(s)), 'RECURSO_BLOQUEADO_OPERACION_INCOMPLETA', 423);
}
function uno<T>(filas: T[], campo: keyof T, id: string, codigo: string): T {
  const r = filas.filter(f => f[campo] === id); exigirV2(r.length === 1, codigo, 409); return r[0];
}
function resultado(p: PlanSheetsV2): ResultadoDurableV2 {
  return { operacion_id: p.operacion_id, id_pedido: p.pedido_antes.id_pedido, tipo_operacion: p.tipo,
    estado_operacion: 'COMPLETADA', estado_pedido: p.pedido_resultante.estado,
    operacion_asignacion_vigente: p.pedido_resultante.operacion_asignacion_vigente ?? '',
    asignacion_ids: (p.tipo === 'CANCELAR_V2' ? p.asignaciones_anteriores : p.asignaciones_nuevas).map(a => a.asignacion_id),
    stocks: p.saldos.map(s => ({ producto_id: s.producto_id, stock_resultante: s.stock_resultante })) };
}
async function leerPlan(op: OperacionSheetsV2): Promise<PlanSheetsV2> {
  let p: PlanSheetsV2;
  try { p = JSON.parse(op.snapshot_json); } catch { throw new ErrorPedidoFamilia('PLAN_JSON_INVALIDO', 409); }
  exigirV2(p && typeof p === 'object' && !Array.isArray(p), 'PLAN_JSON_INVALIDO', 409);
  await validarHashPlanSheetsV2(p);
  exigirV2(p.operacion_id === op.operacion_id && p.pedido_antes.id_pedido === op.id_pedido && p.tipo === op.tipo_operacion
    && p.actor === op.actor && p.payload_hash === op.payload_hash && p.idempotency_key === op.idempotency_key
    && p.creado_en === op.creado_en, 'DIARIO_PLAN_INCOHERENTE', 409);
  exigirV2(['PREPARADA', 'APLICANDO', 'COMPLETADA', 'REQUIERE_REVISION'].includes(op.estado_operacion)
    && Number.isSafeInteger(op.paso) && op.paso >= 0 && op.paso <= 7, 'DIARIO_PROGRESO_INVALIDO', 409);
  return p;
}
async function contextoActual(a: AlmacenSheetsLocalV2, pedido: PedidoSheetsV2): Promise<ContextoDisponibilidadFamilia> {
  const id = pedido.contexto_apertura_snapshot.apertura_id;
  if (!id) return {};
  const filas = (await a.leer('APERTURA_PRODUCTOS')).filter(f => f.apertura_id === id);
  exigirV2(new Set(filas.map(f => f.producto_id)).size === filas.length && filas.every(f => ['SI', 'NO'].includes(f.habilitado)), 'APERTURA_DUPLICADA_O_INVALIDA', 409);
  return { apertura_id: id, sku_habilitados: filas.filter(f => f.habilitado === 'SI').map(f => f.producto_id).sort() };
}
async function resolverFamilias(a: AlmacenSheetsLocalV2, ds: DetalleMixtoV2[]) {
  const familias = await a.leer('FAMILIAS_PRODUCTO'), observadas: FamiliaProducto[] = [], decisiones: PlanSheetsV2['decisiones_familia'] = [];
  for (const l of ds.filter(l => l.modelo_linea === 'FAMILIA_V2') as Parameters<typeof leerOfertaSnapshotV2>[0][]) {
    const snapshot = leerOfertaSnapshotV2(l);
    if (observadas.some(f => f.familia_id === snapshot.familia_id)) continue;
    const actual = uno(familias, 'familia_id', snapshot.familia_id, 'FAMILIA_ACTUAL_INEXISTENTE_O_DUPLICADA');
    exigirV2(actual.activo === 'SI' || actual.activo === 'NO', 'FAMILIA_ACTUAL_INVALIDA', 409);
    if (actual.activo === 'NO') {
      decisiones.push({ familia_id: actual.familia_id, decision: POLITICA_FAMILIA_DESACTIVADA });
    }
    observadas.push(copiaV2(actual));
  }
  return { observadas, decisiones };
}
function comprobarFilas<T>(actuales: T[], esperadas: T[], campo: keyof T, obligatorio: boolean) {
  for (const fila of esperadas) {
    const r = actuales.filter(x => x[campo] === fila[campo]);
    exigirV2(r.length <= 1 && (!obligatorio || r.length === 1) && (!r.length || canonV2(r[0]) === canonV2(fila)), 'EFECTO_FALTANTE_DUPLICADO_O_ALTERADO', 409);
  }
}
/** Preflight reconoce solo antes exacto o después con recibo exacto. Nunca saldo aislado. */
async function inspeccionar(a: AlmacenSheetsLocalV2, p: PlanSheetsV2, paso: number, final: boolean) {
  await validarHashPlanSheetsV2(p);
  const [pedidos, detalles, productos, asignaciones, movimientos, familias] = await Promise.all([
    a.leer('PEDIDOS'), a.leer('DETALLE_PEDIDOS'), a.leer('PRODUCTOS'), a.leer('ASIGNACIONES_PEDIDO'), a.leer('MOVIMIENTOS_STOCK'), a.leer('FAMILIAS_PRODUCTO'),
  ]);
  const pedido = uno(pedidos, 'id_pedido', p.pedido_antes.id_pedido, 'PEDIDO_INEXISTENTE_O_DUPLICADO');
  exigirV2(canonV2(detalles.filter(l => l.id_pedido === pedido.id_pedido)) === canonV2(p.detalles), 'DETALLE_CAMBIO_CONCURRENTE', 409);
  exigirV2([p.pedido_antes, pedidoResultanteV2(p, false), pedidoResultanteV2(p)].some(x => canonV2(x) === canonV2(pedido)), 'PEDIDO_CAMBIO_SIN_AUTORIA', 409);
  if (final || paso >= 6) exigirV2(canonV2(pedido) === canonV2(pedidoResultanteV2(p)), 'PEDIDO_O_PUNTERO_INCOMPLETO', 409);
  if (paso >= 5) exigirV2(canonV2(pedido) !== canonV2(p.pedido_antes), 'ESTADO_PEDIDO_SIN_EVIDENCIA', 409);
  const propias = asignaciones.filter(x => x.operacion_id === p.operacion_id);
  exigirV2(propias.every(x => p.asignaciones_nuevas.some(e => e.asignacion_id === x.asignacion_id)), 'ASIGNACION_INESPERADA', 409);
  comprobarFilas(asignaciones, p.asignaciones_anteriores, 'asignacion_id', true);
  comprobarFilas(asignaciones, p.asignaciones_nuevas, 'asignacion_id', final || paso >= 2);
  const ms = movimientos.filter(x => x.operacion_id === p.operacion_id || x.referencia_id === p.operacion_id);
  exigirV2(ms.every(x => p.movimientos.some(e => e.movimiento_id === x.movimiento_id)), 'MOVIMIENTO_INESPERADO', 409);
  comprobarFilas(movimientos, p.movimientos, 'movimiento_id', final || paso >= 3);
  for (const s of p.saldos) {
    const actual = uno(productos, 'id_producto', s.producto_id, 'SKU_INEXISTENTE_O_DUPLICADO');
    const aplicado = canonV2(actual) === canonV2(productoResultanteV2(p, s));
    exigirV2(aplicado || (!final && paso < 4 && canonV2(actual) === canonV2(s.antes)), 'STOCK_SIN_AUTORIA_O_CONCURRENCIA', 409);
    if (aplicado) {
      comprobarFilas(movimientos, p.movimientos, 'movimiento_id', true);
      comprobarFilas(asignaciones, p.asignaciones_nuevas, 'asignacion_id', true);
    }
  }
  // Cancelar usa identidad histórica y omite familia/apertura actual. Otras operaciones congelan ambas.
  if (p.tipo !== 'CANCELAR_V2') {
    for (const f of p.familias_observadas) exigirV2(canonV2(uno(familias, 'familia_id', f.familia_id, 'FAMILIA_CAMBIO')) === canonV2(f), 'FAMILIA_CAMBIO_DURANTE_OPERACION', 409);
    exigirV2(canonV2(await contextoActual(a, p.pedido_antes)) === canonV2(p.contexto_snapshot), 'APERTURA_CAMBIO_DURANTE_OPERACION', 409);
  }
}
/** Readback integral público y puro respecto de mutaciones: no marca COMPLETADA por sí mismo. */
export async function verificarOperacionV2(a: AlmacenSheetsLocalV2, id: string): Promise<{ valido: boolean; error_codigo?: string }> {
  try {
    const op = uno(await a.leer('OPERACIONES_PEDIDOS'), 'operacion_id', id, 'DIARIO_INEXISTENTE_O_DUPLICADO');
    const p = await leerPlan(op);
    exigirV2(['APLICANDO', 'COMPLETADA'].includes(op.estado_operacion) && op.paso >= 6, 'READBACK_OPERACION_NO_CERRABLE', 409);
    await inspeccionar(a, p, op.paso, true);
    return { valido: true };
  } catch (e) { if (e instanceof ErrorPedidoFamilia) return { valido: false, error_codigo: e.codigo }; throw e; }
}
async function guardarOp(a: AlmacenSheetsLocalV2, op: OperacionSheetsV2, cambios: Partial<OperacionSheetsV2>, punto: string) {
  const nuevo = { ...op, ...cambios };
  await a.reemplazar('OPERACIONES_PEDIDOS', 'operacion_id', op.operacion_id, op, nuevo, punto);
  return nuevo;
}
async function avanzarPaso(a: AlmacenSheetsLocalV2, op: OperacionSheetsV2, paso: number) {
  return op.paso >= paso ? op : guardarOp(a, op, { paso }, 'CHECKPOINT_' + paso);
}
async function marcarRevision(a: AlmacenSheetsLocalV2, op: OperacionSheetsV2, codigo: string) {
  const actual = uno(await a.leer('OPERACIONES_PEDIDOS'), 'operacion_id', op.operacion_id, 'DIARIO_INEXISTENTE_O_DUPLICADO');
  return guardarOp(a, actual, { estado_operacion: 'REQUIERE_REVISION', error_codigo: codigo }, 'REQUIERE_REVISION');
}
async function resultadoRevision(a: AlmacenSheetsLocalV2, op: OperacionSheetsV2, tipo: TipoOperacionSheetsV2, codigo?: string): Promise<ResultadoDurableV2> {
  const pedidos = (await a.leer('PEDIDOS')).filter(x => x.id_pedido === op.id_pedido);
  const pedido = pedidos.length === 1 ? pedidos[0] : undefined;
  // La respuesta incierta nunca presenta saldos/resultados previstos como hechos completados.
  return { operacion_id: op.operacion_id, id_pedido: op.id_pedido, tipo_operacion: tipo, estado_operacion: 'REQUIERE_REVISION',
    estado_pedido: pedido?.estado, operacion_asignacion_vigente: pedido?.operacion_asignacion_vigente ?? '',
    asignacion_ids: [], stocks: [], error_codigo: codigo };
}
async function reanudar(a: AlmacenSheetsLocalV2, opInicial: OperacionSheetsV2, p: PlanSheetsV2): Promise<ResultadoDurableV2> {
  let op = opInicial;
  if (op.estado_operacion === 'REQUIERE_REVISION') return resultadoRevision(a, op, p.tipo, op.error_codigo);
  if (op.estado_operacion === 'COMPLETADA') {
    let res: ResultadoDurableV2;
    try { res = JSON.parse(op.resultado_json); } catch { throw new ErrorPedidoFamilia('RESULTADO_JSON_INVALIDO', 409); }
    exigirV2(canonV2(res) === canonV2(resultado(p)), 'RESULTADO_PERSISTIDO_ALTERADO', 409);
    return res; // Histórico: no validar contra stock de operaciones posteriores.
  }
  try {
    exigirRecursosLibresV2(obtenerBloqueosOperativos(await a.leer('OPERACIONES_PEDIDOS'), op.operacion_id), { id_pedido: op.id_pedido, sku: p.saldos.map(s => s.producto_id) });
    await inspeccionar(a, p, op.paso, false);
    if (op.estado_operacion === 'PREPARADA') op = await guardarOp(a, op, { estado_operacion: 'APLICANDO', paso: 1 }, 'APLICANDO');
    for (const [i, fila] of p.asignaciones_nuevas.entries()) {
      const existentes = (await a.leer('ASIGNACIONES_PEDIDO')).filter(x => x.asignacion_id === fila.asignacion_id);
      if (!existentes.length) await a.insertar('ASIGNACIONES_PEDIDO', fila, 'ASIGNACION_' + (i + 1));
    }
    op = await avanzarPaso(a, op, 2);
    for (const [i, fila] of p.movimientos.entries()) {
      const existentes = (await a.leer('MOVIMIENTOS_STOCK')).filter(x => x.movimiento_id === fila.movimiento_id);
      if (!existentes.length) await a.insertar('MOVIMIENTOS_STOCK', fila, 'MOVIMIENTO_' + (i + 1));
    }
    op = await avanzarPaso(a, op, 3);
    await inspeccionar(a, p, op.paso, false); // Evidencia completa ANTES de aplicar saldos.
    for (const [i, saldo] of p.saldos.entries()) {
      const actual = uno(await a.leer('PRODUCTOS'), 'id_producto', saldo.producto_id, 'SKU_INEXISTENTE_O_DUPLICADO');
      const despues = productoResultanteV2(p, saldo);
      if (canonV2(actual) !== canonV2(despues)) await a.reemplazar('PRODUCTOS', 'id_producto', saldo.producto_id, saldo.antes, despues, 'STOCK_' + (i + 1));
    }
    op = await avanzarPaso(a, op, 4);
    let pedido = uno(await a.leer('PEDIDOS'), 'id_pedido', op.id_pedido, 'PEDIDO_INEXISTENTE_O_DUPLICADO');
    const intermedio = pedidoResultanteV2(p, false), final = pedidoResultanteV2(p);
    if (canonV2(pedido) === canonV2(p.pedido_antes)) {
      await a.reemplazar('PEDIDOS', 'id_pedido', op.id_pedido, pedido, intermedio, 'ESTADO_PEDIDO'); pedido = intermedio;
    }
    op = await avanzarPaso(a, op, 5);
    if (canonV2(pedido) !== canonV2(final)) await a.reemplazar('PEDIDOS', 'id_pedido', op.id_pedido, intermedio, final, 'PUNTERO_VIGENTE');
    op = await avanzarPaso(a, op, 6);
    await a.punto('ANTES_READBACK');
    const check = await verificarOperacionV2(a, op.operacion_id);
    exigirV2(check.valido, check.error_codigo ?? 'READBACK_INCORRECTO', 409);
    await a.punto('DESPUES_READBACK');
    op = await avanzarPaso(a, op, 7);
    // Segunda lectura bajo el mismo lock: también detecta corrupción inyectada entre readback y cierre.
    const ultima = await verificarOperacionV2(a, op.operacion_id);
    exigirV2(ultima.valido, ultima.error_codigo ?? 'READBACK_INCORRECTO', 409);
    const res = resultado(p);
    await guardarOp(a, op, { estado_operacion: 'COMPLETADA', resultado_json: JSON.stringify(res) }, 'COMPLETADA');
    return res;
  } catch (e) {
    if (!(e instanceof ErrorPedidoFamilia)) throw e; // Caída/timeout no compensa ni inventa progreso.
    await marcarRevision(a, op, e.codigo);
    return resultadoRevision(a, op, p.tipo, e.codigo);
  }
}

async function mutar(a: AlmacenSheetsLocalV2, tipo: TipoOperacionSheetsV2, input: InputMutacionV2, opciones: OpcionesDurableV2): Promise<ResultadoDurableV2> {
  return a.conLock(async () => {
    const payload_hash = await hashInputV2(tipo, input), ops = await a.leer('OPERACIONES_PEDIDOS');
    const previas = ops.filter(o => o.idempotency_key === input.idempotency_key);
    exigirV2(previas.length <= 1, 'KEY_DUPLICADA', 409);
    if (previas.length) {
      const op = previas[0];
      exigirV2(op.id_pedido === input.id_pedido && op.tipo_operacion === tipo && op.payload_hash === payload_hash, 'CONFLICTO_IDEMPOTENCIA', 409);
      try { return await reanudar(a, op, await leerPlan(op)); }
      catch (e) {
        if (!(e instanceof ErrorPedidoFamilia)) throw e;
        await marcarRevision(a, op, e.codigo);
        return resultadoRevision(a, op, tipo, e.codigo);
      }
    }
    const pedido = uno(await a.leer('PEDIDOS'), 'id_pedido', input.id_pedido, 'PEDIDO_INEXISTENTE_O_DUPLICADO');
    const detalles = (await a.leer('DETALLE_PEDIDOS')).filter(l => l.id_pedido === input.id_pedido);
    const productos = await a.leer('PRODUCTOS');
    exigirRecursosLibresV2(obtenerBloqueosOperativos(ops), { id_pedido: input.id_pedido,
      sku: [...detalles.filter(l => l.modelo_linea !== 'FAMILIA_V2').map(l => l.id_producto), ...(input.asignaciones ?? []).flatMap(r => r.selecciones.map(s => s.producto_id))] });
    let vigente: PlanSheetsV2 | undefined;
    let asignaciones_vigentes: AsignacionPedido[] = [];
    if (pedido.operacion_asignacion_vigente) {
      const anterior = uno(ops, 'operacion_id', pedido.operacion_asignacion_vigente, 'PUNTERO_DIARIO_INVALIDO');
      exigirV2(anterior.estado_operacion === 'COMPLETADA', 'ASIGNACION_VIGENTE_INCOMPLETA', 423);
      vigente = await leerPlan(anterior);
      exigirV2(vigente.tipo !== 'CANCELAR_V2' && vigente.pedido_antes.id_pedido === pedido.id_pedido, 'PUNTERO_DIARIO_AJENO', 409);
      exigirV2(canonV2(pedido.evidencia_puntero_v2) === canonV2(pedidoResultanteV2(vigente).evidencia_puntero_v2), 'PUNTERO_SIN_AUTORIA', 409);
      asignaciones_vigentes = (await a.leer('ASIGNACIONES_PEDIDO')).filter(x => x.operacion_id === anterior.operacion_id);
      exigirV2(canonV2(asignaciones_vigentes) === canonV2(vigente.asignaciones_nuevas), 'HISTORICO_VIGENTE_ALTERADO', 409);
    }
    const contexto = tipo === 'CANCELAR_V2' ? {} : await contextoActual(a, pedido);
    const f = tipo === 'CANCELAR_V2' ? { observadas: [], decisiones: [] } : await resolverFamilias(a, detalles);
    const operacion_id = 'OP-C4-' + (await hashV2({ id_pedido: input.id_pedido, key: input.idempotency_key })).slice(0, 32);
    exigirV2(!ops.some(o => o.operacion_id === operacion_id), 'OPERACION_ID_COLISION', 409);
    const meta = { operacion_id, idempotency_key: input.idempotency_key, actor: input.actor, creado_en: opciones.ahora() };
    const plan = await construirPlanMixtoV2({ tipo, input, pedido, detalles, productos, contexto, meta, payload_hash,
      vigente, asignaciones_vigentes, familias_observadas: f.observadas, decisiones_familia: f.decisiones });
    exigirRecursosLibresV2(obtenerBloqueosOperativos(ops), { id_pedido: input.id_pedido, sku: plan.saldos.map(s => s.producto_id) });
    const op: OperacionSheetsV2 = { operacion_id, id_pedido: input.id_pedido, idempotency_key: input.idempotency_key,
      tipo_operacion: tipo, actor: input.actor, estado_operacion: 'PREPARADA', paso: 0, payload_hash,
      snapshot_json: JSON.stringify(plan), resultado_json: '', creado_en: meta.creado_en, actualizado_en: meta.creado_en };
    await a.insertar('OPERACIONES_PEDIDOS', op, 'PREPARADA');
    return reanudar(a, op, plan);
  });
}
export function confirmarPedidoV2Durable(a: AlmacenSheetsLocalV2, input: InputMutacionV2, opciones: OpcionesDurableV2) { return mutar(a, 'CONFIRMAR_V2', input, opciones); }
export function cancelarPedidoV2Durable(a: AlmacenSheetsLocalV2, input: InputMutacionV2, opciones: OpcionesDurableV2) { return mutar(a, 'CANCELAR_V2', input, opciones); }
export function reasignarPedidoV2Durable(a: AlmacenSheetsLocalV2, input: InputMutacionV2, opciones: OpcionesDurableV2) { return mutar(a, 'REASIGNAR_V2', input, opciones); }
