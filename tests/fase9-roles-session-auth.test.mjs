import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  CAPACIDADES,
  rolCumpleNivel,
  rolTieneCapacidad,
} from '../src/lib/fase9/roles.ts';
import {
  capacidadParaCambioPedido,
  capacidadParaRuta,
  rutaEsODescendiente,
} from '../src/lib/fase9/autorizacion.ts';
import {
  dtoActualizacionProductoAdmin,
  dtoAjusteStockAdmin,
  dtoCajaCompraAdmin,
  dtoCompraAdmin,
  dtoCreacionProductoAdmin,
  dtoGastoAdmin,
  payloadAdminFase78,
  solicitudModificaPrecios,
} from '../src/lib/fase9/dtoAdmin.ts';
import {
  invalidarSesionAdmin,
  obtenerSesionAdmin,
} from '../src/lib/fase9/cacheSesionAdmin.ts';
import {
  LEGACY_TEST_IDENTITY,
  makeSessionToken,
  permiteLoginLegacy,
  readSessionToken,
  sesionTieneCapacidad,
  verifySessionToken,
} from '../src/lib/session.ts';

const SECRET = 'secreto-test-con-longitud-suficiente';
const AHORA = Date.UTC(2026, 8, 22, 12, 0, 0);

async function firmarPayloadCrudo(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const firma = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encoded));
  const hex = Buffer.from(firma).toString('hex');
  return `${encoded}.${hex}`;
}

test('F9: matriz jerárquica de roles y capacidades', () => {
  assert.equal(rolTieneCapacidad('venta', 'pedidos:confirmar'), true);
  assert.equal(rolTieneCapacidad('venta', 'stock:ajustar'), false);
  assert.equal(rolCumpleNivel('operacion', 'venta'), true);
  assert.equal(rolTieneCapacidad('operacion', 'stock:ajustar'), true);
  assert.equal(rolTieneCapacidad('operacion', 'usuarios:gestionar'), false);
  assert.equal(rolTieneCapacidad('operacion', 'configuracion:gestionar'), false);
  for (const capacidad of CAPACIDADES) {
    assert.equal(rolTieneCapacidad('administracion', capacidad), true, capacidad);
  }
});

test('F9: sesión válida conserva identidad, rol y expiración', async () => {
  const token = await makeSessionToken(SECRET, {
    actor_id: 'persona-test', nombre: 'Persona TEST', rol: 'operacion',
  }, AHORA);
  const payload = await readSessionToken(token, SECRET, AHORA + 1_000);
  assert.equal(payload?.actor_id, 'persona-test');
  assert.equal(payload?.nombre, 'Persona TEST');
  assert.equal(payload?.rol, 'operacion');
  const tokenActual = await makeSessionToken(SECRET, {
    actor_id: 'persona-test', rol: 'operacion',
  });
  assert.equal(await verifySessionToken(tokenActual, SECRET), true);
});

test('F9: sesión expirada o con firma inválida falla cerrada', async () => {
  const token = await makeSessionToken(SECRET, LEGACY_TEST_IDENTITY, AHORA);
  assert.equal(await readSessionToken(token, SECRET, AHORA + 8 * 60 * 60 * 1000), null);
  const alterado = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0');
  assert.equal(await readSessionToken(alterado, SECRET, AHORA + 1), null);
});

test('F9: payload malformado y rol desconocido fallan cerrados aun firmados', async () => {
  const malformado = await firmarPayloadCrudo({ actor_id: 123, rol: 'venta', iat: AHORA, exp: AHORA + 1000 });
  const rolDesconocido = await firmarPayloadCrudo({ actor_id: 'x', rol: 'superadmin', iat: AHORA, exp: AHORA + 1000 });
  assert.equal(await readSessionToken(malformado, SECRET, AHORA + 1), null);
  assert.equal(await readSessionToken(rolDesconocido, SECRET, AHORA + 1), null);
});

test('F9: login legacy genera solo la identidad genérica provisoria', async () => {
  const token = await makeSessionToken(SECRET, undefined, AHORA);
  const payload = await readSessionToken(token, SECRET, AHORA + 1);
  assert.equal(payload?.actor_id, 'legacy-admin');
  assert.equal(payload?.rol, 'administracion');
});

