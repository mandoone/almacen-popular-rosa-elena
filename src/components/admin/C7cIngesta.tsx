'use client';
import { useRef, useState, type FormEvent } from 'react';
import template from '../../../docs/operativa/C7_RESPUESTAS_NADIA_TEMPLATE_2026-10-12.json';
import type { ManifestC7, BaseMigracionC7 } from '@/lib/familias/preparacionC7b';
import type { FuenteEvidenciaC7c } from '@/lib/familias/revisionAdminC7c';
import type { RespuestasNadiaC7 } from '@/lib/familias/respuestasNadiaC7';
import { incorporarPropuestaLocalC7c, revisarPreparacionLocalC7c, leerRespuestasLocalesC7c, explicarErrorRevisionC7c, MAX_JSON_C7C, type RevisionLocalC7c } from '@/lib/familias/revisionIngestaC7c';
import C7cRevisionPlan from './C7cRevisionPlan';
const input = 'mt-1 w-full rounded border border-gray-300 bg-white p-2 text-gray-900';
const inicial = { producto_id: 'PROD-023', marca_fisica: '', presentacion: '', contenido_cantidad: '', contenido_unidad: 'ml', fuente: 'NADIA' as FuenteEvidenciaC7c, evidencia: '', fecha: '' };
export default function C7cIngesta({ manifest, base }: { manifest: ManifestC7; base: BaseMigracionC7 }) {
  const [json, setJson] = useState(JSON.stringify(template, null, 2)), [form, setForm] = useState(inicial);
  const [revision, setRevision] = useState<RevisionLocalC7c | null>(null), [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const generacion = useRef(0);
  function cambiarTexto(texto: string) { generacion.current++; setJson(texto); setRevision(null); setMensaje(''); }
  async function revisar(e: FormEvent) {
    e.preventDefault(); const actual = ++generacion.current; setOcupado(true); setMensaje(''); setRevision(null);
    try { const resultado = await revisarPreparacionLocalC7c(json, manifest, base); if (actual === generacion.current) setRevision(resultado); }
    catch (error) { if (actual === generacion.current) setMensaje(`BLOQUEADO · ${explicarErrorRevisionC7c(error)}`); }
    finally { setOcupado(false); }
  }
  function proponer(e: FormEvent) {
    e.preventDefault();
    try { const copia = incorporarPropuestaLocalC7c(leerRespuestasLocalesC7c(json), { ...form, contenido_cantidad: Number(form.contenido_cantidad) }); cambiarTexto(JSON.stringify(copia, null, 2)); setMensaje('PROPUESTO · revise el JSON y ejecute dry-run. No se guardó ni se acreditó remotamente.'); }
    catch (error) { setMensaje(`BLOQUEADO · ${explicarErrorRevisionC7c(error)}`); }
  }
  function ejemplo() {
    const demo = incorporarPropuestaLocalC7c(template as RespuestasNadiaC7, { producto_id: 'PROD-023', marca_fisica: 'Marca QA sintética', presentacion: 'Botella 1 L', contenido_cantidad: 1000, contenido_unidad: 'ml', fuente: 'DOCUMENTO_VIGENTE', evidencia: 'SINTÉTICO: ejemplo local; no respuesta de Nadia ni marca acreditada del PROD-023 real.', fecha: '2026-10-12' });
    cambiarTexto(JSON.stringify(demo, null, 2)); setMensaje('Ejemplo SINTÉTICO cargado. Solo permite probar la proyección local; no acredita datos reales.');
  }
  return <section id="revision-c7c" aria-labelledby="revision-titulo-c7c" className="scroll-mt-4 rounded-xl border bg-white p-4 sm:p-6">
    <h2 id="revision-titulo-c7c" className="text-xl font-semibold">Revisión / dry-run · ingesta local</h2>
    <p className="my-2 text-sm">Respuesta → identidad propuesta → oferta → mapa → plan. El template pendiente conserva solo tres casos acreditados. Un archivo local declara una fuente; esta herramienta no verifica quién lo escribió ni autoriza migración.</p>
    <details className="my-4 rounded border p-3"><summary className="cursor-pointer font-medium">Ingresar identidad propuesta · solo local</summary>
      <form onSubmit={proponer} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label>SKU del template <select className={input} value={form.producto_id} onChange={e => setForm({ ...form, producto_id: e.target.value })}>{template.productos.map(p => <option key={p.producto_id}>{p.producto_id}</option>)}</select></label>
        <label>Marca física <input required maxLength={120} className={input} value={form.marca_fisica} onChange={e => setForm({ ...form, marca_fisica: e.target.value })} /></label>
        <label>Presentación física <input required maxLength={200} className={input} value={form.presentacion} onChange={e => setForm({ ...form, presentacion: e.target.value })} /></label>
        <label>Contenido <input required type="number" min="0.001" step="any" className={input} value={form.contenido_cantidad} onChange={e => setForm({ ...form, contenido_cantidad: e.target.value })} /></label>
        <label>Unidad <select className={input} value={form.contenido_unidad} onChange={e => setForm({ ...form, contenido_unidad: e.target.value })}>{['ml', 'g', 'unidad', 'L', 'kg'].map(u => <option key={u}>{u}</option>)}</select></label>
        <label>Origen de evidencia <select className={input} value={form.fuente} onChange={e => setForm({ ...form, fuente: e.target.value as FuenteEvidenciaC7c })}>{['NADIA', 'OMAR', 'CONTEO_FISICO', 'DOCUMENTO_VIGENTE'].map(f => <option key={f}>{f}</option>)}</select></label>
        <label>Fuente / referencia <input required maxLength={950} className={input} value={form.evidencia} onChange={e => setForm({ ...form, evidencia: e.target.value })} /></label>
        <label>Fecha de evidencia <input required type="date" className={input} value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></label>
        <button disabled={ocupado} className="rounded border px-4 py-2 sm:col-span-2">Incorporar propuesta al JSON local</button>
      </form><p className="mt-2 text-sm">No se editan stock, costo, precio ni IDs. La evidencia sigue sujeta a revisión humana.</p>
    </details>
    <label className="block">Cargar JSON local · máximo200 KB <input disabled={ocupado} type="file" accept=".json,application/json" className={`${input} file:mr-2 file:rounded file:border-0 file:p-2`} onChange={async e => {
      const archivo = e.target.files?.[0]; if (!archivo) return;
      const actual = ++generacion.current; setRevision(null); setMensaje('');
      try { if (archivo.size > MAX_JSON_C7C) throw new Error('ARCHIVO_DEMASIADO_GRANDE'); const texto = await archivo.text(); if (actual === generacion.current) cambiarTexto(texto); }
      catch (error) { if (actual === generacion.current) setMensaje(`BLOQUEADO · ${explicarErrorRevisionC7c(error)}`); }
      e.target.value = '';
    }} /></label>
    <form onSubmit={revisar} className="mt-3 space-y-3">
      <label className="block">Respuestas Nadia / propuestas en JSON <textarea spellCheck={false} disabled={ocupado} rows={8} className={`${input} font-mono text-xs`} value={json} onChange={e => cambiarTexto(e.target.value)} aria-describedby="limite-ingesta-c7c" /></label>
      <p id="limite-ingesta-c7c" className="text-sm">Solo template C7. Se rechazan identidad contradictoria, SKU desconocido, campos operativos y precio. La plantilla original del repositorio no cambia.</p>
      <div className="flex flex-wrap gap-3"><button disabled={ocupado} className="rounded bg-primary-dark px-4 py-2 text-white">{ocupado ? 'Validando…' : 'Validar dry-run'}</button><button disabled={ocupado} type="button" className="rounded border px-4 py-2" onClick={ejemplo}>Cargar ejemplo sintético</button><button disabled={ocupado} type="button" className="rounded border px-4 py-2" onClick={() => cambiarTexto(JSON.stringify(template, null, 2))}>Restablecer template pendiente</button></div>
    </form>
    <p role="status" aria-live="polite" className={`mt-3 break-words text-sm ${mensaje.startsWith('BLOQUEADO') ? 'rounded bg-red-50 p-3 text-red-900' : ''}`}>{mensaje}</p>
    {revision && <C7cRevisionPlan revision={revision} />}
  </section>;
}
