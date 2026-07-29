# MODELO_STOCK_PAGOS.md — Stock, pagos y responsables (FASE 3A)

> Fuente: `levantamiento_operativo_fase_3a_consolidado.md` §3.7–§3.10, §4, §5.
> Implementación: `src/lib/fase3a/pagos.ts`, `responsables.ts`, `cancelacion.ts`,
> `productos.ts` · Pruebas: `tests/fase3a-pagos.test.mjs`, `fase3a-productos.test.mjs`

---

## 1. Stock

### 1.1 Cuándo se mueve el inventario

| Momento | Movimiento | Tipo en MOVIMIENTOS_STOCK |
|---|---|---|
| Se crea el pedido web (`recibido`) | **ninguno** | — |
| Se confirma (`recibido → pendiente/listo`) | resta | `salida` / origen `pedido` |
| Se cancela desde `pendiente` o `listo` | suma | `devolucion` / origen `cancelacion` |
| Se cancela desde `recibido` | **ninguno** | — |
| Cambios entre `pendiente`/`listo`/`entregado` | **ninguno** | — |
| Corrección manual de administración | suma o resta | `ajuste` / origen `correccion` |

Este es el cambio más grande respecto de hoy: actualmente el descuento ocurre al
**crear** (ver hallazgo 1 del diagnóstico).

### 1.2 Cómo se evita el doble descuento y la doble devolución

Tres defensas, en capas:

1. **Derivación, no enumeración.** El impacto se calcula comparando si el estado
   origen y el destino comprometen stock. No hay una lista de casos que pueda
   quedar incompleta.
2. **Estados terminales.** `cancelado` y `entregado` no tienen transiciones de
   salida, así que no se puede volver a un estado con stock comprometido y
   cancelar de nuevo.
3. **Transición a sí mismo inválida.** Un reintento o doble clic falla en vez de
   aplicarse dos veces.

A nivel de backend hace falta además:

4. **Bloqueo por pedido durante la transición.** Apps Script ya usa
   `LockService.getScriptLock()` en `crearPedido_` y `cancelarPedido_`; la nueva
   acción de cambio de estado debe usarlo también.
5. **Verificación del estado leído dentro del lock.** La transición debe validarse
   contra el estado que se lee *dentro* del bloqueo, nunca contra el que envió el
   cliente. Si no coincide con el esperado, se rechaza (`409`).

### 1.3 Stock insuficiente al confirmar (§3.7)

El pedido **se queda en `recibido`**. No se confirma parcialmente ni se ajusta
solo. Flujo: contactar por WhatsApp → editar cantidades (permitido en `recibido`)
→ reintentar la confirmación. Si el cliente no acepta, se cancela desde `recibido`
y el stock nunca se tocó.

### 1.4 Corrección manual (§5.6)

Solo administración (Carolina y Nadia). Motivo obligatorio: recuento físico,
merma, error de carga inicial, compra/abastecimiento, devolución, ajuste por
pedido cancelado, u “Otro” (que exige observación).

---

## 2. Pago

### 2.1 Dos campos, nunca uno

| Campo | Valores |
|---|---|
| `estado_pago` | `pendiente_de_pago` · `pagado` |
| `metodo_pago` | `efectivo` · `transferencia` |

**Prohibido** (§4.1): `pagado_efectivo`, `pagado_transferencia`,
`pendiente_transferencia` o cualquier variante que mezcle las dos dimensiones.
Estos valores existen hoy en la hoja y se migran, no se perpetúan.

Sin pago parcial en primera versión (§4.2): abono, saldo y deuda quedan fuera.
El comprobante de transferencia **no** es obligatorio (§4.5).

### 2.2 Cuándo se puede marcar pagado (§4.3)

| Estado del pedido | ¿Admite pago? |
|---|---|
| `recibido` | ❌ — aún no está confirmado |
| `pendiente` | ✅ |
| `listo` | ✅ |
| `entregado` | ✅ (normalmente ya viene pagado) |
| `cancelado` | ❌ |

### 2.3 Al marcar pagado son obligatorios (§4.5)

- método de pago;
- responsable de venta/pago;
- fecha y hora (automáticas).

### 2.4 Entregar exige pago cerrado (§4.4)

Un pedido no pasa a `entregado` si sigue `pendiente_de_pago`. Deben existir
estado `pagado`, método y responsable.

### 2.5 Migración de los valores heredados

`migrarEstadoPagoHeredado()` traduce lo que hoy hay en la hoja:

