import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  NOMBRE_SHEET_TEST_CATALOGO,
  validarPlanCatalogoTest,
} from '../src/lib/fase4/planCatalogo.ts';

function plan(cambios) {
  return {
    entorno: 'TEST',
    sheet_nombre: NOMBRE_SHEET_TEST_CATALOGO,
    cambios,
  };
}

test('Fase 4: un plan TEST exige valor esperado para cada cambio', () => {
  const resultado = validarPlanCatalogoTest(plan([{
    id_producto: 'PROD-001',
    decision_id: 'F4-03',
    esperado: { unidad_medida: 'unidad' },
    propuesto: { unidad_medida: 'kg' },
  }]));
  assert.deepEqual(resultado, { ok: true, errores: [], productos: 1, campos: 1 });
});

test('Fase 4: bloquea destino no TEST, campos inesperados y stock directo', () => {
  const resultado = validarPlanCatalogoTest({
    entorno: 'PRODUCTION',
    sheet_nombre: 'BD_WEB_ALMACEN_ROSA_ELENA_MORALES',
    cambios: [{
      id_producto: 'PROD-001',
      decision_id: 'otro',
      esperado: { stock_actual: 100 },
      propuesto: { stock_actual: 10, secreto: 'x' },
    }],
  });
  assert.equal(resultado.ok, false);
  assert.ok(resultado.errores.some((error) => error.includes('entorno TEST')));
  assert.ok(resultado.errores.some((error) => error.includes('destino TEST')));
  assert.ok(resultado.errores.some((error) => error.includes('stock_actual')));
  assert.ok(resultado.errores.some((error) => error.includes('campo no editable')));
});

test('Fase 4: el CLI no usa red, no lee env files y bloquea variables productivas', async () => {
  const fuente = await readFile(
    new URL('../scripts/validate-catalogo-test-plan.mjs', import.meta.url),
    'utf8'
  );
  assert.match(fuente, /NEXT_PUBLIC_APP_ENV !== 'test'/);
  assert.match(fuente, /GOOGLE_SCRIPT_PEDIDOS_URL \|\| process\.env\.GOOGLE_SCRIPT_ADMIN_TOKEN/);
  assert.match(fuente, /validación local sin red ni escrituras/);
  assert.doesNotMatch(fuente, /fetch\(|https?:\/\/|\.env\.local|dotenv/);
});

test('Fase 4: la propuesta documenta 54 productos y nueve decisiones agrupadas', async () => {
  const propuesta = await readFile(
    new URL('../docs/fase-4-9/PROPUESTA_CATALOGO_FASE_4_TEST.md', import.meta.url),
    'utf8'
  );
  assert.equal((propuesta.match(/^### DECISIÓN F4-[0-9]{2}/gm) ?? []).length, 9);
  assert.equal((propuesta.match(/^\| PROD-/gm) ?? []).length, 54);
  assert.match(propuesta, /No autoriza cambios en TEST ni en producción/);
});
