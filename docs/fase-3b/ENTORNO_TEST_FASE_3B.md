# ENTORNO_TEST_FASE_3B.md — Estrategia de entorno TEST (compartido Fase 3A + 3B)

> Estado: **entorno TEST de Apps Script + Google Sheet creado y verificado
> con pruebas manuales (2026-08-19) — ver §G.** Producción no fue tocada en
> ningún momento. `src/lib/appsScriptPedidos.ts` ya sabe elegir entre
> variables productivas y `_TEST` según `NEXT_PUBLIC_APP_ENV` (§ Guardrails de
> código); lo que falta es que alguien configure esas variables `_TEST` con
> valores reales en su propio `.env.local` — nadie lo hizo todavía, así que
> hoy la app sigue usando producción por defecto (comportamiento sin cambios).
>
> ⚠️ **Ningún token, URL real de Web App TEST ni ID de Sheet se registra en
> este documento ni en ningún otro archivo versionado.** La URL TEST vive
> solo en un archivo local de Drive; el token TEST vive solo en
> `archivo local temporal no versionado para token TEST` (ignorado por git, fuera
> del repo versionado). Si algún valor real llega a aparecer en un commit,
> debe tratarse como incidente de seguridad, no como error documental menor.
>
> Este documento es **compartido** entre Fase 3A y Fase 3B: no tiene sentido
> un entorno TEST solo para pedidos y otro solo para calendario — es la misma
> Sheet, el mismo Apps Script, el mismo despliegue. Complementa, sin
> reemplazar, `docs/fase-3a/CHECKLIST_ENTORNO_TEST_FASE_3A.md` (checklist ya
> aprobado, centrado en el backend atómico) y
> `docs/fase-3a/DECISIONES_BACKEND_ATOMICO_FASE_3A.md` §2.6 (diseño de
> `ENVIRONMENT`/`EXPECTED_SPREADSHEET_NAME` en Apps Script, ya definido, no
> implementado). Este documento agrega lo que faltaba: el diagnóstico de
> riesgo actual, las variables y guardrails del lado Next.js, los datos
> semilla que también cubren calendario/QR/venta asistida, y el plan
> operativo paso a paso.

---

## 0. Diagnóstico: por qué esto es urgente ahora

Auditoría del acceso a datos actual (`src/lib/appsScriptPedidos.ts`,
`src/app/api/`, `src/middleware.ts`):

| Ruta | Lee/Escribe | Backend real | Token | Modo demo disponible |
|---|---|---|---|---|
| `GET /api/productos` | Lee | Sí, siempre | No | No |
| `POST /api/pedidos` | **Escribe** (crea pedido, descuenta stock) | Sí, siempre | No | **No** |
| `GET /api/admin/pedidos` | Lee | Sí, siempre | Sí | Sí (`?demo=1`) |
| `GET /api/admin/pedidos/[id]` | Lee | Sí, siempre | Sí | Sí (`?demo=1`) |
| `PATCH /api/admin/pedidos/[id]` | **Escribe** (cambia estado/pago) | Sí, siempre | Sí | Sí (`?demo=1`) |
| `POST /api/admin/pedidos/[id]` | **Escribe** (cancela, devuelve stock) | Sí, siempre | Sí | Sí (`?demo=1`) |

Hallazgo central: **hoy no existe ningún deployment TEST**, así que
`.env.local` — que existe en este repo — solo puede apuntar al backend
productivo (confirmado que el archivo existe; no se leyó su contenido). Eso
significa que, ahora mismo, **correr `npm run dev` y crear un pedido real
desde `/tienda` en local escribe en la Sheet productiva**, sin ningún aviso
ni bloqueo de código. El modo demo (`esModoDemoAdmin`,
`src/lib/fase3a/adminDemo.ts`) cubre la vista de pedidos en `/admin` y ahora
también el calendario de Fase 3B (`CalendarioAperturasDemo`), pero **no cubre
la tienda pública ni la creación de pedidos**, que siempre llaman al backend
real.

