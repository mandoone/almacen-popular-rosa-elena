'use client';
import { useEffect, useRef, useState } from 'react';
import AdminFase78Nav from '@/components/admin/AdminFase78Nav';
import { useSesionAdmin } from '@/lib/fase9/useSesionAdmin';
import type { ProductoAdmin } from '@/lib/appsScriptPedidos';
import { solicitarAdmin } from '@/lib/fase8/clienteAdmin';
import { prepararLineaConteo, acreditarMovimientoConteo, type LineaConteo } from '@/lib/fase8/inventario';
import { esGranel, formatoPeso } from '@/lib/granel';

interface Plan { actor_id: string; sesion_id: string; lineas: LineaConteo[] }
const input = 'mt-1 w-full rounded border bg-white p-2 text-sm';
export default function InventarioPage() {
  const { sesion, tiene } = useSesionAdmin();
  const [productos, setProductos] = useState<ProductoAdmin[]>([]), [busqueda, setBusqueda] = useState(''), [id, setId] = useState('');
  const [cantidad, setCantidad] = useState(''), [unidad, setUnidad] = useState<'unidad'|'g'|'kg'>('unidad'), [observacion, setObservacion] = useState('');
  const [revisado, setRevisado] = useState(false), [lineas, setLineas] = useState<LineaConteo[]>([]), [plan, setPlan] = useState<Plan | null>(null);
  const [completadas, setCompletadas] = useState<string[]>([]), [mensaje, setMensaje] = useState(''), [ocupado, setOcupado] = useState(false);
  const enCurso = useRef(false), sesionId = useRef('');
  const storage = sesion ? `inventario-test-v1-${sesion.actor_id}` : '';
  async function cargar() { setProductos(await solicitarAdmin<ProductoAdmin[]>('/api/admin/productos')); }
  useEffect(() => {
    if (!sesion || !tiene('stock:ajustar')) return;
    sesionId.current = crypto.randomUUID().replaceAll('-', '');
    void cargar().catch(() => setMensaje('No se pudo leer stock. No apliques un conteo sin lectura.'));
    try {
      const raw = sessionStorage.getItem(`inventario-test-v1-${sesion.actor_id}`);
      if (raw) {
        const p = JSON.parse(raw) as Plan;
        if (p.actor_id !== sesion.actor_id || !Array.isArray(p.lineas) || p.lineas.length > 100 || new Set(p.lineas.map(l => l.producto_id)).size !== p.lineas.length
          || p.lineas.some(l => !/^PROD-[A-Za-z0-9-]{1,80}$/.test(l.producto_id) || ![l.stock_esperado,l.stock_contado,l.delta].every(Number.isFinite)
            || l.motivo !== 'recuento_fisico' || typeof l.observaciones !== 'string' || l.observaciones.length>500 || l.idempotency_key.length>100
            || l.stock_contado < 0 || l.stock_esperado < 0 || Math.abs(l.stock_contado-l.stock_esperado-l.delta)>1e-8 || l.idempotency_key !== `INV-${p.sesion_id}-${l.producto_id}`)) throw new Error('Plan inválido');
        setPlan(p); setMensaje('Sesión recuperada. Consulta evidencia y continúa con las mismas referencias; no se presupone ningún ajuste aplicado.');
      }
    } catch { setMensaje('No se pudo recuperar la sesión de conteo. Conserva la pestaña y solicita revisión antes de repetir.'); }
  }, [sesion, tiene]);
  const actual = productos.find(p => p.id_producto === id);
  if (!tiene('stock:ajustar')) return <main className="p-6">Inventario requiere Operación o Administración.</main>;
  function agregar() {
    try {
      if (!actual || !revisado) throw new Error('Selecciona SKU y confirma que revisaste el conteo.');
      if (lineas.some(l => l.producto_id === id)) throw new Error('SKU ya incluido. Retira esa línea antes de volver a contar.');
      if (lineas.length >= 100) throw new Error('Máximo100 SKU por sesión.');
      setLineas([...lineas, prepararLineaConteo(actual, cantidad, unidad, sesionId.current, observacion)]);
      setCantidad(''); setObservacion(''); setRevisado(false); setMensaje('Línea incorporada al preview; todavía sin guardar stock.');
    } catch (e) { setMensaje(e instanceof Error ? e.message : 'Conteo inválido.'); }
  }
  function congelar() {
    if (!sesion || !lineas.length) return;
    const p = { actor_id: sesion.actor_id, sesion_id: sesionId.current, lineas };
    try { sessionStorage.setItem(storage, JSON.stringify(p)); setPlan(p); setMensaje('Plan congelado y referencias recuperables en esta pestaña. Pulsa Aplicar para confirmar las líneas revisadas.'); }
    catch { setMensaje('El navegador no puede preservar las referencias. No se aplicó nada.'); }
  }
  async function aplicar() {
    if (!plan || !sesion || enCurso.current) return;
    enCurso.current = true; setOcupado(true);
    try {
      for (const l of plan.lineas) {
        if (!l.delta) {
          const vigente=(await solicitarAdmin<ProductoAdmin[]>('/api/admin/productos')).find(p=>p.id_producto===l.producto_id);
          if(!vigente||vigente.stock_actual!==l.stock_esperado)throw new Error(`El stock de ${l.producto_id} cambió; la línea sin diferencia requiere revisión. No se ajustó.`);
          setCompletadas(a => [...new Set([...a, l.producto_id])]); continue;
        }
        const url = `/api/admin/stock/ajustes?${new URLSearchParams({producto_id:l.producto_id,referencia_id:l.idempotency_key})}`;
        let evidencia = await solicitarAdmin<Record<string,unknown>[]>(url);
        if (!acreditarMovimientoConteo(l, sesion.actor_id, evidencia)) {
          try { await solicitarAdmin('/api/admin/stock/ajustes', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({producto_id:l.producto_id,delta:l.delta,stock_esperado:l.stock_esperado,motivo:l.motivo,observaciones:l.observaciones,idempotency_key:l.idempotency_key}) }); }
          catch { /* Nunca recrear la key: se resuelve por readback de la referencia durable. */ }
          evidencia = await solicitarAdmin<Record<string,unknown>[]>(url);
          if (!acreditarMovimientoConteo(l, sesion.actor_id, evidencia)) throw new Error(`Sin efecto acreditado para ${l.producto_id}. Puede haber stock obsoleto o respuesta incierta. Consulta/continúa este mismo plan; no lo recrees.`);
        }
        setCompletadas(a => [...new Set([...a, l.producto_id])]);
      }
      await cargar(); setMensaje('Conteo concluido: movimientos acreditados por referencia/actor/efecto. La lectura muestra el stock vigente, incluidos movimientos posteriores.');
    } catch (e) { setMensaje(e instanceof Error ? e.message : 'Respuesta incierta. Mantén el plan y consulta antes de reintentar.'); }
    finally { enCurso.current = false; setOcupado(false); }
  }
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-8"><AdminFase78Nav /><h1 className="text-3xl font-bold text-primary-dark">Inventario físico · TEST</h1>
    <p>Actor: {sesion?.nombre || sesion?.actor_id}. Conteo parcial: los SKU omitidos no cambian ni pasan a cero. No acredita stock físico F10 automáticamente.</p>
    <p role="status" className="break-words rounded bg-blue-50 p-3 text-sm">{mensaje || 'Selecciona un SKU, cuenta y revisa antes de aplicar.'}</p>
    {!plan && <section className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2"><label>Buscar SKU<input className={input} value={busqueda} onChange={e=>setBusqueda(e.target.value)} /></label><label>SKU físico<select className={input} value={id} onChange={e=>{setId(e.target.value);const p=productos.find(p=>p.id_producto===e.target.value);setUnidad(p&&esGranel(p)?'kg':'unidad');setCantidad('');setRevisado(false);}}><option value="">Seleccionar</option>{productos.filter(p=>`${p.id_producto} ${p.nombre} ${p.marca??''}`.toLowerCase().includes(busqueda.toLowerCase())).map(p=><option key={p.id_producto} value={p.id_producto}>{p.id_producto} · {p.nombre} · {p.activo}</option>)}</select></label>
      {actual && <><p className="sm:col-span-2">Stock leído: {esGranel(actual)?formatoPeso(actual.stock_actual*Number(actual.gramos_unidad_stock)):actual.stock_actual}. {esGranel(actual)?`Base histórica ${actual.gramos_unidad_stock}g; se conserva.`:'Unidades/paquetes enteros.'}</p><label>Cantidad contada<input className={input} inputMode="decimal" value={cantidad} onChange={e=>{setCantidad(e.target.value);setRevisado(false);}} /></label><label>Unidad de conteo<select className={input} value={unidad} onChange={e=>{setUnidad(e.target.value as typeof unidad);setRevisado(false);}}>{(esGranel(actual)?['g','kg']:['unidad']).map(u=><option key={u}>{u}</option>)}</select></label><label className="sm:col-span-2">Observación / referencia de revisión<input maxLength={300} className={input} value={observacion} onChange={e=>setObservacion(e.target.value)} /></label><label className="sm:col-span-2 flex gap-2"><input type="checkbox" checked={revisado} onChange={e=>setRevisado(e.target.checked)} />Revisé SKU, unidad, cantidad y diferencia; corresponde al conteo realizado.</label><button type="button" disabled={!revisado} onClick={agregar} className="rounded border p-3 disabled:opacity-40 sm:col-span-2">Agregar al preview</button></>}
    </section>}
    <section className="rounded-xl border bg-white p-4"><h2 className="text-xl font-semibold">Preview de sesión · {plan?.sesion_id ?? sesionId.current}</h2><ul className="mt-3 space-y-3">{(plan?.lineas??lineas).map(l=><li key={l.producto_id} className="break-words rounded border p-3"><p>{l.producto_id} · {l.nombre}</p><p>Base stock: {l.stock_esperado} → contado {l.stock_contado} · diferencia {l.delta>0?'+':''}{l.delta}</p><p className="text-xs">{l.observaciones} · {l.idempotency_key}</p>{!plan?<button className="mt-2 underline" onClick={()=>setLineas(a=>a.filter(x=>x.producto_id!==l.producto_id))}>Retirar del preview</button>:<p>{completadas.includes(l.producto_id)?l.delta?'Movimiento acreditado':'Sin diferencia; sin movimiento':'Pendiente de reconciliar/aplicar'}</p>}</li>)}</ul>
      {!plan?<button disabled={!lineas.length} onClick={congelar} className="mt-4 rounded bg-primary px-4 py-3 text-white disabled:opacity-40">Revisar y congelar plan</button>:<div className="mt-4 flex flex-wrap gap-3"><button disabled={ocupado} onClick={()=>void aplicar()} className="rounded bg-primary px-4 py-3 text-white">{ocupado?'Reconciliando…':'Aplicar / consultar y continuar mismo plan'}</button><button disabled={ocupado||completadas.length!==plan.lineas.length} onClick={()=>{sessionStorage.removeItem(storage);setPlan(null);setLineas([]);setCompletadas([]);sesionId.current=crypto.randomUUID().replaceAll('-','');}} className="rounded border p-3 disabled:opacity-40">Cerrar sesión de conteo y comenzar otra</button></div>}
    </section>
  </main>;
}
