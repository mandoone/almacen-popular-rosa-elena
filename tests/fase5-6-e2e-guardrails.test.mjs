import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  CONFIRMACION_ESCRITURAS_TEST,
  clasificarCuerpoNoJson,
  crearErrorRedireccionPostAGetE2E,
  crearErrorRespuestaNoJsonE2E,
  crearIdentificadoresE2E,
  esFalloTransitorioIdempotente,
  esFalloTransitorioLectura,
  mensajeSeguroE2E,
  normalizarCampoAperturaE2E,
  prepararRestauracionAperturaTest,
  validarConfiguracionE2E,
  validarConfirmacionBackendTest,
} from '../scripts/lib/fase56-e2e-guardrails.mjs';

const base = {
  NEXT_PUBLIC_APP_ENV: 'test',
  GOOGLE_SCRIPT_PEDIDOS_URL_TEST: 'https://script.google.com/macros/s/TEST_DEPLOYMENT/exec',
  GOOGLE_SCRIPT_ADMIN_TOKEN_TEST: 'token-test-ficticio',
  E2E_FASE56_APERTURA_ID: 'APE-20260919',
  E2E_FASE56_PRODUCTO_UNIDAD_ID: 'PROD-001',
  E2E_FASE56_PRODUCTO_DECIMAL_ID: 'PROD-TEST-DECIMAL',
  E2E_FASE56_ENABLE_WRITES: CONFIRMACION_ESCRITURAS_TEST,
};

test('E2E Fase 5/6: acepta solo configuración TEST completa y confirmada', () => {
  const resultado = validarConfiguracionE2E(base, { escritura: true });
  assert.equal(resultado.ok, true);
  assert.equal(resultado.config.aperturaId, 'APE-20260919');
});

test('E2E Fase 5/6: usa los fixtures TEST fijados cuando no hay overrides', () => {
  const resultado = validarConfiguracionE2E(
    {
      ...base,
      E2E_FASE56_APERTURA_ID: '',
      E2E_FASE56_PRODUCTO_UNIDAD_ID: '',
      E2E_FASE56_PRODUCTO_DECIMAL_ID: '',
    },
    { escritura: true }
  );
  assert.equal(resultado.ok, true);
  assert.equal(resultado.config.aperturaId, 'APE-20260919');
  assert.equal(resultado.config.productoUnidadId, 'PROD-001');
  assert.equal(resultado.config.productoDecimalId, 'PROD-TEST-DECIMAL');
});

test('E2E Fase 5/6: bloquea cualquier entorno que no sea exactamente test', () => {
  for (const entorno of ['TEST', ' test ', 'production', 'local', '', undefined]) {
    const resultado = validarConfiguracionE2E(
      { ...base, NEXT_PUBLIC_APP_ENV: entorno },
      { escritura: true }
    );
    assert.equal(resultado.ok, false);
    assert.match(resultado.errores.join(' '), /exactamente "test"/);
  }
});

test('E2E Fase 5/6: bloquea configuración TEST ausente y no usa fallback productivo', () => {
  const resultado = validarConfiguracionE2E({
    ...base,
    GOOGLE_SCRIPT_PEDIDOS_URL_TEST: '',
    GOOGLE_SCRIPT_ADMIN_TOKEN_TEST: '',
    GOOGLE_SCRIPT_PEDIDOS_URL: 'https://script.google.com/macros/s/PROD/exec',
    GOOGLE_SCRIPT_ADMIN_TOKEN: 'token-productivo-ficticio',
  }, { escritura: true });
  assert.equal(resultado.ok, false);
  assert.match(resultado.errores.join(' '), /Falta configuración TEST/);
});

test('E2E Fase 5/6: bloquea URL o token TEST iguales a producción', () => {
  const resultado = validarConfiguracionE2E({
    ...base,
    GOOGLE_SCRIPT_PEDIDOS_URL: base.GOOGLE_SCRIPT_PEDIDOS_URL_TEST,
    GOOGLE_SCRIPT_ADMIN_TOKEN: base.GOOGLE_SCRIPT_ADMIN_TOKEN_TEST,
  }, { escritura: true });
  assert.equal(resultado.ok, false);
  assert.match(resultado.errores.join(' '), /URL TEST coincide/);
  assert.match(resultado.errores.join(' '), /token TEST coincide/);
});

