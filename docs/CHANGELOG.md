# CHANGELOG.md — Hitos del proyecto

> Registro cronológico de hitos relevantes. Formato simplificado estilo
> *Keep a Changelog*. El detalle de tareas vive en `docs/TASKS.md`.

---

## [FASE 3B — diseño] — Calendario de aperturas y modo presencial (2026-08-19)

### Añadido
- `docs/fase-3b/DECISIONES_OPERATIVAS_FASE_3B.md`: respuestas del Almacén
  (horario 11:00–15:00, cierre de pedidos jueves anterior 23:59, confirmación
  y cancelación admin-only), decisiones técnicas propias, diseño del
  calendario editable de aperturas y del modo presencial digital, y alcance
  de Fase 3B.
- `docs/fase-3b/PENDIENTES_ALMACEN_FASE_3B.md`: 17 pendientes reales del
  Almacén (catálogo, calendario, contenido público, fotos de productos,
  nómina de usuarios) y el procedimiento pendiente para las fotos de
  productos encontradas en Drive (carpeta "Productos del almacén").

### Cambiado
- `docs/PROJECT_STATE.md`: registra el inicio del diseño de Fase 3B y el
  horario confirmado por el Almacén.
- `docs/TASKS.md`: agrega bloque FASE 3B con las tareas de diseño pendientes.

### Estado
- Documental y de diseño técnico únicamente. No se modificó Google Sheets,
  Apps Script productivo, Vercel ni `.env.local`. Sin código nuevo.

---

## [DS 0.1 — iteración] — Informes compactos v0.2.1 (2026-07-11)

### Cambiado
- Escala tipográfica y espaciados reducidos aproximadamente al 70 % para A4.
- Templates oficiales usan `.report-density-compact` con base de 7–7,2 pt al imprimir.
- Ambos informes incorporan checklist completo de Fases 0–6.

### Añadido
- HTML y PDF v0.2.1 separados de los v0.2 preliminares.
- Roadmap simple para el Almacén y roadmap técnico con riesgos/dependencias.
- Prueba manual TD6 para densidad y cobertura completa de fases.

### Estado
- Iteración v0.2.1 pendiente de aprobación humana; no publicada en Drive.

---

## [DS 0.1] — Sistema documental consolidado (2026-07-11)

### Añadido
- `design-system/docs/ADS-002_sistema_documental.md`: guía oficial de flujo,
  metadata, tipos, componentes, nombres, PDF y relación repo/Drive.
- `design-system/themes/reports.css`: componentes documentales extraídos de los
  pilotos v0.2 aprobados.
- Templates oficiales para informes de avance y técnicos internos.
- `reports/README.md` y estructura de fuentes, HTML y PDF por tipo.
- Pruebas manuales TD1–TD5 para metadata, HTML, consistencia visual, A4 y secretos.

### Conservado
- Dos Markdown v0.2 como fuentes oficiales iniciales.
- Dos HTML piloto v0.2 como referencias visuales aprobadas.

### Cambiado
- `design-system/README.md`, decisiones y prompt de generación apuntan al flujo
  Markdown → HTML → revisión → PDF y a la nueva estructura `reports/`.

### Pendiente
- Elegir e implementar la herramienta automática Markdown → HTML → PDF.
- Generar PDF únicamente después de aprobar el pipeline.
- Unificar la nomenclatura de fases entre el backlog histórico y los informes v0.2.

---

## [FASE 1] — Seguridad del panel admin (2026-07-07)

### Añadido
- `src/lib/session.ts`: helpers de sesión firmada con HMAC-SHA256 usando Web Crypto
  API. Compatible con Edge Runtime (middleware) y Node.js 18+. Sin dependencias
  externas. Token con timestamp + firma hex; expira a las 8 horas.
- `src/middleware.ts`: middleware Next.js que protege `/admin`, `/admin/*` y
  `/api/admin/*`. Permite sin sesión: `/admin/login` y `/api/admin/auth/*`. Redirige
  al login si sin sesión (páginas) o responde 401 JSON (rutas API). Si hay sesión
  válida y se visita `/admin/login`, redirige al panel (evita loop).
- `src/app/admin/login/page.tsx`: formulario de login admin. Envía password vía
  `POST /api/admin/auth/login`; en éxito redirige a `/admin`.
- `src/app/api/admin/auth/login/route.ts`: valida password contra
  `ADMIN_PANEL_PASSWORD` (comparación de tiempo constante), genera token firmado y
  devuelve cookie `admin_session` httpOnly.
- `src/app/api/admin/auth/logout/route.ts`: elimina cookie `admin_session`.
- Variables de entorno: `ADMIN_PANEL_PASSWORD` y `ADMIN_SESSION_SECRET` (agregadas
  a `.env.example`).

