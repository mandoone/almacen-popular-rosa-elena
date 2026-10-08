# TEST_PLAN.md — Plan de pruebas manuales

## C6 shadow TEST/admin —2026-10-08

75 pruebas focales, suite1125 PASS/0 skipped, frontera TEST/capacidad/solo GET, precio independiente, marcas, equivalencia, apertura, granel, overflow y mapa sin mutaciones. QA visual localhost desktop1280×900/móvil390×844 con mocks/red remota bloqueada; GET TEST reales por separado, sin formulario ni escritura. Lint/typecheck/build aislado/scan/diff/auditoría V1 acreditados. Revisión visual humana sigue pendiente, no cambia F10. [Evidencia, reproducción y auditoría de faltantes](operativa/FAMILIAS_PRODUCTO_FASE_C6_SHADOW_2026-10-08.md).

Validar además contenido físico interno, política pública, errores comprensibles y viewport desktop/móvil con fixtures locales.
[Propuesta de mapa y evidencia por SKU](operativa/MAPA_COMERCIAL_FAMILIAS_SKU_PROPUESTA_2026-10-08.md).

## C5 cierre TEST real —2026-10-08

20 escenarios E2E/194 respuestas checkpointadas, cleanup91/replay0,0 bloqueos QA. Native readback completo de19 hojas preserva valores/fórmulas/formatos/validaciones; catálogo V1 idéntico. Suite1050 PASS/0 skipped:161 pruebas netas nuevas desde889 del checkpoint30e047e. Focal de cadena de readback23 PASS; los casos negativos rechazan evidencia, actor, recibo, transición y auditorías faltantes/duplicadas. Lint/typecheck/build aislado/scan/diff/V1 se verifican en cierre. [Matriz y evidencia](operativa/FAMILIAS_PRODUCTO_FASE_C5_TEST_REAL_2026-10-07.md).

Los registros siguientes conservan resultados históricos; los STOP ya fueron resueltos, no son el estado actual.

## Estado histórico previo a recuperación: C5 puerto GAS y migración TEST (2026-10-08)

61 tests de puerto GAS simulado: misma fuente compilada que C4,15 puntos de confirmación,13 de cancelación y15 de reasignación, setValues exitoso con respuesta perdida, reparto vigente append-only, mixto/stock compartido, granel100/250/1000, D50, autoría incierta y reconciliación QA limitada. Incluye runtime sin Array.at y rechazo de preparación parcial sin reparar.4 tests HTTP,4 de readback y35 del migrador, incluyendo cuadrícula completa/filas vacías.

Suite960 PASS. Migración real: backup18 pestañas legible,19 posteriores,26 headers añadidos, históricos intactos y segunda ejecución0. E2E real STOP: cabecera QA sin apertura,409 PEDIDO_CONTEXTO_CAMBIO,0 operaciones/asignaciones/movimientos V2. Stocks QA4/7; cleanup no ejecutado. Catálogo V1 y huellas comerciales iguales. Mixto/granel/D50/reversión/faults siguen pendientes en TEST; sus PASS locales no acreditan E2E remoto. [Acta C5](operativa/FAMILIAS_PRODUCTO_FASE_C5_TEST_REAL_2026-10-07.md).

## Remediación C5 R0–R10 (2026-10-07)

32 tests focales: SHA256/UTF8/seriales, forense, ID canónico/alias, dos acreditaciones, corrupción, bloqueo PREPARADA/APLICANDO, desconocidos, duplicados, referencias externas, efectos de stock y replay0. Readback TEST nativo:20 cambios previstos,0 ajenos; preflight limpio. V1 diferencial sin cambios comerciales. [Acta](operativa/REMEDIACION_PRE_C5_2026-10-07.md).


## C5 parcial — preflight y PERMITIR_SNAPSHOT local (2026-10-07)

`tests/familias-c5-preflight.test.mjs`:33 pruebas nuevas de destino/IDs/headers/bloqueos, backup nativo, fórmulas, concurrencia/readback, migración en mocks y segunda ejecución0. D50: nuevo pedido inactivo rechazado; recibido conserva snapshot y puede confirmar/reasignar/cancelar; ninguna excepción para stock, marca, contenido o apertura. Los dos casos C4 de política fueron actualizados por D50; sigue con176 casos.

Focal C4+C5:209 PASS. Suite857 PASS; lint/typecheck/build aislado/secrets/diff/auditoría V1 PASS. TEST real: lecturas/preflight/dry-run de deploy únicamente; STOP por ID duplicado y diario V1 incompleto. **0 E2E reales C5, 0 fallos inyectados remotos, 0 fixtures cargados.** [Entrega y bloqueos](operativa/FAMILIAS_PRODUCTO_FASE_C5_TEST_REAL_2026-10-07.md).

## C4 — persistencia simulada durable (2026-10-07)

