/** Plan estructural puro; el ejecutor verifica backup antes de enviar requests. */
export const ID_TEST_B2 = '1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM';
export const NOMBRE_TEST_B2 = 'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES';
export const FAMILIAS_B2 = ['familia_id','activo','nombre_publico','categoria','precio_venta','modo_venta','unidad_venta','permite_decimal','paso_venta','gramos_referencia','contenido_cantidad','contenido_unidad','presentacion_publica','politica_marca','marca_publica','imagen_url','version_oferta','actualizado_en'];
export const IDENTIDAD_B2 = ['familia_id','marca','presentacion','contenido_cantidad','contenido_unidad'];
export const SNAPSHOTS_B2 = [...IDENTIDAD_B2.map(c => c + '_snapshot'), 'gramos_unidad_stock_snapshot'];

export function firmaEstadoB2(valor) {
  const ordenar = v => Array.isArray(v) ? v.map(ordenar) : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, ordenar(v[k])])) : v;
  return JSON.stringify(ordenar(valor));
}

export function planificarFamiliasB2(meta, valores) {
  if (meta.spreadsheetId !== ID_TEST_B2 || meta.properties.title !== NOMBRE_TEST_B2) throw new Error('Destino B2 no autorizado.');
  const pestañas = meta.sheets.map(s => s.properties);
  if (new Set(pestañas.map(s => s.title)).size !== pestañas.length) throw new Error('Pestañas duplicadas.');
  for (const s of pestañas) {
    const filas = valores[s.title];
    if (!Array.isArray(filas) || !filas[0]?.length || filas[0].some(h => typeof h !== 'string' || !h.trim()) || new Set(filas[0]).size !== filas[0].length) throw new Error('Headers inválidos/duplicados: ' + s.title);
  }
  const productos = valores.PRODUCTOS;
  if (!productos) throw new Error('Falta PRODUCTOS.');
  const ids = productos.slice(1).map(r => r[productos[0].indexOf('id_producto')]).filter(Boolean);
  if (new Set(ids).size !== ids.length) throw new Error('SKU duplicados.');
  const requests = [], agregadas = {};
  for (const [nombre, campos] of [['PRODUCTOS', IDENTIDAD_B2], ['DETALLE_COMPRAS', SNAPSHOTS_B2]]) {
    const s = pestañas.find(s => s.title === nombre), filas = valores[nombre];
    if (!s || !filas) throw new Error('Falta hoja: ' + nombre);
    const headers = filas[0];
    for (const campo of campos) {
      const i = headers.indexOf(campo);
      if (i >= 0 && filas.slice(1).some(r => r[i] !== undefined && r[i] !== '')) throw new Error('Identidad existente no vacía: ' + campo);
    }
    const faltantes = campos.filter(c => !headers.includes(c));
    agregadas[nombre] = faltantes;
    if (!faltantes.length) continue;
    const nuevas = headers.length + faltantes.length;
    if (nuevas > s.gridProperties.columnCount) requests.push({ appendDimension: { sheetId: s.sheetId, dimension: 'COLUMNS', length: nuevas - s.gridProperties.columnCount } });
    requests.push({ updateCells: { range: { sheetId:s.sheetId,startRowIndex:0,endRowIndex:1,startColumnIndex:headers.length,endColumnIndex:nuevas },rows:[{values:faltantes.map(stringValue => ({userEnteredValue:{stringValue}}))}],fields:'userEnteredValue' } });
  }
  const familia = pestañas.find(s => s.title === 'FAMILIAS_PRODUCTO');
  if (familia) {
    if (JSON.stringify(valores.FAMILIAS_PRODUCTO[0]) !== JSON.stringify(FAMILIAS_B2) || valores.FAMILIAS_PRODUCTO.slice(1).some(r => r.some(v => v !== ''))) throw new Error('Familias reales/contrato inesperado; no modificar.');
  } else {
    const sheetId = Math.max(...pestañas.map(s => s.sheetId)) + 1;
    requests.push({ addSheet: { properties: { sheetId, title:'FAMILIAS_PRODUCTO',gridProperties:{rowCount:1000,columnCount:26,frozenRowCount:1} } } });
    requests.push({ updateCells: { range:{sheetId,startRowIndex:0,endRowIndex:1,startColumnIndex:0,endColumnIndex:18},rows:[{values:FAMILIAS_B2.map(stringValue => ({userEnteredValue:{stringValue}}))}],fields:'userEnteredValue' } });
  }
  return { requests, agregadas, crearFamilias:!familia, cambios:requests.length };
}

/** Adaptador de red inyectado: sin backup verificado nunca aplica el plan. */
export async function prepararFamiliasProductoB2Test(adapter) {
  const antes = await adapter.leer();
  const plan = planificarFamiliasB2(antes.meta, antes.valores);
  if (!plan.cambios) return { cambios:0, backup:null, readback:antes };
  const backup = await adapter.backup('BACKUP TEST FAMILIAS B2 ' + adapter.timestamp());
  if (!backup || !await adapter.verificarBackup(backup, antes)) throw new Error('Backup B2 no confiable; ABORTAR.');
  const vigente = await adapter.leer();
  if (firmaEstadoB2(vigente) !== firmaEstadoB2(antes)) throw new Error('Cambio concurrente; ABORTAR.');
  await adapter.aplicar(plan.requests);
  const despues = await adapter.leer();
  for (const [nombre, filas] of Object.entries(antes.valores)) {
    for (let i=0;i<filas.length;i++) for(let j=0;j<filas[i].length;j++) {
      if (despues.valores[nombre]?.[i]?.[j] !== filas[i][j]) throw new Error('Celda histórica modificada; STOP: ' + nombre);
    }
  }
  if (planificarFamiliasB2(despues.meta, despues.valores).cambios) throw new Error('Readback B2 incompleto; STOP.');
  return { cambios:plan.cambios, backup, readback:despues };
}
