import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { rolTieneCapacidad } from '../src/lib/fase9/roles.ts';
import { capacidadParaCambioPedido, capacidadParaRuta } from '../src/lib/fase9/autorizacion.ts';
import { sesionTieneCapacidad } from '../src/lib/session.ts';

const fuente = await readFile(new URL('../scripts/apps-script-pedidos.gs', import.meta.url), 'utf8');
const copia = (v) => JSON.parse(JSON.stringify(v));

class Hoja {
  constructor(nombre, valores, eventos) { this.nombre = nombre; this.valores = copia(valores); this.eventos = eventos; }
  getName() { return this.nombre; }
  getLastRow() { return this.valores.length; }
  getLastColumn() { return this.valores[0]?.length ?? 0; }
  getDataRange() { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()); }
  setFrozenRows() {}
  getRange(fila, col, filas = 1, cols = 1) {
    return {
      getValues: () => Array.from({ length: filas }, (_, i) => Array.from({ length: cols }, (_, j) => this.valores[fila + i - 1]?.[col + j - 1] ?? '')),
      setValue: (v) => this.getRange(fila, col).setValues([[v]]),
      setValues: (valores) => {
        this.eventos.push(`escribir:${this.nombre}`);
        valores.forEach((r, i) => r.forEach((v, j) => {
          this.valores[fila + i - 1] ??= [];
          this.valores[fila + i - 1][col + j - 1] = v;
        }));
      },
    };
  }
  appendRow(v) { this.eventos.push(`escribir:${this.nombre}`); this.valores.push(copia(v)); }
}

function escenario({ antiguo = false } = {}) {
  const eventos = [];
  const hojas = {};
  const agregar = (nombre, v) => hojas[nombre] = new Hoja(nombre, v, eventos);
  const headers = ['id_producto','activo','nombre','categoria','prioridad','unidad_medida','permite_decimal','paso_venta','precio_costo','precio_venta','stock_actual','stock_minimo','imagen_url'];
  if (!antiguo) headers.push('tipo_disponibilidad');
  const row = (id, activo, tipo) => [id, activo, id, 'Alimentos', 'media', 'unidad', 'NO', 1, '', 2500, 5, 0, '', ...(!antiguo ? [tipo] : [])];
  agregar('PRODUCTOS', [headers, row('PROD-REGULAR','SI','REGULAR'), row('PROD-ESPECIAL','SI','POR_APERTURA'), row('PROD-HIST','NO','REGULAR'), row('PROD-LEGACY','SI',''), row('PROD-ESPECIAL-INACTIVO','NO','POR_APERTURA')]);
  agregar('APERTURAS', [['apertura_id'], ['APE-20261002'], ['APE-20261003']]);
  agregar('PEDIDOS', [['id_pedido'], ['PED-HIST']]);
  agregar('DETALLE_PEDIDOS', [['id_pedido','id_producto','nombre_producto','precio_unitario'], ['PED-HIST','PROD-HIST','Nombre historico',123]]);
  agregar('DETALLE_VENTAS', [['venta_id','producto_id','precio_unitario'], ['VEN-HIST','PROD-HIST',111]]);
  agregar('OPERACIONES_PEDIDOS', [['operacion_id','estado_operacion','snapshot_json'], ['OP-1','REQUIERE_REVISION','snapshot 1'], ['OP-2','REQUIERE_REVISION','snapshot 2']]);
  if (!antiguo) agregar('APERTURA_PRODUCTOS', [['apertura_id','producto_id','habilitado','actualizado_por','actualizado_en']]);
  const ss = {
    getName: () => 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES',
    getSheetByName: (n) => hojas[n], getSheets: () => Object.values(hojas),
    insertSheet: (n) => { assert.equal(hojas[n], undefined); eventos.push(`crear:${n}`); return agregar(n, []); },
    copy: () => { eventos.push('backup'); return {}; },
  };
  const propiedades = new Map([['APP_ENV','TEST']]);
  let uuid = 0;
  const contexto = {
    SpreadsheetApp: { openById: () => ss, flush() {} },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => propiedades.get(k), setProperty: (k,v) => propiedades.set(k,v), deleteProperty: (k) => propiedades.delete(k) }) },
    Session: { getScriptTimeZone: () => 'America/Santiago' },
    Utilities: { DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
      computeDigest: (_a,v) => [...createHash('sha256').update(String(v)).digest()],
      formatDate: () => '2026-10-01T12:00:00.000', getUuid: () => String(++uuid).padStart(32,'0') },
  };
  vm.runInNewContext(fuente, contexto);
  return { contexto, hojas, ss, eventos, propiedades };
}

