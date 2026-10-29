/** ContentService TEST: una mutación, después solo lecturas de SU respuesta efímera. */
export async function fetchAppsScriptTestSeguro(url: string, init: RequestInit, request: typeof fetch = fetch): Promise<Response> {
  const inicial = new URL(url);
  if (inicial.protocol !== 'https:' || inicial.hostname !== 'script.google.com' || inicial.username || inicial.password || !/^\/macros\/s\/[^/]+\/exec$/.test(inicial.pathname)) {
    throw new Error('Destino ContentService TEST no válido.');
  }
  inicial.searchParams.set('_request_id', crypto.randomUUID());
  const respuesta = await request(inicial.toString(), { ...init, redirect: 'manual', signal: init.signal || AbortSignal.timeout(210000) });
  if (![302, 303].includes(respuesta.status)) return respuesta;
  const location = respuesta.headers.get('location');
  if (!location) throw new Error('Respuesta TEST sin destino de lectura.');
  const destino = new URL(location);
  if (destino.protocol !== 'https:' || destino.hostname !== 'script.googleusercontent.com' || destino.username || destino.password) {
    throw new Error('Destino de respuesta TEST no acreditado.');
  }
  let ultima: Response | undefined;
  for (let i = 0; i < 3; i++) {
    try {
      ultima = await request(destino.toString(), { method: 'GET', redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(45000) });
      Object.defineProperty(ultima, 'redirected', { value: true });
      if (ultima.ok && !ultima.headers.get('content-type')?.includes('html')) return ultima;
      // No seguir un segundo redirect a otro sitio ni repetir la mutación.
      if ([301, 302, 303, 307, 308].includes(ultima.status)) return ultima;
    } catch {
      if (i === 2 && !ultima) throw new Error('Resultado TEST incierto; consultar evidencia antes de reintentar la misma clave.');
    }
  }
  if (!ultima) throw new Error('Respuesta TEST no acreditada.');
  return ultima;
}
