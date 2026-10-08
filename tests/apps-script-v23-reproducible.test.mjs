import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
test('C5 código base v23 reproducible desde Git mediante patch local, sin credenciales',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'almacen-v23-reproduccion-'));fs.mkdirSync(path.join(dir,'scripts'));
  const target=path.join(dir,'scripts/apps-script-pedidos.gs');fs.copyFileSync('scripts/apps-script-pedidos.gs',target);
  const patch=path.join(dir,'reproducir.patch');fs.writeFileSync(patch,JSON.parse(fs.readFileSync('tests/fixtures/apps-script-v23-reproducible.patch.json','utf8')).patch);
  execFileSync('git',['apply','--whitespace=nowarn',patch],{cwd:dir});
  const src=fs.readFileSync(target,'utf8').replaceAll('\r\n','\n');
  assert.equal(createHash('sha256').update(src).digest('hex'),fs.readFileSync('tests/fixtures/apps-script-v23.sha256','utf8').trim());
  assert.ok(src.includes("var SPREADSHEET_ID = 'PEGAR_ID_BASE_OPERATIVA_AQUI'"));assert.ok(src.includes("var ADMIN_TOKEN = 'PEGAR_TOKEN_ADMIN_AQUI'"));
});
