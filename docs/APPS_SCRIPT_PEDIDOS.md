# APPS_SCRIPT_PEDIDOS.md — Backend de pedidos reales (Web App)

Guía para desplegar el backend de **pedidos reales** como Web App de Google Apps
Script, sobre la base operativa `BD_WEB_ALMACEN_ROSA_ELENA_MORALES`.

- **Script:** `scripts/apps-script-pedidos.gs`
- **Modelo de datos:** `docs/DATA_MODEL.md`
- **Estado:** backend **probado manualmente** en Google Apps Script y funcionando
  contra la base operativa. Aún **no** está conectado a la web (`src/`) — esa
  conexión es el próximo bloque de FASE 1.

> ✅ **Pruebas manuales realizadas (OK):**
> - `crearPedido`: creó pedidos reales en PEDIDOS y DETALLE_PEDIDOS, descontó stock.
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
| POST | `crearPedido` | ❌ público | Crea pedido, valida stock/precios, descuenta stock. |
| GET | `listarPedidos` | ✅ | Lista pedidos, del más reciente al más antiguo. |
| GET | `obtenerPedido` | ✅ | Devuelve un pedido + su detalle. |
| POST | `actualizarEstadoPedido` | ✅ | Cambia `estado_pedido` (y `estado_pago` opcional). No toca stock. |
| POST | `cancelarPedido` | ✅ | Marca cancelado y **devuelve** el stock. |

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
    "carrito": [
      { "id_producto": "PROD-001", "cantidad": 2 },
      { "id_producto": "PROD-002", "cantidad": 1 }
    ]
  }'
```

Respuesta esperada: `ok: true` con `id_pedido` (`PED-YYYYMMDD-HHMMSS`), `total` e
`items`. Verifica en la planilla:
- nueva fila en **PEDIDOS**;
- líneas en **DETALLE_PEDIDOS**;
- `stock_actual` descontado en **PRODUCTOS**;
- movimientos `salida` / origen `pedido` en **MOVIMIENTOS_STOCK**.

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
# Cambiar estado
curl -L -X POST "URL_WEB_APP" -H "Content-Type: application/json" \
  -d '{ "action": "actualizarEstadoPedido", "token": "TU_ADMIN_TOKEN",
        "id_pedido": "PED-XXXXXXXX-XXXXXX", "estado_pedido": "listo" }'

# Cancelar (devuelve stock)
curl -L -X POST "URL_WEB_APP" -H "Content-Type: application/json" \
  -d '{ "action": "cancelarPedido", "token": "TU_ADMIN_TOKEN",
        "id_pedido": "PED-XXXXXXXX-XXXXXX" }'
```

---

## 6. Notas de seguridad

- **No commitear** la URL de la Web App ni el `ADMIN_TOKEN`. El script del repo trae
  solo marcadores `PEGAR_..._AQUI` y aborta si se ejecuta sin configurar.
- El `ADMIN_TOKEN` viaja en la query (`GET`) o en el body (`POST`). Úsalo siempre
  sobre HTTPS (las URL de Apps Script lo son).
- `crearPedido` es público a propósito (lo usará la tienda). Valida todo en el
  servidor: existencia/estado del producto, stock y precios.
- Concurrencia: `crearPedido` y `cancelarPedido` usan `LockService` para evitar que
  dos pedidos simultáneos descuadren el stock.

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

- **Proteger `/api/admin/*`:** hoy sin autenticación de servidor (deuda técnica).
- Probar el flujo real end-to-end con la Web App desplegada.
