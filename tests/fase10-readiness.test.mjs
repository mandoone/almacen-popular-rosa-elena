import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function leer(ruta) {
  return readFile(new URL(`../${ruta}`, import.meta.url), 'utf8');
}

test('Fase 10: metadata pública existe y el canonical depende de SITE_URL', async () => {
  const rutas = ['src/app/page.tsx', 'src/app/historia/page.tsx', 'src/app/rosa-elena/page.tsx', 'src/app/participar/page.tsx', 'src/app/tienda/layout.tsx'];
  for (const ruta of rutas) assert.match(await leer(ruta), /Metadata|metadata/);
  const todo = (await Promise.all(rutas.map(leer))).join('\n');
  assert.doesNotMatch(todo, /vercel\.app/);
  const helper = await leer('src/lib/fase10/metadataPublica.ts');
  assert.match(helper, /SITE_URL/);
  assert.match(helper, /canonical/);
  assert.match(helper, /openGraph/);
  assert.match(helper, /twitter/);
});

test('Fase 10: robots excluye administración y API', async () => {
  const fuente = await leer('src/app/robots.ts');
  assert.match(fuente, /['"]\/admin\/['"]/);
  assert.match(fuente, /['"]\/api\/['"]/);
  assert.match(fuente, /sitemap/);
  assert.match(await leer('src/app/sitemap.ts'), /RUTAS_PUBLICAS_INDEXABLES/);
  assert.match(await leer('src/app/admin/layout.tsx'), /index:\s*false/);
});

test('Fase 10: CI tiene permisos mínimos y no ejecuta E2E ni deploy', async () => {
  const fuente = await leer('.github/workflows/ci.yml');
  assert.match(fuente, /contents:\s*read/);
  assert.match(fuente, /npm test/);
  assert.match(fuente, /npm run lint/);
  assert.match(fuente, /npm run build/);
  assert.match(fuente, /scan:secrets/);
  assert.match(fuente, /audit --audit-level=critical/);
  assert.doesNotMatch(fuente, /e2e|deploy/i);
});

test('Fase 10: health check no expone configuración sensible', async () => {
  const fuente = await leer('src/app/api/health/route.ts');
  assert.match(fuente, /Cache-Control/);
  assert.match(fuente, /obtenerEntornoAplicacion/);
  assert.doesNotMatch(fuente, /TOKEN|PASSWORD|SECRET|GOOGLE_SCRIPT_PEDIDOS_URL/);
});

test('Fase 10: preflight Go/No-Go consolida controles sin escrituras remotas', async () => {
  const fuente = await leer('scripts/preflight-go-no-go.mjs');
  for (const esperado of ['scan:secrets', 'check:go-no-go', "['ci', '--dry-run', '--ignore-scripts']", 'piloto:test:preflight']) {
    assert.match(fuente, new RegExp(esperado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(fuente, /apps-script:test:deploy|piloto:test['"]|--write-test/);
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
