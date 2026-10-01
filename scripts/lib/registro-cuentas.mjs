import {leerUsuariosAdmin} from '../../src/lib/fase9/identidades.ts';
import {resolve,relative,isAbsolute,dirname} from 'node:path';
import {mkdir,writeFile,realpath} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
export function validarTransicionRegistro(nuevo,anterior) {
  const n=leerUsuariosAdmin(JSON.stringify(nuevo)),a=leerUsuariosAdmin(JSON.stringify(anterior));
  if(n.estado!=='valida'||a.estado!=='valida') throw new Error('Registro inválido; no se imprimen valores.');
  for(const viejo of a.usuarios) {
    const actual=n.usuarios.find(u=>u.actor_id===viejo.actor_id);
    if(!actual) throw new Error('No retirar cuentas silenciosamente: conservar revocadas.');
    if(actual.session_version<viejo.session_version) throw new Error('session_version no puede disminuir.');
    if(['rol','active','password_hash'].some(k=>actual[k]!==viejo[k])&&actual.session_version<=viejo.session_version) throw new Error('Cambio de seguridad requiere incrementar session_version.');
  }
  return n;
}
export async function guardarPrivadoNuevo(path,texto) {
  const root=resolve('operativa.local'),dest=resolve(path),rel=relative(root,dest);
  if(!rel||rel.startsWith('..')||isAbsolute(rel)) throw new Error('Salida debe estar dentro de operativa.local.');
  await mkdir(dirname(dest),{recursive:true});
  const parent=await realpath(dirname(dest)),realRoot=await realpath(root),p=relative(realRoot,parent);
  if(p.startsWith('..')||isAbsolute(p)) throw new Error('Salida enlazada fuera del directorio privado.');
  execFileSync('git',['check-ignore','--quiet',dest],{stdio:'ignore'});
  await writeFile(dest,texto,{flag:'wx',mode:0o600});
}