test('E2E Fase 5/6: rechaza espacios externos y URLs no canónicas', () => {
  const resultado = validarConfiguracionE2E({
    ...base,
    GOOGLE_SCRIPT_PEDIDOS_URL_TEST: ` ${base.GOOGLE_SCRIPT_PEDIDOS_URL_TEST}`,
    GOOGLE_SCRIPT_ADMIN_TOKEN_TEST: ` ${base.GOOGLE_SCRIPT_ADMIN_TOKEN_TEST}`,
  }, { escritura: false });
  assert.equal(resultado.ok, false);
  assert.match(resultado.errores.join(' '), /formato HTTPS esperado/);
  assert.match(resultado.errores.join(' '), /espacios externos/);
});

test('E2E Fase 5/6: preflight puede ser de solo lectura pero escritura exige confirmación', () => {
  const sinConfirmacion = { ...base, E2E_FASE56_ENABLE_WRITES: '' };
  assert.equal(validarConfiguracionE2E(sinConfirmacion, { escritura: false }).ok, true);
  const escritura = validarConfiguracionE2E(sinConfirmacion, { escritura: true });
  assert.equal(escritura.ok, false);
  assert.match(escritura.errores.join(' '), /no fueron habilitadas/);
});

test('E2E Fase 5/6: bloquea overrides distintos de los fixtures TEST autorizados', () => {
  const resultado = validarConfiguracionE2E({
    ...base,
    E2E_FASE56_APERTURA_ID: 'APE-20260920',
    E2E_FASE56_PRODUCTO_UNIDAD_ID: 'PROD-OTRO',
    E2E_FASE56_PRODUCTO_DECIMAL_ID: 'PROD-DECIMAL-OTRO',
  }, { escritura: true });
  assert.equal(resultado.ok, false);
  assert.match(resultado.errores.join(' '), /apertura E2E debe ser exactamente/);
  assert.match(resultado.errores.join(' '), /producto por unidad debe ser exactamente/);
  assert.match(resultado.errores.join(' '), /producto decimal debe ser exactamente/);
});

test('E2E Fase 5/6: exige confirmación inequívoca del backend TEST', () => {
  assert.equal(validarConfirmacionBackendTest({
    entorno: 'TEST',
    destino: 'backend_test_verificado',
    contrato: 'fase56_e2e_test_v1',
    sheet_nombre: 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES',
  }), true);
  assert.equal(validarConfirmacionBackendTest({
    entorno: 'TEST',
    destino: 'backend_sin_verificar',
    contrato: 'fase56_e2e_test_v1',
    sheet_nombre: 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES',
  }), false);
  assert.equal(validarConfirmacionBackendTest({
    entorno: 'TEST',
    destino: 'backend_test_verificado',
    contrato: 'fase56_e2e_test_v1',
    sheet_nombre: 'BD_WEB_ALMACEN_ROSA_ELENA_MORALES',
  }), false);
  assert.equal(validarConfirmacionBackendTest(null), false);
});

test('E2E Fase 5/6: genera marcadores e idempotency keys claramente TEST', () => {
  const ids = crearIdentificadoresE2E('12345678-1234-1234-1234-123456789abc');
  assert.match(ids.ejecucion, /^E2E-TEST-F56-/);
  assert.match(ids.idempotenciaPrincipal, /^e2e_test_idem_/);
  assert.match(ids.idempotenciaRestauracion, /^e2e_test_restore_/);
  assert.notEqual(ids.idempotenciaUnidad, ids.idempotenciaDecimal);
});

