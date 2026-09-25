# APPS_SCRIPT_PEDIDOS.md — Backend de pedidos reales (Web App)

Guía para desplegar el backend de **pedidos reales** como Web App de Google Apps
Script, sobre la base operativa `BD_WEB_ALMACEN_ROSA_ELENA_MORALES`.

- **Script:** `scripts/apps-script-pedidos.gs`
- **Modelo de datos:** `docs/DATA_MODEL.md`
- **Estado:** Apps Script TEST v14 incluye creación durable y preservación del
  teléfono textual. F9-A continúa FAIL por una validación antigua de
  `PEDIDOS.estado_pedido`; la migración y el preflight están preparados
  localmente, pendientes de deploy y retest. Producción queda fuera de alcance.

> Las pruebas manuales históricas corresponden al contrato anterior. F9-A cambia
> el flujo: `crearPedido` deja el pedido `recibido` y no toca stock; confirmar a
> `pendiente` descuenta bajo lock; cancelar devuelve solo desde `pendiente`/`listo`.
>
> ✅ **Pruebas históricas realizadas (contrato anterior):**
> - `crearPedido`: creó pedidos reales en PEDIDOS y DETALLE_PEDIDOS.
> - `listarPedidos`: devolvió los pedidos existentes.
> - `obtenerPedido`: devolvió cabecera + detalle.
> - `cancelarPedido`: marcó el pedido como cancelado y devolvió el stock.
> - `actualizarEstadoPedido`: cambió `estado_pedido` y `estado_pago` sin tocar stock.

> ⚠️ La **URL de la Web App** y el **ADMIN_TOKEN** **no se commitean** al repositorio.
> El `SPREADSHEET_ID` y el token se pegan a mano en Apps Script antes de desplegar.

---

## 1. Acciones que expone

| Método | Acción | Token admin | Descripción |
|--------|--------|:-----------:|-------------|
| GET | `listarProductos` | ❌ público | Catálogo de la tienda: productos con `activo = SI`, sin `precio_costo`/`margen_pct`. |
| POST | `crearPedido` | ❌ público | Crea pedido `recibido`, valida stock/precios y no reserva ni descuenta. |
| GET | `listarPedidos` | ✅ | Lista pedidos, del más reciente al más antiguo. |
| GET | `obtenerPedido` | ✅ | Devuelve un pedido + su detalle. |
| POST | `actualizarEstadoPedido` | ✅ | Valida transición bajo lock; `recibido → pendiente` usa diario e idempotencia. |
| POST | `cancelarPedido` | ✅ | Cancela con diario; devuelve solo desde `pendiente`/`listo`. |

Todas responden JSON con la forma:
```json
{ "ok": true,  "data": { ... } }
{ "ok": false, "error": "mensaje", "codigo": 400 }
```

---

## 2. Pegar y configurar el script

1. Abrir **https://script.google.com/** con la cuenta dueña de la base operativa.
2. Crear un **proyecto nuevo** (o usar el del setup) y **pegar todo** el contenido de
   `scripts/apps-script-pedidos.gs`.
3. Editar las dos constantes del inicio (solo en Apps Script, **no** en el repo):
   - **`SPREADSHEET_ID`** → ID de la base operativa
     `BD_WEB_ALMACEN_ROSA_ELENA_MORALES`.
   - **`ADMIN_TOKEN`** → una cadena secreta larga inventada por ti (p. ej. 32+
     caracteres aleatorios). Es la que protegerá las acciones de administración.
4. Guardar (`Ctrl+S`).

---

## 3. Desplegar como Web App

1. Botón **Desplegar → Nueva implementación**.
2. Tipo: **Aplicación web**.
3. Configuración sugerida:
   - **Ejecutar como:** *Yo* (la cuenta dueña de la planilla).
   - **Quién tiene acceso:** *Cualquier persona* (necesario para que el `crearPedido`
     público funcione desde la web). La seguridad de las acciones admin la da el
     `ADMIN_TOKEN`, no el control de acceso de Google.
4. **Implementar** y **autorizar permisos** cuando lo pida (acceso a tus hojas).
5. Copiar la **URL de la Web App** (`.../exec`). **Guárdala fuera del repo**; se usará
   en la conexión de la web (próximo bloque de FASE 1).