`node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/familias-durable-c4.test.mjs`:176 casos. Todos los puntos de escritura/checkpoint y readback, nuevo proceso/replay, HTTP TIMEOUT/502, corrupción/autoría incierta, mixed V1/V2 con validación acumulada, cancelación/reasignación append-only, recibo de puntero, apertura, política de familia desactivada (hoy D50), granel100/250/1000 y bloqueo/concurrencia. Hojas/HTTP exclusivamente en memoria; cero servicios remotos. Suite824 al cierre C4 y857 con C5 local. [Matriz de fallos y supuestos históricos](operativa/FAMILIAS_PRODUCTO_FASE_C4_DURABLE_LOCAL_2026-10-07.md).

## C3 — auditoría integral (2026-10-07)

`tests/familias-admin-frontera-c3.test.mjs` ejecuta handlers reales con transportes mock: fuera de TEST y roles sin permiso reciben403 antes de backend; actor no se inyecta y DTO rechaza campos físicos/comerciales indebidos. `scripts/auditar-v1-familias.mjs` compara 23 archivos,187 funciones GAS,47 acciones y51 funciones transporte con f273001; seis escenarios VM diferenciales idénticos. Suite final648 PASS, QA/backup/readback y limits de revisión humana en [informe](operativa/SESION_LARGA_FAMILIAS_SKU_2026-10-07.md).

## C2 — motor local (2026-10-07)

`tests/asignacion-familia-c2.test.mjs`: A4+B2→A0/B5 y reversión exacta, rechazo de incompatibilidades/duplicados/cantidades/stock, múltiples líneas, apertura, replay/conflicto409, maestro cambiado, checkpoints, cursor atrasado con evidencia, escritura parcial/concurrencia/plan corrupto requieren revisión, cancelación recibido/confirmado/inactivo, reasignación íntegra y granel100/250/1000. Mocks sin red; ningún caso comercial real. Plan puro no sustituye pruebas futuras del adaptador durable remoto.

## C1 — contrato local paralelo (2026-10-07)

`tests/pedido-familia-c1.test.mjs` comprueba versión explícita/legados, IDs separados, cantidad/unidad/versiones, snapshot comercial coherente, inyección de precio ignorada, granel 150 g = $203 y aislamiento de rutas/GAS. ASIGNACIONES_PEDIDO no existe remotamente y ningún pedido V2 se acepta públicamente.

## B3 — administración técnica TEST (2026-10-07)

`tests/familias-producto-fase-b3.test.mjs`: CRUD, versión/ID, validación de asociación, destino estricto, migración/backup idempotente, replay histórico, payload distinto, compensación y bloqueo durable incompleto. UI/APIs cerradas fuera de TEST; DTO de identidad rechaza stock/costo/precio, actor siempre servidor. Solo mocks para escrituras. Lecturas remotas y esquema constan en [acta](operativa/FAMILIAS_B3_TEST_2026-10-07.md). Revisión visual por Omar pendiente, sin familias reales ni cambio de F10.

## B2 — esquema TEST autorizado (2026-10-07)

`tests/familias-b2.test.mjs` comprueba destino, duplicados, respaldo inválido, concurrencia, corrupción y segunda ejecución sin cambios. La ejecución real comparó backup de 17 pestañas y todas las celdas anteriores tras cuatro requests atómicos; no hubo valores nuevos en filas. Post-deploy solo GET destino/esquema/maestro/catálogo/compras/detalles, con evidencia privada y errores sanitizados. [Acta](operativa/FAMILIAS_B2_TEST_2026-10-07.md).

## Identidad SKU/compras — Fase B1 exclusivamente local (2026-10-07)

Ejecutar `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/familias-producto-fase-b1.test.mjs`: validadores TS/GAS, contratos DTO, persistencia interna/auditoría de identidad, columnas ausentes/duplicadas, dos marcas, proveedor por cabecera y costo por detalle, precio familiar intacto, inyección de seis snapshots ignorada, replay con maestro cambiado/inválido, conflictos de key, legado con/sin columnas y GRANEL/base nativa. Fallos en detalle, movimiento, historial (incluida segunda línea), cabecera y flush deben restaurar stock/costo y filas, conservar historia previa y permitir retry único. Todos usan hojas/locks/propiedades en memoria; sin red.

Comparar por AST funciones GAS contra el HEAD inicial B1: solo seis existentes de productos/compras pueden cambiar. Transporte compilado debe permanecer idéntico y UI/rutas/pedidos/confirmación/cancelación/venta/granel sin diff. Completar suite, lint, typecheck, build local sin destinos backend, scan de secretos, generador `--check` y `git diff --check`. No ejecutar setup/migraciones/E2E remoto ni deploy. [Resultados](operativa/FAMILIAS_PRODUCTO_FASE_B1_2026-10-07.md).

## Familias — Fase A exclusivamente local (2026-10-07)

Ejecutar `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test tests/familias-producto-fase-a.test.mjs`: validadores TypeScript/GAS con fixtures, 750 ml vs 1 L, marcas explícitas, SKU sin familia, inactivos/especiales, precio familiar independiente del costo, errores/duplicados/desbordes y pureza. Cloro A+B = 11/$650; Clorinda independiente = 9; granel 4×250 + 2×1000 = 3000 g. Una inconsistencia impide anunciar vendibilidad. El test V1 ejecuta catálogo, creación sin descuento, confirmación y cancelación con campos familiares presentes sin consultarlos. Ninguna prueba llama servicios reales.

