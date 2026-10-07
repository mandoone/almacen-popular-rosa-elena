# PROJECT_STATE.md — Estado vivo del proyecto

> Documento vivo. Refleja el estado **actual** del proyecto. Actualizar en cada
> tarea que cambie el estado. Última actualización: 2026-10-07.

---

## Familias B2 — estructura TEST, 2026-10-07

Esquema TEST alineado con A/B1 mediante backup completo verificado y readback histórico exacto: cinco campos SKU, seis snapshots de compra y FAMILIAS_PRODUCTO vacía. Segunda ejecución sin cambios. Apps Script TEST v19 (previa v18), sin activación de catálogo familiar. C1/C2 no desplegados; F10 sigue 1 READY/19 PENDING. [Evidencia B2 y rollback](operativa/FAMILIAS_B2_TEST_2026-10-07.md).

## Identidad SKU y compras — Fase B1 local, 2026-10-07

Contratos internos de producto extendidos y snapshots de identidad física en compra obtenidos desde PRODUCTOS bajo lock. Proveedor por compra y costos/stock por SKU; replay preserva identidad histórica y rollback conserva efectos V1. Legados/esquemas antiguos compatibles; edición de identidad exige columnas sin crearlas. Solo código/fixtures locales: sin UI nueva, migración real, deploy ni familias activas en catálogo/pedido/venta. Sheet TEST y demás bases intactas. F10 mantiene 1 READY/19 PENDING. [Contrato](DATA_MODEL.md) y [entrega/QA](operativa/FAMILIAS_PRODUCTO_FASE_B1_2026-10-07.md).

## Familias de producto — Fase A local, 2026-10-07

Contrato paralelo implementado: dominio puro, identidad SKU opcional, equivalencias/política de marca y disponibilidad agregada diagnóstica. GAS contiene una copia generada y helpers internos TEST sin acciones HTTP nuevas; setup preparado solamente para futura base nueva. No se ejecutó setup ni se creó hoja/migró producto real. Catálogo, carrito, pedidos, ventas, compras y stock siguen SKU_V1; PRODUCTOS sigue siendo fuente física. F10 continúa 1 READY/19 PENDING, sin cambio por esta fase. [Contrato](DATA_MODEL.md) y [archivos/QA/continuidad](operativa/FAMILIAS_PRODUCTO_FASE_A_2026-10-07.md).

## Contenido público TEST — 2026-10-07

Fuente editorial del Almacén recibida e incorporada desde el documento de Nadia. Contactos oficiales corregidos, criterio público de precios ajustado y textos de Historia/Rosa Elena/participación actualizados. Falta revisión visual/funcional por Omar y validación final de la implementación; no existe un nuevo levantamiento de textos pendiente. `contenido_editorial` conserva PENDING y el NO-GO productivo sigue vigente. [Cambios y QA](operativa/CONTENIDO_PUBLICO_TEST_2026-10-07.md).

## Cierre operativo 2026-10-01

Actualización de esta sesión: [granel real](operativa/GRANEL_TEST_2026-10-01.md) implementado en ambas ventas y migrado solo TEST v17 con backup/readback e historia/saldos preservados. 18 referencias acreditadas, diez precios adicionales y once costos adicionales; conteo físico sigue pendiente. Baseline del bloque anterior a continuación; estados nuevos y QA final se consolidan en el [cierre TEST](operativa/CIERRE_TEST_2026-10-01.md).

Modelo REGULAR/POR_APERTURA e históricos implementado en backend/UI y Sheet TEST; Apps Script TEST v18 (granel v17, precisión/concurrencia/UNIDAD histórica v18). Venta confirma y no cancela (403 directo en API); Operación/Admin confirman y cancelan. Roles y asignación 2/2/6 aprobados, diez usernames definidos en matriz local ignorada sin credenciales. Horario 11:00–15:00 confirmado.

