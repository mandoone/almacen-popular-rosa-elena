# ENTORNO_TEST_FASE_3B.md â€” Estrategia de entorno TEST (compartido Fase 3A + 3B)

> Estado: **entorno TEST de Apps Script + Google Sheet creado y verificado
> con pruebas manuales (2026-08-19) â€” ver Â§G.** ProducciÃ³n no fue tocada en
> ningÃºn momento. Next.js local todavÃ­a **no** estÃ¡ conectado al entorno
> TEST: sigue siendo el prÃ³ximo paso (Â§G.3).
>
> âš ï¸ **NingÃºn token, URL real de Web App TEST ni ID de Sheet se registra en
> este documento ni en ningÃºn otro archivo versionado.** La URL TEST vive
> solo en un archivo local de Drive; el token TEST vive solo en
> `archivo local temporal no versionado para token TEST` (ignorado por git, fuera
> del repo versionado). Si algÃºn valor real llega a aparecer en un commit,
> debe tratarse como incidente de seguridad, no como error documental menor.
>
> Este documento es **compartido** entre Fase 3A y Fase 3B: no tiene sentido
> un entorno TEST solo para pedidos y otro solo para calendario â€” es la misma
> Sheet, el mismo Apps Script, el mismo despliegue. Complementa, sin
> reemplazar, `docs/fase-3a/CHECKLIST_ENTORNO_TEST_FASE_3A.md` (checklist ya
> aprobado, centrado en el backend atÃ³mico) y
> `docs/fase-3a/DECISIONES_BACKEND_ATOMICO_FASE_3A.md` Â§2.6 (diseÃ±o de
> `ENVIRONMENT`/`EXPECTED_SPREADSHEET_NAME` en Apps Script, ya definido, no
> implementado). Este documento agrega lo que faltaba: el diagnÃ³stico de
> riesgo actual, las variables y guardrails del lado Next.js, los datos
> semilla que tambiÃ©n cubren calendario/QR/venta asistida, y el plan
> operativo paso a paso.

---

## 0. DiagnÃ³stico: por quÃ© esto es urgente ahora

AuditorÃ­a del acceso a datos actual (`src/lib/appsScriptPedidos.ts`,
`src/app/api/`, `src/middleware.ts`):

| Ruta | Lee/Escribe | Backend real | Token | Modo demo disponible |
|---|---|---|---|---|
| `GET /api/productos` | Lee | SÃ­, siempre | No | No |
| `POST /api/pedidos` | **Escribe** (crea pedido, descuenta stock) | SÃ­, siempre | No | **No** |
| `GET /api/admin/pedidos` | Lee | SÃ­, siempre | SÃ­ | SÃ­ (`?demo=1`) |
| `GET /api/admin/pedidos/[id]` | Lee | SÃ­, siempre | SÃ­ | SÃ­ (`?demo=1`) |
| `PATCH /api/admin/pedidos/[id]` | **Escribe** (cambia estado/pago) | SÃ­, siempre | SÃ­ | SÃ­ (`?demo=1`) |
| `POST /api/admin/pedidos/[id]` | **Escribe** (cancela, devuelve stock) | SÃ­, siempre | SÃ­ | SÃ­ (`?demo=1`) |

Hallazgo central: **hoy no existe ningÃºn deployment TEST**, asÃ­ que
`.env.local` â€” que existe en este repo â€” solo puede apuntar al backend
productivo (confirmado que el archivo existe; no se leyÃ³ su contenido). Eso
significa que, ahora mismo, **correr `npm run dev` y crear un pedido real
desde `/tienda` en local escribe en la Sheet productiva**, sin ningÃºn aviso
ni bloqueo de cÃ³digo. El modo demo (`esModoDemoAdmin`,
`src/lib/fase3a/adminDemo.ts`) cubre la vista de pedidos en `/admin` y ahora
tambiÃ©n el calendario de Fase 3B (`CalendarioAperturasDemo`), pero **no cubre
la tienda pÃºblica ni la creaciÃ³n de pedidos**, que siempre llaman al backend
real.

