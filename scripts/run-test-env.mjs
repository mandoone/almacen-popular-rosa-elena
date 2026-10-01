import nextEnv from '@next/env';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
// Transporte local: carga la configuración existente sin imprimir valores.
nextEnv.loadEnvConfig(process.cwd(), true);
assert.equal(process.env.NEXT_PUBLIC_APP_ENV,'test');
const env = { ...process.env };
delete env.GOOGLE_SCRIPT_PEDIDOS_URL; delete env.GOOGLE_SCRIPT_ADMIN_TOKEN;
const [script,...args] = process.argv.slice(2);
assert.ok(script && /^scripts\/[a-z0-9-]+\.(mjs|ps1)$/.test(script));
const ps = script.endsWith('.ps1');
const r = spawnSync(ps ? 'powershell.exe' : process.execPath, ps ? ['-NoProfile','-ExecutionPolicy','Bypass','-File',script,...args] : ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',script,...args], { env, stdio:'inherit' });
process.exitCode = r.status ?? 1;
