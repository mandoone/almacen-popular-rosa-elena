import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function leer(ruta) {
  return readFile(new URL(`../${ruta}`, import.meta.url), 'utf8');
}

test('Fase 10: metadata pública existe y no inventa canonical productivo', async () => {
  const rutas = ['src/app/page.tsx', 'src/app/historia/page.tsx', 'src/app/rosa-elena/page.tsx', 'src/app/participar/page.tsx', 'src/app/tienda/layout.tsx'];
  for (const ruta of rutas) assert.match(await leer(ruta), /Metadata|metadata/);
  const todo = (await Promise.all(rutas.map(leer))).join('\n');
  assert.doesNotMatch(todo, /metadataBase|canonical|vercel\.app/);
});

test('Fase 10: robots excluye administración y API', async () => {
  const fuente = await leer('src/app/robots.ts');
  assert.match(fuente, /['"]\/admin\/['"]/);
  assert.match(fuente, /['"]\/api\/['"]/);
  assert.match(await leer('src/app/admin/layout.tsx'), /index:\s*false/);
});

test('Fase 10: CI tiene permisos mínimos y no ejecuta E2E ni deploy', async () => {
  const fuente = await leer('.github/workflows/ci.yml');
  assert.match(fuente, /contents:\s*read/);
  assert.match(fuente, /npm test/);
  assert.match(fuente, /npm run lint/);
  assert.match(fuente, /npm run build/);
  assert.doesNotMatch(fuente, /e2e|deploy|secret/i);
});

test('Fase 10: cabeceras defensivas no incluyen una CSP especulativa', async () => {
  const fuente = await leer('next.config.mjs');
  assert.match(fuente, /X-Content-Type-Options/);
  assert.match(fuente, /X-Frame-Options/);
  assert.match(fuente, /Referrer-Policy/);
  assert.doesNotMatch(fuente, /Content-Security-Policy/);
});

test('Fase 10: preflight consolidado no carga env ni ejecuta escrituras', async () => {
  const fuente = await leer('scripts/preflight-tecnico.mjs');
  assert.match(fuente, /diff['"], ['"]--check/);
  assert.match(fuente, /audit['"], ['"]--audit-level=critical/);
  assert.match(fuente, /apps-script:test:dry-run/);
  assert.match(fuente, /test:e2e:fase56:preflight/);
  assert.match(fuente, /process\.execPath/);
  assert.doesNotMatch(fuente, /shell:\s*true/);
  assert.doesNotMatch(fuente, /env\.local|dotenv|apps-script:test:deploy|idempotencia|--write-test/);
});