Catálogo: 56 maestros (54 comerciales, dos fixtures), 31 precios corregidos y 30 costos acreditados acumulados desde el precheck de catálogo. Bloque 2: siete precios, trece costos y tres correcciones ortográficas; matriz con 22 PENDING_HUMANO por ID. [Tres preguntas agrupadas](operativa/CATALOGO_PENDIENTES_REALES_2026-10-01.md). Empanadas POR_APERTURA no habilitada en aperturas reales; Poroto burro/concentrado inactivos e históricos. Stock físico pendiente. 41 fotos inventariadas sin aprobación. F10: 1 READY / 19 PENDING / 0 FAIL. Producción no autorizada.

QA vigente: **470/470 PASS** (baseline granel 444), E2E HTTP/visual y restauración PASS. Lint, build, typecheck, secrets scan y preflight técnico PASS. Runner F56 histórico: solo destino read-only; escrituras retiradas antes de red porque asumían Arroz unitario/apertura histórica. Piloto actual usa sus fixtures propios; no se repitió. Catálogo: backup/diff/readback y replay, sin alterar stock ni historia. Dos REQUIERE_REVISION intactas. Cuatro alertas no críticas auditadas y visibles. Activación, capacitación/ensayo, conteo/dry-run y cutover preparados; [20 checks](operativa/REVISION_F10_2026-10-01.md): 1 resuelto, 15 humanos, 4 de corte productivo. Guardrails TEST intactos; habilitación productiva requiere contrato separado después de autorización.

## Resumen

Web del **Almacén Popular Rosa Elena Morales** — proyecto comunitario sin fines de
lucro. Sirve como escaparate del almacén y para tomar pedidos que se retiran los
sábados de apertura.

- **Estado funcional:** Fase 4 cerrada técnicamente en TEST; F5/F6 y F7/F8
  cerradas en TEST. El piloto operativo integral catálogo → apertura → pedido →
  venta → caja → gasto → compra → stock → historiales → reportes →
  abastecimiento terminó PASS y restauró los fixtures.
- **Producción:** no se toca todavía. Google Sheets, Apps Script, variables y
  comportamiento productivos permanecen sin cambios.
- **F9-A VALIDADA EN TEST:** baseline Apps Script TEST v15 (vigente v18) y la validación de los cinco
  estados siguen activos. El runtime Next local `43a51a9` registró etapas
  saneadas y completó el E2E focalizado con un único pedido: creación durable,
  retry y conflicto de key, confirmación, LISTO reconciliado tras respuesta
  ambigua, cancelación y retry. Stock 5.5 → 5.4 → 5.5 kg; apertura sintética
  `APE-20260929` cerrada. Las dos operaciones históricas `REQUIERE_REVISION`
  se conservan intactas como evidencia. El 503 anterior a `doPost` no tiene
  causa upstream exacta demostrada; en este retest se observó y recuperó un
  404 HTML transitorio en GET `listarAperturas`.
- **Próxima prioridad:** credenciales y ensayo humanos, datos físicos y
  preparación operativa F10; roles y capas de protección ya aprobados. Producción sigue fuera de alcance.
- **F9/F10 — preparación actual:** el limitador de login sigue siendo local por
  instancia. El dashboard del proyecto Hobby mostró cero reglas WAF
  personalizadas activas. La especificación por IP/región y el runbook de
  activación quedaron `PREPARADO_PARA_ACTIVACION`, **sin crear ni publicar
  reglas**; WAF por IP + limitador local IP/actor y riesgo residual fueron
  aceptados para primer lanzamiento el 01/10; activación/cuota siguen pendientes (ver `RATE_LIMIT_WAF_RUNBOOK.md`). El procedimiento de cuentas
  reales, la checklist de dominio y la matriz de evidencias de los 20 checks
  F10 están preparados; asignación 2/2/6 cerrada y datos comerciales parciales
  cargados únicamente en TEST. El paquete mínimo de preguntas al Almacén y la
  vista `PODEMOS_RESOLVER_NOSOTROS` / `NECESITA_ALMACEN` / `SOLO_AL_FINAL`
  están en `F10_READINESS_OPERATIVA.md`. El preflight F10 distingue
  READY/PENDING/FAIL y `check:go-no-go` valida el mismo formato de cuentas que
  el runtime. F9 global ABIERTA; F10 NO-GO.