Verificar además `node scripts/generar-contrato-familias-gs.mjs --check` y suite completa. No ejecutar setup, migración, E2E remoto ni deploy para esta fase. [Resultados y límites](operativa/FAMILIAS_PRODUCTO_FASE_A_2026-10-07.md).

Control editorial TEST 07/10: abrir Inicio, Historia, Rosa Elena y Participar en escritorio/móvil; comprobar cronología de cinco hitos, biografía fiel a Nadia, tres tarjetas de participación, WhatsApp/mail/Instagram y dirección compartidos. No deben aparecer equivalencia al costo base, porcentaje interno, desglose operativo ni datos bancarios. Marca del Almacén conserva un apellido Morales; la biografía usa el nombre completo de Rosa Elena. QA técnica/visual del agente y revisión pendiente por Omar en [evidencia editorial](operativa/CONTENIDO_PUBLICO_TEST_2026-10-07.md). Sin envíos de pedidos ni escrituras remotas.

Último control de continuidad D40: **470/470 PASS**. Dos pruebas nuevas ejecutan ambos modos históricos F56 con opt-in y comprueban rechazo antes de red/filtración. Runner read-only confirma destino TEST sin asumir Arroz unitario ni horario de septiembre; remote preflight PASS. Piloto/granel son los runners vigentes de escritura sintética. Lint/build/preflight y clasp dry-run PASS; ninguna escritura adicional.

QA final de sesión autónoma 01/10 sobre 8c4d6f7: suite **468 PASS**, 50 focales granel/conteo/registro; lint/typecheck/build/secrets (303)/preflight técnico limpio y remoto integral read-only PASS. Nueve CI verdes, dos Previews automáticos build success; smoke remoto protegido por 302 no validado con autenticación (conector INVALID_ARGUMENT). Browser local contra TEST: carrito 150 g/$203 móvil sin desbordes, formularios GRANEL/UNIDAD y Venta sin Caja, tres /me con rol propio; cero escrituras en revisión visual. [Evidencia final](operativa/CIERRE_TEST_2026-10-01.md).

Conteo preparado 01/10: 18 tests nuevos / 44 focales. CSV, unidades y cobertura, costos/precios, precisión de 1 g en tres bases, stock concurrente/replay y modo unitario histórico. Plantilla real de 52 productos sin cantidades; dry-run detecta 178 campos pendientes (incluidos 22 costos), cero escrituras. [Procedimiento](operativa/CONTEO_CORTE_TEST.md).

Capacitación 01/10 preparada: tres guías, 40 minutos y checklist de cinco gates PENDING. Enlace Caja del panel vendedor sigue capacidad real (Venta no lo muestra). Lint/typecheck PASS; ningún ensayo humano ejecutado.

Activación preparada 01/10: 31 tests focales PASS (identidad/roles + seis transiciones seguras del registro). No contraseñas humanas ni activación. Hashes pueden guardarse sin impresión, registro se valida/transporta base64url; checklist nominal ignorada lista. QA HTTP de tres roles/login/logout/revocación previa suficiente y no repetida.

Bloque catálogo 01/10: 21 actualizaciones sin altas/stock; backup/readback TEST y replay con cero cambios. Campos no autorizados e historia previa comprobados; 25 tests focales y lint PASS. Matriz: 30 costos acreditados / 22 pendientes humanos.

> Pruebas manuales del sistema. Cada caso: **pasos → resultado esperado**. Se amplía
> al avanzar cada fase. Funcionalidades actuales en `docs/PROJECT_STATE.md`.

---

## Roles y catálogo por apertura TEST (2026-10-01)

Actualización granel: `tests/granel-real.test.mjs` agrega 26 casos: cinco precios obligatorios, 1/150/250/751/1500 g, invalidaciones, manipulación, snapshots, exceso de stock agregado, replay/devolución exacta para bases 100/250/1000 y presencial. Suite al cerrar implementación: 444/444 PASS. [Contrato y procedimiento](operativa/GRANEL_TEST_2026-10-01.md); evidencia HTTP/visual y QA final en [cierre TEST](operativa/CIERRE_TEST_2026-10-01.md).

Baseline c036320 anterior a granel: **418/418 PASS, cero fallos**. Baseline 393 tests; añadidos 19 casos funcionales y 6 de guardrails/cuentas. Cubren seis combinaciones confirmar/cancelar por rol, POST directo Venta 403 antes de backend, oferta activa/inactiva sin/con apertura, compatibilidad REGULAR, pedidos regulares/especiales/históricos, migración idempotente y readback, IDs/snapshots, duplicados, privilegios administrativos y replay seguro de transporte. Evidencia histórica de v16 a continuación; vigente v18 y suite 468.