> Cada vez que cambies el código, crea una **nueva versión** de la implementación
> (Desplegar → Gestionar implementaciones → editar → nueva versión) para que la URL
> sirva el código actualizado.

---

## 4. Probar `crearPedido` (público)

Reemplaza `URL_WEB_APP` por tu URL `.../exec` y usa `id_producto` reales de la hoja
PRODUCTOS (p. ej. `PROD-001`).

```bash
curl -L -X POST "URL_WEB_APP" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "crearPedido",
    "nombre_cliente": "Prueba Vecina",
    "telefono": "56950807172",
    "forma_pago": "efectivo_al_retirar",
    "observaciones": "pedido de prueba",
    "idempotency_key": "UUID_CREACION_TEST_12345678",
    "carrito": [
      { "id_producto": "PROD-001", "cantidad": 2 },
      { "id_producto": "PROD-002", "cantidad": 1 }
    ]
  }'
```

Respuesta esperada en TEST, después de aprobar y desplegar F9-A: `ok: true` con
`id_pedido` (`PED-YYYYMMDD-HHMMSS-xxxxxxxx`), `total`, `items` y
`estado_pedido: recibido`. Verifica:
- nueva fila en **PEDIDOS**;
- líneas en **DETALLE_PEDIDOS**;
- `stock_actual` sin cambios en **PRODUCTOS**;
- ningún movimiento nuevo en **MOVIMIENTOS_STOCK** hasta confirmar.
- una operación `CREAR_PEDIDO` en **OPERACIONES_PEDIDOS**, `COMPLETADA` tras
  readback de cabecera y detalles.

> El backend **ignora** cualquier precio enviado por el cliente: usa siempre el
> `precio_venta` de la hoja PRODUCTOS.

---

## 5. Probar `listarPedidos` (admin)

```bash
curl -L "URL_WEB_APP?action=listarPedidos&token=TU_ADMIN_TOKEN"
```

Respuesta: `ok: true` con `data.pedidos` ordenados del más reciente al más antiguo.
Si el token es incorrecto: `ok: false`, `codigo: 401`.

Probar un pedido puntual:
```bash
curl -L "URL_WEB_APP?action=obtenerPedido&id_pedido=PED-XXXXXXXX-XXXXXX&token=TU_ADMIN_TOKEN"
```

Acciones admin por POST (ejemplos):
```bash
# Confirmar (descuenta stock una vez)
curl -L -X POST "URL_WEB_APP" -H "Content-Type: application/json" \
  -d '{ "action": "actualizarEstadoPedido", "token": "TU_ADMIN_TOKEN",
        "id_pedido": "PED-XXXXXXXX-XXXXXX", "estado_pedido": "pendiente",
        "actor": "ACTOR_TEST", "idempotency_key": "CONFIRMAR_PED_TEST_UUID" }'

# Cancelar (devuelve solo si estaba pendiente/listo)
curl -L -X POST "URL_WEB_APP" -H "Content-Type: application/json" \
  -d '{ "action": "cancelarPedido", "token": "TU_ADMIN_TOKEN",
        "id_pedido": "PED-XXXXXXXX-XXXXXX", "actor": "ACTOR_TEST",
        "idempotency_key": "CANCELAR_PED_TEST_UUID" }'
```

---

## 6. Notas de seguridad

- **No commitear** la URL de la Web App ni el `ADMIN_TOKEN`. El script del repo trae
  solo marcadores `PEGAR_..._AQUI` y aborta si se ejecuta sin configurar.
- El `ADMIN_TOKEN` viaja en la query (`GET`) o en el body (`POST`). Úsalo siempre
  sobre HTTPS (las URL de Apps Script lo son).
- `crearPedido` es público a propósito (lo usará la tienda). Valida todo en el
  servidor: existencia/estado del producto, stock y precios.
- Concurrencia: creación, confirmación y cancelación operan bajo `LockService` y
  persisten una intención en `OPERACIONES_PEDIDOS`. El retry usa la misma
  `idempotency_key` y no repite efectos ya comprobados.

