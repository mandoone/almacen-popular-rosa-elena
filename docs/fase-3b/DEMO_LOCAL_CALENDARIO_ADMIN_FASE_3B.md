# DEMO_LOCAL_CALENDARIO_ADMIN_FASE_3B.md — Etapa 2

> Estado: **implementada.** Demo local únicamente, sin integración real.
> No se llamó a ninguna API, no se leyó ni escribió Google Sheets, no se
> tocó Apps Script, Vercel ni `.env.local`.
> Corresponde a la Etapa 2 de `docs/fase-3b/PLAN_IMPLEMENTACION_FASE_3B.md`.
> Construida sobre el criterio F.1/F.3 aprobado en
> `docs/fase-3b/DECISIONES_PENDIENTES_FASE_3B.md` §0.

---

## 1. Cómo acceder

En local, con el servidor de desarrollo corriendo (`npm run dev`):

```
http://localhost:3000/admin?demo=1
```

La sección de calendario aparece **debajo** de la lista de pedidos demo ya
existente de Fase 3A, separada por un borde punteado morado. No requiere
login: el modo demo completo de `/admin` (pedidos + calendario) evita el
middleware de sesión real (ver §4).

## 2. Por qué esta implementación y no otra

Se reutilizó el modo demo existente de Fase 3A en vez de crear una ruta o
componente nuevo, siguiendo la preferencia explícita de esta sesión:

- `esModoDemoAdmin(entorno, pathname, parametroDemo)`
  (`src/lib/fase3a/adminDemo.ts`) ya exige `NODE_ENV === 'development'` **y**
  `pathname === '/admin'` **y** `?demo=1` — es el único punto de entrada al
  modo demo, y no se tocó.
- `src/app/admin/page.tsx` ya calcula `modoDemo` una vez con ese guard y lo
  pasa a `AdminPanel`. Se agregó una única línea:
  `{modoDemo && <CalendarioAperturasDemo />}`, exactamente el mismo patrón
  que ya usa el banner "Modo demo local" existente.
- El nuevo componente (`src/app/admin/components/CalendarioAperturasDemo.tsx`)
  no recibe props de autenticación ni de red: no puede renderizarse fuera del
  `if (modoDemo)` porque no tiene ninguna otra vía de montaje.

No se creó una ruta `/admin/calendario` aparte porque habría exigido duplicar
el guard de modo demo (o el guard de login, si se dejaba fuera del modo
demo), aumentando la superficie de riesgo sin necesidad real en esta etapa.

## 3. Qué muestra la demo

1. **Apertura relevante ahora** — resultado de `seleccionarAperturaRelevante`
   (criterio F.3 aprobado) evaluado en un instante de referencia fijo.
2. **Estado público calculado de la web** — `obtenerEstadoPublicoWeb` para esa
   apertura, con las banderas de comportamiento (`puedeVerCatalogo`,
   `puedeHacerPedidoAnticipado`, `puedeUsarComandaDigitalPresencial`) y el
   mensaje público sugerido.
3. **Lista completa de las 6 aperturas simuladas**, cada una con:
4. cierre de pedidos anticipados,
5. estado de pedidos anticipados (y si acepta pedidos ahora mismo),
6. estado de modo presencial QR (y si es usable ahora mismo),
7. lugar,
8. mensaje público,
9. observaciones internas,
   — más, como dato extra no pedido explícitamente pero útil para revisar la
   lógica, el estado público que tendría **cada** apertura si fuera la
   relevante (no solo la elegida), y si ya venció su horario.
10. **Tabla de referencia `origen_pedido` → `canal`** (los 4 orígenes y su
    canal derivado), sin ningún pedido simulado asociado todavía — es solo
    para revisar visualmente la resolución del solapamiento `canal`/
    `origen_pedido` de `MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md` §C.

## 4. Datos simulados

Fixture fijo en `src/lib/fase3b/aperturasDemoData.ts`, evaluado siempre contra
un **instante de referencia fijo** (`AHORA_DEMO = '2026-08-15T12:30'`, no la
hora real del reloj) para que la demo sea 100% reproducible sin importar
cuándo se abra — mismo criterio de "datos efímeros" que ya usa
`src/lib/fase3a/adminDemo.ts`, pero fijando también el "ahora" porque, a
diferencia del demo de pedidos, el calendario sí depende de comparar contra
la hora actual.