Backend TEST v16, migración aditiva con backup y repetición sin cambios. Auditoría y diff de catálogo en [Cierre operativo TEST 2026-10-01](operativa/CIERRE_TEST_2026-10-01.md). QA HTTP/navegador local usa cuentas sintéticas y apertura sintética controlada; nunca aperturas reales ni Empanadas reales. E2E completo PASS: stock 5.5 → 5.4 → 5.5, apertura sintética cerrada, fixtures restaurados e historia preexistente idéntica, incluidas dos REQUIERE_REVISION. QA visual, lint, build, typecheck, secrets scan (278), diff y preflight técnico PASS. Audit crítico PASS con 4 alertas no críticas abiertas. Evidencias en ese informe y archivos ignorados. Horario 11–15 confirmado.

F10 local: roles_aprobados READY, 19 PENDING; QA técnica no sustituye identidad/capacitación/ensayo humano final. Producción no cambió.

## F9/F10 — preflight y preparación local (2026-09-27)

- Rate limiter actual: cinco fallos/15 min por IP y actor en `Map` de instancia;
  no se declarará distribuido. El dashboard mostró cero reglas WAF
  personalizadas activas; los borradores remotos no se verificaron de modo
  independiente. No se publicaron reglas ni se hizo carga remota.
- Casos locales del manifiesto: 20 pendientes del ejemplo, fecha imposible,
  todos listos, un check bloqueado y excepción sin/con referencia humana.
  `READY` solo indica consistencia estructural; no aprueba el Go/No-Go.
- Go/No-Go técnico: cuenta administrativa sintética válida en `base64url:` pasa
  parser compartido; registro inválido, rotación inconsistente y `SITE_URL`
  con ruta fallan cerrados. Sin configuración productiva informa PENDING,
  no READY.
  No se usaron credenciales reales ni se modificó Production.
- Batería final: 393/393 tests, lint, build, secrets scan (261 archivos) y
  preflight técnico PASS. `check:go-no-go` informa PENDING por identidad/dominio
  productivos; manifiesto de ejemplo 0/20 ready y modo estricto PENDING con
  salida no cero porque aún no existe el manifiesto operativo local.

## F9 global — identidad sintética en Vercel Preview TEST (2026-09-27)

Proyecto `almacen-popular-rosa-elena-7m17`, entorno Preview restringido a
`feature/fase-3a-operativa`, código
`4c8608b7d74c136efc294587743626fc31d99dd5`. El deployment final sellado
`dpl_4EKLnVxXc9pbaDCGX4wSuxGWey2g` está Ready; `/api/health` informó `test`
y el catálogo leyó 54 productos del
backend Apps Script TEST sin escribir datos comerciales. Production conservó
sus cuatro variables originales; las siete variables nuevas son exclusivas
de Preview y de esta rama. No se copiaron secretos productivos.

QA HTTP remota PASS: login, `/me` y cookies de `test-admin=administracion`,
`test-operacion=operacion` y `test-venta=venta`; permisos positivos y negativos;
respuesta equivalente ante clave incorrecta/actor inexistente; rechazo de
campos extras y suplantación de actor, rol, capacidad y token; legacy-admin
bloqueado; revocación de sesión de `test-venta`; cambio temporal de
`test-operacion` a `venta` con invalidación de sesión y reducción de permisos;
restauración de los tres roles; logout y origen cross-site; CSP, HSTS,
`nosniff`, anti-clickjacking, COOP, Permissions-Policy y cookie `HttpOnly`,
`Secure`, `SameSite=Strict`. No se ejecutaron mutaciones comerciales.

QA visual autenticada PASS en navegador: formulario y login de `test-admin`,
panel visible, navegación READ-ONLY por Productos, Compras, Abastecimiento e
Historiales, logout y redirección de ruta protegida al login. Consola sin
errores ni advertencias relevantes. No hubo mutaciones comerciales.

El deployment de QA visual `dpl_GVgHzjh24uN38S8i5bZk1fWhbYNB` fue retirado
con autorización expresa: Vercel dejó de encontrarlo y su URL respondió 404.
Así, la credencial efímera de QA quedó invalidada operativamente. El Preview
final mantiene los actores `test-admin=administracion` (versión 6),
`test-operacion=operacion` (versión 8) y `test-venta=venta` (versión 7), todos
activos y con contraseñas aleatorias nuevas no conservadas. Las versiones son
monotónicas para no revivir sesiones anteriores. Se borró el auxiliar temporal
y se vació el portapapeles local.

El rate limit por instancia se cubrió localmente; no se hizo carga remota y la
capa distribuida continúa `BLOQUEANTE_PRODUCCION`. Dominio/CSP productivos y
asignación humana siguen pendientes; F9 global abierta y F10 NO-GO.

Durante la QA, una cookie de sesión TEST apareció en el título de un proceso.
Se detuvo ese transporte, se rotó el secreto TEST, se redeplegó el mismo commit
en Preview y se retiró el deployment anterior que podía aceptar la cookie.
La sesión quedó invalidada y no se afectó Production. Las contraseñas nunca se
guardaron en Git/docs; el auxiliar temporal y un token OIDC local añadido por
la CLI se retiraron. Para futuras pruebas, no pasar cookies por el wrapper de
`npx` en una consola interactiva.

## F9 global — activación sintética en Next TEST local (2026-09-25)

