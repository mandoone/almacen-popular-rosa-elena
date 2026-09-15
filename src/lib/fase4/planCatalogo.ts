export const NOMBRE_SHEET_TEST_CATALOGO =
  'TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES';

export const CAMPOS_EDITABLES_CATALOGO = [
  'activo',
  'nombre',
  'categoria',
  'prioridad',
  'unidad_medida',
  'permite_decimal',
  'paso_venta',
  'precio_costo',
  'margen_pct',
  'precio_venta',
  'stock_minimo',
  'imagen_url',
] as const;

export type CampoEditableCatalogo = (typeof CAMPOS_EDITABLES_CATALOGO)[number];
type ValoresCatalogo = Partial<Record<CampoEditableCatalogo, unknown>>;

export interface CambioPlanCatalogo {
  id_producto: string;
  decision_id: string;
  esperado: ValoresCatalogo;
  propuesto: ValoresCatalogo;
}

export interface PlanCatalogoTest {
  entorno: 'TEST';
  sheet_nombre: string;
  cambios: CambioPlanCatalogo[];
}

export interface ResultadoPlanCatalogo {
  ok: boolean;
  errores: string[];
  productos: number;
  campos: number;
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
    ? valor as Record<string, unknown>
    : null;
}

function iguales(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function validarPlanCatalogoTest(valor: unknown): ResultadoPlanCatalogo {
  const errores: string[] = [];
  const plan = objeto(valor);
  if (!plan) return { ok: false, errores: ['El plan debe ser un objeto JSON.'], productos: 0, campos: 0 };
  if (plan.entorno !== 'TEST') errores.push('El plan debe declarar entorno TEST.');
  if (plan.sheet_nombre !== NOMBRE_SHEET_TEST_CATALOGO) {
    errores.push('El nombre de la Sheet no corresponde al destino TEST autorizado.');
  }
  if (!Array.isArray(plan.cambios) || plan.cambios.length === 0) {
    errores.push('El plan debe contener al menos un cambio.');
  }
  if (Array.isArray(plan.cambios) && plan.cambios.length > 200) {
    errores.push('El plan supera el máximo de 200 productos.');
  }

  const productos = new Set<string>();
  const pares = new Set<string>();
  let campos = 0;
  for (const [indice, valorCambio] of (Array.isArray(plan.cambios) ? plan.cambios : []).entries()) {
    const cambio = objeto(valorCambio);
    const etiqueta = `cambio ${indice + 1}`;
    if (!cambio) {
      errores.push(`${etiqueta}: debe ser un objeto.`);
      continue;
    }
    const id = String(cambio.id_producto ?? '').trim();
    if (!/^PROD-[A-Z0-9-]{1,80}$/.test(id)) errores.push(`${etiqueta}: id_producto inválido.`);
    else productos.add(id);
    if (!/^F4-[0-9]{2}$/.test(String(cambio.decision_id ?? ''))) {
      errores.push(`${etiqueta}: decision_id debe usar el formato F4-XX.`);
    }
    const esperado = objeto(cambio.esperado);
    const propuesto = objeto(cambio.propuesto);
    if (!esperado || !propuesto || Object.keys(propuesto ?? {}).length === 0) {
      errores.push(`${etiqueta}: esperado y propuesto deben declarar campos.`);
      continue;
    }
    for (const [campo, nuevoValor] of Object.entries(propuesto)) {
      campos += 1;
      if (!(CAMPOS_EDITABLES_CATALOGO as readonly string[]).includes(campo)) {
        errores.push(`${etiqueta}: campo no editable: ${campo}.`);
        continue;
      }
      if (!(campo in esperado)) {
        errores.push(`${etiqueta}: falta el valor esperado de ${campo}.`);
      } else if (iguales(esperado[campo], nuevoValor)) {
        errores.push(`${etiqueta}: ${campo} no contiene un cambio.`);
      }
      const par = `${id}:${campo}`;
      if (pares.has(par)) errores.push(`${etiqueta}: ${campo} está repetido para ${id}.`);
      pares.add(par);
    }
    if ('stock_actual' in esperado || 'stock_actual' in propuesto) {
      errores.push(`${etiqueta}: stock_actual requiere un movimiento auditado separado.`);
    }
  }

  return { ok: errores.length === 0, errores, productos: productos.size, campos };
}
