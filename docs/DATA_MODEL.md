# DATA_MODEL.md — Modelo de datos

> Estructura de datos del proyecto: estado actual y diseño objetivo de la Google
> Sheet operativa. Documento dueño de todo lo relativo a datos; otros `.md`
> referencian aquí.

---

## 1. Estado actual

- **Fuente única hoy:** una Google Sheet **publicada como CSV** (hoja "WEB"),
  consumida en modo **solo lectura** por `src/app/api/productos/route.ts`.
- El route handler descarga el CSV, busca la fila de encabezado "ARTÍCULO" y extrae
  `nombre` (columna 1) y `precio` (columna 2); descarta filas sin precio y corta en
  "TOTAL".
- Devuelve al frontend: `{ id, nombre, precio }[]`.
- **Limitaciones:** solo lectura, parser frágil ante cambios de formato/encoding,
  hoja pública, sin pedidos, sin stock, sin clientes.
- **Migración inicial (realizada):** esta planilla antigua se usó **solo como fuente
  de datos inicial**. La hoja PRODUCTOS de la base operativa nueva ya fue **cargada
  manualmente** con **53 productos reales** y su `precio_venta` del listado antiguo;
  CONFIG quedó con datos temporales de prueba. La planilla antigua **ya no se usa**
  como base operativa (ver decisión D5 en `docs/DECISIONS.md`).
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
| `estado` | `pendiente` · `listo` · `entregado` · `cancelado`. |

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

---

## 4. Reglas de negocio

### Precio de venta
- `precio_venta = costo × (1 + margen)`.
- `margen` por producto; si no hay, se usa `margen_default` de **CONFIG**.
- **Redondeo hacia arriba al múltiplo de $10** (CLP). Ej.: 1234 → 1240; 1240 → 1240.

### Stock
- El stock se descuenta/registra mediante **MOVIMIENTOS_STOCK** (fuente de verdad
  del inventario); `PRODUCTOS.stock` refleja el saldo.
- **Reserva:** al crear un pedido, se genera un movimiento `reserva` que compromete
  stock sin venderlo.
- **Devolución:** al cancelar un pedido reservado, se genera un movimiento
  `devolucion` que libera el stock.
- **Salida:** al concretar la venta/entrega, la reserva se convierte en `salida`.
- **Entrada:** las compras generan movimientos `entrada`.

> Las reglas de stock se implementan a partir de FASE 3; en FASE 1 solo se persisten
> pedidos. Se documentan aquí para mantener coherencia del modelo.

---

## 5. Notas de implementación

- Mecanismo de escritura: **Google Apps Script** (Web App `doPost`/`doGet`) que
  recibe los datos y los anexa a las hojas correspondientes. Ver `docs/DECISIONS.md`.
  Implementado en `scripts/apps-script-pedidos.gs` (guía en `docs/APPS_SCRIPT_PEDIDOS.md`):
  crea pedidos (PEDIDOS + DETALLE_PEDIDOS), descuenta/devuelve stock en PRODUCTOS y
  registra cada cambio en MOVIMIENTOS_STOCK (`salida`/origen `pedido` al crear,
  `devolucion`/origen `cancelacion` al cancelar). El backend lee las hojas **por
  nombre de encabezado**, robusto ante reordenamientos de columnas. *(Pendiente de
  despliegue/prueba.)*
- Los identificadores y relaciones (`*_id`) se mantienen simples (texto/numérico)
  por tratarse de una hoja de cálculo, no una base relacional.
- Snapshots de `nombre`/`precio` en los detalles para preservar el histórico aunque
  cambie el producto.
