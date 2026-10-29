'use client';
import { useRef, useState, type FormEvent } from 'react';
import { solicitarAdmin, resolverIntentoIdempotente, type IntentoIdempotente } from '@/lib/fase8/clienteAdmin';
import type { ProductoAdmin } from '@/lib/appsScriptPedidos';
import { unidadStockInicialGranel } from '@/lib/fase8/altaProducto';
const inicial={nombre:'',marca:'',presentacion:'',contenido_cantidad:'',contenido_unidad:'ml',categoria:'Alimentos',modo_venta:'UNIDAD',unidad_medida:'unidad',tipo_disponibilidad:'REGULAR',precio_venta:'',precio_costo:'',gramos_referencia:'1000',gramos_unidad_stock:'1000'};
export default function AltaProductoFisico({ onCreado }: { onCreado: (p:ProductoAdmin)=>void }) {
  const [f,setF]=useState(inicial),[mensaje,setMensaje]=useState(''),[ocupado,setOcupado]=useState(false);
  const [pendiente,setPendiente]=useState(false);
  const intento=useRef<IntentoIdempotente|null>(null),bloqueo=useRef(false);
  const campo=(k:keyof typeof f,v:string)=>setF(a=>({...a,[k]:v}));
  async function crear(e:FormEvent){e.preventDefault();if(bloqueo.current)return;bloqueo.current=true;setOcupado(true);
    try{
      const producto={nombre:f.nombre,categoria:f.categoria,marca:f.marca,presentacion:f.presentacion,...(f.contenido_cantidad?{contenido_cantidad:Number(f.contenido_cantidad),contenido_unidad:f.contenido_unidad}:{}),modo_venta:f.modo_venta,unidad_medida:f.modo_venta==='GRANEL'?unidadStockInicialGranel(Number(f.gramos_unidad_stock)):f.unidad_medida,permite_decimal:f.modo_venta==='GRANEL'?'SI':'NO',paso_venta:f.modo_venta==='GRANEL'?0.001:1,gramos_referencia:f.modo_venta==='GRANEL'?Number(f.gramos_referencia):0,gramos_unidad_stock:f.modo_venta==='GRANEL'?Number(f.gramos_unidad_stock):0,precio_venta:Number(f.precio_venta),precio_costo:f.precio_costo===''?'':Number(f.precio_costo),stock_minimo:0,prioridad:'media',activo:'NO',tipo_disponibilidad:f.tipo_disponibilidad,imagen_url:''};
      intento.current=resolverIntentoIdempotente(intento.current,'ALTA',producto);
      setPendiente(true);
      const p=await solicitarAdmin<ProductoAdmin>('/api/admin/productos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({producto,idempotency_key:intento.current.clave})});
      setMensaje(`Creado ${p.id_producto}: inactivo, stock0. Verifica identidad/precio y luego activa desde edición. Mínimo0/prioridad media son valores técnicos pendientes, no parámetros aprobados.`);intento.current=null;setPendiente(false);setF(inicial);onCreado(p);
    }catch{setMensaje('No se pudo acreditar el alta. No cambies el formulario: consulta el catálogo y reintenta con la misma referencia; el ID se conserva.');}
    finally{bloqueo.current=false;setOcupado(false);}
  }
  return <details className="mt-5 rounded border bg-white p-4"><summary className="cursor-pointer font-semibold">Alta de producto físico · ID automático</summary><form onSubmit={crear} className="mt-3 space-y-3"><fieldset disabled={pendiente} className="space-y-3"><p className="text-sm">Nace inactivo y stock0. Otra marca/formato relevante exige otro SKU; proveedor se registra por compra. No se asocia familia ni se completa identidad pendiente por suposición.</p>
    {(['nombre','marca','presentacion'] as const).map(k=><label className="block text-sm" key={k}>{k==='nombre'?'Nombre del SKU':k==='marca'?'Marca física (opcional si no aplica o está pendiente)':'Presentación física'}<input required={k==='nombre'} maxLength={k==='marca'?120:200} disabled={ocupado} value={f[k]} onChange={e=>campo(k,e.target.value)} className="mt-1 w-full rounded border p-2" /></label>)}
    <label className="block text-sm">Contenido físico (no inventar)<input type="number" min="0.001" step="any" disabled={ocupado} value={f.contenido_cantidad} onChange={e=>campo('contenido_cantidad',e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
    {([['contenido_unidad','Unidad del contenido',['ml','g','unidad']],['categoria','Categoría',['Alimentos','Limpieza','Higiene','Granel']],['modo_venta','Tipo de venta',['UNIDAD','GRANEL']],['unidad_medida','Unidad envasada',['unidad','pack']],['tipo_disponibilidad','Disponibilidad',['REGULAR','POR_APERTURA']]] as const).map(([k,l,op])=>k==='unidad_medida'&&f.modo_venta==='GRANEL'?null:<label className="block text-sm" key={k}>{l}<select disabled={ocupado} value={f[k]} onChange={e=>campo(k,e.target.value)} className="mt-1 w-full rounded border p-2">{op.map(o=><option key={o}>{o}</option>)}</select></label>)}
    {f.modo_venta==='GRANEL'&&<>{(['gramos_referencia','gramos_unidad_stock'] as const).map(k=><label className="block text-sm" key={k}>{k==='gramos_referencia'?'Referencia del precio en gramos':'Base inicial de stock en gramos (se conserva luego)'}<select disabled={ocupado} value={f[k]} onChange={e=>campo(k,e.target.value)} className="mt-1 w-full rounded border p-2">{[100,250,1000].map(g=><option key={g}>{g}</option>)}</select></label>)}</>}
    {(['precio_venta','precio_costo'] as const).map(k=><label className="block text-sm" key={k}>{k==='precio_venta'?'Precio público por unidad/referencia (0 solo provisional)':'Costo por unidad/base stock (vacío si no acreditado)'}<input required={k==='precio_venta'} disabled={ocupado} type="number" min="0" step="1" value={f[k]} onChange={e=>campo(k,e.target.value)} className="mt-1 w-full rounded border p-2" /></label>)}
    </fieldset><button disabled={ocupado} className="rounded bg-primary px-3 py-2 text-white">{ocupado?'Verificando alta…':'Crear inactivo con stock0'}</button><p role="status" className="break-words text-sm">{mensaje}</p>
  </form></details>;
}
