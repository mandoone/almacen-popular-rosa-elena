import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  auditarCatalogo,
  resumirHallazgosCatalogo,
} from '../src/lib/fase4/auditoriaCatalogo.ts';

function producto(overrides = {}) {
  return {
    id_producto: 'PROD-001',
    activo: 'SI',
    nombre: 'Arroz',
    categoria: 'Alimento',
    prioridad: 'alta',
    unidad_medida: 'unidad',
    permite_decimal: 'NO',
    paso_venta: 1,
    precio_costo: 800,
    margen_pct: 20,
    precio_venta: 1000,
    stock_actual: 10,
    stock_minimo: 2,
    imagen_url: '/images/productos/arroz.jpg',
    ...overrides,
  };
}

test('Fase 4: catálogo consistente no produce hallazgos', () => {
  const resultado = auditarCatalogo([producto()]);
  assert.deepEqual(resultado, {
    productos: 1,
    errores: 0,
    advertencias: 0,
    decisiones_humanas: 0,
    hallazgos: [],
    estados_productos: [
      { id_producto: 'PROD-001', estado: 'APROBABLE_AUTOMATICAMENTE' },
    ],
  });
});

test('Fase 4: detecta errores objetivos de formato, precio y stock', () => {
  const resultado = auditarCatalogo([producto({
    id_producto: 'invalido',
    permite_decimal: 'quizás',
    paso_venta: 0,
    precio_venta: 0,
    stock_actual: -1,
    stock_minimo: -2,
  })]);
  const codigos = resultado.hallazgos.map((item) => item.codigo);
  assert.ok(codigos.includes('ID_INVALIDO'));
  assert.ok(codigos.includes('DECIMAL_INVALIDO'));
  assert.ok(codigos.includes('PASO_INVALIDO'));
  assert.ok(codigos.includes('PRECIO_INVALIDO'));
  assert.ok(codigos.includes('STOCK_INVALIDO'));
  assert.ok(codigos.includes('STOCK_MINIMO_INVALIDO'));
});

test('Fase 4: separa alertas operativas de decisiones humanas', () => {
  const resultado = auditarCatalogo([
    producto({ stock_actual: 1, stock_minimo: 2, imagen_url: '' }),
    producto({ id_producto: 'PROD-002', nombre: 'Árroz', categoria: '', prioridad: '', unidad_medida: '' }),
  ]);
  assert.ok(resultado.hallazgos.some((item) => item.codigo === 'BAJO_STOCK'));
  assert.ok(resultado.hallazgos.some((item) => item.codigo === 'IMAGENES_PENDIENTES'));
  assert.ok(resultado.hallazgos.some((item) => item.codigo === 'NOMBRE_DUPLICADO_NORMALIZADO'));
  assert.ok(resultado.decisiones_humanas >= 4);
});

test('Fase 4: producto entero exige paso uno y decimal acepta paso positivo', () => {
  const entero = auditarCatalogo([producto({ paso_venta: 0.5 })]);
  const decimal = auditarCatalogo([producto({ permite_decimal: 'SI', paso_venta: 0.1 })]);
  assert.ok(entero.hallazgos.some((item) => item.codigo === 'PASO_ENTERO_INVALIDO'));
  assert.equal(decimal.errores, 0);
});

test('Fase 4: distingue nombres exactos de variantes normalizadas', () => {
  const exactos = auditarCatalogo([
    producto(),
    producto({ id_producto: 'PROD-002' }),
  ]);
  assert.ok(exactos.hallazgos.some((item) => item.codigo === 'NOMBRE_DUPLICADO_EXACTO'));
  assert.ok(!exactos.hallazgos.some((item) => item.codigo === 'NOMBRE_DUPLICADO_NORMALIZADO'));

  const variantes = auditarCatalogo([
    producto(),
    producto({ id_producto: 'PROD-002', nombre: 'Árroz' }),
  ]);
  const hallazgo = variantes.hallazgos.find((item) => item.codigo === 'NOMBRE_DUPLICADO_NORMALIZADO');
  assert.deepEqual(hallazgo?.productos_afectados, ['PROD-001', 'PROD-002']);
  assert.ok(variantes.estados_productos.every((item) => item.estado === 'REQUIERE_DECISION'));
});

test('Fase 4: auditoría completa valida vocabularios, costos y assets', () => {
  const resultado = auditarCatalogo([
    producto({
      activo: 'tal vez',
      prioridad: 'urgente',
      unidad_medida: 'saco',
      precio_costo: -1,
      margen_pct: -5,
      imagen_url: '/images/productos/no-existe.jpg',
    }),
  ], {
    auditoria_completa: true,
    categorias_conocidas: ['alimentos'],
    rutas_imagen_disponibles: [],
  });
  const codigos = resultado.hallazgos.map((item) => item.codigo);
  for (const codigo of [
    'ACTIVO_INVALIDO',
    'PRIORIDAD_INVALIDA',
    'UNIDAD_INVALIDA',
    'COSTO_INVALIDO',
    'MARGEN_INVALIDO',
    'IMAGEN_INEXISTENTE',
  ]) assert.ok(codigos.includes(codigo));
  assert.deepEqual(resultado.estados_productos, [
    { id_producto: 'PROD-001', estado: 'ERROR' },
  ]);
});

test('Fase 4: pendientes masivos se agrupan y marcan los productos', () => {
  const resultado = auditarCatalogo([
    producto({ precio_costo: '', stock_minimo: 0, imagen_url: '' }),
    producto({ id_producto: 'PROD-002', nombre: 'Lentejas', precio_costo: '', stock_minimo: 0, imagen_url: '' }),
  ], { auditoria_completa: true });
  const resumen = resumirHallazgosCatalogo(resultado.hallazgos);
  assert.ok(resumen.some((item) => item.codigo === 'COSTOS_PENDIENTES' && item.cantidad === 2));
  assert.ok(resumen.some((item) => item.codigo === 'STOCK_MINIMO_PENDIENTE' && item.cantidad === 2));
  assert.ok(resumen.some((item) => item.codigo === 'IMAGENES_PENDIENTES' && item.cantidad === 2));
  assert.ok(resultado.estados_productos.every((item) => item.estado === 'REQUIERE_DECISION'));
});

test('Fase 4: runner remoto es GET read-only, exige preflight y no lee env files', async () => {
  const fuente = await readFile(new URL('../scripts/audit-catalogo-test.mjs', import.meta.url), 'utf8');
  assert.match(fuente, /verificarDestinoE2EFase56/);
  assert.match(fuente, /listarProductos/);
  assert.match(fuente, /mensajeRespuestaNoJsonSeguro/);
  assert.match(fuente, /diagnosticarRespuestaNoJson/);
  assert.match(fuente, /if \(!validarConfirmacionBackendTest\(destino\)\)/);
  assert.doesNotMatch(fuente, /confirmacion\.ok/);
  assert.match(fuente, /Tiempo de espera agotado en GET \$\{action\}/);
  assert.match(fuente, /const TIMEOUT_GET_MS = 30_000/);
  assert.match(fuente, /resumirHallazgosCatalogo/);
  assert.doesNotMatch(fuente, /method:\s*['"]POST['"]|\.env\.local|dotenv/);
  assert.doesNotMatch(
    fuente,
    /console\.(?:log|error)\([^\n]*(?:urlTest|tokenTest)/
  );
});
