# PROJECT_STATE.md — Estado vivo del proyecto

> Documento vivo. Refleja el estado **actual** del proyecto. Actualizar en cada
> tarea que cambie el estado. Última actualización: 2026-09-10.

---

## Resumen

Web del **Almacén Popular Rosa Elena Morales** — proyecto comunitario sin fines de
lucro. Sirve como escaparate del almacén y para tomar pedidos que se retiran los
sábados de apertura.

- **Estado funcional:** UI/admin de Fase 3A alineada con las transiciones válidas,
  Fase 3B validada en TEST y primer bloque controlado de Fase 4 + Fase 9
  preparado para revisión del Almacén.
- **Producción:** no se toca todavía. Google Sheets, Apps Script, variables y
  comportamiento productivos permanecen sin cambios.
- **Próxima prioridad:** avanzar Fase 4 (productos, stock, precios e imágenes)
  y Fase 9 (contenido público, historia y comunidad) en paralelo.
- **Rama técnica actual:** `feature/fase-3a-operativa`.
- **Fase 3B TEST validada:** la hoja `APERTURAS` existe y
  opera con siete aperturas oficiales; Apps Script TEST versión 2 respondió
  `listarAperturas` correctamente; Next.js local validó login admin, listado y
  el ciclo crear → editar → cerrar. La apertura temporal `APE-20261226` fue
  eliminada y el panel `/admin` volvió a quedar con las siete oficiales. El
  ajuste visual de fechas/horas fue entregado en `dad9542`, sin modificar Apps
  Script. Vercel completó ambos checks correctamente. Persisten los doble
  guardrails TEST y `/admin?demo=1` aislado; el modo presencial completo sigue
  sin implementar. El primer bloque público de pedidos anticipados ya
  está validado en TEST: DTO saneado, selector activo, UI TEST y bloqueo/
  asociación de pedidos. Apps Script TEST se actualizó, la preparación
  idempotente agregó `apertura_id` y `origen_pedido` a `PEDIDOS`, y un pedido
  anticipado real de prueba se creó, verificó y canceló correctamente. Detalle en
  `docs/fase-3b/DECISIONES_OPERATIVAS_FASE_3B.md`,
  `docs/fase-3b/MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md`,
  `docs/fase-3b/PLAN_IMPLEMENTACION_FASE_3B.md`,
  `docs/fase-3b/DECISIONES_PENDIENTES_FASE_3B.md`,
  `docs/fase-3b/DEMO_LOCAL_CALENDARIO_ADMIN_FASE_3B.md` y
  `docs/fase-3b/ENTORNO_TEST_FASE_3B.md` y
  `docs/fase-3b/IMPLEMENTACION_CALENDARIO_ADMIN_TEST.md`.

### Sistema documental

- ✅ Sistema documental v0.1 consolidado en `design-system/` y `reports/`.
- ✅ Dos tipos oficiales: informe de avance para el Almacén e informe técnico interno.
- ✅ Dos pilotos HTML v0.2 aprobados como referencias visuales.
- ✅ Fuentes Markdown, templates y CSS documental separados.
- 🔄 Iteración v0.2.1 en revisión: escala compacta al 70 % y roadmap Fases 0–6.
- ⬜ Automatización Markdown → HTML → PDF pendiente; no se instalaron dependencias.
- ⬜ PDF v0.2.1 pendiente de aprobación humana.

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
  api/productos/route.ts   Sirve el catálogo público desde Apps Script
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
- ✅ **Filtros y metadatos de catálogo Fase 4:** categorías largas, granel,
  unidad de venta y placeholder accesible para imágenes pendientes.
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
- ✅ **Contenido público Fase 9:** funcionamiento, historia, Rosa Elena,
  comunidad, participación, aportes y siete próximas aperturas 2026.

---

## Pendientes principales

- ✅ Calendario admin Fase 3B validado sobre TEST: Sheet `APERTURAS`, Apps
  Script TEST v2, siete aperturas oficiales y ciclo admin autenticado.
- ✅ Apertura activa y pedidos anticipados públicos validados en TEST: las
  columnas mínimas de `PEDIDOS` están preparadas, Apps Script TEST fue
  desplegado y un pedido real de prueba quedó asociado, verificado y cancelado.
- Implementar y probar en TEST la creación en `recibido` sin descontar stock.
- Implementar el cambio de estado atómico con `estado_esperado`, idempotencia y
  reconciliación de fallos parciales.
- Probar stock, concurrencia y rollback antes de definir cualquier migración.
- Separar estado de pago y método de pago según el plan aprobado.
- Reemplazar datos temporales de CONFIG por información oficial del Almacén.
- Resolver la nomenclatura de fases entre el plan histórico y los informes v0.2.
- F.1 y F.3 de Fase 3B ya aprobadas como criterio base (ver
  `docs/fase-3b/DECISIONES_PENDIENTES_FASE_3B.md` §0); el contrato de backend
  real ya está diseñado en el modelo §G–§H; falta
  implementarlo y probarlo exclusivamente en TEST.
- Validar nombres y variantes de productos, fotos finales, categorías, unidades,
  stock, precios y textos públicos — ver
  `docs/fase-4-9/VALIDACION_CATALOGO_CONTENIDO_WEB.md`.

---

## Prioridad actual

**Validar con el Almacén el bloque Fase 4 + Fase 9 preparado.** Resolver nombres,
categorías, imágenes y textos pendientes sin cambiar stock ni precios hasta su
confirmación. Después, abordar Fase 5 + 6: panel vendedor, comandas, caja y
cierre por apertura. Cualquier intervención productiva continúa pendiente de
una decisión Go/No-Go separada.

---

## Datos hardcodeados a tener presentes

- Número WhatsApp `56950807172` (tienda, participar, footer).
- Datos de contacto públicos repetidos en tienda, participar y footer.
- Datos temporales de CONFIG aún pendientes de reemplazo por valores oficiales.
- Fechas y lugar de aperturas 2026 centralizados en
  `src/lib/fase9/contenidoPublico.ts`; deben actualizarse cuando el Almacén
  informe cambios.
- Dirección: Gamero 2670, Independencia.
