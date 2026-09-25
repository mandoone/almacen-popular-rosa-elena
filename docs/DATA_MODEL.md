# DATA_MODEL.md — Modelo de datos

> Estructura de datos del proyecto: estado actual y diseño objetivo de la Google
> Sheet operativa. Documento dueño de todo lo relativo a datos; otros `.md`
> referencian aquí.

---

## 1. Estado actual

- **Fuente operativa:** la base de datos nueva `BD_WEB_ALMACEN_ROSA_ELENA_MORALES`
  alimenta **tanto el catálogo como los pedidos**:
  - **Catálogo:** `src/app/api/productos/route.ts` obtiene los productos de la hoja
    PRODUCTOS (`activo = SI`) vía la acción `listarProductos` de la Web App de Apps
    Script; expone a la tienda `{ id, nombre, precio }` con `id = id_producto`
    (`PROD-001…`).
  - **Pedidos:** se crean/consultan vía la Web App (ver `docs/APPS_SCRIPT_PEDIDOS.md`),
    escribiendo en PEDIDOS, DETALLE_PEDIDOS, PRODUCTOS y MOVIMIENTOS_STOCK. La
    versión F9-A.2 usa además un diario `OPERACIONES_PEDIDOS` en TEST, ya
    preparado; la validación de estados de `PEDIDOS` requiere alineación.
- **Planilla antigua (retirada):** la Google Sheet publicada como CSV (hoja "WEB") se
  usó **solo como fuente de datos inicial** y **ya no alimenta** el catálogo ni la
  operación. La hoja PRODUCTOS de la base nueva se **cargó manualmente** con **53
  productos reales** y su `precio_venta`; CONFIG quedó con datos temporales de prueba
  (ver decisión D5 en `docs/DECISIONS.md`).
- El script `scripts/import-products-from-old-sheet.gs` (ver `docs/IMPORT_PRODUCTS.md`)
  queda como **herramienta auxiliar** reutilizable, pero **no fue necesario ejecutarlo**
  para esta primera carga.

---

## 2. Decisión: Google Sheet nueva, exclusiva para la web

La **base de datos operativa** del sistema web será una **Google Sheet nueva y
exclusiva**, creada para este proyecto. (Ver `docs/DECISIONS.md`.)

**No** se usará la planilla antigua de comandas como base principal, porque:

- pertenece a otra cuenta;
- tiene permisos externos;
- contiene formato histórico/manual;
- no está diseñada como backend operativo.

Esta nueva planilla queda documentada como **fuente oficial futura** para:
productos, pedidos, ventas, clientes, stock, compras, movimientos de stock y
configuración.

> ⚠️ **Pendiente operativo:** la nueva Google Sheet debe **crearse manualmente** y
> registrarse su acceso antes de implementar FASE 1. Ver `docs/TASKS.md`.

---

## 3. Hojas previstas en la Google Sheet operativa

Diseño objetivo (se refinará al implementar cada fase). Las columnas marcadas con
`*` son claves/identificadores.

### CONFIG
Parámetros globales del sistema (clave/valor).
| campo | descripción |
|-------|-------------|
| `clave`* | nombre del parámetro (p. ej. `margen_default`, `whatsapp`, `direccion`, `fechas_apertura`). |
| `valor` | valor del parámetro. |
| `nota` | comentario opcional. |

### PRODUCTOS
| campo | descripción |
|-------|-------------|
| `id`* | identificador del producto. |
| `nombre` | nombre visible. |
| `costo` | costo de compra. |
| `margen` | margen aplicado (si difiere del default de CONFIG). |
| `precio_venta` | precio calculado (ver §4). |
| `stock` | existencias actuales. |
| `activo` | si se muestra en la tienda. |
| `imagen` | slug/archivo de imagen (opcional). |

### CLIENTES
| campo | descripción |
|-------|-------------|
| `id`* | identificador del cliente. |
| `nombre` | nombre. |
| `telefono` | teléfono (WhatsApp). |
| `creado` | fecha de alta. |

### PEDIDOS
| campo | descripción |
|-------|-------------|
| `id`* | identificador del pedido. |
| `fecha` | fecha/hora de creación. |
| `cliente_id` | referencia a CLIENTES (o nombre/teléfono inline). |
| `nombre` | nombre del cliente. |
| `telefono` | teléfono del cliente. |
| `total` | total del pedido. |
| `estado` | `recibido` · `pendiente` · `listo` · `entregado` · `cancelado`. |

En TEST, `PEDIDOS.estado_pedido` debe tener una validación estricta para esos
cinco valores desde la fila 2 hasta el final de la columna operativa. La regla
heredada de cuatro estados sigue pendiente de migración. La validación de
transiciones permanece en el backend; el dropdown solo restringe valores.

### DETALLE_PEDIDOS
| campo | descripción |
|-------|-------------|
| `id`* | identificador de la línea. |
| `pedido_id` | referencia a PEDIDOS. |
| `producto_id` | referencia a PRODUCTOS. |
| `nombre` | nombre del producto (snapshot). |
| `cantidad` | cantidad pedida. |
| `precio` | precio unitario (snapshot). |
| `subtotal` | `cantidad × precio`. |