for (const [rol, confirma, cancela] of [['venta',true,false],['operacion',true,true],['administracion',true,true]]) {
  test(`${rol}: confirmar ${confirma ? 'PASS' : 'DENY'}`, () => assert.equal(rolTieneCapacidad(rol, capacidadParaCambioPedido('pendiente')), confirma));
  test(`${rol}: cancelar ${cancela ? 'PASS' : 'DENY'}`, () => {
    assert.equal(rolTieneCapacidad(rol, capacidadParaRuta('/api/admin/pedidos/PED-1','POST')), cancela);
    assert.equal(rolTieneCapacidad(rol, capacidadParaCambioPedido('cancelado')), cancela);
  });
}

test('API de cancelacion: Venta recibe 403 antes de consultar o mutar backend, incluso con body hostil', async () => {
  const ruta = await readFile(new URL('../src/app/api/admin/pedidos/[id]/route.ts', import.meta.url), 'utf8');
  const codigo = ts.transpileModule(ruta, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  const mocks = {
    'next/server': { NextResponse: { json: (v,o) => Response.json(v,o) } },
    '@/lib/appsScriptPedidos': { obtenerPedido: () => assert.fail('No debe leer backend') },
    '@/lib/session': { sesionTieneCapacidad },
    '@/lib/fase9/autorizacion': {}, '@/lib/fase3a/proxyAdmin': {},
    '@/lib/fase8/apiAdmin': {}, '@/lib/fase9/resilienciaPedidos': {},
  };
  vm.runInNewContext(codigo, { exports, require: (n) => mocks[n] ?? assert.fail(n) });
  const req = new Request('http://test/api/admin/pedidos/PED-1', { method: 'POST', headers: { 'x-almacen-session-role': 'venta' }, body: JSON.stringify({ rol: 'administracion', actor: 'falso', idempotency_key: 'qa_12345678' }) });
  const respuesta = await exports.POST(req, { params: Promise.resolve({ id: 'PED-1' }) });
  assert.equal(respuesta.status, 403);
});

test('UI filtra transiciones con capacidades y oferta admin exige productos:gestionar', async () => {
  const ui = await readFile(new URL('../src/app/admin/page.tsx', import.meta.url), 'utf8');
  assert.match(ui, /transicionesPosibles\(pedido.estado_pedido\).filter\(.*tiene\(capacidadParaCambioPedido/);
  for (const rol of ['venta','operacion']) assert.equal(rolTieneCapacidad(rol, capacidadParaRuta('/api/admin/aperturas/APE-20261002/productos','PATCH')), false);
  assert.equal(rolTieneCapacidad('administracion', capacidadParaRuta('/api/admin/aperturas/APE-20261002/productos','PATCH')), true);
});

test('catalogo sin apertura muestra regulares activos y oculta especiales e historicos', () => {
  const { contexto } = escenario();
  assert.deepEqual(copia(contexto.listarProductos_()).map(p => p.id_producto), ['PROD-REGULAR','PROD-LEGACY']);
});

test('especial solo visible en su apertura habilitada; inactivo siempre oculto', () => {
  const { contexto, hojas } = escenario();
  hojas.APERTURA_PRODUCTOS.appendRow(['APE-20261002','PROD-ESPECIAL','SI']);
  hojas.APERTURA_PRODUCTOS.appendRow(['APE-20261002','PROD-ESPECIAL-INACTIVO','SI']);
  assert.ok(contexto.listarProductos_('APE-20261002').some(p => p.id_producto === 'PROD-ESPECIAL'));
  assert.ok(!contexto.listarProductos_('APE-20261003').some(p => p.id_producto === 'PROD-ESPECIAL'));
  assert.ok(!contexto.listarProductos_('APE-20261002').some(p => p.id_producto === 'PROD-ESPECIAL-INACTIVO'));
});

test('compatibilidad: columna ausente o vacia se interpreta como REGULAR; tipo invalido falla cerrado', () => {
  const { contexto } = escenario({ antiguo: true });
  assert.ok(contexto.listarProductos_().every(p => p.tipo_disponibilidad === 'REGULAR'));
  assert.equal(contexto.productoDisponibleEnApertura_({ id_producto: 'PROD-X', activo: 'SI', tipo_disponibilidad: 'INVALIDO' }, {}), false);
});

for (const [id, habilitado, aceptado] of [['PROD-REGULAR',false,true],['PROD-ESPECIAL',true,true],['PROD-ESPECIAL',false,false],['PROD-HIST',true,false]]) {
  test(`crear pedido ${id}, habilitado=${habilitado}: ${aceptado ? 'aceptado' : 'rechazado'}`, () => {
    const { contexto, ss, hojas } = escenario();
    if (habilitado) hojas.APERTURA_PRODUCTOS.appendRow(['APE-20261002',id,'SI']);
    contexto.exigirContratoPedidosF9Test_ = () => {};
    contexto.validarPedidoAnticipadoTest_ = () => ({ apertura_id: 'APE-20261002', origen_pedido: 'online_anticipado' });
    const payload = { nombre_cliente: 'QA', telefono: '000000000', forma_pago: 'efectivo_al_retirar', carrito: [{ id_producto: id, cantidad: 1 }], apertura_id: 'APE-20261002', origen_pedido: 'online_anticipado' };
    if (aceptado) {
      const plan = contexto.construirPlanCreacionPedido_(ss,payload,new Date());
      assert.equal(plan.detalles[0].precio_unitario,2500);
    } else assert.throws(() => contexto.construirPlanCreacionPedido_(ss,payload,new Date()), /inactivo|no disponible/);
    assert.equal(hojas.PRODUCTOS.valores[1][10],5); // Crear no descuenta stock.
    assert.equal(hojas.PEDIDOS.getLastRow(),2);
  });
}

test('preparacion TEST es idempotente, con backup anterior y conserva IDs, snapshots y REQUIERE_REVISION', () => {
  const { contexto, hojas, eventos } = escenario({ antiguo: true });
  const historia = ['PEDIDOS','DETALLE_PEDIDOS','DETALLE_VENTAS','OPERACIONES_PEDIDOS'].map(n => copia(hojas[n].valores));
  const ids = hojas.PRODUCTOS.valores.slice(1).map(r => r[0]);
  const primera = contexto.prepararDisponibilidadProductosTest_();
  const despues = copia(hojas.PRODUCTOS.valores);
  const segunda = contexto.prepararDisponibilidadProductosTest_();
  assert.equal(primera.backup_creado,true);
  assert.equal(eventos[0],'backup');
  assert.equal(segunda.backup_creado,false);
  assert.equal(segunda.normalizadas,0);
  assert.deepEqual(hojas.PRODUCTOS.valores,despues);
  assert.deepEqual(hojas.PRODUCTOS.valores.slice(1).map(r => r[0]),ids);
  assert.equal(hojas.APERTURA_PRODUCTOS.getLastRow(),1);
  assert.equal(hojas.PRODUCTOS.valores[0].filter(h => h === 'tipo_disponibilidad').length,1);
  assert.deepEqual(['PEDIDOS','DETALLE_PEDIDOS','DETALLE_VENTAS','OPERACIONES_PEDIDOS'].map(n => copia(hojas[n].valores)),historia);
  assert.deepEqual(primera.readback.hojas.map(h => h.nombre).sort(), Object.keys(hojas).sort());
});

test('migracion rechaza destino no TEST e IDs duplicados antes de backup/escritura', () => {
  const caso = escenario({ antiguo: true });
  caso.propiedades.set('APP_ENV','PRODUCTION');
  assert.throws(() => caso.contexto.prepararDisponibilidadProductosTest_(), /bloqueada/);
  caso.propiedades.set('APP_ENV','TEST');
  caso.hojas.PRODUCTOS.valores.push(copia(caso.hojas.PRODUCTOS.valores[1]));
  assert.throws(() => caso.contexto.prepararDisponibilidadProductosTest_(), /duplicado/);
  assert.deepEqual(caso.eventos,[]);
});

test('relacion admin: enable/replay/disable no duplica filas; conflicto optimista e inactivos rechazan', () => {
  const { contexto, hojas } = escenario();
  const body = { apertura_id: 'APE-20261002', producto_id: 'PROD-ESPECIAL', habilitado: true, habilitado_esperado: false, responsable: 'test-admin', idempotency_key: 'oferta_12345678' };
  contexto.configurarProductoPorAperturaAdmin_(body);
  contexto.configurarProductoPorAperturaAdmin_(body);
  assert.equal(hojas.APERTURA_PRODUCTOS.getLastRow(),2);
  assert.throws(() => contexto.configurarProductoPorAperturaAdmin_({ ...body, idempotency_key: 'otra_12345678' }), /cambio/);
  contexto.configurarProductoPorAperturaAdmin_({ ...body, habilitado: false, habilitado_esperado: true, idempotency_key: 'disable_12345678' });
  assert.equal(hojas.APERTURA_PRODUCTOS.getLastRow(),2);
  assert.ok(!contexto.listarProductos_('APE-20261002').some(p => p.id_producto === 'PROD-ESPECIAL'));
  assert.throws(() => contexto.configurarProductoPorAperturaAdmin_({ ...body, producto_id: 'PROD-ESPECIAL-INACTIVO', idempotency_key: 'inactive_12345678' }), /inactivo/);
});

test('duplicado de relacion no habilita accidentalmente un especial', () => {
  const { contexto, hojas } = escenario();
  hojas.APERTURA_PRODUCTOS.appendRow(['APE-20261002','PROD-ESPECIAL','SI']);
  hojas.APERTURA_PRODUCTOS.appendRow(['APE-20261002','PROD-ESPECIAL','NO']);
  assert.throws(() => contexto.listarProductos_('APE-20261002'), /duplicada/);
});
