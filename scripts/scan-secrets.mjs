import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const patrones = [
  { nombre: 'clave privada', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { nombre: 'token GitHub', regex: /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/ },
  { nombre: 'API key Google', regex: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { nombre: 'API key OpenAI', regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/ },
  {
    nombre: 'deployment Apps Script hardcodeado',
    regex: /https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{30,}\/exec/,
  },
];

const archivos = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' }
)
  .split('\0')
  .filter(Boolean)
  .filter((ruta) => !ruta.startsWith('reports/pdf/'));

const hallazgos = [];
for (const ruta of archivos) {
  let contenido;
  try {
    contenido = readFileSync(ruta, 'utf8');
  } catch {
    continue;
  }
  for (const patron of patrones) {
    if (patron.regex.test(contenido)) hallazgos.push({ ruta, tipo: patron.nombre });
  }
}

if (hallazgos.length > 0) {
  for (const hallazgo of hallazgos) {
    console.error(`FAIL | ${hallazgo.tipo} detectado en ${hallazgo.ruta} (valor oculto)`);
  }
  process.exitCode = 1;
} else {
  console.log(`PASS | secrets scan (${archivos.length} archivos revisados; valores nunca impresos)`);
}
