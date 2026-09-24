'use client';

import { useCallback, useEffect, useState } from 'react';
import { obtenerSesionAdmin, type SesionAdminPublica } from './cacheSesionAdmin';
import type { Capacidad } from './roles';

function cargarSesion(): Promise<SesionAdminPublica | null> {
  return obtenerSesionAdmin(() =>
    fetch('/api/admin/auth/me', { cache: 'no-store' })
      .then((respuesta) => respuesta.json())
      .then((json) => json?.ok ? json.data as SesionAdminPublica : null)
  );
}

export function useSesionAdmin(habilitada = true) {
  const [sesion, setSesion] = useState<SesionAdminPublica | null>(null);

  useEffect(() => {
    if (!habilitada) {
      setSesion(null);
      return;
    }
    let vigente = true;
    cargarSesion().then((actual) => {
      if (vigente) setSesion(actual);
    });
    return () => { vigente = false; };
  }, [habilitada]);

  const tiene = useCallback(
    (capacidad: Capacidad) => sesion?.capacidades.includes(capacidad) ?? false,
    [sesion]
  );
  return { sesion, tiene };
}
