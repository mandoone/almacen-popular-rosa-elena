# PLAN_IMPLEMENTACION_FASE_3A.md — Orden de ejecución

> Plan por etapas, ordenado por riesgo. Cada etapa deja el sistema funcionando.
> Fuente: `levantamiento_operativo_fase_3a_consolidado.md` §9 (alcance).

---

## Principio del plan

**El trabajo se ordena por riesgo, no por comodidad.** Todo lo que no toca datos
reales va primero; todo lo que puede descuadrar el inventario va al final, junto y
coordinado. La razón está en el hallazgo 1 del diagnóstico: cambiar cuándo se
descuenta el stock no admite medias tintas.

```
ETAPA 0  Modelo puro y tests            ✅ HECHO   riesgo nulo
ETAPA 1  Mejoras sin tocar el backend   🔄 PARCIAL riesgo bajo
ETAPA 2  Columnas nuevas en Sheets      ⬜         riesgo bajo (aditivo)
ETAPA 3  Migración de datos             ⬜         riesgo ALTO
ETAPA 4  Apps Script nuevo              ⬜         riesgo ALTO
ETAPA 5  Panel admin Fase 3A             🔄 PARCIAL riesgo medio
ETAPA 6  Aperturas y horarios           ⬜         bloqueado por P1/P2
```

---

## ETAPA 0 — Modelo operativo como código puro ✅ HECHO

**Riesgo: nulo.** Nada está conectado; no cambia ningún comportamiento.

| Entregable | Archivo |
|---|---|
| Estados y transiciones | `src/lib/fase3a/estados.ts` |
| Pago separado + migración | `src/lib/fase3a/pagos.ts` |
| Responsables y alerta “Otro” | `src/lib/fase3a/responsables.ts` |
| Motivos de cancelación | `src/lib/fase3a/cancelacion.ts` |
| Producto, granel, imágenes | `src/lib/fase3a/productos.ts` |
| Alertas del panel | `src/lib/fase3a/alertas.ts` |
| 46 pruebas | `tests/*.test.mjs` |

Última validación registrada: **46/46 tests**, lint sin advertencias y build
correcto, usando `npm.cmd` en Windows.

---

## ETAPA 1 — Mejoras que no tocan el backend ⬜

**Riesgo: bajo.** Solo Next.js. No cambia Sheets ni Apps Script.

### 1.1 Ampliar `/api/productos` (hallazgo 9)
`src/app/api/productos/route.ts` recorta el producto a `{id, nombre, precio}` y
descarta datos que Apps Script **ya devuelve**. Agregar `stock_actual`,
`stock_minimo`, `permite_decimal`, `paso_venta`, `unidad_medida` e `imagen_url`.

Sin esto, la tienda no puede cumplir §5.1 ni §5.2. **Es el mayor desbloqueo por el
menor riesgo de todo el plan.**

### 1.2 “Agotado” en la tienda (§5.2)
Con los datos del punto anterior: mostrar el producto, marcarlo agotado y no
permitir agregarlo. Usa `estaAgotado()`.

### 1.3 Paso de 0,25 kg en el carrito (§5.1)
Aplicar `validarCantidad()` en la tienda para que los incrementos de granel sean
correctos **antes** de enviar el pedido, en vez de fallar con un 409 al final.

### 1.4 Filtros y buscador del panel (§7.1)
Filtros por fecha, estado de pedido, estado de pago, método y responsable;
búsqueda por nombre, teléfono y número de pedido.
⚠️ Los filtros por método y responsable **solo funcionan después de la ETAPA 3**;
hasta entonces esas columnas están vacías.

### 1.5 Validar transiciones en el proxy admin ✅ HECHO
`src/app/api/admin/pedidos/[id]/route.ts` reenvía cualquier estado sin validar
(hallazgos 3 y 4). Aplicar `evaluarTransicion()` **en el proxy** cierra el agujero
por el lado de Next.js sin tocar Apps Script.

> Mitigación parcial, no solución: Apps Script sigue expuesto si alguien tuviera el
> token. Pero elimina el camino realmente alcanzable (consola del navegador con
> sesión admin) y es reversible en un commit.

La validación quedó implementada con reglas puras y respuestas claras, incluido
`409` para conflictos de transición. El backend real sigue siendo la autoridad
pendiente y conserva la ventana leer-luego-escribir.

---

## ETAPA 2 — Columnas nuevas en Sheets ⬜

**Riesgo: bajo** — es aditivo y Apps Script lee por nombre de encabezado, así que
agregar columnas al final no rompe nada.

