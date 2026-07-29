# SEGUIMIENTO_1_5A_PROXY_ADMIN.md — ¿Puede el proxy validar transiciones?

> Micro-etapa de FASE 3A. Alcance deliberadamente estrecho: **solo** responder si
> el proxy admin puede validar transiciones de estado antes de llamar a Apps
> Script, e implementarlo si es corto y seguro.
> Fecha: 2026-07-29 · Rama: `feature/fase-3a-operativa` · Base: `78f6052`
> Sin tocar Apps Script, Google Sheets, `.env` ni Vercel.

---

## 1. Qué ruta admin cambia estados de pedido

**`src/app/api/admin/pedidos/[id]/route.ts`** — es la única. Tiene tres handlers:

| Método | Acción Apps Script | ¿Mueve stock? |
|---|---|---|
| `GET` | `obtenerPedido` | No |
| `PATCH` | `actualizarEstadoPedido` | **No** — solo escribe el estado |
| `POST` | `cancelarPedido` | **Sí** — devuelve stock del detalle |

Que `PATCH` escriba el estado **sin** mover inventario y `POST` sí lo mueva es
justamente el origen de los hallazgos 3 y 4 del diagnóstico: son dos caminos
independientes que se pisan.

`src/app/api/admin/pedidos/route.ts` (listado) no cambia nada.

---

## 2. ¿Conoce esa ruta el estado actual del pedido?

**Hoy no.** `PATCH` recibe solo `estado_pedido` y `estado_pago` del cliente, y los
reenvía sin leer nada. `POST` ni siquiera lee el cuerpo: llama a `cancelarPedido`
con el id.

**Pero lo puede obtener sin tocar Apps Script.** La función `obtenerPedido(id)` de
`src/lib/appsScriptPedidos.ts` ya existe, ya está desplegada y devuelve
`data.pedido.estado_pedido`. Es la misma acción que usa el `GET` de esta ruta para
el detalle.

> Es decir: el estado actual está a **una llamada existente** de distancia. No hace
> falta una acción nueva, ni una columna nueva, ni un despliegue de Apps Script.

Costo: una petición GET extra a Apps Script antes de cada cambio de estado. A la
escala de este proyecto (decenas de pedidos por apertura) es irrelevante.

---

## 3. ¿Puede validar transiciones sin tocar Apps Script?

**Sí.** Con el estado actual leído y `evaluarTransicion()` de
`src/lib/fase3a/estados.ts` —función pura, ya probada con 29 tests— el proxy puede
aceptar o rechazar cualquier cambio antes de reenviarlo.

No requiere cambios en el contrato de Sheets ni en Apps Script: el proxy
simplemente **deja de llamar** a la acción cuando la transición no es válida.

---

## 4. ¿Puede impedir la doble devolución de stock desde Next.js?

**Sí, por el camino que realmente se puede alcanzar. Con una limitación honesta.**

La secuencia del hallazgo 3 era:

| Paso | Acción | Con validación |
|---|---|---|
| 1 | Pedido en `pendiente` | — |
| 2 | `POST` cancelar → stock +N | permitido |
| 3 | `PATCH {estado_pedido:'pendiente'}` | **rechazado** — `cancelado` es terminal |
| 4 | `POST` cancelar otra vez → stock +N | inalcanzable |

El paso 3 se cae, así que el 4 nunca ocurre. Y si alguien intenta el `POST` dos
veces seguidas, el segundo también se rechaza (`cancelado → cancelado` no es una
transición válida).

**Limitación real:** esto es un *leer-luego-escribir* repartido en dos llamadas
HTTP. Entre el `GET` del estado y el `POST` de cancelación hay una ventana en la
que otra persona podría hacer lo mismo, y ambas leerían `pendiente`. Es una
**mitigación fuerte, no una garantía**. La garantía exige el bloqueo optimista
dentro de Apps Script (`estado_esperado` validado dentro del `LockService`), que ya
está especificado en `CONTRATO_APPS_SCRIPT_PROPUESTO.md` §2.

Para el uso real —dos o tres personas operando el panel un sábado— la ventana es de
milisegundos y el riesgo baja de "alcanzable desde la consola del navegador" a
"carrera improbable". Vale la pena, pero no cierra el tema.

### Hallazgo 4 también se cierra

`PATCH {estado_pedido:'cancelado'}` marcaba el pedido cancelado **sin devolver
stock**. La validación lo rechaza explícitamente: cancelar debe pasar por `POST`,
que es el camino que sí devuelve inventario.