### Diario durable de F9-A.2

La preparación aditiva TEST-only creó `OPERACIONES_PEDIDOS` y agregó
`operacion_id` a `MOVIMIENTOS_STOCK`. La función
`prepararOperacionesPedidosTest()` valida `APP_ENV=TEST` y el nombre exacto de la
Sheet, no borra ni reordena datos históricos y puede repetirse.

El contrato F9-A exige que la validación estricta de `PEDIDOS.estado_pedido`
admita `recibido`, `pendiente`, `listo`, `entregado`, `cancelado`. La acción GET
con token `verificarContratoPedidosF9Test` revisa la columna completa, el diario
y `MOVIMIENTOS_STOCK.operacion_id` sin escribir. La acción POST con token
`prepararValidacionEstadosPedidosTest` cambia únicamente esa DataValidation en
la Sheet TEST y verifica el readback; repetirla no vuelve a escribir si ya está
correcta. Ambas acciones están pendientes de deploy v15 y ejecución TEST.

Los estados del diario son:

- `PREPARADA`: intención, hash y plan persistidos y leídos de vuelta.
- `APLICANDO`: los efectos se aplican o reanudan de forma idempotente.
- `COMPLETADA`: los efectos aplicables coinciden con el plan en readback; para
  `CREAR_PEDIDO` son cabecera/detalles y no incluye stock ni movimientos.
- `REQUIERE_REVISION`: existe una diferencia que impide continuar automáticamente.

`diagnosticarOperacionPedidoTest(operacionId)` inspecciona una operación en TEST
y clasifica el estado real sin hacer reparaciones. Una operación activa o en
revisión bloquea confirmar, cancelar, pasar a listo o entregar el mismo pedido.
Google Sheets no ofrece transacciones ACID: este mecanismo es serializado,
idempotente, durable y verificable, no una garantía de atomicidad multitabla.

---

## 7. Conexión con la web Next.js (proxy interno)

La web **no** llama a la Web App directamente: usa **route handlers internos de
Next** como proxy, para no exponer la URL ni el token en el cliente.

- Helper de servidor: `src/lib/appsScriptPedidos.ts` (lee las variables de entorno).
- Rutas internas:
  - `POST /api/pedidos` → `crearPedido` (público; lo usa la tienda).
  - `GET /api/admin/pedidos` → `listarPedidos`.
  - `GET /api/admin/pedidos/[id]` → `obtenerPedido`.
  - `PATCH /api/admin/pedidos/[id]` → `actualizarEstadoPedido`.
  - `POST /api/admin/pedidos/[id]` → `cancelarPedido`.

### Variables de entorno (servidor)

Crea `.env.local` (no se commitea) a partir de `.env.example`:

```env
GOOGLE_SCRIPT_PEDIDOS_URL=<URL .../exec de la Web App>
GOOGLE_SCRIPT_ADMIN_TOKEN=<ADMIN_TOKEN del Apps Script>
```

> El token solo se usa en el servidor (acciones admin). **Nunca** uses `NEXT_PUBLIC_*`
> para estos valores.

### Catálogo alineado con la base operativa

`/api/productos` ya **no** usa el CSV antiguo: sirve el catálogo desde la hoja
PRODUCTOS vía `listarProductos`, por lo que el `id` que recibe la tienda es el
`id_producto` real (`PROD-001…`) y `crearPedido` valida sin fallar.

> ✅ `listarProductos` fue **desplegado y validado**: el flujo real (tienda → pedido →
> hojas → admin) se probó end-to-end localmente con éxito.

> ⚠️ Recuerda: cada vez que cambie el script hay que **re-desplegar** la Web App
> (nueva versión) para que los cambios estén disponibles en la URL `.../exec`.

### Pendiente

- `/api/admin/*` está protegido por sesión HMAC, middleware y capacidades; cada
  ruta de escritura vuelve a fijar acción, token y actor en el servidor.
- Revisar F9-A.2 y luego preparar la hoja, desplegar y validar el flujo
  exclusivamente en TEST.
- Documentar evidencia del readback y cualquier `REQUIERE_REVISION` antes de
  considerar el lote validado remotamente.
