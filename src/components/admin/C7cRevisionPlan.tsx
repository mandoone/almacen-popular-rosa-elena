'use client';
import type { CambioC7 } from '@/lib/familias/preparacionC7b';
import type { RevisionLocalC7c } from '@/lib/familias/revisionIngestaC7c';
const acciones = { CREATE_FAMILIA: 'Crear familia', UPDATE_PRODUCTO_IDENTIDAD: 'Completar identidad', SET_FAMILIA_ID: 'Asociar SKU', DESACTIVAR_FAMILIA_CREADA: 'Desactivar familia creada' };
const valor = (v: unknown) => v === null ? 'Fila ausente' : JSON.stringify(v, null, 2);
function TablaCambios({ cambios, titulo }: { cambios: CambioC7[]; titulo: string }) {
  return <div className="mt-3 max-w-full overflow-x-auto rounded border" tabIndex={0} aria-label={`${titulo}. Tabla desplazable`}>
    <table className="w-full min-w-[720px] text-left text-sm"><caption className="p-3 text-left font-semibold">{titulo}</caption>
      <thead className="bg-gray-100"><tr>{['Acción / entidad', 'ID', 'Valor actual', 'Valor propuesto', 'Evidencia / estado'].map(x => <th key={x} scope="col" className="p-3">{x}</th>)}</tr></thead>
      <tbody>{cambios.map(c => <tr key={c.id} className="border-t align-top"><th scope="row" className="p-3 font-normal">{acciones[c.tipo]}<br /><span className="text-xs">{c.tipo === 'CREATE_FAMILIA' || c.tipo === 'DESACTIVAR_FAMILIA_CREADA' ? 'FAMILIA' : 'PRODUCTO'}</span></th>
        <td className="max-w-44 break-words p-3">{c.entidad_id}</td><td className="p-3"><pre className="max-w-64 whitespace-pre-wrap break-words font-sans">{valor(c.valor_actual)}</pre></td><td className="p-3"><pre className="max-w-64 whitespace-pre-wrap break-words font-sans">{valor(c.valor_nuevo)}</pre></td>
        <td className="max-w-52 break-words p-3">{c.evidencia}<p className="mt-2 font-medium">APROBADO_PARA_DRY_RUN</p><details className="mt-2"><summary>Hash y precondición</summary><p className="break-all text-xs">{c.hash}</p><pre className="whitespace-pre-wrap break-words text-xs">{valor(c.fila_esperada)}</pre></details></td></tr>)}</tbody>
    </table>
  </div>;
}
export default function C7cRevisionPlan({ revision }: { revision: RevisionLocalC7c }) {
  const r = revision.resumen;
  return <div className="mt-4 space-y-4">
    <p role="status" className="rounded bg-green-50 p-3 text-green-950">Dry-run: {revision.proyeccion.dry_run.estado} · APROBADO_PARA_DRY_RUN · Sin autorización remota.</p>
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[['Familias a crear', r.familias], ['SKU a completar', r.skus], ['Asociaciones', r.asociaciones], ['Pendientes sin contrato', r.pendientes], ['Bloqueados / postergados', r.bloqueados], ['Advertencias dry-run', r.warnings]].map(([k, v]) => <div className="rounded bg-gray-100 p-3" key={k}><dt className="text-sm">{k}</dt><dd className="text-xl font-semibold">{v}</dd></div>)}</dl>
    <p className="text-sm">Simulación solo en memoria: primera {revision.simulacion.primera} cambios; segunda {revision.simulacion.segunda}; inversa {revision.simulacion.inversa}. Stock, costo y precio SKU se conservan. El plan no se aplica a Sheets.</p>
    <section aria-labelledby="mapa-proyectado-c7c"><h3 id="mapa-proyectado-c7c" className="font-semibold">Mapa y ofertas resultantes · propuestas locales</h3>
      <ul className="mt-2 space-y-2">{revision.proyeccion.dry_run.catalogo_propuesto.map(f => <li key={f.oferta.familia_id} className="min-w-0 break-words rounded border p-3"><p>{f.oferta.nombre_publico} · ${f.oferta.precio_venta?.toLocaleString('es-CL')} · {f.oferta.politica_marca}</p><p className="text-sm">{f.oferta.familia_id} → {f.sku_integrantes.map(s => s.producto_id).join(', ')}</p><p className="text-sm">Marca pública: {f.oferta.marca_publica || 'Sin marca pública'} · {f.disponible ? 'Disponible' : 'Agotado'}. Stock agregado interno/mock: {f.stock_agregado_interno}.</p><ul className="text-sm">{f.sku_integrantes.map(s => <li key={s.producto_id}>{s.producto_id}: {s.marca || 'No aplica'} · {s.contenido_cantidad} {s.contenido_unidad} · {s.equivalente ? 'Equivalente' : 'Incompatible'}</li>)}</ul></li>)}</ul>
      {revision.proyeccion.dry_run.hallazgos.length > 0 && <ul className="mt-2 list-inside list-disc text-sm">{revision.proyeccion.dry_run.hallazgos.map((h, i) => <li key={i}>{h.estado}: {h.codigo} · {h.familia_id} · {h.producto_id}</li>)}</ul>}
    </section>
    <TablaCambios cambios={revision.plan.cambios} titulo="Preview de migración · no ejecutar" />
    <details><summary className="cursor-pointer font-semibold">PLAN INVERSO · cómo se revertiría</summary><p className="mt-2 text-sm">Restaura las celdas previas y desactiva las familias creadas. Conserva su historia; no borra filas. Solo preview.</p><TablaCambios cambios={revision.plan.inverso} titulo="Rollback preview" /></details>
    <details><summary className="cursor-pointer font-semibold">HUMAN_GATES y evidencia pendiente</summary><ul className="mt-2 list-inside list-disc break-words text-sm">{revision.proyeccion.human_gates.map(g => <li key={g}>{g}</li>)}</ul><p className="mt-2 text-sm">{revision.cardinalidades_pendientes.length ? `Propuestas de un SKU inicial pendientes de Omar: ${revision.cardinalidades_pendientes.join(', ')}.` : 'Las diez propuestas de un SKU inicial están aprobadas. Se podrán incorporar más SKU equivalentes después; no es autorización de migración.'} Las respuestas a variantes no crean asociaciones automáticamente.</p><p className="mt-2 break-all text-xs">Hash plan: {revision.plan.hash}</p></details>
  </div>;
}
