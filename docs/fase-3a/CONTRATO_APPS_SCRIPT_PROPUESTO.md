# CONTRATO_APPS_SCRIPT_PROPUESTO.md — Backend propuesto (FASE 3A)

> ⚠️ **PROPUESTA. No ejecutada.** `scripts/apps-script-pedidos.gs` **no fue
> modificado** en esta sesión, y el Apps Script productivo tampoco.
> Requiere edición manual en el editor de Apps Script y un despliegue nuevo.
> Fuente: `levantamiento_operativo_fase_3a_consolidado.md`

---

## 0. Por qué esto no se implementó

El archivo `.gs` del repo **no es el código que corre**: es una copia que se pega a
mano en el editor de Apps Script. Modificarlo aquí no cambia producción, y
desplegarlo sin coordinar sí. Además, casi todos los cambios de abajo **dependen de
que existan primero las columnas nuevas** (`COLUMNAS_SHEETS_PROPUESTAS.md`);
desplegarlos antes haría fallar `col_()` con `Falta la columna "..."` y **tumbaría
la creación de pedidos en producción**.

Orden correcto: columnas → migración de datos → despliegue → panel.

---

## 1. Cambio 1 — `crearPedido_` deja de descontar stock

**Hoy** (`apps-script-pedidos.gs:183-236`): escribe la cabecera en `pendiente`,
escribe el detalle, **descuenta stock** y registra `salida` en MOVIMIENTOS_STOCK.

**Propuesto:**

| Aspecto | Hoy | Propuesto |
|---|---|---|
| `estado_pedido` inicial | `pendiente` | `recibido` |
| `estado_pago` inicial | `pendiente` | `pendiente_de_pago` |
| Descuento de stock | sí | **no** |
| Movimiento en MOVIMIENTOS_STOCK | `salida` | **ninguno** |
| `fecha_confirmacion` | — | vacía |

**Qué se conserva:** la validación de stock disponible al crear (línea 156-160)
**se mantiene** como chequeo informativo —evita aceptar pedidos imposibles— pero ya
no reserva nada. Dos personas pueden pedir el último kilo; se resuelve al
confirmar, que es justamente lo que §3.7 describe.

**Qué se agrega:** validar que la cantidad sea múltiplo de `paso_venta`
(hallazgo 8). Hoy solo se valida `permite_decimal`.

---

## 2. Cambio 2 — Nueva acción `cambiarEstadoPedido`

Reemplaza a `actualizarEstadoPedido_` y a `cancelarPedido_`, que hoy son dos
caminos independientes que se pisan (hallazgos 3 y 4).

### Petición

```json
{
  "action": "cambiarEstadoPedido",
  "token": "...",
  "id_pedido": "PED-20260729-101500",
  "estado_esperado": "recibido",
  "estado_nuevo": "pendiente",
  "responsable": "Carolina",
  "motivo_cancelacion": null,
  "observacion_interna": null
}
```

`estado_esperado` es **obligatorio**: es un bloqueo optimista. Si el estado real
leído dentro del lock no coincide, se rechaza con `409`. Así dos personas operando
el mismo pedido a la vez no se pisan.

### Algoritmo

```
1. lock = LockService.getScriptLock(); lock.waitLock(30000)
2. leer la fila del pedido DENTRO del lock
3. si estado_real !== estado_esperado  -> 409 "El pedido cambió de estado"
4. validar la transición contra la tabla (MODELO_ESTADOS_PEDIDOS.md §2)
   si no es válida -> 400
5. validaciones adicionales:
   - hacia 'cancelado'  -> motivo obligatorio; con 'otro', observación obligatoria
   - hacia 'entregado'  -> estado_pago === 'pagado' + metodo_pago + responsable
   - descuenta          -> stock suficiente en TODAS las líneas, o 409
6. aplicar impacto de stock:
   - 'descuenta' -> restar y registrar 'salida'/origen 'pedido'
                    escribir fecha_confirmacion y responsable_confirmacion
   - 'devuelve'  -> sumar y registrar 'devolucion'/origen 'cancelacion'
   - 'ninguno'   -> no tocar inventario
7. escribir estado_nuevo y los campos asociados
8. registrar en HISTORIAL_PEDIDOS
9. flush + releaseLock
```

**El paso 5 es todo o nada.** Si una sola línea no tiene stock, no se descuenta
ninguna y el pedido se queda en `recibido` (§3.7).

### Tabla de transiciones a portar

Idéntica a `src/lib/fase3a/estados.ts`, que está cubierta por la matriz 5×5 de
`tests/fase3a-estados.test.mjs`. Al portarla, **la matriz de tests es el criterio
de aceptación**: el `.gs` debe comportarse igual en los 25 pares.

