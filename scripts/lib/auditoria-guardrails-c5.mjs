/** Allowlist exacta: solo seis llamadas de bloqueo bajo locks V1 existentes. */
export const GUARDS_V1_C5={
  prepararPlanStockPedido_:"exigirSinBloqueoDurableC5_(ss, idPedido, ids);",
  aplicarPlanOperacionPedido_:"exigirSinBloqueoDurableC5_(ss, plan.id_pedido, plan.productos.map(function (p) { return p.id_producto; }));",
  persistirVentaPresencial_:"exigirSinBloqueoDurableC5_(ss, '', entrada.lineas.map(function (p) { return p.producto_id; }));",
  persistirCompraIdempotente_:"exigirSinBloqueoDurableC5_(ss, '', entrada.lineas.map(function (p) { return p.producto_id; }));",
  actualizarProductoAdmin_:"exigirSinBloqueoDurableC5_(ss, '', [entrada.producto_id]);",
  ajustarStockAdmin_:"exigirSinBloqueoDurableC5_(ss, '', [entrada.producto_id]);",
  listarMovimientosStockAdmin_:"var operacionesV2Reporte = operacionesMovimientoReporteC5_();",
};
export function sinGuardC5(nombre,texto) {
  const guard=GUARDS_V1_C5[nombre];if(!guard)return texto;
  if(texto.split(guard).length!==2)throw new Error('Guard V1 ausente/duplicado/alterado: '+nombre);
  const sin=texto.replace(guard,'');
  if(nombre==='listarMovimientosStockAdmin_') {
    const filtro=' && movimientoCompletadoReporteC5_(movimiento, operacionesV2Reporte)';
    if(sin.split(filtro).length!==2)throw new Error('Filtro V2 ausente/duplicado/alterado');
    return sin.replace(filtro,'');
  }
  return sin;
}
export const sinLineasVacias = texto=>texto.split('\n').filter(l=>l.trim()).join('\n');
