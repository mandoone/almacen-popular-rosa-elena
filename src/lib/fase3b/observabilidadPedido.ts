/** Trazas del alta F9-A: solo etiquetas y metadatos de transporte permitidos. */
export type EtapaPedido =
  | 'PRECONDICION_APERTURA'
  | 'PRECONDICION_CAPACIDAD'
  | 'CREAR_PEDIDO';

export interface EventoEtapaPedido {
  etapa: EtapaPedido;
  resultado: 'PASS' | 'FAIL';
  duracion_ms: number;
  error?: unknown;
}

export type ObservarEtapaPedido = (evento: EventoEtapaPedido) => void;

export async function ejecutarEtapaPedido<T>(
  etapa: EtapaPedido,
  ejecutar: () => Promise<T>,
  observar?: ObservarEtapaPedido
): Promise<T> {
  const inicio = Date.now();
  try {
    const resultado = await ejecutar();
    observar?.({ etapa, resultado: 'PASS', duracion_ms: Date.now() - inicio });
    return resultado;
  } catch (error) {
    observar?.({ etapa, resultado: 'FAIL', duracion_ms: Date.now() - inicio, error });
    throw error;
  }
}

function codigoSeguro(valor: unknown): number | undefined {
  return typeof valor === 'number' && Number.isInteger(valor) &&
    valor >= 100 && valor <= 599 ? valor : undefined;
}

/** Nunca serializa message, stack, URL, query, body, cookies ni payload. */
export function registrarEventoEtapaPedido(
  trazaId: string,
  evento: EventoEtapaPedido,
  logger: Pick<Console, 'info' | 'error'> = console
): void {
  const error = evento.error && typeof evento.error === 'object'
    ? evento.error as Record<string, unknown> : null;
  const diagnostico = error?.diagnostico && typeof error.diagnostico === 'object'
    ? error.diagnostico as Record<string, unknown> : null;
  const clasificaciones = [
    'RESPUESTA_NO_JSON', 'ERROR_JSON_LOGICO', 'ERROR_APPS_SCRIPT',
    'TIMEOUT', 'TRANSPORTE', 'DESCONOCIDO',
  ];
  const destinos = ['googleusercontent', 'script-google', 'otro', 'desconocido'];
  const tipos = ['text/html', 'application/json', 'text/plain', 'otro'];
  const salida = JSON.stringify({
    evento: 'f9_pedido_etapa', traza_id: trazaId,
    etapa: evento.etapa, resultado: evento.resultado,
    duracion_ms: Math.max(0, Math.round(evento.duracion_ms)),
    status: codigoSeguro(error?.status),
    clasificacion: clasificaciones.includes(String(diagnostico?.clasificacion))
      ? diagnostico?.clasificacion : undefined,
    http_status: codigoSeguro(diagnostico?.httpStatus),
    codigo_backend: codigoSeguro(diagnostico?.backendCodigo),
    content_type: tipos.includes(String(diagnostico?.contentType))
      ? diagnostico?.contentType : undefined,
    redireccion: typeof diagnostico?.redireccion === 'boolean'
      ? diagnostico.redireccion : undefined,
    destino: destinos.includes(String(diagnostico?.destino))
      ? diagnostico?.destino : undefined,
  });
  if (evento.resultado === 'FAIL') logger.error(salida);
  else logger.info(salida);
}