test('F9: login legacy queda bloqueado en producción salvo entorno TEST/local explícito', () => {
  assert.equal(permiteLoginLegacy('production', undefined), false);
  assert.equal(permiteLoginLegacy('production', 'production'), false);
  assert.equal(permiteLoginLegacy('production', 'TEST'), true);
  assert.equal(permiteLoginLegacy('production', 'local'), true);
  assert.equal(permiteLoginLegacy('development', undefined), true);
});

test('F9: autorización distingue venta, operación y administración', () => {
  assert.equal(rolTieneCapacidad('venta', capacidadParaRuta('/api/admin/pedidos/1', 'PATCH')), true);
  assert.equal(rolTieneCapacidad('venta', capacidadParaRuta('/api/admin/stock/ajustes', 'POST')), false);
  assert.equal(rolTieneCapacidad('operacion', capacidadParaRuta('/api/admin/stock/ajustes', 'POST')), true);
  assert.equal(rolTieneCapacidad('operacion', capacidadParaRuta('/api/admin/productos', 'PATCH')), false);
  assert.equal(rolTieneCapacidad('administracion', capacidadParaRuta('/api/admin/productos', 'PATCH')), true);
});

test('F9: cada transición de pedido exige su capacidad granular', () => {
  assert.equal(capacidadParaCambioPedido('pendiente'), 'pedidos:confirmar');
  assert.equal(capacidadParaCambioPedido('listo'), 'pedidos:confirmar');
  assert.equal(capacidadParaCambioPedido('entregado'), 'pedidos:entregar');
  assert.equal(rolTieneCapacidad('venta', capacidadParaCambioPedido('entregado')), true);
});

test('F9: matching de rutas respeta frontera exacta o barra', () => {
  assert.equal(rutaEsODescendiente('/api/admin/ventas', '/api/admin/ventas'), true);
  assert.equal(rutaEsODescendiente('/api/admin/ventas/123', '/api/admin/ventas'), true);
  assert.equal(rutaEsODescendiente('/api/admin/ventas-configuracion', '/api/admin/ventas'), false);
  assert.equal(capacidadParaRuta('/api/admin/ventas-configuracion', 'POST'), 'configuracion:gestionar');
  assert.equal(rolTieneCapacidad('venta', capacidadParaRuta('/api/admin/ventas-configuracion', 'POST')), false);
});

test('F9: sesión inyectada no puede elevarse con rol enviado en el body', () => {
  const venta = new Request('http://local/api/admin/stock/ajustes', {
    headers: { 'x-almacen-session-role': 'venta' },
  });
  const operacion = new Request('http://local/api/admin/productos', {
    headers: { 'x-almacen-session-role': 'operacion' },
  });
  const administracion = new Request('http://local/api/admin/productos', {
    headers: { 'x-almacen-session-role': 'administracion' },
  });
  assert.equal(sesionTieneCapacidad(venta, 'stock:ajustar'), false);
  assert.equal(sesionTieneCapacidad(operacion, 'productos:gestionar'), false);
  assert.equal(sesionTieneCapacidad(operacion, 'precios:gestionar'), false);
  assert.equal(sesionTieneCapacidad(administracion, 'productos:gestionar'), true);
  assert.equal(sesionTieneCapacidad(administracion, 'precios:gestionar'), true);
});