El calendario de Fase 3B (`APERTURAS`) hoy tiene **cero** conexión a
backend: toda su lógica (`src/lib/fase3b/`) es pura y su demo vive en
memoria. El riesgo de Fase 3B aparece recién cuando se conecte a un backend
real (Etapa 4 en adelante de `PLAN_IMPLEMENTACION_FASE_3B.md`) — pero el
riesgo de Fase 3A **ya existe hoy**, con o sin Fase 3B.

---

## A. Objetivo del entorno TEST

Permitir probar, sin tocar datos reales del Almacén:

- creación de pedidos;
- confirmación de pedidos (`recibido → pendiente/listo`);
- cancelación de pedidos (con devolución de stock);
- movimientos de stock (descuento, devolución, insuficiencia);
- el calendario de aperturas (crear, editar, cancelar, cerrar/reabrir
  pedidos anticipados);
- el cierre de pedidos anticipados (regla base y overrides manuales);
- el modo presencial QR;
- la venta asistida por vendedor/admin;
- la comanda de papel ingresada al sistema.

## B. Principio de seguridad

- **Producción no se usa para pruebas.** Nunca.
- **La Sheet real no se usa para pruebas.** Toda escritura de prueba va a una
  copia identificada como TEST.
- **Apps Script productivo no se usa para pruebas.** TEST tiene su propio
  proyecto de Apps Script, propio deployment, propio token.
- **Vercel producción no se usa para pruebas.** Las pruebas corren en local
  (`npm run dev`) contra el backend TEST; no se despliega TEST a Vercel en
  esta etapa.
- **Cualquier prueba de escritura debe ir a la copia TEST**, nunca a la
  productiva, verificado tanto por convención humana (nombres, checklist) como
  — donde el código lo permita — por un guardrail que bloquee antes de
  escribir (§ guardrails, más abajo).

## C. Componentes necesarios

1. **Google Sheet TEST**, copia de la estructura real (`BD_WEB_ALMACEN_ROSA_ELENA_MORALES`),
   con nombre que empiece con `TEST -` (ya definido en
   `DECISIONES_BACKEND_ATOMICO_FASE_3A.md` §2.6), más la hoja nueva
   `APERTURAS` y las columnas nuevas de `PEDIDOS`
   (`docs/fase-3b/COLUMNAS_PROPUESTAS_FASE_3B.md`).
2. **Apps Script TEST**, proyecto separado del productivo, con
   `ENVIRONMENT=TEST` y `EXPECTED_SPREADSHEET_NAME` apuntando al nombre de la
   Sheet TEST (diseño ya cerrado en Fase 3A, sin implementar).
3. **Deployment TEST de Apps Script** (Web App), URL propia, distinta de la
   productiva.
4. **Variables de entorno TEST/local** — ver §D.
5. **Token admin TEST**, distinto del productivo, generado nuevo (no
   reutilizar ni derivar del token real).
6. **Datos semilla de prueba** — ver §E.
7. **Procedimiento de reseteo de datos TEST**: duplicar la Sheet TEST vacía
   (con las hojas y encabezados, sin filas de datos) como plantilla, y
   restaurar desde esa copia cuando los datos de prueba queden sucios o
   inconsistentes. Más simple y confiable que intentar "limpiar" filas a
   mano.
8. **Identificación visual clara de modo TEST/demo** — el guardrail de código
   ya expone `ETIQUETA_ENTORNO` (`src/lib/env.ts`) para que, cuando se
   conecte, la UI pueda mostrar un banner "TEST" igual que hoy muestra
   "Modo demo local".
9. **Guardrails para impedir usar endpoints productivos por error** — ver
   más abajo.

## D. Variables de entorno propuestas (nombres, sin valores)

Se agregan a las cuatro que ya existen en `.env.example`
(`GOOGLE_SCRIPT_PEDIDOS_URL`, `GOOGLE_SCRIPT_ADMIN_TOKEN`,
`ADMIN_PANEL_PASSWORD`, `ADMIN_SESSION_SECRET` — esas siguen siendo las de
producción, no se tocan).

