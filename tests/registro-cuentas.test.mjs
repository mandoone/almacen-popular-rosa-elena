import test from 'node:test';
import assert from 'node:assert/strict';
import {pbkdf2Sync} from 'node:crypto';
import {validarTransicionRegistro,guardarPrivadoNuevo} from '../scripts/lib/registro-cuentas.mjs';
const salt=Buffer.alloc(16,1);
const hash=(p)=>'pbkdf2-sha256$310000$'+salt.toString('base64url')+'$'+pbkdf2Sync(p,salt,310000,32,'sha256').toString('base64url');
const usuario={actor_id:'test-registro',rol:'venta',active:true,session_version:2,password_hash:hash('solo-fixture-sintetica')};
test('registro: revocar exige subir versión',()=>{
  assert.throws(()=>validarTransicionRegistro([{...usuario,active:false}],[usuario]),/incrementar/);
  assert.equal(validarTransicionRegistro([{...usuario,active:false,session_version:3}],[usuario]).estado,'valida');
});
test('registro: reactivación no puede reinstalar versión vieja',()=>{
  assert.throws(()=>validarTransicionRegistro([{...usuario,session_version:1}],[{...usuario,active:false}]),/disminuir/);
});
test('registro: rol nuevo sin versión no habilita escalamiento',()=>{
  assert.throws(()=>validarTransicionRegistro([{...usuario,rol:'administracion'}],[usuario]),/incrementar/);
});
test('registro: contraseña nueva invalida sesiones anteriores por versión',()=>{
  assert.throws(()=>validarTransicionRegistro([{...usuario,password_hash:hash('otra-fixture-sintetica')}],[usuario]),/incrementar/);
});
test('registro: no retirar actores silenciosamente durante rollback',()=>{
  assert.throws(()=>validarTransicionRegistro([{...usuario,actor_id:'test-otro'}],[usuario]),/revocadas/);
});
test('registro: no escribir hashes en salida versionable',async()=>{
  await assert.rejects(guardarPrivadoNuevo('docs/hash-prohibido.json','fixture'),/operativa.local/);
});
