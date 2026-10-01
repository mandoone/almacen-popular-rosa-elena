# Cierre técnico operativo TEST — 2026-10-01

Producción no autorizada. Evidencia privada, backups y cuentas en `operativa.local/` y `config/f10-readiness.local.json`, ignorados por Git. No hay contraseñas humanas ni nombres de personas en `src/`.

## Actualización de sesión autónoma

Control final adicional: runner F56 de septiembre asumía Arroz unitario y apertura histórica. Se retiraron ambos modos de escritura antes de cualquier red, conservando código histórico y preflight de destino read-only; no se reutilizó apertura ni SKU comercial. Piloto actual y runner granel usan los escenarios sintéticos vigentes. Dos pruebas de proceso con opt-in PASS, preflight F56 remoto PASS y clasp dry-run sin push/deploy PASS. **Suite final 470/470, lint/build/preflight PASS**, sin nuevas escrituras TEST. La QA de 468 y CI de 8c4d6f7 documentados debajo son el checkpoint previo.

QA final sobre código 8c4d6f7: **468/468 tests**, 50 focales granel/conteo/registro, lint, typecheck, build, scan (303 archivos), diff y preflight técnico desde worktree limpio PASS. Backend TEST preflight integral read-only PASS, escrituras de piloto deshabilitadas. F10 estricto devuelve PENDING/exit 1 esperado: 1 READY, 19 PENDING, 0 FAIL; check:go-no-go conserva dominio/configuración productiva pendientes. package.json/lockfile idénticos a c036320.

