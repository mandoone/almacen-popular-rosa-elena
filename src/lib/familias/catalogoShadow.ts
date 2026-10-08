/** C6: diagnóstico de lectura. Nunca reserva stock ni sustituye el catálogo SKU_V1. */
import {
  agregarDisponibilidadFamilia, validarFamiliaProducto, validarIdentidadSkuFisica,
  validarRelacionSkuFamilia,
  type FamiliaProducto, type SkuFamilia, type ContextoDisponibilidadFamilia,
  type InconsistenciaFamilia,
} from '../familiasProducto.ts';

export interface OfertaShadow {
  familia_id: string;
  nombre_publico: string;
  categoria: string;
  precio_venta: number | null;
  presentacion_publica: string;
  politica_marca: FamiliaProducto['politica_marca'];
  marca_publica?: string;
  modo_venta: FamiliaProducto['modo_venta'];
  gramos_referencia?: number;
  version_oferta: number;
  activo: FamiliaProducto['activo'];
}
export interface FamiliaShadow {
  oferta: OfertaShadow;
  stock_agregado_interno: number;
  unidad_stock_interna: string;
  disponible: boolean;
  sku_elegibles: string[];
  sku_integrantes: Array<{
    producto_id: string; marca: string; presentacion: string; stock_actual: number;
    contenido_cantidad?: number | ''; contenido_unidad?: SkuFamilia['contenido_unidad'];
    gramos_unidad_stock?: number; equivalente: boolean; elegible: boolean;
    inconsistencias: InconsistenciaFamilia[];
  }>;
  inconsistencias: InconsistenciaFamilia[];
}
const id = (v?: string) => v?.trim() ?? '';
const repetidos = (ids: readonly string[]) => new Set(ids.filter((v, n) => ids.indexOf(v) !== n));
const contextoValido = (c: ContextoDisponibilidadFamilia) => !c.apertura_id || /^APE-\d{8}$/.test(c.apertura_id);
const incidencia = (codigo: string, familia_id: string, producto_id?: string): InconsistenciaFamilia => ({ codigo, familia_id, ...(producto_id ? { producto_id } : {}) });

/** Solo la oferta lleva marca pública EXPLICITA; marcas físicas quedan en diagnóstico admin. */
export function construirCatalogoFamiliasShadow(
  familias: readonly FamiliaProducto[], skus: readonly SkuFamilia[], contexto: ContextoDisponibilidadFamilia = {},
): FamiliaShadow[] {
  const familiasDuplicadas = repetidos(familias.map(f => id(f.familia_id)));
  const skuDuplicados = repetidos(skus.map(s => id(s.id_producto)));
  return familias.map(f => {
    const problemas = [...validarFamiliaProducto(f).inconsistencias];
    if (familiasDuplicadas.has(id(f.familia_id))) problemas.push(incidencia('FAMILIA_DUPLICADA', f.familia_id));
    if (!contextoValido(contexto)) problemas.push(incidencia('APERTURA_INVALIDA', f.familia_id));
    if (f.activo === 'SI' && f.precio_venta === 0) problemas.push(incidencia('PRECIO_FAMILIAR_NO_VENDIBLE', f.familia_id));
    const familiaValida = problemas.length === 0;
    const miembros = skus.filter(s => id(s.familia_id) === id(f.familia_id) && id(s.familia_id));
    if (!miembros.length) problemas.push(incidencia('FAMILIA_SIN_SKU', f.familia_id));
    const diagnostico = miembros.map(s => {
      const relacion = validarRelacionSkuFamilia(s, f);
      const errores = [...validarIdentidadSkuFisica(s).inconsistencias, ...relacion.inconsistencias];
      if (skuDuplicados.has(id(s.id_producto))) errores.push(incidencia('SKU_DUPLICADO', f.familia_id, s.id_producto));
      const base = agregarDisponibilidadFamilia(f, [s], contexto);
      errores.push(...base.inconsistencias.filter(e => !errores.some(i => JSON.stringify(e) === JSON.stringify(i))));
      if (s.activo === 'NO') errores.push(incidencia('SKU_ASOCIADO_INACTIVO', f.familia_id, s.id_producto));
      if (s.tipo_disponibilidad === 'POR_APERTURA' && (!contexto.apertura_id || !contexto.sku_habilitados?.includes(s.id_producto))) {
        errores.push(incidencia('SKU_NO_HABILITADO_APERTURA', f.familia_id, s.id_producto));
      }
      const elegible = familiaValida && f.activo === 'SI' && errores.length === 0 && base.sku_elegibles.includes(s.id_producto);
      problemas.push(...errores);
      return { producto_id: s.id_producto, marca: s.marca ?? '', presentacion: s.presentacion ?? '',
        contenido_cantidad: s.contenido_cantidad, contenido_unidad: s.contenido_unidad,
        stock_actual: s.stock_actual, gramos_unidad_stock: s.gramos_unidad_stock,
        equivalente: relacion.valido && !skuDuplicados.has(id(s.id_producto)), elegible, inconsistencias: errores };
    });
    const elegibles = new Set(diagnostico.filter(s => s.elegible).map(s => s.producto_id));
    const vista = agregarDisponibilidadFamilia(f, miembros.filter(s => elegibles.has(s.id_producto)), contexto);
    const cantidad = familiaValida ? vista.cantidad_agregada : 0;
    problemas.push(...vista.inconsistencias);
    const oferta: OfertaShadow = {
      familia_id: f.familia_id, nombre_publico: f.nombre_publico, categoria: f.categoria,
      precio_venta: Number.isSafeInteger(f.precio_venta) && f.precio_venta >= 0 ? f.precio_venta : null,
      presentacion_publica: f.presentacion_publica, politica_marca: f.politica_marca,
      ...(f.politica_marca === 'EXPLICITA' ? { marca_publica: f.marca_publica } : {}),
      modo_venta: f.modo_venta, ...(f.modo_venta === 'GRANEL' ? { gramos_referencia: f.gramos_referencia } : {}),
      version_oferta: f.version_oferta, activo: f.activo,
    };
    return { oferta, stock_agregado_interno: cantidad, unidad_stock_interna: vista.unidad_disponibilidad,
      disponible: familiaValida && f.activo === 'SI' && f.precio_venta > 0 && cantidad > 0 && vista.inconsistencias.length === 0,
      sku_elegibles: familiaValida ? vista.sku_elegibles : [], sku_integrantes: diagnostico,
      inconsistencias: problemas.filter((e, n, todos) => todos.findIndex(i => JSON.stringify(i) === JSON.stringify(e)) === n) };
  });
}

/** DTO interno mínimo: no lleva costos, proveedor ni precios SKU al simulador. */
export function skuParaShadow(s: SkuFamilia): SkuFamilia {
  return { id_producto: s.id_producto, nombre: s.nombre, categoria: s.categoria, activo: s.activo,
    familia_id: s.familia_id, marca: s.marca, presentacion: s.presentacion,
    contenido_cantidad: s.contenido_cantidad, contenido_unidad: s.contenido_unidad,
    modo_venta: s.modo_venta, unidad_medida: s.unidad_medida, permite_decimal: s.permite_decimal,
    paso_venta: s.paso_venta, gramos_referencia: s.gramos_referencia, gramos_unidad_stock: s.gramos_unidad_stock,
    tipo_disponibilidad: s.tipo_disponibilidad, stock_actual: s.stock_actual };
}
