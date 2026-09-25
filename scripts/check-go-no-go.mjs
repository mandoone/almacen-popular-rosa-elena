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
if (appEnv === 'production') {
  const secret = process.env.ADMIN_SESSION_SECRET ?? '';
  const version = process.env.ADMIN_SESSION_SECRET_VERSION ?? '';
  let users;
  try {
    users = JSON.parse(process.env.ADMIN_USERS_JSON ?? '');
  } catch {
    users = null;
  }
  if (secret.length < 32 || !/^[A-Za-z0-9._-]{1,32}$/.test(version)) {
    console.error('FAIL | secreto/version de sesión productiva inválidos');
    process.exitCode = 1;
  }
  if (!Array.isArray(users) || users.length < 1) {
    console.error('FAIL | Producción exige al menos una identidad individual válida');
    process.exitCode = 1;
  } else {
    const actores = new Set();
    const cuentasInvalidas = users.some((user) => {
      const valido = user && typeof user === 'object' &&
        /^[a-z0-9][a-z0-9._@-]{0,99}$/.test(user.actor_id ?? '') &&
        ['venta', 'operacion', 'administracion'].includes(user.rol) &&
        typeof user.active === 'boolean' &&
        Number.isSafeInteger(user.session_version) && user.session_version >= 1 &&
        /^pbkdf2-sha256\$310000\$[A-Za-z0-9_-]{22,}\$[A-Za-z0-9_-]{43}$/.test(user.password_hash ?? '') &&
        !actores.has(user.actor_id);
      if (valido) actores.add(user.actor_id);
      return !valido;
    });
    if (cuentasInvalidas) {
      console.error('FAIL | ADMIN_USERS_JSON contiene una cuenta inválida o duplicada');
      process.exitCode = 1;
    }
    if (!users.some((user) => user.active === true && user.rol === 'administracion')) {
      console.error('FAIL | Producción exige al menos una cuenta de administración activa');
      process.exitCode = 1;
    }
  }
  if (process.env.ADMIN_LEGACY_RECOVERY_ENABLED === 'true') {
    console.error('FAIL | recuperación legacy debe estar deshabilitada en Producción');
    process.exitCode = 1;
  }
  const previousSecret = process.env.ADMIN_SESSION_SECRET_PREVIOUS ?? '';
  const previousVersion = process.env.ADMIN_SESSION_SECRET_PREVIOUS_VERSION ?? '';
  if (Boolean(previousSecret) !== Boolean(previousVersion)) {
    console.error('FAIL | rotación anterior de sesión incompleta');
    process.exitCode = 1;
  }
} else {
  console.log('PENDING | validación estricta de identidad productiva se activa con NEXT_PUBLIC_APP_ENV=production');
}

const siteUrl = process.env.SITE_URL?.trim();
if (!siteUrl) {
  if (appEnv === 'production') {
    console.error('FAIL | Producción exige SITE_URL HTTPS definitivo');
    process.exitCode = 1;
  } else {
    console.log('HUMAN_DECISION_REQUIRED | SITE_URL definitivo no configurado; canonical y sitemap quedan preparados pero inactivos');
  }
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
