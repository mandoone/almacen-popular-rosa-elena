export interface ResumenCajaTurno {
 apertura_id:string;total_cobrado:number;total_efectivo_esperado:number;total_transferencia:number;
 total_pendiente_pago:number;cantidad_pendientes_pago:number;advertencias:string[];
}
export interface GastoAperturaTurno {gasto_id:string;apertura_id:string;forma_pago:'efectivo'|'transferencia';monto:number}
export function prepararArqueoTurno(resumen:ResumenCajaTurno,gastos:readonly GastoAperturaTurno[],saldoInicial:number,contado:number){
 const valores=[saldoInicial,contado,resumen.total_cobrado,resumen.total_efectivo_esperado,resumen.total_transferencia,resumen.total_pendiente_pago,...gastos.map(g=>g.monto)];
 if(valores.some(n=>!Number.isSafeInteger(n)||n<0))throw new Error('Montos CLP enteros no negativos requeridos; no completar saldos vacíos.');
 const relacionados=gastos.filter(g=>g.apertura_id===resumen.apertura_id);
 if(new Set(relacionados.map(g=>g.gasto_id)).size!==relacionados.length)throw new Error('Gasto duplicado.');
 if(relacionados.some(g=>!['efectivo','transferencia'].includes(g.forma_pago)))throw new Error('Medio de gasto no acreditado.');
 const egresos=relacionados.filter(g=>g.forma_pago==='efectivo').reduce((a,g)=>a+g.monto,0);
 const esperado=saldoInicial+resumen.total_efectivo_esperado-egresos,diferencia=contado-esperado;
 if(!Number.isSafeInteger(esperado)||!Number.isSafeInteger(diferencia))throw new Error('Arqueo fuera del rango seguro.');
 return {saldo_inicial:saldoInicial,efectivo_cobrado:resumen.total_efectivo_esperado,transferencias_cobradas:resumen.total_transferencia,pagos_pendientes:resumen.total_pendiente_pago,gastos_efectivo:egresos,efectivo_esperado:esperado,efectivo_contado:contado,diferencia,
  advertencias:[...resumen.advertencias,...(resumen.cantidad_pendientes_pago?['Hay pagos pendientes; revisar explícitamente antes de archivar.']:[]),...(diferencia?['Diferencia de efectivo requiere observación y revisión.']:[])]};
}
export const COLUMNAS_CIERRES_CAJA_TURNO=['cierre_id','apertura_id','fecha_hora','responsable','estado_cierre','saldo_inicial','efectivo_cobrado','transferencias_cobradas','pagos_pendientes','gastos_efectivo','efectivo_esperado','efectivo_contado','diferencia','observaciones','snapshot_json','fuente_hash','idempotency_key','payload_hash'] as const;