| Variable | Propósito |
|---|---|
| `NEXT_PUBLIC_APP_ENV` | `production` \| `test` \| `demo` \| `local`. Ninguna variable de este tipo existe hoy en el proyecto — es la pieza que falta para que el código sepa en qué entorno corre. Normalizada por `obtenerEntornoAplicacion()` (`src/lib/env.ts`); ausente o mal escrita = `desconocido`, nunca `production` por defecto. |
| `GOOGLE_SCRIPT_PEDIDOS_URL_TEST` | URL `.../exec` de la Web App de Apps Script TEST. Nunca la misma que `GOOGLE_SCRIPT_PEDIDOS_URL`. |
| `GOOGLE_SCRIPT_ADMIN_TOKEN_TEST` | Token admin del Apps Script TEST. Nunca el mismo que `GOOGLE_SCRIPT_ADMIN_TOKEN`. |
| `ADMIN_PANEL_PASSWORD_TEST` | Contraseña del panel admin cuando se prueba contra TEST. Puede ser distinta de la productiva para no acostumbrarse a escribir la real por reflejo. |
| `ADMIN_SESSION_SECRET_TEST` | Secreto de firma de sesión para pruebas. No reutilizar el productivo. |

**`NEXT_PUBLIC_APP_ENV`, `GOOGLE_SCRIPT_PEDIDOS_URL_TEST` y
`GOOGLE_SCRIPT_ADMIN_TOKEN_TEST` ya están en `.env.example`**, con valores
vacíos — es lo único que este documento cambió en `.env.example`.
`ADMIN_PANEL_PASSWORD_TEST` y `ADMIN_SESSION_SECRET_TEST` siguen siendo
propuesta sin implementar: el login del panel admin no forma parte de esta
conexión, sigue usando `ADMIN_PANEL_PASSWORD`/`ADMIN_SESSION_SECRET`
productivos incluso en `NEXT_PUBLIC_APP_ENV=test`. **`.env.local` real nunca
se leyó ni se modificó** en ninguna sesión — configurarlo con valores TEST
reales sigue siendo un paso manual de quien vaya a probar localmente.

## E. Datos semilla TEST propuestos

**Productos:**

| Producto | Qué cubre |
|---|---|
| Producto con stock suficiente | Caso normal |
| Producto con stock bajo (cerca de `stock_minimo`) | Alerta de stock bajo |
| Producto agotado (`stock_actual = 0`) | No se puede pedir |
| Producto a granel (`permite_decimal=true`, `paso_venta=0.25`) | Validación de múltiplos |
| Producto por unidad (`permite_decimal=false`) | Validación de enteros |

**Pedidos**, uno por cada estado de `docs/fase-3a/MODELO_ESTADOS_PEDIDOS.md`:

- pedido `recibido`
- pedido `pendiente`
- pedido `listo`
- pedido `entregado`
- pedido `cancelado`

**Aperturas**, cubriendo los mismos 6 escenarios ya usados en la demo local
(`src/lib/fase3b/aperturasDemoData.ts`, para que TEST y demo compartan el
mismo criterio y sea fácil comparar resultados):

- apertura `programada` (futura)
- apertura `activa`
- apertura `cerrada`
- apertura `cancelada`
- apertura con `pedidos_anticipados_estado = pausado` (pedidos anticipados
  cerrados a mano)
- apertura con `modo_presencial_estado = activo`

## F. Riesgos

| Riesgo | Cómo se mitiga |
|---|---|
| Usar la URL productiva por error en local | `NEXT_PUBLIC_APP_ENV` + `assertNoProduccionParaEscritura()` (§ guardrails); revisión manual del checklist antes de escribir |
| Descontar stock real durante una prueba | Ídem — ninguna escritura debería ejecutarse si el entorno no es explícitamente `test`/`local` |
| Duplicar pedidos reales al probar creación | Usar solo la Sheet TEST; nunca apuntar `.env.local` de pruebas al backend productivo |
| Mezclar tokens (admin real en llamada TEST, o viceversa) | Nombres de variable distintos y explícitos (`_TEST`), nunca un solo par de variables reutilizado |
| Probar el modo QR con datos productivos | El modo QR (Etapa 6) no se conecta a nada real todavía; cuando se conecte, debe apuntar solo a TEST, nunca a producción, mismo guardrail que el resto |
| No distinguir demo/local/test/producción a simple vista | `ETIQUETA_ENTORNO` (`src/lib/env.ts`) ya definida para mostrar un banner visible una vez que se conecte a la UI real |

---

## G. Resultado de pruebas manuales — 2026-08-19

