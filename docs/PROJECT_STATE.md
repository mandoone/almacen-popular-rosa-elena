# PROJECT_STATE.md — Estado vivo del proyecto

> Documento vivo. Refleja el estado **actual** del proyecto. Actualizar en cada
> tarea que cambie el estado. Última actualización: 2026-08-19.

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
- **Próxima prioridad:** crear un entorno TEST separado y validar allí el backend
  atómico antes de planificar migración o producción. El diseño de Fase 3B
  (calendario y modo presencial) se prueba sobre la misma base TEST. La
  estrategia y el plan operativo de 15 pasos ya están documentados
  (`docs/fase-3b/ENTORNO_TEST_FASE_3B.md`); falta la ejecución manual — hoy
  no existe ningún Sheet, Apps Script ni deployment TEST.
- **Rama técnica actual:** `feature/fase-3a-operativa`.
- **Fase 3B: diseño, lógica pura y demo local (sin integración real):** el
  informe v0.3 fue aprobado y subido a Drive; el Almacén respondió horario de
  apertura/retiro y criterio de cierre de pedidos. Se definieron las
  decisiones operativas, el modelo de datos de `APERTURAS`, el plan de
  implementación en 10 etapas y el plan de pruebas. Decisiones F.1 (venta
  asistida nace en `listo`) y F.3 (orden determinista de selección de
  apertura) **aprobadas por coordinación** como criterio base. Etapas 1
  (lógica pura del calendario, estado público de la web y origen de pedido) y
  2 (demo local del calendario en `/admin?demo=1`, componente
  `CalendarioAperturasDemo`) están completadas. Etapa 3 (entorno TEST
  compartido con Fase 3A) tiene estrategia y guardrails listos —
  diagnóstico de riesgo (hoy `.env.local` solo puede apuntar a producción,
  sin ningún guardrail de código), variables `_TEST` propuestas, datos
  semilla y plan operativo de 15 pasos — pero el entorno real todavía no
  existe. 116/116 tests, lint y build verdes; sin conexión a `/api/admin`,
  Apps Script ni Google Sheets. Detalle en
  `docs/fase-3b/DECISIONES_OPERATIVAS_FASE_3B.md`,
  `docs/fase-3b/MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md`,
  `docs/fase-3b/PLAN_IMPLEMENTACION_FASE_3B.md`,
  `docs/fase-3b/DECISIONES_PENDIENTES_FASE_3B.md`,
  `docs/fase-3b/DEMO_LOCAL_CALENDARIO_ADMIN_FASE_3B.md` y
  `docs/fase-3b/ENTORNO_TEST_FASE_3B.md`.

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

- Crear copias identificadas de Google Sheet y Apps Script para el entorno TEST.
- Implementar y probar en TEST la creación en `recibido` sin descontar stock.
- Implementar el cambio de estado atómico con `estado_esperado`, idempotencia y
  reconciliación de fallos parciales.
- Probar stock, concurrencia y rollback antes de definir cualquier migración.
- Separar estado de pago y método de pago según el plan aprobado.
- Reemplazar datos temporales de CONFIG por información oficial del Almacén.
- Resolver la nomenclatura de fases entre el plan histórico y los informes v0.2.
- F.1 y F.3 de Fase 3B ya aprobadas como criterio base (ver
  `docs/fase-3b/DECISIONES_PENDIENTES_FASE_3B.md` §0); falta diseñar el
  contrato de backend real antes de conectar la lógica pura del calendario a
  producción o TEST.
- Pendientes reales del Almacén (catálogo, contenido, fotos, nómina de
  usuarios) — ver `docs/fase-3b/PENDIENTES_ALMACEN_FASE_3B.md`.

---

## Prioridad actual

**Entorno TEST y backend atómico de Fase 3A** (plan operativo detallado en
`docs/fase-3b/ENTORNO_TEST_FASE_3B.md`):

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
- Fechas de apertura en el Home (desactualizadas). Horario confirmado por el
  Almacén: 11:00–15:00 hrs (ver `docs/fase-3b/DECISIONES_OPERATIVAS_FASE_3B.md`
  §1.1); las fechas vigentes siguen sin confirmar.
- Dirección: Gamero 2670, Independencia.