`node scripts/qa-identidad-test.mjs` genera tres claves aleatorias solo en
memoria, guarda hashes/secret TEST en `.env.development.local` ignorado y
restaura al final `test-admin=administracion`, `test-operacion=operacion`,
`test-venta=venta`, todos activos y con `session_version=1`.

Resultado observado: login y `/me` de los tres, cookies HTTP local, accesos
positivos/negativos, no enumeración, payload extra rechazado, actor/rol y token
falsificados rechazados, revocación y cambio temporal de rol con invalidación
de sesión, legacy apagado, rate limit local por IP/actor, rotación actual+
anterior, CSP/headers y origen cross-site: PASS. No hubo mutaciones de datos
de Apps Script ni Sheet. Navegador: formulario y error de credenciales visibles
sin overlay ni errores de consola; sesión autenticada y logout solo por HTTP.
Las claves no se conservan; para reingresar interactivamente se regeneran.

Pendiente: rate limit distribuido, dominio/CSP finales, asignación humana de
roles y Go/No-Go. F9 global y F10 no están cerradas.
La batería posterior pasó: 392/392 tests, lint, build, secrets scan (261
archivos), preflight técnico y `check:go-no-go` en estado PENDING esperado.
`npm audit` conserva dos alertas conocidas (una moderada, una alta; ninguna
crítica) en Next/PostCSS; no se forzó una actualización mayor en este bloque.


## F9 global/F10 — identidad y hardening local (2026-09-25)

1. Configuración de cuentas: JSON ausente/inválido/duplicado, actor canónico,
   roles cerrados, PBKDF2 y credenciales incorrectas/desconocidas.
2. Revocación: `active=false`, cambio de rol o aumento de `session_version`
   invalidan una sesión ya firmada.
3. Rotación: solo versión actual/anterior válida; secreto corto, par incompleto o
   versión desconocida fallan cerrados.
4. Legacy: bloqueado en Producción y al existir usuarios, salvo recuperación
   explícita en TEST/local.
5. Login: quinto fallo por IP o actor activa 429/`Retry-After`; respuestas no
   enumeran usuarios. Mutaciones cross-site se rechazan.
6. Headers: CSP limitada a orígenes inventariados, cookies estrictas, HSTS y
   configuración productiva obligatoria.
7. F10: el manifiesto exige los 20 checks y evidencia; el modo estricto no puede
   dar READY mientras existan pendientes.

Actualización F10 v2 (2026-09-27): prueba focalizada de los 20 `PENDING`, fecha
de corte nula, fecha calendario inválida, campos desconocidos, referencia
obligatoria, excepción justificada y `FAIL` explícito. El ensayo funcional
posterior se guiará por `ENSAYO_FINAL_F10_TEST.md`; no se ejecutó ahora.

Resultado local final: **391/391 PASS**, `git diff --check`, lint, build,
secrets scan y preflight técnico PASS. No se ejecutaron E2E remotos ni
escrituras; F9-A no fue reabierta.

## F9-A — precondiciones F3B read-only (2026-09-25)

1. Simular fallo transitorio del GET de aperturas/capacidad seguido de éxito:
   máximo dos GET y creación posterior una sola vez.
2. Dos fallos transitorios: 503 de precondición, sin POST de creación.
   403, JSON lógico y contrato inválido no disparan retry.
3. Revisar logs saneados: etapa `PRECONDICION_APERTURA`,
   `PRECONDICION_CAPACIDAD` o `CREAR_PEDIDO`, sin token, URL efímera, HTML,
   cookies ni datos personales.
4. Retest remoto único: apertura sintética TEST, un pedido con teléfono textual,
   retry de creación con la misma key, conflicto de payload, confirmación,
   LISTO, cancelación y retry. Stock final igual al baseline y apertura cerrada.

Resultado: 382/382 tests locales PASS y retest remoto focalizado PASS con
`PED-20260925-091712-debc0442`. El GET de aperturas se recuperó de un 404
HTML transitorio; LISTO respondió 200 reconciliado. Tres operaciones durables
`COMPLETADA`, dos movimientos, stock final igual a 5.5 kg y apertura cerrada.
El 503 histórico ocurrió antes de `doPost` sin escrituras; su causa upstream
exacta continúa indeterminada. No se repitieron E2E F4–F8.

## F9-A — contrato de estados en Sheet TEST (2026-09-25)

1. Preflight read-only: `PEDIDOS.estado_pedido` debe tener en cada fila de datos
   una validación estricta con exactamente `recibido`, `pendiente`, `listo`,
   `entregado`, `cancelado`; también deben existir `OPERACIONES_PEDIDOS` y
   `MOVIMIENTOS_STOCK.operacion_id`.
2. Con la regla antigua de cuatro estados, el preflight y una creación nueva
   fallan antes de escribir cabecera, detalle o diario.
3. Migrar solo Sheet TEST; repetir la migración debe ser un no-op. Comparar
   encabezados, filas y las dos operaciones `REQUIERE_REVISION` antes/después.
