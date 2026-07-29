# COLUMNAS_SHEETS_PROPUESTAS.md — Cambios propuestos en Google Sheets

> ⚠️ **PROPUESTA. No ejecutada.** Ninguna hoja real fue modificada en esta sesión.
> Requiere ejecución manual y coordinada por Omar sobre
> `BD_WEB_ALMACEN_ROSA_ELENA_MORALES`.
> Fuente: `levantamiento_operativo_fase_3a_consolidado.md`

---

## 0. Antes de tocar nada

1. **Duplicar la planilla completa** (`Archivo → Hacer una copia`) y trabajar la
   migración sobre la copia primero.
2. Apps Script lee las hojas **por nombre de encabezado**, no por posición
   (`leerHoja_` → `col_`). Eso significa:
   - **agregar columnas al final es seguro** y no rompe el código actual;
   - **renombrar o borrar** una columna existente **sí** rompe (lanza
     `Falta la columna "..."`).
3. Por eso todo lo propuesto es **aditivo**. No se renombra ni se elimina nada.

---

## 1. Hoja `PEDIDOS` — columnas nuevas

Estado actual (`crearPedido_`): `id_pedido`, `fecha_hora`, `canal`, `id_cliente`,
`nombre_cliente`, `telefono`, `total`, `estado_pedido`, `estado_pago`,
`forma_pago`, `observaciones`, `vendedor_admin`, `fecha_entrega`.

| Columna nueva | Valores | Por qué | Ref. |
|---|---|---|---|
| `metodo_pago` | `efectivo` · `transferencia` · vacío | Separa el método del estado | §4.1 |
| `responsable_pago` | nombre de la lista autorizada u `Otro` | Rendición de quien recibe la plata | §4.7 |
| `fecha_pago` | `yyyy-MM-dd HH:mm:ss` | Registro automático al marcar pagado | §4.5 |
| `motivo_cancelacion` | uno de los 6 motivos | Motivo obligatorio al cancelar | §3.8 |
| `observacion_interna` | texto libre | Obligatoria con “Otro” | §3.9 |
| `fecha_confirmacion` | `yyyy-MM-dd HH:mm:ss` | Cuándo se descontó el stock | §3.4 |
| `responsable_confirmacion` | nombre | Quién confirmó | §2.3 (pendiente) |
| `requiere_revision` | `SI` · vacío | Marca de alerta administrativa | §7.3 |

### Cambios de valor en columnas existentes

| Columna | Cambio | Riesgo |
|---|---|---|
| `estado_pedido` | admite además `recibido`, y los pedidos web nacen así | **Alto** — ver §4 |
| `estado_pago` | pasa a `pendiente_de_pago` · `pagado` únicamente | **Alto** — ver §3 |
| `vendedor_admin` | queda **obsoleta**; la reemplaza `responsable_pago` | Bajo (nunca se escribió) |
| `forma_pago` | queda **obsoleta**; la reemplaza `metodo_pago` | Medio — hoy la escribe la tienda |

> `vendedor_admin` y `forma_pago` **no se borran**: se dejan en la hoja como
> histórico y se dejan de escribir. Borrarlas rompería `agregarFila_`.

---

## 2. Hoja `PRODUCTOS` — columnas nuevas

Estado actual: `id_producto`, `activo`, `nombre`, `categoria`, `prioridad`,
`unidad_medida`, `permite_decimal`, `paso_venta`, `precio_venta`, `stock_actual`,
`stock_minimo`, `imagen_url` (+ `precio_costo` y `margen_pct`, que el catálogo
público no expone).

| Columna nueva | Valores | Por qué | Ref. |
|---|---|---|---|
| `estado_producto` | `activo` · `inactivo` · `borrador` | Hoy `activo` es binario; falta “borrador” para precio dudoso | §5.4 |
| `requiere_revision_precio` | `SI` · vacío | Cambió el costo y el precio público no se revisó | §5.9 |
| `solo_venta_presencial` | `SI` · vacío | Producto registrado pero no vendible online | §2.9 (**pendiente**) |

> `activo` se mantiene por compatibilidad. Mientras dure la transición,
> `activo = SI` debe equivaler a `estado_producto = activo`.

### Nota sobre `paso_venta`

La columna **ya existe** y Apps Script la lee, pero **no la valida** al crear el
pedido (hallazgo 8). No hace falta columna nueva: hace falta usarla. Para granel
por kilo debe valer `0.25`.

---

## 3. Migración de `estado_pago` (riesgo alto)

Valores que hoy conviven en la hoja: `pendiente`, `pagado_efectivo`,
`pagado_transferencia`, `anulado`, y potencialmente texto libre —Apps Script
escribe lo que reciba sin validar.

**Orden obligatorio** (invertirlo corrompe datos):

