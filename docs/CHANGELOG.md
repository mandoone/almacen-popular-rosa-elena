# CHANGELOG.md — Hitos del proyecto

> Registro cronológico de hitos relevantes. Formato simplificado estilo
> *Keep a Changelog*. El detalle de tareas vive en `docs/TASKS.md`.

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
