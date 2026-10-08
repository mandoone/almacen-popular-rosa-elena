/** Build local fuera de Dropbox. Ningún deploy ni configuración remota en el proceso. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),root=process.cwd();
const original=fs.readFileSync('tsconfig.json');
if(!process.argv.includes('--worker')) {
  try{const child=spawnSync(process.execPath,[import.meta.filename,'--worker'],{stdio:'inherit',env:process.env});process.exitCode=child.status??1;}
  finally{fs.writeFileSync('tsconfig.json',original);}
} else {
const base=path.join(os.tmpdir(),'almacen-c5-qa-20261007');fs.mkdirSync(base,{recursive:true});
if(!fs.existsSync(path.join(base,'node_modules')))fs.symlinkSync(path.join(root,'node_modules'),path.join(base,'node_modules'),'junction');
const destino=fs.mkdtempSync(path.join(base,'build-c5-'));
function limpiar(){for(const k of Object.keys(process.env))if(/GOOGLE|SCRIPT|SHEET|CSV/.test(k))delete process.env[k];}
limpiar();process.env.NEXT_TEST_WASM='1';
const configPath=require.resolve('next/dist/server/config'),config=require(configPath),load=config.default;
const cargar=async(...args)=>{
  const cfg=await load(...args);limpiar();
  cfg.distDir=path.relative(root,path.join(destino,'build'));
  cfg.experimental={...cfg.experimental,useWasmBinary:true};
  process.env.__NEXT_PRIVATE_STANDALONE_CONFIG=JSON.stringify(cfg);
  return cfg;
};
require.cache[configPath].exports={...config,__esModule:true,default:cargar};
try{await require('next/dist/build').default(root);console.log('PASS | build aislado sin servicios remotos');}
finally{fs.writeFileSync('tsconfig.json',original);limpiar();}
}
