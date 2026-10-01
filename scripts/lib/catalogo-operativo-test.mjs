import { validarConfiguracionE2E, validarConfirmacionBackendTest, mensajeSeguroE2E, crearErrorRespuestaNoJsonE2E, crearErrorRedireccionPostAGetE2E, esFalloTransitorioLectura, esFalloTransitorioIdempotente } from './fase56-e2e-guardrails.mjs';

export function clienteCatalogoTest(env = process.env) {
  if (env.GOOGLE_SCRIPT_PEDIDOS_URL || env.GOOGLE_SCRIPT_ADMIN_TOKEN) throw new Error('Variables productivas presentes. Bloqueado.');
  const validacion = validarConfiguracionE2E(env);
  if (!validacion.ok) throw new Error(validacion.errores.join(' '));
  const { urlTest, tokenTest } = validacion.config;
  async function solicitud(metodo, action, entrada, intento = 1) {
    const url = new URL(urlTest);
    const payload = { ...entrada, action, token: tokenTest };
    if (metodo === 'GET') Object.entries({ ...payload, _catalogo_request_id: crypto.randomUUID() }).forEach(([k,v]) => url.searchParams.set(k,String(v)));
    try {
      const res = await fetch(url, {
        method: metodo, redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(45_000),
        ...(metodo === 'POST' ? { headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) } : {}),
      });
      const texto = await res.text();
      let json;
      try { json = JSON.parse(texto); } catch {
        throw crearErrorRespuestaNoJsonE2E({ operacion: action, httpStatus: res.status,
          contentType: res.headers.get('content-type'), redirected: res.redirected, responseUrl: res.url, cuerpo: texto });
      }
      if (metodo === 'POST' && json.ok === false && Number(json.codigo) === 400 &&
          /^Acci[oó]n GET no reconocida:\s*""\.?$/i.test(String(json.error || '').trim())) {
        throw crearErrorRedireccionPostAGetE2E({ operacion: action, httpStatus: res.status, redirected: res.redirected, responseUrl: res.url });
      }
      if (!json.ok) {
        const error = new Error(`Error funcional ${json.codigo || res.status} en ${action}: ${mensajeSeguroE2E(new Error(json.error),[urlTest,tokenTest])}`);
        error.codigo = Number(json.codigo); error.tipoE2E = 'backend_logico'; error.httpStatus = res.status;
        throw error;
      }
      return json.data;
    } catch (error) {
      if (error?.name === 'TimeoutError') error.tipoE2E = 'timeout';
      if (error instanceof TypeError) error.tipoE2E = 'red';
      const seguro = metodo === 'GET' ? esFalloTransitorioLectura(error) : entrada.idempotency_key && esFalloTransitorioIdempotente(error);
      if (intento < (metodo === 'GET' ? 3 : 2) && seguro) return solicitud(metodo,action,entrada,intento + 1);
      throw new Error(mensajeSeguroE2E(error,[urlTest,tokenTest]));
    }
  }
  return {
    get: (action, data = {}) => solicitud('GET',action,data),
    post: (action, data = {}) => solicitud('POST',action,data),
    async verificar() {
      const destino = await solicitud('GET','verificarDestinoE2EFase56',{});
      if (!validarConfirmacionBackendTest(destino)) throw new Error('Destino TEST no demostrado.');
      console.log('PASS | destino TEST exacto verificado');
    },
  };
}
