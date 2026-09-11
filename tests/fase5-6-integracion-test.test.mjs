import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const archivo = (ruta) => readFile(new URL(ruta, import.meta.url), 'utf8');

test('Fase 5/6: Apps Script compila y expone solo acciones TEST con lock e idempotencia', async () => {
  const fuente = await archivo('../scripts/apps-script-pedidos.gs');
  const contexto = {};
  vm.runInNewContext(fuente, contexto, { filename: 'apps-script-pedidos.gs' });

  for (const nombre of [
    'prepararColumnasVentaPresencialTest',
    'crearVentaPresencial_',
    'obtenerVentaPresencial_',
    'listarVentasPorApertura_',
    'obtenerResumenApertura_',
    'validarAperturaVentaPresencial_',
  ]) {
    assert.equal(typeof contexto[nombre], 'function', `${nombre} debe existir`);
  }
  assert.match(fuente, /case 'crearVentaPresencial':[\s\S]*validarEntornoTestVentas_/);
  assert.match(fuente, /function crearVentaPresencial_\(body\)[\s\S]*tryLock\(30000\)/);
  assert.match(fuente, /ejecutarIdempotenteBajoLock_/);
  assert.match(fuente, /rollbackVentaPresencial_/);
  assert.match(fuente, /America\/Santiago/);
  assert.doesNotMatch(fuente, /GOOGLE_SCRIPT_(?:ADMIN_TOKEN|PEDIDOS_URL)_TEST\s*=/);
});

test('Fase 5: Apps Script valida cantidades y pago sin confiar en precios del navegador', async () => {
  const fuente = await archivo('../scripts/apps-script-pedidos.gs');
  const contexto = {};
  vm.runInNewContext(fuente, contexto, { filename: 'apps-script-pedidos.gs' });

  assert.equal(contexto.esMultiploPasoVenta_(0.5, 0.25), true);
  assert.equal(contexto.esMultiploPasoVenta_(0.3, 0.25), false);
  assert.throws(() => contexto.normalizarEntradaVentaPresencial_({
    apertura_id: 'APE-20260919',
    vendedor: 'Lucía',
    forma_pago: 'tarjeta',
    lineas: [{ producto_id: 'PROD-1', cantidad: 1 }],
    total: 1,
    precio_unitario: 1,
  }), /forma_pago invalida/);

  const entrada = contexto.normalizarEntradaVentaPresencial_({
    apertura_id: 'APE-20260919',
    vendedor: 'Lucía',
    forma_pago: 'efectivo',
    lineas: [{ producto_id: 'PROD-1', cantidad: 2 }],
    total: 1,
    precio_unitario: 1,
  });
  assert.equal(Object.hasOwn(entrada, 'total'), false);
  assert.equal(Object.hasOwn(entrada, 'precio_unitario'), false);
});

test('Fase 5/6: las rutas quedan bajo admin, sin secretos, y demo no las invoca', async () => {
  const middleware = await archivo('../src/middleware.ts');
  const admin = await archivo('../src/app/admin/page.tsx');
  assert.match(middleware, /'\/api\/admin\/:path\+'/);
  assert.match(middleware, /'\/admin\/:path\+'/);
  assert.match(admin, /!modoDemo/);
  assert.doesNotMatch(admin, /fetch\('\/api\/admin\/ventas/);

  for (const ruta of [
    '../src/app/api/admin/ventas/route.ts',
    '../src/app/api/admin/ventas/[id]/route.ts',
    '../src/app/api/admin/aperturas/[id]/ventas/route.ts',
    '../src/app/api/admin/aperturas/[id]/resumen/route.ts',
  ]) {
    const fuente = await archivo(ruta);
    assert.doesNotMatch(fuente, /GOOGLE_SCRIPT_ADMIN_TOKEN/);
    assert.doesNotMatch(fuente, /GOOGLE_SCRIPT_PEDIDOS_URL/);
  }
});

test('Fase 6: la vista se declara de lectura y no ofrece cierre persistente', async () => {
  const fuente = await archivo('../src/app/admin/caja/page.tsx');
  assert.match(fuente, /Cierre de lectura \/ borrador/);
  assert.match(fuente, /no cierra ni modifica la apertura/);
  assert.doesNotMatch(fuente, /method:\s*'POST'/);
});
