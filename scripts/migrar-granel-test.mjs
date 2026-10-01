import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {clienteCatalogoTest} from './lib/catalogo-operativo-test.mjs';
import {createHash} from 'node:crypto';
export const GRANEL_TEST = [
  ['001',1000,1350,1200],['002',1000,1100,1500],['003',1000,1100,1000],['004',1000,1800,1600],
  ['005',1000,2450,2200],['006',1000,900,785],['007',1000,1100,null],['008',1000,2100,1900],
  ['009',1000,2000,1800],['011',1000,4800,4400],['012',1000,500,360],['013',1000,1900,null],
  ['014',250,2300,2100],['015',100,1350,1200],['016',100,700,600],['017',100,150,110],['018',100,700,640],['019',100,900,800],
];
export function preservarFilas(antes,despues,excluir=[]) {
  for(const h of antes.hojas.filter(h=>!excluir.includes(h.nombre))) {
    const d=despues.hojas.find(d=>d.nombre===h.nombre);assert.ok(d);
    assert.equal(d.registros.length,h.registros.length,h.nombre);
    h.registros.forEach((r,i)=>Object.entries(r).forEach(([k,v])=>assert.deepEqual(d.registros[i][k],v,`${h.nombre}[${i}].${k}`)));
  }
}
if (process.argv[1]?.replaceAll('\\','/').endsWith('/migrar-granel-test.mjs')) {
  const aplicar=process.argv.includes('--apply-test');
  assert.ok(aplicar||process.argv.includes('--dry-run'),'Se exige --dry-run o --apply-test');
  await mkdir('operativa.local',{recursive:true});
  const c=clienteCatalogoTest();await c.verificar();
  const antes=await c.get('obtenerCatalogoOperativoTest');
  const productos=antes.hojas.find(h=>h.nombre==='PRODUCTOS').registros;
  const plan=GRANEL_TEST.map(([id,ref,precio,costo])=> {
    const p=productos.find(p=>p.id_producto==='PROD-'+id);assert.ok(p);assert.equal(p.activo,'SI');
    assert.ok(['unidad','kg'].includes(p.unidad_medida));
    // Congelar la base numerica historica. No convertir saldos ni afirmar stock fisico.
    const base=p.modo_venta==='GRANEL'?Number(p.gramos_unidad_stock):p.unidad_medida==='kg'?1000:ref;
    const campos={modo_venta:'GRANEL',gramos_referencia:ref,gramos_unidad_stock:base,permite_decimal:'SI',paso_venta:1/base,precio_venta:precio};
    if(costo!==null) campos.precio_costo=costo * base/ref;
    if(['014','015','016','017','018'].includes(id)) campos.nombre=p.nombre.replace(/\s*\(\d+ grs\)/,'');
    return {producto_id:p.id_producto,esperado:p,cambios:campos};
  });
  const iguales=(p,cambios)=>Object.entries(cambios).every(([k,v])=>String(p[k]??'')===String(v));
  const diff=plan.filter(e=>!iguales(e.esperado,e.cambios));
  const hash=createHash('sha256').update(JSON.stringify(plan.map(e=>({id:e.producto_id,cambios:e.cambios})))).digest('hex').slice(0,24);
  await writeFile('operativa.local/granel-plan.json',JSON.stringify({entorno:'TEST',hash,plan},null,2));
  await writeFile('operativa.local/granel-antes.json',JSON.stringify(antes,null,2));
  await writeFile(`operativa.local/granel-${hash}-${Date.now()}-antes.json`,JSON.stringify(antes,null,2),{flag:'wx'});
  console.log(`DIFF | ${diff.length} de 18 productos; ningun saldo cambia`);
  if(aplicar) {
    const backup=await c.post('crearBackupPilotoTest',{marcador:'PILOTO-TEST-'+hash,idempotency_key:'granel_backup_'+hash});
    await writeFile('operativa.local/granel-backup.json',JSON.stringify(backup,null,2));
    const schema=await c.post('prepararGranelTest');preservarFilas(antes,schema.readback);
    const schema2=await c.post('prepararGranelTest');assert.equal(schema2.backup_creado,false);
    assert.deepEqual(schema.readback,schema2.readback);
    for(const e of diff) await c.post('actualizarProductoAdmin',{producto_id:e.producto_id,cambios:e.cambios,responsable:'test-admin',idempotency_key:`granel_${hash}_${e.producto_id}`});
    const despues=await c.get('obtenerCatalogoOperativoTest');
    preservarFilas(antes,despues,['PRODUCTOS','AUDITORIA_PRODUCTOS','HISTORIAL_COSTOS']);
    const actuales=despues.hojas.find(h=>h.nombre==='PRODUCTOS').registros;
    for(const p of productos) {
      const d=actuales.find(d=>d.id_producto===p.id_producto);assert.ok(d);assert.equal(d.stock_actual,p.stock_actual);
      const e=plan.find(e=>e.producto_id===p.id_producto);
      for(const [k,v] of Object.entries(p)) if(!e||!Object.hasOwn(e.cambios,k)) assert.deepEqual(d[k],v,`${p.id_producto}.${k}`);
    }
    for(const e of plan) assert.ok(iguales(actuales.find(p=>p.id_producto===e.producto_id),e.cambios));
    for(const h of ['AUDITORIA_PRODUCTOS','HISTORIAL_COSTOS']) {
      const a=antes.hojas.find(s=>s.nombre===h),d=despues.hojas.find(s=>s.nombre===h);
      a.registros.forEach((r,i)=>assert.deepEqual(d.registros[i],r));
    }
    await writeFile('operativa.local/granel-despues.json',JSON.stringify(despues,null,2));
    console.log('PASS | esquema idempotente, 18 maestros, readback e historia/saldos intactos');
  }
}
