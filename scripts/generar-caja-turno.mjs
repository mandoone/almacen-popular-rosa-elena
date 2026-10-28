import { readFile, writeFile } from 'node:fs/promises';
const destino = new URL('./apps-script-pedidos.gs', import.meta.url);
const inicio = '// BEGIN CAJA_TURNO_GENERADO', fin = '// END CAJA_TURNO_GENERADO';
const base = (await readFile(destino,'utf8')).split(inicio)[0].trimEnd();
const bloque = await readFile(new URL('./runtime-caja-turno.gs',import.meta.url),'utf8');
await writeFile(destino,`${base}\n\n${inicio}\n${bloque.trim()}\n${fin}\n`);
