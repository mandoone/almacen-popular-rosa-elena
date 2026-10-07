# Identidad física de SKU y snapshots de compra — Fase B1 — 2026-10-07

Rama exclusiva: `feature/fase-3a-operativa`. HEAD inicial: `6961eb109c19e39bf5690cf934914777d51405d3`. Implementación y pruebas únicamente locales; no se consultaron ni modificaron Sheets reales.

## 1. Arquitectura implementada

PRODUCTOS sigue siendo el maestro físico y cada compra sigue seleccionando producto_id PROD-*. Contratos internos admiten familia_id, marca, presentacion, contenido_cantidad y contenido_unidad opcionales. Validador puro compartido TypeScript/GAS, sin inferencia desde nombre. Reglas/obligatoriedad: [DATA_MODEL](../DATA_MODEL.md#identidad-física-y-snapshots-de-compra--fase-b1-local-2026-10-07-d44).

La marca no se escribe manualmente por compra: hacerlo duplicaría información y permitiría atribuir una identidad falsa al SKU. DTO y normalización de compra conservan solamente producto_id/cantidad/costo_unitario por línea. Los seis snapshots, incluso si llegan en un body hostil, se descartan del input y del hash. Campos de identidad se admiten únicamente en el contrato de administración de PRODUCTOS.

## 2. Persistencia de snapshots

Dentro del lock, persistirCompraIdempotente_ comprueba primero key/hash. Una compra nueva obtiene identidad del maestro, la valida, comprueba columnas destino y congela cinco snapshots físicos más gramos_unidad_stock_snapshot para GRANEL. Esos valores acompañan la misma fila DETALLE_COMPRAS; no hay hojas, movimientos ni escrituras adicionales por snapshot.

Proveedor permanece en COMPRAS. Cada detalle conserva costo_unitario; PRODUCTOS.precio_costo vigente e HISTORIAL_COSTOS evolucionan por SKU como antes. Ninguna función de compra lee/escribe FAMILIAS_PRODUCTO ni recalcula precio público. Familia no recibe costo, proveedor ni stock.

La base nativa de granel explica la cantidad comprada y el costo histórico por esa base. No incorpora lotes, FIFO ni conversiones de venta nuevas; D40 permanece intacto.

## 3. Compatibilidad y límites de esquema

Los campos son opcionales para legado. Históricos sin snapshots siguen legibles; respuestas antiguas pueden omitirlos. En un contrato nuevo, SKU sin identidad deja cinco snapshots vacíos; UNIDAD también deja vacía la base de granel. GRANEL registra la base si existe su columna destino; esquema V1 sin esa columna sigue aceptando la compra nativa.

Una identidad física documentada exige columnas para congelar sus cinco snapshots (más base si es GRANEL) antes de mutar stock/costo. Encabezados opcionales duplicados se rechazan. Crear/editar identidad requiere las columnas utilizadas; no se crean y no se ignoran silenciosamente. Esto permite seguir usando flujos actuales sin columnas nuevas, mientras una futura activación debe coordinar esquema/backend/UI.

Setup futuro conserva columnas históricas y agrega las seis nuevas a DETALLE_COMPRAS. Los cinco campos PRODUCTOS ya estaban en setup desde Fase A. No se ejecutó setup ni preparación de esquema. El setup conserva su contrato histórico de base inicial; una futura preparación F7/F8 agrega su contrato operativo, también sin renombrar ni borrar columnas.

## 4. Fixtures y ejemplo A/B

Todos los IDs/nombres usados son sintéticos locales, sin altas comerciales reales. Se reutilizan fixtures Fase A y se prepara un escenario de hojas, propiedades y lock en memoria.

| Dato | Marca A | Marca B |
|---|---|---|
| SKU | PROD-QA-CLORO-A | PROD-QA-CLORO-B |
| Familia snapshot | FAM-CLORO-1L-ECO | FAM-CLORO-1L-ECO |
| Marca snapshot | Marca A | Marca B |
| Presentación snapshot | Botella de 1 L | Botella de 1 L |
| Contenido snapshot | 1000 / ml | 1000 / ml |
| Base granel snapshot | vacío | vacío |
| Cantidad comprada | 12 | 10 |
| Costo unitario | 590 | 610 |
| Stock antes → después | 4 → 16 | 7 → 17 |
| Costo antes → después | 500 → 590 | 510 → 610 |

Proveedor cabecera: La Oferta QA. Total: $13.180. Precio familiar permanece $650; precios V1 SKU permanecen $700. Cambiar la presentación física a «Envase físico A» congela esa etiqueta, sin copiar la presentación pública de familia. Otro fixture compra el mismo SKU a un segundo proveedor, conservando marcas separadas.

## 5. Idempotencia y rollback

Hash conserva el input normalizado V1, sin incluir identidad derivada. Mismo input/key devuelve cabecera y detalle persistidos sin stock/costo/movimientos nuevos. Cambiar proveedor o costo con la misma key produce conflicto. Tras modificar nombre/marca/presentación/familia del maestro (incluso a un valor inválido), replay y obtenerCompra mantienen el detalle original: no recalculan snapshots.

Se inyectaron fallos en DETALLE_COMPRAS, MOVIMIENTOS_STOCK, HISTORIAL_COSTOS (primera y segunda línea), COMPRAS y flush después de escribir todo. Cada caso restaura stock y costo, elimina filas nuevas de las cuatro hojas, preserva las compras previas y libera lock. Retry produce una compra y dos detalles/movimientos/historiales, con las marcas originales.

No se cambia el mecanismo previo de compensación ni se promete recuperación nueva ante una interrupción abrupta o un fallo del propio rollback. Sheets sigue sin transacción ACID. Snapshots no introducen efectos separados que requieran una reversión nueva.

## 6. Archivos modificados

| Archivo | Cambio |
|---|---|
| src/lib/familiasProducto.ts | Validador puro de identidad física opcional. |
| src/lib/fase8/productosAdmin.ts | Tipos internos y validación de identidad. |
| src/lib/fase9/dtoAdmin.ts | Whitelist de identidad solo para administración de SKU. |
| src/lib/fase7/compras.ts | Rechazo explícito de ID familiar/no físico en dominio de compra. |
| src/lib/appsScriptPedidos.ts | Seis snapshots opcionales de respuesta; sin cambio de runtime. |
| scripts/apps-script-pedidos.gs | Contratos aditivos, helpers de identidad/esquema y snapshots en persistencia; copia del dominio regenerada localmente. |
| scripts/setup-google-sheet.gs | Seis encabezados snapshot para base futura; no ejecutado. |
| tests/helpers/compra-identidad-escenario.mjs | Hojas/lock/propiedades en memoria y fallos sintéticos. |
| tests/familias-producto-fase-b1.test.mjs | 38 pruebas focales. |
| docs/DATA_MODEL.md | Contrato dueño B1 e histórica convivencia A/B1. |
| docs/DECISIONS.md | D44. |
| docs/PROJECT_STATE.md | Estado local B1 y F10 intacto. |
| docs/TEST_PLAN.md | Casos locales y comparación de continuidad. |
| docs/TASKS.md | B1 hecha; siguiente activación separada y pendiente. |
| docs/CHANGELOG.md | Hito local. |
| Este informe | Entrega y continuidad. |

## 7. QA y evidencia de continuidad

| Comprobación | Resultado |
|---|---|
| Focal B1 | 38/38 PASS. |
| Suite completa | 567/567 PASS; 529 previas y 38 B1, sin fallos/omitidos. |
| Lint | PASS. |
| Typecheck | PASS, sin emisión ni incremental. |
| Build | PASS; 24 páginas estáticas generadas, código 0. |
| Scan de secretos | PASS; 312 archivos, sin hallazgos ni valores impresos. |
| Generador --check | PASS; dominio TS/GAS idéntico. |
| git diff --check | PASS. |
| AST GAS contra HEAD inicial | 181 funciones existentes idénticas; solo seis cambiaron dentro del alcance. |
| Transporte TypeScript compilado | JavaScript idéntico al HEAD inicial; cambios solo de tipos. |
| UI/rutas/pedido/confirmación/cancelación/venta/granel/config | Sin diff. |

Funciones existentes modificadas: normalizarCompra_, persistirCompraIdempotente_, listarProductosAdmin_, actualizarProductoAdmin_, crearProductoAdmin_ y normalizarCambioProductoAdmin_. doGet/doPost, precios y cálculos granel, ventas, pedidos, movimientos y reportes mantienen su código. Tests V1 permanecen sin modificaciones.

Build local con entorno TEST y destinos/tokens operativos vacíos; no se desplegó. Next mostró un aviso no bloqueante de NEXT_TEST_WASM ignorado en win32/x64; compilación, tipos y generación completaron con código 0. No se hicieron E2E remotos ni pruebas contra datos reales.

## 8. Qué no se activó y próximo paso

Sin UI de identidad ni campos manuales de marca/presentación en compras. Sin familias en catálogo público, carrito/pedido V2, asignaciones de SKU, cambios de confirmación/cancelación/venta, lotes/FIFO, migración de productos o creación de IDs comerciales reales. No se crearon hojas ni columnas reales, no se desplegó Apps Script y no se cambió precio/costo/stock real. F10 conserva 1 READY/19 PENDING.

Próximo paso recomendado: preparar una tarea específica de contrato/migración TEST coordinada, con backup/readback y correspondencia física revisada. Activar edición solo cuando Sheet/backend estén alineados y validados. La implementación B1 no autoriza esa ejecución. Antes de catálogo/pedidos familiares siguen pendientes asignaciones durables y cancelación compatibles.

main, Production, Sheet TEST y demás Google Sheets reales intactas; Apps Script solo versionado en Git, sin deploy.
