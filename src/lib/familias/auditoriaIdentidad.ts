/** Informe de faltantes; jamás deduce marca o necesidad multi-SKU desde el nombre. */
import { validarIdentidadSkuFisica, validarRelacionSkuFamilia, type FamiliaProducto, type SkuFamilia } from '../familiasProducto.ts';

export type EstadoIdentidad = 'YA_ACREDITADO' | 'FALTA_IDENTIDAD_FISICA' | 'FALTA_FAMILIA' | 'NO_REQUIERE_FAMILIA_MULTI_SKU' | 'GRANEL_POSTERGADO';
export interface AcreditacionSku { producto_id: string; evidencia: string; no_requiere_familia_multi_sku: true }
/** IDs sintéticos documentados por fixtures A/C5 y guardrails E2E F78, nunca por nombre. */
export function esSkuFixtureConocido(s: Pick<SkuFamilia, 'id_producto'>): boolean {
  return s.id_producto.startsWith('PROD-QA-') || s.id_producto === 'PROD-TEST-DECIMAL'
    || /^PROD-TEST-F78-[0-9A-F]{12}$/.test(s.id_producto);
}
export function auditarFaltantesIdentidad(
  skus: readonly SkuFamilia[], familias: readonly FamiliaProducto[], acreditaciones: readonly AcreditacionSku[] = [],
) {
  return skus.map(s => {
    const fs = familias.filter(f => f.familia_id === s.familia_id);
    const identidadCompleta = validarIdentidadSkuFisica(s).valido && (!!s.marca?.trim() || fs.length === 1 && fs[0].politica_marca === 'NO_APLICA') && !!s.presentacion?.trim()
      && typeof s.contenido_cantidad === 'number' && s.contenido_cantidad > 0 && !!s.contenido_unidad;
    const familiaValida = !!s.familia_id && fs.length === 1 && validarRelacionSkuFamilia(s, fs[0]).valido;
    const acreditadas = acreditaciones.filter(a => a.producto_id === s.id_producto && a.no_requiere_familia_multi_sku === true && a.evidencia.trim());
    const granel = s.modo_venta === 'GRANEL';
    const estado: EstadoIdentidad = granel ? 'GRANEL_POSTERGADO'
      : acreditadas.length === 1 ? 'NO_REQUIERE_FAMILIA_MULTI_SKU'
        : !identidadCompleta ? 'FALTA_IDENTIDAD_FISICA' : !familiaValida ? 'FALTA_FAMILIA' : 'YA_ACREDITADO';
    return { producto_id: s.id_producto, nombre: s.nombre, estado,
      falta_identidad_fisica: !identidadCompleta, falta_familia: !familiaValida,
      evidencia: acreditadas.length === 1 ? acreditadas[0].evidencia : familiaValida && identidadCompleta ? 'Campos estructurados del maestro y relación validada' : '',
      // Que no exista mapa no acredita que sea innecesario; esa decisión sigue humana.
      requiere_decision_multi_sku: !granel && acreditadas.length !== 1 && !familiaValida };
  });
}
