# C7-B PREP — Manifest, ingesta y paquete de migración local

Fecha:2026-10-12. Base897c7b7, rama exclusiva feature/fase-3a-operativa. Ningún paso escribe Sheet, despliega GAS ni activa público. Nadia aún no respondió; Omar ya envió las preguntas.

## Manifest y evidencia

[Manifest completo](MAPA_COMERCIAL_C7B_PREP_2026-10-12.json):54 SKU comerciales;3 APROBADO,7 PENDIENTE_NADIA,14 PENDIENTE_OMAR,12 PENDIENTE_CONTEO,18 POSTERGADO_GRANEL. Clorinda se conserva como oferta adicional aprobada sin SKU acreditado, pendiente de una futura alta explícita. Los3 aprobados son los mismos de C7-A, con contratos/identidades intactos. Los51 restantes solo tienen borradores y estados de evidencia; no contratos vendibles ni asociaciones. Precio de comanda es referencia de oferta y no se deduce de costo; las variantes ambiguas quedan sin precio asignado.

Las cuatro ofertas Económico conservan VARIABLE y marca_publica vacía. Falta marca interna y formato donde corresponda; la arquitectura no depende de publicar la marca. Las diez propuestas de cardinalidad siguen PENDIENTE_OMAR/decision:null, incluso cuando identidad de3 SKU está aprobada: una asociación inicial de un SKU no acredita una prohibición de incorporar otros equivalentes. Los dos inactivos históricos permanecen fuera del mapa sin volver a preguntar su baja.

Cada borrador tiene familia_id propuesta, nombre, precio si hay correspondencia documentada, presentación conocida, política/cardinalidad provisional, evidencia, gates y acción futura. Nombres VDR/Colunquen son propuestas públicas acreditadas; los nombres e IDs históricos no se alteran. Fuente de clasificación:[acta C7-A](FAMILIAS_PRODUCTO_FASE_C7A_REVISION_MAPA_2026-10-08.md).

| SKU restante | Familia propuesta | Precio comanda | Estado | Política provisional | Presentación conocida |
|---|---|---:|---|---|---|
| PROD-010 | FAM-POROTO-BURRO-HISTORICO | Sin asignar | PENDIENTE_CONTEO | POR_DEFINIR | Pendiente |
| PROD-020 | FAM-ACEITE-OLIVA-VDR-250-ML | Sin asignar | PENDIENTE_OMAR | EXPLICITA_POR_REVISAR | 250 ml (oferta VDR acreditada; identidad física pendiente) |
| PROD-021 | FAM-ACEITE-OLIVA-VDR-500-ML | Sin asignar | PENDIENTE_OMAR | EXPLICITA_POR_REVISAR | 500 ml (oferta VDR acreditada; identidad física pendiente) |
| PROD-022 | FAM-ACEITE-NATURA | Sin asignar | PENDIENTE_OMAR | EXPLICITA_POR_REVISAR | Pendiente |
| PROD-024 | FAM-AZUCAR | Sin asignar | PENDIENTE_CONTEO | POR_DEFINIR | 1 kg envasado, no granel |
| PROD-025 | FAM-TALLARINES-PARMA | Sin asignar | PENDIENTE_OMAR | EXPLICITA_POR_REVISAR | Pendiente |
| PROD-026 | FAM-FIDEOS-PARMA | Sin asignar | PENDIENTE_OMAR | EXPLICITA_POR_REVISAR | Pendiente |
| PROD-027 | FAM-SAL | Sin asignar | PENDIENTE_CONTEO | POR_DEFINIR | 1 kg envasado, no granel |
| PROD-028 | FAM-SALSA-DE-TOMATE-COLUNQUEN | Sin asignar | PENDIENTE_OMAR | EXPLICITA_POR_REVISAR | Pendiente |
| PROD-029 | FAM-TALLARINES-LUCHETTI | Sin asignar | PENDIENTE_OMAR | EXPLICITA_POR_REVISAR | Pendiente |
| PROD-030 | FAM-FIDEOS-LUCHETTI | Sin asignar | PENDIENTE_OMAR | EXPLICITA_POR_REVISAR | Pendiente |
| PROD-031 | FAM-CLORO-GEL-IGENIX-REVISION | Sin asignar | PENDIENTE_NADIA | VARIABLE_POR_REVISAR | Pendiente |
| PROD-032 | FAM-CLORO-GEL-EXCELL-REVISION | Sin asignar | PENDIENTE_NADIA | VARIABLE_POR_REVISAR | Pendiente |
| PROD-034 | FAM-MANGA-SWAN | Sin asignar | PENDIENTE_CONTEO | POR_DEFINIR | Manga/paquete; contenido pendiente |
| PROD-035 | FAM-PAPEL-HIGIENICO-6U-SWAN | Sin asignar | PENDIENTE_OMAR | POR_DEFINIR | Pack 6 unidades (oferta nominal) |
| PROD-036 | FAM-DETERGENTE-5L | Sin asignar | PENDIENTE_CONTEO | VARIABLE_POR_REVISAR | 5 L |
| PROD-037 | FAM-DETERGENTE-5L-CON-SUAVIZANTE | Sin asignar | PENDIENTE_CONTEO | VARIABLE_POR_REVISAR | 5 L |
| PROD-038 | FAM-DETERGENTE-CONCENTRADO-HISTORICO | Sin asignar | PENDIENTE_CONTEO | POR_DEFINIR | Pendiente |
| PROD-039 | FAM-JABON-1L | Sin asignar | PENDIENTE_CONTEO | VARIABLE_POR_REVISAR | 1 L (oferta nominal) |
| PROD-041 | FAM-PASTA-PEPSODENT-90-G | Sin asignar | PENDIENTE_OMAR | EXPLICITA_POR_REVISAR | 90 g (unidad comercial acreditada) |
| PROD-042 | FAM-TOALLA-NOVA-X3 | Sin asignar | PENDIENTE_OMAR | POR_DEFINIR | Pack x3 (oferta nominal) |
| PROD-043 | FAM-TOALLA-TORK | Sin asignar | PENDIENTE_OMAR | EXPLICITA_POR_REVISAR | Paquete; contenido pendiente |
| PROD-045 | FAM-SERVILLETAS-300U | Sin asignar | PENDIENTE_CONTEO | POR_DEFINIR | Pack 300 unidades (oferta nominal) |
| PROD-049 | FAM-PANOS-AMARILLOS | Sin asignar | PENDIENTE_CONTEO | POR_DEFINIR | Pendiente |
| PROD-050 | FAM-ESPONJAS | Sin asignar | PENDIENTE_CONTEO | POR_DEFINIR | Unidad (fuente institucional) |
| PROD-051 | FAM-AFEITADORA-DESECHABLE | Sin asignar | PENDIENTE_CONTEO | POR_DEFINIR | Pendiente |
| PROD-052 | FAM-B-DE-BASURA-70X90-VIRUTEX-REVISION | Sin asignar | PENDIENTE_NADIA | VARIABLE_POR_REVISAR | 70x90 (dimensión nominal); cantidad de pack pendiente |
| PROD-053 | FAM-PAN-DE-MASA-MADRE | Sin asignar | PENDIENTE_OMAR | NO_APLICA_POR_REVISAR | Pendiente |
| PROD-054 | FAM-EMPANADAS | Sin asignar | PENDIENTE_OMAR | NO_APLICA_POR_REVISAR | Pendiente |

