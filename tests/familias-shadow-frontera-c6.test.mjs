/** Handler real con transportes locales. Cero peticiones Google ni escrituras. */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';
import { obtenerEntornoAplicacion } from '../src/lib/env.ts';
import { sesionTieneCapacidad } from '../src/lib/session.ts';
import * as shadow from '../src/lib/familias/catalogoShadow.ts';
import * as auditoria from '../src/lib/familias/auditoriaIdentidad.ts';
import { crearFixturesFamilias } from './fixtures/familias-producto.mjs';
const fuente = await readFile(new URL('../src/app/api/admin/familias/shadow/route.ts', import.meta.url), 'utf8');
async function handler(entorno = 'test', fallar = false) {
  const f = crearFixturesFamilias(), exports = {}, llamadas = [];
  const backend = {
    listarFamiliasProductoAdmin: async () => { llamadas.push('familias'); return { familias: [f.economico] }; },
    listarProductosAdmin: async () => { llamadas.push('skus'); if (fallar) throw new Error('Fallo de lectura'); return [...f.cloros, f.especial, { ...f.legado, id_producto: 'PROD-COMERCIAL', precio_costo: 100 }]; },
    listarProductosPorAperturaAdmin: async apertura => { llamadas.push(apertura); return [{ producto_id: f.especial.id_producto, habilitado: true }]; },
  };
  const mocks = {
    'next/server': { NextResponse: { json: (v, o) => Response.json(v, o) } },
    '@/lib/appsScriptPedidos': backend, '@/lib/session': { sesionTieneCapacidad }, '@/lib/env': { obtenerEntornoAplicacion },
    '@/lib/familias/catalogoShadow': shadow, '@/lib/familias/auditoriaIdentidad': auditoria,
    '@/lib/fase8/apiAdmin': { respuestaErrorAdmin: () => Response.json({ ok: false }, { status: 502 }) },
  };
  vm.runInNewContext(ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, URL, Date, process: { env: { NEXT_PUBLIC_APP_ENV: entorno } }, require: n => mocks[n] ?? assert.fail(n) });
  return { exports, llamadas };
}
const req = (rol = 'administracion', qs = '') => new Request(`http://local/api/admin/familias/shadow${qs}`, { headers: { 'x-almacen-session-role': rol, 'x-almacen-session-actor': 'admin-qa' } });
for (const entorno of ['production', '', 'local', 'test']) for (const rol of ['venta', 'operacion', 'administracion', '']) {
  if (entorno === 'test' && rol === 'administracion') continue;
  test(`C6: rechazo entorno=${entorno}/rol=${rol} antes de lectura`, async () => {
    const h = await handler(entorno), r = await h.exports.GET(req(rol));
    assert.equal(r.status, 403); assert.deepEqual(h.llamadas, []);
  });
}
test('C6: GET autorizado, sin precios SKU/costo, no-store y apertura omitida', async () => {
  const h = await handler(), r = await h.exports.GET(req()), b = await r.json();
  assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(h.llamadas, ['familias', 'skus']); assert.equal(b.data.catalogo[0].stock_agregado_interno, 11);
  assert.equal(b.data.solo_lectura, true); assert.equal(b.data.modelo, 'SHADOW_C6');
  assert.equal(b.data.faltantes.length, 1); assert.equal(b.data.faltantes[0].producto_id, 'PROD-COMERCIAL');
  for (const s of b.data.skus) { assert.equal('precio_costo' in s, false); assert.equal('precio_venta' in s, false); }
  assert.equal('marca_publica' in b.data.catalogo[0].oferta, false);
});
test('C6: apertura lee habilitación; contexto inválido rechazo sin backend', async () => {
  const h = await handler(), r = await h.exports.GET(req('administracion', '?apertura_id=APE-20991231'));
  assert.equal((await r.json()).data.catalogo[0].stock_agregado_interno, 41); assert.equal(h.llamadas[2], 'APE-20991231');
  const bad = await handler(); assert.equal((await bad.exports.GET(req('administracion', '?apertura_id=otra'))).status, 400); assert.deepEqual(bad.llamadas, []);
});
test('C6: lectura fallida no devuelve catálogo parcialmente obtenido', async () => {
  const h = await handler('test', true), r = await h.exports.GET(req());
  assert.equal(r.status, 502); assert.equal('data' in await r.json(), false);
});
test('C6: API no implementa mutaciones; UI dry-run no llama guardar', async () => {
  const h = await handler(); for (const v of ['POST', 'PATCH', 'PUT', 'DELETE']) assert.equal(v in h.exports, false);
  const ui = await readFile(new URL('../src/components/admin/FamiliasSimulador.tsx', import.meta.url), 'utf8');
  assert.ok(ui.includes('/api/admin/familias/shadow')); assert.ok(ui.includes('validarMapaPropuesto('));
  assert.doesNotMatch(ui, /method:\s*['"](?:POST|PATCH|PUT|DELETE)|idempotency|guardarFamilia|actualizarProducto/);
  const page = await readFile(new URL('../src/app/admin/familias/simulador/page.tsx', import.meta.url), 'utf8');
  assert.ok(page.includes("!== 'test') notFound()"));
});
