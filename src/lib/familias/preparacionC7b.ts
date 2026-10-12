/** C7-B PREP: manifest, proyección y plan. Exclusivamente datos locales; sin puerto remoto. */
import type { FamiliaProducto, SkuFamilia } from '../familiasProducto.ts';
import { ejecutarDryRunComercialC7a, type IdentidadAprobadaC7a } from './mapaComercialC7a.ts';

export type EstadoEvidenciaC7 = 'APROBADO' | 'PENDIENTE_NADIA' | 'PENDIENTE_OMAR' | 'PENDIENTE_CONTEO' | 'POSTERGADO_GRANEL';
export interface EntradaManifestC7 {
  producto_id: string; estado: EstadoEvidenciaC7; evidencia: string;
  oferta_propuesta: { familia_id: string; nombre_publico: string; precio_comanda: number | null; politica_propuesta: string; presentacion_conocida: string | null };
  cardinalidad: { propuesta: string; estado: 'APROBADO' | 'PENDIENTE_OMAR'; evidencia: string; decision: 'SI' | 'NO' | null };
  bloqueos_humanos: string[]; accion_futura: string;
  contrato_aprobado?: FamiliaProducto; identidad_aprobada?: IdentidadAprobadaC7a;
}
export interface ManifestC7 { modelo: 'MANIFEST_C7B_PREP_LOCAL'; entradas: EntradaManifestC7[] }
export interface BaseMigracionC7 { familias: FamiliaProducto[]; skus: SkuFamilia[] }
export interface CambioC7 {
  id: string; tipo: 'CREATE_FAMILIA' | 'UPDATE_PRODUCTO_IDENTIDAD' | 'SET_FAMILIA_ID' | 'DESACTIVAR_FAMILIA_CREADA';
  entidad_id: string; valor_actual: Record<string, unknown> | null; valor_nuevo: Record<string, unknown>;
  fila_esperada: Record<string, unknown> | null; evidencia: string; estado_aprobacion: 'APROBADO'; hash: string;
}
export interface PlanMigracionC7 {
  modelo: 'PLAN_MIGRACION_C7_LOCAL'; cambios: CambioC7[]; inverso: CambioC7[];
  base: BaseMigracionC7; resultado: BaseMigracionC7; hash: string; bloqueados: string[];
}
export interface EstadoSimulacionC7 extends BaseMigracionC7 { recibos: { id: string; hash: string }[] }
const fisicos = ['marca', 'presentacion', 'contenido_cantidad', 'contenido_unidad'] as const;
export function canonC7(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canonC7).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.entries(v).filter(([, x]) => x !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => JSON.stringify(k) + ':' + canonC7(x)).join(',') + '}';
  return JSON.stringify(v);
}
export async function hashC7(v: unknown): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonC7(v)))), b => b.toString(16).padStart(2, '0')).join('');
}
const igual = (a: unknown, b: unknown) => canonC7(a) === canonC7(b);
const copiar = <T>(x: T): T => structuredClone(x);
function filaSku(s: SkuFamilia): SkuFamilia {
  return { ...s, ...Object.fromEntries([...fisicos, 'familia_id'].map(k => [k, (s as unknown as Record<string, unknown>)[k] ?? ''])) } as SkuFamilia;
}
export function extraerAprobadosC7(m: ManifestC7) {
  if (m.modelo !== 'MANIFEST_C7B_PREP_LOCAL' || new Set(m.entradas.map(e => e.producto_id)).size !== m.entradas.length) throw new Error('MANIFEST_INVALIDO');
  const aprobados = m.entradas.filter(e => e.estado === 'APROBADO');
  for (const e of aprobados) {
    if (!e.evidencia.trim() || !e.contrato_aprobado || !e.identidad_aprobada || e.identidad_aprobada.producto_id !== e.producto_id
      || e.oferta_propuesta.familia_id !== e.contrato_aprobado.familia_id || e.contrato_aprobado.precio_venta !== e.oferta_propuesta.precio_comanda) throw new Error('APROBACION_INCOMPLETA');
  }
  return aprobados;
}
export async function generarPlanMigracionFamiliasC7(manifest: ManifestC7, base: BaseMigracionC7): Promise<PlanMigracionC7> {
  const aprobados = extraerAprobadosC7(manifest);
  if (!aprobados.length) throw new Error('SIN_APROBADOS');
  const normalizada = { familias: copiar(base.familias), skus: base.skus.map(filaSku) };
  // C7-A admite identidad ausente como undefined; la representación Sheet en el plan conserva vacíos.
  const dominio = normalizada.skus.map(s => ({ ...s, contenido_cantidad: typeof s.contenido_cantidad === 'number' ? s.contenido_cantidad : undefined }));
  const r = ejecutarDryRunComercialC7a(dominio, { modelo: 'PROPUESTA_C7A_LOCAL', familias: aprobados.map(e => e.contrato_aprobado!),
    identidades_aprobadas: aprobados.map(e => e.identidad_aprobada!), mapa: aprobados.map(e => ({ familia_id: e.contrato_aprobado!.familia_id, producto_id: e.producto_id })) });
  if (r.estado !== 'CUMPLE') throw new Error('DRY_RUN_NO_CUMPLE');
  const resultado = copiar(normalizada), cambios: CambioC7[] = [], inverso: CambioC7[] = [];
  async function agregar(tipo: CambioC7['tipo'], entidad_id: string, antes: Record<string, unknown> | null, nuevo: Record<string, unknown>, fila: Record<string, unknown> | null, evidencia: string) {
    const parcial = { id: `C7-${entidad_id}-${tipo}`, tipo, entidad_id, valor_actual: copiar(antes), valor_nuevo: copiar(nuevo), fila_esperada: copiar(fila), evidencia, estado_aprobacion: 'APROBADO' as const };
    cambios.push({ ...parcial, hash: await hashC7(parcial) });
  }
  for (const e of aprobados) {
    const familia = e.contrato_aprobado!, existentes = resultado.familias.filter(f => f.familia_id === familia.familia_id);
    if (existentes.length > 1 || existentes.length === 1 && !igual(existentes[0], familia)) throw new Error('FAMILIA_EXISTENTE_CAMBIO');
    if (!existentes.length) { await agregar('CREATE_FAMILIA', familia.familia_id, null, { ...familia }, null, e.evidencia); resultado.familias.push(copiar(familia)); }
    const n = resultado.skus.findIndex(s => s.id_producto === e.producto_id), s = resultado.skus[n];
    const antes = Object.fromEntries(fisicos.map(k => [k, s[k] ?? ''])), nuevo = Object.fromEntries(fisicos.map(k => [k, e.identidad_aprobada![k]]));
    if (!igual(antes, nuevo)) { await agregar('UPDATE_PRODUCTO_IDENTIDAD', s.id_producto, antes, nuevo, { ...s }, e.evidencia); resultado.skus[n] = { ...s, ...nuevo } as SkuFamilia; }
    const actual = resultado.skus[n];
    if (actual.familia_id !== familia.familia_id) {
      if (actual.familia_id) throw new Error('SKU_YA_ASOCIADO_OTRA_FAMILIA');
      await agregar('SET_FAMILIA_ID', s.id_producto, { familia_id: actual.familia_id ?? '' }, { familia_id: familia.familia_id }, { ...actual }, e.evidencia);
      resultado.skus[n] = { ...actual, familia_id: familia.familia_id };
    }
  }
  const revertida = copiar(resultado);
  for (const op of [...cambios].reverse()) {
    const familia = op.tipo === 'CREATE_FAMILIA', fila = familia ? revertida.familias.find(f => f.familia_id === op.entidad_id)! : revertida.skus.find(s => s.id_producto === op.entidad_id)!;
    const parcial = { id: op.id + '-REVERSO', tipo: familia ? 'DESACTIVAR_FAMILIA_CREADA' as const : op.tipo,
      entidad_id: op.entidad_id, valor_actual: familia ? { activo: 'SI' } : op.valor_nuevo,
      valor_nuevo: familia ? { activo: 'NO' } : op.valor_actual!, fila_esperada: { ...fila }, evidencia: `Rollback del plan local: ${op.evidencia}`, estado_aprobacion: 'APROBADO' as const };
    inverso.push({ ...parcial, hash: await hashC7(parcial) });
    Object.assign(fila, parcial.valor_nuevo);
  }
  const parcial = { modelo: 'PLAN_MIGRACION_C7_LOCAL' as const, cambios, inverso, base: normalizada, resultado,
    bloqueados: manifest.entradas.filter(e => e.estado !== 'APROBADO').map(e => e.producto_id) };
  return { ...parcial, hash: await hashC7(parcial) };
}
/** Solo simulación en copias. Recibos completos prueban replay; estados parciales requieren revisión. */
export async function simularPlanMigracionC7(plan: PlanMigracionC7, estado: EstadoSimulacionC7, rollback = false) {
  const { hash, ...contenido } = plan;
  if (hash !== await hashC7(contenido)) throw new Error('PLAN_HASH_INVALIDO');
  const ops = rollback ? plan.inverso : plan.cambios, copia = copiar(estado);
  copia.skus = copia.skus.map(filaSku);
  const reconocidos = ops.filter(op => copia.recibos.some(r => r.id === op.id && r.hash === op.hash));
  if (new Set(copia.recibos.map(r => r.id)).size !== copia.recibos.length) throw new Error('RECIBO_DUPLICADO');
  if (reconocidos.length && reconocidos.length !== ops.length) throw new Error('HUMAN_GATE_OPERACION_PARCIAL');
  if (reconocidos.length === ops.length) {
    for (const op of ops) {
      const fila = op.tipo.includes('FAMILIA_CREADA') || op.tipo === 'CREATE_FAMILIA' ? copia.familias.find(f => f.familia_id === op.entidad_id) : copia.skus.find(s => s.id_producto === op.entidad_id);
      if (!fila) throw new Error('REPLAY_SIN_FILA');
      const ultima = ops.filter(o => o.entidad_id === op.entidad_id).at(-1)!;
      const esperado = ultima.tipo === 'CREATE_FAMILIA' ? ultima.valor_nuevo : { ...ultima.fila_esperada, ...ultima.valor_nuevo };
      if (!igual(fila, esperado)) throw new Error('REPLAY_FILA_CAMBIO');
    }
    return { estado: copia, cambios: 0 };
  }
  for (const op of ops) {
    const { hash: h, ...c } = op;
    if (h !== await hashC7(c) || op.estado_aprobacion !== 'APROBADO' || !op.evidencia.trim()) throw new Error('OPERACION_NO_ACREDITADA');
    if (copia.recibos.some(r => r.id === op.id)) throw new Error('RECIBO_CONFLICTO');
    if (op.tipo === 'CREATE_FAMILIA') {
      if (copia.familias.some(f => f.familia_id === op.entidad_id)) throw new Error('PRECONDICION_FAMILIA_CAMBIO');
      copia.familias.push(copiar(op.valor_nuevo) as unknown as FamiliaProducto);
    } else {
      const esFamilia = op.tipo === 'DESACTIVAR_FAMILIA_CREADA';
      const filas = esFamilia ? copia.familias.filter(f => f.familia_id === op.entidad_id) : copia.skus.filter(s => s.id_producto === op.entidad_id);
      if (filas.length !== 1 || !igual(filas[0], op.fila_esperada)) throw new Error('PRECONDICION_FILA_CAMBIO');
      if (esFamilia && copia.skus.some(s => s.familia_id === op.entidad_id)) throw new Error('ROLLBACK_FAMILIA_EN_USO');
      Object.assign(filas[0], op.valor_nuevo);
    }
    copia.recibos.push({ id: op.id, hash: op.hash });
  }
  return { estado: copia, cambios: ops.length };
}
