import { existsSync, readFileSync } from 'node:fs';

const requeridos = [
  'src/app/robots.ts',
  'src/app/sitemap.ts',
  'src/app/not-found.tsx',
  'src/app/global-error.tsx',
  'src/app/loading.tsx',
  'src/app/api/health/route.ts',
  'docs/OPERACION_BACKUP_ROLLBACK.md',
  'docs/GO_NO_GO_FASE_9_10.md',
];

const faltantes = requeridos.filter((ruta) => !existsSync(ruta));
if (faltantes.length > 0) {
  for (const ruta of faltantes) console.error(`FAIL | falta ${ruta}`);
  process.exitCode = 1;
} else {
  console.log('PASS | archivos esenciales Fase 10 presentes');
}

const ejemploEnv = readFileSync('.env.example', 'utf8');
for (const nombre of [
  'SITE_URL',
  'NEXT_PUBLIC_APP_ENV',
  'GOOGLE_SCRIPT_PEDIDOS_URL',
  'GOOGLE_SCRIPT_ADMIN_TOKEN',
  'ADMIN_PANEL_PASSWORD',
  'ADMIN_SESSION_SECRET',
]) {
  if (!new RegExp(`^${nombre}=`, 'm').test(ejemploEnv)) {
    console.error(`FAIL | .env.example no declara ${nombre}`);
    process.exitCode = 1;
  }
}

const siteUrl = process.env.SITE_URL?.trim();
if (!siteUrl) {
  console.log('HUMAN_DECISION_REQUIRED | SITE_URL definitivo no configurado; canonical y sitemap quedan preparados pero inactivos');
} else {
  try {
    const url = new URL(siteUrl);
    if (url.protocol !== 'https:') throw new Error('se requiere HTTPS');
    console.log('PASS | SITE_URL válido para metadata e indexación');
  } catch {
    console.error('FAIL | SITE_URL debe ser un origen HTTPS válido, sin exponer su valor');
    process.exitCode = 1;
  }
}

if (!process.exitCode) console.log('PASS | configuración técnica Go/No-Go consistente');
