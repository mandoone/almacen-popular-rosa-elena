/** C5: preflight/planificador y migrador con puerto INYECTADO. Cero Google APIs en el dominio. */
import { COLUMNAS_ADITIVAS_C5, COLUMNAS_ASIGNACIONES_PEDIDO, COLUMNAS_DIARIO_REQUERIDAS_C5 } from '../../src/lib/familias/esquemaDurableV2.ts';
import { obtenerBloqueosOperativos } from '../../src/lib/familias/adaptadorDurableV2.ts';
import { revisionV1Acreditada } from '../../src/lib/familias/revisionV1.ts';
import { ID_TEST_B2, NOMBRE_TEST_B2, FAMILIAS_B2, firmaEstadoB2 } from './familias-b2.mjs';

function exigir(condicion, codigo) { if (!condicion) throw new Error(codigo); }
const filasObjetos = filas => filas.slice(1).filter(r => r.some(x => x !== '' && x !== undefined))
  .map(r => Object.fromEntries(filas[0].map((h, i) => [h, r[i] ?? ''])));
const columnasIds = {
  PRODUCTOS: ['id_producto'], FAMILIAS_PRODUCTO: ['familia_id'], PEDIDOS: ['id_pedido'],
  OPERACIONES_PEDIDOS: ['operacion_id', 'idempotency_key'],
  MOVIMIENTOS_STOCK: ['movimiento_id'], // id_movimiento es alias legado no necesariamente único.
  ASIGNACIONES_PEDIDO: ['asignacion_id'], DETALLE_PEDIDOS: ['id_detalle_pedido'],
  COMPRAS: ['compra_id'], DETALLE_COMPRAS: ['detalle_compra_id'], VENTAS: ['venta_id'],
};

/** Devuelve ubicaciones y códigos, nunca contactos, tokens, payloads o IDs privados. */
export function auditarPreflightC5(meta, valores) {
  const problemas = [];
  if (meta?.spreadsheetId !== ID_TEST_B2 || meta?.properties?.title !== NOMBRE_TEST_B2)
    return { seguro: false, problemas: [{ codigo: 'DESTINO_TEST_NO_VERIFICADO' }] };
  const titulos = meta.sheets.map(s => s.properties.title);
  if (new Set(titulos).size !== titulos.length) problemas.push({ codigo: 'PESTANAS_DUPLICADAS' });
  for (const titulo of titulos) {
    const matriz = valores[titulo], h = matriz?.[0];
    if (!h?.length || h.some(x => typeof x !== 'string' || !x.trim()) || new Set(h).size !== h.length) {
      problemas.push({ codigo: 'HEADERS_INVALIDOS_O_DUPLICADOS', hoja: titulo }); continue;
    }
    if (matriz.slice(1).some(r => r.slice(h.length).some(v => v !== undefined && v !== '')))
      problemas.push({ codigo: 'DATOS_SIN_HEADER', hoja: titulo });
    for (const columna of columnasIds[titulo] ?? []) {
      const index = h.indexOf(columna); if (index < 0) continue;
      const grupos = new Map();
      matriz.slice(1).forEach((r, i) => { if (r[index] !== undefined && r[index] !== '') {
        const id = String(r[index]); grupos.set(id, [...(grupos.get(id) ?? []), i + 2]);
      } });
      for (const filas of grupos.values()) if (filas.length > 1)
        problemas.push({ codigo: 'ID_DUPLICADO', hoja: titulo, columna, filas });
    }
  }
  for (const hoja of ['PRODUCTOS', 'PEDIDOS', 'DETALLE_PEDIDOS', 'MOVIMIENTOS_STOCK', 'OPERACIONES_PEDIDOS', 'FAMILIAS_PRODUCTO'])
    if (!titulos.includes(hoja)) problemas.push({ codigo: 'HOJA_REQUERIDA_AUSENTE', hoja });
  // Nunca parsear un diario sobre headers ambiguos.
  if (problemas.some(p => ['HEADERS_INVALIDOS_O_DUPLICADOS', 'HOJA_REQUERIDA_AUSENTE'].includes(p.codigo)))
    return { seguro: false, problemas };
  if (COLUMNAS_DIARIO_REQUERIDAS_C5.some(c => !valores.OPERACIONES_PEDIDOS[0].includes(c)))
    problemas.push({ codigo: 'DIARIO_CONTRATO_INCOMPLETO' });
  if (firmaEstadoB2(valores.FAMILIAS_PRODUCTO[0]) !== firmaEstadoB2(FAMILIAS_B2))
    problemas.push({ codigo: 'CONTRATO_FAMILIAS_DIFERENTE' });
  if (filasObjetos(valores.FAMILIAS_PRODUCTO).length) problemas.push({ codigo: 'FAMILIAS_PREEXISTENTES' });
  if (filasObjetos(valores.PRODUCTOS).some(s => s.familia_id)) problemas.push({ codigo: 'MAPA_COMERCIAL_PREEXISTENTE' });
  const ops = filasObjetos(valores.OPERACIONES_PEDIDOS), bloqueos = obtenerBloqueosOperativos(ops);
  const incompletas = ops.filter(o => o.estado_operacion !== 'COMPLETADA' && !revisionV1Acreditada(o));
  if (bloqueos.global) problemas.push({ codigo: 'DIARIO_INCOMPLETO_BLOQUEO_GLOBAL', cantidad: incompletas.length });
  else if (incompletas.length) problemas.push({ codigo: 'OPERACIONES_INCOMPLETAS', cantidad: incompletas.length });
  return { seguro: problemas.length === 0, problemas, operaciones_incompletas: incompletas.length,
    bloqueo_global: bloqueos.global, conteos: Object.fromEntries(titulos.map(t => [t, filasObjetos(valores[t]).length])) };
}

