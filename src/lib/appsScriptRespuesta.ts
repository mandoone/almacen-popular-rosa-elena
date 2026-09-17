export type TipoCuerpoAppsScript = 'html' | 'texto' | 'vacio' | 'json-invalido';
export type DestinoAppsScript = 'googleusercontent' | 'script-google' | 'otro' | 'desconocido';

export interface DiagnosticoRespuestaNoJson {
  httpStatus: number;
  contentType: string;
  redireccion: boolean;
  destino: DestinoAppsScript;
  cuerpo: TipoCuerpoAppsScript;
  transitorioLectura: boolean;
}

function tipoContenidoSeguro(contentType: string | null): string {
  return String(contentType || '').split(';', 1)[0].trim().toLowerCase() || 'desconocido';
}

function clasificarDestino(responseUrl: string): DestinoAppsScript {
  try {
    const host = new URL(responseUrl).hostname.toLowerCase();
    if (host === 'script.googleusercontent.com') return 'googleusercontent';
    if (host === 'script.google.com') return 'script-google';
    return 'otro';
  } catch {
    return 'desconocido';
  }
}

function clasificarCuerpo(texto: string, contentType: string): TipoCuerpoAppsScript {
  const limpio = texto.trim();
  if (!limpio) return 'vacio';
  if (contentType.includes('html') || /^\s*<(?:!doctype\s+html|html)\b/i.test(limpio)) {
    return 'html';
  }
  if (contentType.includes('json') || /^[\[{]/.test(limpio)) return 'json-invalido';
  return 'texto';
}

export function esCodigoTransitorioAppsScript(codigo: number): boolean {
  return codigo === 408 || codigo === 425 || codigo === 429 || codigo >= 500;
}

export function diagnosticarRespuestaNoJson(args: {
  httpStatus: number;
  contentType: string | null;
  redirected: boolean;
  responseUrl: string;
  cuerpo: string;
}): DiagnosticoRespuestaNoJson {
  const contentType = tipoContenidoSeguro(args.contentType);
  const destino = clasificarDestino(args.responseUrl);
  const cuerpo = clasificarCuerpo(args.cuerpo, contentType);
  const httpStatus = Number(args.httpStatus) || 0;
  // Algunos fetch ya exponen la URL final de googleusercontent pero reportan
  // redirected=false. Un 404 HTML en ese host sigue siendo el fallo transitorio
  // observado de la infraestructura, no un 404 funcional JSON de la aplicación.
  const transitorioGoogle = destino === 'googleusercontent' && cuerpo === 'html' &&
    (args.redirected || httpStatus === 404);
  return {
    httpStatus,
    contentType,
    redireccion: Boolean(args.redirected),
    destino,
    cuerpo,
    transitorioLectura: esCodigoTransitorioAppsScript(httpStatus) || transitorioGoogle,
  };
}

export function mensajeRespuestaNoJsonSeguro(
  operacion: string,
  diagnostico: DiagnosticoRespuestaNoJson
): string {
  return `Respuesta no válida del backend de pedidos en ${operacion}: ` +
    `HTTP ${diagnostico.httpStatus}; content-type=${diagnostico.contentType}; ` +
    `cuerpo=${diagnostico.cuerpo}; redirección=${diagnostico.redireccion ? 'SI' : 'NO'}; ` +
    `destino=${diagnostico.destino}.`;
}
