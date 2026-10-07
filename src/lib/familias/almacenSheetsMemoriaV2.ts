/** Simulador C4 exclusivamente local. Estado compartido permite recrear procesos tras una caída. */
import { exigirV2 } from './pedidoV2.ts';
import { canonV2, copiaV2 } from './planMixtoV2.ts';
import { type AlmacenSheetsLocalV2, type TablasSheetsLocalV2, type TablaSheetsLocalV2 } from './adaptadorDurableV2.ts';

export type HojasMemoriaV2 = { [K in TablaSheetsLocalV2]: TablasSheetsLocalV2[K][] };
export interface EstadoSheetsMemoriaV2 {
  hojas: HojasMemoriaV2;
  eventos: { punto: string; escritura: boolean }[];
  cola: Promise<void>;
  propietario?: symbol;
}
export function crearEstadoSheetsMemoriaV2(inicial: Partial<HojasMemoriaV2> = {}): EstadoSheetsMemoriaV2 {
  return { hojas: copiaV2({ PEDIDOS: [], DETALLE_PEDIDOS: [], PRODUCTOS: [], MOVIMIENTOS_STOCK: [],
    OPERACIONES_PEDIDOS: [], ASIGNACIONES_PEDIDO: [], FAMILIAS_PRODUCTO: [], APERTURA_PRODUCTOS: [], ...inicial }), eventos: [], cola: Promise.resolve() };
}
export class InterrupcionSimuladaV2 extends Error {
  readonly punto: string;
  readonly modo: 'CAIDA' | 'TIMEOUT' | '502';
  constructor(punto: string, modo: 'CAIDA' | 'TIMEOUT' | '502') { super(modo + ':' + punto); this.name = 'InterrupcionSimuladaV2'; this.punto = punto; this.modo = modo; }
}
export class AlmacenSheetsMemoriaV2 implements AlmacenSheetsLocalV2 {
  readonly estado: EstadoSheetsMemoriaV2;
  private readonly propietario = Symbol('proceso-mock');
  private fallo?: { punto: string; modo: InterrupcionSimuladaV2['modo'] };
  /** Hook de pruebas: también permite corrupción o intervención externa que ignora el lock. */
  despuesPaso?: (punto: string, estado: EstadoSheetsMemoriaV2) => void | Promise<void>;
  constructor(estado: EstadoSheetsMemoriaV2) { this.estado = estado; }
  programarFallo(punto: string, modo: InterrupcionSimuladaV2['modo'] = 'CAIDA') { this.fallo = { punto, modo }; }
  async conLock<T>(trabajo: () => Promise<T>): Promise<T> {
    const anterior = this.estado.cola;
    let liberar!: () => void;
    this.estado.cola = new Promise<void>(resolve => { liberar = resolve; });
    await anterior;
    this.estado.propietario = this.propietario;
    try { return await trabajo(); }
    finally { this.estado.propietario = undefined; liberar(); }
  }
  async leer<K extends TablaSheetsLocalV2>(tabla: K): Promise<TablasSheetsLocalV2[K][]> { return copiaV2(this.estado.hojas[tabla]); }
  private exigirLock() { exigirV2(this.estado.propietario === this.propietario, 'MOCK_ESCRITURA_SIN_LOCK', 423); }
  async insertar<K extends TablaSheetsLocalV2>(tabla: K, fila: TablasSheetsLocalV2[K], punto: string) {
    this.exigirLock(); this.estado.hojas[tabla].push(copiaV2(fila)); await this.emitir(punto, true);
  }
  async reemplazar<K extends TablaSheetsLocalV2>(tabla: K, clave: keyof TablasSheetsLocalV2[K], id: string,
    esperado: TablasSheetsLocalV2[K], nuevo: TablasSheetsLocalV2[K], punto: string) {
    this.exigirLock();
    const filas = this.estado.hojas[tabla], indices = filas.flatMap((f, i) => f[clave] === id ? [i] : []);
    exigirV2(indices.length === 1 && canonV2(filas[indices[0]]) === canonV2(esperado), 'CAS_FILA_CONFLICTO', 409);
    filas[indices[0]] = copiaV2(nuevo); await this.emitir(punto, true);
  }
  async eliminar<K extends TablaSheetsLocalV2>(tabla: K, clave: keyof TablasSheetsLocalV2[K], id: string,
    esperado: TablasSheetsLocalV2[K], punto: string) {
    this.exigirLock();
    const filas = this.estado.hojas[tabla], indices = filas.flatMap((f, i) => f[clave] === id ? [i] : []);
    exigirV2(indices.length === 1 && canonV2(filas[indices[0]]) === canonV2(esperado), 'CAS_FILA_CONFLICTO', 409);
    filas.splice(indices[0], 1); await this.emitir(punto, true);
  }
  async punto(nombre: string) { await this.emitir(nombre, false); }
  private async emitir(punto: string, escritura: boolean) {
    this.estado.eventos.push({ punto, escritura });
    await this.despuesPaso?.(punto, this.estado);
    if (this.fallo?.punto === punto) { const modo = this.fallo.modo; this.fallo = undefined; throw new InterrupcionSimuladaV2(punto, modo); }
  }
}

/** HTTP simulado: puede perder una respuesta incluso después de completar el backend. */
export async function llamadaHttpMockV2<T>(backend: () => Promise<T>, perderRespuesta?: 'TIMEOUT' | '502'): Promise<T> {
  const res = await backend();
  if (perderRespuesta) throw new InterrupcionSimuladaV2('RESPUESTA_HTTP', perderRespuesta);
  return res;
}
