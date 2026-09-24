import type { Capacidad, RolOperativo } from './roles.ts';

export interface SesionAdminPublica {
  actor_id: string;
  nombre?: string;
  rol: RolOperativo;
  capacidades: Capacidad[];
}

type FetchSesion = () => Promise<SesionAdminPublica | null>;

let solicitudSesion: Promise<SesionAdminPublica | null> | null = null;

export function obtenerSesionAdmin(fetchSesion: FetchSesion): Promise<SesionAdminPublica | null> {
  if (!solicitudSesion) {
    solicitudSesion = fetchSesion().catch(() => {
      solicitudSesion = null;
      return null;
    });
  }
  return solicitudSesion;
}

export function invalidarSesionAdmin(): void {
  solicitudSesion = null;
}
