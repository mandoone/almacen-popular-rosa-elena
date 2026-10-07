# DECISIONS.md — Decisiones cerradas

> Registro de decisiones (ADRs cortos). Una decisión cerrada no se re-discute aquí;
> si cambia, se añade una nueva entrada que la supersede. Tareas abiertas en
> `docs/TASKS.md`.

Formato: **contexto → decisión → consecuencias**.

---

## D43 — Familia pública y SKU físico: Fase A paralela (2026-10-07)

Arquitectura aprobada por Omar: marca física distinta = SKU interno distinto; una oferta pública puede agrupar SKU equivalentes mediante familia. PRODUCTOS conserva inventario/costo físicos, proveedor pertenece a cada compra y precio público futuro reside en FAMILIAS_PRODUCTO. Sin SKU virtual, stock familiar ni lotes en esta fase.

Fase A incorpora contrato puro, relación opcional familia_id, identidad física estructurada, auditoría y agregación con fixtures/mocks locales. SKU_V1 permanece operativo; no se activa catálogo/carrito/pedido/venta por familia, ni se implementan asignaciones. D40, IDs e históricos intactos. No hay creación de hoja, migración real ni deploy; F10 conserva estado. [Contrato](DATA_MODEL.md#contrato-paralelo-de-familias--fase-a-2026-10-07-d43) y [entrega](operativa/FAMILIAS_PRODUCTO_FASE_A_2026-10-07.md).

## D42 — Fuente editorial recibida y criterio público de precios (2026-10-07)

Documento institucional de Nadia recibido: guía la síntesis pública de Historia, Rosa Elena, comunidad y participación. La instrucción vigente de Omar cierra los contactos y autoriza mencionar aportes económicos en general, sin datos bancarios. Publicar precios justos/económicos y propósito sin fines de lucro; no afirmar equivalencia al costo base ni divulgar porcentajes o desglose operativo. Implementación solo TEST, revisión humana pendiente, sin promover gates F10 ni autorizar Producción. [Fuente, textos y QA](operativa/CONTENIDO_PUBLICO_TEST_2026-10-07.md).

## D40 — Granel real con peso libre y referencias explícitas (2026-10-01)

Complemento técnico: conteo físico en kg/1 g convertido a la base histórica; importación TEST exige dry-run, acta humana y stock esperado bajo lock. Compras/ajustes no admiten medio gramo; mínimos/prioridad requieren aprobación. Ninguna cantidad real se deduce del diseño de compra.

Evidencia Nadia entregada por Omar: pesos son referencias de precio; cualquier cantidad a granel, incluido arroz 250 g. Supersede el mínimo/paso 250 g de F3A y cualquier interpretación de 500 g/1 kg como presentaciones cerradas. Modelo aditivo UNIDAD/GRANEL, gramos de referencia y equivalencia de base histórica de stock; backend autoridad y CLP entero. No reinterpretar detalles ni inventar conteo. [Contrato](DATA_MODEL.md) y [migración TEST](operativa/GRANEL_TEST_2026-10-01.md).

## D41 — Jerarquía comercial y pendientes reales (2026-10-01)

Respuesta humana directa más reciente > documento Nadia > comanda/diseño > catálogo histórico > suposición. Complementa D38: comanda da precio público y diseño costo/compras para SKU/unidad inequívocos; no desplazan la respuesta directa ni acreditan stock físico. 18 GRANEL resueltos, 30 costos activos acreditados, 22 pendientes humanos por variante/formato/costo. Ortografía/capitalización no requieren una nueva pregunta comercial. [Matriz y tres preguntas](operativa/CATALOGO_PENDIENTES_REALES_2026-10-01.md).

## D39 — Capas de rate limit elegidas para el primer lanzamiento (2026-10-01)

WAF por IP más limitador local por IP+actor. El riesgo residual regional se acepta para primer lanzamiento; WAF no sustituye un contador global por actor. Supersede la elección abierta de D33; no autoriza publicar reglas ni activar Production.

## D38 — Fuentes comerciales y cruces conservadores (2026-10-01)

Última comanda = precio público; último Diseño de compra = costo/compras/inventario previo, nunca stock físico actual. Coincidencia inequívoca de SKU/formato/unidad permite actualizar TEST con backup/diff/readback. Mantener PENDING marcas, presentaciones o unidades ambiguas; no fusionar por nombre ni imponer costo + 10%. Inventario de fotos READ-ONLY hasta revisión/derechos humanos.

## D37 — Disponibilidad persistente por apertura (2026-10-01)

PRODUCTOS conserva activo y agrega tipo_disponibilidad REGULAR/POR_APERTURA; ausencia = REGULAR. APERTURA_PRODUCTOS usa pareja única y habilitado. Activo NO siempre oculta/rechaza nuevas compras. Especiales solo aparecen y se piden en apertura habilitada; backend autoridad. Precio vigente en maestro, snapshots históricos intactos. Blanco/5L/5L con suavizante regulares; burro/concentrado históricos NO; Empanadas POR_APERTURA referencia 2500 sin habilitación real.

## D36 — Roles y asignación definitivos (2026-10-01)

Confirmación Almacén/Omar 2026-10-01: Administración incluye Operación y Venta; Operación incluye Venta. Todos confirman; solo Operación/Admin cancelan. Supersede CAPACIDADES_VENTA con cancelar. Asignación 2 Administración, 2 Operación, 6 Venta; diez actores y nombres visibles definidos en matriz ignorada, sin contraseñas/hashes en Git ni nombres en src. Credenciales humanas e identidad_cuentas pendientes. Horario habitual 11:00–15:00 confirmado.

## D35 — HTML como fuente visual maestra para PDF documental (2026-09-30)

- **Contexto:** al generar informes con estilos de impresión se observaron
  repetidamente doble borde en badges, pérdida de radios, esquinas rectas y
  otras diferencias respecto del HTML aprobado.
- **Decisión:** generar los PDF mediante Chromium/Playwright desde el HTML
  maestro, con `media="screen"`, A4, fondos habilitados, márgenes de 0 mm,
  `prefer_css_page_size=True` y escala `0.98`. `@media print` queda reservado
  exclusivamente para paginación y nunca define la apariencia. El QA visual
  HTML vs PDF es obligatorio antes de marcar una entrega como `FINAL`.
- **Consecuencias:** `scripts/render-informe-pdf.py` es el único comando oficial.
  Si el PDF difiere visualmente, se corrige el flujo o el CSS y se regenera; el
  PDF no se arregla manualmente. El procedimiento completo vive en
  `docs/informes/README_GENERACION_PDF.md`.

## D34 — Evidencia F10 v2 sin aprobación automática

- **Contexto:** el manifiesto v1 permitía `ready` con un texto libre de
  evidencia, sin fecha, responsable ni referencia comprobable.
- **Decisión:** migrar el ejemplo y preflight a v2: `resultado` entre
  `READY/PENDING/FAIL/NOT_APPLICABLE`; todo check resuelto exige fecha,
  responsable, evidencia breve y referencia no sensible; una excepción exige
  además justificación. La fecha de corte puede ser nula mientras se prepara,
  pero es obligatoria antes de `READY` global.
- **Consecuencias:** manifests locales v1 deben migrarse manualmente sin
  promover checks por reflejo. El verificador solo valida estructura: no lee
  actas externas, no aprueba excepciones y no concede Go productivo. D32 se
  conserva como antecedente del primer preflight.

## D33 — Especificación WAF local sin activación productiva

- **Contexto:** la defensa de cinco fallos por IP/actor en 15 minutos vive en
  memoria de cada instancia; Hobby permite una regla WAF de rate limit por IP
  con ventana máxima de 10 minutos y contadores regionales. Publicar Firewall
  afecta la configuración del proyecto que sirve Production.
- **Decisión:** conservar intacto el limitador local y preparar únicamente la
  especificación/runbook en `RATE_LIMIT_WAF_RUNBOOK.md`. No crear borrador ni
  modificar Firewall remoto sin autorización productiva explícita.
- **Consecuencias:** `PREPARADO_PARA_ACTIVACION` no significa protección
  distribuida activa ni cierre de F9. Suficiencia, umbral final, cuota y
  aceptación del riesgo residual quedan como decisión humana; si se exige
  límite global exacto por actor/IP, hará falta contador central.

## D32 — Preflight F10 estructural, no aprobación humana automática

- **Contexto:** el manifiesto F10 distinguía estados internos, pero no devolvía
  READY/PENDING/FAIL; aceptaba `not_applicable` sin referencia de decisión y el
  Go/No-Go técnico parseaba cuentas de forma distinta al runtime.
- **Decisión:** devolver estado y nombres de checks no listos sin imprimir su
  evidencia, exigir `decision_ref` para una excepción, validar fecha real y
  usar el parser estricto de identidades de la aplicación, incluido
  `base64url:`. `SITE_URL` productivo debe ser solo origen HTTPS.
- **Consecuencias:** el preflight detecta inconsistencias antes de la ventana,
  pero un `READY` estructural no verifica actas externas ni autoriza Producción.
  Las 20 evidencias reales y el Go/No-Go humano siguen pendientes.

## D31 — Sellado de credenciales sintéticas y retiro del Preview de QA

- **Contexto:** cada deployment Preview conserva su configuración de entorno
  y URL única. Sellar cuentas en un deployment nuevo no invalida por sí solo
  la credencial efímera del deployment usado para QA visual.
- **Decisión:** con autorización explícita, retirar exclusivamente el Preview
  de QA tras comprobar panel, navegación y logout. Mantener el Preview final
  con tres cuentas sintéticas activas, roles originales, claves aleatorias no
  conservadas y versiones de sesión aumentadas de forma monotónica.
- **Consecuencias:** la credencial visual quedó invalidada operativamente al
  desaparecer el deployment de QA (URL 404); el Preview final permaneció Ready.
  No se modificaron variables de Production, `main` ni otros deployments.

## D30 — Versiones de sesión monotónicas y QA segura de Preview

- **Contexto:** la QA remota necesitó revocar una sesión sintética y cambiar
  temporalmente un rol. Restaurar `session_version=1` habría revalidado cookies
  anteriores. Además, el wrapper interactivo de `npx` mostró una cookie TEST en
  un título de proceso durante la prueba.
- **Decisión:** al restaurar los roles, mantener `session_version` incrementada
  para cada actor afectado. No pasar cookies por un wrapper que pueda emitirlas
  en títulos o logs. La contención del incidente fue rotar solo el secreto TEST,
  redeplegar Preview y retirar el deployment anterior. No se reutilizaron
  secretos productivos.
- **Consecuencias:** en esa etapa, `test-operacion` terminó en versión 3 y
  `test-venta` en 2; el rol de los tres actores volvió a la matriz provisional.
  Las sesiones
  antiguas no se reactivan por restaurar la configuración. Production quedó
  intacta; rate limiting distribuido, cuentas humanas y dominio final siguen
  pendientes antes de Go/No-Go.

## D29 — Transporte seguro del registro TEST en archivos de entorno

- **Contexto:** el cargador de variables de Next expandió los signos `$` de
  los hashes PBKDF2 al leer `ADMIN_USERS_JSON` desde `.env.development.local`,
  dejando cuentas inválidas pese a un JSON original correcto.
- **Decisión:** `ADMIN_USERS_JSON` acepta además el prefijo `base64url:` con el
  JSON codificado. La validación estricta de actores, roles, estado, versión y
  hashes es exactamente la misma después de decodificar. JSON directo sigue
  compatible. El QA local usa este transporte en el archivo TEST ignorado.
- **Consecuencias:** la codificación evita expansión de entorno, **no cifra**
  hashes ni concede privilegios. Las contraseñas de los tres actores sintéticos
  viven solo en el proceso de QA; no se guardan ni se asignan personas reales.
  Producción permanece sin cambios y F9 global abierta.

## D28 — Identidad individual local sin proveedor externo

- **Contexto:** F9-A firmaba actor/rol, pero el login compartido no identificaba
  personas, no permitía revocación individual y no tenía protección de intentos.
  Elegir un proveedor externo ampliaría arquitectura y operación antes de saber
  la nómina final.
- **Decisión:** usar un registro acotado `ADMIN_USERS_JSON` administrado como
  secreto de entorno, con `actor_id` técnico, rol, estado, versión de sesión y
  hash PBKDF2-SHA256. El middleware revalida cuenta/rol/versión en cada request;
  la sesión acepta una clave actual y una anterior durante rotación. El acceso
  compartido queda solo en TEST/local y se apaga al existir cuentas salvo opt-in
  de recuperación. Se agrega rate limit local por IP+actor y control de origen.
- **Consecuencias:** no se instala base de datos ni proveedor de identidad y se
  obtiene trazabilidad/revocación con el stack actual. Cambiar rol, desactivar la
  cuenta o incrementar `session_version` invalida sesiones. La asignación humana
  sigue pendiente; antes de Producción se requiere rate limiting distribuido de
  plataforma porque la memoria de una instancia no coordina réplicas.

## D27 — Precondiciones de creación observables sin reintentar POST

- **Contexto:** un POST público terminó en 503 tras aproximadamente 61 s, sin
  `doPost` de creación ni escrituras en Sheet TEST. El tramo de precondiciones
  F3B ocultaba la lectura exacta que había fallado.
- **Decisión:** registrar únicamente etapa, status y metadatos de transporte
  permitidos; mantener como máximo dos GET ante fallos transitorios. Un JSON
  lógico de error no se reintenta. `CREAR_PEDIDO` conserva solo su replay durable
  específico ante la firma ambigua conocida, sin retry genérico de POST.
- **Consecuencia:** el retest separó apertura, capacidad y creación sin
  registrar URL efímeras, tokens ni datos del cliente. Un 404 HTML transitorio
  en GET `listarAperturas` se recuperó en el segundo intento y LISTO se
  reconcilió por readback. La causa upstream exacta del 503 anterior permanece
  indeterminada; F9-A pasó en TEST, no en Producción.

## D26 — Validación de estados de PEDIDOS alineada con F9-A

- **Contexto:** la validación estricta heredada de Sheet TEST admitía cuatro
  estados y rechazó `recibido`; un intento de creación dejó una cabecera parcial
  y una operación `REQUIERE_REVISION`. El teléfono textual sí quedó preservado.
- **Decisión:** el contrato F9-A exige `recibido`, `pendiente`, `listo`,
  `entregado`, `cancelado`. Un preflight TEST de solo lectura inspecciona toda la
  columna por encabezado y el diario; una migración TEST idempotente reemplaza
  solo la regla de validación, sin modificar valores. La creación comprueba ese
  contrato antes de preparar o reanudar escrituras.
- **Consecuencias:** una validación obsoleta falla antes de crear un pedido
  nuevo. Las dos operaciones TEST inciertas permanecen como evidencia y no se
  convierten artificialmente en `COMPLETADA`. Deploy v15, migración idempotente
  y retest TEST pasaron; F9 global permanece abierta.

## D25 — Creación pública durable e idempotente

- **Contexto:** una respuesta perdida de `crearPedido` no permitía distinguir un
  fallo de una creación completada; repetir el POST podía generar dos pedidos.
- **Decisión:** la tienda genera una key UUID por intento lógico y la conserva
  hasta éxito. Apps Script registra `CREAR_PEDIDO` en `OPERACIONES_PEDIDOS` antes
  de escribir cabecera/detalles, liga la key a un hash canónico, reanuda solo
  efectos faltantes y completa después de readback exacto. La firma HTTP ambigua
  admite como máximo un replay idéntico.
- **Consecuencias:** misma key/payload devuelve el mismo `id_pedido`; payload
  distinto falla 409; divergencias quedan `REQUIERE_REVISION`. Crear sigue en
  `recibido`, sin stock ni movimientos, y no requiere ampliar el esquema actual.
  La implementación local aún requiere deploy y retest TEST.

## D24 — Recuperación conservadora de respuestas post-mutación ambiguas

- **Contexto:** ContentService puede completar una mutación y luego perder su
  respuesta en el redirect, terminando en un 404 HTML de `googleusercontent`.
  Un 502 del proxy no demuestra entonces que la escritura haya fallado.
- **Decisión:** clasificar únicamente la firma observada (POST, redirect, destino
  `googleusercontent`, 404 y HTML). Confirmación/cancelación permiten un solo
  replay con el mismo payload, actor y key para que el diario durable decida.
  LISTO/ENTREGADO no repiten POST: solo responden éxito si un readback confirma
  pedido, estado objetivo y actor.
- **Consecuencias:** no existen retries genéricos ni éxito supuesto ante cualquier
  error. Un segundo resultado ambiguo o un readback no concluyente conserva 502.
  La corrección está desplegada en Apps Script TEST v12; el cierre de F9-A queda
  pendiente del deploy/retest de D25.

## D23 — Diario durable para mutaciones multitabla de pedidos

- **Contexto:** Google Sheets no ofrece transacciones entre hojas; un fallo entre
  stock, movimientos y pedido podía dejar un resultado ambiguo y un retry podía
  repetir efectos.
- **Decisión:** confirmar y cancelar se serializan con `ScriptLock` y una intención
  previa en `OPERACIONES_PEDIDOS`. La operación guarda key, hash y plan mínimo,
  pasa por `PREPARADA`/`APLICANDO`, aplica cada efecto idempotentemente y solo queda
  `COMPLETADA` tras readback exacto. Diferencias quedan `REQUIERE_REVISION`.
- **Consecuencias:** una key completada devuelve su resultado sin reescribir; una
  operación activa o incierta bloquea mutaciones incompatibles y puede
  diagnosticarse de forma determinista. Esto no convierte Sheets en ACID ni
  garantiza atomicidad multitabla; la preparación/migración sigue local y TEST-only.

## D22 — Roles por capacidades y stock al confirmar pedidos

> Entrada histórica: matriz/asignación provisional supersedidas por D36 (01/10); modelo de stock sigue vigente. No volver a pedir roles ni usernames.

- **Contexto:** la contraseña compartida no distinguía actores ni permisos y el
  pedido web descontaba stock antes de que una persona lo confirmara.
- **Decisión:** modelar roles genéricos jerárquicos (`venta`, `operacion`,
  `administracion`) mediante capacidades explícitas; firmar identidad/rol en la
  sesión; autorizar en backend; crear pedidos en `recibido` y mover stock solo
  bajo `LockService` al confirmar o cancelar según el estado.
- **Consecuencias:** dobles clics/retries no repiten movimientos y el actor se
  toma de la sesión, no del navegador. La matriz es provisional de Omar y la
  asignación humana sigue pendiente del Almacén. El login compartido queda como
  compatibilidad `PROVISORIO_TEST`, bloqueada en producción; no es una solución
  productiva multiusuario. Las escrituras Next usan DTOs allowlist y no aceptan
  acción, token, actor ni rol del navegador. D23 complementa esta decisión con
  consistencia durable verificable para confirmación y cancelación.

## D20 — SEO dependiente de un origen público explícito

- **Contexto:** no existe un dominio público definitivo aprobado y no se debe
  inventar canonical ni sitemap con un subdominio temporal.
- **Decisión:** canonical, `metadataBase`, sitemap y su referencia en robots se
  habilitan solo con `SITE_URL` válido; el resto de metadata funciona sin él.
- **Consecuencias:** el build local es seguro y el dominio queda como decisión
  humana bloqueante antes de indexar producción.

## D21 — No migrar automáticamente a Next 16 por npm audit

> Cifras históricas de esta entrada supersedidas por [auditoría 01/10](operativa/AUDITORIA_DEPENDENCIAS_2026-10-01.md): cuatro alertas, tres altas/una moderada/cero críticas. Política de upgrade separado sigue vigente.

- **Contexto:** las alertas corregibles sin cambio mayor eran transitivas; las
  restantes provienen del PostCSS incluido por Next 15 y npm propone Next 16.
- **Decisión:** fijar overrides compatibles para las transitivas corregidas y
  documentar las dos alertas restantes; cualquier Next 16 será trabajo separado.
- **Consecuencias:** se reducen cinco alertas a dos, con cero críticas, sin
  ampliar el alcance ni arriesgar los flujos ya validados.

## D1 — Usar un arnés liviano de documentación

- **Contexto:** el proyecto es pequeño, comunitario y mantenido sin equipo técnico
  dedicado. Un framework pesado de proceso sería contraproducente.
- **Decisión:** trabajar con un **arnés liviano**: documentación viva mínima en
  `docs/` + `AGENTS.md`, sin duplicar información.
- **Consecuencias:** menos sobrecarga, contexto suficiente para retomar el trabajo.
  Exige disciplina de mantener los `.md` actualizados.

## D2 — No usar SDD (Spec-Driven Development)

- **Contexto:** redactar especificaciones formales exhaustivas antes de implementar
  ralentizaría un proyecto de alcance acotado.
- **Decisión:** **no** adoptar SDD. Se documenta lo necesario para conservar
  contexto y decisiones, no especificaciones completas previas.
- **Consecuencias:** iteración más rápida; el detalle de cada fase se refina al
  implementarla.

## D3 — Trabajar por fases

- **Contexto:** hay múltiples necesidades (pedidos, vendedor, stock, compras, caja)
  que no se pueden abordar a la vez.
- **Decisión:** avanzar **por fases** (FASE 0 a FASE 5), una rama por fase, sin
  mezclar tareas de fases distintas.
- **Consecuencias:** foco y diffs revisables. Orden definido en `AGENTS.md` y
  `docs/TASKS.md`.

## D4 — Backend con Google Sheets + Apps Script

- **Contexto:** se necesita persistencia compartida y de costo cero, operable por
  voluntarios. Ya se usa Google Sheets para el catálogo.
- **Decisión:** usar **Google Sheets como base de datos operativa** y **Google Apps
  Script (Web App)** como capa de escritura/lectura desde la web.
- **Consecuencias:** sin infraestructura de pago; el modelo se ajusta a una hoja de
  cálculo (no relacional). Diseño en `docs/DATA_MODEL.md`.

## D5 — Crear una Google Sheet nueva, exclusiva para la web

- **Contexto:** existe una planilla antigua de comandas, pero pertenece a otra
  cuenta, tiene permisos externos, formato histórico/manual y no está diseñada como
  backend operativo.
- **Decisión:** crear una **Google Sheet nueva y exclusiva** para el sistema web,
  como **fuente oficial** de productos, pedidos, ventas, clientes, stock, compras,
  movimientos de stock y configuración. La planilla antigua **no** será la base
  principal.
- **Consecuencias:** control de permisos y estructura propios. Requiere crear la
  hoja manualmente antes de FASE 1 (tarea bloqueante en `docs/TASKS.md`). Estructura
  en `docs/DATA_MODEL.md`.

## D6 — No integrar pagos online por ahora

- **Contexto:** el pago se realiza presencialmente al retirar el pedido el sábado de
  apertura. Integrar pasarelas añade complejidad y costos.
- **Decisión:** **no** integrar Webpay / Mercado Pago / pagos online por ahora.
- **Consecuencias:** fuera de alcance actual (ver `docs/REQUIREMENTS.md`).
  Reevaluable en una fase futura si surge la necesidad.

## D7 — Repo como fuente oficial del sistema documental

- **Contexto:** los informes y recursos visuales también se distribuyen mediante
  Drive, lo que puede producir versiones divergentes si ambos lugares se editan.
- **Decisión:** el Markdown, templates, CSS y guías del repo son la fuente oficial.
  Drive conserva copias aprobadas y versiones enviadas.
- **Consecuencias:** toda corrección parte en el repo y genera una salida nueva. El
  sistema documental se rige por `design-system/docs/ADS-002_sistema_documental.md`.

## D8 — Calendario de Fase 3B conectado solo a TEST

- **Contexto:** el calendario admin necesita escrituras reales para validarse,
  pero producción no está autorizada en esta fase.
- **Decisión:** exigir dos marcas independientes para cualquier acceso a
  `APERTURAS`: `NEXT_PUBLIC_APP_ENV=test` en Next.js y `APP_ENV=TEST` como
  propiedad del Apps Script. Cualquier otro entorno se bloquea.
- **Consecuencias:** el código puede probarse localmente contra la copia TEST
  sin abrir un camino accidental hacia producción; preparar la hoja y desplegar
  la Web App TEST siguen siendo pasos manuales explícitos.
