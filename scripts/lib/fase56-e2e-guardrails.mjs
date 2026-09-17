const CONTRATO_BACKEND_TEST = 'fase56_e2e_test_v1';
const DESTINO_BACKEND_TEST = 'backend_test_verificado';
const NOMBRE_SHEET_BACKEND_TEST = 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES';
const CONFIRMACION_ESCRITURAS = 'HABILITAR_ESCRITURAS_TEST';
const FIXTURES_TEST_DEFAULT = {
  E2E_FASE56_APERTURA_ID: 'APE-20260919',
  E2E_FASE56_PRODUCTO_UNIDAD_ID: 'PROD-001',
  E2E_FASE56_PRODUCTO_DECIMAL_ID: 'PROD-TEST-DECIMAL',
};
const CAMPOS_FUNCIONALES_APERTURA = [
  'apertura_id',
  'fecha_apertura',
  'hora_inicio',
  'hora_termino',
  'lugar',
  'cierre_pedidos_anticipados',
  'estado_apertura',
  'pedidos_anticipados_estado',
  'modo_presencial_estado',
  'mensaje_publico',
  'observaciones_internas',
];

const CLAVES_TEST_COMUNES = [
  'GOOGLE_SCRIPT_PEDIDOS_URL_TEST',
  'GOOGLE_SCRIPT_ADMIN_TOKEN_TEST',
  'E2E_FASE56_APERTURA_ID',
  'E2E_FASE56_PRODUCTO_DECIMAL_ID',
];

function valor(config, clave) {
  return typeof config[clave] === 'string' ? config[clave] : '';
}

function valorConFixtureDefault(config, clave) {
  const configurado = valor(config, clave).trim();
  return configurado || FIXTURES_TEST_DEFAULT[clave] || '';
}

function urlAppsScriptValida(valorUrl) {
  try {
    const url = new URL(valorUrl);
    return valorUrl === valorUrl.trim() &&
      url.protocol === 'https:' &&
      url.hostname === 'script.google.com' &&
      /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) &&
      url.username === '' &&
      url.password === '' &&
      url.search === '' &&
      url.hash === '';
  } catch {
    return false;
  }
}

function idTestValido(id) {
  return /^[A-Za-z0-9_-]{3,100}$/.test(id);
}