test('E2E Fase 5/6: restaura solo fecha y horario preservando la apertura TEST', () => {
  const original = {
    apertura_id: 'APE-20260919',
    fecha_apertura: '2026-09-13',
    hora_inicio: '00:00',
    hora_termino: '23:59',
    lugar: 'Lugar TEST',
    cierre_pedidos_anticipados: '2026-09-17T23:59:00.000',
    estado_apertura: 'activa',
    pedidos_anticipados_estado: 'activo',
    modo_presencial_estado: 'activo',
    mensaje_publico: 'Mensaje TEST',
    observaciones_internas: 'Observación TEST',
    creada_por: 'persona-original',
    actualizada_por: 'persona-temporal',
    creado_en: '2026-01-01T00:00:00.000',
    actualizado_en: '2026-09-13T00:00:00.000',
  };
  const resultado = prepararRestauracionAperturaTest(original);
  assert.equal(resultado.actualizadoEnEsperado, original.actualizado_en);
  assert.deepEqual(resultado.apertura, {
    apertura_id: original.apertura_id,
    fecha_apertura: '2026-09-19',
    hora_inicio: '11:00',
    hora_termino: '15:00',
    lugar: original.lugar,
    cierre_pedidos_anticipados: '2026-09-17T23:59',
    estado_apertura: original.estado_apertura,
    pedidos_anticipados_estado: original.pedidos_anticipados_estado,
    modo_presencial_estado: original.modo_presencial_estado,
    mensaje_publico: original.mensaje_publico,
    observaciones_internas: original.observaciones_internas,
  });
  assert.throws(
    () => prepararRestauracionAperturaTest({ ...original, apertura_id: 'APE-20260920' }),
    /Solo se puede restaurar/
  );
});

test('E2E Fase 5/6: compara fechas y horas de Sheets por su valor de negocio', () => {
  assert.equal(
    normalizarCampoAperturaE2E('fecha_apertura', '2026-09-19T00:00:00.000'),
    '2026-09-19'
  );
  assert.equal(
    normalizarCampoAperturaE2E('hora_inicio', '1899-12-30T11:00:00.000'),
    '11:00'
  );
  assert.equal(
    normalizarCampoAperturaE2E('hora_termino', '1899-12-30T15:00:00.000'),
    '15:00'
  );
  assert.equal(
    normalizarCampoAperturaE2E('cierre_pedidos_anticipados', '2026-09-17T23:59:00.000'),
    '2026-09-17T23:59'
  );
  assert.equal(normalizarCampoAperturaE2E('estado_apertura', 'activa'), 'activa');
});

test('E2E Fase 5/6: sanitiza URL, token y cabecera sensible en errores', () => {
  const url = 'https://script.google.com/macros/s/TEST_PRIVADO/exec';
  const token = 'token-test-super-secreto';
  const mensaje = mensajeSeguroE2E(
    new Error(`Falló ${url}?token=${token} Authorization: Bearer ${token}`),
    [url, token]
  );
  assert.doesNotMatch(mensaje, /TEST_PRIVADO|super-secreto/);
  assert.match(mensaje, /\[OCULTO\]|\[URL OCULTA\]/);
});

test('E2E Fase 5/6: diagnostica no-JSON sin revelar cuerpo, URL ni secretos', () => {
  const cuerpo = '<!doctype html><p>token-super-secreto URL-PRIVADA</p>';
  const error = crearErrorRespuestaNoJsonE2E({
    operacion: 'idempotencia: segundo POST, replay idéntico',
    httpStatus: 200,
    contentType: 'text/html; charset=utf-8',
    redirected: true,
    responseUrl: 'https://script.googleusercontent.com/macros/echo?user_content_key=URL-PRIVADA',
    cuerpo,
  });
  assert.match(error.message, /segundo POST/);
  assert.match(error.message, /HTTP 200/);
  assert.match(error.message, /content-type=text\/html/);
  assert.match(error.message, /cuerpo=html/);
  assert.match(error.message, /redirección=SI/);
  assert.match(error.message, /destino=googleusercontent/);
  assert.doesNotMatch(error.message, /token-super-secreto|URL-PRIVADA|user_content_key/);
});

test('E2E Fase 5/6: clasifica cuerpos no JSON sin devolver su contenido', () => {
  assert.equal(clasificarCuerpoNoJson('   ', 'text/plain'), 'vacio');
  assert.equal(clasificarCuerpoNoJson('<html>Error</html>', 'text/plain'), 'html');
  assert.equal(clasificarCuerpoNoJson('{"ok":', 'application/json'), 'json-invalido');
  assert.equal(clasificarCuerpoNoJson('Service unavailable', 'text/plain'), 'texto');
});