/** Requests Sheets solamente como datos. No ejecuta ni crea un cliente remoto. */
export function planificarEsquemaPedidoFamiliasC5Test(meta, valores) {
  const auditoria = auditarPreflightC5(meta, valores);
  exigir(auditoria.seguro, 'STOP_C5_PREFLIGHT:' + auditoria.problemas.map(p => p.codigo).join(','));
  const requests = [], columnas = {};
  for (const [nombre, contrato] of Object.entries(COLUMNAS_ADITIVAS_C5)) {
    const s = meta.sheets.find(s => s.properties.title === nombre).properties, h = valores[nombre][0];
    const faltantes = contrato.filter(c => !h.includes(c)); columnas[nombre] = faltantes;
    if (!faltantes.length) continue;
    const fin = h.length + faltantes.length;
    if (fin > s.gridProperties.columnCount)
      requests.push({ appendDimension: { sheetId: s.sheetId, dimension: 'COLUMNS', length: fin - s.gridProperties.columnCount } });
    requests.push({ updateCells: { range: { sheetId: s.sheetId, startRowIndex: 0, endRowIndex: 1,
      startColumnIndex: h.length, endColumnIndex: fin }, rows: [{ values: faltantes.map(stringValue => ({ userEnteredValue: { stringValue } })) }], fields: 'userEnteredValue' } });
  }
  const existente = meta.sheets.find(s => s.properties.title === 'ASIGNACIONES_PEDIDO');
  if (existente) {
    exigir(firmaEstadoB2(valores.ASIGNACIONES_PEDIDO[0]) === firmaEstadoB2(COLUMNAS_ASIGNACIONES_PEDIDO), 'STOP_C5_CONTRATO_ASIGNACIONES');
    exigir(filasObjetos(valores.ASIGNACIONES_PEDIDO).length === 0, 'STOP_C5_ASIGNACIONES_PREEXISTENTES');
  } else {
    const sheetId = Math.max(...meta.sheets.map(s => s.properties.sheetId)) + 1;
    exigir(Number.isSafeInteger(sheetId), 'STOP_C5_SHEET_ID_INVALIDO');
    requests.push({ addSheet: { properties: { sheetId, title: 'ASIGNACIONES_PEDIDO',
      gridProperties: { rowCount: 1000, columnCount: 26, frozenRowCount: 1 } } } });
    requests.push({ updateCells: { range: { sheetId, startRowIndex: 0, endRowIndex: 1,
      startColumnIndex: 0, endColumnIndex: COLUMNAS_ASIGNACIONES_PEDIDO.length },
    rows: [{ values: COLUMNAS_ASIGNACIONES_PEDIDO.map(stringValue => ({ userEnteredValue: { stringValue } })) }], fields: 'userEnteredValue' } });
  }
  return { requests, columnas, hojas_nuevas: existente ? 0 : 1,
    headers_nuevos: Object.values(columnas).reduce((n, a) => n + a.length, 0) + (existente ? 0 : COLUMNAS_ASIGNACIONES_PEDIDO.length),
    cambios: requests.length };
}

