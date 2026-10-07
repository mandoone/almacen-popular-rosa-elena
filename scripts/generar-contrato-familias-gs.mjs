/** Genera solo el bloque local GAS. --check no escribe; jamás accede a servicios. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

const inicio = '// BEGIN DOMINIO FAMILIAS FASE A GENERADO';
const fin = '// END DOMINIO FAMILIAS FASE A GENERADO';
const dominioUrl = new URL('../src/lib/familiasProducto.ts', import.meta.url);
const scriptUrl = new URL('./apps-script-pedidos.gs', import.meta.url);
const dominio = await readFile(dominioUrl, 'utf8');
assert.doesNotMatch(dominio, /^import\s/m, 'El dominio GAS debe ser autocontenido.');
const exportaciones = [...dominio.matchAll(/^export (?:const|function) (\w+)/gm)].map(m => m[1]);
const compilado = ts.transpileModule(dominio.replace(/^export /gm, ''), {
  compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.None, newLine: ts.NewLineKind.LineFeed },
}).outputText.trimEnd();
const generado = `${inicio}\n// Fuente única: src/lib/familiasProducto.ts. Regenerar con --write y verificar --check.\nvar DominioFamiliasFaseA = (function () {\n${compilado}\nreturn { ${exportaciones.join(', ')} };\n})();\n${fin}`;
const fuente = (await readFile(scriptUrl, 'utf8')).replaceAll('\r\n', '\n');
const desde = fuente.indexOf(inicio), hasta = fuente.indexOf(fin);
assert.ok((desde === -1 && hasta === -1) || (desde >= 0 && hasta > desde), 'Marcadores GAS incompletos o desordenados; no escribir.');
assert.equal(fuente.indexOf(inicio, desde + inicio.length), -1, 'Marcador inicial GAS duplicado; no escribir.');
assert.equal(fuente.indexOf(fin, hasta + fin.length), -1, 'Marcador final GAS duplicado; no escribir.');
const bloqueActual = desde < 0 ? '' : fuente.slice(desde, hasta + fin.length);
const modo = process.argv[2] ?? '--check';
assert.ok(['--check', '--write'].includes(modo), 'Usar --check o --write.');
if (modo === '--check') {
  assert.equal(bloqueActual, generado, 'Bloque GAS desactualizado: ejecutar generador --write.');
  console.log('PASS | contrato puro TypeScript/GAS idéntico; cero escrituras');
} else {
  const nueva = desde < 0 ? fuente.trimEnd() + '\n\n' + generado + '\n' : fuente.slice(0, desde) + generado + fuente.slice(hasta + fin.length);
  await writeFile(scriptUrl, nueva, 'utf8');
  console.log('PASS | bloque GAS actualizado únicamente en archivo local; sin deploy');
}
