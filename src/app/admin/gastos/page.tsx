'use client';

import { useSesionAdmin } from '@/lib/fase9/useSesionAdmin';

import { FormEvent, useEffect, useRef, useState } from 'react';
import AdminFase78Nav from '@/components/admin/AdminFase78Nav';
import type { GastoExtraAdmin } from '@/lib/appsScriptPedidos';
import { pesos, resolverIntentoIdempotente, solicitarAdmin, type IntentoIdempotente } from '@/lib/fase8/clienteAdmin';
import { CATEGORIAS_GASTO_EXTRA } from '@/lib/fase7/compras';
type GastoConRecibo = GastoExtraAdmin & {idempotency_key?:string};

export default function GastosPage() {
  const { sesion } = useSesionAdmin();
  const enCurso = useRef(false);
  const [gastos, setGastos] = useState<GastoExtraAdmin[]>([]);
  const [categoria, setCategoria] = useState('transporte');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState(0);
  const [observaciones, setObservaciones] = useState('');
  const [aperturas, setAperturas] = useState<Array<{apertura_id:string;lugar:string}>>([]);
  const [aperturaId, setAperturaId] = useState('');
  const [medio, setMedio] = useState('efectivo');
  const [pendiente, setPendiente] = useState(false);
  const [estado, setEstado] = useState('Cargando gastos TEST...');
  const [enviando, setEnviando] = useState(false);
  const intento = useRef<IntentoIdempotente | null>(null);

  async function cargar() {
    try { setGastos(await solicitarAdmin<GastoExtraAdmin[]>('/api/admin/gastos')); }
    catch (error) { setEstado(error instanceof Error ? error.message : 'No se pudieron cargar los gastos.'); }
  }
  useEffect(() => { void cargar(); void solicitarAdmin<Array<{apertura_id:string;lugar:string}>>('/api/admin/aperturas').then(setAperturas).catch(()=>setEstado('No se pudieron leer aperturas; gasto sin asociación disponible.')); }, []);

  async function guardar(evento: FormEvent) {
    evento.preventDefault(); if (enCurso.current) return; enCurso.current=true; setEnviando(true);
    try {
      const payload = { categoria, descripcion, monto, observaciones, ...(aperturaId ? {apertura_id:aperturaId,forma_pago:medio}: {}) };
      intento.current = resolverIntentoIdempotente(intento.current, 'GASTO', payload);
      setPendiente(true);
      const clave = intento.current.clave;
      let lista = await solicitarAdmin<GastoConRecibo[]>('/api/admin/gastos');
      let gasto = lista.find(g=>g.idempotency_key===clave);
      if (!gasto) { await solicitarAdmin<GastoExtraAdmin>('/api/admin/gastos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, idempotency_key: clave }),
      }); lista = await solicitarAdmin<GastoConRecibo[]>('/api/admin/gastos'); gasto = lista.find(g=>g.idempotency_key===clave); }
      if (!gasto || gasto.responsable!==sesion?.actor_id || Number(gasto.monto)!==monto || gasto.descripcion!==descripcion.trim()) throw new Error('Readback no acreditado. Conserva esta pestaña y reintenta la misma clave.');
      intento.current = null;
      setPendiente(false);
      setEstado(`Gasto ${gasto.gasto_id} registrado en TEST.`); setDescripcion(''); setMonto(0); setObservaciones(''); await cargar();
    } catch (error) { setEstado(`${error instanceof Error ? error.message : 'No se pudo registrar el gasto.'} Reintenta sin cambiar campos; no se genera otra clave.`); }
    finally { enCurso.current=false; setEnviando(false); }
  }

  return <main className="min-h-screen bg-background px-4 py-8"><div className="mx-auto max-w-5xl"><AdminFase78Nav />
    <h1 className="font-serif text-3xl font-bold text-primary-dark">Gastos extra <span className="text-sm text-amber-700">TEST</span></h1>
    <p className="mb-5 text-sm text-gray-600">Bencina, bolsas, propina, transporte, materiales y otros; sin borrado destructivo.</p>
    {estado && <p role="status" className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{estado}</p>}
    <div className="grid gap-6 lg:grid-cols-2"><form onSubmit={guardar} className="space-y-4 rounded-xl bg-white p-5 shadow-sm"><fieldset disabled={pendiente || enviando} className="space-y-4">
      <label className="block text-sm">Categoría<select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="mt-1 w-full rounded-md border p-2">{CATEGORIAS_GASTO_EXTRA.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="block text-sm">Descripción<input required value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={200} className="mt-1 w-full rounded-md border p-2" /></label>
      <label className="block text-sm">Monto CLP<input required type="number" min="1" step="1" value={monto} onChange={(e) => setMonto(Number(e.target.value))} className="mt-1 w-full rounded-md border p-2" /></label>
      <p className="text-sm">Responsable de sesión: {sesion?.nombre || sesion?.actor_id}</p>
      <label className="block text-sm">Apertura de este gasto (asociación explícita)<select value={aperturaId} onChange={e=>setAperturaId(e.target.value)} className="mt-1 w-full rounded border p-2"><option value="">Sin asociación a una apertura</option>{aperturas.map(a=><option key={a.apertura_id} value={a.apertura_id}>{a.apertura_id} · {a.lugar}</option>)}</select></label>
      {aperturaId && <label className="block text-sm">Pagado desde<select value={medio} onChange={e=>setMedio(e.target.value)} className="mt-1 w-full rounded border p-2"><option value="efectivo">Efectivo de la apertura</option><option value="transferencia">Transferencia (separada del efectivo)</option></select></label>}
      <label className="block text-sm">Observaciones<textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} maxLength={250} className="mt-1 w-full rounded-md border p-2" /></label></fieldset>
      <button disabled={enviando} className="rounded-md bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50">{pendiente?'Reconciliar mismo gasto':'Registrar gasto TEST'}</button>
    </form><section className="rounded-xl bg-white p-5 shadow-sm"><h2 className="mb-3 font-semibold">Historial</h2><div className="space-y-3">{gastos.length === 0 ? <p className="text-sm text-gray-500">Sin gastos.</p> : gastos.map((gasto) => <article key={gasto.gasto_id} className="rounded-lg border p-3 text-sm"><div className="flex justify-between"><strong>{gasto.descripcion}</strong><span>{pesos(gasto.monto)}</span></div><p className="text-xs text-gray-500">{gasto.categoria} · {gasto.responsable} · {gasto.fecha_hora}</p></article>)}</div></section></div>
  </div></main>;
}
