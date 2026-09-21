import type { MetadataRoute } from 'next';
import { obtenerOrigenPublico } from '@/lib/fase10/metadataPublica';

export default function robots(): MetadataRoute.Robots {
  const origen = obtenerOrigenPublico();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'],
    },
    ...(origen ? { sitemap: new URL('/sitemap.xml', origen).toString() } : {}),
  };
}
