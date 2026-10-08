# C5 — integración TEST en curso tras remediación acreditada

Actualización: R0–R10 completados y preflight limpio. [Acta de remediación, backup y readback](REMEDIACION_PRE_C5_2026-10-07.md). El STOP narrado abajo corresponde al intento anterior, preservado como evidencia; ya no bloquea C5. OPERACIONES_PEDIDOS tiene ahora20 headers con resolución aditiva. Apps Script sigue v20; integración/deploy/E2E C5 todavía pendientes en este checkpoint.

Fecha: 2026-10-07. Rama exclusiva: `feature/fase-3a-operativa`.
HEAD inicial y final: `f3a457c327e2d4f3c2d9b1d549edaa53ae6b9ee5`.

**No se ejecutó la integración real C5.** Las stop conditions detuvieron escrituras TEST antes de backup, migración y deploy. Se completaron únicamente el análisis del esquema, la política PERMITIR_SNAPSHOT, el migrador con puerto inyectado, tests locales y documentación. No se declara C5 completo.

## 1. Preflight real y motivo de STOP

Destino verificado por conector nativo y preflight Apps Script read-only:

- ID: `1U1nj_DKExmMV3pOA50JprcQ2d4TOQqb-4ORaJUagEoM`.
- Nombre exacto: `TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES`.
- 18 pestañas; PRODUCTOS56, PEDIDOS23, DETALLE_PEDIDOS27, MOVIMIENTOS_STOCK72, OPERACIONES_PEDIDOS18, DETALLE_COMPRAS4.
- FAMILIAS_PRODUCTO0; identidad familiar de PRODUCTOS vacía; ASIGNACIONES_PEDIDO inexistente.
- Inventario de headers y conteos coincide con el cierre C3/C4. Se compararon 5.107 posiciones de las matrices recuperadas contra la lectura conservada de C3. Ocho teléfonos diferían solo por renderizado fórmula/valor numérico: su userEnteredValue.formulaValue coincide exactamente con la fuente anterior. No se corrigieron ni imprimieron contactos.

**Bloqueos acreditados:**

1. `MOVIMIENTOS_STOCK!A59:T60`: el mismo identificador aparece en ambas filas, tanto en `movimiento_id` como en `id_movimiento`. Corresponden a SKU diferentes y comparten referencia de compra. Esto demuestra colisión de identidad; NO demuestra que una fila deba borrarse. Consta igual en la lectura conservada de C3: es preexistente.
2. Dos operaciones históricas `CREAR_PEDIDO` están en `REQUIERE_REVISION`. Su snapshot V1 carece del contrato `PEDIDO_MIXTO_V2_1`. C4 produce bloqueo global conservador para un diario incompleto no interpretable; los fixtures C5 tampoco pueden omitirlo. No se recalculó ni modificó esas operaciones.

La instrucción exige detener escrituras ante IDs duplicados y no degradar las garantías C4. Se aplicó STOP; no se inventó una excepción por tratarse de fixtures o datos anteriores. Ninguna deduplicación, renumeración histórica o exclusión de diarios fue ejecutada.

## 2. Esquema antes / propuesta / estado final real

