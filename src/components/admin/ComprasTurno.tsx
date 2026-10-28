'use client';
import { useEffect,useRef,useState,type FormEvent } from 'react';
import { useSesionAdmin } from '@/lib/fase9/useSesionAdmin';
import AdminFase78Nav from './AdminFase78Nav';
import type { CompraAdmin,CompraConDetalle,ProductoAdmin } from '@/lib/appsScriptPedidos';
import { solicitarAdmin,resolverIntentoIdempotente,pesos,type IntentoIdempotente } from '@/lib/fase8/clienteAdmin';
import { lineaCompraNatural } from '@/lib/fase8/compraNatural';
import { esGranel,formatoPeso } from '@/lib/granel';
interface Linea {key:string;producto_id:string;cantidad:string;unidad:'unidad'|'g'|'kg';costo:string;busqueda:string}
const nueva=():Linea=>({key:crypto.randomUUID(),producto_id:'',cantidad:'',unidad:'unidad',costo:'',busqueda:''});
const input='mt-1 w-full min-w-0 rounded border bg-white p-2 text-sm';
export default function ComprasTurno(){
 const {sesion,tiene}=useSesionAdmin();const [productos,setProductos]=useState<ProductoAdmin[]>([]),[compras,setCompras]=useState<CompraAdmin[]>([]);
 const [fecha,setFecha]=useState(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())),[proveedor,setProveedor]=useState(''),[observaciones,setObservaciones]=useState('');
 const [lineas,setLineas]=useState<Linea[]>([]),[mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false),[congelado,setCongelado]=useState(false),[detalle,setDetalle]=useState<CompraConDetalle|null>(null);
 const intento=useRef<IntentoIdempotente|null>(null),guardando=useRef(false);
 async function cargar(){const [p,c]=await Promise.all([solicitarAdmin<ProductoAdmin[]>('/api/admin/productos'),solicitarAdmin<CompraAdmin[]>('/api/admin/compras')]);setProductos(p.filter(p=>p.activo==='SI'));setCompras(c);return c;}
 useEffect(()=>{setLineas([nueva()]);void cargar().catch(()=>setMensaje('No se pudieron leer productos/compras.'));},[]);
 function cambiar(key:string,patch:Partial<Linea>){setLineas(a=>a.map(l=>l.key===key?{...l,...patch}:l));}
 const calculo=lineas.map(l=>{try{const p=productos.find(p=>p.id_producto===l.producto_id);if(!p)throw new Error('Selecciona SKU.');return {valor:lineaCompraNatural(p,l.cantidad,l.unidad,l.costo),error:''};}catch(e){return {valor:null,error:e instanceof Error?e.message:'Revisar línea.'};}});
 const total=calculo.reduce((a,l)=>a+(l.valor?.subtotal??0),0);
 async function guardar(e:FormEvent){e.preventDefault();if(guardando.current||!sesion)return;
  if(calculo.some(l=>!l.valor)||!lineas.length||new Set(lineas.map(l=>l.producto_id)).size!==lineas.length){setMensaje('Revisa todas las líneas y no repitas un mismo SKU.');return;}
  const payload={fecha,proveedor,observaciones,lineas:calculo.map(l=>({producto_id:l.valor!.producto_id,cantidad:l.valor!.cantidad,costo_unitario:l.valor!.costo_unitario}))};
  intento.current=resolverIntentoIdempotente(intento.current,'COMPRA',payload);const key=intento.current.clave;
  guardando.current=true;setOcupado(true);setCongelado(true);setDetalle(null);
  try{
   let existentes=await solicitarAdmin<CompraAdmin[]>('/api/admin/compras');
   let recibo=existentes.find(c=>(c as unknown as Record<string,unknown>).idempotency_key===key);
   if(!recibo){try{await solicitarAdmin('/api/admin/compras',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,idempotency_key:key})});}catch{/* Readback antes de cualquier reintento con la misma key. */}
    existentes=await solicitarAdmin<CompraAdmin[]>('/api/admin/compras');recibo=existentes.find(c=>(c as unknown as Record<string,unknown>).idempotency_key===key);}
   if(!recibo)throw new Error('Sin compra acreditada. Conserva esta pestaña/formulario; consulta y reintenta la misma referencia.');
   const r=await solicitarAdmin<CompraConDetalle>(`/api/admin/compras/${encodeURIComponent(recibo.compra_id)}`);
   if(r.compra.responsable!==sesion.actor_id||r.compra.total!==total||r.compra.proveedor!==proveedor||r.detalle.length!==payload.lineas.length
     ||payload.lineas.some(l=>!r.detalle.some(d=>d.producto_id===l.producto_id&&d.cantidad===l.cantidad&&d.costo_unitario===l.costo_unitario)))throw new Error('REQUIERE_REVISION: detalle/actor no coincide; no recrear compra.');
   setDetalle(r);await cargar();intento.current=null;setCongelado(false);setLineas([nueva()]);setProveedor('');setObservaciones('');setMensaje(`Compra ${r.compra.compra_id} acreditada. Detalle conserva stocks/costos/snapshots originales; los saldos vigentes pueden incluir movimientos posteriores.`);
  }catch(e){setMensaje(e instanceof Error?e.message:'Resultado incierto. Mantén la misma referencia.');}
  finally{guardando.current=false;setOcupado(false);}
 }
 if(!tiene('compras:gestionar'))return <main className="p-6">Compras requiere Operación o Administración.</main>;
 return <main className="mx-auto max-w-6xl space-y-5 px-4 py-8"><AdminFase78Nav/><h1 className="text-3xl font-bold text-primary-dark">Compras · TEST</h1><p>Responsable de sesión: {sesion?.nombre||sesion?.actor_id}. Proveedor por compra; identidad/snapshots se obtienen del SKU.</p><p role="status" className="break-words rounded bg-blue-50 p-3 text-sm">{mensaje}</p>
 <form onSubmit={guardar} className="space-y-4 rounded-xl border bg-white p-4"><fieldset disabled={ocupado||congelado} className="space-y-4"><legend className="font-semibold">Nueva compra</legend><div className="grid gap-3 sm:grid-cols-2"><label>Fecha<input required type="date" className={input} value={fecha} onChange={e=>setFecha(e.target.value)}/></label><label>Proveedor<input required maxLength={200} className={input} value={proveedor} onChange={e=>setProveedor(e.target.value)}/></label></div>
 {lineas.map((l,i)=>{const p=productos.find(p=>p.id_producto===l.producto_id);return <fieldset key={l.key} className="grid min-w-0 gap-3 rounded border p-3 sm:grid-cols-2"><legend>Línea {i+1}</legend><label>Buscar SKU<input className={input} value={l.busqueda} onChange={e=>cambiar(l.key,{busqueda:e.target.value})}/></label><label>Producto físico<select required className={input} value={l.producto_id} onChange={e=>{const p=productos.find(p=>p.id_producto===e.target.value);cambiar(l.key,{producto_id:e.target.value,unidad:p&&esGranel(p)?'kg':'unidad',cantidad:'',costo:''});}}><option value="">Seleccionar</option>{productos.filter(p=>p.id_producto===l.producto_id||`${p.id_producto} ${p.nombre} ${p.marca??''}`.toLowerCase().includes(l.busqueda.toLowerCase())).map(p=><option key={p.id_producto} value={p.id_producto}>{p.id_producto} · {p.nombre}</option>)}</select></label><label>Cantidad comprada<input required className={input} inputMode="decimal" value={l.cantidad} onChange={e=>cambiar(l.key,{cantidad:e.target.value})}/></label><label>Unidad<select className={input} value={l.unidad} onChange={e=>cambiar(l.key,{unidad:e.target.value as Linea['unidad']})}>{(p&&esGranel(p)?['g','kg']:['unidad']).map(u=><option key={u}>{u}</option>)}</select></label><label>Costo {p&&esGranel(p)?'por kg según compra':'por unidad/paquete'}<input required inputMode="decimal" className={input} value={l.costo} onChange={e=>cambiar(l.key,{costo:e.target.value})}/></label><div><p>Subtotal {pesos(calculo[i]?.valor?.subtotal??0)}</p>{p&&esGranel(p)&&<p className="text-xs">Se convierte a base histórica {formatoPeso(Number(p.gramos_unidad_stock))}; el precio público no cambia.</p>}<p className="text-xs text-red-800">{calculo[i]?.error}</p><button type="button" disabled={lineas.length===1} onClick={()=>setLineas(a=>a.filter(x=>x.key!==l.key))} className="mt-2 underline">Quitar línea</button></div></fieldset>;})}
 <button type="button" onClick={()=>setLineas(a=>[...a,nueva()])} className="rounded border p-3">Agregar línea</button><label className="block">Observaciones<textarea maxLength={500} className={input} value={observaciones} onChange={e=>setObservaciones(e.target.value)}/></label></fieldset><p className="font-semibold">Total revisado: {pesos(total)}</p><button disabled={ocupado||calculo.some(l=>!l.valor)} className="rounded bg-primary p-3 text-white disabled:opacity-40">{ocupado?'Verificando…':congelado?'Consultar / reintentar misma compra':'Confirmar compra TEST'}</button></form>
 {detalle&&<section className="rounded border bg-white p-4"><h2 className="font-semibold">Readback compra {detalle.compra.compra_id}</h2>{detalle.detalle.map(d=><p key={d.producto_id} className="mt-2 break-words text-sm">{d.producto_id} · {d.nombre_producto} · marca {d.marca_snapshot||'Sin snapshot legado'} · stock {d.stock_anterior}→{d.stock_nuevo} · costo {pesos(d.costo_anterior)}→{pesos(d.costo_nuevo)}</p>)}</section>}
 <section className="rounded border bg-white p-4"><h2 className="font-semibold">Historial</h2>{compras.slice(0,30).map(c=><p key={c.compra_id} className="mt-3 break-words text-sm">{c.compra_id} · {c.proveedor} · {pesos(c.total)} · {c.fecha_hora} · {c.responsable}</p>)}</section>
 </main>;
}
