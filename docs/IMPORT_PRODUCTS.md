# IMPORT_PRODUCTS.md — Importar productos desde la planilla antigua

Guía para hacer la **importación inicial** de productos desde la planilla antigua
(CSV publicado) hacia la hoja **PRODUCTOS** de la base operativa nueva.

- **Script:** `scripts/import-products-from-old-sheet.gs`
- **Base destino:** `BD_WEB_ALMACEN_ROSA_ELENA_MORALES` (creada con
  `scripts/setup-google-sheet.gs`, ver `docs/GOOGLE_SHEET_SETUP.md`).
- **Modelo de datos:** `docs/DATA_MODEL.md`.

> ⚠️ **La planilla antigua se usa SOLO como fuente de datos inicial, no como base
> operativa final.** Es la misma Google Sheet (CSV publicado) que hoy lee la web en
> `src/app/api/productos/route.ts`. Tras la migración, la fuente oficial pasa a ser
> la base operativa nueva (decisión D5 en `docs/DECISIONS.md`).

---

## Qué hace el script

1. Descarga el CSV antiguo con `UrlFetchApp.fetch`.
2. Lo parsea **con la misma lógica** que la web actual
   (`src/app/api/productos/route.ts`):
   - localiza la fila de encabezado cuya 2ª columna contiene "RT" y "CUL" (cubre
     "ARTICULO"/"ARTÍCULO" con cualquier encoding);
   - desde ahí toma **columna 1 = nombre** y **columna 2 = precio**;
   - se detiene al encontrar una fila vacía o una fila tipo **TOTAL**;
   - ignora filas cuyo precio no es numérico.
3. Genera `id_producto` correlativo: `PROD-001`, `PROD-002`, …
4. Limpia **solo los datos** de la hoja PRODUCTOS (desde la fila 2); **no toca**
   encabezados ni validaciones.
5. Escribe los productos importados.
6. Deja un resumen en el registro (`Logger.log`).

### Mapeo a la hoja PRODUCTOS

| Columna | Valor en la importación inicial |
|---------|---------------------------------|
| `id_producto` | `PROD-001`, `PROD-002`, … |
| `activo` | `SI` |
| `nombre` | nombre desde el CSV |
| `categoria` | `pendiente` |
| `prioridad` | `media` |
| `unidad_medida` | `unidad` |
| `permite_decimal` | `NO` |
| `paso_venta` | `1` |
| `precio_costo` | *(vacío)* |
| `margen_pct` | *(vacío)* |
| `precio_venta` | precio desde el CSV |
| `stock_actual` | `0` |
| `stock_minimo` | `0` |
| `imagen_url` | *(vacío)* |
| `observaciones` | `Importado desde planilla antigua` |
| `actualizado_en` | timestamp de la importación |

---

## Pasos

1. Tener creada la base operativa con `scripts/setup-google-sheet.gs` y a mano su
   **ID** (ver `docs/GOOGLE_SHEET_SETUP.md`).
2. Abrir **https://script.google.com/** con la cuenta dueña de la base operativa.
3. Crear un **proyecto nuevo** (o usar el del setup) y **pegar todo** el contenido
   de `scripts/import-products-from-old-sheet.gs`.
4. Editar las dos constantes del inicio del archivo:
   - **`OLD_PRODUCTS_CSV_URL`** → pegar la URL del **CSV antiguo publicado**. Es la
     misma que usa `src/app/api/productos/route.ts` (constante `CSV_URL`).
   - **`TARGET_SPREADSHEET_ID`** → pegar el **ID de la base operativa nueva**.
   > Estos valores se editan **solo en Apps Script**. **No se commitean** al repo.
5. Guardar (`Ctrl+S`).
6. Seleccionar la función **`importarProductosDesdeCSVAntiguo`** y pulsar **Ejecutar**.
7. **Autorizar permisos** cuando lo solicite (acceso a tus hojas y a servicios
   externos para leer el CSV).
8. Abrir **Ver → Registros** (`Ctrl+Enter`) y revisar el resumen:
   - filas leídas, productos importados, filas ignoradas;
   - nombres de los primeros 5 productos;
   - advertencias por precios inválidos, si las hubo.

---

## Validar el resultado

1. Abrir la base operativa y la hoja **PRODUCTOS**.
2. Verificar que:
   - los `id_producto` van correlativos (`PROD-001`, `PROD-002`, …);
   - los nombres y `precio_venta` corresponden al catálogo antiguo;
   - los encabezados (fila 1) y los desplegables siguen intactos.
3. Comparar el total de productos con lo que muestra la web actual en `/tienda`
   (deberían coincidir, salvo filas sin precio que se ignoran a propósito).

---

## Después de importar (revisión manual obligatoria)

La importación deja varios campos con valores por defecto que **se deben revisar y
completar a mano** en la hoja PRODUCTOS:

- **categoria** — viene como `pendiente`; asignar la categoría real.
- **prioridad** — viene como `media`; ajustar (`alta` / `media` / `baja`).
- **unidad_medida** — viene como `unidad`; corregir si es `kg` / `litro` / `pack`.
- **stock_actual / stock_minimo** — vienen en `0`; cargar el stock real cuando aplique.
- **imagen_url** — vacío; completar si hay imagen.
- **precio_costo / margen_pct** — vacíos; se usarán al gestionar precios (FASE 3).

---

## Notas

- El script **no contiene URLs ni IDs reales**: trae marcadores `PEGAR_..._AQUI` y
  aborta con un mensaje claro si se ejecuta sin configurarlos.
- Es **re-ejecutable**: vuelve a limpiar los datos (fila 2 en adelante) y reescribe.
  Útil si la planilla antigua cambió o si la primera importación tuvo errores.
- **No usa credenciales ni secretos**: la autorización ocurre dentro de tu cuenta de
  Google al ejecutarlo.
- No modifica la web (`src/`) ni la lógica actual de lectura del catálogo.