/** Backup nativo recuperable: matrices con fórmulas + estructura/celdas, no un CSV. */
export function verificarBackupC5(antes, backup) {
  if (!backup?.meta?.spreadsheetId || backup.meta.spreadsheetId === antes.meta.spreadsheetId
    || !backup.meta.properties.title.startsWith('BACKUP TEST FAMILIAS C5 ')) return false;
  const estructura = meta => meta.sheets.map(s => ({ title: s.properties.title,
    index: s.properties.index, sheetType: s.properties.sheetType, gridProperties: s.properties.gridProperties }));
  return Boolean(antes.celdas && backup.celdas && firmaEstadoB2(estructura(antes.meta)) === firmaEstadoB2(estructura(backup.meta))
    && firmaEstadoB2(antes.valores) === firmaEstadoB2(backup.valores)
    && firmaEstadoB2(antes.celdas) === firmaEstadoB2(backup.celdas));
}

/** STOP precede incluso al backup. Un ejecutor autorizado puede inyectar un puerto TEST real. */
export async function prepararPedidoFamiliasC5Test(adapter) {
  const antes = await adapter.leer();
  const plan = planificarEsquemaPedidoFamiliasC5Test(antes.meta, antes.valores);
  if (!plan.cambios) return { cambios: 0, backup: null, readback: antes };
  exigir(antes.celdas && Object.keys(antes.celdas).length === antes.meta.sheets.length, 'STOP_C5_CELDAS_NATIVAS_FALTANTES');
  const backup = await adapter.backup('BACKUP TEST FAMILIAS C5 ' + adapter.timestamp());
  exigir(verificarBackupC5(antes, backup), 'STOP_C5_BACKUP_NO_CONFIABLE');
  const vigente = await adapter.leer();
  exigir(firmaEstadoB2(vigente) === firmaEstadoB2(antes), 'STOP_C5_CAMBIO_CONCURRENTE');
  await adapter.aplicar(plan.requests);
  const despues = await adapter.leer();
  for (const [hoja, matriz] of Object.entries(antes.valores)) for (let r = 0; r < matriz.length; r++)
    for (let c = 0; c < matriz[r].length; c++)
      exigir((despues.valores[hoja]?.[r]?.[c] ?? '') === (matriz[r][c] ?? ''), 'STOP_C5_CELDA_HISTORICA_MODIFICADA');
  for (const [hoja, matriz] of Object.entries(antes.celdas)) for (let r = 0; r < matriz.length; r++)
    for (let c = 0; c < matriz[r].length; c++) {
      // Las lecturas de la cuadrícula completa incluyen headers vacíos reservados.
      // Únicamente los headers añadidos por ESTE plan pueden ocupar esas celdas.
      const inicio = antes.valores[hoja][0].length;
      if (r === 0 && c >= inicio && c < inicio + (plan.columnas[hoja]?.length ?? 0)) continue;
      exigir(firmaEstadoB2(despues.celdas?.[hoja]?.[r]?.[c] ?? {}) === firmaEstadoB2(matriz[r][c] ?? {}), 'STOP_C5_ESTRUCTURA_HISTORICA_MODIFICADA');
    }
  exigir(planificarEsquemaPedidoFamiliasC5Test(despues.meta, despues.valores).cambios === 0, 'STOP_C5_READBACK_INCOMPLETO');
  return { cambios: plan.cambios, backup: backup.meta.spreadsheetId, readback: despues };
}
