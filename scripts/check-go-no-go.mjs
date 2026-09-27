import { existsSync, readFileSync } from 'node:fs';
import { leerUsuariosAdmin } from '../src/lib/fase9/identidades.ts';
import { crearSessionKeyring } from '../src/lib/session.ts';

const requeridos = [
  'src/app/robots.ts',
  'src/app/sitemap.ts',
  'src/app/not-found.tsx',
  'src/app/global-error.tsx',
  'src/app/loading.tsx',
  'src/app/api/health/route.ts',
  'docs/OPERACION_BACKUP_ROLLBACK.md',
  'docs/GO_NO_GO_FASE_9_10.md',
  'docs/F10_READINESS_OPERATIVA.md',
  'config/f10-readiness.example.json',
  'scripts/preflight-f10-readiness.mjs',
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
  'ADMIN_SESSION_SECRET_VERSION',
  'ADMIN_SESSION_SECRET_PREVIOUS',
  'ADMIN_SESSION_SECRET_PREVIOUS_VERSION',
  'ADMIN_USERS_JSON',
  'ADMIN_LEGACY_RECOVERY_ENABLED',
]) {
  if (!new RegExp(`^${nombre}=`, 'm').test(ejemploEnv)) {
    console.error(`FAIL | .env.example no declara ${nombre}`);
    process.exitCode = 1;
  }
}

const appEnv = String(process.env.NEXT_PUBLIC_APP_ENV ?? '').trim().toLowerCase();
let pendientes = 0;
if (appEnv === 'production') {
  const secret = process.env.ADMIN_SESSION_SECRET ?? '';
  const version = process.env.ADMIN_SESSION_SECRET_VERSION ?? '';
  const users = leerUsuariosAdmin(process.env.ADMIN_USERS_JSON);
  const keyring = crearSessionKeyring({
    currentSecret: secret,
    currentVersion: version,
    previousSecret: process.env.ADMIN_SESSION_SECRET_PREVIOUS,
    previousVersion: process.env.ADMIN_SESSION_SECRET_PREVIOUS_VERSION,
  });
  if (!version || !keyring.ok) {
    console.error('FAIL | secreto/version o rotación de sesión productiva inválidos');
    process.exitCode = 1;
  }
  if (users.estado !== 'valida') {
    console.error('FAIL | Producción exige identidades individuales válidas');
    process.exitCode = 1;
  } else if (!users.usuarios.some((user) => user.active && user.rol === 'administracion')) {
    console.error('FAIL | Producción exige al menos una cuenta de administración activa');
    process.exitCode = 1;
  }
  if (process.env.ADMIN_LEGACY_RECOVERY_ENABLED === 'true') {
    console.error('FAIL | recuperación legacy debe estar deshabilitada en Producción');
    process.exitCode = 1;
  }
} else {
  console.log('PENDING | validación estricta de identidad productiva se activa con NEXT_PUBLIC_APP_ENV=production');
  pendientes += 1;
}

const siteUrl = process.env.SITE_URL?.trim();
if (!siteUrl) {
  if (appEnv === 'production') {
    console.error('FAIL | Producción exige SITE_URL HTTPS definitivo');
    process.exitCode = 1;
  } else {
    console.log('HUMAN_DECISION_REQUIRED | SITE_URL definitivo no configurado; canonical y sitemap quedan preparados pero inactivos');
    pendientes += 1;
  }
} else {
  try {
    const url = new URL(siteUrl);
    if (url.protocol !== 'https:' || url.username || url.password ||
        url.pathname !== '/' || url.search || url.hash || url.port) {
      throw new Error('se requiere un origen HTTPS sin ruta, credenciales ni puerto alternativo');
    }
    console.log('PASS | SITE_URL válido para metadata e indexación');
  } catch {
    console.error('FAIL | SITE_URL debe ser un origen HTTPS puro, sin exponer su valor');
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log(pendientes
    ? `PENDING | configuración técnica Go/No-Go incompleta (${pendientes} pendiente(s))`
    : 'READY | configuración técnica Go/No-Go consistente; falta aprobación humana');
}