export function validarConfiguracionE2E(
  config,
  { escritura = false, soloIdempotencia = false } = {}
) {
  const errores = [];

  if (valor(config, 'NEXT_PUBLIC_APP_ENV') !== 'test') {
    errores.push('NEXT_PUBLIC_APP_ENV debe ser exactamente "test".');
  }

  const clavesRequeridas = soloIdempotencia
    ? CLAVES_TEST_COMUNES
    : [...CLAVES_TEST_COMUNES, 'E2E_FASE56_PRODUCTO_UNIDAD_ID'];
  const faltantes = clavesRequeridas.filter((clave) => valorConFixtureDefault(config, clave) === '');
  if (faltantes.length > 0) {
    errores.push(`Falta configuración TEST: ${faltantes.join(', ')}.`);
  }

  const urlTest = valor(config, 'GOOGLE_SCRIPT_PEDIDOS_URL_TEST');
  const tokenTest = valor(config, 'GOOGLE_SCRIPT_ADMIN_TOKEN_TEST');
  const urlProduccion = valor(config, 'GOOGLE_SCRIPT_PEDIDOS_URL');
  const tokenProduccion = valor(config, 'GOOGLE_SCRIPT_ADMIN_TOKEN');

  if (urlTest && !urlAppsScriptValida(urlTest)) {
    errores.push('GOOGLE_SCRIPT_PEDIDOS_URL_TEST no tiene el formato HTTPS esperado de Apps Script.');
  }
  if (tokenTest && tokenTest.trim().length < 8) {
    errores.push('GOOGLE_SCRIPT_ADMIN_TOKEN_TEST no cumple el mínimo de configuración.');
  }
  if (tokenTest && tokenTest !== tokenTest.trim()) {
    errores.push('GOOGLE_SCRIPT_ADMIN_TOKEN_TEST contiene espacios externos no permitidos.');
  }
  if (urlProduccion && urlTest && urlProduccion.trim() === urlTest.trim()) {
    errores.push('La URL TEST coincide con la variable productiva.');
  }
  if (tokenProduccion && tokenTest && tokenProduccion === tokenTest) {
    errores.push('El token TEST coincide con la variable productiva.');
  }

  const aperturaId = valorConFixtureDefault(config, 'E2E_FASE56_APERTURA_ID');
  const productoUnidadId = valorConFixtureDefault(config, 'E2E_FASE56_PRODUCTO_UNIDAD_ID');
  const productoDecimalId = valorConFixtureDefault(config, 'E2E_FASE56_PRODUCTO_DECIMAL_ID');
  if (aperturaId && !/^APE-\d{8}$/.test(aperturaId)) {
    errores.push('E2E_FASE56_APERTURA_ID no tiene formato APE-yyyyMMdd.');
  }
  if (productoUnidadId && !idTestValido(productoUnidadId)) {
    errores.push('E2E_FASE56_PRODUCTO_UNIDAD_ID no es válido.');
  }
  if (productoDecimalId && !idTestValido(productoDecimalId)) {
    errores.push('E2E_FASE56_PRODUCTO_DECIMAL_ID no es válido.');
  }
  if (productoUnidadId && productoUnidadId === productoDecimalId) {
    errores.push('Los productos de unidad y decimal deben ser distintos.');
  }
  if (aperturaId !== FIXTURES_TEST_DEFAULT.E2E_FASE56_APERTURA_ID) {
    errores.push('La apertura E2E debe ser exactamente el fixture TEST autorizado.');
  }
  if (productoUnidadId !== FIXTURES_TEST_DEFAULT.E2E_FASE56_PRODUCTO_UNIDAD_ID) {
    errores.push('El producto por unidad debe ser exactamente el fixture TEST autorizado.');
  }
  if (productoDecimalId !== FIXTURES_TEST_DEFAULT.E2E_FASE56_PRODUCTO_DECIMAL_ID) {
    errores.push('El producto decimal debe ser exactamente el fixture TEST autorizado.');
  }

  if (escritura && valor(config, 'E2E_FASE56_ENABLE_WRITES') !== CONFIRMACION_ESCRITURAS) {
    errores.push('Las escrituras E2E TEST no fueron habilitadas explícitamente.');
  }

  if (errores.length > 0) return { ok: false, errores };

  return {
    ok: true,
    config: {
      urlTest,
      tokenTest,
      aperturaId,
      productoUnidadId,
      productoDecimalId,
    },
  };
}

export function validarConfirmacionBackendTest(data) {
  return Boolean(
    data &&
    data.entorno === 'TEST' &&
    data.destino === DESTINO_BACKEND_TEST &&
    data.contrato === CONTRATO_BACKEND_TEST &&
    data.sheet_nombre === NOMBRE_SHEET_BACKEND_TEST
  );
}

export function crearIdentificadoresE2E(uuid) {
  const sufijo = String(uuid ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 24);
  if (sufijo.length < 12) throw new Error('No se pudo generar un identificador E2E seguro.');
  return {
    ejecucion: `E2E-TEST-F56-${sufijo}`,
    idempotenciaUnidad: `e2e_test_unidad_${sufijo}`,
    idempotenciaDecimal: `e2e_test_decimal_${sufijo}`,
    idempotenciaPrincipal: `e2e_test_idem_${sufijo}`,
    idempotenciaRestauracion: `e2e_test_restore_${sufijo}`,
  };
}