- **F9 global — identidad TEST remota VALIDADA COMPLETAMENTE:** Preview del proyecto
  `almacen-popular-rosa-elena-7m17`, rama `feature/fase-3a-operativa`, commit
  `4c8608b7d74c136efc294587743626fc31d99dd5`: QA HTTP de los tres
  actores sintéticos, capacidades, revocación, cambio de rol, spoofing,
  legacy, origen, logout, cookies y headers PASS. QA visual autenticada de
  panel, navegación READ-ONLY, logout y consola PASS. El deployment de QA
  que contenía la credencial efímera fue retirado; el Preview final sellado
  sigue Ready. Roles restaurados, cuentas activas y versiones de sesión
  monotónicas; las claves finales no se conservaron. Producción no cambió.
- **F9 global — avance local:** identidad individual por configuración, hashes
  PBKDF2, revocación/versionado, rotación acotada de secreto, rate limit local,
  control de origen, cookie `SameSite=Strict` y CSP quedaron implementados y
  probados localmente. Tres actores sintéticos `test-admin`, `test-operacion` y
  `test-venta` pasaron login, capacidades, revocación, cambio de rol y rechazo
  de suplantación en Next TEST local; el baseline quedó restaurado en un archivo
  de entorno ignorado. Sus contraseñas aleatorias no se conservaron, por lo
  que requieren regeneración para un próximo login interactivo. No hay cuentas
  reales; el rate limit distribuido sigue siendo requisito
  productivo. La QA visual local de formulario/error fue PASS; la vista
  autenticada y logout se validaron visualmente en Preview remoto.
- **F10 — readiness local:** existe un manifiesto de 20 checks y un runbook para
  datos, stock, caja/saldos, costos, capacitación, backup, rollback y Go/No-Go.
  El esquema v2 exige fecha, responsable y referencia para resolver un check;
  `fecha_corte` permanece nula hasta existir corte real. Los guiones de ingesta
  y ensayo TEST están preparados, no ejecutados. roles_aprobados READY y 19 checks operativos PENDING al 01/10.
- **Rama técnica actual:** `feature/fase-3a-operativa`.
- **Fase 3B TEST validada:** la hoja `APERTURAS` existe y
  opera con siete aperturas oficiales; Apps Script TEST versión 2 respondió
  `listarAperturas` correctamente; Next.js local validó login admin, listado y
  el ciclo crear → editar → cerrar. La apertura temporal `APE-20261226` fue
  eliminada y el panel `/admin` volvió a quedar con las siete oficiales. El
  ajuste visual de fechas/horas fue entregado en `dad9542`, sin modificar Apps
  Script. Vercel completó ambos checks correctamente. Persisten los doble
  guardrails TEST y `/admin?demo=1` aislado; el modo presencial completo sigue
  sin implementar. El primer bloque público de pedidos anticipados ya
  está validado en TEST: DTO saneado, selector activo, UI TEST y bloqueo/
  asociación de pedidos. Apps Script TEST se actualizó, la preparación
  idempotente agregó `apertura_id` y `origen_pedido` a `PEDIDOS`, y un pedido
  anticipado real de prueba se creó, verificó y canceló correctamente. Detalle en
  `docs/fase-3b/DECISIONES_OPERATIVAS_FASE_3B.md`,
  `docs/fase-3b/MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md`,
  `docs/fase-3b/PLAN_IMPLEMENTACION_FASE_3B.md`,
  `docs/fase-3b/DECISIONES_PENDIENTES_FASE_3B.md`,
  `docs/fase-3b/DEMO_LOCAL_CALENDARIO_ADMIN_FASE_3B.md` y
  `docs/fase-3b/ENTORNO_TEST_FASE_3B.md` y
  `docs/fase-3b/IMPLEMENTACION_CALENDARIO_ADMIN_TEST.md`.

### Sistema documental

