const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function solicitudAdminMismoOrigen(request: Request): boolean {
  if (METODOS_SEGUROS.has(request.method.toUpperCase())) return true;
  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (fetchSite === 'cross-site' || fetchSite === 'same-site') return false;

  const origin = request.headers.get('origin');
  if (!origin) return true; // Compatibilidad con clientes de operación no-browser.
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