export function prepararRestauracionAperturaTest(apertura) {
  if (!apertura || apertura.apertura_id !== FIXTURES_TEST_DEFAULT.E2E_FASE56_APERTURA_ID) {
    throw new Error('Solo se puede restaurar la apertura TEST autorizada.');
  }
  for (const campo of CAMPOS_FUNCIONALES_APERTURA) {
    if (!Object.hasOwn(apertura, campo)) {
      throw new Error(`Falta el campo persistente ${campo} para restaurar sin pérdida.`);
    }
  }
  const actualizadoEnEsperado = valor(apertura, 'actualizado_en');
  if (!actualizadoEnEsperado) {
    throw new Error('Falta actualizado_en para la restauración optimista TEST.');
  }
  const restaurada = Object.fromEntries(
    CAMPOS_FUNCIONALES_APERTURA.map((campo) => [campo, apertura[campo]])
  );
  restaurada.fecha_apertura = '2026-09-19';
  restaurada.hora_inicio = '11:00';
  restaurada.hora_termino = '15:00';
  restaurada.cierre_pedidos_anticipados = normalizarCierreApertura(
    restaurada.cierre_pedidos_anticipados
  );
  return { apertura: restaurada, actualizadoEnEsperado };
}

export function normalizarCampoAperturaE2E(campo, valorCampo) {
  const texto = String(valorCampo ?? '');
  if (campo === 'fecha_apertura') {
    const fecha = /^(\d{4}-\d{2}-\d{2})(?:T00:00:00(?:\.000)?)?$/.exec(texto);
    return fecha ? fecha[1] : valorCampo;
  }
  if (campo === 'hora_inicio' || campo === 'hora_termino') {
    const hora = /^(?:\d{4}-\d{2}-\d{2}T)?((?:[01]\d|2[0-3]):[0-5]\d)(?::00(?:\.000)?)?$/.exec(texto);
    return hora ? hora[1] : valorCampo;
  }
  if (campo === 'cierre_pedidos_anticipados') return normalizarCierreApertura(valorCampo);
  return valorCampo;
}

function normalizarCierreApertura(valorCierre) {
  const texto = String(valorCierre ?? '');
  const match = /^(\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d)(?::00(?:\.000)?)?$/.exec(texto);
  return match ? match[1] : valorCierre;
}

export function mensajeSeguroE2E(error, sensibles = []) {
  if (!(error instanceof Error)) return 'error no identificado.';
  let mensaje = String(error.message || 'error no identificado.');
  for (const sensible of sensibles) {
    if (typeof sensible === 'string' && sensible.length >= 4) {
      mensaje = mensaje.split(sensible).join('[OCULTO]');
    }
  }
  return mensaje
    .replace(/https?:\/\/\S+/gi, '[URL OCULTA]')
    .replace(/token=[^\s&]+/gi, 'token=[OCULTO]')
    .replace(/(authorization\s*:\s*bearer\s+)[^\s]+/gi, '$1[OCULTO]');
}

function tipoContenidoSeguro(contentType) {
  const tipo = String(contentType ?? '').split(';', 1)[0].trim().toLowerCase();
  return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(tipo)
    ? tipo
    : 'no-informado';
}

function clasificarDestinoRespuesta(urlRespuesta) {
  try {
    const host = new URL(String(urlRespuesta ?? '')).hostname.toLowerCase();
    if (host === 'script.google.com') return 'script.google.com';
    if (host === 'script.googleusercontent.com' || host.endsWith('.googleusercontent.com')) {
      return 'googleusercontent';
    }
    return 'otro-destino';
  } catch {
    return 'destino-no-informado';
  }
}

export function clasificarCuerpoNoJson(cuerpo, contentType) {
  const texto = String(cuerpo ?? '').trim();
  const tipo = tipoContenidoSeguro(contentType);
  if (!texto) return 'vacio';
  if (tipo === 'text/html' || /^<!doctype\s+html|^<html[\s>]/i.test(texto)) return 'html';
  if (tipo.includes('json') || texto.startsWith('{') || texto.startsWith('[')) {
    return 'json-invalido';
  }
  return 'texto';
}

/**
 * Construye un diagnóstico acotado. Nunca incorpora el cuerpo, la URL final,
 * headers completos ni datos enviados al backend.
 */
