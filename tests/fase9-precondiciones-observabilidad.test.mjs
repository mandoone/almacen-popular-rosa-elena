import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import * as respuesta from '../src/lib/appsScriptRespuesta.ts';
import { ejecutarEtapaPedido, registrarEventoEtapaPedido } from '../src/lib/fase3b/observabilidadPedido.ts';

const fuente = await readFile(new URL('../src/lib/appsScriptPedidos.ts', import.meta.url), 'utf8');
const codigo = ts.transpileModule(fuente, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function respuestaHttp({ status = 200, body = { ok: true, data: {} },
  type = 'application/json', url = 'https://script.google.com/macros/s/TEST/exec',
  redirected = false } = {}) {
  return {
    status, redirected, url,
    headers: { get: () => type },
    text: async () => typeof body === 'string' ? body : JSON.stringify(body),
  };
}

function crearCliente(respuestas) {
  const llamadas = [];
  const registros = [];
  const exports = {};
  const mocks = {
    './env': {
      obtenerEntornoAplicacion: () => 'test',
      resolverConfigPorEntorno: (_env, config) => ({ ok: true, valor: config.valorTest }),
      assertCalendarioSoloTest: () => {},
      assertFase56SoloTest: () => {},
      assertFase78SoloTest: () => {},
    },
    './fase9/dtoAdmin': { payloadAdminFase78: () => ({}) },
    './appsScriptRespuesta': respuesta,
  };
  vm.runInNewContext(codigo, {
    exports,
    require: (nombre) => {
      assert.ok(nombre in mocks, `import inesperado: ${nombre}`);
      return mocks[nombre];
    },
    process: { env: {
      NEXT_PUBLIC_APP_ENV: 'test',
      GOOGLE_SCRIPT_PEDIDOS_URL_TEST: 'https://script.google.com/macros/s/TEST/exec',
      GOOGLE_SCRIPT_ADMIN_TOKEN_TEST: 'TOKEN_PRIVADO',
    } },
    fetch: async (url, init) => {
      llamadas.push({ url, metodo: init.method });
      const siguiente = respuestas.shift();
      if (siguiente instanceof Error) throw siguiente;
      assert.ok(siguiente, 'No debe realizar otra petición');
      return siguiente;
    },
    console: { warn: (texto) => registros.push(JSON.parse(texto)) },
    crypto, URL, setTimeout: (fn) => { fn(); return 0; },
  }, { filename: 'appsScriptPedidos.ts' });
  return { cliente: exports, llamadas, registros };
}

const htmlTransitorio = () => respuestaHttp({
  status: 503, type: 'text/html', redirected: true,
  url: 'https://script.googleusercontent.com/macros/echo?token=SECRET_URL',
  body: '<html>cookie=SECRET_COOKIE telefono=000000000</html>',
});

test('listarAperturas: un GET transitorio se recupera en el segundo intento', async () => {
  const { cliente, llamadas, registros } = crearCliente([
    htmlTransitorio(), respuestaHttp({ body: { ok: true, data: { aperturas: [] } } }),
  ]);
  assert.equal((await cliente.listarAperturas()).length, 0);
  assert.equal(llamadas.length, 2);
  assert.deepEqual(llamadas.map((l) => l.metodo), ['GET', 'GET']);
  assert.equal(registros[0].reintentara, true);
  assert.equal(registros[0].accion, 'listarAperturas');
  assert.doesNotMatch(JSON.stringify(registros), /SECRET_URL|SECRET_COOKIE|TOKEN_PRIVADO|000000000|script\.googleusercontent\.com/);
});

test('listarAperturas: dos fallos transitorios detienen tras dos GET', async () => {
  const { cliente, llamadas, registros } = crearCliente([htmlTransitorio(), htmlTransitorio()]);
  await assert.rejects(cliente.listarAperturas(), (error) => error.status === 502);
  assert.equal(llamadas.length, 2);
  assert.equal(registros[1].reintentara, false);
});

test('GET 403 JSON y error lógico JSON 503 no se reintentan', async () => {
  for (const codigoError of [403, 503]) {
    const { cliente, llamadas, registros } = crearCliente([
      respuestaHttp({ status: codigoError, body: { ok: false, codigo: codigoError, error: 'Fallo lógico' } }),
    ]);
    await assert.rejects(cliente.listarAperturas(), (error) => error.status === codigoError);
    assert.equal(llamadas.length, 1);
    assert.equal(registros[0].reintentara, false);
    assert.equal(registros[0].clasificacion, 'ERROR_JSON_LOGICO');
  }
});

test('capacidad F3B: transitorio se recupera; dos fallos dan 503; contrato inválido falla', async () => {
  const bien = respuestaHttp({ body: { ok: true, data: { pedidos_anticipados_publicos: 'v1' } } });
  const recuperado = crearCliente([htmlTransitorio(), bien]);
  await recuperado.cliente.verificarContratoPedidosAnticipadosTest();
  assert.equal(recuperado.llamadas.length, 2);
  const fallido = crearCliente([htmlTransitorio(), htmlTransitorio()]);
  await assert.rejects(fallido.cliente.verificarContratoPedidosAnticipadosTest(), (e) => e.status === 503);
  assert.equal(fallido.llamadas.length, 2);
  const invalido = crearCliente([respuestaHttp({ body: { ok: true, data: { pedidos_anticipados_publicos: 'v0' } } })]);
  await assert.rejects(invalido.cliente.verificarContratoPedidosAnticipadosTest(), (e) => e.status === 503);
  assert.equal(invalido.llamadas.length, 1);
});

test('etapas: informan fallo exacto, no reintentan mutaciones y sanean logs', async () => {
  const eventos = [];
  let llamadas = 0;
  const error = Object.assign(new Error('TOKEN_PRIVADO cookie=SECRET_COOKIE <html> 000000000'), {
    status: 503,
    diagnostico: { clasificacion: 'RESPUESTA_NO_JSON', httpStatus: 503,
      contentType: 'text/html', redireccion: true, destino: 'googleusercontent',
      url: 'https://script.googleusercontent.com/?token=SECRET_URL' },
  });
  await assert.rejects(ejecutarEtapaPedido('PRECONDICION_CAPACIDAD', async () => {
    llamadas++;
    throw error;
  }, (evento) => eventos.push(evento)));
  assert.equal(llamadas, 1);
  assert.equal(eventos[0].etapa, 'PRECONDICION_CAPACIDAD');
  const logs = [];
  registrarEventoEtapaPedido('traza-test', eventos[0], {
    info: (s) => logs.push(s), error: (s) => logs.push(s),
  });
  assert.equal(JSON.parse(logs[0]).etapa, 'PRECONDICION_CAPACIDAD');
  assert.doesNotMatch(logs[0], /SECRET_URL|SECRET_COOKIE|TOKEN_PRIVADO|000000000|<html>|script\.googleusercontent\.com/);
  let posts = 0;
  await ejecutarEtapaPedido('CREAR_PEDIDO', async () => { posts++; return 'ok'; });
  assert.equal(posts, 1);
});

async function rutaPublica({ fallarPrecondicion = false } = {}) {
  const fuenteRuta = await readFile(new URL('../src/app/api/pedidos/route.ts', import.meta.url), 'utf8');
  const javascript = ts.transpileModule(fuenteRuta, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const llamadas = { precondicion: 0, creacion: 0 };
  class AppsScriptErrorMock extends Error { status = 503; }
  const mocks = {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    '@/lib/appsScriptPedidos': {
      AppsScriptError: AppsScriptErrorMock,
      crearPedido: async () => { llamadas.creacion++; return { id_pedido: 'PED-TEST' }; },
    },
    '@/lib/fase3b/aperturaActivaServer': {
      exigirAperturaActivaParaCrearPedidoTest: async () => {
        llamadas.precondicion++;
        if (fallarPrecondicion) throw new AppsScriptErrorMock('Fallo de lectura');
        return { apertura_id: 'APE-TEST' };
      },
    },
    '@/lib/fase3b/observabilidadPedido': {
      ejecutarEtapaPedido,
      registrarEventoEtapaPedido: () => {},
    },
    '@/lib/fase3b/pedidosAnticipados': { pedidosAnticipadosConCalendarioHabilitados: () => true },
    '@/lib/fase9/idempotenciaCreacionPedido': { idempotencyKeyCreacionValida: () => true },
    '@/lib/fase9/resilienciaPedidos': {
      ejecutarMutacionDurableConReplay: async (accion) => accion(),
    },
  };
  vm.runInNewContext(javascript, {
    exports, crypto, process: { env: { NEXT_PUBLIC_APP_ENV: 'test' } },
    require: (nombre) => mocks[nombre] ?? assert.fail(`import inesperado: ${nombre}`),
  });
  const request = { json: async () => ({ nombre_cliente: 'TEST', telefono: '000000000',
    idempotency_key: 'key-test', carrito: [{ id_producto: 'PROD-TEST', cantidad: 0.1 }] }) };
  return { respuesta: await exports.POST(request), llamadas };
}

test('ruta pública: precondiciones PASS generan exactamente un alta; FAIL no genera ninguna', async () => {
  const bien = await rutaPublica();
  assert.equal(bien.respuesta.status, 200);
  assert.equal(bien.llamadas.precondicion, 1);
  assert.equal(bien.llamadas.creacion, 1);
  const mal = await rutaPublica({ fallarPrecondicion: true });
  assert.equal(mal.respuesta.status, 503);
  assert.equal(mal.llamadas.precondicion, 1);
  assert.equal(mal.llamadas.creacion, 0);
});
