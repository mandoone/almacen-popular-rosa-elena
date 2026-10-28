import { cantidadStock, esGranel, type ModeloGranel } from '../granel.ts';
import { gramosDesdeEntrada } from './inventario.ts';
export function lineaCompraNatural(p: ModeloGranel & { id_producto:string }, cantidad:string, unidad:'unidad'|'g'|'kg', costo:string) {
  const valor=Number(costo.replace(',','.'));
  if(!Number.isFinite(valor)||valor<=0)throw new Error('Costo positivo según respaldo, nunca derivado del precio público.');
  let n:number,c:number;
  if(esGranel(p)){
    if(unidad==='unidad')throw new Error('Elige g/kg para granel.');
    n=cantidadStock(p,gramosDesdeEntrada(cantidad,unidad));c=valor*Number(p.gramos_unidad_stock)/1000;
  }else{
    if(unidad!=='unidad'||!/^\d+$/.test(cantidad)||!Number.isSafeInteger(Number(cantidad))||Number(cantidad)<=0)throw new Error('Usa unidades o paquetes enteros.');
    n=Number(cantidad);c=valor;
  }
  if(!Number.isFinite(n*c)||!Number.isSafeInteger(Math.round(n*c)))throw new Error('Total fuera del rango seguro.');
  return {producto_id:p.id_producto,cantidad:n,costo_unitario:c,subtotal:Math.round(n*c)};
}