El calendario de Fase 3B (`APERTURAS`) hoy tiene **cero** conexiÃ³n a
backend: toda su lÃ³gica (`src/lib/fase3b/`) es pura y su demo vive en
memoria. El riesgo de Fase 3B aparece reciÃ©n cuando se conecte a un backend
real (Etapa 4 en adelante de `PLAN_IMPLEMENTACION_FASE_3B.md`) â€” pero el
riesgo de Fase 3A **ya existe hoy**, con o sin Fase 3B.

---

## A. Objetivo del entorno TEST

Permitir probar, sin tocar datos reales del AlmacÃ©n:

- creaciÃ³n de pedidos;
- confirmaciÃ³n de pedidos (`recibido â†’ pendiente/listo`);
- cancelaciÃ³n de pedidos (con devoluciÃ³n de stock);
- movimientos de stock (descuento, devoluciÃ³n, insuficiencia);
- el calendario de aperturas (crear, editar, cancelar, cerrar/reabrir
  pedidos anticipados);
- el cierre de pedidos anticipados (regla base y overrides manuales);
- el modo presencial QR;
- la venta asistida por vendedor/admin;
- la comanda de papel ingresada al sistema.

## B. Principio de seguridad

- **ProducciÃ³n no se usa para pruebas.** Nunca.
- **La Sheet real no se usa para pruebas.** Toda escritura de prueba va a una
  copia identificada como TEST.
- **Apps Script productivo no se usa para pruebas.** TEST tiene su propio
  proyecto de Apps Script, propio deployment, propio token.
- **Vercel producciÃ³n no se usa para pruebas.** Las pruebas corren en local
  (`npm run dev`) contra el backend TEST; no se despliega TEST a Vercel en
  esta etapa.
- **Cualquier prueba de escritura debe ir a la copia TEST**, nunca a la
  productiva, verificado tanto por convenciÃ³n humana (nombres, checklist) como
  â€” donde el cÃ³digo lo permita â€” por un guardrail que bloquee antes de
  escribir (Â§ guardrails, mÃ¡s abajo).

## C. Componentes necesarios

1. **Google Sheet TEST**, copia de la estructura real (`BD_WEB_ALMACEN_ROSA_ELENA_MORALES`),
   con nombre que empiece con `TEST -` (ya definido en
   `DECISIONES_BACKEND_ATOMICO_FASE_3A.md` Â§2.6), mÃ¡s la hoja nueva
   `APERTURAS` y las columnas nuevas de `PEDIDOS`
   (`docs/fase-3b/COLUMNAS_PROPUESTAS_FASE_3B.md`).
2. **Apps Script TEST**, proyecto separado del productivo, con
   `ENVIRONMENT=TEST` y `EXPECTED_SPREADSHEET_NAME` apuntando al nombre de la
   Sheet TEST (diseÃ±o ya cerrado en Fase 3A, sin implementar).
3. **Deployment TEST de Apps Script** (Web App), URL propia, distinta de la
   productiva.
4. **Variables de entorno TEST/local** â€” ver Â§D.
5. **Token admin TEST**, distinto del productivo, generado nuevo (no
   reutilizar ni derivar del token real).
6. **Datos semilla de prueba** â€” ver Â§E.
7. **Procedimiento de reseteo de datos TEST**: duplicar la Sheet TEST vacÃ­a
   (con las hojas y encabezados, sin filas de datos) como plantilla, y
   restaurar desde esa copia cuando los datos de prueba queden sucios o
   inconsistentes. MÃ¡s simple y confiable que intentar "limpiar" filas a
   mano.
8. **IdentificaciÃ³n visual clara de modo TEST/demo** â€” el guardrail de cÃ³digo
   ya expone `ETIQUETA_ENTORNO` (`src/lib/env.ts`) para que, cuando se
   conecte, la UI pueda mostrar un banner "TEST" igual que hoy muestra
   "Modo demo local".