test('F9: DTOs allowlist eliminan action/token/actor/rol y campos desconocidos', () => {
  const hostil = {
    action: 'actualizarProductoAdmin',
    token: 'fake',
    actor: 'admin-falso',
    actor_id: 'admin-falso',
    responsable: 'admin-falso',
    rol: 'administracion',
    campo_desconocido: 'no-propagar',
    idempotency_key: 'idem_12345678',
    producto_id: 'P-1',
    delta: 2,
    motivo: 'conteo',
    categoria: 'operacion',
    descripcion: 'prueba',
    monto: 100,
    fecha: '2026-09-22',
    proveedor: 'Proveedor',
    saldo_cuenta: 1,
    efectivo_disponible: 2,
    pendientes_referencia: 3,
    presupuesto_confirmado: 4,
    observaciones: 'ok',
    lineas: [{ producto_id: 'P-1', cantidad: 1, costo_unitario: 10, actor: 'falso' }],
    cambios: { nombre: 'Producto', precio_venta: 99, action: 'falsa', stock_actual: 999 },
    producto: { nombre: 'Nuevo', precio_venta: 88, token: 'fake', stock_actual: 999 },
  };
  const actorSesion = 'persona-sesion';
  const dtos = [
    dtoCompraAdmin(hostil),
    dtoGastoAdmin(hostil),
    dtoCajaCompraAdmin(hostil),
    dtoAjusteStockAdmin(hostil),
    dtoActualizacionProductoAdmin(hostil),
    dtoCreacionProductoAdmin(hostil),
  ];
  for (const dto of dtos) {
    for (const reservado of ['action', 'token', 'actor', 'actor_id', 'responsable', 'rol', 'campo_desconocido']) {
      assert.equal(Object.hasOwn(dto, reservado), false, reservado);
    }
  }
  assert.deepEqual(dtos[0].lineas, [{ producto_id: 'P-1', cantidad: 1, costo_unitario: 10 }]);
  assert.deepEqual(dtos[4].cambios, { nombre: 'Producto', precio_venta: 99 });
  assert.deepEqual(dtos[5].producto, { nombre: 'Nuevo', precio_venta: 88 });
  assert.equal(solicitudModificaPrecios(hostil), true);
  assert.equal(solicitudModificaPrecios(hostil, true), true);

  const payload = payloadAdminFase78('ajustarStockAdmin', actorSesion, 'token-servidor', {
    ...dtoAjusteStockAdmin(hostil),
    action: 'actualizarProductoAdmin',
    token: 'fake',
    responsable: 'admin-falso',
  });
  assert.equal(payload.action, 'ajustarStockAdmin');
  assert.equal(payload.token, 'token-servidor');
  assert.equal(payload.responsable, actorSesion);
});

test('F9: helpers fijan action/token después del DTO y rutas no reenvían el body completo', async () => {
  const helper = await readFile(new URL('../src/lib/appsScriptPedidos.ts', import.meta.url), 'utf8');
  assert.match(helper, /payloadAdminFase78\(action, actor, adminToken\(\), body\)/);
  assert.doesNotMatch(helper, /\{\s*action:\s*['"][^'"]+['"],\s*\.\.\.(?:input|body)/);

  const rutas = [
    'compras/route.ts', 'gastos/route.ts', 'caja-compra/route.ts',
    'stock/ajustes/route.ts', 'productos/route.ts', 'ventas/route.ts',
    'pedidos/[id]/route.ts', 'aperturas/route.ts',
    'aperturas/[id]/route.ts', 'aperturas/[id]/estado/route.ts',
  ];
  for (const ruta of rutas) {
    const fuente = await readFile(new URL(`../src/app/api/admin/${ruta}`, import.meta.url), 'utf8');
    assert.doesNotMatch(fuente, /\.\.\.body/, ruta);
  }
});

test('F9: invalidar cache de sesión obliga a leer la identidad nueva', async () => {
  invalidarSesionAdmin();
  let lecturas = 0;
  const fetchSesion = async () => ({
    actor_id: `persona-${++lecturas}`,
    rol: 'venta',
    capacidades: ['pedidos:ver'],
  });
  const primera = await obtenerSesionAdmin(fetchSesion);
  const cacheada = await obtenerSesionAdmin(fetchSesion);
  assert.equal(primera?.actor_id, 'persona-1');
  assert.equal(cacheada?.actor_id, 'persona-1');
  assert.equal(lecturas, 1);
  invalidarSesionAdmin();
  const nueva = await obtenerSesionAdmin(fetchSesion);
  assert.equal(nueva?.actor_id, 'persona-2');
  assert.equal(lecturas, 2);
  invalidarSesionAdmin();
});

test('F9: middleware responde 403 y reemplaza cabeceras de actor', async () => {
  const fuente = await readFile(new URL('../src/middleware.ts', import.meta.url), 'utf8');
  assert.match(fuente, /status: 403/);
  assert.match(fuente, /headers\.delete\(SESSION_ACTOR_HEADER\)/);
  assert.match(fuente, /headers\.set\(SESSION_ACTOR_HEADER, session\.actor_id\)/);
});
