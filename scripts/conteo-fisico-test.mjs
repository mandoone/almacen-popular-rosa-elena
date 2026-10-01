import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {clienteCatalogoTest} from './lib/catalogo-operativo-test.mjs';
import {csvConteo,leerCsvConteo,plantillaConteo,validarConteo} from './lib/conteo-test.mjs';
import {guardarPrivadoNuevo} from './lib/registro-cuentas.mjs';
import {leerUsuariosAdmin} from '../src/lib/fase9/identidades.ts';
const arg=k=>{const i=process.argv.indexOf('--'+k);return i<0?null:process.argv[i+1];};
const maestros=s=>s.hojas.find(h=>h.nombre==='PRODUCTOS').registros;
try {
  const modo=process.argv[2];
  assert.ok(['--template','--dry-run','--apply-test'].includes(modo),'Elegir template, dry-run o apply-test.');
  const c=clienteCatalogoTest();await c.verificar();
  const antes=await c.get('obtenerCatalogoOperativoTest'),productos=maestros(antes);
  if(modo==='--template'){
    const rows=plantillaConteo(productos);
    await guardarPrivadoNuevo(arg('output')||'operativa.local/CONTEO_FISICO_TEST.csv',csvConteo(rows));
    console.log('PASS | '+rows.length+' productos; cantidades/mínimos/prioridades vacíos, ningún stock aplicado.');
  }else if(modo==='--dry-run'){
    const raw=await readFile(process.argv[3],'utf8'),resultado=validarConteo(productos,leerCsvConteo(raw));
    const hash=createHash('sha256').update(raw).digest('hex');
    const path=arg('output')||'operativa.local/conteo-dry-run-'+Date.now()+'.json';
    await guardarPrivadoNuevo(path,JSON.stringify({entorno:'TEST',hash,resultado,antes},null,2)+'\n');
    console.log('DRY-RUN | '+resultado.plan.length+' filas válidas; '+resultado.errores.length+' pendientes/errores; cero escrituras TEST.');
    const codes={};for(const e of resultado.errores)codes[e.codigo]=(codes[e.codigo]||0)+1;console.log(JSON.stringify(codes));
    if(!resultado.ok)process.exitCode=1;
  }else{
    assert.equal(arg('confirm'),'APLICAR_CONTEO_TEST');
    const raw=await readFile(process.argv[3],'utf8'),hash=createHash('sha256').update(raw).digest('hex');
    const plan=JSON.parse(await readFile(arg('plan'),'utf8')),acta=JSON.parse(await readFile(arg('approval'),'utf8'));
    assert.equal(plan.entorno,'TEST');assert.equal(plan.hash,hash);assert.equal(plan.resultado.ok,true);
    const reconstruido=validarConteo(maestros(plan.antes),leerCsvConteo(raw));
    assert.equal(reconstruido.ok,true);assert.deepEqual(plan.resultado,reconstruido,'Plan alterado después del dry-run.');
    assert.equal(acta.entorno,'TEST');assert.equal(acta.hash_conteo,hash);assert.equal(acta.conteo_revisado,true);
    assert.match(acta.fecha_corte||'',/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?[-+]\d{2}:\d{2}$/);
    assert.ok(acta.referencia_evidencia&&acta.responsable&&acta.segundo_revisor&&acta.responsable!==acta.segundo_revisor);
    const registro=leerUsuariosAdmin(process.env.ADMIN_USERS_JSON);
    assert.ok(registro.estado==='valida'&&registro.usuarios.some(u=>u.actor_id===acta.responsable&&u.active&&['operacion','administracion'].includes(u.rol)));
    for(const l of plan.resultado.plan){
      const p=productos.find(p=>p.id_producto===l.producto_id);assert.ok(p&&p.activo==='SI');
      for(const campo of ['nombre','unidad_medida','precio_venta','precio_costo'])assert.equal(p[campo],l[campo]);
      assert.equal(p.modo_venta||'UNIDAD',l.modo_venta);
      if(l.modo_venta==='GRANEL')assert.equal(Number(p.gramos_unidad_stock),l.gramos_unidad_stock);
      const original=maestros(plan.antes).find(p=>p.id_producto===l.producto_id);
      assert.equal(p.gramos_referencia,original.gramos_referencia);
      assert.ok([Number(l.stock_minimo_esperado),l.stock_minimo].includes(Number(p.stock_minimo)));
      assert.ok([l.prioridad_esperada,l.prioridad].includes(p.prioridad));
      assert.ok([l.stock_esperado,l.stock_objetivo].includes(Number(p.stock_actual)),'Stock divergió del plan.');
    }
    const tag=hash.slice(0,24);
    const backup=await c.post('crearBackupPilotoTest',{marcador:'PILOTO-TEST-'+tag,idempotency_key:'conteo_backup_'+tag});
    await guardarPrivadoNuevo('operativa.local/conteo-backup-'+Date.now()+'.json',JSON.stringify({antes,backup,acta},null,2)+'\n');
    for(const l of plan.resultado.plan){
      if(l.delta!==0)await c.post('ajustarStockAdmin',{producto_id:l.producto_id,delta:l.delta,stock_esperado:l.stock_esperado,motivo:'recuento_fisico',responsable:acta.responsable,observaciones:'Conteo revisado '+acta.fecha_corte,idempotency_key:'conteo_'+tag+'_'+l.producto_id});
      const p=productos.find(p=>p.id_producto===l.producto_id);
      if(Number(p.stock_minimo)!==l.stock_minimo||p.prioridad!==l.prioridad)await c.post('actualizarProductoAdmin',{producto_id:l.producto_id,cambios:{stock_minimo:l.stock_minimo,prioridad:l.prioridad},responsable:acta.responsable,idempotency_key:'conteo_min_'+tag+'_'+l.producto_id});
    }
    const despues=await c.get('obtenerCatalogoOperativoTest');
    for(const l of plan.resultado.plan){const p=maestros(despues).find(p=>p.id_producto===l.producto_id);assert.equal(Number(p.stock_actual),l.stock_objetivo);assert.equal(Number(p.stock_minimo),l.stock_minimo);assert.equal(p.prioridad,l.prioridad);}
    for(const h of antes.hojas.filter(h=>h.nombre!=='PRODUCTOS'))h.registros.forEach((r,i)=>assert.deepEqual(despues.hojas.find(d=>d.nombre===h.nombre).registros[i],r));
    for(const p of productos){const d=maestros(despues).find(d=>d.id_producto===p.id_producto);for(const[k,v]of Object.entries(p))if(!['stock_actual','stock_minimo','prioridad'].includes(k))assert.deepEqual(d[k],v);}
    await guardarPrivadoNuevo('operativa.local/conteo-readback-'+Date.now()+'.json',JSON.stringify(despues,null,2)+'\n');
    console.log('PASS | conteo TEST auditado e idempotente, readback/historia íntegros; no se modificó Production.');
  }
}catch {console.error('FAIL | conteo/plan/acta/entorno/stock no validado. Preservar plan y consultar movimientos antes de repetir; ningún valor sensible impreso.');process.exitCode=1;}