Se revisaron `pedidoV2.ts`, `asignacionV2.ts`, `planMixtoV2.ts`, `adaptadorDurableV2.ts` y `almacenSheetsMemoriaV2.ts`. El esquema mínimo y la estrategia de serialización son propiedad de [DATA_MODEL, D51](../DATA_MODEL.md#esquema-durable-c5--diseño-local-no-migrado-2026-10-07-d51).

| Hoja | Antes y final TEST | Propuesta local, NO aplicada |
|---|---|---|
| PRODUCTOS |25 headers /56 filas|27 headers: revisión y recibo de stock|
| PEDIDOS |15 /23|18: puntero y recibos estado/puntero|
| DETALLE_PEDIDOS |11 /27|19: los ocho campos C1|
| ASIGNACIONES_PEDIDO |No existe|13 headers C1, inicialmente vacía|
| OPERACIONES_PEDIDOS |14 /18|Sin columnas nuevas|
| MOVIMIENTOS_STOCK |20 /72|Sin columnas nuevas; observacion JSON versionado|
| FAMILIAS_PRODUCTO |18 /0|Sin cambios|

La propuesta preserva recibos con operación/payload/plan/efecto y revisión física; no usa el saldo por sí solo como evidencia. Reutiliza `PEDIDOS.apertura_id` para el ID de apertura esperado y congela habilitaciones actuales en el plan. No duplica ese ID en un nuevo JSON de pedido. No genera IDs para las27 líneas históricas. V1 no depende de los campos nuevos.

`scripts/lib/familias-c5.mjs` construye requests como datos y permite un puerto **inyectado local**. No contiene Google APIs, credenciales ni llamadas HTTP. Solo extiende headers al final; amplía PRODUCTOS26→27 columnas físicas y crea la hoja de asignaciones vacía si falta. Antes de aplicar exige destino, ausencia de duplicados/bloqueos, backup nativo completo recuperable, comparación de valores/fórmulas/celdas/estructura y relectura sin concurrencia. Readback protege históricos; repetir en mocks produce0 cambios y0 segundo backup. No se conectó un ejecutor remoto.

## 3. Backup, versión y rollback

- **Backup Sheet C5: no creado**, porque STOP ocurrió antes de cualquier escritura. No se presenta un CSV o hash como backup recuperable.
- **Apps Script TEST v20 verificado** mediante inventario clasp del deployment configurado y dry-run protegido. HEAD remoto y versión desplegada coincidieron; destino embebido/token TEST y preflight fueron validados por el script existente. No se imprimieron secretos ni URL privada.
- Nueva versión: ninguna. Backup del código v20 para deploy C5: no ejecutado; esa fase no se alcanzó.
- No hay efectos C5 remotos que revertir. Se conservan las versiones previas y respaldos B2/B3; no se ejecutó rollback. Restaurar una copia histórica completa sobre TEST actual requeriría un plan que evite perder cambios posteriores, no se propone como solución automática a los duplicados.

## 4. Política humana cerrada

[D50, PERMITIR_SNAPSHOT](../DECISIONS.md#d50--familia-desactivada-permitir_snapshot-2026-10-07) reemplaza el gate anterior. El adaptador local permite confirmar pedidos recibidos cuando la familia está inactiva, registrando la decisión en el plan. Precio, nombre, presentación, subtotal y versión originales se conservan; no cambia costos ni precio familiar. C1 sigue rechazando un pedido nuevo de esa familia.

Stock suficiente, SKU activos/equivalentes, marca conforme y apertura vigente siguen siendo obligatorios. Desactivar no cancela; si operación decide no cumplir, cancela explícitamente. La incertidumbre técnica después de PREPARADA conserva REQUIERE_REVISION/readback; no se rehace un plan parcialmente aplicado, no se adivina autoría y no se convierte esa incertidumbre en una nueva decisión comercial.

## 5. Puerto real, recibos, lock y bloqueos

**No implementado/desplegado:** almacenamiento GAS equivalente, endpoints V2, guardrail real compartido y readback real V2. No se cambiaron `apps-script-pedidos.gs` ni `setup-google-sheet.gs`.

El análisis establece que la capa futura debe reproducir diario antes de efectos, asignaciones/movimientos deterministas, CAS saldo+recibo, estado/puntero verificables y lectura integral bajo LockService. Sheets no es ACID. Flush/readback incierto o escritura parcial de recibo deben bloquear; no se acepta el mero saldo esperado. C4 no permite ignorar los dos diarios V1 incompletos para acceder a TEST.

Pendiente acreditar también límites de celda/plan, normalización reversible de fechas/números/fórmulas y estrategia sincrónica del runtime Apps Script frente al dominio TypeScript async. Movimientos V2 pendientes son intenciones: futuros reportes no deben contarlos como efectos completados. No se prometió una garantía remota basándose en el mock.

## 6. QA local y ejemplos

| Verificación | Resultado |
|---|---|
| Focal C4+C5 |209 PASS (176 C4 +33 nuevas C5)|
| Focal C5 después del ajuste de esquema |33 PASS|
| npm test final |857 PASS,0 fallos|
| npm run lint |PASS|
| npx tsc --noEmit --incremental false |PASS|
| Build Next completo |PASS, salida aislada fuera de Dropbox|
| Scan secretos |PASS, valores suprimidos|
| git diff --check |PASS|
| Auditoría V1 diferencial |PASS|

Build aislado: `%LOCALAPPDATA%/Temp/almacen-c5-qa-20261007/build`; configuración temporal del proceso, variables remotas vacías y tsconfig restaurado. No cambios de dependencias/configuración versionada.

Las33 nuevas pruebas cubren destino incorrecto, ambos alias duplicados, diarios V1 inciertos, headers/mapa inesperados, backup inválido de ID/título/valor/fórmula/estructura, concurrencia y readback corrupto. Migración/idempotencia son **mocks**, no pruebas ejecutadas sobre TEST.

Ejemplos locales mantenidos/verificados:

- Familia650: A4+B2 para solicitud6 produce A0/B5. Cancelar devuelve A4/B7; replay no duplica. Con familia inactiva se conserva oferta original.
- Reasignar A4+B2→A1+B5 conserva cuatro asignaciones append-only; stock A3/B2; cancelar revierte el reparto vigente y restaura A4/B7.
- Pedido mixto V1/V2, saldo compartido y validación global antes de efectos siguen cubiertos por C4.
- Granel bases100/250/1000,150g dividido75+75 conserva subtotal203 y reversión/replay exactos: tests C4, D40 intacto.
- Matriz C4 de fallos después de cada escritura/checkpoint, timeout/502, corrupción, bloqueo y concurrencia volvió a pasar. **No hubo fault injection remoto C5**.

## 7. Evidencia V1 y readback TEST

Contra HEAD inicial C5, `git diff --quiet` confirmó igualdad de rutas/tienda/componentes, módulos F4/F5/F7/F8/F9, granel, transportes, C1/C2, plan C4, Apps Script y setup. Solo la política local del adaptador cambió en el dominio existente.

`scripts/auditar-v1-familias.mjs --no-write`:23 archivos V1 conservados;187 funciones GAS iguales contra baseline de sesión f273,47 acciones antiguas y51 funciones transporte; seis escenarios diferenciales VM idénticos (pedido unidad, granel100/250/1000, compras/admin legado y venta presencial granel). No se interpretan esos mocks como E2E remoto.

Readback de CellData de las18 pestañas antes/final, incluyendo valores ingresados, efectivos, formatos y validaciones, produjo la misma huella FNV64 sobre JSON canónico: **a1f772fe7d5c1040**. Los teléfonos/formulas originales y todos los valores recuperados se preservaron. La comparación fue read-only; no constituye backup ni prueba de atomicidad. No se cambiaron stock/costo/precio comerciales.

La igualdad de CellData también se comprobó por comparación canónica exacta, además de la huella. Verificación GET-only del backend v20: catálogo, productos admin, tres cabeceras de compra y sus detalles idénticos al readback conservado del cierre previo. SHA256 de catálogo: `23c00f8584db2c96fcabe7f28d32bcaae183f7c15846b2885b31b5c55502c9e4`. Familias0 y auditoría familiar válida. No se ejecutaron confirmaciones/cancelaciones/compras/ventas reales V1.

## 8. E2E, recuperación y cleanup

E2E real A4+B2, mixto, insuficiencia, granel, familia desactivada, timeout/caídas, reasignación y cancelación: **NO ejecutados** por STOP. No se crearon endpoints ni fixtures `FAM-QA-C5-*`, `PROD-QA-C5-*` o `PED-QA-C5-*`. Cleanup C5:0 registros; no había efectos C5 que neutralizar. No se borró ni ocultó evidencia previa.

## 9. Fases, archivos y siguiente paso

| Fase C5 | Estado |
|---|---|
| A |Análisis/contrato local completo; puerto real pendiente|
| B |Preflight real leído y detenido por bloqueos|
| C–Q |No ejecutadas remotamente; D/E preparados solo con mocks|
| R |Informe y documentos vivos actualizados|
| S |QA local PASS; integración/E2E TEST bloqueados|

Archivos modificados/creados: `src/lib/familias/adaptadorDurableV2.ts`, `src/lib/familias/esquemaDurableV2.ts`, `scripts/lib/familias-c5.mjs`, `tests/familias-durable-c4.test.mjs`, `tests/familias-c5-preflight.test.mjs`; DATA_MODEL, DECISIONS, PROJECT_STATE, TASKS, TEST_PLAN, CHANGELOG y este informe. No cambios de secretos, UI, flujos V1 ni backend desplegable.

Commit/push: **0**, porque la condición solicitada «si todo pasa» no se cumplió para C5 real. HEAD se conserva; cambios locales revisables sin stage. Main local/remoto conserva `f203e0c1f1d74ffd9e826032a8c0a60df4ce6c3f`.

**Próximo paso exacto:** auditar los movimientos59/60 y ambos diarios V1 con su compra/pedido/evidencia originales; definir una remediación explícitamente autorizada que conserve todas las líneas y trazabilidad. No renumerar/borrar ni resolver automáticamente el diario. Después repetir preflight. Solo con preflight válido: completar puerto y QA local, backup nativo verificado, migración/readback, backup v20 y deploy TEST, E2E aislado/cleanup/readback según el orden C5 original.

PERMITIR_SNAPSHOT ya no es HUMAN_GATE. Siguen pendientes la acreditación humana del mapa comercial y revisión visual/funcional antes de activación; no se cargó ese mapa. F10 sigue1 READY/19 PENDING.

**Guardrails:** main intacto; Production y Google Sheet productiva intactas; TEST Sheet intacta en esta tarea; Apps Script TEST siguev20, sin deploy;0 datos comerciales/stock/costos/precios reales modificados;0 familias comerciales cargadas; catálogo/carrito/creación pública V2 sin activar.