Entorno confirmado operativo: Sheet TEST creada como copia de trabajo; Apps
Script TEST creado, autorizado y desplegado como Web App independiente de
producción. Pruebas ejecutadas **directamente contra la Web App TEST**
(fuera de la aplicación Next.js, que todavía no está conectada — ver paso 9
del plan operativo). Producción no fue tocada en ningún momento.

⚠️ **Ningún valor real (URL, token, ID de Sheet) se registra aquí.** La URL
de la Web App TEST quedó guardada solo en un archivo local de Drive; el
token TEST quedó guardado solo en
`archivo local temporal no versionado para token TEST` (fuera del repo
versionado). Ninguno de los dos se pegó en este documento ni en ningún otro
archivo del repo.

### G.1 Resultados

| # | Prueba | Resultado |
|---|---|---|
| 1 | Lectura pública `listarProductos` | OK — `ok: true`, 53 productos leídos |
| 2 | Lectura admin `listarPedidos` (token TEST local) | OK — `ok: true`, 4 pedidos existentes en la copia TEST |
| 3 | Creación de pedido TEST | OK — `PED-20260819-135759`, `PROD-001` (Arroz) × 1, total `1320`, estado inicial `pendiente` |
| 4 | Descuento de stock | OK — stock de `PROD-001` pasó de 99 a 98 al crear el pedido |
| 5 | Cancelación de pedido | OK — `PED-20260819-135759` cancelado, 1 ítem devuelto, stock vuelve a 99 |
| 6 | Idempotencia de cancelación | OK — segunda cancelación del mismo pedido respondió `ya_cancelado: true`, stock se mantuvo en 99 (sin doble devolución) |

### G.2 Nota sobre el estado inicial `pendiente`

El pedido de prueba nació en `pendiente` y descontó stock **al crearse**, no
en `recibido` sin descuento. Esto es **el comportamiento actual del Apps
Script ya desplegado en producción**, copiado tal cual a TEST — no el modelo
atómico nuevo de `docs/fase-3a/MODELO_ESTADOS_PEDIDOS.md` ni el contrato
propuesto en `docs/fase-3a/CONTRATO_APPS_SCRIPT_PROPUESTO.md`, que todavía no
se implementó en ningún Apps Script, ni productivo ni TEST. La prueba
confirma que **TEST replica fielmente el comportamiento real actual**, que es
exactamente lo que se necesitaba verificar en esta ronda — no confirma (ni
pretendía confirmar) el modelo nuevo.

### G.3 Conclusión y próximo paso

El entorno TEST de Apps Script y Google Sheet quedó **operativo** para
pruebas controladas de lectura, escritura, descuento de stock, cancelación y
devolución idempotente de stock, sin tocar producción.

**Próximo paso: el código de conexión ya existe** (`resolverConfigPorEntorno`
en `src/lib/appsScriptPedidos.ts`, ver "Guardrails de código" más abajo) —
falta que alguien configure `NEXT_PUBLIC_APP_ENV=test` y las variables
`_TEST` con valores reales en su propio `.env.local` (paso 9 del plan
operativo, local, nunca commiteado). Hasta que eso ocurra, la aplicación
Next.js sigue usando producción por defecto y sin ninguna vía de probar
contra TEST desde la UI — las pruebas de esta ronda fueron directas contra el
backend, no a través de `/tienda` ni `/admin`.

---

## Guardrails de código agregados en esta sesión

`src/lib/env.ts` — módulo puro. Funciones:

- `obtenerEntornoAplicacion(valor)` — normaliza el valor crudo de
  `NEXT_PUBLIC_APP_ENV` a `'production' | 'test' | 'demo' | 'local' | 'desconocido'`.
  Ausente o irreconocible = `'desconocido'`, nunca `'production'` por
  defecto.
- `esEntornoSeguroParaPruebas(entorno)` — `true` solo para `test`, `demo`,
  `local`.
- `requiereConfigTest(entorno)` — `true` solo para `test` (indica si hace
  falta que existan las variables `_TEST`).
- `validarConfigEntornoTest(config, clavesRequeridas)` — detecta claves
  ausentes o vacías en un mapa de configuración ya leído; no compara valores
  contra nada productivo.
