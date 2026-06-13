# PROJECT_STATE.md — Estado vivo del proyecto

> Documento vivo. Refleja el estado **actual** del proyecto. Actualizar en cada
> tarea que cambie el estado. Última actualización: FASE 0.

---

## Resumen

Web del **Almacén Popular Rosa Elena Morales** — proyecto comunitario sin fines de
lucro. Sirve como escaparate del almacén y para tomar pedidos que se retiran los
sábados de apertura.

- **Fase activa:** FASE 0 (documentación viva) → preparando FASE 1.
- **Rama de trabajo:** `fase-0/documentacion-viva`.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14.2.35 (App Router) |
| Lenguaje | TypeScript 5 · React 18 |
| Estilos | Tailwind CSS 3.4 + PostCSS |
| Fuentes | `next/font` (Inter + Playfair Display) |
| Lint | ESLint 8 + `eslint-config-next` |
| Datos catálogo | Google Sheet publicada como CSV (solo lectura) |
| Backend | **No existe** (solo un route handler de lectura del catálogo) |

Scripts: `dev`, `build`, `start`, `lint`. Sin librerías de estado, base de datos
ni pagos.

---

## Estructura (resumen)

```
src/app/
  api/productos/route.ts   Lee el CSV de Sheets y devuelve JSON
  tienda/page.tsx          Catálogo + carrito + envío de pedido
  admin/page.tsx           Panel de pedidos (login local)
  page.tsx                 Home
  rosa-elena/ historia/ participar/   Contenido
src/components/            Navbar, Footer
public/images/             Logos y fotos; productos/ (vacía)
```

Detalle de datos en `docs/DATA_MODEL.md`.

---

## Qué funciona hoy

- ✅ **Catálogo dinámico** desde Google Sheets CSV (revalida cada 1 h).
- ✅ **Carrito** completo (agregar/reducir/vaciar, persistido en `localStorage`).
- ✅ **Buscador** de productos por nombre.
- ✅ **Envío de pedido por WhatsApp** con mensaje pre-armado (`wa.me`).
- ✅ **Imágenes de producto** por convención de nombre, con fallback.
- ✅ **Panel `/admin`** con login por contraseña, filtros por estado, ver/editar/
  eliminar pedidos y cambio de estado (pendiente → listo → entregado).

---

## Qué NO funciona / Problema principal

🔴 **Los pedidos viven solo en el `localStorage` del navegador del cliente.**

- Antes de abrir WhatsApp, el pedido se guarda en `localStorage` del dispositivo
  del cliente.
- El panel `/admin` lee de **su propio** `localStorage`, por lo que **no ve los
  pedidos hechos por los clientes desde otros dispositivos**.
- No hay backend ni almacenamiento compartido: el flujo de pedidos no es operable
  en una apertura real.

Riesgos completos en `docs/TASKS.md` (FASE 1) y contexto en `docs/DATA_MODEL.md`.

---

## Prioridad actual

**Pedidos reales en Google Sheets** (objetivo de FASE 1):

1. Los pedidos **no** deben quedar solo en `localStorage`.
2. Los pedidos deben almacenarse en una **Google Sheet operativa nueva** (ver
   decisión en `docs/DECISIONS.md` y diseño en `docs/DATA_MODEL.md`).
3. Los pedidos deben ser **visibles desde cualquier dispositivo** en `/admin`.

Bloqueante previo: **crear manualmente la Google Sheet operativa** (ver `docs/TASKS.md`).

---

## Datos hardcodeados a tener presentes

- Número WhatsApp `56950807172` (tienda, participar, footer).
- URL del CSV de Google Sheets (en `src/app/api/productos/route.ts`).
- Contraseña del panel admin (en el cliente — riesgo, ver FASE 1).
- Fechas de apertura en el Home (desactualizadas).
- Dirección: Gamero 2670, Independencia.
