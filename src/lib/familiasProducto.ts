/** Fase A: contrato paralelo puro. No sustituye ninguna operación SKU_V1. */
export const COLUMNAS_FAMILIAS_PRODUCTO = [
  'familia_id', 'activo', 'nombre_publico', 'categoria', 'precio_venta',
  'modo_venta', 'unidad_venta', 'permite_decimal', 'paso_venta',
  'gramos_referencia', 'contenido_cantidad', 'contenido_unidad',
  'presentacion_publica', 'politica_marca', 'marca_publica', 'imagen_url',
  'version_oferta', 'actualizado_en',
] as const;

export const COLUMNAS_IDENTIDAD_SKU_FAMILIA = [
  'familia_id', 'marca', 'presentacion', 'contenido_cantidad', 'contenido_unidad',
] as const;

export type PoliticaMarca = 'VARIABLE' | 'EXPLICITA' | 'NO_APLICA';
export type UnidadContenido = 'g' | 'ml' | 'unidad';

/** Todos los campos nuevos son opcionales en PRODUCTOS durante la convivencia. */
export interface IdentidadSkuFamilia {
  familia_id?: string;
  marca?: string;
  presentacion?: string;
  contenido_cantidad?: number;
  contenido_unidad?: UnidadContenido;
}

export interface FamiliaProducto {
  familia_id: string;
  activo: 'SI' | 'NO';
  nombre_publico: string;
  categoria: string;
  precio_venta: number;
  modo_venta: 'UNIDAD' | 'GRANEL';
  unidad_venta: 'unidad' | 'pack' | 'kg' | 'litro' | 'g';
  permite_decimal: 'SI' | 'NO';
  paso_venta: number;
  gramos_referencia?: number;
  contenido_cantidad?: number;
  contenido_unidad?: UnidadContenido;
  presentacion_publica: string;
  politica_marca: PoliticaMarca;
  marca_publica?: string;
  imagen_url?: string;
  version_oferta: number;
  actualizado_en?: string;
}

export interface SkuFamilia extends IdentidadSkuFamilia {
  id_producto: string;
  nombre: string;
  categoria: string;
  activo: 'SI' | 'NO';
  modo_venta?: 'UNIDAD' | 'GRANEL';
  unidad_medida: string;
  permite_decimal?: string | boolean;
  paso_venta?: number;
  gramos_referencia?: number;
  gramos_unidad_stock?: number;
  tipo_disponibilidad?: 'REGULAR' | 'POR_APERTURA';
  stock_actual: number;
  precio_costo?: number | '';
  precio_venta?: number;
}

export interface InconsistenciaFamilia {
  codigo: string;
  campo?: string;
  familia_id?: string;
  producto_id?: string;
}

export interface ValidacionFamilias {
  valido: boolean;
  inconsistencias: InconsistenciaFamilia[];
}

export interface ContextoDisponibilidadFamilia {
  apertura_id?: string;
  sku_habilitados?: readonly string[];
}

export interface DisponibilidadFamilia {
  familia_id: string;
  precio_venta: number | null;
  cantidad_agregada: number;
  unidad_disponibilidad: string;
  disponible: boolean;
  sku_elegibles: string[];
  inconsistencias: InconsistenciaFamilia[];
}

function registro(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
    ? valor as Record<string, unknown> : {};
}

