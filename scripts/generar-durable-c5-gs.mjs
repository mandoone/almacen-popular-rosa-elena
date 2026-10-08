/** Compila el MISMO dominio C1/C2/C4 para puerto síncrono GAS; no red ni despliegue. */
import ts from 'typescript';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
export const INICIO_C5='// INICIO DOMINIO DURABLE C5 GENERADO';
export const FIN_C5='// FIN DOMINIO DURABLE C5 GENERADO';
const fuentes=['granel.ts','familiasProducto.ts',...['sha256','revisionV1','pedidoV2','asignacionV2','planMixtoV2','adaptadorDurableV2','esquemaDurableV2'].map(n=>'familias/'+n+'.ts')];
export async function generarDominioC5() {
  const factories=[];
  for(const file of fuentes) {
    const src=await readFile('src/lib/'+file,'utf8');
    const transformer=ctx=>{
      const visit=node=>{
        // ES2019 no incluye Array.at; el único uso del dominio es ms.at(-1).
        // Bajar esa lectura sin tocar prototipos globales ni la fuente C4.
        if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='at'){
          const receiver=node.expression.expression,arg=node.arguments[0];
          if(!ts.isIdentifier(receiver)||node.arguments.length!==1||!arg||!ts.isPrefixUnaryExpression(arg)||arg.operator!==ts.SyntaxKind.MinusToken||!ts.isNumericLiteral(arg.operand)||arg.operand.text!=='1')throw new Error('Array.at requiere revisión: '+file);
          return ts.factory.createElementAccessExpression(receiver,ts.factory.createBinaryExpression(ts.factory.createPropertyAccessExpression(receiver,'length'),ts.SyntaxKind.MinusToken,ts.factory.createNumericLiteral(1)));
        }
        if(ts.isFunctionDeclaration(node) && ((file.endsWith('planMixtoV2.ts') && node.name?.text==='hashV2') || (file.endsWith('asignacionV2.ts') && node.name?.text==='sha'))) {
          const arg=file.endsWith('planMixtoV2.ts')?'canonV2(v)':'canon(valor)';
          const body=ts.factory.createBlock([ts.factory.createReturnStatement(ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(ts.factory.createCallExpression(ts.factory.createIdentifier('require'),undefined,[ts.factory.createStringLiteral('./sha256.ts')]),'sha256Texto'),undefined,
            [ts.factory.createCallExpression(ts.factory.createIdentifier(arg.startsWith('canonV2')?'canonV2':'canon'),undefined,[ts.factory.createIdentifier(arg.startsWith('canonV2')?'v':'valor')])]))],true);
          return ts.factory.updateFunctionDeclaration(node,node.modifiers?.filter(m=>m.kind!==ts.SyntaxKind.AsyncKeyword),node.asteriskToken,node.name,node.typeParameters,node.parameters,node.type,body);
        }
        if(ts.isAwaitExpression(node))return ts.visitNode(node.expression,visit);
        if(ts.isCallExpression(node) && node.expression.getText?.().replace(/\s/g,'')==='Promise.all') {
          if(node.arguments.length!==1 || !ts.isArrayLiteralExpression(node.arguments[0]))throw new Error('Promise.all no estático: requiere revisión');
          return ts.visitNode(node.arguments[0],visit);
        }
        let n=ts.visitEachChild(node,visit,ctx);
        if(n.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword))n=ts.factory.replaceModifiers(n,n.modifiers.filter(m=>m.kind!==ts.SyntaxKind.AsyncKeyword));
        return n;
      };return sf=>ts.visitNode(sf,visit);
    };
    // El parser GAS rechaza campos públicos de clase ES2022. ES2019 transpila
    // esos campos, optional chaining y nullish sin cambiar el dominio fuente.
    const js=ts.transpileModule(src,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2019,module:ts.ModuleKind.CommonJS},transformers:{before:[transformer]}}).outputText;
    if(/\b(?:async|await|Promise|TextEncoder|crypto\.subtle)\b/.test(js.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'')))throw new Error('Runtime async residual: '+file);
    factories.push(JSON.stringify(file)+':function(require,exports){\n'+js+'\n}');
  }
  return INICIO_C5+'\nvar DominioPedidoDurableC5=(function(){\n'+
    'function structuredClone(v){return JSON.parse(JSON.stringify(v));}\nvar factories={\n'+factories.join(',\n')+'\n},cache={};\n'+
    'function load(id){if(cache[id])return cache[id];var exports=cache[id]={};factories[id](function(rel){var parts=id.split("/");parts.pop();rel.split("/").forEach(function(x){if(x==="..")parts.pop();else if(x!==".")parts.push(x);});return load(parts.join("/"));},exports);return exports;}\n'+
    'return {pedido:load("familias/pedidoV2.ts"),motor:load("familias/asignacionV2.ts"),plan:load("familias/planMixtoV2.ts"),durable:load("familias/adaptadorDurableV2.ts"),revision:load("familias/revisionV1.ts"),esquema:load("familias/esquemaDurableV2.ts"),sha:load("familias/sha256.ts")};\n})();\n'+FIN_C5;
}
if(process.argv[1] && path.resolve(process.argv[1])===path.resolve(import.meta.filename)) {
  const file='scripts/apps-script-pedidos.gs',current=await readFile(file,'utf8'),bloque=await generarDominioC5();
  const start=current.indexOf(INICIO_C5),end=current.indexOf(FIN_C5);
  if(process.argv.includes('--check')) {if(start<0 || current.slice(start,end+FIN_C5.length).replaceAll('\r\n','\n')!==bloque)throw new Error('Dominio C5 generado desactualizado');}
  else await writeFile(file,start<0?current.trimEnd()+'\n\n'+bloque+'\n':current.slice(0,start)+bloque+current.slice(end+FIN_C5.length));
  console.log(JSON.stringify({dominio_c5_generado:true,solo_local:true,modulos:fuentes.length}));
}
