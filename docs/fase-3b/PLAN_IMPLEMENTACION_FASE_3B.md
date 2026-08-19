# PLAN_IMPLEMENTACION_FASE_3B.md — Etapas de implementación

> Estado: **plan, no ejecución.** Este documento ordena el trabajo; no autoriza
> por sí mismo tocar producción, Sheets real, Apps Script productivo ni Vercel.
> Fuente: `docs/fase-3b/DECISIONES_OPERATIVAS_FASE_3B.md`,
> `docs/fase-3b/MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md`,
> `docs/fase-3b/COLUMNAS_PROPUESTAS_FASE_3B.md`.
> Modelo de referencia: `docs/fase-3a/PLAN_IMPLEMENTACION_FASE_3A.md` (mismo
> criterio de etapas, adaptado a Fase 3B).

Cada etapa solo empieza cuando la anterior está aprobada. Ninguna etapa
posterior a la 2 puede comenzar sin haber cerrado antes las decisiones
pendientes de `MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md` §F que la afecten.

---

## Etapa 0 — Solo documentación y modelo

- **Objetivo:** dejar el diseño de calendario, modo presencial y origen de
  pedido completo y consistente antes de escribir código.
- **Archivos/módulos probables:** `docs/fase-3b/*.md`.
- **Riesgos:** ninguno (no hay código ni datos reales involucrados).
- **Criterios de aceptación:** los cuatro documentos de Fase 3B
  (`DECISIONES_OPERATIVAS`, `MODELO_DATOS`, `COLUMNAS_PROPUESTAS`,
  `PLAN_IMPLEMENTACION`) existen, no se contradicen entre sí, y las decisiones
  pendientes (§F del modelo de datos) están explícitas, no ocultas.
- **Qué NO se debe tocar:** código, Sheets, Apps Script, Vercel.
- **Estado:** ✅ completada con este documento.

---

## Etapa 1 — Lógica pura local de calendario

- **Objetivo:** implementar como funciones puras TypeScript las reglas de
  cierre de pedidos, estado público de la web y origen de pedido, verificables
  con tests unitarios, sin ninguna conexión externa.
- **Archivos/módulos probables:**
  - `src/lib/fase3b/aperturas.ts`
  - `src/lib/fase3b/estadoPublicoWeb.ts`
  - `src/lib/fase3b/origenPedido.ts`
  - `tests/fase3b-aperturas.test.mjs`
  - `tests/fase3b-estado-publico-web.test.mjs`
  - `tests/fase3b-origen-pedido.test.mjs`
- **Riesgos:** decisiones de precedencia entre reglas (ver
  `MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md` §B.1) quedan fijadas en código
  antes de validarlas con el Almacén o con Carolina/Nadia; deben quedar
  documentadas como supuesto, no como hecho.
- **Criterios de aceptación:** `npm test` verde, sin cambios en `src/app/` ni
  en `scripts/*.gs`.
- **Qué NO se debe tocar:** UI, rutas API, Apps Script, Sheets.
- **Estado:** ✅ completada (commit `165f761`). 87/87 tests, lint y build
  verdes. Sin cambios en `src/app/` ni en `scripts/*.gs`, verificado.

---

## Etapa 2 — Demo local sin Sheets real

- **Objetivo:** exponer el calendario y el modo presencial en el modo demo del
  panel admin (`src/lib/fase3a/adminDemo.ts` es el precedente directo), con
  datos de ejemplo en memoria, sin llamadas a `/api/admin/pedidos` ni a Apps
  Script — mismo patrón que el QA visual aprobado en Fase 3A.
- **Archivos/módulos probables:** un módulo `adminDemo` equivalente para
  Fase 3B, o una extensión del existente si el alcance lo permite sin mezclar
  fases; vista de calendario en `src/app/admin/` marcada explícitamente como
  demo.
- **Riesgos:** mezclar sin querer el modo demo con rutas que sí llaman al
  backend real, si se reutiliza un componente compartido sin aislarlo.
- **Criterios de aceptación:** QA visual manual aprobado, sin ninguna llamada
  de red a `/api/admin/*` ni a Google/Apps Script durante la demo (mismo
  criterio que Fase 3A).
- **Qué NO se debe tocar:** `/api/admin/pedidos`, `/api/pedidos`, variables de
  entorno reales.
- **Estado:** ⬜ pendiente. Fuera del alcance de esta sesión salvo que Etapa 1
  quede sólida con tiempo de sobra.

---

## Etapa 3 — Entorno TEST con copias de Sheets/Apps Script