9. **Guardrails para impedir usar endpoints productivos por error** â€” ver
   mÃ¡s abajo.

## D. Variables de entorno propuestas (nombres, sin valores)

Se agregan a las cuatro que ya existen en `.env.example`
(`GOOGLE_SCRIPT_PEDIDOS_URL`, `GOOGLE_SCRIPT_ADMIN_TOKEN`,
`ADMIN_PANEL_PASSWORD`, `ADMIN_SESSION_SECRET` â€” esas siguen siendo las de
producciÃ³n, no se tocan).

| Variable | PropÃ³sito |
|---|---|
| `NEXT_PUBLIC_APP_ENV` | `production` \| `test` \| `demo` \| `local`. Ninguna variable de este tipo existe hoy en el proyecto â€” es la pieza que falta para que el cÃ³digo sepa en quÃ© entorno corre. Normalizada por `obtenerEntornoAplicacion()` (`src/lib/env.ts`); ausente o mal escrita = `desconocido`, nunca `production` por defecto. |
| `GOOGLE_SCRIPT_PEDIDOS_URL_TEST` | URL `.../exec` de la Web App de Apps Script TEST. Nunca la misma que `GOOGLE_SCRIPT_PEDIDOS_URL`. |
| `GOOGLE_SCRIPT_ADMIN_TOKEN_TEST` | Token admin del Apps Script TEST. Nunca el mismo que `GOOGLE_SCRIPT_ADMIN_TOKEN`. |
| `ADMIN_PANEL_PASSWORD_TEST` | ContraseÃ±a del panel admin cuando se prueba contra TEST. Puede ser distinta de la productiva para no acostumbrarse a escribir la real por reflejo. |
| `ADMIN_SESSION_SECRET_TEST` | Secreto de firma de sesiÃ³n para pruebas. No reutilizar el productivo. |

**No se modifica `.env.local` real ni se escribe ningÃºn valor** en esta
sesiÃ³n. Cuando exista el entorno TEST real, `.env.example` debe actualizarse
para documentar estas claves (con valores vacÃ­os, igual que las actuales) â€”
queda como paso manual del plan operativo (Â§ Bloque 4), no hecho aquÃ­.

## E. Datos semilla TEST propuestos

**Productos:**

| Producto | QuÃ© cubre |
|---|---|
| Producto con stock suficiente | Caso normal |
| Producto con stock bajo (cerca de `stock_minimo`) | Alerta de stock bajo |
| Producto agotado (`stock_actual = 0`) | No se puede pedir |
| Producto a granel (`permite_decimal=true`, `paso_venta=0.25`) | ValidaciÃ³n de mÃºltiplos |
| Producto por unidad (`permite_decimal=false`) | ValidaciÃ³n de enteros |

**Pedidos**, uno por cada estado de `docs/fase-3a/MODELO_ESTADOS_PEDIDOS.md`:

- pedido `recibido`
- pedido `pendiente`
- pedido `listo`
- pedido `entregado`
- pedido `cancelado`

**Aperturas**, cubriendo los mismos 6 escenarios ya usados en la demo local
(`src/lib/fase3b/aperturasDemoData.ts`, para que TEST y demo compartan el
mismo criterio y sea fÃ¡cil comparar resultados):

- apertura `programada` (futura)
- apertura `activa`
- apertura `cerrada`
- apertura `cancelada`
- apertura con `pedidos_anticipados_estado = pausado` (pedidos anticipados
  cerrados a mano)
- apertura con `modo_presencial_estado = activo`

## F. Riesgos

