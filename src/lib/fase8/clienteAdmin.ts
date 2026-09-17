export interface RespuestaApi<T> { ok: boolean; data?: T; error?: string }

export async function solicitarAdmin<T>(url: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(url, { cache: 'no-store', ...init });
  const json = await respuesta.json().catch(() => null) as RespuestaApi<T> | null;
  if (!json || !respuesta.ok || !json.ok || json.data === undefined) {
    throw new Error(json?.error || 'Respuesta no válida del servidor.');
  }
  return json.data;
}

export function claveIdempotencia(prefijo: string): string {
  return `${prefijo}-TEST-${crypto.randomUUID().replace(/-/g, '')}`;
}

export interface IntentoIdempotente {
  firma: string;
  clave: string;
}

export function resolverIntentoIdempotente(
  actual: IntentoIdempotente | null,
  prefijo: string,
  payload: unknown
): IntentoIdempotente {
  const firma = JSON.stringify(payload);
  return actual?.firma === firma ? actual : { firma, clave: claveIdempotencia(prefijo) };
}

export function pesos(valor: unknown): string {
  const numero = Number(valor);
  return Number.isFinite(numero) ? `$${Math.round(numero).toLocaleString('es-CL')}` : '$0';
}

export function valorOperativo(valor: unknown): string {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return String(valor ?? '');
  if (Number.isInteger(valor)) return String(valor);
  return String(Number(valor.toFixed(6)));
}
