# Familias de producto — Fase A — 2026-10-07

Rama exclusiva: `feature/fase-3a-operativa`. HEAD de partida verificado: `e1138bcdf49bb4d653726227b832cc71e1f9b717`. Alcance ejecutado únicamente local: código, documentación, fixtures y QA. No se accedió a servicios remotos para probar el contrato.

## 1. Arquitectura implementada

Familia pública → uno o varios SKU físicos equivalentes. PRODUCTOS mantiene inventario, costo e identidad física. La familia tiene nombre y precio comercial futuro, sin stock, costo ni proveedor. Proveedor pertenece a cada compra. No hay SKU virtual ni lotes.

`src/lib/familiasProducto.ts` implementa tipos, validación, auditoría y agregación pura. No importa servicios, transportes ni variables de entorno. Apps Script contiene una copia generada de ese dominio: `scripts/generar-contrato-familias-gs.mjs --check` comprueba que no diverge; `--write` solo modifica el archivo local.

Hay dos helpers internos GAS de lectura TEST, sin acción HTTP: `leerFamiliasProductoFaseA_` y `leerVistaFamiliasFaseA_`. Reciben un spreadsheet/contexto explícitos, no crean hojas/columnas ni escriben. Su ausencia no impide la operación V1. Ninguna acción existente invoca el dominio familiar.

## 2. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/lib/familiasProducto.ts` | Nuevo dominio puro y contratos. |
| `src/lib/appsScriptPedidos.ts` | Extensión de tipos con cinco campos SKU opcionales; sin cambio de ejecución. |
| `scripts/apps-script-pedidos.gs` | Nombre de hoja, dominio generado, columnas y helpers de lectura interna. |
| `scripts/setup-google-sheet.gs` | Encabezados aditivos para una futura base nueva; no ejecutado. |
| `scripts/generar-contrato-familias-gs.mjs` | Generación/verificación local del bloque GAS. |
| `tests/fixtures/familias-producto.mjs` | Fixtures inventados exclusivamente locales. |
| `tests/familias-producto-fase-a.test.mjs` | Validación en ambos motores, lectura mock y regresión V1. |
| `docs/DATA_MODEL.md` | Contrato dueño de familia/SKU, equivalencias y diagnóstico. |
| `docs/INGESTA_DATOS_F10.md` | Convivencia y correspondencia física; proveedor por compra. |
| `docs/DECISIONS.md` | D43, arquitectura aprobada y alcance local. |
| `docs/PROJECT_STATE.md` | Fase A paralela; sin cambios de estados F10. |
| `docs/TASKS.md` | Fase A hecha y siguiente trabajo separado. |
| `docs/TEST_PLAN.md` | QA focal local y límites. |
| `docs/CHANGELOG.md` | Hito local. |
| `docs/GOOGLE_SHEET_SETUP.md` | Definición futura de 12 hojas y advertencia de no ejecutar/migrar. |
| Este informe | Entrega, continuidad y resultados. |

## 3. Contrato FAMILIAS_PRODUCTO

18 columnas: familia_id, activo, nombre_publico, categoria, precio_venta, modo_venta, unidad_venta, permite_decimal, paso_venta, gramos_referencia, contenido_cantidad, contenido_unidad, presentacion_publica, politica_marca, marca_publica, imagen_url, version_oferta, actualizado_en.

ID FAM único; activo SI/NO; precio CLP entero seguro no negativo y positivo para vendibilidad; version_oferta entero seguro positivo. UNIDAD/GRANEL y políticas de marca explícitas. Ningún campo stock_actual/precio_costo/proveedor se admite en la familia. Las celdas de referencia/contenido no aplicables pueden quedar vacías. Actualizado_en es evidencia textual opcional, con normalización de Date solo al leer.