- `assertNoProduccionParaEscritura(entorno)` — lanza excepción si el entorno
  no es exactamente `test` o `local`. Pensada como primera línea de defensa
  de cualquier función futura que escriba contra un backend TEST.
- `ETIQUETA_ENTORNO` — etiquetas legibles (`'TEST'`, `'Producción'`, etc.)
  para un futuro banner de UI.
- **`resolverConfigPorEntorno(entorno, config)`** — nueva en esta sesión.
  Compone las cuatro funciones anteriores para decidir, de forma pura, qué
  valor de configuración usar (URL de backend o token admin) según el
  entorno: si no es `test`, usa el valor productivo sin cambios; si es
  `test`, exige el valor `_TEST` y bloquea si coincide con el productivo.
  Es la pieza que **conecta** este módulo con `appsScriptPedidos.ts` (ver
  abajo).

### Conexión real: `src/lib/appsScriptPedidos.ts`

`baseUrl()` y `adminToken()` ahora llaman a `resolverConfigPorEntorno()` en
vez de leer `GOOGLE_SCRIPT_PEDIDOS_URL`/`GOOGLE_SCRIPT_ADMIN_TOKEN`
directamente:

- Si `NEXT_PUBLIC_APP_ENV` no es `test` (incluido ausente/desconocido, que es
  el caso de producción hoy): usa las variables productivas, **exactamente
  igual que antes** — mismo texto de error si faltan
  (`"Falta GOOGLE_SCRIPT_PEDIDOS_URL en el entorno del servidor."`), mismo
  comportamiento en todo lo demás.
- Si `NEXT_PUBLIC_APP_ENV=test`: usa `GOOGLE_SCRIPT_PEDIDOS_URL_TEST` /
  `GOOGLE_SCRIPT_ADMIN_TOKEN_TEST`. Si faltan, lanza `AppsScriptError` con un
  mensaje explícito indicando qué variable falta. Si el valor TEST coincide
  con el productivo (ambos configurados), también bloquea con un mensaje
  explícito — nunca deja que TEST y producción apunten al mismo backend.

Se agregaron también las claves `NEXT_PUBLIC_APP_ENV`,
`GOOGLE_SCRIPT_PEDIDOS_URL_TEST` y `GOOGLE_SCRIPT_ADMIN_TOKEN_TEST` a
`.env.example`, con valores vacíos — ningún valor real.

**Lo que falta para que esto funcione de punta a punta:** que alguien
configure `NEXT_PUBLIC_APP_ENV=test` y las dos variables `_TEST` con los
valores reales en su propio `.env.local` (nunca commiteado). Sin eso, la app
sigue usando producción exactamente como hasta ahora — el cambio de esta
sesión es aditivo y no requiere que nadie toque nada para seguir funcionando
igual que hoy.

33 tests nuevos en total sobre `src/lib/env.ts` en `tests/entorno-test.test.mjs`
(23 de la sesión anterior + 10 de `resolverConfigPorEntorno` en esta) —
126/126 en total.

**Por qué no se conectó todavía:** conectar `env.ts` a
`appsScriptPedidos.ts` sin que existan las variables `_TEST` reales no
tendría nada que probar, y tocar ese archivo es tocar el único camino que
hoy escribe en producción — el instructivo de esta sesión pide explícitamente
no crear un endpoint que escriba en real y no romper producción. La conexión
real queda para cuando el entorno TEST exista (Etapa 3 avanzada / Etapa 4 del
plan de implementación).

---

## Plan operativo para crear TEST real (pasos manuales para Omar)

Estado por paso al 2026-08-19. Ningún paso escribió ni leyó producción; no se
generaron ni se registraron IDs, URLs ni tokens en el repo.

1. ✅ Crear una copia completa de la Google Sheet productiva
   (`Archivo → Hacer una copia`).
2. ✅ Nombrarla empezando con `TEST -` (coincide con
   `EXPECTED_SPREADSHEET_NAME` diseñado en
   `DECISIONES_BACKEND_ATOMICO_FASE_3A.md` §2.6).
