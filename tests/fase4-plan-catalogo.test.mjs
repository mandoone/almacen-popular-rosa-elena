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

test('Fase 4: la propuesta documenta 54 productos, nueve decisiones y su aprobación', async () => {
  const propuesta = await readFile(
    new URL('../docs/fase-4-9/PROPUESTA_CATALOGO_FASE_4_TEST.md', import.meta.url),
    'utf8'
  );
  assert.equal((propuesta.match(/^### DECISIÓN F4-[0-9]{2}/gm) ?? []).length, 9);
  assert.equal((propuesta.match(/^\| PROD-/gm) ?? []).length, 54);
  assert.match(propuesta, /fueron aprobadas el 2026-09-15/);
  assert.match(propuesta, /no autoriza cambios en producción/i);
});

test('Fase 4: el plan aprobado cambia solo categorías y diez unidades pack', async () => {
  const planAprobado = JSON.parse(await readFile(
    new URL('../docs/fase-4-9/PLAN_CATALOGO_FASE_4_TEST_APROBADO.json', import.meta.url),
    'utf8'
  ));
  const resultado = validarPlanCatalogoTest(planAprobado);
  assert.deepEqual(resultado, { ok: true, errores: [], productos: 54, campos: 64 });

  const categorias = planAprobado.cambios.filter((cambio) => 'categoria' in cambio.propuesto);
  const unidades = planAprobado.cambios.filter((cambio) => 'unidad_medida' in cambio.propuesto);
  assert.equal(categorias.length, 54);
  assert.equal(unidades.length, 10);
  assert.deepEqual(
    new Set(categorias.map((cambio) => cambio.propuesto.categoria)),
    new Set(['Granel', 'Alimentos', 'Limpieza', 'Higiene'])
  );
  assert.deepEqual(
    unidades.map((cambio) => cambio.id_producto).sort(),
    ['PROD-025', 'PROD-026', 'PROD-028', 'PROD-029', 'PROD-030', 'PROD-034',
      'PROD-035', 'PROD-042', 'PROD-043', 'PROD-045']
  );
  assert.ok(unidades.every((cambio) => cambio.propuesto.unidad_medida === 'pack'));

  const campos = planAprobado.cambios.flatMap((cambio) => Object.keys(cambio.propuesto));
  assert.ok(campos.every((campo) => ['categoria', 'unidad_medida'].includes(campo)));
  assert.ok(planAprobado.cambios.every((cambio) => !(
    'precio_costo' in cambio.propuesto ||
    'precio_venta' in cambio.propuesto ||
    'stock_actual' in cambio.propuesto ||
    'stock_minimo' in cambio.propuesto ||
    'imagen_url' in cambio.propuesto
  )));
});
