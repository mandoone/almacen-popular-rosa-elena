import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  diagnosticarRespuestaNoJson,
  esCodigoTransitorioAppsScript,
  mensajeRespuestaNoJsonSeguro,
} from '../src/lib/appsScriptRespuesta.ts';

test('Apps Script GET: 404 HTML redirigido a googleusercontent es transitorio', () => {
  const diagnostico = diagnosticarRespuestaNoJson({
    httpStatus: 404,
    contentType: 'text/html; charset=utf-8',
    redirected: true,
    responseUrl: 'https://script.googleusercontent.com/macros/echo?secreto=no-mostrar',
    cuerpo: '<!doctype html><p>token-super-secreto</p>',
  });
  assert.equal(diagnostico.cuerpo, 'html');
  assert.equal(diagnostico.destino, 'googleusercontent');
  assert.equal(diagnostico.transitorioLectura, true);
  const mensaje = mensajeRespuestaNoJsonSeguro('GET listarProductos', diagnostico);
  assert.match(mensaje, /GET listarProductos.+HTTP 404.+cuerpo=html.+redirección=SI/);
  assert.doesNotMatch(mensaje, /secreto=no-mostrar|token-super-secreto|script\.google/i);
});

test('Apps Script GET: 404 HTML sin redirect de Google no se oculta con retry', () => {
  const diagnostico = diagnosticarRespuestaNoJson({
    httpStatus: 404,
    contentType: 'text/html',
    redirected: false,
    responseUrl: 'https://example.invalid/error',
    cuerpo: '<html>Error</html>',
  });
  assert.equal(diagnostico.transitorioLectura, false);
});

test('Apps Script GET: 404 HTML en googleusercontent es transitorio aunque fetch no marque redirect', () => {
  const diagnostico = diagnosticarRespuestaNoJson({
    httpStatus: 404,
    contentType: 'text/html',
    redirected: false,
    responseUrl: 'https://script.googleusercontent.com/macros/echo',
    cuerpo: '<html>Not found</html>',
  });
  assert.equal(diagnostico.destino, 'googleusercontent');
  assert.equal(diagnostico.transitorioLectura, true);
});

test('Apps Script GET: códigos funcionales 4xx no son transitorios', () => {
  assert.equal(esCodigoTransitorioAppsScript(400), false);
  assert.equal(esCodigoTransitorioAppsScript(404), false);
  assert.equal(esCodigoTransitorioAppsScript(409), false);
  assert.equal(esCodigoTransitorioAppsScript(429), true);
  assert.equal(esCodigoTransitorioAppsScript(503), true);
});

test('Apps Script GET: el cliente usa anticaché y como máximo un retry', async () => {
  const fuente = await readFile(
    new URL('../src/lib/appsScriptPedidos.ts', import.meta.url),
    'utf8'
  );
  assert.match(fuente, /const MAX_INTENTOS_GET = 2/);
  assert.match(fuente, /const ESPERA_REINTENTO_GET_MS = 1000/);
  assert.match(fuente, /searchParams\.set\('_request_id', crypto\.randomUUID\(\)\)/);
  assert.match(fuente, /for \(let intento = 1; intento <= MAX_INTENTOS_GET; intento\+\+\)/);
  assert.doesNotMatch(fuente, /console\.(?:log|warn|error)/);
});