test('E2E Fase 5/6: reintenta solo fallos transitorios con operación idempotente', () => {
  const noJson200 = crearErrorRespuestaNoJsonE2E({
    operacion: 'replay', httpStatus: 200, contentType: 'text/html',
    redirected: true, responseUrl: 'https://script.googleusercontent.com/', cuerpo: '<html></html>',
  });
  const noJson404 = crearErrorRespuestaNoJsonE2E({
    operacion: 'replay', httpStatus: 404, contentType: 'text/html',
    redirected: false, responseUrl: 'https://script.google.com/', cuerpo: '<html></html>',
  });
  const noJson404Googleusercontent = crearErrorRespuestaNoJsonE2E({
    operacion: 'replay', httpStatus: 404, contentType: 'text/html',
    redirected: true, responseUrl: 'https://script.googleusercontent.com/', cuerpo: '<html></html>',
  });
  const timeout = Object.assign(new Error('timeout'), { tipoE2E: 'timeout' });
  const conflicto = Object.assign(new Error('conflicto'), {
    tipoE2E: 'backend_logico', httpStatus: 200, codigo: 409,
  });
  const ocupadoLogico = Object.assign(new Error('ocupado'), {
    tipoE2E: 'backend_logico', httpStatus: 200, codigo: 503,
  });
  const postConvertidoAGet = crearErrorRedireccionPostAGetE2E({
    operacion: 'POST crearVentaPresencial',
    httpStatus: 200,
    redirected: true,
    responseUrl: 'https://script.googleusercontent.com/macros/echo?secreto=no-mostrar',
  });
  const postConvertidoSinRedirect = crearErrorRedireccionPostAGetE2E({
    operacion: 'POST crearVentaPresencial',
    httpStatus: 200,
    redirected: false,
    responseUrl: 'https://script.google.com/macros/s/test/exec',
  });
  assert.equal(esFalloTransitorioIdempotente(noJson200), true);
  assert.equal(esFalloTransitorioIdempotente(noJson404), false);
  assert.equal(esFalloTransitorioIdempotente(noJson404Googleusercontent), true);
  assert.equal(esFalloTransitorioIdempotente(timeout), true);
  assert.equal(esFalloTransitorioIdempotente(conflicto), false);
  assert.equal(esFalloTransitorioIdempotente(ocupadoLogico), true);
  assert.equal(esFalloTransitorioLectura(ocupadoLogico), true);
  assert.equal(esFalloTransitorioIdempotente(postConvertidoAGet), true);
  assert.equal(esFalloTransitorioIdempotente(postConvertidoSinRedirect), false);
  assert.doesNotMatch(postConvertidoAGet.message, /secreto=no-mostrar|script\.google/i);
});

test('E2E Fase 5/6: GET reintenta 404 HTML tras redirect a googleusercontent', () => {
  const error = crearErrorRespuestaNoJsonE2E({
    operacion: 'GET obtenerEstadoE2EFase56',
    httpStatus: 404,
    contentType: 'text/html; charset=utf-8',
    redirected: true,
    responseUrl: 'https://script.googleusercontent.com/macros/echo?dato=privado',
    cuerpo: '<html>Not found</html>',
  });
  assert.equal(esFalloTransitorioLectura(error), true);
});

test('E2E Fase 5/6: GET no reintenta un error JSON funcional 400', () => {
  const error = Object.assign(new Error('apertura_id invalida.'), {
    tipoE2E: 'backend_logico',
    httpStatus: 200,
    codigo: 400,
  });
  assert.equal(esFalloTransitorioLectura(error), false);
});