Detalle de obligatoriedad y validaciones: [DATA_MODEL](../DATA_MODEL.md#contrato-paralelo-de-familias--fase-a-2026-10-07-d43). No se ha creado esta hoja en ninguna base real.

## 4. Campos físicos SKU

Identidad opcional: familia_id, marca, presentacion, contenido_cantidad, contenido_unidad. Los SKU sin familia no requieren campos nuevos. ProductoCatalogo/ProductoAdmin pueden describirlos mediante herencia de tipos, pero las lecturas públicas y los DTOs de escritura operativos no cambian.

Marca no se obtiene del nombre. Un SKU referencia como máximo una familia. La auditoría detecta IDs repetidos y referencias inexistentes. Stock_actual y precio_costo mantienen su significado por SKU.

## 5. Equivalencia

Relación explícita, misma categoría compatible y modo. Envasados requieren presentación física legible, contenido numérico/unidad idénticos, unidad de venta y reglas de cantidad compatibles. 750 ml no equivale a 1000 ml; 1 L se expresa estructuralmente como 1000 ml, sin deducirlo del texto.

La etiqueta legible puede diferir entre familia y SKU sin alterar contenido. La equivalencia no se infiere por nombres similares. Una asociación aprobada sigue siendo necesaria: compartir contenido no hace intercambiables por sí solos dos artículos distintos.

## 6. Política de marca

- VARIABLE: sin marca pública; cada SKU relacionado acredita su marca física. Permite A/B equivalentes.
- EXPLICITA: marca pública obligatoria; cada SKU relacionado debe coincidir. Comparación textual normalizada no equipara marcas diferentes.
- NO_APLICA: no exige marca física ni publica una marca; útil para el contrato conceptual de granel sin marca.

Clorinda tiene familia independiente. Su SKU no aporta al Económico porque no tiene esa asociación. Una familia explícita rechaza SKU de otra marca.

## 7. Agregación de disponibilidad

Resultado interno: familia_id, precio_venta familiar, cantidad_agregada, unidad_disponibilidad, disponible, sku_elegibles e inconsistencias.

Solo aporta un SKU relacionado, activo, equivalente, con stock numérico válido y disponible en contexto. REGULAR conserva la regla actual. POR_APERTURA requiere apertura válida y habilitación explícita en ese contexto. Inactivos/no habilitados no suman. Cero es un saldo válido, no vendible por sí solo.

Duplicados se excluyen para no inflar saldos. Stock textual, negativo, no finito, fracciones indebidas y desbordes generan inconsistencias. La cantidad diagnóstica puede conservar el subtotal correcto de otros SKU, pero cualquier inconsistencia impide declarar disponible esa vista. La auditoría global inválida también cierra la vendibilidad de la lectura paralela.

No se persiste la agregación ni se utiliza para reservar, descontar o cambiar stock.

## 8. GRANEL

Contrato conceptual compatible con D40: entrada g enteros libres, referencia positiva de precio y bases físicas nativas 100/250/1000 g. kg exige base 1000. Se convierte cada saldo a gramos enteros antes de sumar.

Fixture: 4 de base 250 g + 2 de base 1000 g = 3000 g. Nunca 6 unidades. Referencias legadas/pasos nativos distintos no restringen gramos libres de la familia. Medio gramo y base incompatible se rechazan.

No se cambió `src/lib/granel.ts`, ninguna operación granel ni los 18 maestros reales. No hay cálculo de pedidos familiares, repartos, precios de entregas ni migración granel.

## 9. Compatibilidad SKU_V1

Catálogo/carrito/pedido/venta/compra/movimiento continúan usando producto_id. Precio_venta del SKU permanece como fuente V1; precio futuro de familia se consulta solo en diagnóstico. Sin sincronización ni fórmula desde costos.

Se compararon mediante AST las funciones GAS con el HEAD inicial: **185/185 funciones existentes idénticas**, incluidos doGet, doPost, listarProductos, creación, confirmación/cancelación, ventas, compras, ajustes y reportes. El cambio de src/lib/appsScriptPedidos.ts es únicamente de tipos; su JavaScript compilado se comparó y es exactamente igual al baseline V1.

Rutas API, tienda, componentes operativos, módulos fase4/fase7/fase8/fase9, snapshots, configuración F10 y granel no tuvieron cambios. El fixture de regresión agrega identidad familiar incluso con una referencia inexistente y comprueba:

- Catálogo V1 idéntico antes/después de los campos nuevos.
- Crear pedido conserva saldos 5.6 y 10; total $600 desde precios V1.
- Confirmar descuenta solo los SKU originales: 5.5 y 9.
- Cancelar devuelve exactamente 5.6 y 10.

Los tests existentes de venta presencial/compras/stock pasan con sus mismos contratos. No se ejecutaron estas operaciones en datos reales.

## 10. Fixtures usados

| Fixture sintético | Resultado |
|---|---|
| Cloro Económico 1 L: A stock 4/costo 590; B stock 7/costo 610 | 11 unidades; precio familiar $650 aunque los precios legados SKU difieran. |
| Cloro Clorinda 1 L, marca explícita, stock 9 | Familia independiente; no suma a Económico. |
| Shampoo 750 ml: A 2 + B 3; C 1 L stock 100 | Solo A/B aportan 5; C genera inconsistencia y la vista no se anuncia vendible. |
| SKU inactivo, stock 50 | Aporta cero. |
| SKU POR_APERTURA, stock 30 | Aporta cero sin apertura/habilitación; aporta 30 con contexto autorizado. |
| SKU legado sin familia/campos nuevos | Auditoría familiar válida; contrato V1 permitido. |
| Arroz conceptual, bases 250/1000 | 3000 g; 1 g exacto y medio gramo rechazado. |

## 11. QA

| Comprobación local | Resultado |
|---|---|
| Tests focales nuevos | 59/59 PASS, TypeScript + GAS en VM + lector mock + regresión V1. |
| Suite completa `npm test` | 529/529 PASS, sin fallos/omitidos. |
| `npm run lint` | PASS. |
| `npx tsc --noEmit --incremental false` | PASS. |
| `npm run build` | PASS; 24 páginas estáticas generadas. |
| Generador `--check` | PASS; mismo dominio en ambos motores. |
| Comparación funciones V1 contra HEAD inicial | 185 idénticas. |
| Transporte TypeScript compilado contra HEAD inicial | JavaScript exactamente idéntico. |
| `npm run scan:secrets` | PASS; sin hallazgos ni valores impresos. |
| `git diff --check` | PASS. |

Build ejecutado localmente con entorno TEST y destinos/tokens operativos vacíos para impedir acceso a backends. Next mostró un aviso no bloqueante por NEXT_TEST_WASM ignorado en win32/x64; compilación, tipos y generación completaron con código 0. No se desplegó el build.

## 12. Qué no se implementó ni ejecutó

Sin ASIGNACIONES_PEDIDO, detalle/pedido/carrito V2, confirmación/cancelación familiar, catálogo público agregado, venta presencial consciente de familias, reportes familiares ni lotes. Sin migración de productos/IDs, conteo, costos reales, fotos o cuentas.

No se creó una hoja real ni se ejecutó setup, Apps Script, migradores o E2E remotos. Google Sheets productivas y TEST intactas; Production y main intactos. Apps Script solo cambió en Git, sin deploy. F10 mantiene 1 READY/19 PENDING; la incorporación de contrato técnico no promueve gates.

## 13. Próximo paso recomendado

Fase B en otra tarea: identidad física administrable y snapshots de marca/presentación/contenido/base en compras por SKU, con auditoría y mocks locales. Preparar luego una correspondencia familia→SKU aprobada y un plan de migración TEST con backup/readback, sin aplicar datos reales por implicación.

Asignación durable y cancelación deben implementarse y verificarse antes de activar catálogo/pedidos públicos por familia. Las decisiones operativas de mezcla de marcas y eventual reasignación siguen fuera de Fase A.