### Cambiado
- `src/app/admin/page.tsx`: eliminada [contraseña histórica hardcodeada omitida],
  eliminado `LoginScreen` con auth solo de cliente, eliminado uso de `localStorage`
  para sesión. El componente raíz ahora llama `POST /api/admin/auth/logout` y
  redirige al login al cerrar sesión. El acceso real lo controla el middleware.

### Seguridad resuelta
- `/api/admin/*` ya no es alcanzable sin sesión válida.
- La contraseña ya no está expuesta en el bundle JS del cliente.
- La sesión vive en cookie httpOnly (no accesible desde JavaScript).
- En producción la cookie lleva `Secure: true`.

### Pendiente (deploy)
- Agregar `ADMIN_PANEL_PASSWORD` y `ADMIN_SESSION_SECRET` en Vercel Production y
  hacer redeploy para activar en producción.

---

## [DS] — Design System liviano iniciado (2026-06-26)

### Añadido
- `WEB_STYLE_AUDIT.md` (raíz): auditoría visual completa del proyecto. Inventario de
  colores, tipografía, componentes, espaciados, íconos, inconsistencias y propuesta de DS.
- `design-system/`: estructura completa del Design System liviano.
  - `README.md`: objetivo, flujo de trabajo y relación con la web.
  - `brandkit/colors.md` y `brandkit/typography.md`: referencia de identidad visual.
  - `brandkit/assets/`: copias de logo.png, logo-red.png y favicon.ico para templates.
  - `themes/almacen.css`: variables CSS nativas extraídas de `tailwind.config.ts`.
  - `templates/report-base.html`: template HTML completo para informes, con estilos de marca.
  - `templates/partials/`: header, footer y section-block reutilizables.
  - `prompts/generate-report.md` y `prompts/audit-visual.md`: instrucciones para Claude.
  - `docs/WEB_STYLE_AUDIT.md`: copia de la auditoría (original en raíz intacto).
  - `docs/decisions.md`: decisiones de arquitectura del DS (D1–D6).
  - `docs/ADS-001_brandkit_analysis.md`: Brand Kit técnico completo (filosofía visual,
    paleta, tokens, tipografía, espaciado, 10 variantes de botón, 3 variantes de card,
    formularios, navbar, footer, hero, iconografía, uso del logo, reglas de consistencia,
    elementos protegidos y candidatos a evolución, reutilización en informes HTML).
  - `reports/.gitkeep`: carpeta preparada para informes generados.
  - `reports/2026-06-26_estado_actual_web_almacen.html`: primer informe real generado con
    identidad visual del Almacén. Cubre stack, estado por fases, paleta, tipografía,
    deudas técnicas y próximos pasos. Reutiliza hero, feature cards, tabla admin,
    badges, CTA section y footer de la web. Listo para imprimir como PDF.

### Notas
- No se modificó ningún archivo de `src/`, `public/`, `tailwind.config.ts` ni `globals.css`.
- El DS es independiente del build de Next.js. Los templates HTML abren directamente en browser.
- Primer informe validado visualmente. Pendiente: exportar a PDF con Ctrl+P desde Chrome.

---

## [FASE 1] — Flujo de pedidos reales probado end-to-end (local)

### Validado
- Prueba **end-to-end local OK** del flujo completo de pedidos reales:
  - `/api/productos` sirve el catálogo desde la base operativa con IDs reales
    (`PROD-001…`).
  - La tienda crea pedidos reales contra Apps Script; se actualizan PEDIDOS,
    DETALLE_PEDIDOS, PRODUCTOS (stock) y MOVIMIENTOS_STOCK.
  - El admin lista pedidos reales, muestra estados (pendiente/listo/cancelado),
    cambia estado y cancela (stock y movimientos reflejados correctamente).
  - `listarProductos` desplegado y validado en la Web App.

### Notas
- Probado con `.env.local` (solo local, ignorado por git). Sin URL, token ni
  SPREADSHEET_ID reales en el repo.
- Cierra el bloque `fase-1/conectar-web-pedidos`: la web ya opera con pedidos reales.

---

## [FASE 1] — Catálogo migrado a la base operativa

### Cambiado
- **`/api/productos` ya no lee el CSV de la planilla antigua.** Ahora el catálogo de
  la tienda se sirve desde la **base operativa** (hoja PRODUCTOS) a través de la nueva
  acción pública `listarProductos` de Apps Script. El `id` que recibe la tienda es el
  `id_producto` real (`PROD-001…`), de modo que `crearPedido` valida los items sin
  fallar (se elimina el bloqueante de IDs incompatibles).

