# PROJECT_STATE.md — Estado vivo del proyecto

> Documento vivo. Refleja el estado **actual** del proyecto. Actualizar en cada
> tarea que cambie el estado. Última actualización: 2026-08-12.

---

## Resumen

Web del **Almacén Popular Rosa Elena Morales** — proyecto comunitario sin fines de
lucro. Sirve como escaparate del almacén y para tomar pedidos que se retiran los
sábados de apertura.

- **Estado funcional:** UI/admin de Fase 3A alineada con las transiciones válidas,
  modo demo aislado y QA visual local aprobado.
- **Producción:** los avances de Fase 3A no modificaron Google Sheets ni Apps
  Script productivo; el backend real conserva el modelo anterior.
- **Próxima prioridad:** crear un entorno TEST separado y validar allí el backend
  atómico antes de planificar migración o producción.
- **Rama técnica actual:** `feature/fase-3a-operativa`.

### Sistema documental

- ✅ Sistema documental v0.1 consolidado en `design-system/` y `reports/`.
- ✅ Dos tipos oficiales: informe de avance para el Almacén e informe técnico interno.
- ✅ Dos pilotos HTML v0.2 aprobados como referencias visuales.
- ✅ Fuentes Markdown, templates y CSS documental separados.
- ⬜ Automatización Markdown → HTML → PDF pendiente; no se instalaron dependencias.
- ⬜ PDF finales pendientes de una tarea posterior.

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14.2.35 (App Router) |
| Lenguaje | TypeScript 5 · React 18 |
| Estilos | Tailwind CSS 3.4 + PostCSS |
| Fuentes | `next/font` (Inter + Playfair Display) |
| Lint | ESLint 8 + `eslint-config-next` |
| Datos catálogo | Google Sheets operativa, consumida mediante Apps Script |
| Backend | Google Apps Script Web App + proxy interno de Next.js |

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

- ✅ **Catálogo dinámico** desde la base operativa de Google Sheets.
- ✅ **Carrito** completo (agregar/reducir/vaciar, persistido en `localStorage`).
- ✅ **Buscador** de productos por nombre.
- ✅ **Envío de pedido por WhatsApp** con mensaje pre-armado (`wa.me`).
- ✅ **Imágenes de producto** por convención de nombre, con fallback.
- ✅ **Pedidos reales compartidos** en Google Sheets, visibles entre dispositivos.
- ✅ **Panel `/admin` protegido** con login real, cookie `httpOnly`, middleware y
  rutas administrativas con autenticación de servidor.
- ✅ **Flujo end-to-end** tienda → pedido → base operativa → admin → stock probado.
- ✅ **Proxy admin Fase 3A** rechaza transiciones peligrosas antes de reenviar al
  backend.
- ✅ **UI admin Fase 3A** muestra todas las transiciones válidas y oculta las
  inválidas o terminales.
- ✅ **Modo demo local** validado visualmente sin llamadas a
  `/api/admin/pedidos`, Google Sheets ni Apps Script.

---

## Pendientes principales

- Crear copias identificadas de Google Sheet y Apps Script para el entorno TEST.
- Implementar y probar en TEST la creación en `recibido` sin descontar stock.
- Implementar el cambio de estado atómico con `estado_esperado`, idempotencia y
  reconciliación de fallos parciales.
- Probar stock, concurrencia y rollback antes de definir cualquier migración.
- Separar estado de pago y método de pago según el plan aprobado.
- Reemplazar datos temporales de CONFIG por información oficial del Almacén.
- Resolver la nomenclatura de fases entre el plan histórico y los informes v0.2.

---

## Prioridad actual

**Entorno TEST y backend atómico de Fase 3A**:

1. Aprobar el checklist y las decisiones técnicas pendientes.
2. Preparar copias separadas de Sheet y Apps Script con conexión por ID explícito.
3. Implementar el backend únicamente en TEST.
4. Ejecutar pruebas de stock, concurrencia, idempotencia y rollback.
5. Emitir criterio Go/No-Go antes de preparar una intervención productiva.

---

## Datos hardcodeados a tener presentes

- Número WhatsApp `56950807172` (tienda, participar, footer).
- URL del CSV de Google Sheets (en `src/app/api/productos/route.ts`).
- Datos temporales de CONFIG aún pendientes de reemplazo por valores oficiales.
- Fechas de apertura en el Home (desactualizadas).
- Dirección: Gamero 2670, Independencia.
