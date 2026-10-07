import { ID_TEST_B2, NOMBRE_TEST_B2, firmaEstadoB2, planificarFamiliasB2 } from './familias-b2.mjs';
export const AUDITORIA_FAMILIAS_B3 = ['entidad_tipo', 'entidad_id', 'payload_hash', 'resultado_json'];
export function planificarAuditoriaFamiliasB3(estado) {
  if (estado.meta.spreadsheetId !== ID_TEST_B2 || estado.meta.properties.title !== NOMBRE_TEST_B2) throw new Error('Destino B3 no autorizado');
  if (planificarFamiliasB2(estado.meta, estado.valores).requests.length) throw new Error('B2 incompleta');
  const tab = estado.meta.sheets.find(s => s.properties.title === 'AUDITORIA_PRODUCTOS');
  const filas = estado.valores.AUDITORIA_PRODUCTOS, headers = filas?.[0];
  if (!tab || !headers?.length || new Set(headers).size !== headers.length) throw new Error('Auditoría ausente/duplicada');
  for (const c of AUDITORIA_FAMILIAS_B3) {
    const i = headers.indexOf(c);
    if (i >= 0 && filas.slice(1).some(f => f[i] !== undefined && f[i] !== '')) throw new Error('B3 no permite datos nuevos reales');
  }
  const faltantes = AUDITORIA_FAMILIAS_B3.filter(c => !headers.includes(c));
  return faltantes.length ? [{ updateCells: { start: { sheetId: tab.properties.sheetId, rowIndex: 0, columnIndex: headers.length }, rows: [{ values: faltantes.map(c => ({ userEnteredValue: { stringValue: c } })) }], fields: 'userEnteredValue' } }] : [];
}
export async function prepararAuditoriaFamiliasB3Test(adapter) {
  const antes = await adapter.leer(), requests = planificarAuditoriaFamiliasB3(antes);
  if (!requests.length) return { cambios: 0, backup: null, readback: antes };
  const backup = await adapter.backup(antes);
  if (!backup?.verificado) throw new Error('Backup B3 no verificado');
  if (firmaEstadoB2(await adapter.leer()) !== firmaEstadoB2(antes)) throw new Error('Concurrencia B3');
  await adapter.aplicar(requests);
  const despues = await adapter.leer();
  for (const [tab, filas] of Object.entries(antes.valores)) for (let r = 0; r < filas.length; r++) for (let c = 0; c < filas[r].length; c++) {
    if (firmaEstadoB2(filas[r][c] ?? '') !== firmaEstadoB2(despues.valores[tab]?.[r]?.[c] ?? '')) throw new Error('Readback B3 difiere');
  }
  if (planificarAuditoriaFamiliasB3(despues).length) throw new Error('B3 incompleta');
  return { cambios: requests.length, backup, readback: despues };
}
