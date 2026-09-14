import { spawnSync } from 'node:child_process';

const incluyeTest = process.argv.includes('--include-test');
const permiteSucio = process.argv.includes('--allow-dirty');
const npmCli = process.env.npm_execpath;

if (!npmCli) {
  console.error('FAIL | ejecuta el preflight mediante npm run');
  process.exit(1);
}

function pasoNpm(nombre, argumentos) {
  return { nombre, comando: process.execPath, argumentos: [npmCli, ...argumentos] };
}

const pasos = [
  { nombre: 'integridad del diff', comando: 'git', argumentos: ['diff', '--check'] },
  pasoNpm('tests locales', ['test']),
  pasoNpm('lint', ['run', 'lint']),
  pasoNpm('build', ['run', 'build']),
  pasoNpm('auditoría crítica de dependencias', ['audit', '--audit-level=critical']),
];

if (incluyeTest) {
  pasos.push(
    pasoNpm('clasp TEST dry-run', ['run', 'apps-script:test:dry-run']),
    pasoNpm('E2E TEST read-only', ['run', 'test:e2e:fase56:preflight'])
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
    console.error(`FAIL | ${paso.nombre}${resultado.error ? ' (no se pudo iniciar)' : ''}`);
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
