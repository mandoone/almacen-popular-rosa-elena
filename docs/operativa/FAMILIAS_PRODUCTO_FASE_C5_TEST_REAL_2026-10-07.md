# Familias / SKU — C5 TEST real: preparación recuperada, nuevo STOP

## Continuación autorizada: frontera legacy y recovery local (2026-10-08)

Se preservaron los29 archivos iniciales mediante copia/diff/manifest SHA256 y se acreditó la fuente inmutable TEST v23: idéntica al template conservado al reemplazar únicamente ID/token por placeholders. El patch y su SHA256 permiten reproducirla desde Git sin credenciales. No se rehízo preparación, R0 ni esquema.

Contrato real leído: tipo=entrada/salida/ajuste/devolucion; origen=pedido/venta/compra/ajuste/cancelacion. Confirmación y nueva asignación serializan salida/pedido; cancelación, devolucion/cancelacion; reversión de reasignación, devolucion/pedido. tipo_movimiento conserva ASIGNACION_V2/DEVOLUCION_V2 o tipos mixtos V1. JSON conserva modelo, tipo lógico, plan_hash y snapshots. No se cambia ningún enum ni el dominio C4.

La fila completa se construye y valida en memoria, incluidas validaciones nativas de todo el plan antes de efectos; luego setValues de rango exacto, flush y readback. No se afirma atomicidad Sheets. Los reportes omiten intenciones V2 cuyo diario no sea COMPLETADA; V1 conserva su filtro y las siete excepciones diferenciales están verificadas exactamente.

Recovery TEST-only autoriza únicamente M-0/operación/key/hash existentes. Acredita prefijo ID/fecha, ausencia de M-1/efectos, pedido y stock exactos del plan, dos asignaciones y contexto. Persiste auditoría antes de completar la misma fila; conserva ID/fecha, registra recuperación y reintento0. No modifica stock ni desbloquea por sí mismo. Pruebas locales incluyen modificaciones incompatibles, caída tras completar M-0, replay del plan original y cero duplicados.