### VENTAS
| campo | descripción |
|-------|-------------|
| `id`* | identificador de la venta. |
| `fecha` | fecha/hora. |
| `pedido_id` | pedido asociado (si aplica). |
| `total` | total vendido. |
| `vendedor` | quién registró la venta. |

### DETALLE_VENTAS
| campo | descripción |
|-------|-------------|
| `id`* | identificador de la línea. |
| `venta_id` | referencia a VENTAS. |
| `producto_id` | referencia a PRODUCTOS. |
| `cantidad` | cantidad vendida. |
| `precio` | precio unitario. |
| `subtotal` | `cantidad × precio`. |

### COMPRAS
| campo | descripción |
|-------|-------------|
| `id`* | identificador de la compra. |
| `fecha` | fecha. |
| `proveedor` | proveedor. |
| `total` | total de la compra. |

### DETALLE_COMPRAS
| campo | descripción |
|-------|-------------|
| `id`* | identificador de la línea. |
| `compra_id` | referencia a COMPRAS. |
| `producto_id` | referencia a PRODUCTOS. |
| `cantidad` | cantidad comprada. |
| `costo` | costo unitario. |
| `subtotal` | `cantidad × costo`. |

### MOVIMIENTOS_STOCK
| campo | descripción |
|-------|-------------|
| `id`* | identificador del movimiento. |
| `fecha` | fecha/hora. |
| `producto_id` | referencia a PRODUCTOS. |
| `tipo` | `entrada` · `salida` · `reserva` · `devolucion` · `ajuste`. |
| `cantidad` | cantidad (positiva/negativa según tipo). |
| `origen` | referencia (pedido, venta, compra, ajuste manual). |
| `stock_anterior` | saldo observado antes del movimiento. |
| `stock_resultante` | saldo esperado después del movimiento. |
| `usuario` | actor validado que originó la acción. |
| `operacion_id` | vínculo aditivo al diario durable de confirmación/cancelación. |

### OPERACIONES_PEDIDOS (preparada en TEST)

Diario de intención y verificación para creación/confirmación/cancelación. No reemplaza
`MOVIMIENTOS_STOCK` ni constituye una transacción ACID.

| campo | descripción |
|-------|-------------|
| `operacion_id`* | identificador UUID con prefijo legible de la operación. |
| `idempotency_key`* | clave del intento; no puede reutilizarse con otro payload. |
| `tipo_operacion` | `CREAR_PEDIDO`, `CONFIRMAR` o `CANCELAR`. |
| `id_pedido` | pedido afectado. |
| `actor` | identidad obtenida de la sesión validada. |
| `estado_operacion` | `PREPARADA`, `APLICANDO`, `COMPLETADA` o `REQUIERE_REVISION`. |
| `paso` | último punto durable alcanzado. |
| `payload_hash` | hash canónico para detectar conflictos de idempotencia. |
| `snapshot_json` | plan mínimo: estados y saldos antes/después esperados. |
| `resultado_json` | respuesta estable de una operación completada. |
| `error_codigo` / `error_detalle` | diagnóstico acotado, sin secretos. |
| `creado_en` / `actualizado_en` | marcas temporales de auditoría. |

---

## 4. Reglas de negocio

### Precio de venta
- `precio_venta = costo × (1 + margen)`.
- `margen` por producto; si no hay, se usa `margen_default` de **CONFIG**.
- **Redondeo hacia arriba al múltiplo de $10** (CLP). Ej.: 1234 → 1240; 1240 → 1240.

### Stock
- El stock se descuenta/registra mediante **MOVIMIENTOS_STOCK** (fuente de verdad
  del inventario); `PRODUCTOS.stock` refleja el saldo.
- **Pedido recibido:** crear no modifica stock ni genera movimiento.
- **Confirmación:** `recibido → pendiente` descuenta stock y registra una salida
  verificable ligada a `operacion_id`.
- **Devolución:** cancelar desde `pendiente`/`listo` repone una vez; cancelar desde
  `recibido` no mueve stock.
- **Salida:** al concretar la venta/entrega, la reserva se convierte en `salida`.
- **Entrada:** las compras generan movimientos `entrada`.

> Las reglas de stock se implementan a partir de FASE 3; en FASE 1 solo se persisten
> pedidos. Se documentan aquí para mantener coherencia del modelo.

---

## 5. Notas de implementación

- Mecanismo de escritura: **Google Apps Script** (Web App `doPost`/`doGet`) que
  recibe los datos y los anexa a las hojas correspondientes. Ver `docs/DECISIONS.md`.
  Implementado en `scripts/apps-script-pedidos.gs` (guía en `docs/APPS_SCRIPT_PEDIDOS.md`):
  crea pedidos (PEDIDOS + DETALLE_PEDIDOS) sin tocar stock; al confirmar/cancelar,
  prepara `OPERACIONES_PEDIDOS`, aplica PRODUCTOS/MOVIMIENTOS_STOCK/PEDIDOS y
  verifica el resultado por readback. El backend lee las hojas **por nombre de
  encabezado**, robusto ante reordenamientos de columnas. El diario está en
  TEST; la validación de estados de Sheet requiere migración y retest F9-A.
- Los identificadores y relaciones (`*_id`) se mantienen simples (texto/numérico)
  por tratarse de una hoja de cálculo, no una base relacional.
- Snapshots de `nombre`/`precio` en los detalles para preservar el histórico aunque
  cambie el producto.
