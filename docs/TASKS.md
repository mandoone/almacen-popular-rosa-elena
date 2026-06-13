# TASKS.md — Tareas vivas y backlog

> Tareas por fase. Estado: ⬜ pendiente · 🔄 en curso · ✅ hecho · 🚧 bloqueada.
> Una fase = una rama. Detalle de requisitos en `docs/REQUIREMENTS.md`.

---

## FASE 0 — Documentación viva (rama `fase-0/documentacion-viva`)

- ✅ Crear rama `fase-0/documentacion-viva`.
- ✅ Crear `AGENTS.md` (instrucciones del agente y metodología).
- ✅ Crear carpeta `docs/`.
- ✅ Crear `docs/PROJECT_STATE.md` (estado vivo).
- ✅ Crear `docs/REQUIREMENTS.md` (requerimientos por perfil y fase).
- ✅ Crear `docs/DATA_MODEL.md` (modelo de datos + Google Sheet operativa).
- ✅ Crear `docs/TASKS.md` (este archivo).
- ✅ Crear `docs/DECISIONS.md` (decisiones cerradas).
- ✅ Crear `docs/TEST_PLAN.md` (pruebas manuales).
- ✅ Crear `docs/CHANGELOG.md` (hito inicial).
- ⬜ Revisar `git diff` y `git status`.
- ⬜ Commit de FASE 0 (tras revisión humana).

**Criterio de cierre:** los 8 archivos existen con contenido real, sin duplicación
ni secretos, revisados y commiteados en la rama de fase.

---

## FASE 1 — Pedidos reales en Google Sheets (PRIORIDAD INMEDIATA)

> Objetivo: que los pedidos dejen de vivir en `localStorage` y se almacenen en la
> Google Sheet operativa, visibles desde cualquier dispositivo en `/admin`.

- 🚧 **Crear manualmente la nueva Google Sheet operativa** (fuente oficial de la
  web) con las hojas definidas en `docs/DATA_MODEL.md`. *Bloquea el resto de FASE 1.*
- ⬜ Documentar el acceso a la nueva Sheet (sin exponer secretos en el repo).
- ⬜ Definir el esquema final de `PEDIDOS` y `DETALLE_PEDIDOS`.
- ⬜ Crear el **Apps Script Web App** (`doPost`/`doGet`) para escribir/leer pedidos.
- ⬜ Implementar en la app el envío del pedido al backend (reemplazar guardado en
  `localStorage` del cliente).
- ⬜ Reescribir `/admin` para **leer pedidos reales** desde la Sheet.
- ⬜ Persistir cambios de estado del pedido (pendiente → listo → entregado) en el backend.
- ⬜ Revisar seguridad del acceso admin (evitar contraseña hardcodeada en cliente).
- ⬜ Actualizar `PROJECT_STATE.md`, `TEST_PLAN.md` y `CHANGELOG.md`.

---

## FASE 2 — Panel vendedor

- ⬜ Rol vendedor separado de administrador.
- ⬜ Vista de pedidos del día operable durante la apertura.

---

## FASE 3 — Productos, precios y stock

- ⬜ Gestión de productos desde la Sheet operativa (hoja PRODUCTOS).
- ⬜ Cálculo de `precio_venta` (costo + margen, redondeo a $10) — ver `docs/DATA_MODEL.md`.
- ⬜ Control de stock con MOVIMIENTOS_STOCK (reserva/devolución/salida/entrada).

---

## FASE 4 — Compras y abastecimiento

- ⬜ Registro de compras (COMPRAS / DETALLE_COMPRAS).
- ⬜ Movimientos de stock por entrada de mercadería.

---

## FASE 5 — Caja y reportes

- ⬜ Registro de ventas y caja (VENTAS / DETALLE_VENTAS).
- ⬜ Reportes básicos (ventas, pedidos, stock).

---

## Pendientes transversales (a vigilar)

- ⬜ Centralizar datos hardcodeados (WhatsApp, dirección, fechas) en CONFIG.
- ⬜ Actualizar fechas de apertura del Home (hoy desactualizadas).
- ⬜ Reescribir `README.md` con descripción real (apuntando a `docs/`).
- ⬜ Riesgo repo en Dropbox: vigilar conflictos de sincronización de `.git`.
