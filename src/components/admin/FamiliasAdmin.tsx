'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import AdminFase78Nav from './AdminFase78Nav';
import { useSesionAdmin } from '@/lib/fase9/useSesionAdmin';
import { resolverIntentoIdempotente, solicitarAdmin, type IntentoIdempotente } from '@/lib/fase8/clienteAdmin';
import type { FamiliaProducto, ValidacionFamilias } from '@/lib/familiasProducto';
import type { ProductoAdmin } from '@/lib/appsScriptPedidos';

const opciones: Record<string, string[]> = {
  activo: ['SI', 'NO'], categoria: ['Alimentos', 'Limpieza', 'Higiene', 'Granel'], modo_venta: ['UNIDAD', 'GRANEL'],
  unidad_venta: ['unidad', 'pack', 'kg', 'litro', 'g'], permite_decimal: ['NO', 'SI'], politica_marca: ['VARIABLE', 'EXPLICITA', 'NO_APLICA'], contenido_unidad: ['', 'g', 'ml', 'unidad'],
};
const camposOferta = [
  ['familia_id', 'ID familia'], ['activo', 'Estado'], ['nombre_publico', 'Nombre público'], ['categoria', 'Categoría'], ['precio_venta', 'Precio público CLP'],
  ['modo_venta', 'Modo de venta'], ['unidad_venta', 'Unidad de venta'], ['permite_decimal', 'Permite decimal'], ['paso_venta', 'Paso de venta'],
  ['gramos_referencia', 'Referencia en gramos'], ['contenido_cantidad', 'Contenido'], ['contenido_unidad', 'Unidad del contenido'],
  ['presentacion_publica', 'Presentación pública'], ['politica_marca', 'Política de marca'], ['marca_publica', 'Marca pública'],
] as const;
const numeros = new Set(['precio_venta', 'paso_venta', 'gramos_referencia', 'contenido_cantidad']);
const inicial = { familia_id: '', activo: 'NO', nombre_publico: '', categoria: 'Limpieza', precio_venta: '', modo_venta: 'UNIDAD', unidad_venta: 'unidad', permite_decimal: 'NO', paso_venta: '1', gramos_referencia: '', contenido_cantidad: '', contenido_unidad: '', presentacion_publica: '', politica_marca: 'VARIABLE', marca_publica: '' };
const inputClass = 'w-full rounded border border-gray-300 p-2 text-gray-900';

