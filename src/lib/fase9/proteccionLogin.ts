interface EstadoIntentos {
  fallos: number[];
  bloqueadoHasta: number;
}

export interface ResultadoLimiteLogin {
  permitido: boolean;
  retryAfterS: number;
}

const VENTANA_MS = 15 * 60 * 1000;
const BLOQUEO_MS = 15 * 60 * 1000;
const MAX_FALLOS = 5;
const MAX_CLAVES = 5_000;

export class LimitadorIntentosLogin {
  private readonly estados = new Map<string, EstadoIntentos>();

  consultar(claves: readonly string[], ahora = Date.now()): ResultadoLimiteLogin {
    this.limpiar(ahora);
    let bloqueadoHasta = 0;
    for (const clave of claves) {
      bloqueadoHasta = Math.max(bloqueadoHasta, this.estados.get(clave)?.bloqueadoHasta ?? 0);
    }
    return bloqueadoHasta > ahora
      ? { permitido: false, retryAfterS: Math.max(1, Math.ceil((bloqueadoHasta - ahora) / 1000)) }
      : { permitido: true, retryAfterS: 0 };
  }

  registrarFallo(claves: readonly string[], ahora = Date.now()): ResultadoLimiteLogin {
    this.limpiar(ahora);
    for (const clave of claves) {
      if (!this.estados.has(clave) && this.estados.size >= MAX_CLAVES) continue;
      const anterior = this.estados.get(clave) ?? { fallos: [], bloqueadoHasta: 0 };
      const fallos = anterior.fallos.filter((instante) => instante > ahora - VENTANA_MS);
      fallos.push(ahora);
      const bloqueadoHasta = fallos.length >= MAX_FALLOS ? ahora + BLOQUEO_MS : anterior.bloqueadoHasta;
      this.estados.set(clave, { fallos, bloqueadoHasta });
    }
    return this.consultar(claves, ahora);
  }

  registrarExito(claves: readonly string[]): void {
    for (const clave of claves) this.estados.delete(clave);
  }

  resetParaTests(): void {
    this.estados.clear();
  }

  private limpiar(ahora: number): void {
    if (this.estados.size >= MAX_CLAVES) {
      for (const [clave, estado] of this.estados) {
        if (estado.bloqueadoHasta <= ahora &&
            estado.fallos.every((instante) => instante <= ahora - VENTANA_MS)) {
          this.estados.delete(clave);
        }
      }
    }
  }
}

export const limitadorLogin = new LimitadorIntentosLogin();

export function clavesLimiteLogin(request: Request, actorId: string): string[] {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip')?.trim() || 'ip-desconocida';
  const actor = String(actorId ?? '').trim().toLowerCase() || 'actor-vacio';
  return [`ip:${ip.slice(0, 100)}`, `actor:${actor.slice(0, 100)}`];
}
