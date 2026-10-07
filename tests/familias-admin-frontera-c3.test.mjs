/** Handlers reales con transportes en memoria: nunca se consulta ni escribe TEST. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { obtenerEntornoAplicacion } from '../src/lib/env.ts';
import { actorIdFromRequest, sesionTieneCapacidad } from '../src/lib/session.ts';
import { dtoFamiliaAdmin, dtoIdentidadSkuAdmin } from '../src/lib/familiasAdmin.ts';

async function handler(identidad = false, entorno = 'test') {
  const path = `../src/app/api/admin/familias/${identidad ? 'identidad/' : ''}route.ts`;
  const fuente = await readFile(new URL(path, import.meta.url), 'utf8'), llamadas = [], exports = {};
  const backend = Object.fromEntries(['listarFamiliasProductoAdmin', 'obtenerFamiliaProductoAdmin', 'guardarFamiliaProductoAdmin', 'auditarMapaFamiliasSkuAdmin', 'actualizarProductoAdmin'].map(n => [n, async (...args) => { llamadas.push({ n, args }); return { familias: [] }; }]));
  const mocks = {
    'next/server': { NextResponse: { json: (v, o) => Response.json(v, o) } },
    '@/lib/appsScriptPedidos': backend, '@/lib/session': { actorIdFromRequest, sesionTieneCapacidad },
    '@/lib/env': { obtenerEntornoAplicacion }, '@/lib/familiasAdmin': { dtoFamiliaAdmin, dtoIdentidadSkuAdmin },
    '@/lib/fase8/apiAdmin': { idempotencyKeyValida: x => typeof x === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(x), respuestaErrorAdmin: () => Response.json({ ok: false }, { status: 500 }) },
  };
  vm.runInNewContext(ts.transpileModule(fuente, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, URL, process: { env: { NEXT_PUBLIC_APP_ENV: entorno } }, require: n => mocks[n] ?? assert.fail(n) });
  return { exports, llamadas };
}
function request(method, rol, body) {
  return new Request('http://local/api/admin/familias', { method, headers: { 'x-almacen-session-role': rol, 'x-almacen-session-actor': 'admin-qa' }, ...(method !== 'GET' ? { body: JSON.stringify(body ?? { rol: 'administracion', actor: 'falso', idempotency_key: 'qa_123456789' }) } : {}) });
}
for (const entorno of ['production', undefined, 'test']) for (const rol of ['venta', 'operacion', 'administracion']) {
  if (entorno === 'test' && rol === 'administracion') continue;
  test(`C3: APIs familias bloquean entorno=${entorno}/rol=${rol} antes de backend`, async () => {
    // undefined se conserva explícitamente: no usa el default del helper.
    const e = entorno === undefined ? '' : entorno;
    for (const [identidad, method] of [[false, 'GET'], [false, 'POST'], [false, 'PATCH'], [true, 'PATCH']]) {
      const h = await handler(identidad, e); assert.equal((await h.exports[method](request(method, rol))).status, 403); assert.equal(h.llamadas.length, 0);
    }
  });
}
test('C3: actor y rol del navegador no llegan al backend; precio/stock no entran por identidad', async () => {
  const f = await handler();
  const r = await f.exports.POST(request('POST', 'administracion', { idempotency_key: 'qa_123456789', actor: 'falso', responsable: 'falso', rol: 'venta', familia: { familia_id: 'FAM-QA' } }));
  assert.equal(r.status, 201); assert.equal(f.llamadas[0].args[1], 'admin-qa');
  assert.equal('actor' in f.llamadas[0].args[0], false); assert.equal('responsable' in f.llamadas[0].args[0], false);
  const h = await handler(true);
  for (const campo of ['stock_actual', 'precio_venta', 'precio_costo', 'marca_snapshot']) assert.equal((await h.exports.PATCH(request('PATCH', 'administracion', { producto_id: 'PROD-QA', cambios: { [campo]: 1 }, idempotency_key: 'qa_123456789' }))).status, 400);
  assert.equal(h.llamadas.length, 0);
  assert.equal((await h.exports.PATCH(request('PATCH', 'administracion', { producto_id: 'PROD-QA', cambios: { familia_id: '', marca: 'QA' }, idempotency_key: 'qa_123456789', actor: 'falso' }))).status, 200);
  assert.equal(h.llamadas[0].args[1], 'admin-qa');
});
test('C3: familia no acepta versiones/timestamp/costo/stock del cliente', async () => {
  const h = await handler();
  for (const campo of ['version_oferta', 'actualizado_en', 'precio_costo', 'stock_actual', 'proveedor']) assert.equal((await h.exports.POST(request('POST', 'administracion', { familia: { familia_id: 'FAM-QA', [campo]: 1 }, idempotency_key: 'qa_123456789' }))).status, 400);
  assert.equal(h.llamadas.length, 0);
});
