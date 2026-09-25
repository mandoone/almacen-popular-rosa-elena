# PROJECT_STATE.md — Estado vivo del proyecto

> Documento vivo. Refleja el estado **actual** del proyecto. Actualizar en cada
> tarea que cambie el estado. Última actualización: 2026-09-25.

---

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
- **F9-A VALIDADA EN TEST:** Apps Script TEST v15 y la validación de los cinco
  estados siguen activos. El runtime Next local `43a51a9` registró etapas
  saneadas y completó el E2E focalizado con un único pedido: creación durable,
  retry y conflicto de key, confirmación, LISTO reconciliado tras respuesta
  ambigua, cancelación y retry. Stock 5.5 → 5.4 → 5.5 kg; apertura sintética
  `APE-20260929` cerrada. Las dos operaciones históricas `REQUIERE_REVISION`
  se conservan intactas como evidencia. El 503 anterior a `doPost` no tiene
  causa upstream exacta demostrada; en este retest se observó y recuperó un
  404 HTML transitorio en GET `listarAperturas`.
- **Próxima prioridad:** asignación humana de roles, protección distribuida de
  login y preparación operativa F10. Producción sigue fuera de alcance.
- **F9 global — avance local:** identidad individual por configuración, hashes
  PBKDF2, revocación/versionado, rotación acotada de secreto, rate limit local,
  control de origen, cookie `SameSite=Strict` y CSP quedaron implementados y
  probados localmente. Tres actores sintéticos `test-admin`, `test-operacion` y
  `test-venta` pasaron login, capacidades, revocación, cambio de rol y rechazo
  de suplantación en Next TEST local; el baseline quedó restaurado en un archivo
  de entorno ignorado. Sus contraseñas aleatorias no se conservaron, por lo
  que requieren regeneración para un próximo login interactivo. No hay cuentas
  reales ni despliegue; el rate limit distribuido sigue siendo requisito
  productivo. QA visual del formulario/error PASS; vista autenticada y logout
  se comprobaron por HTTP, no visualmente.
- **F10 — readiness local:** existe un manifiesto de 20 checks y un runbook para
  datos, stock, caja/saldos, costos, capacitación, backup, rollback y Go/No-Go.
  Todos los checks operativos reales continúan pendientes.
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
- ⬜ Automatización Markdown → HTML → PDF pendiente; no se instalaron dependencias.
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
herencia explícita de capacidades. La matriz es provisional, definida por Omar;
la asignación de personas y la aceptación del Almacén siguen pendientes. Las
cuentas individuales se suministran por entorno sin nombres hardcodeados. El
login compartido crea temporalmente `legacy-admin`/`administracion` solo en
TEST/local y queda deshabilitado al configurar usuarios, salvo recuperación
TEST explícita.

---

## Datos hardcodeados a tener presentes

- Contactos, lugar, horario y fechas centralizados en
  `src/lib/fase9/contenidoPublico.ts`; falta confirmación institucional final.
- Datos temporales de CONFIG aún pendientes de reemplazo por valores oficiales.
- Fechas y lugar de aperturas 2026 centralizados en
  `src/lib/fase9/contenidoPublico.ts`; deben actualizarse cuando el Almacén
  informe cambios.
- Dirección: Gamero 2670, Independencia.
