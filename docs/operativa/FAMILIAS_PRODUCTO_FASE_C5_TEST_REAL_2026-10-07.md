# Familias / SKU — C5 durable en TEST

Fecha efectiva:2026-10-08; se conserva la fecha del nombre solicitado. Rama feature/fase-3a-operativa. C5 real:20 escenarios E2E completos, cleanup idempotente y readback nativo histórico idéntico. Sin rutas familiares públicas ni carga comercial. F10 permanece1 READY/19 PENDING.

## 1. Continuación reproducible

Base30e047eaea33d94aaddc5611082cc545c5e913fb, sin reiniciar C5 ni repetir R0. Los29 archivos pendientes iniciales, diff binario y manifest SHA256 se preservaron en operativa.local/backups/working-tree-c5-v23-preservado-2026-10-08T16-14-35-387Z. No reset/clean/checkout destructivo/stash.

Checkpoints:
- 974a1883557e46b9af2d784767f7f729f742f15c: fuente v23 reproducible, puerto, serializador/recovery y tests.
- e0210895bee0af9bbb29b027178851bb85be5c60: representación/readback fuertes; fuente desplegada como TEST v25.
- El commit de cierre incluye además retry HTTP, cadena de reconciliación y documentación. Su hash se consulta en Git; no se escribe un hash autorreferente.

La fuente inmutable v23 coincidió con la copia conservada al sustituir solo ID/token por placeholders. Patch/SHA256 versionados permiten reproducirla sin credenciales:69872fda82ee0f070df323834c629b0ae2a0d1d11947e2a529c83c344e29ebfd. Configuración real y evidencia permanecen privadas e ignoradas.

## 2. Esquema y destino

Destino exacto leído y protegido por helper:1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM, TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES. APP_ENV TEST/token obligatorios; no endpoints públicos V2.

| Hoja | Antes | Final / campos aditivos |
|---|---:|---|
| PRODUCTOS |25 headers|27: revision_stock_v2, evidencia_stock_v2|
| PEDIDOS |15|18: operacion_asignacion_vigente, evidencia_estado_v2, evidencia_puntero_v2|
| DETALLE_PEDIDOS |11|19: id_detalle_pedido, modelo_linea, familia_id, cantidad_solicitada, unidad_solicitada, presentacion_publica_snapshot, version_oferta_snapshot, oferta_snapshot_json|
| ASIGNACIONES_PEDIDO |ausente|13 headers append-only|
| OPERACIONES_PEDIDOS / MOVIMIENTOS_STOCK |20 /20|sin otros campos ni cambio de enums|

ASIGNACIONES_PEDIDO: asignacion_id, id_detalle_pedido, producto_id, cantidad_asignada, cantidad_stock, unidad_stock_snapshot, gramos_unidad_stock_snapshot, nombre_sku_snapshot, marca_snapshot, presentacion_snapshot, operacion_id, actor, creado_en. Vigencia por puntero; hashes se acreditan contra plan/diario.

Migración previa:13 headers al final de hojas existentes y13 en hoja nueva; cuadrícula PRODUCTOS26→27. Readback íntegro, segunda ejecución0 antes de fixtures. No se rehízo esquema/setup. Las27 líneas históricas conservan campos nuevos vacíos; modelo vacío significa SKU_V1.

## 3. Backups, deployment y rollback

