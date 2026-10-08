# Remediación previa a C5 — TEST, 2026-10-07

Rama `feature/fase-3a-operativa`; HEAD inicial `f3a457c327e2d4f3c2d9b1d549edaa53ae6b9ee5`. Instrucción expresa de Omar: preservar trabajo local, acreditar tres bloqueos, remediar mínimo y continuar C5 solamente con preflight limpio.

## Preservación R0

Los doce archivos C5 originales se copiaron con sus bytes y SHA256, incluidos untracked, a `operativa.local/backups/working-tree-pre-remediacion-c5-2026-10-08T01-17-38-643Z`. Incluye status, diff reversible, manifest y segunda copia de recuperación verificada. `git apply --reverse --check` pasó sin aplicar reversión. Todo permanece ignorado por Git. TypeScript excluye `operativa.local` para no compilar las copias parciales privadas; no se descartó ningún cambio.

## Forense de movimientos R1/R2

Lectura propia de las18 pestañas, grids completos con FORMULA y CellData nativa. La compra `COM-20260917-142720-e4baeedd` tiene proveedor `Proveedor controlado PILOTO TEST`, dos detalles independientes y dos entradas independientes en HISTORIAL_COSTOS. No son movimientos duplicados comercialmente.

|Fila|id_movimiento legado conservado|movimiento_id canónico nuevo|SKU|detalle_compra_id|Cantidad / saldo / costo|
|---|---|---|---|---|---|
|59|MOV-20260917-142720|MOV-20260917-142720-D001|PROD-TEST-F78-64C8BE2C22E0|COM-20260917-142720-e4baeedd-D001|1 /1→2 /1100|
|60|MOV-20260917-142720|MOV-20260917-142720-D002|PROD-TEST-DECIMAL|COM-20260917-142720-e4baeedd-D002|0.1 /5.5→5.6 /1000|

Búsqueda exacta y embebida del ID original: únicamente A59/L59/A60/L60, sin referencias externas inesperadas. No se borró ninguna fila ni se modificaron fechas, compra, cantidades, SKU, saldos o costos. `id_movimiento` es alias histórico y puede repetirse; `movimiento_id` no vacío es canónico y debe ser único. Esto no autoriza otros duplicados modernos.

## Operaciones V1 R3/R4

`OPE-20260924-233415-1ca1a5b3` / `PED-20260924-233415-4d4ab88e`: cabecera única recibido, total100, apertura APE-20260926 y detalle único PROD-TEST-DECIMAL×0.1, precio1000/subtotal100 coinciden con el snapshot completo. Sin movimientos asociados por pedido/operación. Diff nativo completo: fecha_hora y telefono. La fecha serial nativa representa exactamente la fecha esperada; GET GAS ya la normaliza igual. El teléfono snapshot `000000000` se almacenó como número0. `cabeceraCreacionCoincide_` compara el teléfono como texto y produjo `cabecera_incompatible`; la fecha no causó esa incompatibilidad. Tras normalizar solo esas representaciones, diff vacío. Clasificación **CREACION_V1_ACREDITADA**.

`OPE-20260924-235720-04b91125` / `PED-20260924-235720-349b0a5b`: cabecera parcial única, total100, sin detalle ni movimientos. Fecha equivale exactamente. Seis diferencias reales, todos campos vacíos: estado_pedido, estado_pago, forma_pago, observaciones, apertura_id, origen_pedido. Identidad comercial restante coincide. Clasificación **FALLO_PARCIAL_V1_ACREDITADO**. No se reconstruyó ni eliminó evidencia parcial.

## Resolución R5/R6

Se añadieron al final de OPERACIONES_PEDIDOS seis headers: revision_resuelta, revision_tipo, revision_evidencia_hash, revision_detalle, revision_resuelta_por, revision_resuelta_en. Solo filas6/7 tienen valores; las demás quedan vacías. Actor `REMEDIACION-C5-2026-10-07`; timestamp `2026-10-08T01:27:49.973Z` (fecha local7octubre).

Evidencia JSON `ACREDITACION_CREACION_V1_1` incluye clasificación, operación/pedido, actor, fecha, explicación, hash de los14 campos originales, hashes de cabecera/detalles/inventario y pruebas explícitas. SHA256 verifica integridad y vinculación; no es firma del actor. El planificador deriva evidencia de lecturas autenticadas, nunca de una afirmación del navegador. Normalización del hash original se limita a timestamps serial/GAS equivalentes y milisegundos; no cambia las celdas.

Ambas operaciones conservan **REQUIERE_REVISION**, paso, errores, snapshot y resultado_json originales. Resolución válida deja de bloquear C5, pero no declara creación completada ni modifica semántica comercial V1. Texto libre, hash roto, original alterado, ID/key duplicados, diario desconocido o acreditación incompleta mantienen bloqueo conservador. PREPARADA/APLICANDO nunca se liberan por estos campos.

## Backup y readback R7–R10

Backup nativo completo: [BACKUP TEST REMEDIACION C5 R0 2026-10-08T01-31-00Z](https://docs.google.com/spreadsheets/d/1mVd7qMMESkUlz843J7Z9FDPPM7X3_5IpvxaaUIwjk9M/edit). ID distinto,18 pestañas, conteos, grids, congelados, fórmulas, valores y CellData con formato/validación idénticos al original. Recuperable mediante copia nativa verificada; no se ejecutó restauración.

Destino ID/nombre TEST revalidado; fuente relecta idéntica inmediatamente antes de escribir. Cinco requests updateCells con máscara userEnteredValue, total20 celdas:2IDs +6headers +12campos de acreditación. Readback completo: **20 diferencias autorizadas,0 diferencias no autorizadas**, valores y estructura histórica intactos. PRODUCTOS56, PEDIDOS23, detalles27, movimientos72, operaciones18; stock/costos/precios globales sin cambios.

Segunda ejecución del planificador contra lectura real actual: **0 cambios**; no reescribe timestamp/hash ni crea otro backup. Preflight C5 repetido: **seguro=true, problemas=[],0 incompletas bloqueantes, bloqueo_global=false**. FAMILIAS_PRODUCTO0 y ASIGNACIONES_PEDIDO aún inexistente. Las dos revisiones históricas permanecen visibles y acreditadas, no se ocultaron.

## QA y rollback

32 tests de remediación; SHA256 contra Node crypto (Unicode/surrogates/100000bytes), timestamps equivalentes, acreditación, corrupción, referencias externas, stock inesperado, parcial y replay. Focal con C4/C5:241 casos. Suite, lint, typecheck, build aislado sin credenciales remotas, secrets scan, diff check y auditoría V1 se registran en el checkpoint y acta C5. Auditoría V1:23 archivos iguales,187 funciones GAS iguales,47 acciones originales y51 funciones transporte iguales, seis escenarios VM idénticos. Apps Script permanece v20 en este checkpoint, sin deploy de remediación.

Rollback mínimo: comparar estado actual con el readback, restaurar únicamente L59/L60 a legacy y limpiar las12 celdas de resolución; conservar backup y evidencia local. Eliminar headers recién añadidos solo si no hay nuevos consumidores/escrituras; nunca restaurar indiscriminadamente la Sheet completa encima de cambios posteriores. No se ejecutó rollback.

R10 limpio habilita continuar C5 automáticamente según autorización. No se resolvió otra revisión ni se relajó el preflight. Main, Production y Sheet productiva intactos; histórico preservado. F10 no cambia.

QA checkpoint: suite889/889 PASS; focal R32 PASS; lint/typecheck/build aislado/scan346/diff/auditoría V1 PASS. Ningún archivo de secretos modificado.