CI remoto de los nueve checkpoints de implementación/documentación PASS; [ejecución del código final](https://github.com/mandoone/almacen-popular-rosa-elena/actions/runs/36917209708). Dos Previews automáticos del mismo SHA reportan success en GitHub/Vercel; petición HTTP directa devuelve 302 a protección de Vercel. Conector protegido no permitió smoke autenticado (INVALID_ARGUMENT); no se declara runtime remoto PASS. QA funcional/visual actual validada localmente contra backend TEST. No se creó Preview manual ni se alteró protección/configuración para acceder.

Rama única feature/fase-3a-operativa, origen c036320 limpio/sin divergencia; checkpoints enviados sin force/main/merge/rebase/PR. Backups y evidencia privados ignorados. Production, Sheet/Apps Script/env productivos, dominio, SITE_URL productivo y WAF **NO modificados**.

Estado vigente al cierre de bloques 1–9: Apps Script TEST **v18**, fuente/manifest anterior v17 respaldados; 56 maestros/18 GRANEL coinciden con matriz. Readback de las 17 tablas mantiene maestros, saldos e historia idénticos al baseline de preparación de conteo; fotos comerciales vacías y aperturas reales intactas.

Sesión desde c036320: **17 precios adicionales** (10 granel + 7 envasados), **24 costos adicionales** (11 granel + 13 envasados). Acumulado con baseline anterior: 31 precios corregidos, 30 costos activos acreditados y 22 PENDING_HUMANO. No altas nuevas en esta sesión; Empanadas ya existía en HEAD inicial. [Tres preguntas comerciales](CATALOGO_PENDIENTES_REALES_2026-10-01.md).

Preparados y validados: [activación de diez cuentas](ACTIVACION_CUENTAS_TEST.md), tres guías, [ensayo presencial 40 minutos](../ENSAYO_FINAL_F10_TEST.md), [conteo/dry-run/importador](CONTEO_CORTE_TEST.md) y [cutover compatible](CUTOVER_TECNICO_PREPARADO.md). Archivos nominales/hash/comandos/checklists/acta/saldos viven ignorados; no credenciales humanas, conteos ni montos aplicados.

[F10 completo](REVISION_F10_2026-10-01.md): 1 TÉCNICO_RESUELTO, 15 HUMAN_GATE, 4 SOLO_CORTE_PRODUCTIVO; 0 pendiente técnico ejecutable en TEST. Manifiesto conserva 1 READY/19 PENDING/0 FAIL y NO-GO. El contrato productivo requiere habilitación explícita futura: promover Preview o cambiar variables no basta y no autoriza el corte.

[Cuatro alertas npm](AUDITORIA_DEPENDENCIAS_2026-10-01.md) investigadas, sin upgrades/package/lockfile modificados. Dos DEV_ONLY, PostCSS transitiva sin entrada HTTP hostil identificada y Next heredada; mantenimiento separado y reauditoría al corte. Alertas no corregidas ni ocultas.

QA visual adicional de solo lectura: carrito Arroz 150 g / $203 en 390×844 sin truncar nombre/desbordar, referencias /kg, Otra cantidad, UNIT histórico normalizado y formularios Admin válidos; granel muestra gramos libres. Venta no muestra Caja; /me de tres actores sintéticos devuelve su rol. Consola vacía después de reiniciar navegador. No ventas/ajustes en esta revisión. Servidor/navegador cerrados y cookies efímeras retiradas.

Auditoría documental: requisitos de costo+margen automático/reserva al crear corregidos; fuente comercial jerárquica explícita; cuentas/horarios/granel ya resueltos no se reabren. Doce documentos históricos conservan texto original con aviso de supersesión D36/D40 y enlace al estado vigente. El backend, matriz y documentación actual concuerdan.

Bloque 2: siete precios, trece costos y tres correcciones de nombres adicionales; 21 maestros actualizados, cero altas. Readback y replay PASS (segunda aplicación cero cambios), stock e historia conservados. [Matriz completa](MATRIZ_CATALOGO_2026-10-01.csv) y [tres preguntas agrupadas](CATALOGO_PENDIENTES_REALES_2026-10-01.md): 30 costos acreditados / 22 PENDING_HUMANO. Lint y 25 tests focales PASS.

[Granel real D40](GRANEL_TEST_2026-10-01.md) supersede las dudas de granel/unidad de la auditoría anterior registrada debajo. Dieciocho maestros actualizados solo TEST v17, diez precios adicionales, once costos adicionales y cinco nombres sin presentación cerrada. Saldos numéricos, IDs, snapshots anteriores y dos REQUIERE_REVISION conservados. Backup Sheet y fuente Apps Script v16 privados; esquema aditivo con repetición sin cambios y readback completo.

E2E HTTP local PASS: Arroz 250 g = $338, precio/modo/referencia hostiles ignorados, creación y replay, confirmación Venta y replay, cancelación Venta 403, Operación cancela y replay, saldo 91 → 90.75 → 91 en base heredada de 1000 g. Un pedido sintético cancelado conservado y apertura sintética APE-20261004 cerrada. Cada fila preexistente de historia permaneció idéntica; cada maestro y saldo terminó idéntico al inicio del E2E; aperturas reales intactas. UI desktop/móvil con agent-browser: referencia /kg y peso libre 150 g = $203, sin overlay ni errores; ajuste de distribución del carrito para conservar nombre legible.

QA del primer checkpoint: 444 tests, lint, typecheck, build, scan y preflight; resultados finales de toda la sesión se incorporan al cierre. F10 continúa NO-GO y los saldos TEST no constituyen conteo físico.

## Baseline del bloque anterior (c036320)

## Permisos aprobados

| Acción | Venta | Operación | Administración |
|---|---|---|---|
| Ver/confirmar/entregar pedidos, venta presencial y consultar stock | SÍ | SÍ | SÍ |
| Cancelar pedido | DENY | SÍ | SÍ |
| Ajustar stock, compras, caja, gastos, abastecimiento, reportes | DENY | SÍ | SÍ |
| Gestionar productos/precios y oferta por apertura | DENY | DENY | SÍ |
| Configuración y usuarios | DENY | DENY | SÍ |

Jerarquía Administración incluye Operación y Venta; Operación incluye Venta. Asignación definitiva: 2 Administración, 2 Operación y 6 Venta. Usernames simples y nombres visibles ya definidos por el Almacén, guardados únicamente en la matriz local. Horario habitual confirmado: 11:00–15:00.

## Modelo y cambios TEST

`PRODUCTOS.tipo_disponibilidad`: REGULAR/POR_APERTURA; campo ausente o vacío se interpreta como REGULAR. `activo=NO` siempre oculta y rechaza nuevas compras. Los históricos se conservan con el mismo ID. `APERTURA_PRODUCTOS` usa pareja única apertura_id/producto_id y habilitado SI/NO, actualizado_por/en.

Sin apertura se ofrecen REGULAR activos; con apertura, además los especiales habilitados. Apps Script valida apertura, actividad y habilitación bajo el lock al construir el pedido y la venta presencial. El precio sigue en PRODUCTOS y el detalle conserva snapshot. Confirmación/cancelación y diario durable F9-A permanecen con su contrato.

Administración puede escoger el tipo en Productos y habilitar/deshabilitar desde Calendario → Productos especiales. API y UI usan productos:gestionar. Next protege cancelación con pedidos:cancelar; Venta recibe 403 antes de invocar Apps Script.

Migración aplicada únicamente a Sheet titulada exactamente `TEST - BD_WEB_ALMACEN_ROSA_ELENA_MORALES` con APP_ENV=TEST: backup completo previo, 55 filas normalizadas, columna aditiva y nueva relación. Repetición: cero cambios ni nuevo backup de esquema. Apps Script TEST pasó v15 → v16 en su deployment existente.

| Producto | ID conservado/creado | Resultado |
|---|---|---|
| Poroto blanco | PROD-009 | SI, REGULAR; precio pendiente por unidad kg/unidad |
| Poroto burro | PROD-010 | NO, histórico; precio e historia conservados |
| Detergente 5L | PROD-036 | SI, REGULAR |
| Detergente 5L con suavizante | PROD-037 | SI, REGULAR; nombre completo, precio 1800 |
| Detergente concentrado | PROD-038 | NO, histórico; ID e historia conservados |
| Empanadas | PROD-054 | SI, POR_APERTURA, unidad, referencia 2500; stock técnico inicial 0 |

Empanadas no se habilitó para ninguna apertura real, incluida 03/10. El stock técnico cero del alta no es conteo físico. No se borraron filas históricas.

## Fuentes, auditoría y precios/costos

No se encontraron las planillas ni carpeta de fotos en las ubicaciones sincronizadas accesibles. El conector Drive permitió leer las fuentes vigentes sin modificarlas:

- COMANDAS 2026, pestaña **Copia de  19/09**, encabezado apertura **3 octubre 2026**, B15:C66. Es la última comanda preparada al 01/10. La pestaña original ** 19/09** corresponde a la última apertura realizada; se verificó para distinguir ambas.
- Diseño de compra 2026, **Octubre**, primer bloque **COMPRA 03/10**, C4:G53. Los bloques repetidos de septiembre, saldos, nombres privados e inventario de compra no se usan como stock actual.
- Carpeta Drive **Productos del almacén**: inventario por nombre, sin descargar, renombrar ni asociar imágenes.

[Matriz completa](MATRIZ_CATALOGO_2026-10-01.csv): 55 productos iniciales revisados (53 comerciales + 2 fixtures), más Empanadas. [Extracto comercial de fuentes](FUENTES_CATALOGO_2026-10-01.csv), sin datos personales ni IDs/enlaces privados.

Diff previo local y backup antes de aplicar: 18 productos existentes actualizados y 1 alta; **14 precios de venta cambiados y 6 costos cargados**, con readback. IDs, stocks existentes, detalles y operaciones históricos conservados. Segunda aplicación no repite cambios.

Precios cambiados: PROD-014, 016, 017, 018, 020, 021, 034, 037, 039, 041, 042, 045, 050 y 053. Se conserva el precio de comanda incluso si queda bajo el costo; no se impone costo + 10%.

Costos cargados: té 250 g = 8400/kg × 0.25 = 2100; pimienta 100 g = 1200; ají 100 g = 600; bicarbonato 100 g = 110; orégano 100 g = 640; paño amarillo U = 120. Las primeras cinco conversiones usan el encabezado explícito Costo x K y la presentación 250/100 GRS; no completan costos ausentes.

PENDING: Granel que sigue unidad/NO/1 frente a compra K; precios/formato no acreditados; Colunquen vs Toddo, Vor vs VDR, cloro gel Igenix/Excell sin marca en comanda, cloro Económico/Clorinda y bolsa TODDO vs VIRUTEX; formatos/costos de packs, litros o gramos no inequívocos. No fusionar SKU ni convertir unidades sin evidencia. Los ceros de costo sin respaldo son faltantes, no costos reales cero. La matriz identifica cada caso.

## Fotos y cuentas

[Inventario de imágenes](INVENTARIO_FOTOS_2026-10-01.csv): 41 JPEG: 34 candidatos de confianza MEDIA y 7 ambiguos de confianza BAJA, basados solo en filename. Dos archivos llamados harina y varios detergentes, cloro, toallas/salsa/bolsas son ambiguos. Todos los 54 maestros comerciales tienen imagen_url vacía: ninguna foto aprobada/asociada. Doce productos comerciales carecen de candidato por nombre (incluye históricos); las asociaciones tentativas tampoco cuentan como fotos verificadas.

Matriz privada de 10 actores: formato válido, unicidad, sin colisión con cuentas TEST, roles 2/2/6, capacidad del runtime 50. No se generaron ni activaron credenciales humanas. `operativa.local/PROCEDIMIENTO_CUENTAS.md` contiene los diez comandos exactos de `npm run auth:credential -- --actor <id> --role <rol>`, incorporación segura de nombres visibles/hashes, versionado y ensayo.


Se retiró de src la lista nominativa heredada de F3A y su mapa de roles por nombre. El validador histórico ahora recibe un registro explícito y falla cerrado si falta; sus fixtures usan actores sintéticos. Autorización vigente exclusivamente por sesión y capacidades.

## F10 y siguiente intervención humana

Manifiesto local v2: roles_aprobados READY con fecha y referencia **Confirmación Almacén/Omar 2026-10-01**; 19 checks PENDING, cero FAIL. Credenciales/ensayo de cuentas, aprobación editorial y contactos restantes, derechos/fotos, conteo físico y unidades, ambigüedades de catálogo/costos, mínimos/prioridades, arqueo efectivo/banco, responsables/ventana, capacitación, ensayo humano final, dominio HTTPS, backup/versiones/rollback finales requieren evidencia humana o gate de Producción.

Primer lanzamiento acordado: WAF por IP más limitador local por IP+actor. Riesgo regional y ausencia de contador global por actor aceptados para este lanzamiento; WAF NO ACTIVADO. Cuota/umbral, dominio, publicación, secreto y revocación de deployments históricos se ejecutan solo con gate productivo. Horario, usernames, roles y elección de las capas no se vuelven a preguntar.

## Reproducibilidad técnica

`scripts/migrar-catalogo-operativo-test.mjs`: --preflight, --prepare-test, --apply-plan <plan local>. Bloquea variables productivas; verifica destino exacto, guarda snapshots ignorados, revisa plan/diff, backup, IDs e integridad y confirma readback.

`scripts/validar-matriz-cuentas.mjs`: valida roster privado contra el parser de identidades vigente. `scripts/e2e-disponibilidad-test.mjs`: solo origen local puerto 3100 + backend TEST demostrado, sesiones sintéticas ignoradas, apertura sintética controlada, stock compensado y restauración. No borra apertura referenciada: se cierra conservando evidencias.

## QA final y preservación de historia

Suite completa: **418/418 PASS, 0 fallos** (baseline 393 + 25). Lint, build, typecheck, secrets scan (278 archivos), diff check y preflight técnico local PASS. Audit crítico PASS: **0 críticas**, con 4 alertas abiertas (3 altas y 1 moderada) en dependencias transitivas/Next, registradas para mantenimiento separado sin cambiar dependencias.

E2E HTTP local contra Apps Script TEST v16: especial sin habilitación invisible/pedido rechazado; habilitado visible y pedido aceptado; Venta confirma y recibe 403 al cancelar; Operación cancela; replay no duplica descuento ni devolución. Stock fixture **5.5 → 5.4 → 5.5 kg**. Apertura sintética APE-20261002 cerrada; oferta sintética deshabilitada y fixture REGULAR restaurado. Empanadas nunca habilitadas. Dos pedidos sintéticos cancelados conservados como historia de QA (primer flujo con respuesta HTTP tardía y posterior ejecución completa PASS). Los fallos transitorios de transporte Google se resolvieron con las mismas claves y readback; no se consideran aceptación de un estado sin verificar.

Comparación fila a fila de todos los registros preexistentes: OPERACIONES_PEDIDOS 9 → 15, PEDIDOS 20 → 22, DETALLE_PEDIDOS 24 → 26, DETALLE_VENTAS 24 → 24. Todas las filas anteriores idénticas; las dos REQUIERE_REVISION se conservaron sin modificación. El aumento corresponde a QA, no borrado/reconstrucción. Todos los productos y stocks previos al E2E quedaron idénticos al terminar; aperturas reales intactas.

QA visual local de catálogo, Productos/Empanadas, Calendario/oferta y panel Venta PASS, sin errores de consola. No se creó Preview manual; servidor y navegador de QA cerrados al finalizar. Sesiones efímeras eliminadas; capturas y evidencia privada permanecen ignoradas. Producción, WAF, dominio y env productivos no cambiaron.
