'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import AdminFase78Nav from './AdminFase78Nav';
import { useSesionAdmin } from '@/lib/fase9/useSesionAdmin';
import { solicitarAdmin, pesos, valorOperativo } from '@/lib/fase8/clienteAdmin';
import type { FamiliaProducto, SkuFamilia, ContextoDisponibilidadFamilia } from '@/lib/familiasProducto';
import type { FamiliaShadow } from '@/lib/familias/catalogoShadow';
import { leerMapaPropuesto, validarMapaPropuesto, type ResultadoMapa } from '@/lib/familias/mapaDryRun';
import { auditarFaltantesIdentidad } from '@/lib/familias/auditoriaIdentidad';

interface LecturaShadow {
  familias: FamiliaProducto[]; skus: SkuFamilia[]; contexto: ContextoDisponibilidadFamilia;
  catalogo: FamiliaShadow[]; faltantes: ReturnType<typeof auditarFaltantesIdentidad>;
  lectura_en: string; solo_lectura: true;
}
const inputClass = 'w-full rounded border border-gray-300 p-2 text-gray-900';
const mensajes: Record<string, string> = {
  FAMILIA_INEXISTENTE: 'La familia no existe en la lectura.',
  SKU_INEXISTENTE: 'El SKU no existe en la lectura.',
  FAMILIA_DUPLICADA: 'El ID de familia está duplicado.',
  SKU_DUPLICADO: 'El ID de SKU está duplicado.',
  ASOCIACION_DUPLICADA: 'La asociación está repetida.',
  SKU_EN_DOS_FAMILIAS: 'Se propuso el mismo SKU en dos familias.',
  SKU_YA_ASOCIADO_OTRA_FAMILIA: 'El SKU ya pertenece a otra familia; no se sobrescribe.',
  CONTENIDO_NO_EQUIVALENTE: 'El contenido físico no coincide con la oferta; este SKU no suma disponibilidad.',
  CATEGORIA_NO_EQUIVALENTE: 'La categoría del SKU no coincide con la familia.',
  MODO_NO_EQUIVALENTE: 'El modo de venta del SKU no coincide con la familia.',
  MARCA_NO_EQUIVALENTE: 'La marca física no coincide con la marca pública explícita.',
  MARCA_FISICA_REQUERIDA: 'Falta acreditar la marca física del SKU.',
  PRESENTACION_FISICA_REQUERIDA: 'Falta la presentación física del SKU.',
  SKU_ASOCIADO_INACTIVO: 'El SKU está inactivo y no suma disponibilidad.',
  SKU_NO_HABILITADO_APERTURA: 'El SKU requiere habilitación en esta apertura.',
  FAMILIA_SIN_SKU: 'La familia no tiene SKU asociados.',
  FAMILIA_INACTIVA: 'La familia está inactiva.',
  SIN_DISPONIBILIDAD_ELEGIBLE: 'No hay stock elegible para esta oferta.',
  PRECIO_FAMILIAR_NO_VENDIBLE: 'La familia necesita un precio público positivo.',
  PRECIO_FAMILIAR_INVALIDO: 'El precio familiar debe ser un entero CLP válido.',
  BASE_STOCK_GRANEL_INVALIDA: 'La base de stock granel no es compatible.',
  STOCK_INVALIDO: 'El stock del SKU es inválido.',
  AGREGADO_FUERA_RANGO: 'El agregado excede el rango numérico seguro.',
};
const describirHallazgo = (codigo: string) => mensajes[codigo] ?? `Revisar ${codigo.toLowerCase().replaceAll('_', ' ')}.`;
export default function FamiliasSimulador() {
  const { tiene } = useSesionAdmin(), autorizado = tiene('productos:gestionar');
  const [lectura, setLectura] = useState<LecturaShadow | null>(null), [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false), [apertura, setApertura] = useState('');
  const [mapa, setMapa] = useState('[]'), [formato, setFormato] = useState<'JSON' | 'CSV'>('JSON');
  const [resultado, setResultado] = useState<ResultadoMapa | null>(null), [errorMapa, setErrorMapa] = useState('');
  const cargar = useCallback(async (aperturaId = '') => {
    setOcupado(true); setError(''); setResultado(null); setLectura(null);
    try {
      setLectura(await solicitarAdmin<LecturaShadow>(`/api/admin/familias/shadow${aperturaId ? `?apertura_id=${encodeURIComponent(aperturaId)}` : ''}`));
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo leer TEST.'); }
    finally { setOcupado(false); }
  }, []);
  useEffect(() => { if (autorizado) void cargar(); }, [autorizado, cargar]);
  function simular(e: FormEvent) {
    e.preventDefault(); setErrorMapa(''); setResultado(null);
    if (!lectura) return;
    try { setResultado(validarMapaPropuesto(leerMapaPropuesto(mapa, formato), lectura.familias, lectura.skus, lectura.contexto)); }
    catch (e) { setErrorMapa(e instanceof Error ? e.message : 'Mapa inválido.'); }
  }
  if (!autorizado) return <main className="mx-auto max-w-6xl p-6">Se requiere administración de productos TEST.</main>;
  return <main className="mx-auto max-w-6xl space-y-6 p-6">
    <AdminFase78Nav />
    <h1 className="font-heading text-3xl text-primary-dark">Simulador de familias · TEST</h1>
    <p>Solo lectura. La tienda sigue por SKU. Esta vista no reserva stock ni guarda el mapa propuesto.</p>
    <Link href="/admin/familias" className="inline-block text-primary-dark underline">Volver a familias y SKU</Link>
    <form onSubmit={e => { e.preventDefault(); void cargar(apertura.trim()); }} className="flex flex-wrap items-end gap-3">
      <label className="min-w-60">Apertura para disponibilidad <input className={inputClass} value={apertura} onChange={e => setApertura(e.target.value)} placeholder="APE-AAAAMMDD (opcional)" /></label>
      <button disabled={ocupado} className="rounded border px-4 py-2">{ocupado ? 'Leyendo…' : 'Actualizar lectura'}</button>
    </form>
    <p role="status" aria-live="polite">{error || (lectura ? `Lectura: ${lectura.lectura_en}. Diagnóstico; la confirmación debe volver a validar stock y apertura.` : ocupado ? 'Cargando TEST…' : '')}</p>
    {lectura && <>
      <section aria-labelledby="ofertas-shadow"><h2 id="ofertas-shadow" className="mb-3 text-xl font-semibold">Oferta pública simulada</h2>
        {!lectura.catalogo.length && <p>No hay familias cargadas.</p>}
        <div className="grid gap-4 sm:grid-cols-2">{lectura.catalogo.map((f, n) => <article key={`${f.oferta.familia_id}-${n}`} className="min-w-0 rounded-xl border bg-white p-4">
          <h3 className="font-semibold">{f.oferta.nombre_publico}</h3>
          <p className="break-all text-sm text-gray-600">Familia: {f.oferta.familia_id}</p>
          <p>{f.oferta.presentacion_publica}</p>
          <p className="text-sm">Política de marca: {f.oferta.politica_marca === 'VARIABLE' ? 'VARIABLE · marca omitida en la oferta' : f.oferta.politica_marca === 'EXPLICITA' ? 'EXPLICITA · marca pública definida' : 'NO_APLICA · sin marca pública'}</p>
          {f.oferta.politica_marca === 'EXPLICITA' && <p>Marca: {f.oferta.marca_publica}</p>}
          <p>{f.oferta.precio_venta === null ? 'Precio inválido' : pesos(f.oferta.precio_venta)}{f.oferta.modo_venta === 'GRANEL' ? ` por ${f.oferta.gramos_referencia} g` : ''}</p>
          <p className="font-medium">{f.disponible ? 'Disponible' : 'Agotado'}{f.oferta.activo === 'NO' ? ' · Familia inactiva' : ''}</p>
          <details className="mt-3"><summary className="cursor-pointer">Identidad física y stock interno</summary>
            <p className="my-2">Auditoría interna · agregado elegible: {valorOperativo(f.stock_agregado_interno)} {f.unidad_stock_interna}. La oferta solo indica Disponible/Agotado.</p>
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">SKU de {f.oferta.nombre_publico}</caption>
              <thead><tr>{['SKU', 'Marca física', 'Presentación', 'Contenido', 'Stock nativo', 'Equivalente', 'Elegible'].map(t => <th key={t} scope="col" className="p-2">{t}</th>)}</tr></thead>
              <tbody>{f.sku_integrantes.map((s, i) => <tr key={`${s.producto_id}-${i}`} className="border-t">
                <td className="p-2">{s.producto_id}</td><td className="p-2">{s.marca || 'Sin dato'}</td><td className="p-2">{s.presentacion || 'Sin dato'}</td>
                <td className="whitespace-nowrap p-2">{typeof s.contenido_cantidad === 'number' && s.contenido_unidad ? `${valorOperativo(s.contenido_cantidad)} ${s.contenido_unidad}` : 'Sin dato'}</td>
                <td className="p-2">{valorOperativo(s.stock_actual)}{s.gramos_unidad_stock ? ` × ${s.gramos_unidad_stock} g` : ''}</td>
                <td className="p-2">{s.equivalente ? 'Sí' : 'No'}</td><td className="p-2">{s.elegible ? 'Sí' : 'No'}</td>
              </tr>)}</tbody></table></div>
            {f.inconsistencias.length > 0 && <ul className="mt-2 list-inside list-disc break-words text-sm">{f.inconsistencias.map((w, i) => <li key={i}>{describirHallazgo(w.codigo)}{w.producto_id ? ` · ${w.producto_id}` : ''}</li>)}</ul>}
          </details>
        </article>)}</div>
      </section>
      <section className="rounded-xl border bg-white p-5" aria-labelledby="mapa-dry-run">
        <h2 id="mapa-dry-run" className="mb-2 text-xl font-semibold">Mapa propuesto · dry-run local</h2>
        <p className="mb-3">Solo IDs existentes. Marca, presentación y precio se validan contra la lectura. Ninguna fila se envía a guardar.</p>
        <form onSubmit={simular} className="space-y-3">
          <label className="block">Formato <select className={inputClass} value={formato} onChange={e => { setFormato(e.target.value as 'JSON' | 'CSV'); setResultado(null); setErrorMapa(''); }}><option>JSON</option><option>CSV</option></select></label>
          <label className="block">Asociaciones <textarea className={`${inputClass} font-mono text-sm`} rows={5} value={mapa} onChange={e => { setMapa(e.target.value); setResultado(null); }} aria-describedby="mapa-ejemplo" /></label>
          <p id="mapa-ejemplo" className="break-all text-sm">JSON: [{'{"familia_id":"FAM-…","producto_id":"PROD-…"}'}]. CSV: familia_id,producto_id.</p>
          <button className="rounded border px-4 py-2" disabled={ocupado}>Validar sin guardar</button>
        </form>
        <p role="status" aria-live="polite" className="mt-3">{errorMapa || resultado?.estado}</p>
        {resultado && <ul className="list-inside list-disc break-words text-sm">{resultado.hallazgos.map((h, i) => <li key={i}>{h.estado}: {describirHallazgo(h.codigo)} {h.familia_id} {h.producto_id}</li>)}</ul>}
      </section>
      <section aria-labelledby="identidad-faltante"><h2 id="identidad-faltante" className="mb-3 text-xl font-semibold">Datos humanos pendientes · SKU comerciales</h2>
        <p className="mb-2">No se deduce marca por nombre. La necesidad de agrupar SKU requiere un mapa aprobado.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Auditoría de identidad física pendiente</caption>
          <thead><tr>{['SKU', 'Nombre vigente', 'Estado', 'Falta identidad', 'Falta familia'].map(t => <th key={t} scope="col" className="p-2">{t}</th>)}</tr></thead>
          <tbody>{lectura.faltantes.map(s => <tr key={s.producto_id} className="border-t"><td className="p-2">{s.producto_id}</td><td className="p-2">{s.nombre}</td><td className="p-2">{s.estado}</td><td className="p-2">{s.falta_identidad_fisica ? 'Sí' : 'No'}</td><td className="p-2">{s.falta_familia ? 'Sí' : 'No'}</td></tr>)}</tbody>
        </table></div>
      </section>
    </>}
  </main>;
}