4. Retest único con teléfono `000000000`: crear `RECIBIDO`, retry con misma key,
   conflicto con payload distinto, confirmar, pasar a LISTO y cancelar. Verificar
   diario, movimientos y stock final igual al baseline; cerrar la apertura TEST.

Deploy v15, migración TEST idempotente y retest remoto: PASS. F9 global sigue
abierta; Producción no autorizada.

## F9-A — creación durable e idempotente (2026-09-24)

Pruebas locales automatizadas:

1. `CREAR_PEDIDO` recorre `PREPARADA → APLICANDO → COMPLETADA`, crea una sola
   cabecera `recibido` y sus detalles, sin stock ni movimientos.
2. Misma key/payload devuelve el mismo pedido; payload distinto falla 409.
3. Fallo tras cabecera o durante detalles reanuda solo líneas faltantes; una fila
   incompatible queda `REQUIERE_REVISION`.
4. Dos solicitudes serializadas con la misma key no duplican el pedido.
5. La UI conserva la key ante resultado incierto, la rota al cambiar datos y la
   elimina tras éxito; una respuesta ambigua permite solo un replay idéntico.
6. Snapshot y resultado no contienen tokens, cookies ni secretos.

Pendiente remoto: desplegar Apps Script TEST v13 y ejecutar un único retest F9-A.
Producción permanece fuera de alcance.

## F9-A — respuesta HTTP ambigua e idempotencia end-to-end (2026-09-24)

Pruebas locales automatizadas:

1. Solo un POST con redirect, 404, HTML y destino `googleusercontent` recibe la
   categoría `RESPUESTA_POST_MUTACION_AMBIGUA`; 403, 500 JSON, otro origen,
   JSON inválido genérico y fallos de red no la reciben.
2. Confirmación y cancelación hacen como máximo un replay con la misma clausura
   (pedido, actor, payload y key); dos respuestas ambiguas no producen un tercer
   POST.
3. Un pedido ya cancelado llega al diario: la misma key recupera el resultado y
   una key nueva falla; ENTREGADO continúa sin poder cancelarse.
4. PENDIENTE → LISTO y LISTO → ENTREGADO nunca repiten POST. Tras la firma
   ambigua solo reconcilian si el readback confirma ID, estado y actor; cualquier
   divergencia conserva el error.
5. Los errores no incluyen URL efímera, query, HTML, token ni cookies; la UI
   mantiene la key hasta un éxito confirmado o reconciliado.

La corrección HTTP está desplegada en TEST v12. El E2E permanece FAIL hasta
desplegar y validar la creación durable; no se valida Producción.

## F9-A.1 — seguridad, sesión, autorización e IDs (2026-09-22)

Pruebas locales automatizadas:

1. Matriz completa: Venta opera pedidos pero no ajusta stock; Operación hereda
   Venta, ajusta stock y no gestiona configuración; Administración tiene todas.
2. Sesión: token válido, expirado, firma inválida, payload malformado, rol
   desconocido y compatibilidad provisoria `legacy-admin`.
3. Autorización: Venta puede pedidos, Operación puede stock y Administración
   puede productos; una sesión válida sin capacidad recibe `403`.
4. Stock: crear queda `recibido` sin movimiento; confirmar descuenta una vez;
   insuficiencia no escribe parcialmente; cancelaciones devuelven según origen;
   entregado/cancelado son terminales y entregar no toca stock.
5. Seguridad: payload hostil no sustituye acción/token/actor/rol; DTOs no
   propagan campos desconocidos; rutas distinguen prefijos por frontera.
6. Pedidos: dos altas en el mismo segundo tienen IDs distintos; movimientos
   multilínea usan IDs únicos; `listo → pendiente` falla; errores en primera,
   intermedia o última línea compensan la creación parcial.
7. Sesión UI: invalidar caché fuerza a leer la identidad nueva; login legacy
   falla en producción salvo TEST/local explícito.
8. QA requerido: `npm test`, `npm run lint`, `npm run build`,
   `npm run scan:secrets` y `npm run preflight:tecnico`.

Validación remota pendiente: desplegar solo en Apps Script TEST tras aprobar el
diff y ejecutar un plan específico de F9-A. Este lote prohíbe escrituras remotas,
deploys y la repetición de los E2E F4–F8.

## F9-A.2 — diario durable e idempotencia multitabla (2026-09-22)

Pruebas locales automatizadas con inyección de fallos:

1. Confirmación completa: `PREPARADA → APLICANDO → COMPLETADA`, stock esperado,
   movimientos únicos ligados a `operacion_id` y pedido `pendiente`.
2. Retry completado devuelve el mismo resultado sin escrituras; misma key con
   payload/actor distinto falla con `IDEMPOTENCY_CONFLICT`.
3. Fallos en primer/intermedio producto, movimiento, pedido o `flush` no afirman
   éxito; el mismo retry continúa sin duplicar efectos.
4. Readback divergente marca `REQUIERE_REVISION`; si también falla ese registro,
   se conserva el error original y se informa `CONSISTENCIA_INCIERTA`.
5. Confirmación simultánea y confirmación contra cancelación quedan serializadas
   y una operación activa bloquea claves incompatibles.