### Añadido
- Acción GET pública `listarProductos` en `scripts/apps-script-pedidos.gs`: devuelve
  solo productos con `activo = SI`, en el orden de la hoja, sin exponer `precio_costo`
  ni `margen_pct`. No requiere token.
- `listarProductos()` en `src/lib/appsScriptPedidos.ts` (helper de servidor, sin token).

### Notas
- Requiere **re-desplegar** la Web App de Apps Script (nueva versión) para que
  `listarProductos` esté disponible.
- Sin URL, token ni SPREADSHEET_ID reales en el repo.

---

## [FASE 1] — Web conectada al backend de pedidos (proxy interno)

### Añadido
- `src/lib/appsScriptPedidos.ts`: helper de **servidor** para llamar a la Web App de
  Apps Script. Lee `GOOGLE_SCRIPT_PEDIDOS_URL` y `GOOGLE_SCRIPT_ADMIN_TOKEN` de
  `process.env`; el token solo se usa en acciones admin y nunca llega al cliente.
- Rutas proxy de Next: `src/app/api/pedidos` (POST público → `crearPedido`) y
  `src/app/api/admin/pedidos` + `.../[id]` (GET lista, GET detalle, PATCH estado,
  POST cancelar) para acciones admin.
- `.env.example` con `GOOGLE_SCRIPT_PEDIDOS_URL` y `GOOGLE_SCRIPT_ADMIN_TOKEN`
  vacíos. `.env.local` no se commitea.

### Cambiado
- **Tienda** (`src/app/tienda/page.tsx`): al confirmar, registra el pedido real vía
  `POST /api/pedidos`, muestra el `id_pedido` y abre WhatsApp con ese número. Ya no
  guarda pedidos en `localStorage` (el carrito sí sigue ahí).
- **/admin** (`src/app/admin/page.tsx`): lee pedidos reales desde el proxy, ve
  detalle, cambia estado y estado_pago, y cancela (devuelve stock). Ya no depende de
  `localStorage`. Se removió el modo de edición de líneas (sin backend para ello).

### Verificado
- `npm run lint`: sin errores. `npm run build`: compila y type-check OK; las 3 rutas
  nuevas quedan como dinámicas.

### Pendiente / Riesgos
- **IDs de producto desalineados:** `/api/productos` (CSV antiguo) entrega ids que no
  coinciden con `id_producto` (`PROD-001…`) de la base operativa; el flujo real fallará
  hasta alinear el catálogo. Ver `docs/TASKS.md`.
- **`/api/admin/*` sin auth de servidor** (deuda técnica): el login del panel es solo
  cliente. Documentado para una fase futura.
- Flujo real end-to-end aún **no probado** (requiere `.env.local` + Web App desplegada).

---

## [FASE 1 — preparación] — Backend de pedidos probado (OK)

### Validado
- Backend de pedidos reales **probado manualmente** en Google Apps Script contra la
  base operativa. Resultado de las 5 acciones: **OK**.
  - `crearPedido`: creó pedidos en PEDIDOS y DETALLE_PEDIDOS y descontó stock.
  - `listarPedidos`: devolvió los pedidos existentes.
  - `obtenerPedido`: devolvió cabecera + detalle.
  - `cancelarPedido`: marcó cancelado y devolvió stock.
  - `actualizarEstadoPedido`: cambió `estado_pedido` y `estado_pago` sin tocar stock.

### Notas
- El flujo real quedó validado contra las hojas PEDIDOS, DETALLE_PEDIDOS, PRODUCTOS y
  MOVIMIENTOS_STOCK.
- Pendiente: conectar la web (`src/`) al backend. URL de Web App, token y
  SPREADSHEET_ID **no** se guardan en el repo.

---

## [FASE 1 — preparación] — Backend de pedidos reales (Apps Script Web App)

### Añadido
- `scripts/apps-script-pedidos.gs`: Web App de Apps Script para pedidos reales.
  Acciones: `crearPedido` (POST público), `listarPedidos` y `obtenerPedido` (GET con
  token admin), `actualizarEstadoPedido` y `cancelarPedido` (POST con token admin).
  - Valida en servidor existencia/estado del producto, stock y **calcula precios
    desde `precio_venta`** (no confía en el frontend).
  - Escribe en PEDIDOS y DETALLE_PEDIDOS, descuenta stock en PRODUCTOS y registra
    MOVIMIENTOS_STOCK; `cancelarPedido` devuelve el stock.
  - Helpers: respuesta JSON estándar, lectura de hojas por encabezado, `LockService`
    para concurrencia, validación de config y manejo de errores con código.
- `docs/APPS_SCRIPT_PEDIDOS.md`: guía de configuración, despliegue como Web App y
  pruebas (`crearPedido`, `listarPedidos`, etc.).

### Notas
- **Pendiente de prueba/despliegue.** Todavía **no** se conecta a la web (`src/` sin
  cambios).
