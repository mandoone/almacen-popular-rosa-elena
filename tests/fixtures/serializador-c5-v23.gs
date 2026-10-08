function serializarFilaC5_(tabla, fila) {
  var d = DominioPedidoDurableC5, r = Object.assign({}, fila);
  if (tabla === 'PEDIDOS') {
    r = { estado_pedido: fila.estado, operacion_asignacion_vigente: fila.operacion_asignacion_vigente || '',
      evidencia_estado_v2: fila.evidencia_estado_v2 ? JSON.stringify(fila.evidencia_estado_v2) : '',
      evidencia_puntero_v2: fila.evidencia_puntero_v2 ? JSON.stringify(fila.evidencia_puntero_v2) : '' };
  } else if (tabla === 'PRODUCTOS') {
    r = { stock_actual: fila.stock_actual, revision_stock_v2: fila.revision_stock_v2,
      evidencia_stock_v2: JSON.stringify(fila.evidencia_stock_v2) };
  } else if (tabla === 'MOVIMIENTOS_STOCK') {
    r = {};
    Object.keys(d.esquema.MAPEO_MOVIMIENTO_C5).forEach(function (k) { r[d.esquema.MAPEO_MOVIMIENTO_C5[k]] = fila[k]; });
    var extra = { modelo: d.esquema.MODELO_OBSERVACION_MOVIMIENTO_C5 };
    d.esquema.CAMPOS_OBSERVACION_MOVIMIENTO_C5.forEach(function (k) { if (fila[k] !== undefined) extra[k] = fila[k]; });
    r.observacion = JSON.stringify(extra); r.id_movimiento = fila.movimiento_id; r.id_producto = fila.producto_id;
    r.tipo = fila.tipo; r.origen = 'PEDIDO_V2_QA'; r.id_origen = fila.operacion_id; r.referencia_tipo = 'PEDIDO_V2_QA';
  }
  return r;
}