- ✅ Sistema documental v0.1 consolidado en `design-system/` y `reports/`.
- ✅ Dos tipos oficiales: informe de avance para el Almacén e informe técnico interno.
- ✅ Dos pilotos HTML v0.2 aprobados como referencias visuales.
- ✅ Fuentes Markdown, templates y CSS documental separados.
- 🔄 Iteración v0.2.1 en revisión: escala compacta al 70 % y roadmap Fases 0–6.
- ✅ Método HTML → PDF validado end-to-end el 30-09-2026: el HTML aprobado es
  la fuente visual maestra y `scripts/render-informe-pdf.py` reprodujo el
  informe v1.8 en 6 páginas A4, con paridad visual, radios correctos y sin doble
  borde, usando `media="screen"`, fondos, márgenes 0 mm y escala `0.98`.
- ✅ El QA visual HTML vs PDF es obligatorio antes de marcar un archivo como
  `FINAL`; procedimiento en `docs/informes/README_GENERACION_PDF.md`.
- ⬜ Automatización Markdown → HTML pendiente; no se agregaron dependencias a la
  aplicación Next.js.
- ⬜ PDF v0.2.1 pendiente de aprobación humana.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15.5.24 (App Router) |
| Lenguaje | TypeScript 5 · React 19.3 |
| Estilos | Tailwind CSS 3.4 + PostCSS |
| Fuentes | `next/font` (Inter + Playfair Display) |
| Lint | ESLint 8 + `eslint-config-next` |
| Datos catálogo | Google Sheets operativa, consumida mediante Apps Script |
| Backend | Google Apps Script Web App + proxy interno de Next.js |

Scripts: `dev`, `build`, `start`, `lint`. Sin librerías de estado, base de datos
ni pagos.

---

## Estructura (resumen)

```
src/app/
  api/productos/route.ts   Sirve el catálogo público desde Apps Script
  tienda/page.tsx          Catálogo + carrito + envío de pedido
  admin/page.tsx           Panel de pedidos (login local)
  page.tsx                 Home
  rosa-elena/ historia/ participar/   Contenido
src/components/            Navbar, Footer
public/images/             Logos y fotos; productos/ (vacía)
```

Detalle de datos en `docs/DATA_MODEL.md`.

---

## Qué funciona hoy

- ✅ **Catálogo dinámico** desde la base operativa de Google Sheets.
- ✅ **Carrito** completo (agregar/reducir/vaciar, persistido en `localStorage`).
- ✅ **Buscador** de productos por nombre.
- ✅ **Catálogo Fase 4 TEST:** categorías canónicas, unidad de venta,
  separación entre categoría granel y venta decimal, y placeholder accesible.
- ✅ **Envío de pedido por WhatsApp** con mensaje pre-armado (`wa.me`).
- ✅ **Imágenes de producto** por convención de nombre, con fallback.
- ✅ **Pedidos reales compartidos** en Google Sheets, visibles entre dispositivos.
- ✅ **Panel `/admin` protegido** con cookie `httpOnly`, middleware, sesión HMAC
  con actor/rol y autorización por capacidad. La rama incluye login individual;
  TEST conserva `legacy-admin` como recuperación provisoria hasta configurar
  actores técnicos.
- ✅ **Flujo end-to-end** tienda → pedido → base operativa → admin → stock probado.
- ✅ **Proxy admin Fase 3A** rechaza transiciones peligrosas antes de reenviar al
  backend.
- ✅ **UI admin Fase 3A** muestra todas las transiciones válidas y oculta las
  inválidas o terminales.
- ✅ **Modo demo local** validado visualmente sin llamadas a
  `/api/admin/pedidos`, Google Sheets ni Apps Script.
- ✅ **Contenido público Fase 9:** funcionamiento, historia, Rosa Elena,
  comunidad, participación, aportes y siete próximas aperturas 2026.
- 🔄 **Fase 9:** F9-A validada en TEST con Apps Script v15 y Next local
  `43a51a9`; F9 global sigue abierta por decisiones humanas y hardening.
- ✅ **Fase 10 técnica:** metadata, sitemap configurable, robots, errores,
  loading, health, CSP/headers, CI, secrets scan, backup/rollback, manifiesto de
  readiness y preflights locales.
  El estado Go/No-Go y decisiones están en `docs/GO_NO_GO_FASE_9_10.md`.