| Desde | Hacia permitidos | Impacto |
|---|---|---|
| `recibido` | `pendiente`, `listo` | descuenta |
| `recibido` | `cancelado` | ninguno |
| `pendiente` | `listo` | ninguno |
| `pendiente` | `cancelado` | devuelve |
| `listo` | `pendiente`, `entregado` | ninguno |
| `listo` | `cancelado` | devuelve |
| `entregado` | — | — |
| `cancelado` | — | — |

---

## 3. Cambio 3 — Nueva acción `registrarPago`

```json
{
  "action": "registrarPago",
  "token": "...",
  "id_pedido": "PED-...",
  "estado_pago": "pagado",
  "metodo_pago": "efectivo",
  "responsable_pago": "Nadia",
  "observacion_interna": null
}
```

Validaciones (§4.3–§4.5):
- el pedido debe estar en `pendiente`, `listo` o `entregado`;
- con `estado_pago = pagado`: `metodo_pago` y `responsable_pago` obligatorios;
- `fecha_pago` se escribe automáticamente en el servidor, **nunca** se acepta del
  cliente;
- responsable `Otro` → exige observación y marca `requiere_revision = SI`;
- registrar en `HISTORIAL_PEDIDOS`.

---

## 4. Cambio 4 — Nueva acción `editarPedidoRecibido` (§3.6)

Solo si `estado_pedido === 'recibido'`. Permite cambiar cantidades y quitar
productos; **no** permite agregar productos nuevos en primera versión.
Recalcula el total desde `PRODUCTOS` (nunca confía en el total del cliente) y
registra la edición en el historial. No toca stock (todavía no hay descuento).

---

## 5. Cambio 5 — Nueva acción `corregirStock` (§5.6)

Solo administración. Motivo obligatorio (recuento físico, merma, error de carga,
compra, devolución, ajuste por cancelación, otro). Registra `ajuste` en
MOVIMIENTOS_STOCK con `stock_anterior` y `stock_resultante`.

> El control de “solo administración” no puede apoyarse en la sesión admin —es una
> contraseña compartida y no identifica a la persona. En primera versión el
> responsable se **declara** y queda auditado en el historial. Un control real
> exige usuarios individuales, que §9.2 deja explícitamente fuera de alcance.

---

## 6. Cambio 6 — `listarProductos` expone más campos

Para que la tienda pueda cumplir §5.1 y §5.2 (hallazgo 9), el catálogo debe
incluir `stock_actual`, `permite_decimal`, `paso_venta`, `unidad_medida` e
`imagen_url` — Apps Script **ya los devuelve**; quien los descarta es
`src/app/api/productos/route.ts`. Ese recorte se puede corregir **solo en Next.js**,
sin tocar Apps Script.

Sigue sin exponerse `precio_costo` ni `margen_pct`.

---

## 7. Compatibilidad hacia atrás

| Acción actual | Destino |
|---|---|
| `crearPedido` | se mantiene, cambia el comportamiento interno |
| `listarProductos` | se mantiene |
| `listarPedidos` | se mantiene, con las columnas nuevas |
| `obtenerPedido` | se mantiene, con las columnas nuevas |
| `actualizarEstadoPedido` | **conservar temporalmente** como alias que delega en `cambiarEstadoPedido` |
| `cancelarPedido` | **conservar temporalmente** como alias que delega con `estado_nuevo: 'cancelado'` |

Conservar los alias evita que el panel desplegado se rompa entre el despliegue del
`.gs` y el despliegue del frontend. Se eliminan después, en una limpieza aparte.

---

## 8. Riesgos del despliegue

1. **Sin columnas, todo falla.** `col_()` lanza si falta un encabezado, y ese error
   sube hasta `crearPedido_`: la tienda dejaría de tomar pedidos. Las columnas van
   primero, siempre.
2. **No hay entorno de prueba.** La misma planilla sirve a producción. Probar exige
   una copia de la hoja + un despliegue de Apps Script apuntando a esa copia.
3. **Ventana de despliegue.** Nunca un sábado de apertura ni con pedidos abiertos
   sin resolver.
4. **Pedidos en vuelo.** Los que estén en `pendiente`/`listo` al momento del cambio
   siguen el flujo antiguo; por eso importa marcarles `fecha_confirmacion`
   (`COLUMNAS_SHEETS_PROPUESTAS.md` §4).
5. **Rollback.** Apps Script guarda versiones de despliegue: dejar anotada la
   versión anterior antes de publicar la nueva.

---

## 9. Criterio de aceptación

El backend nuevo está correcto cuando reproduce, contra una copia de la planilla,
los 25 casos de la matriz de `tests/fase3a-estados.test.mjs` y los casos de
`TEST_PLAN` de FASE 3A. Concretamente, deben quedar cerrados:

- **hallazgo 3** — la secuencia cancelar → PATCH a pendiente → cancelar ya no
  devuelve stock dos veces (se rechaza en el paso 3 del algoritmo);
- **hallazgo 4** — no existe camino que marque `cancelado` sin devolver stock;
- **hallazgo 5** — cancelar un pedido `entregado` se rechaza.
