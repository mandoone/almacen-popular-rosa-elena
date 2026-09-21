import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const permiteSucio = process.argv.includes('--allow-dirty');
const omiteCi = process.argv.includes('--skip-npm-ci');
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error('FAIL | ejecuta el preflight mediante npm run');
  process.exit(1);
}

if (existsSync('.env.local') && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env.local');
}

const entornoTest = { ...process.env, NEXT_PUBLIC_APP_ENV: 'test' };
for (const nombre of ['GOOGLE_SCRIPT_PEDIDOS_URL', 'GOOGLE_SCRIPT_ADMIN_TOKEN']) {
  delete entornoTest[nombre];
}

function npm(nombre, argumentos, opcional = false, soloTest = false) {
  return { nombre, comando: process.execPath, argumentos: [npmCli, ...argumentos], opcional, soloTest };
}

const pasos = [
  { nombre: 'integridad del diff', comando: 'git', argumentos: ['diff', '--check'] },
  npm('secrets scan', ['run', 'scan:secrets']),
  npm('configuración Go/No-Go', ['run', 'check:go-no-go']),
  ...(omiteCi ? [] : [npm('validación reproducible del lockfile', ['ci', '--dry-run', '--ignore-scripts'])]),
  npm('tests locales', ['test']),
  npm('lint', ['run', 'lint']),
  npm('build', ['run', 'build']),
  { nombre: 'auditoría completa de dependencias', comando: process.execPath, argumentos: ['scripts/audit-resumen.mjs'] },
  npm('Apps Script TEST dry-run', ['run', 'apps-script:test:dry-run'], true, true),
  npm('backend TEST preflight integral read-only', ['run', 'piloto:test:preflight'], true, true),
];

let fallos = 0;
let pendientes = 0;
for (const paso of pasos) {
  console.log(`\nPREFLIGHT | ${paso.nombre}`);
  const resultado = spawnSync(paso.comando, paso.argumentos, {
    cwd: process.cwd(),
    env: paso.soloTest ? entornoTest : process.env,
    stdio: 'inherit',
    shell: false,
  });
  if (resultado.status !== 0) {
    if (paso.opcional) {
      console.log(`PENDING | ${paso.nombre}; revisar configuración o conectividad TEST`);
      pendientes += 1;
      continue;
    }
    console.error(`FAIL | ${paso.nombre}`);
    fallos += 1;
    continue;
  }
  console.log(`PASS | ${paso.nombre}`);
}

if (!permiteSucio) {
  const estado = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8', shell: false });
  if (estado.status !== 0 || estado.stdout.trim()) {
    console.error('FAIL | el worktree no está limpio');
    fallos += 1;
  } else {
    console.log('PASS | worktree limpio');
  }
}

console.log(`\nRESUMEN | fallos=${fallos} pendientes_test=${pendientes}`);
if (fallos > 0) process.exitCode = 1;
