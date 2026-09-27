# F10 — Plan de datos reales y corte (preparado, no ejecutado)

No hay autorización para cargar datos reales ni tocar Production. La fuente
operativa autorizada y sus responsables los define el Almacén. Este plan evita
pasar de una planilla incompleta a operaciones con stock/caja sin conciliación.

## Paquete mínimo y decisión humana

| Paquete | Origen/responsable por confirmar | Comprobación previa | Evidencia para F10 |
|---|---|---|---|
| Catálogo vigente | Lista aprobada por Almacén | `id_producto` único, nombre/categoría, unidad, fraccionamiento, estado activo | Lista firmada y readback |
| Presentaciones y marcas | Catálogo físico + responsable comercial | Variantes distinguibles por ID; no colapsar envases/marcas con precio o stock distinto | Tabla de correspondencias aprobada |
| Stock físico | Conteo por unidad + segundo revisor | Diferencias contra Sheet resueltas; corte horario común | Acta de conteo y conciliación |
| Precios/costos | Lista comercial, facturas + aprobadores | No negativos; costo/venta y vigencia revisados | Lista fechada y muestras de readback |
| Mínimos/proveedores | Operación/compras | Mínimos y proveedor por producto aprobados; sin inventar oferta | Acta de abastecimiento |
| Caja/banco | Arqueo y conciliación, responsable financiero | Corte único; gastos, cobrar/pagar si aplican | Actas separadas en gestor seguro |

El contrato técnico vigente se valida con `src/lib/fase4/auditoriaCatalogo.ts`
(`id_producto`, `nombre`, `categoria`, `unidad_medida`, `permite_decimal`,
`paso_venta`, `precio_costo`, `precio_venta`, `stock_actual`, `stock_minimo`,
`active`). La lista de marca/presentación/proveedor **no queda absorbida
automáticamente** por esos campos: antes de importar, el Almacén debe aprobar
cómo distinguir cada variante y dónde reside el dato. No inventar columnas ni
mapear dos variantes a un mismo ID. El auditor detecta formato, duplicados,
rangos y algunas decisiones humanas; no valida precios, costos ni cantidades
contra la realidad física.

## Secuencia al recibir autorización de entorno y datos

1. Recibir el corte fechado por canal seguro. Asignar titular y segundo revisor
   por paquete. No versionar montos, datos personales ni enlaces privados.
2. Hacer una copia recuperable de la Sheet **del entorno autorizado**, registrar
   pestañas, filas y referencia segura; probar lectura. No ejecutar si el
   entorno o backup son ambiguos.
3. Normalizar IDs/unidades/presentaciones en staging; ejecutar el auditor de
   catálogo existente y resolver cada ERROR, ADVERTENCIA y
   `HUMAN_DECISION_REQUIRED` con responsable. Conservar el archivo fuente y
   tabla de correspondencias fuera de Git.
4. Cargar una muestra pequeña en TEST, leerla de vuelta y comparar ID, precio,
   costo, stock, mínimos y visibilidad. Solo después considerar lote completo
   TEST. Nunca suponer éxito de una respuesta ambigua sin readback.
5. Ensayar ventas, pedidos y reversos con el guion de
   `ENSAYO_FINAL_F10_TEST.md`; conciliar movimientos, caja y stock; restaurar
   fixtures TEST con operaciones auditables.
6. Antes de un eventual corte productivo, repetir backup y conciliación al
   instante acordado. Requiere Go/No-Go y autorización de Producción separados.

**NO-GO:** ID duplicado, presentación ambigua, stock sin segundo recuento,
precio/costo no aprobados, saldo sin conciliación, backup no legible, entorno
incierto o responsable ausente. No se rellenan los 20 checks F10 a partir de
este plan: solo actas y readbacks reales pueden cambiar su resultado.