function texto(valor: unknown): string { return typeof valor === 'string' ? valor.trim() : ''; }
function vacio(valor: unknown): boolean { return valor === undefined || valor === null || (typeof valor === 'string' && !valor.trim()); }
function normalizado(valor: unknown): string { return texto(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
function positivo(valor: unknown): valor is number { return typeof valor === 'number' && Number.isFinite(valor) && valor > 0; }
function enteroPositivo(valor: unknown): valor is number { return positivo(valor) && Number.isSafeInteger(valor); }
function resultado(inconsistencias: InconsistenciaFamilia[]): ValidacionFamilias { return { valido: inconsistencias.length === 0, inconsistencias }; }

/** Identidad opcional del maestro físico; no consulta familias ni infiere datos. */
export function validarIdentidadSkuFisica(valor: unknown): ValidacionFamilias {
  const sku = registro(valor), inconsistencias: InconsistenciaFamilia[] = [];
  const error = (codigo: string, campo: string) => inconsistencias.push({ codigo, campo, producto_id: texto(sku.id_producto) });
  if (!vacio(sku.familia_id) && (typeof sku.familia_id !== 'string' || !/^FAM-[A-Za-z0-9][A-Za-z0-9-]{0,79}$/.test(texto(sku.familia_id)))) error('FAMILIA_ID_INVALIDO', 'familia_id');
  for (const [campo, maximo] of [['marca', 120], ['presentacion', 200]] as const) {
    if (!vacio(sku[campo]) && (typeof sku[campo] !== 'string' || texto(sku[campo]).length > maximo)) error('TEXTO_IDENTIDAD_INVALIDO', campo);
  }
  if (!vacio(sku.contenido_cantidad) && (!positivo(sku.contenido_cantidad) || sku.contenido_cantidad > Number.MAX_SAFE_INTEGER)) error('CONTENIDO_INVALIDO', 'contenido_cantidad');
  if (!vacio(sku.contenido_unidad) && !['g', 'ml', 'unidad'].includes(sku.contenido_unidad as string)) error('UNIDAD_CONTENIDO_INVALIDA', 'contenido_unidad');
  return resultado(inconsistencias);
}

export function validarFamiliaProducto(valor: unknown): ValidacionFamilias {
  const f = registro(valor), inconsistencias: InconsistenciaFamilia[] = [];
  const error = (codigo: string, campo: string) => inconsistencias.push({ codigo, campo, familia_id: texto(f.familia_id) });
  if (!/^FAM-[A-Za-z0-9][A-Za-z0-9-]{0,79}$/.test(texto(f.familia_id))) error('FAMILIA_ID_INVALIDO', 'familia_id');
  for (const campo of ['stock_actual', 'precio_costo', 'proveedor']) {
    if (Object.prototype.hasOwnProperty.call(f, campo)) error('CAMPO_FISICO_EN_FAMILIA', campo);
  }
  if (!['SI', 'NO'].includes(f.activo as string)) error('ACTIVO_INVALIDO', 'activo');
  if (!texto(f.nombre_publico) || texto(f.nombre_publico).length > 200) error('NOMBRE_PUBLICO_INVALIDO', 'nombre_publico');
  if (!['granel', 'alimentos', 'limpieza', 'higiene'].includes(normalizado(f.categoria))) error('CATEGORIA_INVALIDA', 'categoria');
  if (typeof f.precio_venta !== 'number' || !Number.isSafeInteger(f.precio_venta) || f.precio_venta < 0) error('PRECIO_FAMILIAR_INVALIDO', 'precio_venta');
  if (!enteroPositivo(f.version_oferta)) error('VERSION_OFERTA_INVALIDA', 'version_oferta');
  if (!['VARIABLE', 'EXPLICITA', 'NO_APLICA'].includes(f.politica_marca as string)) error('POLITICA_MARCA_INVALIDA', 'politica_marca');
  if (f.politica_marca === 'EXPLICITA' && !texto(f.marca_publica)) error('MARCA_PUBLICA_REQUERIDA', 'marca_publica');
  if (f.politica_marca !== 'EXPLICITA' && !vacio(f.marca_publica)) error('MARCA_PUBLICA_NO_CORRESPONDE', 'marca_publica');
  if (!vacio(f.marca_publica) && (typeof f.marca_publica !== 'string' || texto(f.marca_publica).length > 120)) error('MARCA_PUBLICA_INVALIDA', 'marca_publica');
  if (!texto(f.presentacion_publica) || texto(f.presentacion_publica).length > 200) error('PRESENTACION_PUBLICA_INVALIDA', 'presentacion_publica');
  if (!vacio(f.imagen_url) && (typeof f.imagen_url !== 'string' || f.imagen_url.length > 500)) error('IMAGEN_INVALIDA', 'imagen_url');
  if (!vacio(f.actualizado_en) && typeof f.actualizado_en !== 'string') error('FECHA_AUDITORIA_INVALIDA', 'actualizado_en');
  if (!['SI', 'NO'].includes(f.permite_decimal as string)) error('DECIMALES_INVALIDOS', 'permite_decimal');
  if (!positivo(f.paso_venta)) error('PASO_VENTA_INVALIDO', 'paso_venta');
  if (f.modo_venta === 'UNIDAD') {
    if (!['unidad', 'pack', 'kg', 'litro'].includes(f.unidad_venta as string)) error('UNIDAD_VENTA_INVALIDA', 'unidad_venta');
    if (!positivo(f.contenido_cantidad)) error('CONTENIDO_INVALIDO', 'contenido_cantidad');
    if (!['g', 'ml', 'unidad'].includes(f.contenido_unidad as string)) error('UNIDAD_CONTENIDO_INVALIDA', 'contenido_unidad');
    if (f.permite_decimal === 'NO' && f.paso_venta !== 1) error('PASO_ENTERO_INVALIDO', 'paso_venta');
    if (!vacio(f.gramos_referencia)) error('REFERENCIA_GRANEL_NO_CORRESPONDE', 'gramos_referencia');
  } else if (f.modo_venta === 'GRANEL') {
    if (f.unidad_venta !== 'g' || f.permite_decimal !== 'NO' || f.paso_venta !== 1) error('ENTRADA_GRANEL_INVALIDA', 'unidad_venta');
    if (!enteroPositivo(f.gramos_referencia)) error('REFERENCIA_GRANEL_INVALIDA', 'gramos_referencia');
    if (!vacio(f.contenido_cantidad) || !vacio(f.contenido_unidad)) error('CONTENIDO_ENVASADO_EN_GRANEL', 'contenido_cantidad');
  } else error('MODO_VENTA_INVALIDO', 'modo_venta');
  return resultado(inconsistencias);
}

/** Solo compara contenido estructurado; jamás deduce equivalencia desde nombres. */
export function presentacionesEquivalentes(familia: FamiliaProducto, sku: SkuFamilia): boolean {
  return positivo(familia.contenido_cantidad) && positivo(sku.contenido_cantidad)
    && familia.contenido_cantidad === sku.contenido_cantidad
    && familia.contenido_unidad === sku.contenido_unidad;
}

export function validarRelacionSkuFamilia(sku: SkuFamilia, familia?: FamiliaProducto): ValidacionFamilias {
  if (vacio(sku.familia_id)) return resultado([]); // Legado V1: no exige campos nuevos.
  const inconsistencias: InconsistenciaFamilia[] = [];
  const error = (codigo: string, campo: string) => inconsistencias.push({ codigo, campo, familia_id: texto(sku.familia_id), producto_id: texto(sku.id_producto) });
  if (!/^FAM-[A-Za-z0-9][A-Za-z0-9-]{0,79}$/.test(texto(sku.familia_id))) error('FAMILIA_ID_INVALIDO', 'familia_id');
  if (!familia || texto(familia.familia_id) !== texto(sku.familia_id)) {
    error('FAMILIA_INEXISTENTE', 'familia_id');
    return resultado(inconsistencias);
  }
  inconsistencias.push(...validarFamiliaProducto(familia).inconsistencias);
  if (!/^PROD-[A-Za-z0-9-]{1,80}$/.test(texto(sku.id_producto))) error('SKU_ID_INVALIDO', 'id_producto');
  if (normalizado(sku.categoria) !== normalizado(familia.categoria)) error('CATEGORIA_NO_EQUIVALENTE', 'categoria');
  const modo = vacio(sku.modo_venta) ? 'UNIDAD' : sku.modo_venta;
  if (modo !== familia.modo_venta) error('MODO_NO_EQUIVALENTE', 'modo_venta');
  if (!vacio(sku.permite_decimal) && !['SI', 'NO', true, false].includes(sku.permite_decimal as string | boolean)) error('DECIMALES_SKU_INVALIDOS', 'permite_decimal');
  if (!texto(sku.presentacion)) error('PRESENTACION_FISICA_REQUERIDA', 'presentacion');
  if (familia.politica_marca !== 'NO_APLICA' && !texto(sku.marca)) error('MARCA_FISICA_REQUERIDA', 'marca');
  if (familia.politica_marca === 'EXPLICITA' && normalizado(sku.marca) !== normalizado(familia.marca_publica)) error('MARCA_NO_EQUIVALENTE', 'marca');
  if (familia.modo_venta === 'UNIDAD') {
    if (!presentacionesEquivalentes(familia, sku)) error('CONTENIDO_NO_EQUIVALENTE', 'contenido_cantidad');
    if (sku.unidad_medida !== familia.unidad_venta) error('UNIDAD_NO_EQUIVALENTE', 'unidad_medida');
    const decimal = sku.permite_decimal === true || sku.permite_decimal === 'SI';
    if (decimal !== (familia.permite_decimal === 'SI') || (sku.paso_venta ?? 1) !== familia.paso_venta) error('REGLA_CANTIDAD_NO_EQUIVALENTE', 'paso_venta');
  } else if (familia.modo_venta === 'GRANEL') {
    if (![100, 250, 1000].includes(Number(sku.gramos_unidad_stock)) || !enteroPositivo(sku.gramos_unidad_stock)
      || !['kg', 'unidad'].includes(sku.unidad_medida) || (sku.unidad_medida === 'kg' && sku.gramos_unidad_stock !== 1000)) error('BASE_STOCK_GRANEL_INVALIDA', 'gramos_unidad_stock');
    if (!enteroPositivo(sku.gramos_referencia)) error('REFERENCIA_SKU_GRANEL_INVALIDA', 'gramos_referencia');
    // Referencia de precio legada y paso nativo NO limitan gramos libres de la familia.
  }
  return resultado(inconsistencias);
}

export function auditarModeloFamilias(familias: readonly FamiliaProducto[], skus: readonly SkuFamilia[]): ValidacionFamilias {
  const inconsistencias: InconsistenciaFamilia[] = [];
  const familiasVistas = new Set<string>(), skuVistos = new Set<string>();
  for (const familia of familias) {
    inconsistencias.push(...validarFamiliaProducto(familia).inconsistencias);
    const id = texto(familia.familia_id);
    if (familiasVistas.has(id)) inconsistencias.push({ codigo: 'FAMILIA_DUPLICADA', familia_id: id });
    familiasVistas.add(id);
  }
  for (const sku of skus) {
    const id = texto(sku.id_producto);
    if (skuVistos.has(id)) inconsistencias.push({ codigo: 'SKU_DUPLICADO', producto_id: id, familia_id: texto(sku.familia_id) });
    skuVistos.add(id);
    inconsistencias.push(...validarRelacionSkuFamilia(sku, familias.find(f => texto(f.familia_id) === texto(sku.familia_id))).inconsistencias);
  }
  return resultado(inconsistencias);
}

/** Vista interna de diagnóstico; no es una reserva ni un contrato de catálogo público. */
export function agregarDisponibilidadFamilia(
  familia: FamiliaProducto, skus: readonly SkuFamilia[], contexto: ContextoDisponibilidadFamilia = {},
): DisponibilidadFamilia {
  const inconsistencias = [...validarFamiliaProducto(familia).inconsistencias];
  const sku_elegibles: string[] = [];
  const miembros = skus.filter(s => !vacio(s.familia_id) && texto(s.familia_id) === texto(familia.familia_id));
  const ids = skus.map(s => texto(s.id_producto));
  const duplicados = new Set(miembros.map(s => texto(s.id_producto)).filter(id => ids.indexOf(id) !== ids.lastIndexOf(id)));
  for (const id of duplicados) inconsistencias.push({ codigo: 'SKU_DUPLICADO', familia_id: familia.familia_id, producto_id: id });
  const aperturaValida = !vacio(contexto.apertura_id) && /^APE-\d{8}$/.test(texto(contexto.apertura_id));
  if (!vacio(contexto.apertura_id) && !aperturaValida) inconsistencias.push({ codigo: 'APERTURA_INVALIDA', campo: 'apertura_id', familia_id: familia.familia_id });
  const escala = familia.modo_venta === 'GRANEL' || familia.permite_decimal === 'NO' ? 1 : 1000;
  let suma = 0;
  for (const sku of miembros) {
    const relacion = validarRelacionSkuFamilia(sku, familia);
    inconsistencias.push(...relacion.inconsistencias);
    if (!relacion.valido || duplicados.has(texto(sku.id_producto))) continue;
    const error = (codigo: string, campo: string) => inconsistencias.push({ codigo, campo, familia_id: familia.familia_id, producto_id: sku.id_producto });
    if (!['SI', 'NO'].includes(sku.activo)) { error('SKU_ACTIVO_INVALIDO', 'activo'); continue; }
    const tipo = vacio(sku.tipo_disponibilidad) ? 'REGULAR' : sku.tipo_disponibilidad ?? 'REGULAR';
    if (!['REGULAR', 'POR_APERTURA'].includes(tipo)) { error('TIPO_DISPONIBILIDAD_INVALIDO', 'tipo_disponibilidad'); continue; }
    const stock = sku.stock_actual;
    const cantidad = typeof stock === 'number' ? stock * (familia.modo_venta === 'GRANEL' ? Number(sku.gramos_unidad_stock) : escala) : NaN;
    if (!Number.isFinite(cantidad) || cantidad < 0 || !Number.isSafeInteger(Math.round(cantidad)) || Math.abs(cantidad - Math.round(cantidad)) > 1e-7) {
      error('STOCK_INVALIDO', 'stock_actual'); continue;
    }
    if (sku.activo !== 'SI' || familia.activo !== 'SI' || (tipo === 'POR_APERTURA' && (!aperturaValida || !contexto.sku_habilitados?.some(id => texto(id) === texto(sku.id_producto))))) continue;
    suma += Math.round(cantidad);
    sku_elegibles.push(texto(sku.id_producto));
  }
  if (!Number.isSafeInteger(suma)) {
    inconsistencias.push({ codigo: 'AGREGADO_FUERA_RANGO', familia_id: familia.familia_id });
    suma = 0;
  }
  const cantidad_agregada = suma / escala;
  const precio = Number.isSafeInteger(familia.precio_venta) && familia.precio_venta >= 0 ? familia.precio_venta : null;
  return {
    familia_id: texto(familia.familia_id), precio_venta: precio, cantidad_agregada,
    unidad_disponibilidad: familia.modo_venta === 'GRANEL' ? 'g' : familia.unidad_venta,
    disponible: inconsistencias.length === 0 && familia.activo === 'SI' && precio !== null && precio > 0 && cantidad_agregada >= familia.paso_venta,
    sku_elegibles, inconsistencias,
  };
}

export function leerVistaFamiliasParalela(
  familias: readonly FamiliaProducto[], skus: readonly SkuFamilia[], contexto: ContextoDisponibilidadFamilia = {},
): { auditoria: ValidacionFamilias; familias: DisponibilidadFamilia[] } {
  const auditoria = auditarModeloFamilias(familias, skus);
  return {
    auditoria,
    familias: familias.map(f => {
      const vista = agregarDisponibilidadFamilia(f, skus, contexto);
      if (!auditoria.valido) vista.disponible = false; // Diagnóstico incompleto nunca se anuncia vendible.
      return vista;
    }),
  };
}
