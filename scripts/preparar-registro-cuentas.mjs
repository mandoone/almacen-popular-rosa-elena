import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {leerUsuariosAdmin,actorIdValido} from '../src/lib/fase9/identidades.ts';
import {validarTransicionRegistro,guardarPrivadoNuevo} from './lib/registro-cuentas.mjs';
function arg(key) {const i=process.argv.indexOf('--'+key);return i<0?null:process.argv[i+1];}
try {
  let registro;
  if(arg('assemble')) {
    const matriz=JSON.parse(await readFile(arg('assemble'),'utf8'));
    if(!Array.isArray(matriz)||matriz.length!==10) throw new Error('Se exige matriz aprobada de diez personas.');
    registro=await Promise.all(matriz.map(async m=>{
      if(!actorIdValido(m.actor_id)) throw new Error('Actor inválido.');
      const r=JSON.parse(await readFile(join(arg('directory'),m.actor_id+'.json'),'utf8'));
      if(r.actor_id!==m.actor_id||r.rol!==m.rol) throw new Error('Cuenta no coincide con la asignación aprobada.');
      return {...r,nombre:m.nombre};
    }));
  } else if(arg('validate')) registro=JSON.parse(await readFile(arg('validate'),'utf8'));
  else throw new Error('Usar --assemble <matriz> --directory <carpeta> o --validate <registro>.');
  const validado=leerUsuariosAdmin(JSON.stringify(registro));
  if(validado.estado!=='valida') throw new Error('Registro inválido.');
  if(arg('previous')) validarTransicionRegistro(registro,JSON.parse(await readFile(arg('previous'),'utf8')));
  if(arg('output')) await guardarPrivadoNuevo(arg('output'),JSON.stringify(registro,null,2)+'\n');
  if(arg('encode')) await guardarPrivadoNuevo(arg('encode'),'base64url:'+Buffer.from(JSON.stringify(registro)).toString('base64url')+'\n');
  console.log('PASS | registro validado localmente; ningún valor sensible impreso; sin activar cuentas ni escribir variables.');
} catch {console.error('FAIL | registro, versiones o archivos no válidos; no se imprimen valores.');process.exitCode=1;}