6. Cancelación y retry reponen una sola vez; una cancelación interrumpida continúa
   desde evidencia real.
7. El diario no guarda tokens/cookies/secretos y la migración preparada es
   aditiva, idempotente y exclusiva de TEST.

Pendiente manual/remoto: ejecutar migración, despliegue y validación solo en TEST
después de aprobar el diff. No se declara transacción ACID ni se ejecutaron E2E
remotos en este lote.

### Corrección final F9-A — casos fail-closed y numéricos (2026-09-23)

1. Estados de diario vacío, whitespace, `null`, desconocido o con casing no
   canónico bloquean tanto una nueva key como el retry con la misma key, sin
   modificar pedido, stock ni movimientos.
2. `PREPARADA` y `APLICANDO` solo se reanudan con la misma key;
   `REQUIERE_REVISION` no se reanuda automáticamente y `COMPLETADA` permite una
   transición posterior legítima.
3. El comparador durable acepta números finitos y strings numéricos completos;
   rechaza vacíos, `null`, `NaN`, infinitos, coma decimal, moneda, unidades y
   cualquier string mixto.
4. Un número inválido en snapshot, stock o movimiento impide `COMPLETADA`, deja
   la operación en `REQUIERE_REVISION` cuando el diario puede persistirlo y no
   aplica efectos desde un snapshot numéricamente inválido.

## F9/F10 — QA público y preflight (2026-09-21)

1. Ejecutar `npm run preflight:go-no-go -- --allow-dirty` durante desarrollo y
   el mismo comando sin flags desde el commit candidato limpio.
2. Verificar `/`, `/historia`, `/rosa-elena`, `/participar` y `/tienda` en
   desktop y móvil; revisar teclado, foco, menú, imágenes, filtros, carrito,
   loading, error/reintento y ausencia de scroll horizontal.
3. Abrir `/robots.txt`, `/sitemap.xml`, una ruta inexistente y `/api/health`.
4. Con `SITE_URL` ausente, esperar canonical/sitemap inactivos y aviso
   `HUMAN_DECISION_REQUIRED`; con origen HTTPS confirmado, esperar cinco URLs
   públicas y exclusión de `/admin` y `/api`.
5. Confirmar que el preflight TEST indica escrituras deshabilitadas y que no se
   ejecutó ningún deploy ni E2E remoto de escritura.

Resultado automatizado de referencia: tests, lint, build, audit, diff check y
secrets scan. La evidencia final de esta sesión se registra en
`docs/GO_NO_GO_FASE_9_10.md` y `docs/CHANGELOG.md`.

## 1. Pruebas actuales (estado vigente)

### T1 — Catálogo carga desde Google Sheets
1. Abrir `/tienda`.
2. Esperar la carga.
- ✅ Esperado: se listan productos con nombre y precio tomados del CSV de Sheets.
- ⚠️ Si el CSV cambia de formato, el catálogo puede quedar vacío (parser frágil).

### T2 — Carrito
1. En `/tienda`, agregar varios productos.
2. Aumentar/reducir cantidades y vaciar.
- ✅ Esperado: el total y el contador se actualizan; el carrito persiste al recargar
  (guardado en `localStorage`).

### T3 — Buscador
1. Escribir parte de un nombre en el buscador.
- ✅ Esperado: se filtran los productos coincidentes; mensaje si no hay resultados.

### T4 — Envío de pedido por WhatsApp
1. Con productos en el carrito, ingresar nombre y teléfono.
2. Pulsar "Enviar pedido por WhatsApp".
- ✅ Esperado: se abre `wa.me` con el mensaje pre-armado (lista, total, datos).
- ⚠️ Limitación conocida: el pedido se guarda solo en `localStorage` del dispositivo.

### T5 — Panel admin (estado actual)
1. Abrir `/admin`, ingresar contraseña.
2. Ver, filtrar, editar y cambiar estado de pedidos.
- ✅ Esperado: funciona sobre los pedidos del **mismo navegador**.
- 🔴 Limitación: NO muestra pedidos hechos por clientes en otros dispositivos.

---

## 2. Pruebas futuras — FASE 1 (pedidos reales)

> A ejecutar cuando exista la Google Sheet operativa + Apps Script.

### T6 — Pedido se guarda en Google Sheets
1. Hacer un pedido desde la tienda.
- ✅ Esperado: aparece una fila nueva en la hoja `PEDIDOS` (y líneas en
  `DETALLE_PEDIDOS`) de la Sheet operativa.

### T7 — Pedido desde celular visible en admin (multidispositivo)
1. Hacer un pedido **desde un celular**.
2. Abrir `/admin` desde **otro dispositivo** (PC).
- ✅ Esperado: el pedido del celular aparece en `/admin` del PC.

### T8 — Admin lee pedidos reales
1. Con varios pedidos en la Sheet, abrir `/admin`.
- ✅ Esperado: se listan todos los pedidos reales, no los de `localStorage`.

### T9 — Cambio de estado persiste en backend
1. En `/admin`, marcar un pedido como "listo" y luego "entregado".
2. Recargar / abrir desde otro dispositivo.
- ✅ Esperado: el estado actualizado persiste en la Sheet y se ve igual en cualquier
  dispositivo.

