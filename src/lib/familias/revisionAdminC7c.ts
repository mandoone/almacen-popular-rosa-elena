/** C7-C: presentación administrativa en copias. No tiene puerto HTTP ni persistencia. */
import type { FamiliaProducto, SkuFamilia, PoliticaMarca } from '../familiasProducto.ts';
import type { EntradaManifestC7, ManifestC7, BaseMigracionC7 } from './preparacionC7b.ts';
import { construirCatalogoFamiliasShadow } from './catalogoShadow.ts';
import { resolverImagenPublicaFamiliaC7, type EvaluacionImagenC7 } from './imagenPublicaC7.ts';

export type EstadoRevisionC7c = 'PENDIENTE' | 'PROPUESTO' | 'APROBADO_PARA_DRY_RUN' | 'BLOQUEADO';
export type FuenteEvidenciaC7c = 'NADIA' | 'OMAR' | 'CONTEO_FISICO' | 'DOCUMENTO_VIGENTE';
export interface ManifestVistaC7c extends ManifestC7 {
  entradas: (EntradaManifestC7 & { nombre_actual: string; grupo_revision: string | null })[];
  ofertas_sin_sku: { familia_id: string; nombre_publico: string; precio_venta: number; marca_publica: string; estado_oferta: string }[];
}
export function estadoRevisionC7c(e: EntradaManifestC7): EstadoRevisionC7c {
  if (e.accion_futura === 'CONSERVAR_HISTORICO_NO_MIGRAR' || e.estado === 'POSTERGADO_GRANEL') return 'BLOQUEADO';
  return e.estado === 'APROBADO' ? 'APROBADO_PARA_DRY_RUN' : e.estado === 'PENDIENTE_OMAR' ? 'PROPUESTO' : 'PENDIENTE';
}
export function fuentePendienteC7c(e: EntradaManifestC7): FuenteEvidenciaC7c {
  return e.estado === 'PENDIENTE_NADIA' ? 'NADIA' : e.estado === 'PENDIENTE_CONTEO' || e.estado === 'POSTERGADO_GRANEL' ? 'CONTEO_FISICO' : 'OMAR';
}
/** Los saldos y categorías no acreditadas son MOCKS, nunca una lectura del maestro real. */
export function crearBaseSinteticaC7c(m: ManifestVistaC7c): BaseMigracionC7 {
  return { familias: [], skus: m.entradas.map(e => ({
    id_producto: e.producto_id, nombre: e.nombre_actual, categoria: e.contrato_aprobado?.categoria ?? 'Limpieza',
    activo: e.accion_futura === 'CONSERVAR_HISTORICO_NO_MIGRAR' ? 'NO' : 'SI', modo_venta: e.estado === 'POSTERGADO_GRANEL' ? 'GRANEL' : 'UNIDAD',
    unidad_medida: 'unidad', permite_decimal: 'NO', paso_venta: 1, stock_actual: 10, precio_costo: 500, precio_venta: 600,
    familia_id: '', marca: '', presentacion: '',
  })) };
}
export function identidadEnRevisionC7c(e: EntradaManifestC7, s: SkuFamilia): SkuFamilia {
  const a = e.identidad_aprobada;
  return a ? { ...s, marca: a.marca, presentacion: a.presentacion, contenido_cantidad: a.contenido_cantidad,
    contenido_unidad: a.contenido_unidad, familia_id: e.contrato_aprobado?.familia_id } : { ...s };
}
/** Una configuración pública experimental no es una aprobación del manifest ni una edición del SKU. */
export function proyectarPoliticaPublicaC7c(f: FamiliaProducto, politica: PoliticaMarca, marcaPublica = ''): FamiliaProducto {
  return { ...f, politica_marca: politica, marca_publica: politica === 'EXPLICITA' ? marcaPublica.trim() : '',
    imagen_url: politica === 'VARIABLE' ? '' : f.imagen_url };
}
export function requiereNuevoSkuC7c(anterior: Pick<SkuFamilia, 'marca' | 'contenido_cantidad' | 'contenido_unidad'>,
  propuesta: Pick<SkuFamilia, 'marca' | 'contenido_cantidad' | 'contenido_unidad'>) {
  // Proveedor, costo y texto de presentación no definen identidad. El contenido sí.
  return anterior.marca !== propuesta.marca || anterior.contenido_cantidad !== propuesta.contenido_cantidad
    || anterior.contenido_unidad !== propuesta.contenido_unidad;
}
export type EscenarioC7c = 'ECONOMICO_UN_SKU' | 'ECONOMICO_DOS_MARCAS' | 'MARCA_EXPLICITA' | 'SIN_MARCA';
export function crearEscenarioC7c(escenario: EscenarioC7c, economico = false, imagenBranded = false) {
  const explicita = escenario === 'MARCA_EXPLICITA', sinMarca = escenario === 'SIN_MARCA';
  const familia: FamiliaProducto = {
    familia_id: 'FAM-QA-C7C-ACEITE', activo: 'SI', nombre_publico: sinMarca ? 'Pan QA' : explicita ? 'Aceite Marca QA 1 L' : 'Aceite vegetal Económico',
    categoria: 'Alimentos', precio_venta: 1700, modo_venta: 'UNIDAD', unidad_venta: 'unidad', permite_decimal: 'NO', paso_venta: 1,
    contenido_cantidad: sinMarca ? 1 : 1000, contenido_unidad: sinMarca ? 'unidad' : 'ml', presentacion_publica: sinMarca ? 'Unidad' : '1 L',
    politica_marca: sinMarca ? 'NO_APLICA' : explicita ? 'EXPLICITA' : 'VARIABLE', marca_publica: explicita ? 'Marca QA' : '', version_oferta: 1,
  };
  const nombres = escenario === 'ECONOMICO_DOS_MARCAS' ? ['Reyes (ejemplo sintético)', 'Marca X (ejemplo sintético)'] : [sinMarca ? '' : explicita ? 'Marca QA' : 'Reyes (ejemplo sintético)'];
  const skus: SkuFamilia[] = nombres.map((marca, i) => ({ id_producto: `PROD-QA-C7C-${i}`, nombre: sinMarca ? 'Pan QA' : `Aceite ${marca} 1 L`,
    categoria: familia.categoria, activo: 'SI', familia_id: familia.familia_id, marca, presentacion: familia.presentacion_publica,
    contenido_cantidad: familia.contenido_cantidad, contenido_unidad: familia.contenido_unidad, modo_venta: 'UNIDAD', unidad_medida: 'unidad', permite_decimal: 'NO', paso_venta: 1,
    stock_actual: i ? 8 : 5, precio_costo: 1500 + i * 70, precio_venta: 999 }));
  const oferta = economico ? proyectarPoliticaPublicaC7c(familia, 'VARIABLE') : { ...familia };
  if (economico && !/económico/i.test(oferta.nombre_publico)) oferta.nombre_publico = 'Aceite vegetal Económico';
  let evaluacion: EvaluacionImagenC7 | undefined;
  if (imagenBranded) {
    oferta.imagen_url = '/qa-c7c-imagen-con-marca-no-cargar.png';
    evaluacion = { familia_id: oferta.familia_id, imagen_url: oferta.imagen_url, clasificacion: 'NO_APTA_VARIABLE_MARCA_VISIBLE',
      marca_visible: 'Marca sintética', evidencia: 'Simulación local; ninguna fotografía real utilizada.' };
  }
  const catalogo = construirCatalogoFamiliasShadow([oferta], skus, {}, evaluacion ? [evaluacion] : []);
  return { familia: oferta, skus, shadow: catalogo[0], imagen: resolverImagenPublicaFamiliaC7(oferta, evaluacion) };
}
