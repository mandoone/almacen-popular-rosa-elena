# DIAGNÓSTICO_ACTUAL.md — Qué hace hoy el sistema (FASE 3A)

> Diagnóstico técnico del flujo real de pedidos, pagos y stock, contrastado con
> `levantamiento_operativo_fase_3a_consolidado.md`.
> Fecha: 2026-07-29 · Rama: `feature/fase-3a-operativa`
> **Nada de lo descrito aquí fue modificado en producción.**

---

## 1. Resumen ejecutivo

El sistema funciona end-to-end, pero **el modelo operativo real es distinto del
modelo aprobado en el levantamiento**, y no por detalles: la diferencia está en el
momento en que se descuenta el stock.

| Dimensión | Modelo aprobado (levantamiento) | Sistema hoy |
|---|---|---|
| Estado inicial del pedido web | `recibido` | `pendiente` |
| Cuándo descuenta stock | Al **confirmar** (recibido → pendiente/listo) | Al **crear** el pedido |
| Estado de pago | Separado del método | Mezclado (`pagado_efectivo`) |
| Transiciones | Lista cerrada y validada | Sin validar: cualquiera a cualquiera |
| Motivo de cancelación | Obligatorio | No existe |
| Responsable de venta/pago | Obligatorio al pagar | No existe (columna vacía) |
| Historial de acciones | Requerido | Solo movimientos de stock |

Consecuencia práctica: **hoy todo pedido web compromete stock apenas se envía**,
aunque nadie del Almacén lo haya revisado. Es exactamente el comportamiento que el
levantamiento quiso eliminar (§3.3, §3.4, §3.7).

---

## 2. Arquitectura del flujo real

```
tienda/page.tsx
   └─ POST /api/pedidos ──────────┐
                                   │  (proxy público, sin token)
admin/page.tsx                     │
   ├─ GET   /api/admin/pedidos     │
   ├─ GET   /api/admin/pedidos/:id │   src/lib/appsScriptPedidos.ts
   ├─ PATCH /api/admin/pedidos/:id ├──▶  (agrega ADMIN_TOKEN en servidor)
   └─ POST  /api/admin/pedidos/:id │              │
                                   │              ▼
                        middleware.ts    Apps Script Web App
                        (cookie HMAC)    scripts/apps-script-pedidos.gs
                                                  │
                                                  ▼
                              Google Sheets: PRODUCTOS · PEDIDOS
                                     DETALLE_PEDIDOS · MOVIMIENTOS_STOCK
```

**La lógica de negocio vive en Apps Script, no en Next.js.** Las rutas de Next son
proxies delgados: no validan transiciones ni reglas de stock. Cualquier corrección
de reglas exige tocar el `.gs` **o** poner una capa de validación en el proxy.

---

## 3. Hallazgos

Numerados para poder referenciarlos desde código y tareas.

### 3.1 Críticos (afectan stock o datos reales)

#### Hallazgo 1 — El stock se descuenta al crear el pedido
`scripts/apps-script-pedidos.gs:216-234` descuenta `stock_actual` y registra un
movimiento `salida` **dentro de `crearPedido_`**, y la cabecera nace con
`estado_pedido: 'pendiente'` (línea 193).

Contradice §3.3 y §3.4 del levantamiento: el pedido web debe nacer `recibido` y
**no** descontar stock hasta que administración/operación lo confirme.

Efecto operativo: un pedido enviado a las 3 AM por alguien que nunca lo retira ya
dejó producto comprometido. Es la causa raíz de §3.7 (“sin stock suficiente”).

#### Hallazgo 2 — El estado `recibido` no existe
`apps-script-pedidos.gs:364` define
`estadosValidos = ['pendiente','listo','entregado','cancelado']`.
No hay `recibido`. Sin él, no se puede distinguir “pedido por revisar” de “pedido
confirmado”, que es la distinción sobre la que descansa todo el modelo nuevo.

#### Hallazgo 3 — Riesgo real de DOBLE DEVOLUCIÓN de stock
`actualizarEstadoPedido_` (línea 356) **no valida la transición**: acepta cualquier
estado de la lista desde cualquier estado, y no toca stock.
`cancelarPedido_` (línea 392) sí devuelve stock, y su única guarda de idempotencia
es leer si el estado actual ya es `'cancelado'` (línea 408).

Como el estado se puede revertir con PATCH, la guarda se puede anular:

| Paso | Acción | Estado | Stock |
|---|---|---|---|
| 1 | Pedido web creado | `pendiente` | −N (descontado) |
| 2 | `POST /api/admin/pedidos/:id` (cancelar) | `cancelado` | +N (devuelto) |
| 3 | `PATCH {estado_pedido:'pendiente'}` | `pendiente` | sin cambio |
| 4 | `POST` cancelar otra vez | `cancelado` | **+N otra vez** |