| Riesgo | CÃ³mo se mitiga |
|---|---|
| Usar la URL productiva por error en local | `NEXT_PUBLIC_APP_ENV` + `assertNoProduccionParaEscritura()` (Â§ guardrails); revisiÃ³n manual del checklist antes de escribir |
| Descontar stock real durante una prueba | Ãdem â€” ninguna escritura deberÃ­a ejecutarse si el entorno no es explÃ­citamente `test`/`local` |
| Duplicar pedidos reales al probar creaciÃ³n | Usar solo la Sheet TEST; nunca apuntar `.env.local` de pruebas al backend productivo |
| Mezclar tokens (admin real en llamada TEST, o viceversa) | Nombres de variable distintos y explÃ­citos (`_TEST`), nunca un solo par de variables reutilizado |
| Probar el modo QR con datos productivos | El modo QR (Etapa 6) no se conecta a nada real todavÃ­a; cuando se conecte, debe apuntar solo a TEST, nunca a producciÃ³n, mismo guardrail que el resto |
| No distinguir demo/local/test/producciÃ³n a simple vista | `ETIQUETA_ENTORNO` (`src/lib/env.ts`) ya definida para mostrar un banner visible una vez que se conecte a la UI real |

---

## G. Resultado de pruebas manuales â€” 2026-08-19

Entorno confirmado operativo: Sheet TEST creada como copia de trabajo; Apps
Script TEST creado, autorizado y desplegado como Web App independiente de
producciÃ³n. Pruebas ejecutadas **directamente contra la Web App TEST**
(fuera de la aplicaciÃ³n Next.js, que todavÃ­a no estÃ¡ conectada â€” ver paso 9
del plan operativo). ProducciÃ³n no fue tocada en ningÃºn momento.

âš ï¸ **NingÃºn valor real (URL, token, ID de Sheet) se registra aquÃ­.** La URL
de la Web App TEST quedÃ³ guardada solo en un archivo local de Drive; el
token TEST quedÃ³ guardado solo en
`archivo local temporal no versionado para token TEST` (fuera del repo
versionado). Ninguno de los dos se pegÃ³ en este documento ni en ningÃºn otro
archivo del repo.

### G.1 Resultados

| # | Prueba | Resultado |
|---|---|---|
| 1 | Lectura pÃºblica `listarProductos` | OK â€” `ok: true`, 53 productos leÃ­dos |
| 2 | Lectura admin `listarPedidos` (token TEST local) | OK â€” `ok: true`, 4 pedidos existentes en la copia TEST |
| 3 | CreaciÃ³n de pedido TEST | OK â€” `PED-20260819-135759`, `PROD-001` (Arroz) Ã— 1, total `1320`, estado inicial `pendiente` |
| 4 | Descuento de stock | OK â€” stock de `PROD-001` pasÃ³ de 99 a 98 al crear el pedido |
| 5 | CancelaciÃ³n de pedido | OK â€” `PED-20260819-135759` cancelado, 1 Ã­tem devuelto, stock vuelve a 99 |
| 6 | Idempotencia de cancelaciÃ³n | OK â€” segunda cancelaciÃ³n del mismo pedido respondiÃ³ `ya_cancelado: true`, stock se mantuvo en 99 (sin doble devoluciÃ³n) |

### G.2 Nota sobre el estado inicial `pendiente`

El pedido de prueba naciÃ³ en `pendiente` y descontÃ³ stock **al crearse**, no
en `recibido` sin descuento. Esto es **el comportamiento actual del Apps
Script ya desplegado en producciÃ³n**, copiado tal cual a TEST â€” no el modelo
atÃ³mico nuevo de `docs/fase-3a/MODELO_ESTADOS_PEDIDOS.md` ni el contrato
propuesto en `docs/fase-3a/CONTRATO_APPS_SCRIPT_PROPUESTO.md`, que todavÃ­a no
se implementÃ³ en ningÃºn Apps Script, ni productivo ni TEST. La prueba
confirma que **TEST replica fielmente el comportamiento real actual**, que es
exactamente lo que se necesitaba verificar en esta ronda â€” no confirma (ni
pretendÃ­a confirmar) el modelo nuevo.

### G.3 ConclusiÃ³n y prÃ³ximo paso

El entorno TEST de Apps Script y Google Sheet quedÃ³ **operativo** para
pruebas controladas de lectura, escritura, descuento de stock, cancelaciÃ³n y
devoluciÃ³n idempotente de stock, sin tocar producciÃ³n.

