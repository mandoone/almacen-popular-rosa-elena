import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const archivo = (ruta) => readFile(new URL(ruta, import.meta.url), 'utf8');

async function cargarAppsScript(overrides = {}) {
  const fuente = await archivo('../scripts/apps-script-pedidos.gs');
  const contexto = {
    Session: { getScriptTimeZone: () => 'America/Santiago' },
    Utilities: {
      formatDate: (_fecha, zona, formato) => {
        assert.equal(zona, 'America/Santiago');
        if (formato === 'yyyy-MM-dd HH:mm:ss') return '2026-09-13 12:30:07';
        if (formato === "yyyy-MM-dd'T'HH:mm:ss.SSS") {
          return '2026-09-13T12:30:07.908';
        }
        throw new Error(`Formato inesperado en test: ${formato}`);
      },
    },
    ...overrides,
  };
  vm.runInNewContext(fuente, contexto, { filename: 'apps-script-pedidos.gs' });
  return contexto;
}

function hojaMock(headers, filas) {
  return {
    getLastRow: () => filas.length + 1,
    getLastColumn: () => headers.length,
    getRange: (fila, _columna, cantidadFilas) => ({
      getValues: () => fila === 1 ? [headers] : filas.slice(0, cantidadFilas),
    }),
  };
}

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
    'verificarDestinoE2EFase56_',
    'obtenerEstadoE2EFase56_',
    'obtenerEvidenciaVentaE2EFase56_',
    'validarAperturaVentaPresencial_',
  ]) {
    assert.equal(typeof contexto[nombre], 'function', `${nombre} debe existir`);
  }
  assert.match(fuente, /case 'crearVentaPresencial':[\s\S]*validarEntornoTestVentas_/);
  assert.match(fuente, /function crearVentaPresencial_\(body\)[\s\S]*tryLock\(30000\)/);
  assert.match(fuente, /ejecutarIdempotenteBajoLock_/);
  assert.match(fuente, /rollbackVentaPresencial_/);
  assert.match(fuente, /America\/Santiago/);
  assert.match(fuente, /NOMBRE_SHEET_TEST_E2E = 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES'/);
  for (const accion of [
    'verificarDestinoE2EFase56',
    'obtenerEstadoE2EFase56',
    'obtenerEvidenciaVentaE2EFase56',
  ]) {
    const bloque = fuente.match(new RegExp(`case '${accion}':[\\s\\S]{0,240}?return jsonOk_`));
    assert.ok(bloque, `Debe existir el bloque GET de ${accion}`);
    assert.match(bloque[0], /exigirToken_\(params\.token\)/);
    assert.match(bloque[0], /validarEntornoTestVentas_\(\)/);
  }
  assert.match(contexto.verificarDestinoE2EFase56_.toString(),
    /validarEntornoTestVentas_\(\)/);
  assert.match(contexto.verificarDestinoE2EFase56_.toString(),
    /sheet_nombre:\s*NOMBRE_SHEET_TEST_E2E/);
  assert.doesNotMatch(contexto.verificarDestinoE2EFase56_.toString(),
    /setValue|setValues|appendRow|deleteRows|insertSheet/);
  assert.doesNotMatch(contexto.obtenerEstadoE2EFase56_.toString(),
    /setValue|setValues|appendRow|deleteRows|insertSheet/);
  assert.doesNotMatch(contexto.obtenerEvidenciaVentaE2EFase56_.toString(),
    /setValue|setValues|appendRow|deleteRows|insertSheet/);
  assert.match(contexto.obtenerEstadoE2EFase56_.toString(), /apertura:\s*apertura/);
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

test('Fase 5: serializa Date de fecha_hora con el contrato de venta', async () => {
  const contexto = await cargarAppsScript();
  assert.equal(
    contexto.valorFechaHoraVenta_(new Date('2026-09-13T15:30:07.908Z')),
    '2026-09-13 12:30:07'
  );
});

test('Fase 5: serializa Date de auditoría con milisegundos', async () => {
  const contexto = await cargarAppsScript();
  const fecha = new Date('2026-09-13T15:30:07.908Z');
  assert.equal(contexto.valorAuditoriaVenta_(fecha), '2026-09-13T12:30:07.908');
  const venta = contexto.serializarVentaPresencial_({ creado_en: fecha, actualizado_en: fecha });
  assert.equal(venta.creado_en, '2026-09-13T12:30:07.908');
  assert.equal(venta.actualizado_en, '2026-09-13T12:30:07.908');
});

test('Fase 5: preserva strings temporales ya normalizados', async () => {
  const contexto = await cargarAppsScript();
  assert.equal(
    contexto.valorFechaHoraVenta_(' 2026-09-13 12:30:07 '),
    '2026-09-13 12:30:07'
  );
  assert.equal(
    contexto.valorAuditoriaVenta_(' 2026-09-13T12:30:07.908 '),
    '2026-09-13T12:30:07.908'
  );
});

test('Fase 5: obtenerVentaPresencial reconstruye el mismo contrato temporal', async () => {
  const fecha = new Date('2026-09-13T15:30:07.908Z');
  const headersVenta = [
    'venta_id', 'fecha_hora', 'apertura_id', 'origen_venta', 'vendedor', 'total',
    'estado_venta', 'estado_pago', 'forma_pago', 'observaciones', 'creado_en',
    'actualizado_en',
  ];
  const filaVenta = [
    'VEN-20260913-123007-b35564a7', fecha, 'APE-20260919', 'presencial',
    'E2E TEST IDEMPOTENCIA', 100, 'vigente', 'pendiente_de_pago', 'pendiente',
    'E2E TEST', fecha, fecha,
  ];
  const headersDetalle = [
    'detalle_id', 'venta_id', 'producto_id', 'nombre_producto', 'cantidad',
    'unidad_medida', 'precio_unitario', 'subtotal',
  ];
  const filaDetalle = [
    'VEN-20260913-123007-b35564a7-D001', 'VEN-20260913-123007-b35564a7',
    'PROD-TEST-DECIMAL', 'Producto decimal TEST', 0.1, 'kg', 1000, 100,
  ];
  const hojas = {
    VENTAS: hojaMock(headersVenta, [filaVenta]),
    DETALLE_VENTAS: hojaMock(headersDetalle, [filaDetalle]),
  };
  const contexto = await cargarAppsScript({
    SpreadsheetApp: {
      openById: () => ({ getSheetByName: (nombre) => hojas[nombre] || null }),
    },
  });

  const reconstruida = contexto.obtenerVentaPresencial_('VEN-20260913-123007-b35564a7');
  const esperada = contexto.serializarVentaPresencial_({
    venta_id: filaVenta[0], fecha_hora: '2026-09-13 12:30:07',
    apertura_id: filaVenta[2], origen_venta: filaVenta[3], vendedor: filaVenta[4],
    total: filaVenta[5], estado_venta: filaVenta[6], estado_pago: filaVenta[7],
    forma_pago: filaVenta[8], observaciones: filaVenta[9],
    creado_en: '2026-09-13T12:30:07.908',
    actualizado_en: '2026-09-13T12:30:07.908',
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(reconstruida.venta)),
    JSON.parse(JSON.stringify(esperada))
  );
  assert.equal(reconstruida.comanda.fecha_hora, esperada.fecha_hora);
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