Ejecución manual sobre la planilla. Detalle en `COLUMNAS_SHEETS_PROPUESTAS.md`
§1, §2 y §5:
- `PEDIDOS`: `metodo_pago`, `responsable_pago`, `fecha_pago`,
  `motivo_cancelacion`, `observacion_interna`, `fecha_confirmacion`,
  `responsable_confirmacion`, `requiere_revision`;
- `PRODUCTOS`: `estado_producto`, `requiere_revision_precio`,
  `solo_venta_presencial`;
- hoja nueva `HISTORIAL_PEDIDOS`.

**Se pueden crear vacías cuando se quiera.** Nada las lee todavía.

---

## ETAPA 3 — Migración de datos ⬜ RIESGO ALTO

**No hacer en sábado de apertura. Duplicar la planilla antes.**

1. Poblar `metodo_pago` desde los valores mezclados de `estado_pago`
   (tabla en `MODELO_STOCK_PAGOS.md` §2.5).
2. Normalizar `estado_pago` a `pendiente_de_pago` / `pagado`.
3. Marcar `requiere_revision = SI` en lo que no se pueda traducir
   (`anulado`, texto libre) y **revisarlo a mano**.
4. Marcar `fecha_confirmacion` en **todos** los pedidos existentes: significa
   “este pedido ya descontó stock bajo el modelo antiguo”
   (`COLUMNAS_SHEETS_PROPUESTAS.md` §4).

El paso 4 es el que evita que, tras el cambio, cancelar un pedido antiguo deje de
devolver stock que sí se había descontado.

---

## ETAPA 4 — Apps Script nuevo ⬜ RIESGO ALTO

Requiere ETAPAS 2 y 3 completas: sin las columnas, `col_()` lanza y **la tienda
deja de tomar pedidos**.

Detalle en `CONTRATO_APPS_SCRIPT_PROPUESTO.md`:
1. `crearPedido_` deja de descontar stock y nace en `recibido`;
2. `cambiarEstadoPedido` con bloqueo optimista (`estado_esperado`);
3. `registrarPago`;
4. `editarPedidoRecibido`;
5. `corregirStock`;
6. alias temporales de `actualizarEstadoPedido` y `cancelarPedido`.

**Criterio de aceptación:** reproducir los 25 casos de la matriz de
`tests/fase3a-estados.test.mjs` contra una copia de la planilla, y cerrar los
hallazgos 3, 4 y 5.

**Antes de publicar:** anotar la versión de despliegue anterior, para rollback.

---

## ETAPA 5 — Panel admin Fase 3A 🔄 PARCIAL

Las funciones pendientes conectadas al backend real requieren ETAPA 4. Las
acciones de estado, el modo demo y su QA local no dependieron de esa migración.

- ⬜ Desplegable de pago separado en estado + método (§4.1).
- ⬜ Selector de responsable con la lista autorizada y la excepción “Otro” (§4.7).
- ⬜ Diálogo de cancelación con motivo obligatorio (§3.8).
- ⬜ Edición de cantidades en pedidos `recibido` (§3.6).
- ✅ Botones derivados de `transicionesPosibles()`, sin ofrecer transiciones
  inválidas o salidas desde estados terminales.
- ✅ Cancelar usa POST; las demás transiciones usan PATCH.
- ✅ Modo demo local aislado con seis estados representativos.
- ✅ QA visual local aprobado sin solicitudes a `/api/admin/pedidos`.
- ✅ Plan y decisiones del backend atómico documentados.
- ⬜ Panel de alertas con `alertasDePedido()` (§7.3).
- ⬜ Filtro “Recibido”, pendiente hasta que el backend real emita ese estado.

---

## ETAPA 6 — Aperturas y horarios ⬜ BLOQUEADO

Bloqueado por P1 y P2 (`PENDIENTES_CAROLINA_NADIA.md`). La estructura de la hoja
`APERTURAS` está diseñada; faltan los datos. Incluye actualizar las fechas
desactualizadas del Home.

---

## Qué queda fuera de FASE 3A (§9.2)

Pagos parciales · usuarios individuales con permisos avanzados · caja completa ·
reportes avanzados · compras y abastecimiento · contenido editorial final ·
sistema avanzado de imágenes · gestión de proveedores.

---

## Dependencias

```
ETAPA 0 ✅
   │
   ├──▶ ETAPA 1 (proxy y UI admin hechos; catálogo y filtros pendientes)
   │
   └──▶ ETAPA 2 ──▶ ETAPA 3 ──▶ ETAPA 4 ──▶ ETAPA 5

ETAPA 6 ◀── respuestas P1 y P2
```

**Próximo bloque recomendado:** crear el entorno TEST y validar allí el backend
atómico, stock, concurrencia y rollback. ETAPAS 2–4 y cualquier cambio productivo
continúan pendientes.