**PrÃ³ximo paso: conectar Next.js local al entorno TEST mediante variables
locales seguras** (paso 9 del plan operativo â€” `.env.local` local, nunca
commiteado; `.env.example` actualizado solo con las claves vacÃ­as de Â§D).
Hasta que eso ocurra, la aplicaciÃ³n Next.js sigue sin ninguna vÃ­a de probar
contra TEST desde la UI: las pruebas de esta ronda fueron directas contra el
backend, no a travÃ©s de `/tienda` ni `/admin`.

---

## Guardrails de cÃ³digo agregados en esta sesiÃ³n

Se agregÃ³ `src/lib/env.ts` â€” mÃ³dulo puro, sin conexiÃ³n a nada real todavÃ­a
(ver cabecera del archivo). No se conectÃ³ a `appsScriptPedidos.ts` ni a
ninguna ruta de `src/app/api/`: conectar estos guardrails a un flujo real es
un paso posterior explÃ­cito, que requiere que las variables `_TEST` de Â§D ya
existan. Funciones:

- `obtenerEntornoAplicacion(valor)` â€” normaliza el valor crudo de
  `NEXT_PUBLIC_APP_ENV` a `'production' | 'test' | 'demo' | 'local' | 'desconocido'`.
  Ausente o irreconocible = `'desconocido'`, nunca `'production'` por
  defecto.
- `esEntornoSeguroParaPruebas(entorno)` â€” `true` solo para `test`, `demo`,
  `local`.
- `requiereConfigTest(entorno)` â€” `true` solo para `test` (indica si hace
  falta que existan las variables `_TEST`).
- `validarConfigEntornoTest(config, clavesRequeridas)` â€” detecta claves
  ausentes o vacÃ­as en un mapa de configuraciÃ³n ya leÃ­do; no compara valores
  contra nada productivo.
- `assertNoProduccionParaEscritura(entorno)` â€” lanza excepciÃ³n si el entorno
  no es exactamente `test` o `local`. Pensada como primera lÃ­nea de defensa
  de cualquier funciÃ³n futura que escriba contra un backend TEST.
- `ETIQUETA_ENTORNO` â€” etiquetas legibles (`'TEST'`, `'ProducciÃ³n'`, etc.)
  para un futuro banner de UI.

23 tests nuevos en `tests/entorno-test.test.mjs` â€” 116/116 en total (con los
93 ya existentes de Fase 3A/3B).

**Por quÃ© no se conectÃ³ todavÃ­a:** conectar `env.ts` a
`appsScriptPedidos.ts` sin que existan las variables `_TEST` reales no
tendrÃ­a nada que probar, y tocar ese archivo es tocar el Ãºnico camino que
hoy escribe en producciÃ³n â€” el instructivo de esta sesiÃ³n pide explÃ­citamente
no crear un endpoint que escriba en real y no romper producciÃ³n. La conexiÃ³n
real queda para cuando el entorno TEST exista (Etapa 3 avanzada / Etapa 4 del
plan de implementaciÃ³n).

---

## Plan operativo para crear TEST real (pasos manuales para Omar)

Estado por paso al 2026-08-19. NingÃºn paso escribiÃ³ ni leyÃ³ producciÃ³n; no se
generaron ni se registraron IDs, URLs ni tokens en el repo.

1. âœ… Crear una copia completa de la Google Sheet productiva
   (`Archivo â†’ Hacer una copia`).
2. âœ… Nombrarla empezando con `TEST -` (coincide con
   `EXPECTED_SPREADSHEET_NAME` diseÃ±ado en
   `DECISIONES_BACKEND_ATOMICO_FASE_3A.md` Â§2.6).
