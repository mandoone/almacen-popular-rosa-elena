import { spawnSync } from 'node:child_process';

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('FAIL | ejecuta mediante npm run');
  process.exit(1);
}

const resultado = spawnSync(process.execPath, [npmCli, 'audit', '--json'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  shell: false,
});

let reporte;
try {
  reporte = JSON.parse(resultado.stdout);
} catch {
  console.error('FAIL | npm audit no devolvió un informe JSON válido');
  process.exit(1);
}

const totales = reporte.metadata?.vulnerabilities ?? {};
console.log(
  `AUDIT | critical=${totales.critical ?? 0} high=${totales.high ?? 0} ` +
    `moderate=${totales.moderate ?? 0} low=${totales.low ?? 0}`
);

if ((totales.critical ?? 0) > 0) {
  console.error('FAIL | existen vulnerabilidades críticas');
  process.exitCode = 1;
} else if ((totales.total ?? 0) > 0) {
  console.log('PENDING | vulnerabilidades no críticas documentadas en el checklist Go/No-Go');
} else {
  console.log('PASS | sin vulnerabilidades conocidas');
}
