import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { emitKeypressEvents } from 'node:readline';

const ITERACIONES = 310_000;
const roles = new Set(['venta', 'operacion', 'administracion']);

function argumento(nombre) {
  const indice = process.argv.indexOf(`--${nombre}`);
  return indice >= 0 ? process.argv[indice + 1] : undefined;
}

function fallar(mensaje) {
  console.error(`FAIL | ${mensaje}`);
  process.exit(1);
}

function leerOculto(etiqueta) {
  if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode) {
    fallar('este comando requiere una terminal interactiva para no mostrar la contraseña');
  }
  return new Promise((resolve, reject) => {
    let valor = '';
    emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdout.write(etiqueta);

    const terminar = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off('keypress', keypress);
      process.stdout.write('\n');
    };
    const keypress = (texto, key) => {
      if (key?.ctrl && key.name === 'c') {
        terminar();
        reject(new Error('cancelado'));
      } else if (key?.name === 'return') {
        terminar();
        resolve(valor);
      } else if (key?.name === 'backspace') {
        valor = valor.slice(0, -1);
      } else if (!key?.ctrl && !key?.meta && texto) {
        valor += texto;
      }
    };
    process.stdin.on('keypress', keypress);
  });
}

const actorId = String(argumento('actor') ?? '').trim().toLowerCase();
const rol = String(argumento('role') ?? '').trim().toLowerCase();
if (!/^[a-z0-9][a-z0-9._@-]{0,99}$/.test(actorId)) {
  fallar('usa --actor con un identificador técnico válido (sin nombre real si aún no está aprobado)');
}
if (!roles.has(rol)) fallar('usa --role venta, operacion o administracion');

try {
  const primera = await leerOculto('Contraseña: ');
  const segunda = await leerOculto('Repetir contraseña: ');
  if (primera !== segunda) fallar('las contraseñas no coinciden');
  if (primera.length < 14 || primera.length > 256) {
    fallar('la contraseña debe tener entre 14 y 256 caracteres');
  }
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(primera, salt, ITERACIONES, 32, 'sha256');
  const passwordHash = `pbkdf2-sha256$${ITERACIONES}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
  console.log(JSON.stringify({
    actor_id: actorId,
    rol,
    active: true,
    session_version: 1,
    password_hash: passwordHash,
  }, null, 2));
} catch {
  fallar('operación cancelada');
}
