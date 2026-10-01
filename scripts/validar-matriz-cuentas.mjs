import { readFile } from 'node:fs/promises';
import { actorIdValido, MAX_USUARIOS_ADMIN, leerUsuariosAdmin } from '../src/lib/fase9/identidades.ts';
import { esRolOperativo } from '../src/lib/fase9/roles.ts';

export function validarMatrizCuentas(cuentas, configuracionActual) {
  const errores = [];
  const ids = new Set();
  const distribucion = { administracion: 0, operacion: 0, venta: 0 };
  if (!Array.isArray(cuentas) || cuentas.length !== 10 || cuentas.length > MAX_USUARIOS_ADMIN) return { ok: false, errores: ['Se requieren exactamente 10 cuentas preparadas.'] };
  if (configuracionActual?.estado === 'invalida') errores.push('Registro actual invalido: resolver antes de generar cuentas.');
  for (const cuenta of cuentas) {
    if (!cuenta || typeof cuenta !== 'object' || Array.isArray(cuenta)) { errores.push('Cuenta invalida.'); continue; }
    if (!actorIdValido(cuenta.actor_id) || ids.has(cuenta.actor_id)) errores.push('Actor invalido o duplicado.');
    ids.add(cuenta.actor_id);
    if (!esRolOperativo(cuenta.rol)) errores.push('Rol invalido.');
    else distribucion[cuenta.rol]++;
    if (typeof cuenta.nombre !== 'string' || !cuenta.nombre.trim()) errores.push('Nombre visible requerido.');
    if ('password' in cuenta || 'password_hash' in cuenta) errores.push('La matriz preparada no debe contener credenciales.');
    if (configuracionActual?.usuarios?.some(u => u.actor_id === cuenta.actor_id)) errores.push('Colision con una cuenta existente: revisar su version antes de activar.');
  }
  if (distribucion.administracion !== 2 || distribucion.operacion !== 2 || distribucion.venta !== 6) errores.push('La distribucion aprobada es 2/2/6.');
  return { ok: errores.length === 0, errores, distribucion, capacidad_sistema: MAX_USUARIOS_ADMIN };
}

if (process.argv[1]?.endsWith('validar-matriz-cuentas.mjs')) {
  try {
    const cuentas = JSON.parse(await readFile(process.argv[2] ?? 'operativa.local/cuentas-humanas.json','utf8'));
    const resultado = validarMatrizCuentas(cuentas,leerUsuariosAdmin(process.env.ADMIN_USERS_JSON));
    if (!resultado.ok) throw new Error(resultado.errores.join(' '));
    console.log('PASS | 10 actores unicos, roles validos, 2/2/6, sin credenciales ni colisiones; capacidad maxima 50');
  } catch (error) { console.error(`FAIL | ${error.message}`); process.exitCode = 1; }
}
