/** Plan declarativo local. No abre Google ni ejecuta escrituras. */
import {COLUMNAS_CIERRES_CAJA_TURNO} from '../src/lib/fase8/cajaTurno.ts';
import assert from 'node:assert/strict';
export function planEsquemaCajaTurno({id,nombre,hojas,headersExistentes=[]}) {
 assert.equal(id,'1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM');
 assert.equal(nombre,'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES');
 if(hojas.includes('CIERRES_CAJA')){assert.deepEqual(headersExistentes,[...COLUMNAS_CIERRES_CAJA_TURNO]);return [];}
 const sheetId=1824139800;
 return [
  {addSheet:{properties:{sheetId,title:'CIERRES_CAJA',gridProperties:{rowCount:1000,columnCount:18,frozenRowCount:1}}}},
  {updateCells:{start:{sheetId,rowIndex:0,columnIndex:0},rows:[{values:COLUMNAS_CIERRES_CAJA_TURNO.map(stringValue=>({userEnteredValue:{stringValue}}))}],fields:'userEnteredValue'}},
  {repeatCell:{range:{sheetId,startRowIndex:0,endRowIndex:1,startColumnIndex:0,endColumnIndex:18},cell:{userEnteredFormat:{textFormat:{bold:true},backgroundColor:{red:0.9,green:0.94,blue:0.91}}},fields:'userEnteredFormat'}},
 ];
}
