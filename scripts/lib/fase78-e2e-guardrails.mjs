import { mensajeSeguroE2E } from './fase56-e2e-guardrails.mjs';

export const NOMBRE_SHEET_F78_TEST = 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES';
export const CONTRATO_F78_TEST = 'fase78_test_v1';
export const CONFIRMACION_F78_ESCRITURAS = 'HABILITAR_ESCRITURAS_F78_TEST';
export const CONFIRMACION_F78_MIGRACION = 'MIGRAR_ESQUEMA_F78_TEST';
export const PRODUCTO_UNIDAD_F78 = 'PROD-001';
export const PRODUCTO_DECIMAL_F78 = 'PROD-TEST-DECIMAL';

function valor(config, nombre) { return typeof config[nombre] === 'string' ? config[nombre] : ''; }

function urlValida(valorUrl) {
  try {
    const url = new URL(valorUrl);
    return valorUrl === valorUrl.trim() && url.protocol === 'https:' &&
      url.hostname === 'script.google.com' &&
      /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) &&
      !url.search && !url.hash && !url.username && !url.password;
  } catch { return false; }
}

export function validarConfiguracionF78(config, { escritura = false, migracion = false } = {}) {
  const errores = [];
  if (valor(config, 'NEXT_PUBLIC_APP_ENV') !== 'test') errores.push('NEXT_PUBLIC_APP_ENV debe ser exactamente test.');
  const url = valor(config, 'GOOGLE_SCRIPT_PEDIDOS_URL_TEST');
  const token = valor(config, 'GOOGLE_SCRIPT_ADMIN_TOKEN_TEST');
  if (!url || !token) errores.push('Falta configuración TEST obligatoria.');
  if (url && !urlValida(url)) errores.push('La URL TEST no tiene formato canónico de Apps Script.');
  if (token && (token !== token.trim() || token.length < 8)) errores.push('El token TEST no cumple el formato mínimo.');
  if (valor(config, 'GOOGLE_SCRIPT_PEDIDOS_URL') || valor(config, 'GOOGLE_SCRIPT_ADMIN_TOKEN')) {
    errores.push('Hay configuración productiva presente; ejecución F78 bloqueada.');
  }
  if (escritura && valor(config, 'E2E_FASE78_ENABLE_WRITES') !== CONFIRMACION_F78_ESCRITURAS) {
    errores.push('Las escrituras F78 TEST no fueron habilitadas explícitamente.');
  }
  if (migracion && valor(config, 'E2E_FASE78_ENABLE_SCHEMA') !== CONFIRMACION_F78_MIGRACION) {
    errores.push('La migración aditiva F78 TEST no fue habilitada explícitamente.');
  }
  return errores.length ? { ok: false, errores } : { ok: true, config: { url, token } };
}

export function validarDestinoF78(data) {
  return Boolean(data && data.entorno === 'TEST' && data.destino === 'backend_test_verificado' &&
    data.sheet_nombre === NOMBRE_SHEET_F78_TEST && data.contrato === CONTRATO_F78_TEST);
}

export function crearIdsF78(uuid) {
  const sufijo = String(uuid ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 24);
  if (sufijo.length < 12) throw new Error('No se pudo generar marcador TEST seguro.');
  return {
    marcador: `E2E-TEST-F78-${sufijo}`,
    compra: `e2e_test_f78_compra_${sufijo}`,
    compraDecimal: `e2e_test_f78_decimal_${sufijo}`,
    compraInvalida: `e2e_test_f78_invalida_${sufijo}`,
    gasto: `e2e_test_f78_gasto_${sufijo}`,
    caja: `e2e_test_f78_caja_${sufijo}`,
    producto: `PROD-TEST-F78-${sufijo.slice(0, 12).toUpperCase()}`,
    productoCrear: `e2e_test_f78_producto_${sufijo}`,
    productoEditar: `e2e_test_f78_editar_${sufijo}`,
    ajuste: `e2e_test_f78_ajuste_${sufijo}`,
  };
}

export function errorSeguroF78(error, config = {}) {
  return mensajeSeguroE2E(error, [valor(config, 'GOOGLE_SCRIPT_PEDIDOS_URL_TEST'), valor(config, 'GOOGLE_SCRIPT_ADMIN_TOKEN_TEST')]);
}

/**
 * Google puede completar el redirect de un GET de Apps Script sin conservar
 * temporalmente la query. Solo este error imposible para el cliente (que sí
 * envió una acción no vacía) se considera reintentable; otros 400 funcionales
 * siguen fallando inmediatamente.
 */
export function esGetSinAccionTransitorioF78(error) {
  return error instanceof Error &&
    error.tipoE2E === 'backend_logico' &&
    Number(error.codigo) === 400 &&
    error.message === 'Accion GET no reconocida: "".';
}