| Valor actual | `estado_pago` | `metodo_pago` | Revisión manual |
|---|---|---|---|
| `pendiente` / vacío | `pendiente_de_pago` | — | no |
| `pagado_efectivo` | `pagado` | `efectivo` | no |
| `pagado_transferencia` | `pagado` | `transferencia` | no |
| `pagado` (sin método) | `pagado` | — | **sí** |
| `anulado` | `pendiente_de_pago` | — | **sí** |
| cualquier otro texto | `pendiente_de_pago` | — | **sí** |

`anulado` no tiene equivalente en el modelo nuevo y **no se inventa uno**: se
marca para revisión. Lo mismo con cualquier texto libre que alguien haya escrito
a mano en la planilla.

---

## 3. Responsable de venta/pago

Lista autorizada inicial (§4.7): Carolina, Nadia, Lucía, Seba, Juan Py, Cris,
Mati, Lizzie.

**“Otro”** se acepta solo como excepción y siempre:
- exige observación interna (§3.9);
- deja la alerta *“Responsable no autorizado / pendiente de validación
  administrativa”*;
- hace aparecer el pedido en el panel de alertas (§7.3).

> La sesión admin **no sirve** como responsable: es una contraseña compartida, no
> identifica a la persona. Por eso el responsable es un campo explícito que se
> elige en cada pago. (Ver §4 del diagnóstico.)

Los roles de §3.1 (administración / operación / venta) se registran como dato
descriptivo. **No se convierten en permisos** porque quién puede confirmar y quién
puede cancelar sigue pendiente de Carolina y Nadia.

---

## 4. Cancelación

Motivo **obligatorio** (§3.8): cliente no retira · cliente cancela · producto sin
stock real · error en el pedido · pedido duplicado · otro.
Con motivo “Otro”, la observación interna es obligatoria y el pedido queda
marcado como alerta.

Devolución de stock según el estado de origen (ver `MODELO_ESTADOS_PEDIDOS.md` §2).

---

## 5. Productos y catálogo

| Regla | Detalle |
|---|---|
| Estados (§5.4, §5.5) | `activo` · `inactivo` · `borrador` |
| Vendible | activo **y** precio > 0 **y** sin revisión de precio pendiente |
| Sin imagen (§5.3) | **sí** se vende; basta nombre, unidad, precio y stock |
| Agotado (§5.2) | `stock_actual <= 0` → se muestra, no se puede agregar |
| Granel (§5.1) | cantidades múltiplos de `paso_venta`; 0,25 kg por defecto |
| Precio dudoso (§5.4) | queda `inactivo` o `borrador`, no vendible |
| Cambio de costo (§5.9) | no altera el precio público; marca `requiere_revision_precio` |
| Aprobación de precios (§5.8) | solo administración |

La validación de granel compara en centésimas enteras
(`Math.round(cantidad*100) % Math.round(paso*100)`) para no depender de la
aritmética de coma flotante: `0.1 + 0.2 !== 0.3` haría fallar una comparación
directa.

### Nombres de archivo de imagen (§6.3)

Minúsculas, sin tildes, sin ñ, sin espacios ni caracteres especiales, palabras
separadas con guion bajo, sufijo de dos dígitos:

```
Avena Integral      → avena_integral_01.jpg
Piñones Ñuñoa       → pinones_nunoa_02.jpg
Café molido 1/2 kg  → cafe_molido_1_2_kg_03.jpg
```

---

## 6. Estado de implementación

| Pieza | Estado |
|---|---|
| Modelo de pago separado | ✅ función pura + tests |
| Migración de valores heredados | ✅ función pura + tests |
| Validación de responsable | ✅ función pura + tests |
| Validación de cancelación | ✅ función pura + tests |
| Reglas de producto y granel | ✅ función pura + tests |
| Convención de imágenes | ✅ función pura + tests |
| Reglas de alertas del panel | ✅ función pura + tests |
| Columnas nuevas en Sheets | ⬜ propuesta — `COLUMNAS_SHEETS_PROPUESTAS.md` |
| Acciones nuevas en Apps Script | ⬜ propuesta — `CONTRATO_APPS_SCRIPT_PROPUESTO.md` |
| Panel admin conectado | ⬜ pendiente |

Ninguna de estas funciones está conectada al flujo real. Ver §6 del diagnóstico
para por qué conectar el desplegable de pago **antes** de crear las columnas
corrompería datos reales.
