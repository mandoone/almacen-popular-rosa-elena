# MODELO_ESTADOS_PEDIDOS.md — Máquina de estados (FASE 3A)

> Especificación de los estados de pedido y sus transiciones.
> Fuente: `levantamiento_operativo_fase_3a_consolidado.md` §3.4–§3.6.
> Implementación ejecutable: `src/lib/fase3a/estados.ts`
> Pruebas: `tests/fase3a-estados.test.mjs`

---

## 1. Estados

| Estado | Significado | ¿Stock comprometido? | ¿Editable? |
|---|---|---|---|
| `recibido` | Ingresado por la web, sin revisar | **No** | **Sí** |
| `pendiente` | Revisado y aceptado, por preparar | Sí | No |
| `listo` | Preparado, por retirar | Sí | No |
| `entregado` | Retirado por el cliente | Sí | No |
| `cancelado` | Anulado | No | No |

**La columna “stock comprometido” es el corazón del modelo.** El impacto de stock
de cualquier transición se deriva de comparar ese predicado en el estado de origen
y en el de destino, en vez de enumerar casos a mano:

- pasa de **no comprometido → comprometido** ⇒ **descuenta**
- pasa de **comprometido → `cancelado`** ⇒ **devuelve**
- en cualquier otro caso ⇒ **no toca stock**

Así, por construcción, ninguna secuencia de transiciones válidas puede descontar
o devolver dos veces.

---

## 2. Transiciones permitidas

```
                    ┌──────────────┐
                    │  recibido    │  (nace aquí el pedido web)
                    └──┬────┬────┬─┘
            descuenta  │    │    │  sin tocar stock
        ┌──────────────┘    │    └──────────────┐
        ▼                   ▼ descuenta         ▼
  ┌───────────┐        ┌─────────┐        ┌───────────┐
  │ pendiente │◀──────▶│  listo  │        │ cancelado │
  └─────┬─────┘        └────┬────┘        └───────────┘
        │                   │                   ▲
        │ devuelve          │ devuelve          │
        └───────────────────┴───────────────────┘
                            │
                            ▼ (exige pago registrado)
                      ┌───────────┐
                      │ entregado │
                      └───────────┘
```

| Desde | Hacia | Permitido | Impacto en stock |
|---|---|---|---|
| `recibido` | `pendiente` | ✅ | **descuenta** |
| `recibido` | `listo` | ✅ | **descuenta** |
| `recibido` | `cancelado` | ✅ | ninguno (nunca descontó) |
| `pendiente` | `listo` | ✅ | ninguno (ya descontado) |
| `pendiente` | `cancelado` | ✅ | **devuelve** |
| `listo` | `pendiente` | ✅ | ninguno |
| `listo` | `entregado` | ✅ | ninguno |
| `listo` | `cancelado` | ✅ | **devuelve** |
| `entregado` | cualquiera | ❌ | — |
| `cancelado` | cualquiera | ❌ | — |
| cualquiera | sí mismo | ❌ | — |

Los 25 pares posibles están fijados en la matriz de
`tests/fase3a-estados.test.mjs`. Cambiar una regla obliga a cambiar esa matriz
primero.

---

## 3. Decisiones de diseño que conviene entender

### 3.1 La transición a sí mismo es inválida a propósito
`pendiente → pendiente` se rechaza. No es purismo: es la defensa contra el doble
clic y el reintento de red. Si una transición idéntica fuera un “no-op” silencioso,
un reintento tras un timeout podría aplicar el descuento dos veces. Rechazarla hace
que el segundo intento falle ruidosamente en vez de descuadrar el inventario.

### 3.2 `cancelado` y `entregado` son terminales
Sin salida. §3.5 lo dice para `cancelado` (“no se reabre; se crea un pedido nuevo”)
y §3.4 para `entregado` (“no se cancela en flujo normal”). Que sean terminales
elimina de raíz el escenario de doble devolución descrito en el hallazgo 3 del
diagnóstico.

Si algún día hace falta revertir una entrega, debe ser una **acción distinta y
explícita** (con motivo, responsable y su propio movimiento de stock), no una
transición de estado normal.

### 3.3 `pendiente → entregado` NO está permitido
El flujo aprobado en §3.4 enumera `Listo → Entregado`, pero no
`Pendiente → Entregado`. Se respeta el levantamiento al pie de la letra.

⚠️ **Divergencia con el panel actual**: hoy el botón “Entregado” aparece también en
pedidos `pendiente`. Adoptar este modelo quita ese atajo y obliga a pasar por
`listo`. Queda como **pendiente técnico** en `PENDIENTES_CAROLINA_NADIA.md` §3:
puede ser deseado (obliga a preparar antes de entregar) o una fricción innecesaria.
No se decidió por cuenta propia.

### 3.4 Edición solo en `recibido`
§3.6: en `recibido` se pueden cambiar cantidades, quitar productos y recalcular el
total. **No** se pueden agregar productos nuevos en primera versión.
Coherente con el modelo de stock: mientras no haya descuento, editar es aritmética
sobre el pedido; después, tendría que mover inventario en cada edición.

---

## 4. Reglas asociadas al cambio de estado

Estas validaciones son independientes de la máquina de estados y se componen con
ella en el punto de llamada:

| Transición | Validación adicional | Módulo |
|---|---|---|
| `→ entregado` | Pago registrado: `pagado` + método + responsable (§4.4) | `pagos.ts` → `validarEntrega` |
| `→ cancelado` | Motivo obligatorio; con “Otro”, observación obligatoria (§3.8) | `cancelacion.ts` → `validarCancelacion` |
| `recibido → pendiente/listo` | Stock suficiente en cada línea (§3.7) | `productos.ts` → `validarCantidad` |

Si al confirmar no alcanza el stock, §3.7 manda: el pedido **se queda en
`recibido`**, se contacta al cliente por WhatsApp y se ajusta antes de reintentar.
No se confirma parcialmente.

---

## 5. Estado de implementación

| Pieza | Estado |
|---|---|
| Tipos y constantes | ✅ `src/lib/fase3a/estados.ts` |
| Validación de transiciones | ✅ función pura, 29 tests verdes |
| Cálculo de impacto de stock | ✅ función pura |
| Conexión con el panel admin | ⬜ pendiente |
| Conexión con Apps Script | ⬜ pendiente — ver `CONTRATO_APPS_SCRIPT_PROPUESTO.md` |

**Nada de esto está conectado al flujo real todavía.** Es especificación
ejecutable: sirve para verificar que las reglas son coherentes antes de tocar el
backend, y para que la migración tenga contra qué contrastarse.
