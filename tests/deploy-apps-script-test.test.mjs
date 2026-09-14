import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const fuente = await readFile(
  new URL('../scripts/deploy-apps-script-test.ps1', import.meta.url),
  'utf8'
);

test('clasp TEST: fija la version y no depende de una instalacion global', () => {
  assert.match(fuente, /\$ClaspPackage = '@google\/clasp@3\.4\.1'/);
  assert.match(fuente, /npx\.cmd --yes \$ClaspPackage/);
  assert.doesNotMatch(fuente, /npm (?:install|update)|clasp\.cmd/);
});

test('clasp TEST: exige entorno TEST y bloquea variables productivas', () => {
  assert.match(fuente, /NEXT_PUBLIC_APP_ENV -cne 'test'/);
  assert.match(fuente, /GOOGLE_SCRIPT_PEDIDOS_URL_TEST/);
  assert.match(fuente, /GOOGLE_SCRIPT_ADMIN_TOKEN_TEST/);
  assert.match(fuente, /GOOGLE_SCRIPT_PEDIDOS_URL', 'GOOGLE_SCRIPT_ADMIN_TOKEN'/);
  assert.doesNotMatch(fuente, /\.env\.local|dotenv/);
});

test('clasp TEST: configura el proyecto fuera del repo y no imprime secretos', () => {
  assert.match(fuente, /\.almacen-popular-clasp-test\.json/);
  assert.match(fuente, /configKeys\.Count -ne 1/);
  assert.doesNotMatch(
    fuente,
    /Write-(?:Output|Host|Error)[^\n]*(?:scriptId|deploymentId|testUrl|testToken)/i
  );
});

test('clasp TEST: preflight y comparacion remota ocurren antes de push', () => {
  const preflight = fuente.indexOf('\n  Invoke-TestPreflight\n');
  const push = fuente.indexOf("-Arguments @('push', '--force')");
  assert.ok(preflight >= 0 && push > preflight);
  assert.match(fuente, /HEAD remoto y deployment TEST difieren/);
  assert.match(fuente, /Get-TargetDeployment/);
  assert.match(fuente, /versionNumber -ne \$baselineVersion/);
  assert.match(fuente, /PSObject\.Properties\['deploymentId'\]/);
  assert.match(fuente, /PSObject\.Properties\['id'\]/);
  assert.match(fuente, /action=verificarDestinoE2EFase56/);
  assert.match(fuente, /backend_test_verificado/);
  assert.match(fuente, /fase56_e2e_test_v1/);
  assert.doesNotMatch(fuente, /test:e2e:fase56:preflight/);
});

test('clasp TEST: preserva configuracion remota y limita el payload', () => {
  assert.match(fuente, /SPREADSHEET_ID = '\(\[\^'\\r\\n\]\+\)'/);
  assert.match(fuente, /ADMIN_TOKEN = '\(\[\^'\\r\\n\]\+\)'/);
  assert.match(fuente, /\$tokenMatch\.Groups\[1\]\.Value -cne \$testToken/);
  assert.match(fuente, /filesToPush/);
  assert.match(fuente, /expectedToPush/);
  assert.match(fuente, /untrackedFiles/);
  assert.match(fuente, /-cne '\.clasp\.json'/);
  assert.match(fuente, /un archivo Apps Script y manifest/);
});

test('clasp TEST: dry-run es el modo por defecto y deploy requiere doble opt-in', () => {
  assert.match(fuente, /if \(-not \$Execute\)/);
  assert.match(fuente, /PASS \| dry-run clasp TEST; no hubo push ni deploy/);
  assert.match(fuente, /DESPLEGAR_SOLO_TEST/);
  assert.match(fuente, /redeploy/);
  assert.doesNotMatch(fuente, /create-deployment|delete-deployment|undeploy/);
});