3. ðŸ”„ Revisar que la copia tenga todas las hojas necesarias: `PRODUCTOS`,
   `PEDIDOS`, `DETALLE_PEDIDOS`, `MOVIMIENTOS_STOCK` ya confirmadas
   funcionales (lectura y escritura probadas, Â§G). Las hojas nuevas de Fase
   3B (`APERTURAS`, `HISTORIAL_PEDIDOS`, `OPERACIONES_PEDIDOS`) **no** se
   agregaron todavÃ­a.
4. â¬œ Vaciar los pedidos reales copiados. No confirmado en esta ronda de
   pruebas â€” la copia TEST ya tenÃ­a 4 pedidos al momento de probar (Â§G.2);
   no estÃ¡ registrado si son datos reales copiados o semilla ya cargada.
   Verificar antes de dar este paso por cerrado.
5. â¬œ Cargar los datos semilla completos de Â§E de este documento (productos
   con stock bajo/agotado/granel, pedido por cada estado, las 6 aperturas).
   No confirmado como hecho.
6. âœ… Duplicar el proyecto de Apps Script
   (`scripts/apps-script-pedidos.gs` como punto de partida) en un proyecto
   nuevo, separado del productivo.
7. âœ… Configurar el script y desplegarlo como Web App TEST, autorizada.
8. âœ… Crear un token admin nuevo, exclusivo de TEST (no reutilizar el
   productivo). Guardado solo localmente, fuera del repo (ver advertencia al
   inicio del documento).
9. â¬œ Configurar las variables `_TEST` de Â§D en `.env.local` **local**, sin
   commitear nada, y actualizar `.env.example` con las claves vacÃ­as. **Este
   es el prÃ³ximo paso** â€” Next.js local todavÃ­a no habla con el entorno
   TEST; las pruebas de Â§G se hicieron directamente contra la Web App TEST,
   sin pasar por la aplicaciÃ³n.
10. âœ… Probar lectura: `listarProductos` (53 productos) y `listarPedidos`
    (4 pedidos) contra el deployment TEST â€” Â§G.1, Â§G.2.
11. âœ… Probar escritura controlada: crear un pedido de prueba â€” Â§G.3.
12. âœ… Probar stock: descuento al crear, devoluciÃ³n al cancelar, e
    idempotencia de la cancelaciÃ³n (sin doble devoluciÃ³n) â€” Â§G.4, Â§G.5, Â§G.6.
    Caso de stock insuficiente **no** probado todavÃ­a.
13. â¬œ Probar calendario: crear/editar/cancelar una apertura TEST, verificar
    que `obtenerEstadoPublicoWeb` calculado coincide con lo esperado. No
    probado â€” la hoja `APERTURAS` no existe aÃºn en la Sheet TEST (paso 3).
14. â¬œ Probar modo presencial: activar `modo_presencial_estado` en una
    apertura TEST y verificar el flujo. No probado, depende del paso 13.
15. â¬œ Solo despuÃ©s de 9â€“14 aprobados, evaluar cualquier integraciÃ³n
    adicional (panel admin real, tienda en modo presencial) â€” nunca antes.

---

## Resumen para decidir rÃ¡pido

**Hecho:** diagnÃ³stico de riesgo, estrategia documentada, guardrails de
cÃ³digo puro sin conectar (`src/lib/env.ts`), Sheet TEST creada, Apps Script
TEST creado/autorizado/desplegado, token TEST generado (guardado solo
localmente), y pruebas manuales de lectura, escritura, stock, cancelaciÃ³n e
idempotencia verificadas directamente contra la Web App TEST (2026-08-19,
Â§G). ProducciÃ³n no fue tocada en ningÃºn momento.

**No hecho:** hoja `APERTURAS` en la Sheet TEST, datos semilla completos de
Â§E, pruebas de calendario y modo presencial, y â€” el mÃ¡s importante â€” **la
conexiÃ³n de Next.js local al entorno TEST** (variables `_TEST` en
`.env.local`, todavÃ­a sin configurar). Sin esa conexiÃ³n, la aplicaciÃ³n sigue
sin ninguna vÃ­a de probar contra TEST desde `/tienda` o `/admin`.

