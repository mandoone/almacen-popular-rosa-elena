import type { Metadata } from 'next';

export const RUTAS_PUBLICAS_INDEXABLES = [
  '/',
  '/historia',
  '/rosa-elena',
  '/participar',
  '/tienda',
] as const;

export function obtenerOrigenPublico(): URL | null {
  const valor = process.env.SITE_URL?.trim();
  if (!valor) return null;

  try {
    const url = new URL(valor);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

export function crearMetadataPublica(args: {
  title: string;
  description: string;
  path: (typeof RUTAS_PUBLICAS_INDEXABLES)[number];
}): Metadata {
  const origen = obtenerOrigenPublico();
  const url = origen ? new URL(args.path, origen) : undefined;

  return {
    title: args.title,
    description: args.description,
    ...(url ? { alternates: { canonical: url } } : {}),
    openGraph: {
      type: 'website',
      locale: 'es_CL',
      siteName: 'Almacén Popular Rosa Elena Morales',
      title: args.title,
      description: args.description,
      ...(url ? { url } : {}),
    },
    twitter: {
      card: 'summary',
      title: args.title,
      description: args.description,
    },
  };
}