## Ingesta futura

[Template Nadia](C7_RESPUESTAS_NADIA_TEMPLATE_2026-10-12.json):7 fichas SKU y2 grupos, todos PENDIENTE; null es ausencia de respuesta, no valor inventado. No se envió otro mensaje. `validarRespuestasNadiaC7` exige estado RECIBIDA, fuente/fecha, identidad completa y SKU conocido; rechaza campos extra (incluidos precio,stock,costo,familia_id), duplicados, fecha/unidad inválidas, fórmulas y conflictos con identidad acreditada. Normaliza L→ml y kg→g sin cambiar contenido equivalente.

`proyectarRespuestasNadiaC7` trabaja sobre copias y mantiene las3 aprobaciones. Una respuesta completa de los4 Económico puede generar identidad/contrato/mapa/dry-run automáticamente, conservando nombre/precio/política VARIABLE. Para Cloro se usa el1000ml público ya cerrado; no aceptar900ml ni volver a preguntar su formato. Las respuestas de variantes se validan/conservan, pero no fusionan IDs ni eligen precio/SKU vigente por inferencia: HUMAN_GATE de mapa/precio de variantes para Omar. No se convierte un reemplazo de marca en renombrado de SKU histórico.

## Plan futuro e inverso — no ejecutor remoto

`generarPlanMigracionFamiliasC7` acepta solo entradas APROBADO con contrato/identidad/evidencia completos y dry-run CUMPLE. Produce exactamente9 operaciones:3 CREATE_FAMILIA,3 UPDATE_PRODUCTO_IDENTIDAD,3 SET_FAMILIA_ID. Cada operación contiene valor_actual esperado,valor_nuevo,fila completa esperada,evidencia,estado_aprobacion y SHA256; IDs deterministas,hash integral del plan y lista de51 bloqueados. Un cambio en cualquier celda de la fila capturada (incluido stock/costo/precio/nombre) impide aplicar incluso en simulación.

El inverso restaura identidad y familia_id anteriores, preserva stocks/costos/precios y desactiva las3 familias creadas: no borra historia. Se rechaza rollback si otro SKU usa una familia. Simulación en memoria:primera9,segunda0,rollback9,replay rollback0. Recibos completos+fila final acreditan replay; saldo coincidente sin recibo no basta. Recibos parciales exigen HUMAN_GATE_OPERACION_PARCIAL; no se intenta recuperar una migración incierta automáticamente. Sheets no se considera ACID.

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/preparar-paquete-c7b.mjs operativa.local/c5-final-nativo.json operativa.local/c7b-paquete-migracion.json
```

Informe/planes con baseline comercial permanecen ignorados en operativa.local; no se versionan stocks/costos completos. El runner lee archivos locales, verifica ID/nombre de la captura y que sus bytes no cambiaron. No importa Google APIs/transportes ni posee opción de aplicar.

## Identidad y continuidad

Marca física distinta o formato comercialmente distinto requieren SKU distinto. Solo cambio de proveedor conserva SKU; proveedor pertenece a la compra. No crear proveedor fijo ni lotes. Se reutilizan C1/C2/C4 y compras V1 para pruebas futuras en mocks; no cambian operaciones desplegables.

## QA y límites

24 pruebas focales PREP/ingesta PASS, plan real desde captura conservada9/0/9 y0 escrituras remotas. Checkpoint1: suite1168 PASS/0 skipped/0 fail; lint,typecheck,build aislado,secrets,diff y auditoría V1 PASS. No se migran ni activan los51 pendientes. Gates:Nadia,cardinalidad/políticas Omar,conteo físico y derechos/imágenes separados. F10 no se promueve.
