import type { MetadataRoute } from 'next';
import {
  obtenerOrigenPublico,
  RUTAS_PUBLICAS_INDEXABLES,
} from '@/lib/fase10/metadataPublica';

export default function sitemap(): MetadataRoute.Sitemap {
  const origen = obtenerOrigenPublico();
  if (!origen) return [];

  return RUTAS_PUBLICAS_INDEXABLES.map((path) => ({
    url: new URL(path, origen).toString(),
    changeFrequency: path === '/tienda' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path === '/tienda' ? 0.9 : 0.7,
  }));
}