- `SPREADSHEET_ID` y `ADMIN_TOKEN` son marcadores `PEGAR_..._AQUI`; la **URL de la
  Web App** y el **token** **no se commitean** al repo.

---

## [FASE 1 — preparación] — Carga inicial de la base operativa

### Hecho
- **Hoja PRODUCTOS cargada manualmente** con **53 productos reales** y su
  `precio_venta` del listado antiguo.
- **Hoja CONFIG cargada** con datos temporales de prueba.
- La base operativa ya cuenta con CONFIG y PRODUCTOS, lista para iniciar la fase de
  pedidos reales.

### Notas
- La carga inicial se resolvió **manualmente**, **sin ejecutar** el Apps Script
  importador. `scripts/import-products-from-old-sheet.gs` queda como herramienta
  auxiliar reutilizable.
- La planilla antigua **deja de usarse** como base operativa.
- Sin ID/URL de planillas ni secretos en el repo. No se modificó `src/`.

---

## [FASE 1 — preparación] — Importación inicial de productos

### Añadido
- `scripts/import-products-from-old-sheet.gs`: Apps Script que importa productos y
  precios desde el CSV de la planilla antigua hacia la hoja PRODUCTOS de la base
  operativa. Replica la lógica de parseo de `src/app/api/productos/route.ts`, genera
  `id_producto` correlativo (`PROD-001`…), limpia solo datos (conserva encabezados y
  validaciones) y registra métricas en el log.
- `docs/IMPORT_PRODUCTS.md`: guía de uso, mapeo de columnas y revisión manual posterior.

### Notas
- La planilla antigua se usa **solo como fuente de datos inicial**, no como base
  operativa final.
- El script trae marcadores `PEGAR_..._AQUI`; la **URL del CSV** y el **ID** de la
  base se editan en Apps Script y **no se commitean** al repo.
- No se modificó `src/` ni la lógica actual de lectura del catálogo.

---

## [FASE 1 — preparación] — Base de datos operativa (Google Sheet)

### Añadido
- `scripts/setup-google-sheet.gs`: Apps Script que crea la planilla operativa
  `BD_WEB_ALMACEN_ROSA_ELENA_MORALES` con sus 10 hojas, encabezados, fila
  congelada, formato, validaciones de lista y CONFIG precargada (valores vacíos).
- `docs/GOOGLE_SHEET_SETUP.md`: guía de uso paso a paso del script.

### Corregido
- Encoding del script de setup: se reemplazaron caracteres no ASCII (tildes, ñ,
  guion largo) por equivalentes ASCII para evitar textos corruptos (`NÃºmero`,
  `almacÃ©n`) al copiar/pegar en Google Apps Script.

### Validado
- El script se ejecutó en Google Apps Script y creó la planilla operativa
  correctamente. La primera ejecución evidenció el problema de encoding; tras el
  fix, la segunda ejecución quedó limpia.

### Notas
- El **ID y la URL** de la planilla, los **datos reales de CONFIG** y cualquier
  secreto **no se guardan en el repositorio**. El ID se manejará como configuración
  / variable de entorno cuando se implemente FASE 1.
- Pendiente: cargar a mano los valores reales de CONFIG e implementar los pedidos
  reales (ver `docs/TASKS.md`).

---

## [FASE 0] — Documentación viva

### Añadido
- Estructura de documentación viva del proyecto (arnés liviano, sin SDD).
- `AGENTS.md`: instrucciones para Claude Code, metodología y comandos útiles.
- `docs/PROJECT_STATE.md`: estado vivo del proyecto.
- `docs/REQUIREMENTS.md`: requerimientos por perfil (comprador, vendedor,
  administrador) y por fase (0–5).
- `docs/DATA_MODEL.md`: modelo de datos; decisión de crear una Google Sheet nueva y
  exclusiva como backend operativo; hojas previstas y reglas de stock/precio.
- `docs/TASKS.md`: tareas por fase; FASE 0 detallada y FASE 1 como prioridad.
- `docs/DECISIONS.md`: decisiones cerradas (D1–D6).
- `docs/TEST_PLAN.md`: pruebas manuales actuales y futuras.
- `docs/CHANGELOG.md`: este archivo.

### Decidido
- Arnés liviano de documentación (D1) · Sin SDD (D2) · Trabajo por fases (D3).
- Backend con Google Sheets + Apps Script (D4).
- Google Sheet nueva y exclusiva para la web como fuente oficial (D5).
- Sin pagos online por ahora (D6).

### Notas
- No se modificó código de `src/` ni dependencias.
- Problema principal pendiente de resolver en FASE 1: los pedidos viven solo en
  `localStorage` y no son visibles entre dispositivos.