test('E2E Fase 5/6: el runner no lee archivos env ni imprime configuración sensible', async () => {
  const fuente = await readFile(
    new URL('../scripts/e2e-fase56.mjs', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(fuente, /readFile|dotenv|\.env\.local/);
  assert.doesNotMatch(fuente, /console\.(?:log|error)\([^\n]*(?:urlTest|tokenTest|process\.env)/);
  assert.match(fuente, /console\.log\('ENTORNO: TEST'\)/);
  assert.match(fuente, /console\.log\('DESTINO: backend TEST verificado'\)/);
  assert.match(fuente, /console\.log\('ESCRITURAS E2E: habilitadas'\)/);
  assert.doesNotMatch(fuente, /rmSync|unlink|rmdir|deleteRows|git clean|git reset/);
  assert.match(fuente, /if \(!backendTestConfirmado \|\| !escriturasHabilitadas\)/);
  assert.match(fuente, /cliente\.confirmarBackendTest\(verificacion\)/);
  assert.match(fuente, /cliente\.habilitarEscrituras\(\)/);
  assert.match(fuente, /action !== 'verificarDestinoE2EFase56'/);
  assert.match(
    fuente,
    /cliente\.get\('obtenerEstadoE2EFase56',\s*\{\s*apertura_id:\s*aperturaId/
  );
  assert.match(fuente, /cliente\.get\('obtenerApertura', \{ apertura_id: aperturaId \}\)/);
  assert.match(fuente, /aperturaTrasResumenInicial,\s*aperturaInicialCompleta/);
  assert.match(fuente, /aperturaDespuesCaja,\s*aperturaAntesCaja/);
  assert.match(fuente, /esFalloTransitorioLectura\(error\)/);
  assert.match(fuente, /ESPERA_RETRY_TRANSITORIO_MS = 5000/);
  assert.match(fuente, /cache:\s*'no-store'/);
  assert.match(fuente, /searchParams\.set\('_e2e_request_id', randomUUID\(\)\)/);
  assert.match(fuente, /const cuerpoExacto = JSON\.stringify/);
  assert.match(fuente, /JSON\.parse\(cuerpoExacto\)/);
  assert.match(fuente, /Un reintento remoto exige una idempotency_key válida/);
  assert.match(fuente, /intento <= 2/);
  assert.match(fuente, /RETRY \|/);
  assert.match(fuente, /segundo POST, replay idéntico/);
  assert.match(
    fuente,
    /postIdempotenteConReintento\(cliente, body, \{\s*operacion: 'restauración de apertura TEST'/
  );
  assert.match(fuente, /tercer POST, conflicto esperado/);
});

test('E2E idempotencia: el modo aislado retorna antes de las demás escrituras', async () => {
  const fuente = await readFile(
    new URL('../scripts/e2e-fase56.mjs', import.meta.url),
    'utf8'
  );
  const inicioAislado = fuente.indexOf('if (soloIdempotencia) {');
  const retornoAislado = fuente.indexOf('return;', inicioAislado);
  const ventaGeneral = fuente.indexOf('const ventaUnidad = await crearVenta', inicioAislado);
  const pedidoAnticipado = fuente.indexOf('const pedidoVigente = await crearPedidoAnticipado');
  assert.ok(inicioAislado >= 0 && retornoAislado > inicioAislado);
  assert.ok(ventaGeneral > retornoAislado);
  assert.ok(pedidoAnticipado > retornoAislado);

  const packageJson = JSON.parse(await readFile(
    new URL('../package.json', import.meta.url),
    'utf8'
  ));
  assert.equal(
    packageJson.scripts['test:e2e:fase56:idempotencia'],
    'node scripts/e2e-fase56.mjs --idempotencia'
  );
  assert.equal(
    packageJson.scripts['test:e2e:fase56:idempotencia:preflight'],
    'node scripts/e2e-fase56.mjs --preflight-idempotencia'
  );
});

test('E2E Fase 5/6: el proceso falla antes de red sin opt-in y no filtra secretos', async () => {
  const raiz = fileURLToPath(new URL('..', import.meta.url));
  const urlFicticia = 'https://script.google.com/macros/s/TEST_LOCAL_NO_USAR/exec';
  const tokenFicticio = 'token-local-no-mostrar';
  const resultado = await new Promise((resolve, reject) => {
    const hijo = spawn(process.execPath, ['scripts/e2e-fase56.mjs', '--idempotencia'], {
      cwd: raiz,
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        NEXT_PUBLIC_APP_ENV: 'test',
        GOOGLE_SCRIPT_PEDIDOS_URL_TEST: urlFicticia,
        GOOGLE_SCRIPT_ADMIN_TOKEN_TEST: tokenFicticio,
      },
      windowsHide: true,
    });
    let salida = '';
    hijo.stdout.on('data', (chunk) => { salida += chunk; });
    hijo.stderr.on('data', (chunk) => { salida += chunk; });
    hijo.once('error', reject);
    hijo.once('close', (codigo) => resolve({ codigo, salida }));
  });
  assert.equal(resultado.codigo, 1);
  assert.match(resultado.salida, /FAIL \| guardarraíles locales/);
  assert.match(resultado.salida, /SKIP \| preflight TEST/);
  assert.doesNotMatch(resultado.salida, /TEST_LOCAL_NO_USAR|token-local-no-mostrar/);
  assert.doesNotMatch(resultado.salida, /DESTINO: backend TEST verificado/);
});
