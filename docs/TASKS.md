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

- ✅ **Crear el script de setup de la Google Sheet operativa** (`scripts/setup-google-sheet.gs`),
  que genera la planilla `BD_WEB_ALMACEN_ROSA_ELENA_MORALES` con las 10 hojas
  definidas en `docs/DATA_MODEL.md`. Guía en `docs/GOOGLE_SHEET_SETUP.md`.
- ✅ **Validar el script en Google Apps Script:** ejecutado y planilla creada
  correctamente (sin caracteres raros tras el fix de encoding a ASCII). El ID/URL
  de la planilla **no** se guardan en el repo.
- ✅ **Crear la herramienta de importación inicial de productos**
  (`scripts/import-products-from-old-sheet.gs`): migra productos y precios desde el
  CSV antiguo hacia la hoja PRODUCTOS de la base operativa. Guía en
  `docs/IMPORT_PRODUCTS.md`. *(La planilla antigua es solo fuente inicial, no base final.)*
  Queda como **herramienta auxiliar**: NO fue necesario ejecutarla para esta primera carga.
- ✅ **Cargar la hoja PRODUCTOS:** hecho **manualmente** con **53 productos reales** y
  su `precio_venta` del listado antiguo. La planilla antigua ya no se usa como base
  operativa.
- ✅ **Cargar la hoja CONFIG:** hecho a mano con **datos temporales de prueba** (sin
  secretos en el repo).
- ⬜ **Revisar/afinar** los productos cargados: categoria, prioridad, unidad_medida,
  stock e imágenes.
- ⬜ **Reemplazar los datos temporales de CONFIG** por los valores reales definitivos
  (WhatsApp, margen, datos de aportes, etc.). Se hace a mano; no se commitea al repo.
- ⬜ Documentar el acceso a la nueva Sheet para la app (sin exponer secretos: el ID
  irá como variable de entorno en FASE 1).
- ✅ Definir el esquema de `PEDIDOS` y `DETALLE_PEDIDOS` (ya cubierto por el modelo
  y consumido por el backend de pedidos).
- ✅ **Crear el backend Apps Script Web App** (`scripts/apps-script-pedidos.gs`):
  `crearPedido` (público), `listarPedidos`/`obtenerPedido` (GET admin),
  `actualizarEstadoPedido`/`cancelarPedido` (POST admin). Valida stock y precios en
  servidor, descuenta/devuelve stock y registra MOVIMIENTOS_STOCK. Guía en
  `docs/APPS_SCRIPT_PEDIDOS.md`.
- ✅ **Desplegar y probar el backend:** probado manualmente en Apps Script — las 5
  acciones (`crearPedido`, `listarPedidos`, `obtenerPedido`, `cancelarPedido`,
  `actualizarEstadoPedido`) respondieron OK contra la base operativa. URL de Web App,
  token y SPREADSHEET_ID **no** se commitean. *(Aún no conectado a `src/`.)*
- ✅ **Conectar la web al backend vía proxy interno de Next** (rama
  `fase-1/conectar-web-pedidos`): helper de servidor `src/lib/appsScriptPedidos.ts` +
  rutas `src/app/api/pedidos` (público) y `src/app/api/admin/pedidos[/[id]]` (admin).
  La URL de Web App y el token se leen de variables de entorno; nunca llegan al
  cliente. `.env.example` con placeholders.
- ✅ **Tienda conectada:** al confirmar, llama a `POST /api/pedidos` (pedido real),
  muestra el `id_pedido` y abre WhatsApp con ese número. Deja de escribir
  `pedidos-almacen` en `localStorage` (el carrito sí sigue en `localStorage`).
- ✅ **/admin conectado a pedidos reales:** lista desde `/api/admin/pedidos`, ve
  detalle, cambia estado (listo/entregado), cambia estado_pago y cancela (devuelve
  stock). Ya no depende de `localStorage` para pedidos. Se removió el modo de edición
  de líneas (sin acción de backend).
- ✅ **Alinear IDs de producto (resuelto):** `/api/productos` dejó de leer el CSV
  antiguo y ahora sirve el catálogo desde la **base operativa** (hoja PRODUCTOS) vía
  la nueva acción pública `listarProductos` de Apps Script. El `id` expuesto a la
  tienda es el `id_producto` real (`PROD-001…`), por lo que `crearPedido` valida sin
  fallar. Solo expone productos con `activo = SI`; no devuelve `precio_costo` ni
  `margen_pct`. *(Requiere re-desplegar la Web App para exponer `listarProductos`.)*
- ✅ **Flujo real end-to-end probado localmente (OK):**
  - `/api/productos` devuelve el catálogo desde la base operativa con IDs reales
    (`PROD-001`, `PROD-002`, …).
  - La tienda crea **pedidos reales** contra Apps Script.
  - Las hojas se actualizan correctamente: PEDIDOS, DETALLE_PEDIDOS, PRODUCTOS
    (stock) y MOVIMIENTOS_STOCK.
  - El admin lista los pedidos reales y muestra estados reales (pendiente, listo,
    cancelado); cambiar estado y cancelar funcionan, con stock y movimientos
    correctamente reflejados.
  - `listarProductos` quedó **desplegado y validado** en la Web App.
  - `.env.local` existe solo localmente y está ignorado por git.
- ⬜ **Seguridad: proteger `/api/admin/*`** — hoy no tienen auth de servidor (el login
  del panel es solo cliente). Deuda técnica registrada; pendiente gate real.
- ⬜ Añadir selección de `forma_pago` en la tienda (hoy se envía `efectivo_al_retirar`
  por defecto).
- ⬜ Actualizar `PROJECT_STATE.md` cuando el flujo real quede validado.

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