1. Crear la columna `metodo_pago` **vacía**.
2. Recorrer los pedidos existentes y, por cada uno, aplicar la tabla de
   `MODELO_STOCK_PAGOS.md` §2.5:
   - `pagado_efectivo` → `estado_pago = pagado`, `metodo_pago = efectivo`
   - `pagado_transferencia` → `estado_pago = pagado`, `metodo_pago = transferencia`
   - `pendiente` / vacío → `estado_pago = pendiente_de_pago`
   - `anulado` y cualquier otro → `requiere_revision = SI`, **revisar a mano**
3. Recién entonces cambiar el desplegable del panel admin.

La función `migrarEstadoPagoHeredado()` de `src/lib/fase3a/pagos.ts` implementa
exactamente esta tabla y está cubierta por tests. Puede usarse como referencia para
escribir el script de migración, o portarse a Apps Script.

⚠️ **No cambiar el desplegable del panel antes del paso 2.** Si la UI empieza a
enviar `pagado` sin que exista `metodo_pago`, se pierde la información de cómo pagó
cada persona, y esa información no se puede reconstruir.

---

## 4. Migración de `estado_pedido` a `recibido` (riesgo alto)

El problema: hoy **todo pedido ya descontó stock al crearse**. Si mañana los
pedidos nuevos nacen `recibido` sin descontar, la hoja tendrá dos poblaciones
mezcladas y `estado_pedido` no basta para distinguirlas.

**Propuesta:** usar `fecha_confirmacion` como marcador de la migración.

1. Antes del cambio, marcar **todos** los pedidos existentes con
   `fecha_confirmacion = <fecha de la migración>`. Significa “este pedido ya
   descontó stock bajo el modelo antiguo”.
2. Desde el cambio, `crearPedido_` deja de descontar y nace `recibido` con
   `fecha_confirmacion` vacía.
3. Regla invariante que queda: **un pedido tiene stock descontado si y solo si
   `fecha_confirmacion` no está vacía.**
4. Los pedidos antiguos en `pendiente`/`listo` siguen su curso normal; al
   cancelarlos, devuelven stock (correcto: sí lo habían descontado).

Sin el paso 1, cancelar un pedido antiguo bajo la lógica nueva podría no devolver
stock que sí se había descontado.

---

## 5. Hoja nueva `HISTORIAL_PEDIDOS` (§3.10)

`MOVIMIENTOS_STOCK` registra inventario, pero no cambios de estado ni de pago.

| Columna | Descripción |
|---|---|
| `id_historial`* | `HIST-yyyyMMdd-HHmmss` |
| `fecha_hora` | marca de tiempo |
| `id_pedido` | pedido afectado |
| `accion` | ver lista abajo |
| `valor_anterior` | estado/valor previo |
| `valor_nuevo` | estado/valor nuevo |
| `responsable` | quién ejecutó |
| `observacion` | texto libre |

Acciones críticas a registrar (§3.10): `creacion`, `edicion_cantidades`,
`confirmacion`, `cambio_listo`, `cambio_entregado`, `cancelacion`,
`registro_pago`, `cambio_metodo_pago`, `correccion_stock`.

---

## 6. Hoja nueva `APERTURAS` (§9.1)

Bloqueada por las respuestas de Carolina/Nadia (horario y cierre de pedidos), pero
la estructura se puede dejar lista.

| Columna | Descripción |
|---|---|
| `id_apertura`* | `APE-yyyyMMdd` |
| `fecha` | fecha de apertura |
| `hora_inicio` | **pendiente** §2.1 |
| `hora_fin` | **pendiente** §2.1 |
| `cierre_pedidos_online` | **pendiente** §2.2 |
| `activa` | `SI` · `NO` |
| `observaciones` | texto libre |

Fechas ya informadas: 18 de julio, 1 de agosto, 15 de agosto, 5 de septiembre,
19 de septiembre (a evaluar). **Los horarios están pendientes y no se inventan.**

---

## 7. Orden de ejecución recomendado

| # | Paso | Riesgo | Bloqueado por |
|---|---|---|---|
| 1 | Duplicar la planilla | — | — |
| 2 | Agregar columnas nuevas a `PEDIDOS` (vacías) | Bajo | — |
| 3 | Agregar columnas nuevas a `PRODUCTOS` (vacías) | Bajo | — |
| 4 | Crear `HISTORIAL_PEDIDOS` | Bajo | — |
| 5 | Migrar `estado_pago` + poblar `metodo_pago` | **Alto** | paso 2 |
| 6 | Marcar `fecha_confirmacion` en pedidos antiguos | **Alto** | paso 2 |
| 7 | Desplegar Apps Script nuevo | **Alto** | pasos 5 y 6 |
| 8 | Conectar el panel admin | Medio | paso 7 |
| 9 | Crear `APERTURAS` | Bajo | respuestas §2.1 y §2.2 |

Los pasos 2–4 son aditivos y **no rompen nada**: pueden hacerse cuando se quiera.
Del 5 en adelante conviene hacerlo fuera de un sábado de apertura.
