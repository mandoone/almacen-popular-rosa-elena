'use client';
import Link from 'next/link';
import { useState } from 'react';
import manifestJson from '../../../docs/operativa/MAPA_COMERCIAL_C7B_PREP_2026-10-12.json';
import { useSesionAdmin } from '@/lib/fase9/useSesionAdmin';
import { crearBaseSinteticaC7c, estadoRevisionC7c, fuentePendienteC7c, identidadEnRevisionC7c, type ManifestVistaC7c } from '@/lib/familias/revisionAdminC7c';
import ImagenOfertaShadow from './ImagenOfertaShadow';
import { resolverImagenPublicaFamiliaC7 } from '@/lib/familias/imagenPublicaC7';
import C7cEscenarios from './C7cEscenarios';
import C7cIngesta from './C7cIngesta';

const manifest = manifestJson as ManifestVistaC7c;
const base = crearBaseSinteticaC7c(manifest);
const clp = (n: number | '' | null) => typeof n !== 'number' ? 'Pendiente' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
export default function FamiliasPreparacionC7c() {
  const { tiene } = useSesionAdmin();
  const [id, setId] = useState('PROD-040');
  const e = manifest.entradas.find(e => e.producto_id === id)!;
  const s = identidadEnRevisionC7c(e, base.skus.find(s => s.id_producto === id)!);
  const f = e.contrato_aprobado, oferta = e.oferta_propuesta;
  if (!tiene('productos:gestionar')) return <main className="mx-auto max-w-6xl p-6">Se requiere administración de productos TEST.</main>;
  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
    <header><h1 className="font-heading text-3xl text-primary-dark">Preparación de familias y SKU</h1>
      <p className="mt-2">C7-C · TEST/admin · manifest versionado y datos operativos sintéticos. Nada se guarda en Google Sheets.</p>
      <p className="mt-2 rounded bg-amber-50 p-3 text-sm">Solo revisión local. APROBADO_PARA_DRY_RUN permite probar una propuesta; la migración requiere autorización en otra tarea.</p>
      <Link href="/admin/familias/simulador" className="mt-3 inline-block text-primary-dark underline">Ir al simulador shadow de lectura</Link>
    </header>
    <nav aria-label="Áreas de preparación" className="flex flex-wrap gap-2">{[['ofertas-c7c', '1. Ofertas públicas'], ['sku-c7c', '2. Identidad física'], ['mapa-c7c', '3. Mapa'], ['revision-c7c', '4. Revisión / dry-run']].map(([a, l]) => <a key={a} href={`#${a}`} className="rounded border px-3 py-2 text-sm text-primary-dark">{l}</a>)}</nav>
    <label className="block font-medium">Producto del manifest <select className="mt-1 w-full rounded border bg-white p-3" value={id} onChange={ev => setId(ev.target.value)}>{manifest.entradas.map(x => <option key={x.producto_id} value={x.producto_id}>{x.producto_id} · {x.nombre_actual}</option>)}</select></label>
    <p className="break-words text-sm">Revisión: {estadoRevisionC7c(e)} · Evidencia registrada: DOCUMENTO_VIGENTE · {e.estado !== 'APROBADO' ? `HUMAN_GATE: ${fuentePendienteC7c(e)}` : 'Identidad acreditada por Omar en C7-A'}</p>
    <div className="grid gap-4 md:grid-cols-2">
      <section id="ofertas-c7c" aria-labelledby="oferta-titulo-c7c" className="min-w-0 scroll-mt-4 rounded-xl border bg-primary/5 p-4 sm:p-6">
        <h2 id="oferta-titulo-c7c" className="text-xl font-semibold">OFERTA PÚBLICA / FAMILIA</h2>
        <dl className="mt-3 space-y-2 break-words">{[['Familia propuesta', oferta.familia_id], ['Nombre público', oferta.nombre_publico], ['Precio comanda', clp(oferta.precio_comanda)], ['Categoría', f?.categoria ?? 'Pendiente de acreditar'], ['Presentación pública', oferta.presentacion_conocida ?? 'Pendiente'], ['Política', oferta.politica_propuesta], ['Marca pública', f?.marca_publica || oferta.marca_publica || (oferta.politica_propuesta === 'VARIABLE' ? 'Vacía · marca oculta' : 'Pendiente / no aplica')], ['Estado de oferta', oferta.estado_politica ?? e.estado], ['version_oferta', f?.version_oferta ?? 'Aún no hay contrato válido']].map(([k, v]) => <div key={k}><dt className="text-sm text-gray-600">{k}</dt><dd>{v}</dd></div>)}</dl>
        {oferta.politica_propuesta === 'VARIABLE' && <p className="mt-3 text-sm">La oferta Económico está aprobada. Falta acreditar el SKU físico. Su marca se conservará internamente y no se mostrará al público.</p>}
        {f && <ImagenOfertaShadow key={f.familia_id} imagen={resolverImagenPublicaFamiliaC7(f)} />}
        {!f && <p className="mt-3 rounded border p-3 text-sm">Imagen pública: {oferta.politica_propuesta === 'VARIABLE' ? 'PLACEHOLDER_GENERICO · sin marca' : 'Pendiente de oferta acreditada'}. No se toma una fotografía del SKU.</p>}
      </section>
      <section id="sku-c7c" aria-labelledby="sku-titulo-c7c" className="min-w-0 scroll-mt-4 rounded-xl border bg-white p-4 sm:p-6">
        <h2 id="sku-titulo-c7c" className="text-xl font-semibold">PRODUCTO FÍSICO / SKU</h2>
        <h3 className="mt-3 font-semibold">Identidad · propuesta local</h3>
        <dl className="mt-2 space-y-2 break-words">{[['producto_id', s.id_producto], ['Nombre actual del manifest', s.nombre], ['Marca física', s.marca || 'Pendiente · no se deduce del nombre'], ['Presentación física', s.presentacion || 'Pendiente'], ['Contenido', s.contenido_cantidad ? `${s.contenido_cantidad} ${s.contenido_unidad}` : 'Pendiente'], ['Familia propuesta', s.familia_id || 'Sin asociación aprobada']].map(([k, v]) => <div key={k}><dt className="text-sm text-gray-600">{k}</dt><dd>{v}</dd></div>)}</dl>
        <div className="mt-4 rounded bg-gray-100 p-3"><h3 className="font-semibold">Datos operativos · INTERNOS / MOCK</h3><p className="mt-1 text-sm">Stock: {s.stock_actual} · Costo: {clp(s.precio_costo ?? null)} · Precio SKU legacy: {clp(s.precio_venta ?? null)} · Estado mock: {s.activo}</p><p className="mt-1 text-sm">Saldos ficticios; no corresponden al inventario real. No son editables aquí ni determinan el precio familiar.</p></div>
        <p className="mt-3 text-sm">Proveedor se registra por compra. Un mismo SKU puede comprarse a distintos proveedores; no tiene proveedor fijo.</p>
      </section>
    </div>
    <section id="mapa-c7c" className="scroll-mt-4 rounded-xl border bg-white p-4 sm:p-6" aria-labelledby="mapa-titulo-c7c">
      <h2 id="mapa-titulo-c7c" className="text-xl font-semibold">Mapa familia → SKU · aprobación actual</h2>
      <ul className="mt-3 space-y-3">{manifest.entradas.filter(x => x.estado === 'APROBADO').map(x => <li key={x.producto_id} className="break-words rounded border p-3"><p>{x.oferta_propuesta.familia_id}</p><p>↓ {x.producto_id} · {x.identidad_aprobada?.marca} · {x.identidad_aprobada?.presentacion}</p><p className="text-sm">APROBADO_PARA_DRY_RUN · EXPLICITA · equivalencia acreditada. Stock solo interno.</p></li>)}</ul>
      <details className="mt-4"><summary className="cursor-pointer font-medium">Cardinalidad inicial y variantes</summary><p className="mt-2 text-sm">HUMAN_GATE Nadia: Cloro gel Igenix/Excell y bolsas Virutex/Toddo. Alternativa A: familia VARIABLE con SKU equivalentes. Alternativa B: familias EXPLICITAS separadas. No se elige automáticamente.</p><p className="mt-2 text-sm">Omar aprobó las diez cardinalidades iniciales: una familia pública con un solo SKU físico al comenzar, incluso los tres con identidad aprobada. Podrá añadir más SKU equivalentes después. La identidad pendiente y la autorización de migración permanecen separadas.</p><ul className="mt-2 list-inside list-disc text-sm">{manifest.entradas.filter(x => x.cardinalidad.propuesta === 'PROPUESTO_NO_REQUIERE_MULTI_SKU').map(x => <li key={x.producto_id}>{x.producto_id} · {x.nombre_actual} · {x.cardinalidad.estado}</li>)}</ul></details>
      <p className="mt-3 text-sm">Clorinda: oferta separada aprobada sin SKU acreditado. Nunca se asocia a PROD-033. Los 18 graneles reales siguen postergados.</p>
    </section>
    <C7cEscenarios />
    <C7cIngesta manifest={manifest} base={base} />
  </main>;
}
