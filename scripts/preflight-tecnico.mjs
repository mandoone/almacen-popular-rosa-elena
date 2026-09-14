import { spawnSync } from 'node:child_process';

const incluyeTest = process.argv.includes('--include-test');
const permiteSucio = process.argv.includes('--allow-dirty');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const pasos = [
  { nombre: 'integridad del diff', comando: 'git', argumentos: ['diff', '--check'] },
  { nombre: 'tests locales', comando: npm, argumentos: ['test'] },
  { nombre: 'lint', comando: npm, argumentos: ['run', 'lint'] },
  { nombre: 'build', comando: npm, argumentos: ['run', 'build'] },
  { nombre: 'auditoría crítica de dependencias', comando: npm, argumentos: ['audit', '--audit-level=critical'] },
];

if (incluyeTest) {
  pasos.push(
    { nombre: 'clasp TEST dry-run', comando: npm, argumentos: ['run', 'apps-script:test:dry-run'] },
    { nombre: 'E2E TEST read-only', comando: npm, argumentos: ['run', 'test:e2e:fase56:preflight'] }
  );
}

let fallos = 0;
for (const paso of pasos) {
  console.log(`\nPREFLIGHT | ${paso.nombre}`);
  const resultado = spawnSync(paso.comando, paso.argumentos, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: false,
  });
  if (resultado.status !== 0) {
    console.error(`FAIL | ${paso.nombre}`);
    fallos += 1;
    break;
  }
  console.log(`PASS | ${paso.nombre}`);
}

if (fallos === 0 && !permiteSucio) {
  const estado = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8', shell: false });
  if (estado.status !== 0 || estado.stdout.trim()) {
    console.error('FAIL | el worktree no está limpio');
    fallos += 1;
  } else {
    console.log('PASS | worktree limpio');
  }
}

if (fallos > 0) process.exitCode = 1;
else console.log(`PASS | preflight ${incluyeTest ? 'TEST' : 'técnico local'}`);