- **Objetivo:** disponer de una copia identificada de Sheet y Apps Script,
  igual que exige el backend atómico de Fase 3A, para poder probar
  `APERTURAS` y los campos nuevos de `PEDIDOS` contra datos reales sin tocar
  producción.
- **Archivos/módulos probables:** ninguno de código; ejecución manual del
  checklist ya existente.
- **Riesgos:** confundir TEST con producción si no se siguen las salvaguardas
  de `DECISIONES_BACKEND_ATOMICO_FASE_3A.md` §2.6.
- **Criterios de aceptación:** los mismos del Go/No-Go de
  `docs/fase-3a/CHECKLIST_ENTORNO_TEST_FASE_3A.md` §6, más columnas de
  `APERTURAS` y `PEDIDOS` de Fase 3B agregadas a la copia TEST.
- **Qué NO se debe tocar:** Sheet productivo, Apps Script productivo.
- **Dependencia:** esta etapa **es la misma** que ya bloquea el backend
  atómico de Fase 3A — no se duplica el trabajo, se reutiliza el mismo entorno
  TEST para ambas fases.
- **Estado:** ⬜ pendiente, bloqueada por Fase 3A (`CHECKLIST_ENTORNO_TEST_FASE_3A.md`).

---

## Etapa 4 — Integración admin

- **Objetivo:** el panel `/admin` gestiona el calendario real (crear, editar,
  cancelar aperturas; cerrar/reabrir pedidos manualmente; activar/desactivar
  modo presencial) contra el backend TEST.
- **Archivos/módulos probables:** `src/app/admin/`, nuevas rutas
  `src/app/api/admin/aperturas[/[id]]`, helper de servidor equivalente a
  `src/lib/appsScriptPedidos.ts` para `APERTURAS`.
- **Riesgos:** mismos riesgos de atomicidad que el backend de pedidos
  (`DECISIONES_BACKEND_ATOMICO_FASE_3A.md` §2.5) — un cambio de calendario a
  medias (por ejemplo, `estado_apertura` actualizado pero
  `pedidos_anticipados_estado` no) deja la web pública en un estado
  inconsistente. Requiere el mismo patrón de `LockService` + operación
  preparada/completada.
- **Criterios de aceptación:** administrador puede completar el ciclo
  crear → editar → cancelar una apertura en TEST, con auditoría de quién y
  cuándo.
- **Qué NO se debe tocar:** Apps Script productivo, Sheet productivo.
- **Estado:** ⬜ pendiente.

---

## Etapa 5 — Integración web pública

