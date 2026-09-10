# PROJECT_STATE.md — Estado vivo del proyecto

> Documento vivo. Refleja el estado **actual** del proyecto. Actualizar en cada
> tarea que cambie el estado. Última actualización: 2026-09-09.

---

## Resumen

Web del **Almacén Popular Rosa Elena Morales** — proyecto comunitario sin fines de
lucro. Sirve como escaparate del almacén y para tomar pedidos que se retiran los
sábados de apertura.

- **Estado funcional:** UI/admin de Fase 3A alineada con las transiciones válidas,
  modo demo aislado y QA visual local aprobado.
- **Producción:** los avances de Fase 3A y el diseño de Fase 3B no modificaron
  Google Sheets ni Apps Script productivo; el backend real conserva el modelo
  anterior.
- **Próxima prioridad:** el entorno TEST (Sheet + Apps Script) y la conexión
  de Next.js local quedaron verificados de punta a punta el 2026-08-19,
  incluyendo lectura, creación de pedido, stock y cancelación desde `/admin`
  real, sin tocar producción — `docs/fase-3b/ENTORNO_TEST_FASE_3B.md` §G y
  §H. La estructura de `APERTURAS`, sus validaciones y siete semillas 2026
  quedaron implementadas en código con preparación idempotente, rutas y UI
  admin exclusivas para TEST. Falta ejecutar la creación/carga en TEST,
  desplegar la nueva versión de Apps Script TEST, completar lugar y ejecutar
  la prueba autenticada del calendario. El diseño de Fase 3B se prueba sobre
  la misma base TEST.
- **Rama técnica actual:** `feature/fase-3a-operativa`.
- **Fase 3B: calendario admin implementado en repo, pendiente en TEST:** el
  informe v0.3 fue aprobado y subido a Drive; el Almacén respondió horario de
  apertura/retiro y criterio de cierre de pedidos. Se definieron las
  decisiones operativas, el modelo de datos de `APERTURAS`, el plan de
  implementación en 10 etapas y el plan de pruebas. Decisiones F.1 (venta
  asistida nace en `listo`) y F.3 (orden determinista de selección de
  apertura) **aprobadas por coordinación** como criterio base. Etapas 1
  (lógica pura del calendario, estado público de la web y origen de pedido) y
  2 (demo local del calendario en `/admin?demo=1`, componente
  `CalendarioAperturasDemo`) están completadas. Etapa 3 (entorno TEST
  compartido con Fase 3A) en curso: Sheet TEST y Apps Script TEST creados,
  autorizados y desplegados; pruebas manuales de lectura, escritura, stock,
  cancelación e idempotencia verificadas el 2026-08-19 directamente contra la
  Web App TEST, sin tocar producción. `appsScriptPedidos.ts` selecciona entre
  variables productivas y `_TEST` según `NEXT_PUBLIC_APP_ENV`, con bloqueo
  explícito si falta configuración TEST o si coincide con producción — y esa
  conexión quedó **verificada de punta a punta con Next.js local** el mismo
  2026-08-19: lectura de catálogo, creación de pedido, descuento de stock,
  cancelación desde `/admin` real (sesión de navegador, no demo) y devolución
  de stock, todo OK (`docs/fase-3b/ENTORNO_TEST_FASE_3B.md` §H). Falta la
  hoja `APERTURAS` en TEST, carga de semillas, despliegue del Apps Script TEST
  y prueba autenticada. El calendario admin ya tiene funciones Apps Script,
  rutas Next.js y UI con doble guardrail TEST; el contrato de pedidos
  anticipados/presenciales sigue sin implementar. El Almacén
  confirmó categorías visibles, formatos/unidades, catálogo común para web y
  presencial y siete aperturas vigentes; persisten pendientes de nombres,
  contenido, fotos, usuarios, lugar y aperturas especiales. 135/135 tests,
  lint y build verdes. Detalle en
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

- ✅ Sheet y Apps Script TEST creados; ✅ Next.js conectado y verificado de
  punta a punta (2026-08-19) — ver `docs/fase-3b/ENTORNO_TEST_FASE_3B.md`
  §G y §H.
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
- Pendientes reales del Almacén (normalización de nombres, contenido, fotos,
  lugar, aperturas especiales y nómina de
  usuarios) — ver `docs/fase-3b/PENDIENTES_ALMACEN_FASE_3B.md`.

---

## Prioridad actual

**Entorno TEST y backend atómico de Fase 3A** (plan operativo detallado en
`docs/fase-3b/ENTORNO_TEST_FASE_3B.md`):

1. Aprobar el checklist y las decisiones técnicas pendientes.
2. ✅ Preparar copias separadas de Sheet y Apps Script con conexión por ID
   explícito — creado, autorizado y desplegado; verificado con pruebas
   manuales el 2026-08-19 (`docs/fase-3b/ENTORNO_TEST_FASE_3B.md` §G).
3. Implementar el backend únicamente en TEST.
4. Ejecutar pruebas de stock, concurrencia, idempotencia y rollback —
   stock e idempotencia de cancelación ya verificados manualmente (§G);
   concurrencia y rollback, pendientes.
5. Emitir criterio Go/No-Go antes de preparar una intervención productiva.

---

## Datos hardcodeados a tener presentes

- Número WhatsApp `56950807172` (tienda, participar, footer).
- URL del CSV de Google Sheets (en `src/app/api/productos/route.ts`).
- Datos temporales de CONFIG aún pendientes de reemplazo por valores oficiales.
- Fechas de apertura en el Home (desactualizadas). El Almacén confirmó siete
  fechas vigentes entre 2026-09-19 y 2026-12-19 y horario 11:00–15:00 hrs
  (ver `docs/fase-3b/DECISIONES_OPERATIVAS_FASE_3B.md` §1.1); todavía no se
  implementan ni publican.
- Dirección: Gamero 2670, Independencia.