Resultado: inventario inflado en N unidades, sin rastro de error. El panel actual
no ofrece ese camino por UI (oculta los botones si está cancelado), pero
`PATCH` es alcanzable por cualquier sesión admin válida desde la consola del
navegador o `curl`. **Es un riesgo operativo, no teórico.**

#### Hallazgo 4 — Espejo del anterior: stock que nunca vuelve
`PATCH {estado_pedido:'cancelado'}` marca el pedido cancelado **sin devolver
stock** (esa función no toca inventario). Después, `cancelarPedido_` ve
`'cancelado'` y responde `ya_cancelado: true` sin devolver nada.
El stock queda descontado para siempre y el pedido figura cancelado.

#### Hallazgo 5 — Un pedido entregado se puede cancelar y devuelve stock
`cancelarPedido_` no valida el estado previo. Cancelar un pedido `entregado`
—mercadería que ya salió del Almacén— suma ese stock de vuelta al inventario.
§3.4 dice explícitamente que Entregado no se cancela en flujo normal.

#### Hallazgo 6 — `estado_pago` mezcla el método de pago
`src/app/admin/page.tsx:61-66` ofrece
`['pendiente','pagado_transferencia','pagado_efectivo','anulado']`.
Prohibido por §4.1. Además Apps Script escribe el valor **tal cual, sin validar**
(líneas 379-381): cualquier texto que llegue por PATCH entra a la hoja.

También aparece `forma_pago` en la cabecera, escrito desde la tienda con el valor
por defecto `'efectivo_al_retirar'` (`src/app/api/pedidos/route.ts:39`). Hoy
conviven **dos** campos de pago con semánticas distintas y ninguno es el modelo
aprobado.

### 3.2 Importantes (bloquean reglas del levantamiento)

#### Hallazgo 7 — No hay responsable, ni motivo de cancelación, ni historial
- `vendedor_admin` existe como columna en PEDIDOS pero **nunca se escribe**
  (`crearPedido_` la deja en `''`), y ninguna acción admin la completa.
- No existen `metodo_pago`, `responsable_pago`, `fecha_pago`,
  `motivo_cancelacion` ni `observacion_interna`.
- `MOVIMIENTOS_STOCK` registra bien los cambios de inventario, pero **no** los
  cambios de estado ni de pago. El historial de §3.10 no existe.

#### Hallazgo 8 — `paso_venta` se lee pero no se valida
`crearPedido_` valida `permite_decimal` (entero vs. decimal, línea 151-154) pero
**no** valida que la cantidad sea múltiplo de `paso_venta`. Un pedido de 0,37 kg de
granel se acepta. Rompe la regla de incrementos de 0,25 kg (§5.1).

#### Hallazgo 9 — La tienda no puede mostrar “Agotado” ni aplicar el paso
`src/app/api/productos/route.ts:22-26` recorta el producto a `{id, nombre, precio}`
y descarta `stock_actual`, `stock_minimo`, `permite_decimal`, `paso_venta`,
`unidad_medida` e `imagen_url`, aunque Apps Script sí los devuelve.

La tienda es por tanto **incapaz** de cumplir §5.2 (“mostrar Agotado y no permitir
agregar”) o §5.1: no tiene los datos. Hoy el único control de stock ocurre al
crear el pedido, y se manifiesta como un error 409 después de que el vecino ya
armó el carrito.

#### Hallazgo 10 — El panel se rompía con estados desconocidos
`src/app/admin/page.tsx` usaba `BADGE[estado]` / `LABEL[estado]` sin fallback y
casteaba el estado con `as Estado` sin validar. El día que el backend devolviera
`recibido`, el badge quedaba con `class="undefined"` y la etiqueta vacía.
**Corregido en esta sesión** (ver §5).

### 3.3 Menores / higiene

#### Hallazgo 11 — Comentarios de deuda técnica obsoletos
`src/app/api/admin/pedidos/route.ts` y `[id]/route.ts` declaraban “esta ruta NO
tiene autenticación propia de servidor”. Es **falso desde FASE 2**:
`src/middleware.ts:59` protege `/api/admin/:path+` verificando la cookie firmada
antes de llegar al handler. **Corregido en esta sesión.**

#### Hallazgo 12 — No existe modelo de aperturas
No hay hoja ni estructura para fechas/horarios de apertura. `CONFIG` está con
datos temporales (D5 en `docs/DECISIONS.md`) y las fechas del Home están
desactualizadas. §9.1 pide “fechas de apertura registrables”.

---

## 4. Revisión de seguridad

Sin hallazgos que bloqueen. Lo verificado:

- **No hay secretos en el repo.** `scripts/apps-script-pedidos.gs` mantiene los
  marcadores `PEGAR_..._AQUI`; `.env.example` solo tiene nombres de variables.
- **`.env.local` no fue leído ni modificado** y está cubierto por `.gitignore`
  (`.env*.local` y `.env*`).
- **El token admin nunca llega al cliente**: se agrega en
  `src/lib/appsScriptPedidos.ts` desde `process.env`, solo en rutas de servidor.
  La ruta pública `/api/pedidos` no lo toca.