---

## 3. Pruebas futuras — Stock (FASE 3)

### T10 — Stock reservado al pedir
1. Crear un pedido de un producto con stock conocido.
- ✅ Esperado: se genera un movimiento `reserva` en `MOVIMIENTOS_STOCK`; el stock
  disponible disminuye sin registrarse como venta.

### T11 — Stock devuelto al cancelar
1. Cancelar un pedido previamente reservado.
- ✅ Esperado: se genera un movimiento `devolucion`; el stock vuelve a su valor
  anterior.

### T12 — Precio de venta y redondeo
1. Definir un producto con costo y margen.
- ✅ Esperado: `precio_venta = costo × (1 + margen)` redondeado **hacia arriba al
  múltiplo de $10** (ver `docs/DATA_MODEL.md`).

### T13 — Auditoría técnica del catálogo TEST
1. Confirmar el nombre exacto de la Sheet TEST antes de leer `PRODUCTOS`.
2. Auditar IDs, nombres, activo, categoría, prioridad, unidad, decimal/paso,
   costo, margen, precio, stock, mínimo e imagen.
3. Verificar que los hallazgos masivos se agrupen y no expongan configuración.
- ✅ Esperado: lectura sin escrituras, errores objetivos separados de advertencias
  y decisiones humanas, con estado por producto.

### T14 — Plan de cambios Fase 4
1. Preparar un JSON con destino TEST y pares `esperado`/`propuesto`.
2. Ejecutar `npm run catalogo:test:validar-plan -- <archivo>` con entorno TEST.
- ✅ Esperado: no usa red; rechaza producción, campos inesperados, cambios sin
  valor esperado y edición directa de `stock_actual`.

---

## Notas

- T1–T14 son pruebas manuales históricas; la suite automatizada vigente se
  ejecuta con `npm test` y se amplía con cada cambio técnico.
- Antes de cada apertura real conviene ejecutar T1–T9 como checklist mínima.

---

## 4. Pruebas manuales — Sistema documental

### TD1 — Metadata completa
1. Abrir el Markdown fuente.
2. Verificar `DOCUMENTO`, `VERSION`, `FECHA`, `ESTADO`, `FUENTE` y `TIPO_INFORME`.
- ✅ Esperado: todos los campos existen y usan valores permitidos por ADS-002.

### TD2 — Integridad del HTML
1. Generar el HTML desde el template correspondiente.
2. Buscar marcadores `{{...}}`.
3. Abrir el HTML desde `reports/html/<tipo>/`.
- ✅ Esperado: no quedan placeholders y cargan `almacen.css`, `reports.css` y logo.

### TD3 — Comparación visual
1. Comparar portada, ficha, tarjetas, fases, badges, tablas y síntesis con los
   pilotos v0.2 aprobados.
- ✅ Esperado: mantiene identidad y estructura documental; no parece landing page.

### TD4 — Impresión A4
1. Generar el PDF con `scripts/render-informe-pdf.py`, `media="screen"`, fondos
   activados, escala `0.98`, márgenes 0 mm y sin encabezados/pies del navegador.
2. Revisar saltos, tablas largas, fases y síntesis.
- ✅ Esperado: contenido legible, sin cortes críticos ni desbordamiento horizontal.

### TD5 — Ausencia de secretos
1. Buscar tokens, credenciales, valores de variables e IDs privados.
- ✅ Esperado: solo aparecen nombres de variables; ningún valor sensible.

### TD6 — Densidad compacta y roadmap completo
1. Comparar HTML/PDF v0.2.1 con la versión v0.2 a tamaño real A4.
2. Verificar base de impresión de 7–7,2 pt y jerarquía legible.
3. Confirmar checklist Fases 0, 1, 1B, 2, 3, 4, 5 y 6.
4. Revisar que cada fase indique realizada, prioridad actual o pendiente.
- ✅ Esperado: documento más compacto, sin desbordes y útil para seguimiento del
  roadmap completo.

### TD7 — QA visual HTML vs PDF
1. Comparar el HTML aprobado y el PDF página por página.
2. Confirmar `border-radius` de portada, tarjetas y secciones; badges/chips con
   un solo borde; colores, fondos, logo e imágenes equivalentes.
3. Revisar tablas, contenido cortado, desbordes, páginas vacías y cantidad de
   páginas razonable.
4. Verificar que versión y fecha coincidan en portada, ficha documental, HTML,
   PDF y nombre del archivo.
- ✅ Esperado: paridad visual satisfactoria. Si hay diferencias, corregir el
  flujo o CSS y regenerar desde el HTML maestro; no editar el PDF manualmente.

Resultado de referencia (2026-09-30): **PASS** con
`2026-09-30_informe-consolidado_estado-proyecto_v1.8_FINAL`. El script oficial
generó 6 páginas A4; el texto y la geometría coincidieron con el PDF histórico,
y la revisión visual confirmó radios, bordes, colores, tablas, logo, imágenes y
paginación sin defectos.