- **Objetivo:** la tienda pública (`src/app/tienda/`, `src/app/page.tsx`)
  muestra el estado calculado por `obtenerEstadoPublicoWeb()` y cambia de modo
  según el calendario real, en vez de las fechas hardcodeadas actuales
  (`docs/PROJECT_STATE.md` — "Fechas de apertura en el Home,
  desactualizadas").
- **Archivos/módulos probables:** `src/app/page.tsx`, `src/app/tienda/page.tsx`,
  posible componente compartido de "banner de estado de apertura".
- **Riesgos:** cachear el estado público sin invalidarlo puede mostrar un
  estado viejo (por ejemplo, seguir aceptando pedidos después del cierre) si
  no se recalcula en cada carga o con una revalidación corta.
- **Criterios de aceptación:** los 6 estados públicos de
  `MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md` §B se reflejan correctamente en
  la web contra datos de TEST, incluyendo el mensaje público de cada uno.
- **Qué NO se debe tocar:** checkout/creación de pedido real hasta que Etapa 4
  esté probada.
- **Estado:** ⬜ pendiente.

---

## Etapa 6 — Modo presencial QR

- **Objetivo:** flujo completo de `MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md`
  §E para `presencial_qr`: escaneo, tienda en modo presencial, envío de
  comanda digital, revisión de vendedor/admin, descuento de stock.
- **Archivos/módulos probables:** variante de `src/app/tienda/` en modo
  presencial (misma base de catálogo y carrito, distinto flujo de envío),
  generación de la URL/QR por apertura.
- **Riesgos:** el mismo problema de concurrencia de stock que Fase 3A
  (`PLAN_BACKEND_ATOMICO_FASE_3A.md` §10, "casos de concurrencia"), agravado
  porque ahora puede haber pedidos anticipados y presenciales compitiendo por
  el mismo stock al mismo tiempo. Debe reusar el núcleo atómico de cambio de
  estado, no crear uno paralelo.
- **Criterios de aceptación:** una comanda presencial QR se puede armar,
  enviar, confirmar y descontar stock en TEST, con `origen_pedido =
  presencial_qr` correctamente registrado.
- **Qué NO se debe tocar:** el flujo de pedido anticipado existente no debe
  modificarse para acomodar este modo; deben compartir el núcleo de estados,
  no la ruta completa.
- **Estado:** ⬜ pendiente.

---

## Etapa 7 — Venta asistida por vendedor

- **Objetivo:** un vendedor o admin ingresa una venta presencial directamente
  (`presencial_vendedor`) o transcribe una comanda de papel
  (`comanda_papel`), sin que el cliente use su propio celular.
- **Archivos/módulos probables:** pantalla simplificada dentro de `/admin`
  para "ingresar venta presencial", reutilizando la validación de
  `src/lib/fase3a/productos.ts`.
- **Riesgos:** F.1 ya está aprobada como criterio (nace en `listo`,
  `docs/fase-3b/DECISIONES_PENDIENTES_FASE_3B.md` §0), pero esta etapa sigue
  bloqueada por la falta del contrato de backend que la implemente: crear un
  pedido que compromete stock en el mismo paso es una operación atómica nueva,
  no una variante de `crearPedido_` (ver §1.4 de esa misma decisión).
- **Criterios de aceptación:** una venta asistida queda registrada con
  `origen_pedido` correcto, `responsable_entrega`/`responsable_pago`
  completos y sin pasar por dos confirmaciones redundantes de la misma
  persona.
- **Qué NO se debe tocar:** el rol vendedor con login propio sigue siendo
  FASE 2 (`docs/TASKS.md`); esta etapa no le da permisos nuevos, solo usa la
  sesión admin compartida existente.
- **Estado:** ⬜ pendiente. Criterio F.1 aprobado; falta diseñar el contrato de
  backend antes de implementar.

---

## Etapa 8 — Validación con el Almacén

- **Objetivo:** Carolina/Nadia (o quien corresponda) prueban el calendario, el
  modo presencial y la venta asistida en TEST, en un escenario que simule una
  apertura real, antes de acercarse a producción.
- **Archivos/módulos probables:** ninguno; es una sesión de prueba guiada.
- **Riesgos:** validar solo con Omar y no con quien realmente va a operar el
  día de apertura deja fricciones invisibles hasta el primer sábado real.
- **Criterios de aceptación:** feedback registrado en un documento de sesión
  (mismo formato que `docs/fase-3a/REPORTE_SESION_LARGA.md` o similar),
  ajustes menores aplicados, sin bloqueos abiertos.
- **Qué NO se debe tocar:** producción — esta etapa ocurre completa en TEST.
- **Estado:** ⬜ pendiente.

---

## Etapa 9 — Producción, solo con aprobación explícita

- **Objetivo:** desplegar calendario y modo presencial a producción.
- **Archivos/módulos probables:** despliegue de Apps Script productivo, Sheet
  productivo (columnas aditivas de `COLUMNAS_PROPUESTAS_FASE_3B.md`),
  variables de entorno en Vercel.
- **Riesgos:** todos los de `PLAN_BACKEND_ATOMICO_FASE_3A.md` §12, más los
  específicos de calendario: una apertura mal configurada en producción (fecha
  u hora equivocada) es visible públicamente de inmediato.
- **Criterios de aceptación:** los mismos del Go/No-Go de Fase 3A
  (`CHECKLIST_ENTORNO_TEST_FASE_3A.md` §6), aplicados también a `APERTURAS`, y
  aprobación explícita y por escrito de Omar antes de cada paso irreversible
  (igual que exige `PLAN_BACKEND_ATOMICO_FASE_3A.md` §14).
- **Qué NO se debe tocar sin esa aprobación explícita:** absolutamente nada de
  Sheets real, Apps Script productivo, Vercel ni `.env.local` de producción.
- **Estado:** ⬜ pendiente. **No autorizado por este plan.**

---

## Resumen de dependencias

```
Etapa 0 (hecha) → Etapa 1 (esta sesión) → Etapa 2 (demo)
                                              │
Etapa 3 (TEST, compartida con Fase 3A) ───────┘
        │
        ▼
Etapa 4 (admin) → Etapa 5 (web pública) → Etapa 6 (QR) → Etapa 7 (asistida)
        │
        ▼
Etapa 8 (validación Almacén) → Etapa 9 (producción, solo con aprobación)
```

Etapa 3 es compartida con el backend atómico de Fase 3A: no tiene sentido
crear un entorno TEST solo para calendario y otro solo para pedidos. Ambas
fases se prueban sobre la misma copia identificada.
