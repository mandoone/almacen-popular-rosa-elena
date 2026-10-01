export const COLUMNAS_CONTEO=['id_producto','nombre','modo_venta','unidad_conteo','stock_contado','costo_vigente','base_costo_gramos','precio_venta','referencia_precio_gramos','minimo','prioridad','observacion'];
export const esFixture=p=>/^PROD-TEST-/.test(p.id_producto);
export function csvConteo(rows) {
  return '\uFEFF'+COLUMNAS_CONTEO.join(';')+'\n'+rows.map(r=>COLUMNAS_CONTEO.map(k=>'"'+String(r[k]??'').replaceAll('"','""')+'"').join(';')).join('\n')+'\n';
}
export function leerCsvConteo(text) {
  const rows=[];let row=[],cell='',quote=false,closed=false;
  text=text.replace(/^\uFEFF/,'').replaceAll('\r\n','\n');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quote){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else {quote=false;closed=true;}}else cell+=c;}
    else if(c==='"'){if(cell||closed)throw Error('CSV: comillas fuera de posición.');quote=true;}
    else if(c===';'||c==='\n'){row.push(cell);cell='';closed=false;if(c==='\n'){if(row.some(v=>v!==''))rows.push(row);row=[];}}
    else {if(closed)throw Error('CSV: contenido después de comillas.');cell+=c;}
  }
  if(quote)throw Error('CSV: comillas sin cerrar.');
  if(cell||row.length){row.push(cell);rows.push(row);}
  const headers=rows.shift()||[];
  if(headers.length!==COLUMNAS_CONTEO.length||new Set(headers).size!==headers.length||COLUMNAS_CONTEO.some(k=>!headers.includes(k)))throw Error('CSV: encabezados incorrectos.');
  return rows.map(r=>{if(r.length!==headers.length)throw Error('CSV: columnas incompletas.');return Object.fromEntries(headers.map((k,i)=>[k,r[i].trim()]));});
}
export function plantillaConteo(productos) {
  return productos.filter(p=>p.activo==='SI'&&!esFixture(p)).map(p=> {
    const g=p.modo_venta==='GRANEL';
    return {id_producto:p.id_producto,nombre:p.nombre,modo_venta:g?'GRANEL':'UNIDAD',unidad_conteo:g?'kg':p.unidad_medida,stock_contado:'',costo_vigente:p.precio_costo,base_costo_gramos:g?p.gramos_unidad_stock:'',precio_venta:p.precio_venta,referencia_precio_gramos:g?p.gramos_referencia:'',minimo:'',prioridad:'',observacion:'PENDING conteo/segundo revisor; costo por base de stock, precio por referencia'};
  });
}
function numero(text) {
  if(typeof text!=='string'||!/^\d+(?:[.,]\d{1,3})?$/.test(text))return null;
  const n=Number(text.replace(',','.'));
  return Number.isFinite(n)&&Number.isSafeInteger(Math.round(n*1000))?n:null;
}
export function validarConteo(productos,rows,{completo=true}={}) {
  const errores=[],plan=[],ids=new Set();
  const error=(fila,codigo,id)=>errores.push({fila,codigo,id_producto:id});
  for(const [i,r]of rows.entries()){
    const fila=i+2,id=r.id_producto,p=productos.find(p=>p.id_producto===id);
    if(ids.has(id)){error(fila,'ID_DUPLICADO',id);continue;}ids.add(id);
    if(!p){error(fila,'ID_DESCONOCIDO',id);continue;}
    if(p.activo!=='SI'||esFixture(p)){error(fila,'INACTIVO_O_FIXTURE',id);continue;}
    const g=p.modo_venta==='GRANEL',modo=g?'GRANEL':'UNIDAD',unidad=g?'kg':p.unidad_medida;
    if(r.modo_venta!==modo||r.unidad_conteo!==unidad||r.nombre!==p.nombre)error(fila,'IDENTIDAD_UNIDAD_MODO',id);
    const base=Number(p.gramos_unidad_stock),ref=Number(p.gramos_referencia);
    if(g&&(![100,250,1000].includes(base)||!Number.isSafeInteger(ref)||ref<=0||Number(r.base_costo_gramos)!==base||Number(r.referencia_precio_gramos)!==ref))error(fila,'REFERENCIA_GRANEL',id);
    if(!g&&(r.base_costo_gramos||r.referencia_precio_gramos||unidad==='kg'))error(fila,'MODELO_UNITARIO_INCOMPATIBLE',id);
    const contado=numero(r.stock_contado),minimo=numero(r.minimo),costo=numero(r.costo_vigente),precio=numero(r.precio_venta);
    if(contado===null)error(fila,'STOCK_NEGATIVO_INVALIDO_O_AUSENTE',id);
    if(!g&&contado!==null&&!Number.isInteger(contado))error(fila,'STOCK_UNITARIO_FRACCIONADO',id);
    if(minimo===null||(!g&&minimo!==null&&!Number.isInteger(minimo)))error(fila,'MINIMO_INVALIDO_O_AUSENTE',id);
    if(!['alta','media','baja'].includes(r.prioridad))error(fila,'PRIORIDAD_INVALIDA_O_AUSENTE',id);
    if(costo===null||costo<=0||Number(p.precio_costo)<=0||p.precio_costo==='')error(fila,'COSTO_SIN_RESPALDO',id);
    else if(costo!==Number(p.precio_costo))error(fila,'COSTO_DIFIERE_MAESTRO',id);
    if(precio===null||precio<=0||precio!==Number(p.precio_venta))error(fila,'PRECIO_INVALIDO_O_DIFIERE_MAESTRO',id);
    if(!errores.some(e=>e.fila===fila)){
      const objetivo=g?Math.round(contado*1000)/base:contado,minBase=g?Math.round(minimo*1000)/base:minimo;
      const stock=Number(p.stock_actual);
      if(!Number.isFinite(stock)||stock<0||(g&&Math.abs(stock*base-Math.round(stock*base))>1e-7)){error(fila,'STOCK_MAESTRO_INCOMPATIBLE',id);continue;}
      plan.push({producto_id:id,nombre:p.nombre,modo_venta:modo,unidad_medida:p.unidad_medida,gramos_unidad_stock:g?base:null,precio_venta:p.precio_venta,precio_costo:p.precio_costo,stock_esperado:stock,stock_objetivo:objetivo,delta:Math.round((objetivo-stock)*1000)/1000,stock_minimo_esperado:p.stock_minimo,prioridad_esperada:p.prioridad,stock_minimo:minBase,prioridad:r.prioridad,observacion:r.observacion});
    }
  }
  if(completo)for(const p of productos.filter(p=>p.activo==='SI'&&!esFixture(p)))if(!ids.has(p.id_producto))error(null,'PRODUCTO_ACTIVO_SIN_CONTEO',p.id_producto);
  return {ok:errores.length===0,errores,plan};
}
