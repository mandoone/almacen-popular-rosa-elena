/** Port GAS real sobre rangos simulados; nunca invoca Google o red. */
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {COLUMNAS_FAMILIAS_PRODUCTO} from '../../src/lib/familiasProducto.ts';
import {COLUMNAS_ADITIVAS_C5,COLUMNAS_ASIGNACIONES_PEDIDO,COLUMNAS_DIARIO_REQUERIDAS_C5} from '../../src/lib/familias/esquemaDurableV2.ts';
import {COLUMNAS_RESOLUCION_REVISION} from '../../src/lib/familias/revisionV1.ts';
export const HEADERS_C5={
  PRODUCTOS:['id_producto','activo','nombre','categoria','prioridad','unidad_medida','permite_decimal','paso_venta','precio_costo','margen_pct','precio_venta','stock_actual','stock_minimo','imagen_url','observaciones','actualizado_en','tipo_disponibilidad','modo_venta','gramos_referencia','gramos_unidad_stock','familia_id','marca','presentacion','contenido_cantidad','contenido_unidad',...COLUMNAS_ADITIVAS_C5.PRODUCTOS],
  PEDIDOS:['id_pedido','fecha_hora','canal','id_cliente','nombre_cliente','telefono','total','estado_pedido','estado_pago','forma_pago','observaciones','vendedor_admin','fecha_entrega','apertura_id','origen_pedido',...COLUMNAS_ADITIVAS_C5.PEDIDOS],
  DETALLE_PEDIDOS:['id_pedido','id_producto','nombre_producto','cantidad','unidad_medida','precio_unitario','subtotal','modo_venta','gramos_solicitados','gramos_referencia','gramos_unidad_stock',...COLUMNAS_ADITIVAS_C5.DETALLE_PEDIDOS],
  MOVIMIENTOS_STOCK:['id_movimiento','fecha_hora','tipo','origen','id_origen','id_producto','cantidad','stock_anterior','stock_resultante','usuario','observaciones','movimiento_id','producto_id','tipo_movimiento','referencia_tipo','referencia_id','apertura_id','observacion','payload_hash','operacion_id'],
  OPERACIONES_PEDIDOS:[...COLUMNAS_DIARIO_REQUERIDAS_C5,...COLUMNAS_RESOLUCION_REVISION],
  FAMILIAS_PRODUCTO:[...COLUMNAS_FAMILIAS_PRODUCTO],ASIGNACIONES_PEDIDO:[...COLUMNAS_ASIGNACIONES_PEDIDO],
  APERTURA_PRODUCTOS:['apertura_id','producto_id','habilitado','actualizado_por','actualizado_en'],
  APERTURAS:['apertura_id','fecha_apertura','hora_inicio','hora_termino','lugar','cierre_pedidos_anticipados','estado_apertura','pedidos_anticipados_estado','modo_presencial_estado','mensaje_publico','observaciones_internas','creada_por','actualizada_por','creado_en','actualizado_en'],
  AUDITORIA_PRODUCTOS:['auditoria_id','fecha_hora','producto_id','accion','cambios_json','responsable','referencia_id','entidad_tipo','entidad_id','payload_hash','resultado_json'],
};
export async function escenarioGasC5() {
  const hojas={},estado={lock:false,escrituras:[],flushes:0,fallo:null};
  const utc='2026-10-08T03:00:00.000Z';
  class Fecha extends Date {constructor(...args){super(...(args.length?args:[utc]));}}
  class Sheet {
    constructor(nombre,headers){this.nombre=nombre;this.grid=[headers.slice()];this.formatos=new Map();this.validaciones=nombre==='PEDIDOS'?{estado_pedido:['recibido','pendiente','listo','entregado','cancelado'],estado_pago:['pendiente','pagado_transferencia','pagado_efectivo','anulado'],forma_pago:['transferencia','efectivo_al_retirar']}:nombre==='MOVIMIENTOS_STOCK'?{tipo:['entrada','salida','ajuste','devolucion'],origen:['pedido','venta','compra','ajuste','cancelacion']}:{};}
    getName(){return this.nombre;}getLastRow(){return this.grid.length;}getLastColumn(){return this.grid[0].length;}
    getRange(r,c,nr=1,nc=1){const sheet=this;return {
      getValues:()=>Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>sheet.grid[r+i-1]?.[c+j-1]??'')),
      getFormulas:()=>Array.from({length:nr},()=>Array.from({length:nc},()=>'')),
      getDataValidations:()=>Array.from({length:nr},()=>Array.from({length:nc},(_,j)=>{const options=sheet.validaciones[sheet.grid[0][c+j-1]];return options?{getAllowInvalid:()=>false,getCriteriaType:()=> 'VALUE_IN_LIST',getCriteriaValues:()=>[options]}:null;})),
      setNumberFormat:f=>{for(let i=0;i<nr;i++)for(let j=0;j<nc;j++)sheet.formatos.set(`${r+i}:${c+j}`,f);},
      setValues:values=>{
        for(let i=0;i<nr;i++)for(let j=0;j<nc;j++){
          sheet.grid[r+i-1]??=Array(sheet.grid[0].length).fill('');let v=values[i][j];
          if(typeof v==='string' && sheet.formatos.get(`${r+i}:${c+j}`)!=='@'){
            if(/^\d+$/.test(v))v=Number(v);else if(/^\d{4}-\d\d-\d\dT\d\d:\d\d:/.test(v))v=new Fecha(v);
          }
          const options=sheet.validaciones[sheet.grid[0][c+j-1]];
          if(r+i>1&&v!==''&&options&&!options.includes(v))throw new Error('VALIDACION_RECHAZA_'+sheet.grid[0][c+j-1]);
          sheet.grid[r+i-1][c+j-1]=v;
        }
        estado.escrituras.push({hoja:sheet.nombre,r,c,nr,nc});
        if(estado.fallo?.hoja===sheet.nombre && (!estado.fallo.row||estado.fallo.row===r)){const f=estado.fallo;estado.fallo=null;throw new Error('Caída después de escritura '+f.hoja);}
      },
    };}
    appendRow(values){this.getRange(this.getLastRow()+1,1,1,this.grid[0].length).setValues([values]);}
  }
  for(const [n,h] of Object.entries(HEADERS_C5))hojas[n]=new Sheet(n,h);
  const ss={getName:()=> 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES',getId:()=> '1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM',getSheetByName:n=>hojas[n]??null,getSheets:()=>Object.values(hojas)};
  const contexto={Date:Fecha,SpreadsheetApp:{openById:id=>{if(id!==ss.getId())throw new Error('Destino inesperado');return ss;},flush:()=>{estado.flushes++;}},
    PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'TEST'})},Session:{getScriptTimeZone:()=> 'UTC'},
    Utilities:{formatDate:date=>date.toISOString().replace(/Z$/,''),getUuid:()=> 'QA-SYNTHETIC',DigestAlgorithm:{SHA_256:'SHA256'},computeDigest:(_a,text)=>Array.from(createHash('sha256').update(text).digest(),b=>b>127?b-256:b),Charset:{UTF_8:'UTF8'}},
    LockService:{getScriptLock:()=>({tryLock:()=>{if(estado.lock)return false;estado.lock=true;return true;},releaseLock:()=>{estado.lock=false;}})},
    ContentService:{MimeType:{JSON:'JSON'},createTextOutput:text=>({setMimeType(){return this;},getContent:()=>text})}};
  vm.createContext(contexto);
  const source=await readFile('scripts/apps-script-pedidos.gs','utf8');
  vm.runInContext(source,contexto);contexto.SPREADSHEET_ID=ss.getId();contexto.ADMIN_TOKEN='token-qa-sintetico';
  const plain=x=>JSON.parse(JSON.stringify(x));
  function accion(action,body={}) {return plain(contexto.ejecutarAccionDurableC5Test_(action,body));}
  const puerto=()=>contexto.crearPuertoDurableC5_(ss);
  const preparar=(grupo='ECO',escenario='UNIDAD',sufijo='P')=>accion('prepararFixturePedidoV2Test',{grupo,escenario,id_pedido:'PED-QA-C5-'+grupo+'-'+sufijo});
  const input=(f,key='confirmar_qa_c5_12345',cantidades=[4,2])=>({id_pedido:f.pedido.id_pedido,idempotency_key:key,estado_esperado:'recibido',apertura_id_esperada:'APE-20991231',asignaciones:[{id_detalle_pedido:f.detalles.find(l=>l.modelo_linea==='FAMILIA_V2').id_detalle_pedido,selecciones:f.productos.filter(s=>s.familia_id).map((s,i)=>({producto_id:s.id_producto,cantidad_asignada:cantidades[i]}))}]});
  return {contexto,hojas,ss,estado,puerto,accion,preparar,input,utc,plain};
}