- **El catálogo público no filtra de más**: `listarProductos_` excluye
  `precio_costo` y `margen_pct`.
- **La sesión admin** usa HMAC-SHA256 con expiración de 8 h y cookie `httpOnly` +
  `secure` en producción. Adecuado para el modelo de contraseña compartida.
  Limitación conocida y aceptada: el token no identifica *quién* entró, así que
  **la sesión no sirve como responsable de venta/pago** — por eso el responsable
  debe ser un campo explícito (§4.7).
- **Nota §12 del levantamiento**: la contraseña de correo compartida por WhatsApp
  sigue pendiente de rotación. No es una acción de código y no se tocó.

---

## 5. Qué está implementado vs. qué está solo documentado

| Regla del levantamiento | Estado real |
|---|---|
| Catálogo siempre visible | ✅ Implementado |
| Pedidos fuera de horario | ✅ Implementado (no hay bloqueo por apertura) |
| Pedido `recibido` sin descontar stock | ❌ Solo documentado |
| Confirmación manual que descuenta | ❌ Solo documentado |
| Estados de pedido definidos | ⚠️ 4 de 5; falta `recibido` |
| Transiciones validadas | ❌ Solo documentado (+ módulo puro y tests) |
| Devolución de stock al cancelar | ⚠️ Existe, pero sin validar estado previo |
| Pago separado del método | ❌ Solo documentado (+ módulo puro y tests) |
| Responsable obligatorio | ❌ No existe |
| Motivo de cancelación | ❌ No existe |
| Historial de acciones críticas | ❌ No existe |
| Edición limitada en `recibido` | ❌ No existe |
| Granel con paso 0,25 | ⚠️ Solo `permite_decimal`; falta el paso |
| Producto “Agotado” en tienda | ❌ Faltan datos en el endpoint |
| Productos activo/inactivo | ⚠️ Solo activo/no-activo, sin `borrador` |
| Corrección de stock solo admin | ❌ No existe acción de corrección |
| Panel admin con filtros del §7.1 | ⚠️ Solo filtro por estado |
| Alertas del §7.3 | ❌ Solo documentado (+ módulo puro y tests) |

---

## 6. Riesgos de tocar producción

1. **El `.gs` del repo no es el que corre.** El código productivo vive en el editor
   de Apps Script; este archivo es una copia que se pega a mano. Editarlo aquí no
   cambia nada, y desplegarlo sin coordinar sí. Por eso esta sesión **no lo tocó**.
2. **Cambiar `estado_pago` en el panel escribiría basura en la hoja.** Apps Script
   guarda el string recibido sin validar, y no existe columna `metodo_pago`. Migrar
   el desplegable antes que las columnas **corrompe datos reales**. No se hizo.
3. **Introducir `recibido` sin migrar el descuento de stock duplica el problema**:
   habría pedidos viejos con stock ya descontado y nuevos sin descontar, sin forma
   de distinguirlos salvo por fecha.
4. **No hay entorno de prueba.** La misma planilla sirve a producción. Toda prueba
   destructiva necesita una copia de la hoja y un despliegue de Apps Script aparte.

---

## 7. Correcciones aplicadas en esta sesión

Cambios de bajo riesgo, verificados con `lint`, `build` y `test`:

- `src/app/admin/page.tsx`: `recibido` agregado al tipo y a los mapas de badge y
  etiqueta, y fallback para estados desconocidos (hallazgo 10). **El panel se ve
  igual que antes** para los cuatro estados vigentes; solo deja de romperse ante
  uno nuevo. No se agregó el filtro “Recibido” todavía, para no mostrar una
  pestaña vacía mientras el backend no emita ese estado.
- `src/app/api/admin/pedidos/route.ts` y `[id]/route.ts`: comentarios de deuda
  técnica corregidos (hallazgo 11) y anotada la deuda real abierta (hallazgos 3 y 4).
- `src/lib/fase3a/*`: modelo operativo como funciones puras, sin conectar.
- `tests/*`: 29 pruebas que fijan las reglas del levantamiento.

**No se modificó**: Apps Script, Google Sheets, `.env*`, configuración de Vercel,
el flujo de creación de pedidos ni el desplegable de `estado_pago`.

---

## 8. Referencias

- `docs/fase-3a/levantamiento_operativo_fase_3a_consolidado.md` — fuente de verdad
- `docs/fase-3a/MODELO_ESTADOS_PEDIDOS.md` — máquina de estados propuesta
- `docs/fase-3a/MODELO_STOCK_PAGOS.md` — reglas de stock y pago
- `docs/fase-3a/CONTRATO_APPS_SCRIPT_PROPUESTO.md` — cambios de backend propuestos
- `docs/fase-3a/COLUMNAS_SHEETS_PROPUESTAS.md` — columnas nuevas propuestas
- `docs/fase-3a/PLAN_IMPLEMENTACION_FASE_3A.md` — orden de ejecución
