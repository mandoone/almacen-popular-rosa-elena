/** ContentService devuelve un redirect de lectura. Nunca repetir el POST para recuperarlo. */
export function esFalloServicioSheetsC5(response){
  return response?.ok===false&&response.codigo===500&&typeof response.error==='string'
    && /^(El servicio Hojas de cálculo falló al acceder al documento|Service Spreadsheets failed while accessing document)/.test(response.error);
}
export async function solicitarHttpC5(config,method,action,body={},options={}){
  const request=options.fetch??globalThis.fetch;
  const url=new URL(config.url);
  if(method==='GET')url.search=new URLSearchParams({action,token:config.token,_request_id:crypto.randomUUID()});
  const initial=await request(url,{method,redirect:'manual',signal:AbortSignal.timeout(210000),
    ...(method==='POST'?{headers:{'Content-Type':'application/json'},body:JSON.stringify({action,token:config.token,...body})}:{})});
  if([302,303].includes(initial.status)){
    const location=initial.headers.get('location');if(!location)throw new Error('REDIRECT_C5_SIN_DESTINO');
    const target=new URL(location);
    if(target.protocol!=='https:'||target.hostname!=='script.googleusercontent.com'||target.username||target.password)throw new Error('REDIRECT_C5_NO_VERIFICADO');
    // Solo releer SU MISMA respuesta opaca hasta tres veces: doPost ya ejecutó.
    let last;
    for(let attempt=0;attempt<3;attempt++){
      try{const r=await request(target,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(45000)});
        if(!r.ok)throw new Error('HTTP_AMBIGUO_'+r.status);return await r.json();
      }catch(e){last=e;}
    }
    throw new Error('RESPUESTA_C5_AMBIGUA_'+(last?.name??'HTTP'));
  }
  if(!initial.ok)throw new Error('HTTP_AMBIGUO_'+initial.status);return initial.json();
}