export default function FamiliasAdmin() {
  const { tiene } = useSesionAdmin(), autorizado = tiene('productos:gestionar');
  const [familias, setFamilias] = useState<FamiliaProducto[]>([]), [skus, setSkus] = useState<ProductoAdmin[]>([]);
  const [oferta, setOferta] = useState<Record<string, string>>({ ...inicial }), [editando, setEditando] = useState<FamiliaProducto | null>(null);
  const [skuId, setSkuId] = useState(''), [identidad, setIdentidad] = useState<Record<string, string>>({});
  const [auditoria, setAuditoria] = useState<ValidacionFamilias | null>(null), [apertura, setApertura] = useState('');
  const [mensaje, setMensaje] = useState(''), [ocupado, setOcupado] = useState(false);
  const intentoOferta = useRef<IntentoIdempotente | null>(null), intentoSku = useRef<IntentoIdempotente | null>(null);
  const cargar = useCallback(async () => {
    const [f, p] = await Promise.all([solicitarAdmin<{ familias: FamiliaProducto[] }>('/api/admin/familias'), solicitarAdmin<ProductoAdmin[]>('/api/admin/productos')]);
    setFamilias(f.familias); setSkus(p);
  }, []);
  useEffect(() => { if (autorizado) cargar().catch(e => setMensaje(e.message)); }, [autorizado, cargar]);
  const seleccionarOferta = (f: FamiliaProducto | null) => {
    setEditando(f); setOferta(f ? Object.fromEntries(camposOferta.map(([c]) => [c, String(f[c] ?? '')])) : { ...inicial });
  };
  const seleccionarSku = (id: string) => {
    setSkuId(id); const p = skus.find(s => s.id_producto === id);
    setIdentidad(Object.fromEntries(['familia_id', 'marca', 'presentacion', 'contenido_cantidad', 'contenido_unidad'].map(c => [c, String(p?.[c as keyof ProductoAdmin] ?? '')])));
  };
  async function guardarOferta(e: FormEvent) {
    e.preventDefault(); if (ocupado) return; setOcupado(true); setMensaje('');
    try {
      const familia: Record<string, unknown> = Object.fromEntries(camposOferta.map(([c]) => [c, numeros.has(c) && oferta[c] !== '' ? Number(oferta[c]) : oferta[c]]));
      if (oferta.modo_venta === 'GRANEL') { familia.contenido_cantidad = ''; familia.contenido_unidad = ''; }
      else familia.gramos_referencia = '';
      if (oferta.politica_marca !== 'EXPLICITA') familia.marca_publica = '';
      // La imagen vigente se conserva; esta interfaz no administra fotografías.
      if (editando?.imagen_url) familia.imagen_url = editando.imagen_url;
      const payload = { familia, ...(editando ? { version_esperada: editando.version_oferta } : {}) };
      intentoOferta.current = resolverIntentoIdempotente(intentoOferta.current, 'familia', payload);
      await solicitarAdmin('/api/admin/familias', { method: editando ? 'PATCH' : 'POST', body: JSON.stringify({ ...payload, idempotency_key: intentoOferta.current.clave }) });
      intentoOferta.current = null; await cargar(); seleccionarOferta(null); setMensaje('Oferta guardada en TEST. Catálogo familiar todavía desactivado.');
    } catch (e) { setMensaje(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { setOcupado(false); }
  }
  async function guardarIdentidad(e: FormEvent) {
    e.preventDefault(); if (ocupado || !skuId) return; setOcupado(true); setMensaje('');
    try {
      const cambios = { ...identidad, contenido_cantidad: identidad.contenido_cantidad === '' ? '' : Number(identidad.contenido_cantidad) };
      const payload = { producto_id: skuId, cambios };
      intentoSku.current = resolverIntentoIdempotente(intentoSku.current, 'identidad', payload);
      await solicitarAdmin('/api/admin/familias/identidad', { method: 'PATCH', body: JSON.stringify({ ...payload, idempotency_key: intentoSku.current.clave }) });
      intentoSku.current = null; await cargar(); setMensaje('Identidad guardada. Stock, costo y precio SKU conservados.');
    } catch (e) { setMensaje(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { setOcupado(false); }
  }
  if (!autorizado) return <main className="mx-auto max-w-5xl p-6">Se requiere administración de productos TEST.</main>;
  return <main className="mx-auto max-w-5xl space-y-6 p-6">
    <AdminFase78Nav /><h1 className="font-heading text-3xl text-primary-dark">Familias y SKU · TEST</h1>
    <p>Preparación administrativa. La tienda y los pedidos siguen operando por SKU.</p>
    <p role="status" aria-live="polite">{mensaje}</p>
    <section className="rounded-xl border bg-white p-5"><h2 className="mb-3 text-xl font-semibold">Oferta pública</h2>
      <div className="mb-4 flex flex-wrap gap-2"><button onClick={() => seleccionarOferta(null)} disabled={ocupado} className="rounded border px-3 py-2">Nueva familia</button>
        {familias.map(f => <button key={f.familia_id} disabled={ocupado} onClick={() => seleccionarOferta(f)} className="rounded border px-3 py-2">{f.nombre_publico} · {f.activo === 'SI' ? 'activa' : 'inactiva'} · v{f.version_oferta}</button>)}
        {!familias.length && <p>No hay familias cargadas.</p>}</div>
      <form onSubmit={guardarOferta} className="grid gap-4 sm:grid-cols-2">
        {camposOferta.map(([campo, label]) => <label key={campo}>{label}
          {opciones[campo] ? <select className={inputClass} value={oferta[campo]} disabled={ocupado} onChange={e => setOferta({ ...oferta, [campo]: e.target.value })}>{opciones[campo].map(o => <option key={o} value={o}>{o || 'Sin definir'}</option>)}</select>
            : <input className={inputClass} value={oferta[campo]} readOnly={campo === 'familia_id' && !!editando} disabled={ocupado} type={numeros.has(campo) ? 'number' : 'text'} step="any" onChange={e => setOferta({ ...oferta, [campo]: e.target.value })} />}
        </label>)}
        <button disabled={ocupado} className="rounded bg-primary px-4 py-2 text-white">{editando ? 'Guardar oferta' : 'Crear familia'}</button>
      </form>
    </section>
    <section className="rounded-xl border bg-white p-5"><h2 className="mb-3 text-xl font-semibold">Identidad física</h2><p className="mb-3">Selecciona un SKU. La asociación exige equivalencia; la marca no se infiere del nombre.</p>
      <form onSubmit={guardarIdentidad} className="grid gap-4 sm:grid-cols-2">
        <label>SKU<select className={inputClass} value={skuId} disabled={ocupado} onChange={e => seleccionarSku(e.target.value)}><option value="">Seleccionar</option>{skus.map(p => <option key={p.id_producto} value={p.id_producto}>{p.id_producto} · {p.nombre} · {p.marca || 'marca sin definir'}</option>)}</select></label>
        <label>Familia<select className={inputClass} value={identidad.familia_id ?? ''} disabled={ocupado || !skuId} onChange={e => setIdentidad({ ...identidad, familia_id: e.target.value })}><option value="">Sin familia · SKU_V1</option>{familias.map(f => <option key={f.familia_id} value={f.familia_id}>{f.nombre_publico} · {f.familia_id}</option>)}</select></label>
        {(['marca', 'presentacion', 'contenido_cantidad'] as const).map(c => <label key={c}>{c === 'marca' ? 'Marca física' : c === 'presentacion' ? 'Presentación física' : 'Contenido'}<input className={inputClass} value={identidad[c] ?? ''} type={c === 'contenido_cantidad' ? 'number' : 'text'} step="any" disabled={ocupado || !skuId} onChange={e => setIdentidad({ ...identidad, [c]: e.target.value })} /></label>)}
        <label>Unidad del contenido<select className={inputClass} value={identidad.contenido_unidad ?? ''} disabled={ocupado || !skuId} onChange={e => setIdentidad({ ...identidad, contenido_unidad: e.target.value })}>{opciones.contenido_unidad.map(o => <option key={o} value={o}>{o || 'Sin definir'}</option>)}</select></label>
        <button disabled={ocupado || !skuId} className="rounded bg-primary px-4 py-2 text-white">Guardar identidad física</button>
      </form>
    </section>
    <section className="rounded-xl border bg-white p-5"><h2 className="mb-3 text-xl font-semibold">Auditoría del mapa · solo lectura</h2>
      <label>Apertura opcional<input className={inputClass} value={apertura} onChange={e => setApertura(e.target.value)} placeholder="APE-AAAAMMDD" /></label>
      <button disabled={ocupado} className="my-3 rounded border px-4 py-2" onClick={async () => { setOcupado(true); try { setAuditoria(await solicitarAdmin<ValidacionFamilias>('/api/admin/familias?auditoria=SI&apertura_id=' + encodeURIComponent(apertura))); } catch (e) { setMensaje(e instanceof Error ? e.message : 'Error de auditoría.'); } finally { setOcupado(false); } }}>Auditar sin corregir</button>
      {auditoria && <div role="status">{auditoria.valido ? 'Sin inconsistencias en este contexto.' : <ul className="list-disc pl-5">{auditoria.inconsistencias.map((i, n) => <li key={n}>{i.codigo} · {i.familia_id} {i.producto_id}</li>)}</ul>}</div>}
    </section>
  </main>;
}
