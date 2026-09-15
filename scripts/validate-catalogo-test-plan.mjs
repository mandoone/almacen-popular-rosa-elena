import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validarPlanCatalogoTest } from '../src/lib/fase4/planCatalogo.ts';

function abortar(mensaje) {
  console.error(`FAIL | plan catálogo TEST: ${mensaje}`);
  process.exit(1);
}

if (process.env.NEXT_PUBLIC_APP_ENV !== 'test') {
  abortar('NEXT_PUBLIC_APP_ENV debe ser exactamente test.');
}
if (process.env.GOOGLE_SCRIPT_PEDIDOS_URL || process.env.GOOGLE_SCRIPT_ADMIN_TOKEN) {
  abortar('La configuración productiva genérica debe estar ausente.');
}

const argumento = process.argv[2];
if (!argumento || argumento.startsWith('-')) abortar('Falta la ruta del plan JSON.');
const ruta = resolve(argumento);
if (/\.env(?:\.|$)/i.test(ruta)) abortar('No se permiten archivos de entorno.');

let plan;
try {
  plan = JSON.parse(await readFile(ruta, 'utf8'));
} catch {
  abortar('El plan no existe o no contiene JSON válido.');
}

const resultado = validarPlanCatalogoTest(plan);
if (!resultado.ok) abortar(resultado.errores.join(' '));

console.log('ENTORNO: TEST');
console.log('MODO: validación local sin red ni escrituras');
console.log(`PRODUCTOS PLANIFICADOS: ${resultado.productos}`);
console.log(`CAMPOS PLANIFICADOS: ${resultado.campos}`);
console.log('PASS | plan catálogo TEST válido');
