import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { auditarCatalogo } from '../src/lib/fase4/auditoriaCatalogo.ts';

function producto(overrides = {}) {
  return {
    id_producto: 'PROD-001',
    nombre: 'Arroz',
    categoria: 'Alimento',
    prioridad: 'alta',
    unidad_medida: 'unidad',
    permite_decimal: 'NO',
    paso_venta: 1,
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
  assert.ok(resultado.hallazgos.some((item) => item.codigo === 'IMAGEN_PENDIENTE'));
  assert.ok(resultado.hallazgos.some((item) => item.codigo === 'NOMBRE_DUPLICADO_NORMALIZADO'));
  assert.ok(resultado.decisiones_humanas >= 4);
});

test('Fase 4: producto entero exige paso uno y decimal acepta paso positivo', () => {
  const entero = auditarCatalogo([producto({ paso_venta: 0.5 })]);
  const decimal = auditarCatalogo([producto({ permite_decimal: 'SI', paso_venta: 0.1 })]);
  assert.ok(entero.hallazgos.some((item) => item.codigo === 'PASO_ENTERO_INVALIDO'));
  assert.equal(decimal.errores, 0);
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
  assert.doesNotMatch(fuente, /method:\s*['"]POST['"]|\.env\.local|dotenv/);
  assert.doesNotMatch(
    fuente,
    /console\.(?:log|error)\([^\n]*(?:urlTest|tokenTest)/
  );
});
