import {
  auditarCatalogo,
  resumirHallazgosCatalogo,
} from '../src/lib/fase4/auditoriaCatalogo.ts';
import {
  diagnosticarRespuestaNoJson,
  mensajeRespuestaNoJsonSeguro,
} from '../src/lib/appsScriptRespuesta.ts';
import { validarConfiguracionE2E, validarConfirmacionBackendTest } from './lib/fase56-e2e-guardrails.mjs';

const config = validarConfiguracionE2E(process.env, { requiereEscritura: false });
const TIMEOUT_GET_MS = 30_000;
if (!config.ok) {
  console.error(`FAIL | auditoría catálogo TEST: ${config.errores.join(' ')}`);
  process.exit(1);
}

async function getJson(action, params = {}) {
  let ultimoError;
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const url = new URL(config.config.urlTest);
      url.searchParams.set('action', action);
      url.searchParams.set('_audit_request_id', crypto.randomUUID());
      Object.entries(params).forEach(([clave, valor]) => url.searchParams.set(clave, valor));
      const respuesta = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_GET_MS),
      });
      const texto = await respuesta.text();
      let json;
      try { json = JSON.parse(texto); }
      catch {
        const diagnostico = diagnosticarRespuestaNoJson({
          httpStatus: respuesta.status,
          contentType: respuesta.headers.get('content-type'),
          redirected: respuesta.redirected,
          responseUrl: respuesta.url,
          cuerpo: texto,
        });
        const error = new Error(mensajeRespuestaNoJsonSeguro(`GET ${action}`, diagnostico));
        error.reintentable = diagnostico.transitorioLectura;
        throw error;
      }
      if (!json.ok) {
        const codigo = Number(json.codigo || respuesta.status || 502);
        const error = new Error(`Error funcional ${codigo} en GET ${action}.`);
        error.reintentable = codigo === 429 || codigo >= 500;
        throw error;
      }
      return json.data;
    } catch (error) {
      const reintentable = error instanceof TypeError ||
        error?.name === 'TimeoutError' || error?.reintentable === true;
      ultimoError = error?.name === 'TimeoutError'
        ? new Error(`Tiempo de espera agotado en GET ${action}.`)
        : error;
      if (!reintentable || intento === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }
  const detalle = ultimoError instanceof Error && ultimoError.message.trim()
    ? ultimoError.message
    : 'Fallo de red TEST.';
  throw new Error(detalle);
}

try {
  console.log('PASO: verificar destino TEST');
  const destino = await getJson('verificarDestinoE2EFase56', {
    token: config.config.tokenTest,
  });
  if (!validarConfirmacionBackendTest(destino)) {
    throw new Error('Contrato TEST no confirmado.');
  }

  console.log('PASO: leer catálogo publicado TEST');
  const data = await getJson('listarProductos');
  const resultado = auditarCatalogo(Array.isArray(data.productos) ? data.productos : []);
  console.log('ENTORNO: TEST');
  console.log('DESTINO: backend TEST verificado');
  console.log(`PRODUCTOS PUBLICADOS: ${resultado.productos}`);
  console.log(`ERRORES OBJETIVOS: ${resultado.errores}`);
  console.log(`ADVERTENCIAS: ${resultado.advertencias}`);
  console.log(`DECISIONES HUMANAS: ${resultado.decisiones_humanas}`);
  for (const item of resumirHallazgosCatalogo(resultado.hallazgos)) {
    console.log(`${item.tipo} | ${item.codigo} | afectados=${item.cantidad}`);
  }
  if (resultado.errores > 0) process.exitCode = 2;
} catch (error) {
  const detalle = error instanceof Error && error.message.trim()
    ? error.message
    : 'Error inesperado.';
  console.error(`FAIL | auditoría catálogo TEST: ${detalle}`);
  process.exitCode = 1;
}