Nuevo backup nativo previo a movimiento: [BACKUP TEST C5 PRE RECOVERY MOVIMIENTO 2026-10-08T16:25:53Z](https://docs.google.com/spreadsheets/d/1vkulc2sjuBo7JZ8E8rdYOhmfMd1y7UDRCQoNJ3UiFcM/edit?usp=drivesdk).19 pestañas, valores/fórmulas usados, formatos/validaciones y estructura coincidentes; fuente releída sin cambios. Los dos backups C5 anteriores permanecen.

En este checkpoint local todavía no se desplegó el serializador ni se recuperó M-0 remoto. TEST sigue v23/APLICANDO paso2, stocks4/7. QA local1015 tests previstos,0 skipped; build aislado PASS, V1 diferencial PASS. Continúan deploy TEST, recovery misma fila/key y E2E/cleanup completos; C6 sigue condicionado al cierre integral C5.

Fecha efectiva: 2026-10-08. El archivo conserva la fecha solicitada. Rama exclusiva: feature/fase-3a-operativa. HEAD inicial y final: 30e047eaea33d94aaddc5611082cc545c5e913fb. No se creó commit ni se hizo push: C5 integral sigue incompleto. Los 29 archivos pendientes permanecen conservados.

## 1. Resultado actual

La preparación QA quedó cerrada con plan persistido, recuperación explícita, readback nativo y replay de cero cambios. Se conserva el mismo PED-QA-C5-ECO-PRINCIPAL y su fecha/detalle/snapshot original. Apps Script TEST pasó de v22 a v23.

La confirmación A4+B2 alcanzó PREPARADA/APLICANDO y dos asignaciones, pero falló al escribir el primer movimiento: la columna legacy MOVIMIENTOS_STOCK.tipo rechaza ASIGNACION_V2. Su validación estricta admite únicamente entrada/salida/ajuste/devolucion. El puerto copiaba el tipo moderno en esa columna legacy. Se detuvieron todas las escrituras TEST, sin relajar el dropdown ni completar manualmente el movimiento.

Estado final acreditado:

- Operación OP-C4-bde46db073f83e4dd1bb7f37ac6c7f6f: APLICANDO, paso 2.
- Dos asignaciones append-only completas: A4 y B2, ligadas al plan.
- Una fila MOVIMIENTOS_STOCK parcial: solo id_movimiento legacy y fecha_hora; el ID coincide con el primer movimiento del plan. tipo, movimiento_id canónico, producto_id, operacion_id, hash y demás campos están vacíos. No se considera un movimiento completo.
- Pedido recibido; puntero vigente y recibos de estado/puntero vacíos.
- Stock QA A4/B7; revisiones y recibos de stock vacíos. No hubo descuento.
- Pedido y ambos SKU QA bloqueados por la operación incompleta; bloqueo global false.
- 0 cambios históricos/comerciales, 0 cambios de stock/costo/precio comercial.

No se ejecutó retry remoto de confirmación, reconciliación, cancelación ni cleanup después del STOP. La prueba local con la misma fila parcial demuestra que un retry debe exigir REQUIERE_REVISION, sin adivinar ni descontar; el estado remoto sigue APLICANDO porque no se escribió después del STOP.

## 2. Preservación local y destino

Se respaldaron los 25 archivos pendientes iniciales byte a byte, incluidos los nueve untracked, junto con diff binario completo y manifest SHA256 verificado. Ubicación privada: operativa.local/backups/working-tree-c5-pre-recovery-2026-10-08T14-45-37-331Z. Sin reset, clean, checkout destructivo, stash ni descarte. La remediación R0 cerrada en30e047e no se repitió.

Destino verificado antes de escritura:

- Spreadsheet ID: 1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM.
- Nombre real: TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES.
- Lectura nativa completa de 19 pestañas: coincidió con el STOP previo, sin diferencias inesperadas.
- Las dos revisiones V1 acreditadas conservan estado/histórico. F10 permanece 1 READY/19 PENDING.

## 3. Esquema C5 ya preparado

No se rehizo la migración. Permanece aditiva, con históricos sin rellenar:

| Hoja | Antes de C5 | Actual |
|---|---:|---:|
| PRODUCTOS | 25 headers | 27 |
| PEDIDOS | 15 | 18 |
| DETALLE_PEDIDOS | 11 | 19 |
| ASIGNACIONES_PEDIDO | ausente | 13 headers |
| OPERACIONES_PEDIDOS | 20 después de R0 | 20 |
| MOVIMIENTOS_STOCK | 20 | 20 |

PRODUCTOS añade revision_stock_v2/evidencia_stock_v2. PEDIDOS añade operacion_asignacion_vigente/evidencia_estado_v2/evidencia_puntero_v2. DETALLE_PEDIDOS añade id_detalle_pedido/modelo_linea/familia_id/cantidad_solicitada/unidad_solicitada/presentacion_publica_snapshot/version_oferta_snapshot/oferta_snapshot_json.

ASIGNACIONES_PEDIDO conserva asignacion_id, id_detalle_pedido, producto_id, cantidad_asignada, cantidad_stock, unidad_stock_snapshot, gramos_unidad_stock_snapshot, nombre_sku_snapshot, marca_snapshot, presentacion_snapshot, operacion_id, actor, creado_en. Append-only, con vigencia mediante puntero de pedido. No se modificó ni reinterpretó ninguna de las 27 líneas históricas.

La migración anterior añadió 13 headers a hojas existentes y 13 a la nueva hoja. Readback íntegro y segunda ejecución 0 cambios. No se ejecutó setup ni hubo nueva migración en esta continuación.

## 4. Backups y rollback

Se conserva el backup original:

[BACKUP TEST FAMILIAS C5 2026-10-08T13-06-06Z](https://docs.google.com/spreadsheets/d/1lczVTyrT6vC6z-iyvosau3zQgJ0MYpbjvrEYF1yT7qk/edit), copia nativa completa previa a la migración, 18 hojas verificadas.

Antes de recuperar el fixture se creó otro backup, sin sustituirlo:

[BACKUP TEST C5 PREPARACION QA 2026-10-08T15:10:32Z](https://docs.google.com/spreadsheets/d/1J46RVkiXFv0UEyTZtnL0OucKzAmUlEt7hiPMe_BZurI/edit), ID1J46RVkiXFv0UEyTZtnL0OucKzAmUlEt7hiPMe_BZurI. Las 19 hojas, estructura, valores/fórmulas y CellData con formatos/validaciones coincidieron exactamente. Se releyó la fuente después de copiar y seguía igual.

Apps Script TEST: v20→v21→v22 en la continuación anterior, v22→v23 en esta recuperación. El deploy protegido conserva destino, token y deployment TEST existente, compara HEAD remoto contra versión inmutable y verifica endpoint antes/después. Lectura UTF8 explícita evita nuevas alteraciones de texto en Windows. No se desplegó nada después del nuevo STOP.

Backup v22 y manifest: operativa.local/backups/apps-script-test-v22-e195494053b74f0d9662aa5bf4a1e2bb. Se conservan v20/v19/v18 y v22 para rollback, además de backups v20/v21 anteriores. No se ejecutó rollback. Restaurar una Sheet o retargetear el deployment requiere comparar cambios posteriores; no elimina por sí solo el HEAD del proyecto ni acredita una operación parcial.

## 5. RECUPERACIÓN FIXTURE PARCIAL C5

### Causa raíz de la preparación

El código v21/v22 omitía crear APERTURAS. Creaba únicamente APERTURA_PRODUCTOS, por eso quedaban referencias a APE-20991231 sin fila de apertura.

La cabecera enviaba forma_pago=efectivo, pero PEDIDOS!J25 tiene dropdown estricto transferencia/efectivo_al_retirar. Se acreditó la discrepancia mediante fuente inmutable, lectura de validación nativa y reproducción local: prefijo A:I persistido, J en adelante vacío, relaciones de apertura y detalle existentes, sin efectos de stock. El mock anterior omitía esa validación. Además, el replay antiguo retornaba éxito únicamente por existir cabecera.

El deploy Windows leía UTF8 sin encoding explícito y produjo mojibake en textos QA. Se corrigió la lectura del ejecutor, conservando el nombre/snapshot histórico del fixture existente; no se renombraron sus datos.

### Plan y clasificación

La preparación TEST-only usa lock compartido y valida ID/nombre/APP_ENV/token. El servidor construye el fixture, sin costos/marcas/stock arbitrarios del navegador. Clasifica AUSENTE, PARCIAL_ACREDITABLE o COMPLETO; una discrepancia es STOP INCONSISTENTE.

Antes de efectos persiste un plan/hash en AUDITORIA_PRODUCTOS con modelo PREPARACION_FIXTURE_C5_2, estado PREPARADA, actor qa-c5, timestamp y campos previstos. No crea una operación comercial V2 para preparar fixtures. Verifica headers/dropdowns antes de escribir; append y completado de celdas vacías se basan exclusivamente en el plan acreditado. Readback integral y evidencia persistida preceden COMPLETADA.

Una operación, asignación, movimiento huérfano, stock distinto, otra identidad/apertura o detalle incompatible impiden reconstrucción. Históricos completos de otros pedidos QA pueden conservarse cuando un nuevo fixture reutiliza el mismo SKU y su stock ya fue restituido. El replay verifica plan/fixture y no modifica filas. Confirmación conserva 409 PEDIDO_CONTEXTO_CAMBIO; no asume una apertura por defecto.

### Cambios reales recuperados

Se acreditaron canal/nombre/telefono/total3900/estado recibido/pago pendiente, detalle exacto FAM-QA-C5-ECO×6 y ausencia de operación/asignación/movimiento. Se crearon únicamente:

- APERTURAS: APE-20991231, fecha2099-12-31, lugar QA sintético, estado por_confirmar, pedidos anticipados pausado y presencial inactivo; creada_por qa-c5 y observación interna inequívoca. Valores validados por el contrato vigente, sin copiar una apertura comercial.
- Una fila de auditoría de preparación.

Se completaron estas cuatro celdas existentes:

| Celda | Campo | Valor |
|---|---|---|
| PEDIDOS!J25 | forma_pago | efectivo_al_retirar |
| PEDIDOS!K25 | observaciones | Fixture sintético C5 ECO |
| PEDIDOS!N25 | apertura_id | APE-20991231 |
| PEDIDOS!O25 | origen_pedido | QA_C5 |

id_pedido, fecha_hora2026-10-08T13:15:06.909Z, nombre original, total, estados, detalle, precio650, subtotal3900, snapshot y PRODUCTOS permanecieron idénticos. Readback nativo de todas las celdas acreditó solo esas cuatro modificaciones y las dos filas nuevas autorizadas. En ese punto: A4/B7,0 operaciones V2,0 asignaciones,0 movimientos nuevos.

La primera respuesta HTTP fue ambigua; reintentar el mismo fixture/plan devolvió COMPLETO y0 cambios, con evidencia histórica de recuperación. Una segunda llamada explícita también devolvió0 cambios. Hash de plan persistido: f518ea401e0135189c4dfa1a71e29722d8216061be0be9e6f57868ee94d3d964. Timestamp:2026-10-08T15:14:29.844Z. Actor qa-c5. No se creó otro pedido ni se alteró el detalle.

## 6. Puerto durable y nuevo STOP de movimiento

El mismo dominio C1/C2/C4 se compila a ES2019 síncrono, con SHA256 equivalente, sin reescribirlo. Port real bajo LockService, append de diario/asignaciones/movimientos, CAS fila+recibo y readback. No se afirma ACID. Orden: PREPARADA→APLICANDO→asignaciones→movimientos→stock con revisión/recibo→estado→puntero→readback→COMPLETADA. IDs/hashes deterministas; saldo coincidente solo no acredita autoría.

Los diarios CONFIRMAR_V2/CANCELAR_V2/REASIGNAR_V2 reutilizan columnas existentes. Movimientos conservan metadata versionada en observacion JSON, incluidos snapshots y metadata V1 mixta. Incertidumbre bloquea pedido/SKU; seis writers V1 consultan guard bajo su lock, sin cambiar semántica cuando no hay V2 pendiente.

La confirmación real falló antes de stock porque serializarFilaC5_ asigna el tipo moderno ASIGNACION_V2 tanto a tipo_movimiento como al campo legacy tipo. Esta última columna tiene enum incompatible. El nuevo test con la validación nativa reproduce exactamente operación APLICANDO, dos asignaciones y prefijo A:B del movimiento. Es un defecto del puerto/serialización, no del motor ni de la preparación ya recuperada.

No se completó, borró ni sustituyó esa fila parcial; no se liberaron bloqueos. La reconciliación QA existente solo restaura un recibo perdido mediante una inyección previamente auditada; no autoriza reparar este movimiento. Readback durable NO PASA; el readback histórico sí pasa.

## 7. E2E y cleanup

| Caso | Local | TEST real |
|---|---|---|
| Preparación ausente/parcial/replay | PASS, con validación nativa de pago | Recuperación/readback/replay PASS |
| A4+B2→A0/B5 | PASS en mock sin dropdown legacy de movimiento | STOP al primer movimiento; A4/B7 |
| Confirmación/cancelación/reasignación y replay | PASS local | Pendientes |
| Mixto V1/V2, un plan/3 efectos/2 asignaciones | PASS local | No ejecutado |
| Granel100/250/1000,150g a1350/kg=$203 | PASS local, sin recalcular fragmentos | No ejecutado |
| PERMITIR_SNAPSHOT | PASS local | No ejecutado |
| Fault/recovery durable | Matriz local PASS | No ejecutado; ambigüedad HTTP de preparación recuperada |
| Enum legacy de movimiento | Nuevo test reproduce STOP; retry local exige revisión | STOP real acreditado, sin retry posterior |
| Cleanup | Preparado/testeado; cierre QA y apertura/habilitaciones auditados | No ejecutado por operación incompleta |

Fixtures retenidos: FAM-QA-C5-ECO activa, oferta650 VARIABLE1000ml; SKU A/B activos, marcas QA-A/QA-B, stocks4/7, costos590/610, precio SKU_V1 700. POR_APERTURA habilitados solo en la apertura QA pausada. Pedido recibido ya recuperado, dos asignaciones, diario incompleto y movimiento parcial. Ninguna otra familia/SKU/pedido del ejecutor se creó: el primer escenario detuvo la ejecución.

Cleanup requiere cancelar los pedidos QA y devolver stock mediante operación durable, después de reconciliar con certeza. Conserva historial; inactiva familias/SKU, deshabilita relaciones QA y cancela la apertura QA. No se ejecutó ni se declaró falsamente terminado.

## 8. Integridad histórica y V1

Captura final independiente de19 pestañas. Comparación celda a celda excluye únicamente las cuatro celdas QA recuperadas y nuevas filas QA acreditadas. 0 modificaciones históricas/comerciales,0 stock/costo/precio comercial. Compras, ventas, costos, caja, calendario previo y las dos revisiones V1 intactos.

SHA256 de valores preexistentes antes/final: a394129a80f3fec376ec49446e4a0147d61189787876283b7cbd9b51eb770735, idéntico. SHA256 de cuadrícula preservada de esta continuación: cac4aa111d98d98112d549fa058c57242840756058c99db0f4135eae4101a742, idéntico antes/final.

Diferencial V1:23 archivos iguales,187 funciones GAS conservadas salvo seis guards exactos,47 acciones antiguas y51 funciones transporte iguales; seis escenarios VM idénticos (pedido unidad, granel100/250/1000, compra/admin legado, venta presencial granel). No se ejecutaron mutaciones comerciales como regresión. GET de catálogo V1 post-recovery idéntico al inicial (datos): SHA25623c00f8584db2c96fcabe7f28d32bcaae183f7c15846b2885b31b5c55502c9e4. Ningún SKU QA aparece en esa respuesta. Esta lectura no constituye aprobación del flujo V2.

Conteos finales:

| Hoja | Filas |
|---|---:|
| PRODUCTOS |58:56 anteriores+2 QA|
| FAMILIAS_PRODUCTO |1 QA|
| APERTURAS |17:16 anteriores+1 QA|
| APERTURA_PRODUCTOS |3:1 anterior+2 QA|
| PEDIDOS |24:23 anteriores+1 QA|
| DETALLE_PEDIDOS |28:27 anteriores+1 QA|
| OPERACIONES_PEDIDOS |19:18 anteriores+1 V2 QA incompleta|
| ASIGNACIONES_PEDIDO |2 QA|
| MOVIMIENTOS_STOCK |73:72 anteriores+1 fila parcial QA|
| AUDITORIA_PRODUCTOS |73:72 anteriores+1 preparación QA|

## 9. QA y límites

Suite final982 PASS/0 fallos; focal C4/C5/R333 PASS:93 nuevas respecto del checkpoint889. Incluye19 de preparación,63 GAS (dos reproducen nuevo STOP),4 HTTP,4 readback,2 adicionales del migrador y1 de encoding del deploy. Lint/typecheck/build aislado/secrets/diff/diferencial V1 PASS. Build fuera de Dropbox con WASM por bloqueo nativo; configuración temporal restaurada, sin cambios de dependencias ni tsconfig versionado.

Cobertura local de puerto:15 puntos de confirmación,13 cancelación y15 reasignación, caída tras escritura, replay/conflicto, corrupción/autoría/bloqueos. Preparación: ausencia, parcial real, detalle incompatible, stock/precio/identidad/apertura diferentes, operación/asignación/movimiento existente, corrupción de plan/readback y caída tras cada hoja. La suite reproduce rechazos esperados; no convierte C5 real en READY ni oculta el enum faltante en el mock inicial.

Evidencia privada: c5-recuperacion-readback.json, c5-preparacion-recovery-primera.json, c5-preparacion-recovery-replay.json, c5-recovery-backup-evidencia.json, c5-recovery-antes-nativo.json, c5-recovery-stop-final-nativo.json, c5-recovery-stop-integridad.json, e2e-familias-c5-preparacion-recuperada.json y logs QA/deploy. El checkpoint fallido v22 original también se conserva. Datos/URLs privadas/tokens no se versionan.

## 10. Archivos pendientes

Scripts: apps-script-pedidos.gs, generar-durable-c5-gs.mjs, e2e-familias-c5.mjs, deploy-apps-script-test.ps1, auditar-v1-familias.mjs y lib/familias-c5.mjs, lib/http-test-c5.mjs, lib/readback-familias-c5.mjs, lib/auditoria-guardrails-c5.mjs.

Dominio: src/lib/familias/esquemaDurableV2.ts (metadata opcional de movimiento V1 mixto). Fuentes C1/C2/C4 y flujos públicos conservados.

Tests: familias-c5-gas.test.mjs, familias-c5-http.test.mjs, familias-c5-readback.test.mjs, familias-c5-preflight.test.mjs, preparacion-fixture-c5.test.mjs, deploy-apps-script-test.test.mjs, helpers/sheets-c5-escenario.mjs, fixtures/preparacion-c5-v22.gs, pedido-familia-c1.test.mjs, asignacion-familia-c2.test.mjs, familias-durable-c4.test.mjs y remediacion-c5.test.mjs (solo línea vacía final).

Documentos: DATA_MODEL, DECISIONS, PROJECT_STATE, TASKS, TEST_PLAN, CHANGELOG y este informe. Total29 archivos. No UI, tienda, carrito, transportes públicos, setup, fotos, datos comerciales ni dependencias nuevos.

## 11. Próximo paso seguro

1. Mantener bloqueados PED-QA-C5-ECO-PRINCIPAL y ambos SKU; no reintentar ni ejecutar cleanup automáticamente.
2. Corregir localmente el mapeo del tipo moderno al campo legacy, modelando TODAS las validaciones nativas de las filas a escribir y prevalidándolas antes de efectos. Conservar tipo_movimiento/metadata/hash del contrato C4; no cambiar el enum ni degradar autoría.
3. Diseñar una reconciliación QA específica del movimiento parcial mediante plan/IDs/fecha/snapshots/readback, preservando asignaciones e histórico. Si la evidencia no alcanza, exigir revisión, sin rellenar por suposición.
4. Antes de cualquier escritura, crear otra copia verificada del estado actual y conservar código v23. Deploy TEST coordinado solo después de QA; no tocar Production.
5. Reconciliar con certeza y reanudar los checkpoints explícitamente: A4+B2, cancelación/reasignación, mixto, granel, D50, faults/recovery, cleanup, readback y cierre Git.

No hay HUMAN_GATE de familia desactivada: D50 PERMITIR_SNAPSHOT sigue cerrada. El bloqueo actual es técnico. La preparación es un resultado acreditado, pero el mismo archivo GAS contiene el puerto incompleto; no se hizo un commit final C5 ni se declaró árbol limpio.

## 12. Guardrails

Main/origin main intactos (f203e0c1f1d74ffd9e826032a8c0a60df4ce6c3f). Production, Sheet productiva y Apps Script productivo intactos. Solo estructura y fixtures/esquema TEST C5 autorizados. Sin datos comerciales, stocks/costos/precios comerciales modificados, familias comerciales cargadas, catálogo/carrito familiar o pedidos públicos V2 activados. Sin nuevas marcas/SKU reales, fotos, caja, usuarios ni conteo físico. F10 sin cambio de estado.
