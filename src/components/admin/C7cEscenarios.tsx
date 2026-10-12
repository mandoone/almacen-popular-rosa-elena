'use client';
import { useState } from 'react';
import { crearEscenarioC7c, requiereNuevoSkuC7c, type EscenarioC7c } from '@/lib/familias/revisionAdminC7c';
import ImagenOfertaShadow from './ImagenOfertaShadow';

const input = 'mt-1 w-full rounded border border-gray-300 bg-white p-2';
const escenarios: [EscenarioC7c, string][] = [['ECONOMICO_UN_SKU', 'Económico · un SKU'], ['ECONOMICO_DOS_MARCAS', 'Económico · dos marcas'], ['MARCA_EXPLICITA', 'Marca explícita'], ['SIN_MARCA', 'Sin marca artificial']];
export default function C7cEscenarios() {
  const [tipo, setTipo] = useState<EscenarioC7c>('ECONOMICO_DOS_MARCAS');
  const [economico, setEconomico] = useState(false), [branded, setBranded] = useState(false);
  const demo = crearEscenarioC7c(tipo, economico, branded);
  return <section className="rounded-xl border bg-white p-4 sm:p-6" aria-labelledby="ejemplos-c7c">
    <h2 id="ejemplos-c7c" className="text-xl font-semibold">Ejemplos sintéticos · cómo se verá la oferta</h2>
    <p className="my-2 text-sm">Pruebas independientes del manifest aprobado. Cambiar este ejemplo no cambia el plan de migración.</p>
    <label className="block">Escenario <select className={input} value={tipo} onChange={e => { setTipo(e.target.value as EscenarioC7c); setEconomico(false); setBranded(false); }}>{escenarios.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
    <label className="my-3 flex items-start gap-2"><input className="mt-1" type="checkbox" checked={economico} disabled={tipo === 'SIN_MARCA'} onChange={e => setEconomico(e.target.checked)} />Mostrar públicamente como ECONÓMICO / marca variable · ejemplo local</label>
    <p className="text-sm text-gray-700">Esta configuración solo controla cómo se presenta la oferta al público. La marca del producto físico seguirá registrada internamente para stock, compras, costos e historial.</p>
    <label className="my-3 flex items-start gap-2"><input className="mt-1" type="checkbox" checked={branded} onChange={e => setBranded(e.target.checked)} />Probar imagen con marca específica · imagen sintética</label>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <article className="min-w-0 rounded-lg bg-primary/5 p-4">
        <h3 className="font-semibold">OFERTA PÚBLICA · familia</h3>
        <p className="mt-2 text-lg">{demo.shadow.oferta.nombre_publico}</p>
        <p>$1.700 · {demo.familia.presentacion_publica}</p><p>{demo.familia.politica_marca} · {demo.shadow.disponible ? 'Disponible' : 'Agotado'}</p>
        {demo.shadow.oferta.marca_publica && <p>Marca pública: {demo.shadow.oferta.marca_publica}</p>}
        {demo.familia.politica_marca === 'VARIABLE' && <p className="mt-2 text-sm">La marca física se conserva internamente y no se muestra al público.</p>}
        <ImagenOfertaShadow key={`${tipo}-${economico}-${branded}`} imagen={demo.imagen} />
        {branded && demo.familia.politica_marca === 'VARIABLE' && <p role="status" className="rounded bg-amber-100 p-3 text-sm text-amber-950">Esta imagen muestra una marca específica y no es adecuada para una oferta de marca variable.</p>}
      </article>
      <article className="min-w-0 rounded-lg border p-4">
        <h3 className="font-semibold">IDENTIDAD FÍSICA · SKU internos</h3>
        {demo.skus.map(s => <div key={s.id_producto} className="mt-3 border-t pt-3"><p className="break-all text-sm">{s.id_producto}</p><p>Marca interna: {s.marca || 'No aplica'}</p><p>Contenido: {s.contenido_cantidad} {s.contenido_unidad}</p><p className="text-sm">Stock interno sintético: {s.stock_actual} · Elegible</p></div>)}
        <p className="mt-3 rounded bg-gray-100 p-3 text-sm">Auditoría interna: agregado {demo.shadow.stock_agregado_interno}. El cliente solo verá Disponible / Agotado.</p>
      </article>
    </div>
    <details className="mt-4 rounded border p-3"><summary className="cursor-pointer font-medium">Proveedor, marca y formato · tres cambios distintos</summary>
      <p className="mt-2">SKU sintético Reyes 1 L. Compra A: La Oferta, costo $1.500. Compra B: Mayorista X, costo $1.570. Mismo SKU; proveedor y costo quedan en cada compra.</p>
      <p className="mt-2">Cambio de marca → nuevo SKU. Cambio de 1 L a 900 ml → nuevo SKU; no suma disponibilidad a la familia de 1 L.</p>
      <p className="text-sm">Validación local: proveedor conserva SKU; marca y formato requieren otro ID ({requiereNuevoSkuC7c({ marca: 'Reyes', contenido_cantidad: 1000, contenido_unidad: 'ml' }, { marca: 'Reyes', contenido_cantidad: 900, contenido_unidad: 'ml' }) ? 'comprobado' : 'revisar'}).</p>
    </details>
  </section>;
}