---

## Pendientes principales

- ✅ Calendario admin Fase 3B validado sobre TEST: Sheet `APERTURAS`, Apps
  Script TEST v2, siete aperturas oficiales y ciclo admin autenticado.
- ✅ Apertura activa y pedidos anticipados públicos validados en TEST: las
  columnas mínimas de `PEDIDOS` están preparadas, Apps Script TEST fue
  desplegado y un pedido real de prueba quedó asociado, verificado y cancelado.
- ✅ **F9A-02 implementada y desplegada en TEST:** confirmación y cancelación usan
  `OPERACIONES_PEDIDOS` como intención durable, claves idempotentes, plan previo,
  aplicación reanudable y readback de pedido, stock y movimientos. Una diferencia
  queda `REQUIERE_REVISION` y bloquea nuevas mutaciones incompatibles.
- ⚠️ Google Sheets sigue sin ofrecer transacciones ACID: confirmación,
  cancelación y creación usan operaciones serializadas, idempotentes, durables
  y verificables; no se promete atomicidad multitabla.
- ✅ Contrato de estados migrado en Sheet TEST y retest F9-A PASS; conservar las
  dos operaciones históricas `REQUIERE_REVISION` como evidencia.
- Separar estado de pago y método de pago según el plan aprobado.
- Reemplazar datos temporales de CONFIG por información oficial del Almacén.
- Resolver la nomenclatura de fases entre el plan histórico y los informes v0.2.
- F.1 y F.3 de Fase 3B ya aprobadas como criterio base (ver
  `docs/fase-3b/DECISIONES_PENDIENTES_FASE_3B.md` §0); el contrato de backend
  real ya está diseñado en el modelo §G–§H; falta
  implementarlo y probarlo exclusivamente en TEST.
- ✅ Fase 5 + Fase 6 cerradas técnicamente en TEST: ventas por unidad/decimal,
  rechazos, idempotencia, pedidos/cancelación, stock, caja y reimpresión
  validados; apertura de prueba restaurada.
- ✅ Fase 4 cerrada técnicamente en TEST: 54 categorías y 10 unidades
  normalizadas según F4-01–F4-09; backup y readback sin cambios colaterales.
  Stock/mínimos/costos/prioridades/imágenes siguen deliberadamente sintéticos o
  pendientes antes de producción. Ver
  `docs/fase-4-9/PROPUESTA_CATALOGO_FASE_4_TEST.md`.
- ✅ F7/F8 cerradas técnicamente en TEST: persistencia, rutas, UI, E2E y piloto
  integral validados. Los datos comerciales reales permanecen fuera de alcance.

---

## Prioridad actual

**Cerrar decisiones humanas F9/F10 y cargar datos reales solo durante la puesta
en marcha autorizada.** La identidad sintética TEST ya fue probada; cualquier
intervención productiva requiere autorización y Go/No-Go separados.

La arquitectura técnica de roles usa `venta`, `operacion` y `administracion` con
herencia explícita de capacidades. Matriz y asignación definitivas aprobadas
el 2026-10-01; credenciales y ensayo humanos siguen pendientes. Las
cuentas individuales se suministran por entorno sin nombres hardcodeados. El
login compartido crea temporalmente `legacy-admin`/`administracion` solo en
TEST/local y queda deshabilitado al configurar usuarios, salvo recuperación
TEST explícita.

---

## Datos hardcodeados a tener presentes

- Contactos, lugar, horario y fechas centralizados en
  `src/lib/fase9/contenidoPublico.ts`; valores oficiales confirmados, implementación actualizada en TEST y revisión humana pendiente.
- Datos temporales de CONFIG aún pendientes de reemplazo por valores oficiales.
- Fechas y lugar de aperturas 2026 centralizados en
  `src/lib/fase9/contenidoPublico.ts`; deben actualizarse cuando el Almacén
  informe cambios.
- Dirección: Gamero 2670, Independencia.