3. 🔄 Revisar que la copia tenga todas las hojas necesarias: `PRODUCTOS`,
   `PEDIDOS`, `DETALLE_PEDIDOS`, `MOVIMIENTOS_STOCK` ya confirmadas
   funcionales (lectura y escritura probadas, §G). Las hojas nuevas de Fase
   3B (`APERTURAS`, `HISTORIAL_PEDIDOS`, `OPERACIONES_PEDIDOS`) **no** se
   agregaron todavía.
4. ⬜ Vaciar los pedidos reales copiados. No confirmado en esta ronda de
   pruebas — la copia TEST ya tenía 4 pedidos al momento de probar (§G.2);
   no está registrado si son datos reales copiados o semilla ya cargada.
   Verificar antes de dar este paso por cerrado.
5. ⬜ Cargar los datos semilla completos de §E de este documento (productos
   con stock bajo/agotado/granel, pedido por cada estado, las 6 aperturas).
   No confirmado como hecho.
6. ✅ Duplicar el proyecto de Apps Script
   (`scripts/apps-script-pedidos.gs` como punto de partida) en un proyecto
   nuevo, separado del productivo.
7. ✅ Configurar el script y desplegarlo como Web App TEST, autorizada.
8. ✅ Crear un token admin nuevo, exclusivo de TEST (no reutilizar el
   productivo). Guardado solo localmente, fuera del repo (ver advertencia al
   inicio del documento).
9. 🔄 Configurar las variables `_TEST` de §D en `.env.local` **local**, sin
   commitear nada. `.env.example` ya tiene las claves vacías
   (`NEXT_PUBLIC_APP_ENV`, `GOOGLE_SCRIPT_PEDIDOS_URL_TEST`,
   `GOOGLE_SCRIPT_ADMIN_TOKEN_TEST`) y `appsScriptPedidos.ts` ya sabe
   usarlas. **Falta solo que alguien ponga los valores reales en su propio
   `.env.local`** — las pruebas de §G se hicieron directamente contra la Web
   App TEST, sin pasar por la aplicación Next.js todavía.
10. ✅ Probar lectura: `listarProductos` (53 productos) y `listarPedidos`
    (4 pedidos) contra el deployment TEST — §G.1, §G.2.
11. ✅ Probar escritura controlada: crear un pedido de prueba — §G.3.
12. ✅ Probar stock: descuento al crear, devolución al cancelar, e
    idempotencia de la cancelación (sin doble devolución) — §G.4, §G.5, §G.6.
    Caso de stock insuficiente **no** probado todavía.
13. ⬜ Probar calendario: crear/editar/cancelar una apertura TEST, verificar
    que `obtenerEstadoPublicoWeb` calculado coincide con lo esperado. No
    probado — la hoja `APERTURAS` no existe aún en la Sheet TEST (paso 3).
14. ⬜ Probar modo presencial: activar `modo_presencial_estado` en una
    apertura TEST y verificar el flujo. No probado, depende del paso 13.
15. ⬜ Solo después de 9–14 aprobados, evaluar cualquier integración
    adicional (panel admin real, tienda en modo presencial) — nunca antes.

---

## Resumen para decidir rápido

**Hecho:** diagnóstico de riesgo, estrategia documentada, guardrails de
código puro (`src/lib/env.ts`), Sheet TEST creada, Apps Script TEST
creado/autorizado/desplegado, token TEST generado (guardado solo localmente),
pruebas manuales de lectura, escritura, stock, cancelación e idempotencia
verificadas directamente contra la Web App TEST (2026-08-19, §G), y **la
conexión de código entre Next.js y el entorno TEST**
(`resolverConfigPorEntorno` en `appsScriptPedidos.ts`, con bloqueo explícito
si falta configuración TEST o si coincide con producción, más las claves
nuevas en `.env.example`). Producción no fue tocada en ningún momento; el
comportamiento productivo actual no cambió.

**No hecho:** hoja `APERTURAS` en la Sheet TEST, datos semilla completos de
§E, pruebas de calendario y modo presencial, y — lo único que falta para
probar de punta a punta — **que alguien configure `NEXT_PUBLIC_APP_ENV=test`
y las variables `_TEST` con valores reales en su propio `.env.local`**. Sin
eso, la aplicación sigue sin ninguna vía de probar contra TEST desde
`/tienda` o `/admin` (usa producción por defecto, como siempre).

