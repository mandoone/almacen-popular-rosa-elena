'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { prepararArqueoTurno, type GastoAperturaTurno, type ResumenCajaTurno } from '@/lib/fase8/cajaTurno';
import { pesos, solicitarAdmin } from '@/lib/fase8/clienteAdmin';
import { useSesionAdmin } from '@/lib/fase9/useSesionAdmin';

interface Cierre {cierre_id:string;estado_cierre:string;idempotency_key:string;responsable:string;fecha_hora:string;efectivo_esperado:number;efectivo_contado:number;diferencia:number;observaciones:string}
interface Fuente {resumen:ResumenCajaTurno;gastos:GastoAperturaTurno[];fuente_hash:string;gastos_sin_asociacion:number;cierres:Cierre[]}
interface Intento {apertura_id:string;saldo_inicial:number;efectivo_contado:number;observaciones:string;fuente_hash:string;revision_confirmada:true;idempotency_key:string}
export default function ArqueoTurno({aperturaId}:{aperturaId:string}) {
 const {sesion}=useSesionAdmin(), ocupado=useRef(false);
 const [fuente,setFuente]=useState<Fuente|null>(null),[mensaje,setMensaje]=useState(''),[inicial,setInicial]=useState(''),[contado,setContado]=useState(''),[nota,setNota]=useState(''),[revisado,setRevisado]=useState(false),[intento,setIntento]=useState<Intento|null>(null),[enviando,setEnviando]=useState(false);
 const cargar=useCallback(async()=>{
   if(!aperturaId)return;
   try{const f=await solicitarAdmin<Fuente>(`/api/admin/caja-turno?apertura_id=${encodeURIComponent(aperturaId)}`);setFuente(f);return f;}
   catch(e){setFuente(null);setMensaje(`BLOQUEADO: ${e instanceof Error?e.message:'No se pudo leer caja.'}`);}
 },[aperturaId]);
 useEffect(()=>{setFuente(null);setInicial('');setContado('');setNota('');setRevisado(false);setIntento(null);setMensaje('');void cargar();},[cargar]);
 let preview:ReturnType<typeof prepararArqueoTurno>|null=null;
 try{if(fuente && /^\d+$/.test(inicial) && /^\d+$/.test(contado))preview=prepararArqueoTurno(fuente.resumen,fuente.gastos,Number(inicial),Number(contado));}catch{/* El formulario sigue bloqueado hasta que los montos sean válidos. */}
 const cierre=fuente?.cierres.find(c=>c.estado_cierre==='CONFIRMADA');
 async function confirmar(){
   if(ocupado.current || !fuente || !preview || !revisado || !nota.trim())return;
   ocupado.current=true;setEnviando(true);
   const p=intento || {apertura_id:aperturaId,saldo_inicial:Number(inicial),efectivo_contado:Number(contado),observaciones:nota.trim(),fuente_hash:fuente.fuente_hash,revision_confirmada:true as const,idempotency_key:`CIERRE-${crypto.randomUUID()}`};
   setIntento(p);
   try{
     // Primero readback: un timeout anterior nunca genera una segunda clave.
     let f=await cargar();
     let encontrado=f?.cierres.find(c=>c.idempotency_key===p.idempotency_key && c.estado_cierre==='CONFIRMADA');
     if(!encontrado){await solicitarAdmin('/api/admin/caja-turno',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});f=await cargar();encontrado=f?.cierres.find(c=>c.idempotency_key===p.idempotency_key && c.estado_cierre==='CONFIRMADA');}
     if(!encontrado)throw new Error('No se acreditó un cierre confirmado en readback. Conserva esta pestaña y reintenta con la misma clave.');
     if(encontrado.responsable!==sesion?.actor_id)throw new Error('Responsable de readback incompatible.');
     setMensaje(`Cierre ${encontrado.cierre_id} confirmado y leído. Historial inmutable.`);setIntento(null);
   }catch(e){setMensaje(`${e instanceof Error?e.message:'Respuesta incierta.'} No cambies importes ni cierres esta pestaña; reintenta la misma operación.`);}
   finally{ocupado.current=false;setEnviando(false);}
 }
 return <section className="mt-6 space-y-4 rounded-xl border border-primary/20 bg-white p-5 shadow-sm">
   <h2 className="text-xl font-bold text-primary-dark">Arqueo y cierre financiero TEST</h2>
   <p className="text-sm">Responsable: {sesion?.nombre || sesion?.actor_id}. El cierre financiero archiva las cifras revisadas. El calendario de la apertura se administra por separado.</p>
   {mensaje && <p role="status" className="rounded bg-amber-50 p-3 text-sm text-amber-950">{mensaje}</p>}
   {fuente && <>
     <p className="text-sm">Gastos asociados explícitamente: {fuente.gastos.length}. Sin asociación histórica: {fuente.gastos_sin_asociacion} (excluidos, revisar sin atribuir por fecha).</p>
     {cierre ? <p className="rounded bg-green-50 p-3">Turno cerrado: {cierre.cierre_id}. Para corregirlo se requiere una rectificación auditada; no se edita el original.</p> : <fieldset disabled={enviando || Boolean(intento)} className="grid gap-4 sm:grid-cols-2">
       <label className="text-sm">Saldo inicial efectivo CLP (declarado, no estimado)<input value={inicial} onChange={e=>setInicial(e.target.value)} inputMode="numeric" className="mt-1 w-full rounded border p-2" /></label>
       <label className="text-sm">Efectivo contado CLP<input value={contado} onChange={e=>setContado(e.target.value)} inputMode="numeric" className="mt-1 w-full rounded border p-2" /></label>
       <label className="text-sm sm:col-span-2">Observación del cierre / diferencias<textarea value={nota} onChange={e=>setNota(e.target.value)} maxLength={500} className="mt-1 w-full rounded border p-2" /></label>
       <label className="flex items-start gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={revisado} onChange={e=>setRevisado(e.target.checked)} />Revisé cobros, transferencias, pendientes, gastos y diferencia. Los importes de ensayo no son saldos oficiales.</label>
     </fieldset>}
     {preview && <div className="grid gap-3 rounded bg-blue-50 p-3 text-sm sm:grid-cols-2">
       <p>Cobrado en efectivo: <strong>{pesos(preview.efectivo_cobrado)}</strong></p><p>Transferencias: {pesos(preview.transferencias_cobradas)}</p>
       <p>Pendiente de pago: {pesos(preview.pagos_pendientes)}</p><p>Gastos de efectivo: {pesos(preview.gastos_efectivo)}</p>
       <p>Efectivo esperado: <strong>{pesos(preview.efectivo_esperado)}</strong></p><p>Diferencia: <strong>{pesos(preview.diferencia)}</strong></p>
       {preview.advertencias.map(a=><p key={a} className="text-amber-900 sm:col-span-2">{a}</p>)}
     </div>}
     {!cierre && <button type="button" disabled={enviando || !preview || !revisado || !nota.trim()} onClick={()=>void confirmar()} className="rounded bg-primary px-4 py-2 font-semibold text-white disabled:opacity-40">{intento?'Reconciliar mismo cierre':'Confirmar cierre revisado TEST'}</button>}
     <h3 className="font-semibold">Historial de cierres (sin edición)</h3>
     {fuente.cierres.length===0?<p className="text-sm">Sin cierres registrados.</p>:fuente.cierres.map(c=><article key={c.cierre_id} className="break-words rounded border p-3 text-sm"><strong>{c.estado_cierre} · {c.cierre_id}</strong><p>{c.fecha_hora} · {c.responsable}</p><p>Esperado {pesos(c.efectivo_esperado)} · contado {pesos(c.efectivo_contado)} · diferencia {pesos(c.diferencia)}</p><p>{c.observaciones}</p></article>)}
   </>}
 </section>;
}
