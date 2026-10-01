import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { clienteCatalogoTest } from './lib/catalogo-operativo-test.mjs';
import { validarCambioProducto } from '../src/lib/fase8/productosAdmin.ts';

const modo = process.argv[2] ?? '--preflight';
const directorio = 'operativa.local';
const permitidos = new Set(['nombre','activo','tipo_disponibilidad','precio_venta','precio_costo']);
const camposCoinciden = (p, campos) => Object.entries(campos).every(([k,v]) => String(p[k] ?? '') === String(v));
const productos = (estado) => estado.hojas.find(h => h.nombre === 'PRODUCTOS').registros;
const guardar = async (nombre,valor) => writeFile(`${directorio}/${nombre}.json`,JSON.stringify(valor,null,2)+'\n');
const asegurarHistoria = (antes,despues,excepciones = []) => {
  const permitidas = new Set(['PRODUCTOS',...excepciones]);
  for (const h of antes.integridad) if (!permitidas.has(h.nombre)) {
    assert.deepEqual(despues.integridad.find(d => d.nombre === h.nombre),h,`Cambio no autorizado en ${h.nombre}`);
  }
  for (const p of productos(antes)) assert.ok(productos(despues).some(d => d.id_producto === p.id_producto),'ID historico perdido');
};

try {
  if (!['--preflight','--prepare-test','--apply-plan'].includes(modo)) throw new Error('Modo invalido.');
  await mkdir(directorio,{recursive:true});
  const cliente = clienteCatalogoTest();
  await cliente.verificar();
  const antes = await cliente.get('obtenerCatalogoOperativoTest');
  await guardar(`catalogo-${modo.slice(2)}-antes`,antes);
  await guardar(`catalogo-respaldo-${Date.now()}`,antes);
  console.log(`READBACK | ${productos(antes).length} productos; ${antes.integridad.length} pestañas`);
  if (modo === '--prepare-test') {
    const preparado = await cliente.post('prepararDisponibilidadProductosTest');
    asegurarHistoria(antes,preparado.readback,['APERTURA_PRODUCTOS']);
    const repetido = await cliente.post('prepararDisponibilidadProductosTest');
    assert.equal(repetido.backup_creado,false);
    assert.equal(repetido.normalizadas,0);
    assert.deepEqual(repetido.readback,preparado.readback);
    await guardar('migracion-disponibilidad',{ preparado, idempotencia: 'PASS' });
    console.log('PASS | migracion con backup, historia intacta y repeticion sin cambios');
  } else if (modo === '--apply-plan') {
    const plan = JSON.parse(await readFile(process.argv[3],'utf8'));
    assert.equal(plan.entorno,'TEST');
    assert.ok(Array.isArray(plan.actualizaciones));
    assert.ok(Array.isArray(plan.creaciones));
    for (const entrada of [...plan.actualizaciones.map(c => c.cambios), ...plan.creaciones.map(c => c.producto)]) {
      const dto = { ...entrada };
      for (const campo of ['activo','permite_decimal']) if (campo in dto) dto[campo] = dto[campo] === 'SI';
      assert.deepEqual(validarCambioProducto(dto),[], 'Plan invalido antes de cualquier escritura');
    }
    const ids = new Set();
    for (const cambio of plan.actualizaciones) {
      assert.ok(!ids.has(cambio.producto_id),'ID duplicado en plan'); ids.add(cambio.producto_id);
      for (const k of Object.keys(cambio.cambios)) assert.ok(permitidos.has(k),`Campo no autorizado: ${k}`);
      const p = productos(antes).find(p => p.id_producto === cambio.producto_id);
      assert.ok(p,'Producto inexistente');
      assert.ok(camposCoinciden(p,cambio.esperado) || camposCoinciden(p,cambio.cambios),'Diferencia frente al diff previo');
    }
    for (const nuevo of plan.creaciones) {
      assert.ok(!ids.has(nuevo.producto_id),'ID duplicado en plan'); ids.add(nuevo.producto_id);
      assert.ok(!Object.hasOwn(nuevo.producto,'stock_actual'),'Stock prohibido');
      const existente = productos(antes).find(p => p.id_producto === nuevo.producto_id);
      if (existente) assert.ok(camposCoinciden(existente,nuevo.producto),'Colision de ID');
    }
    const hash = createHash('sha256').update(JSON.stringify(plan)).digest('hex').slice(0,24);
    // Backup idempotente existente y remoto. No se conserva su ID en Git.
    const backup = await cliente.post('crearBackupPilotoTest',{ marcador: `PILOTO-TEST-${hash}`, idempotency_key: `catalogo_backup_${hash}` });
    await guardar(`backup-${hash}`,backup);
    let actualizadas = 0, creadas = 0;
    for (const cambio of plan.actualizaciones) {
      const p = productos(antes).find(p => p.id_producto === cambio.producto_id);
      if (camposCoinciden(p,cambio.cambios)) continue;
      await cliente.post('actualizarProductoAdmin',{ ...cambio, responsable: 'test-admin', idempotency_key: `catalogo_${hash}_${cambio.producto_id}` });
      actualizadas++;
    }
    for (const nuevo of plan.creaciones) {
      if (productos(antes).some(p => p.id_producto === nuevo.producto_id)) continue;
      await cliente.post('crearProductoAdmin',{ ...nuevo, responsable: 'test-admin', idempotency_key: `catalogo_${hash}_${nuevo.producto_id}` });
      creadas++;
    }
    const despues = await cliente.get('obtenerCatalogoOperativoTest');
    asegurarHistoria(antes,despues,['AUDITORIA_PRODUCTOS','HISTORIAL_COSTOS']);
    for (const p of productos(antes)) {
      const d = productos(despues).find(d => d.id_producto === p.id_producto);
      const cambio = plan.actualizaciones.find(c => c.producto_id === p.id_producto);
      for (const [k,v] of Object.entries(p)) if (!cambio || !Object.hasOwn(cambio.cambios,k)) {
        assert.deepEqual(d[k],v,`Campo no autorizado: ${p.id_producto}.${k}`);
      }
    }
    for (const nombre of ['AUDITORIA_PRODUCTOS','HISTORIAL_COSTOS']) {
      const a = antes.hojas.find(h => h.nombre === nombre), d = despues.hojas.find(h => h.nombre === nombre);
      a.registros.forEach((r,i) => assert.deepEqual(d.registros[i],r,'Historia existente alterada'));
    }
    for (const cambio of plan.actualizaciones) assert.ok(camposCoinciden(productos(despues).find(p => p.id_producto === cambio.producto_id),cambio.cambios),'Readback distinto');
    for (const nuevo of plan.creaciones) assert.ok(camposCoinciden(productos(despues).find(p => p.id_producto === nuevo.producto_id),nuevo.producto),'Readback de alta distinto');
    await guardar(`catalogo-${hash}-despues`,despues);
    console.log(`PASS | ${actualizadas} productos actualizados, ${creadas} creados; stock, IDs e historia conservados`);
  }
} catch (error) {
  console.error(`FAIL | ${error instanceof Error ? error.message : 'Error no identificado'}`);
  process.exitCode = 1;
}