export function crearErrorRespuestaNoJsonE2E({
  operacion,
  httpStatus,
  contentType,
  redirected,
  responseUrl,
  cuerpo,
}) {
  const status = Number.isInteger(httpStatus) ? httpStatus : 0;
  const tipoCuerpo = clasificarCuerpoNoJson(cuerpo, contentType);
  const destino = clasificarDestinoRespuesta(responseUrl);
  const error = new Error(
    `El backend TEST devolvió una respuesta no JSON en ${operacion}: ` +
      `HTTP ${status || 'desconocido'}; content-type=${tipoContenidoSeguro(contentType)}; ` +
      `cuerpo=${tipoCuerpo}; ` +
      `redirección=${redirected ? 'SI' : 'NO'}; ` +
      `destino=${destino}. El cuerpo fue omitido.`
  );
  error.tipoE2E = 'respuesta_no_json';
  error.httpStatus = status;
  error.tipoCuerpoE2E = tipoCuerpo;
  error.destinoE2E = destino;
  error.redireccionE2E = Boolean(redirected);
  return error;
}

export function crearErrorRedireccionPostAGetE2E({
  operacion,
  httpStatus,
  redirected,
  responseUrl,
}) {
  const error = new Error(
    `La infraestructura TEST convirtió ${operacion} en un GET sin acción: ` +
    `HTTP ${Number(httpStatus) || 0}; redirección=${redirected ? 'SI' : 'NO'}; ` +
    `destino=${clasificarDestinoRespuesta(responseUrl)}.`
  );
  error.tipoE2E = 'redireccion_post_a_get';
  error.httpStatus = Number(httpStatus) || 0;
  error.redireccionE2E = Boolean(redirected);
  error.destinoE2E = clasificarDestinoRespuesta(responseUrl);
  return error;
}

/** Los GET son read-only: permite una única repetición en infraestructura transitoria. */
export function esFalloTransitorioLectura(error) {
  if (!(error instanceof Error)) return false;
  if (error.tipoE2E === 'timeout' || error.tipoE2E === 'red') return true;
  if (error.tipoE2E === 'respuesta_no_json') {
    const statusTransitorio = error.httpStatus === 408 || error.httpStatus === 425 ||
      error.httpStatus === 429 || error.httpStatus >= 500;
    const htmlTransitorioGoogle = error.tipoCuerpoE2E === 'html' &&
      error.destinoE2E === 'googleusercontent' &&
      (error.redireccionE2E === true || error.httpStatus === 404);
    return statusTransitorio || htmlTransitorioGoogle;
  }
  const codigoLogico = Number(error.codigo || 0);
  return error.tipoE2E === 'backend_logico' &&
    (error.httpStatus === 429 || error.httpStatus >= 500 ||
      codigoLogico === 429 || codigoLogico >= 500);
}

/** Solo se usa cuando el llamador repetirá el mismo cuerpo + idempotency_key. */
export function esFalloTransitorioIdempotente(error) {
  if (!(error instanceof Error)) return false;
  if (error.tipoE2E === 'timeout' || error.tipoE2E === 'red') return true;
  if (error.tipoE2E === 'redireccion_post_a_get') {
    return error.redireccionE2E === true && error.destinoE2E === 'googleusercontent';
  }
  if (error.tipoE2E === 'respuesta_no_json') {
    const htmlTrasRedirectGoogle = error.tipoCuerpoE2E === 'html' &&
      error.redireccionE2E === true && error.destinoE2E === 'googleusercontent';
    return error.httpStatus === 200 || error.httpStatus === 408 ||
      error.httpStatus === 425 || error.httpStatus === 429 || error.httpStatus >= 500 ||
      htmlTrasRedirectGoogle;
  }
  const codigoLogico = Number(error.codigo || 0);
  return error.tipoE2E === 'backend_logico' &&
    (error.httpStatus === 429 || error.httpStatus >= 500 ||
      codigoLogico === 429 || codigoLogico >= 500);
}

export const CONTRATO_E2E_TEST = CONTRATO_BACKEND_TEST;
export const CONFIRMACION_ESCRITURAS_TEST = CONFIRMACION_ESCRITURAS;
export const FIXTURES_E2E_TEST_DEFAULT = FIXTURES_TEST_DEFAULT;
export const CAMPOS_APERTURA_E2E = CAMPOS_FUNCIONALES_APERTURA;