Copias conservadas:
- [BACKUP TEST FAMILIAS C5 2026-10-08T13-06-06Z](https://docs.google.com/spreadsheets/d/1lczVTyrT6vC6z-iyvosau3zQgJ0MYpbjvrEYF1yT7qk/edit): copia nativa completa previa al esquema;18 pestañas verificadas.
- [BACKUP TEST C5 PREPARACION QA 2026-10-08T15:10:32Z](https://docs.google.com/spreadsheets/d/1J46RVkiXFv0UEyTZtnL0OucKzAmUlEt7hiPMe_BZurI/edit):19 pestañas, estructura, valores/fórmulas y CellData coincidentes; fuente releída sin cambios.
- [BACKUP TEST C5 PRE RECOVERY MOVIMIENTO 2026-10-08T16:25:53Z](https://docs.google.com/spreadsheets/d/1vkulc2sjuBo7JZ8E8rdYOhmfMd1y7UDRCQoNJ3UiFcM/edit): copia nativa completa;19 pestañas/cuadrícula y rango usado de100 filas por hoja verificados con valores/fórmulas/formatos/validaciones. No se confunde esa comprobación con una lectura de toda la cola vacía del backup.

TEST v20→v21→v22 en integración inicial; v22→v23 en preparación; esta sesión v23→v24→v25. Final v25. Deploy protegido preserva destino/configuración/deployment y compara HEAD con versión inmutable; lectura UTF8 explícita. Helpers HTTP/verificador nativo posteriores son locales y no requieren otro deploy.

Backups privados: apps-script-v23-verificado, apps-script-test-v23-a3503777753648b2b299662878b42f53, apps-script-test-v24-03135c4f40604ff5a003f2b332da8305; v23/v22/v20/v19/v18 y manifests disponibles. No rollback ejecutado. Retargetear TEST y restaurar Sheet son operaciones diferentes; comparar cambios posteriores y conservar diarios antes de cualquier restauración.

## 4. RECUPERACIÓN FIXTURE PARCIAL C5

Causa raíz v21/v22: omitía APERTURAS y escribía forma_pago=efectivo, fuera del dropdown transferencia/efectivo_al_retirar de PEDIDOS!J25. Sheets persistió prefijo A:I y dejó posteriores vacíos; replay antiguo asumía éxito por existir cabecera. Fuente/validación nativa/mock reprodujeron el fallo. Lectura Windows UTF8 sin encoding también produjo mojibake; se corrigió el ejecutor sin renombrar snapshot histórico sintético.

PREPARACION_FIXTURE_C5_2 persiste plan/hash/auditoría bajo lock antes de preparar apertura/familia/SKU/habilitaciones/pedido/detalle. Prevalida contratos/rangos; clasifica AUSENTE/PARCIAL_ACREDITABLE/COMPLETO, discrepancia=STOP. Solo completa vacíos acreditados y verifica flush/readback; no inventa contexto en confirmación, que mantiene409 PEDIDO_CONTEXTO_CAMBIO.

Con backup y0 efectos, se preservó PED-QA-C5-ECO-PRINCIPAL, fecha, nombre, total3900, estados, detalle6×650 y snapshot. Se creó APE-20991231 con fecha2099-12-31/lugar QA/creada_por qa-c5, estado por_confirmar, anticipados pausado y presencial inactivo. Solo cuatro celdas QA existentes se completaron:forma_pago, observaciones, apertura_id, origen_pedido. Stocks4/7 y habilitaciones existentes intactos.

Hash de preparación:f518ea401e0135189c4dfa1a71e29722d8216061be0be9e6f57868ee94d3d964, timestamp2026-10-08T15:14:29.844Z. Respuesta inicial ambigua, readback nativo, retry y segunda ejecución0. Sin operaciones/asignaciones/movimientos antes de confirmar.

## 5. Frontera V2 → legacy

v23 copiaba ASIGNACION_V2 en tipo legacy; su validación dejó ID/fecha antes de rechazar. Contrato real:tipo=entrada/salida/ajuste/devolucion; origen=pedido/venta/compra/ajuste/cancelacion. No se amplió enum ni se debilitó C4.

| Efecto | tipo legacy | origen |
|---|---|---|
| Asignación / SKU_V1 mixto negativa |salida|pedido|
| Cancelación positiva |devolucion|cancelacion|
| Reversión reasignación |devolucion|pedido|
| Nueva distribución |salida|pedido|

serializarMovimientoV2ParaSheet_ conserva tipo_movimiento lógico, IDs/producto/referencias/hash/operación y JSON idéntico en observacion/observaciones: MOVIMIENTO_PEDIDO_V2_1, tipo lógico, plan_hash, línea/asignaciones, unidad/base/escala y recuperación. Costos/precios independientes.

Construye fila completa en memoria; finitud/tamaño/campos y validaciones nativas de cada rango del plan antes de PREPARADA. setValues completo, flush/readback; no promesa ACID. Aliases, enums/origen, referencias y JSON se verifican. Saldo coincidente solo no acredita autoría. Reportes omiten intenciones V2 hasta diario único COMPLETADA y movimiento exacto del plan; filtro V1 conservado.

## 6. M-0 recuperado y misma key

Operación OP-C4-bde46db073f83e4dd1bb7f37ac6c7f6f/key qa_c5_eco_confirmar: se acreditaron APLICANDO paso2, dos asignaciones A4/B2, M-0 fila74 solo ID/fecha, ausencia M-1 y efectos, recibido/puntero vacío, A4/B7.
Plan_hash2725af3817e762bfa48116bd2282c9205311688a0a3da1f16e9cba376dc6f3d9; payload_hash96a1e189067230010413f093a4e16e0b89f82ffa42fa79fb55ca33d47ce16818.

Helper restringido a esa fila/plan/key, bajo lock y auditoría ANTES del completado. Misma fila, ID y fecha2026-10-08T15:19:04.453Z; no borra/duplica ni toca stock.
Audit AUD-QA-C5-REC-M0-bde46db073f83e4dd1bb7f37ac6c7f6f,2026-10-08T16:36:55.834Z, hash_evidenciaffda03ac9db3b40f00723c670bf690b40e38108761a601f29564e5eab8c4a2eb.
Respuesta inicial ambigua: native readback probó solo M-0 y dos auditorías QA cambiadas, demás efectos iguales. Retry/replay0 explícitos.

Misma key reconoció asignaciones/M-0, añadió únicamente M-1, descontó A4→0/B7→5, cambió recibido→pendiente, puntero/readback y COMPLETADA. Replay sin efectos nuevos; cancelación4/7, historia intacta. No se reabrió el pedido cancelado.

## 7. Durable y E2E real

Mismo dominio C1/C2/C4 compilado ES2019 síncrono con SHA256 equivalente. Port bajo LockService:
PREPARADA→APLICANDO→asignaciones append-only→movimientos→CAS stock/revisión/recibo→estado→puntero→readback→COMPLETADA.
Diario CONFIRMAR_V2/CANCELAR_V2/REASIGNAR_V2 reutiliza columnas. Seis writers V1 consultan bloqueos bajo lock, sin cambiar semántica sin V2 pendiente.

20 escenarios/194 respuestas checkpointadas, fin2026-10-08T18:12:53.018Z:

| Caso | Resultado TEST |
|---|---|
| Principal A4+B2 |A0/B5;1 plan/2 asignaciones/2 movimientos; replay y cancelación4/7|
| Reasignación separada |A4+B2→A1+B5;stock3/2;4 asignaciones append-only; reversión/aplicación; cancelación vigente4/7|
| Mixto V1/V2 |1 plan/3 efectos/2 asignaciones familiares; modelos conservados; cancelación4/7/6|
| Insuficiencia compartida |Rechazo antes de diario/efectos; recibido cancelado sin stock|
| Granel100/250/1000 |150g,75+75,subtotal203; reasignación50+100; replay/cancelación2/2 sin drift|
| PERMITIR_SNAPSHOT |Recibido confirma con familia inactiva; nuevo rechazado; snapshot intacto; cancelación con SKU inactivo|
| Ocho interrupciones |PREPARADA, ASIGNACION_2, MOVIMIENTO_2, ANTES_STOCK_1, STOCK_1, ANTES_ESTADO_PEDIDO, DESPUES_READBACK, COMPLETADA; recovery/readback/cancelación/replay sin duplicados|
| HTTP TIMEOUT /502 |Pérdida de respuesta del CLIENTE simulada con backend real completado; retry devuelve resultado persistido|
| Autoría incierta |REQUIERE_REVISION bloquea pedido/2 SKU/cleanup; único recibo se restaura desde auditoría pre-inyección; no stock reconstruido; confirma/cancela|
| Cleanup |91 desactivaciones auditadas; segunda ejecución0; historia conservada|

16 respuestas de transporte realmente ambiguas quedaron documentadas. Error transitorio Sheets antes del diario en primer STOCK_1: native readback0 operaciones/asignaciones/movimientos, A4/B7, recibido sin puntero. Respuesta/checkpoint fallido conservados y misma entrada/key reintentada; runner distingue ese500 de conflictos, validaciones y fallos inyectados. Configuración/reconciliación/cleanup no se reenvían a ciegas.

Readback detectó auditoría adicional REQUIERE_REVISION→APLICANDO de AUTORIA. Se acredita solo mediante actor QA, diario/plan/key/pedido exactos, cambio exclusivo de estado, pre-inyección, recibo restaurado, reconciliación única, hashes y orden temporal. Prefijo OP no basta. Discrepancias/duplicados/pruebas faltantes siguen STOP, con tests negativos. No hubo modificación comercial ni otra escritura TEST por esta comprobación.

## 8. Cleanup / conteos

37 SKU y18 familias QA inactivos; stocks iniciales restituidos mediante cancelaciones, no ajustes manuales.19 pedidos cancelados,41 operaciones QA COMPLETADA,44 asignaciones y90 movimientos retenidos. Apertura QA cancelada, anticipados/presencial cerrados,37 habilitaciones NO.0 bloqueos QA/globales,0 familias/mapas comerciales. Dos revisiones V1 acreditadas conservan historia.

| Hoja | Final | Preexistentes |
|---|---:|---:|
| PRODUCTOS / FAMILIAS_PRODUCTO |93 /18 QA|56 /0|
| PEDIDOS / DETALLE_PEDIDOS |42 /48|23 /27|
| OPERACIONES_PEDIDOS / ASIGNACIONES_PEDIDO |59 /44 QA|18 /0|
| MOVIMIENTOS_STOCK / AUDITORIA_PRODUCTOS |162 /191|72 /72|
| APERTURAS / APERTURA_PRODUCTOS |17 /38|16 /1|

Compras3/detalles4, historial costos34, ventas24/detalles24, caja compra2, gastos extra2 y clientes0 idénticos.

## 9. Integridad y V1

19 cuadrículas completas acotadas; userEnteredValue/effectiveValue/userEnteredFormat/dataValidation/formattedValue, fórmulas y cola vacía.13 headers existentes nuevos,383 filas QA en hojas existentes y44 en nueva hoja.0 celdas históricas ajenas modificadas y0 IDs canónicos duplicados.

SHA256 valores preexistentes antes/después:a394129a80f3fec376ec49446e4a0147d61189787876283b7cbd9b51eb770735.
SHA256 proyección nativa preservada antes/después:581dad19cc2c48766e043859fcfb69fd8d27dd286af3a18727829e301ddec885. Excluye solo headers/fila QA autorizados; la huella anterior cac4aa111d98d98112d549fa058c57242840756058c99db0f4135eae4101a742 tenía menos filas QA excluidas.

Catálogo V1 real idéntico,0 SKU QA; SHA25623c00f8584db2c96fcabe7f28d32bcaae183f7c15846b2885b31b5c55502c9e4.
Diferencial:23 archivos V1,187 funciones GAS salvo siete excepciones exactas (seis guards/filtro de intenciones),47 acciones/51 transportes y seis VM byte-equivalentes:pedido unidad/granel100/250/1000, compra/admin legado, presencial granel. Sin mutaciones comerciales como regresión.

## 10. QA / archivos / evidencia

QA de cierre: suite y focales sin skipped, lint/typecheck/build aislado fuera de Dropbox con tsconfig restaurado, scan secrets, diff check y auditoría V1. Cobertura local:15 puntos confirmación/13 cancelación/15 reasignación; preparación parcial, serialización nativa, M-0/cadena autoría/corrupción/readback. Resultados numéricos definitivos se registran en TEST_PLAN y checkpoint.

37 archivos desde30e047e: puerto/generador GAS, migrador/helpers C5, transporte/runner, readback/auditoría, ejecutor deploy UTF8/build aislado; esquemaDurableV2 metadata V1 opcional; tests/fixtures/helpers y regresiones C1/C2/C4; seis documentos vivos y esta acta. Lista exacta:git diff30e047e --name-only. Fuente v25 íntegra en Git; evidencia y credenciales ignoradas.

Privados: c5-final-nativo.json, c5-final-integridad.json, c5-catalogo-final.json, e2e-familias-c5-movimiento-recuperado.json, checkpoints fallidos conservados, capturas pre-recovery, certificados/backups/logs. Sin borrar evidencia para aprobar pruebas.

## 11. Límites / siguiente paso

C5 valida almacenamiento durable aislado, no activación comercial. No ACID; edición externa/evidencia incompleta exige bloqueo/revisión. Recovery M-0 específico; reconciliación solo para QA con auditoría previa, nunca stock real inferido.
D50 PERMITIR_SNAPSHOT cerrada. Identidad física/mapa comercial y revisión visual/activación siguen requiriendo datos humanos; no se inventan marcas. Tras cierre Git C5: C6 shadow/read-only/dry-run, sin reemplazar tienda ni migrar comerciales. F10 sin cambio.

Main/origin main:f203e0c1f1d74ffd9e826032a8c0a60df4ce6c3f intactos. Production/Sheet/Apps Script productivos intactos. TEST solo estructura/fixtures autorizados; sin stock/costo/precio comercial modificado, familias reales o catálogo/carrito/pedidos familiares públicos. Sin fotos, costos pendientes, caja/banco, usuarios ni conteo físico nuevos.