---

## 5. ¿Puede impedir cancelar un pedido Entregado desde Next.js?

**Sí, y sin ambigüedad.** `evaluarTransicion('entregado', 'cancelado')` es inválida
porque `entregado` es terminal. El `POST` valida el estado actual antes de llamar a
`cancelarPedido`, así que la llamada nunca llega a Apps Script.

Cierra el hallazgo 5 por completo, sin la limitación de concurrencia del punto 4
(aquí no hay carrera: un pedido entregado no vuelve a otro estado por sí solo).

---

## 6. Cambio mínimo recomendado

Un solo archivo: `src/app/api/admin/pedidos/[id]/route.ts`.

1. Leer el estado actual con `obtenerPedido()` antes de cambiarlo.
2. Validar con `evaluarTransicion()`.
3. Rechazar con `409` y el motivo que ya devuelve la función pura.
4. En `PATCH`, rechazar `estado_pedido: 'cancelado'` y remitir a `POST`.

**Sin** cambios en Apps Script, Sheets, estructura de pagos ni permisos.

### ⚠️ La trampa que casi rompe el panel

`cambiarPago()` en `src/app/admin/page.tsx:174` **reenvía el estado actual** junto
con el nuevo estado de pago:

```js
body: JSON.stringify({ estado_pedido: pedido.estado_pedido, estado_pago: estadoPago })
```

Como `evaluarTransicion` rechaza la transición a sí mismo —a propósito, para que un
doble clic no mueva stock dos veces—, validar sin más **habría roto el desplegable
de pago por completo**.

Solución adoptada: **solo se valida cuando el estado pedido difiere del actual.**
Si coinciden, no hay cambio de estado que validar y se deja pasar como
actualización de pago. Es seguro porque `actualizarEstadoPedido` no mueve
inventario en ningún caso.

---

## 7. Consecuencia que requiere decisión de Omar

La validación aplica el flujo aprobado del levantamiento (§3.4), que **no incluye
`Pendiente → Entregado`**. Pero el panel **sigue mostrando el botón “Entregado” en
pedidos `pendiente`** (`src/app/admin/page.tsx`, condición
`estado_pedido === 'pendiente' || estado_pedido === 'listo'`).

**Efecto inmediato:** ese botón ahora devuelve `409` en pedidos `pendiente`. El
pedido debe pasar primero por “Marcar listo”.

Esto es lo que se pidió explícitamente en esta micro-etapa, y coincide con el
levantamiento. Pero **la UI no se actualizó** —queda fuera del alcance de esta
etapa—, así que hay un botón visible que falla. Dos salidas:

- **(a)** Ocultar el botón “Entregado” en pedidos `pendiente` (una condición en el
  panel). Coherente con el levantamiento.
- **(b)** Permitir `Pendiente → Entregado` agregándolo a `TRANSICIONES` y a la
  matriz de tests. Contradice el flujo aprobado.

No se eligió por cuenta propia. Es el punto 1 a revisar.

---

## 8. Cambio de configuración necesario

Las reglas se extrajeron a `src/lib/fase3a/proxyAdmin.ts` para poder probarlas sin
levantar Next. Ese módulo es el primero de `fase3a` que importa **valores** de otro
módulo del mismo paquete (`estados.ts`), y eso chocó con el esquema de pruebas:

- `node --test` ejecuta los `.ts` directamente y **exige** la extensión en el
  import (`./estados.ts`);
- TypeScript rechaza esa extensión salvo que se habilite
  `allowImportingTsExtensions`, que solo es válido con `noEmit` —justo lo que ya
  tenía el proyecto—.

Se agregó esa opción a `tsconfig.json`. Verificado: `npm run build` pasa a la
primera y Next.js **no** reescribió el archivo.

Hasta ahora los módulos de `fase3a` solo se importaban entre sí como tipos (que se
borran al ejecutar), así que el problema no había aparecido. Con esto queda
desbloqueada la composición entre módulos para las etapas siguientes.

---

## 9. Qué quedó fuera de esta micro-etapa

- Validar cantidades y stock al confirmar (necesita el detalle del pedido).
- Ampliar `/api/productos` (ETAPA 1.1).
- Filtros del panel (ETAPA 1.4).
- Ajustar los botones del panel a `transicionesPosibles()`.
- El bloqueo optimista real dentro de Apps Script (ETAPA 4).