| Apertura | Fecha | `estado_apertura` | Qué demuestra |
|---|---|---|---|
| `APE-20260801-DEMO` | 01-08-2026 | `cerrada` | Apertura ya terminada |
| `APE-20260815-DEMO` | 15-08-2026 | `activa` | Modo presencial QR activo ahora mismo — **es la apertura relevante** en `AHORA_DEMO` |
| `APE-20260822-DEMO` | 22-08-2026 | `activa` | Próxima apertura destacada, pedidos anticipados abiertos |
| `APE-20260829-DEMO` | 29-08-2026 | `cancelada` | Apertura cancelada |
| `APE-20260905-DEMO` | 05-09-2026 | `programada` | Apertura programada a futuro, aún no destacada |
| `APE-20260912-DEMO` | 12-09-2026 | `programada` | Pedidos anticipados cerrados manualmente (`pausado`) antes del jueves de cierre normal |

El fixture está diseñado a propósito para que, evaluado en `AHORA_DEMO`,
**no** produzca conflicto: exactamente una apertura (`APE-20260815-DEMO`)
satisface el primer nivel de prioridad de `seleccionarAperturaRelevante`. El
comportamiento de conflicto (dos aperturas empatadas) está cubierto por tests
unitarios con datos ad hoc, no por este fixture — ver
`tests/fase3b-aperturas.test.mjs`.

## 5. Funciones de Fase 3B que reutiliza

Todas puras, ninguna nueva excepto la primera:

- `seleccionarAperturaRelevante` (**nueva en esta sesión**, `src/lib/fase3b/aperturas.ts`)
  — implementa el criterio F.3 aprobado. Se adelantó desde la Etapa 5 porque
  la demo la necesita para mostrar "la apertura relevante"; queda documentado
  como adelanto explícito, no como que la Etapa 5 ya esté completa (falta
  conectarla a datos reales y decidir qué hace la UI real con un conflicto).
- `obtenerEstadoPublicoWeb`, `COMPORTAMIENTO_ESTADO_PUBLICO` (`estadoPublicoWeb.ts`)
- `puedeRecibirPedidoAnticipado`, `puedeUsarModoPresencial`,
  `estaDentroDeHorario`, `haTerminadoApertura`, `calcularCierrePedidosPorDefecto`
  (`aperturas.ts`)
- `ORIGENES_PEDIDO`, `canalPorOrigen`, `esOrigenPresencial` (`origenPedido.ts`)

## 6. Verificación de las reglas de seguridad del Bloque 4

| # | Regla | Cómo se cumple |
|---|---|---|
| 1 | Solo aparece en modo demo/local | Gateada por `esModoDemoAdmin` (`NODE_ENV=development` + `/admin` + `?demo=1`), no tocada |
| 2 | No es funcionalidad productiva final | Marcada explícitamente como demo en el banner morado y en este documento |
| 3 | No permite guardar datos reales | No hay ningún formulario ni acción de escritura; todo es de solo lectura |
| 4 | No llama endpoint real | Cero `fetch()` en `CalendarioAperturasDemo.tsx` ni en `aperturasDemoData.ts` |
| 5 | No modifica pedidos reales | No comparte estado con `AdminPanel`; es un componente de solo lectura aparte |
| 6 | No modifica stock real | Ídem — no hay ninguna llamada de escritura |
| 7 | No depende de variables reales | Cero uso de `process.env` fuera del `NODE_ENV` que ya usaba `esModoDemoAdmin` |
| 8 | No requiere credenciales | Ninguna — es JS/TS puro + JSX estático |
| 9 | No rompe login admin productivo | Verificado en navegador: `/admin` sin `?demo=1` sigue redirigiendo a `/admin/login` sin cambios |
| 10 | Riesgos no garantizables, documentados y no implementados | Ver §7 |

## 7. Riesgos y límites, documentados y no implementados

- **No demuestra el caso de conflicto** (dos aperturas empatadas) en la UI —
  solo en tests. Se decidió no forzar el fixture a un conflicto para que la
  demo tenga un resultado siempre estable y legible; el comportamiento de
  conflicto ya está probado por separado.
- **No implementa el matiz de "apertura cancelada visible hasta su propia
  fecha"** de la recomendación original de F.3 — el criterio aprobado por
  coordinación no lo incluye explícitamente, así que `seleccionarAperturaRelevante`
  se ciñó a los 4 pasos aprobados. Documentado también en el comentario de la
  función.
- **`seleccionarAperturaRelevante` es lógica real, no solo de demo** — vive en
  `aperturas.ts`, no en el módulo de datos de demo. Esto significa que, sin
  querer, ya es reutilizable por la Etapa 5. Se documenta para que quede claro
  que no es una simulación: es la función real, evaluada aquí con datos
  simulados.
