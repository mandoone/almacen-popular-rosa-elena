# ENTORNO_TEST_FASE_3B.md — Estrategia de entorno TEST (compartido Fase 3A + 3B)

> Estado: **estrategia documentada + guardrails de código puro. No se creó
> ningún recurso TEST real.** No se tocó Google Sheets, Apps Script
> productivo, Vercel ni `.env.local`. No se inventó ningún ID, URL ni token.
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

**No se modifica `.env.local` real ni se escribe ningún valor** en esta
sesión. Cuando exista el entorno TEST real, `.env.example` debe actualizarse
para documentar estas claves (con valores vacíos, igual que las actuales) —
queda como paso manual del plan operativo (§ Bloque 4), no hecho aquí.

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

## Guardrails de código agregados en esta sesión

Se agregó `src/lib/env.ts` — módulo puro, sin conexión a nada real todavía
(ver cabecera del archivo). No se conectó a `appsScriptPedidos.ts` ni a
ninguna ruta de `src/app/api/`: conectar estos guardrails a un flujo real es
un paso posterior explícito, que requiere que las variables `_TEST` de §D ya
existan. Funciones:

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

23 tests nuevos en `tests/entorno-test.test.mjs` — 116/116 en total (con los
93 ya existentes de Fase 3A/3B).

**Por qué no se conectó todavía:** conectar `env.ts` a
`appsScriptPedidos.ts` sin que existan las variables `_TEST` reales no
tendría nada que probar, y tocar ese archivo es tocar el único camino que
hoy escribe en producción — el instructivo de esta sesión pide explícitamente
no crear un endpoint que escriba en real y no romper producción. La conexión
real queda para cuando el entorno TEST exista (Etapa 3 avanzada / Etapa 4 del
plan de implementación).

---

## Plan operativo para crear TEST real (pasos manuales para Omar)

Ningún paso de esta lista se ejecutó en esta sesión. No se generaron ni se
inventaron IDs, URLs ni tokens.

1. Crear una copia completa de la Google Sheet productiva
   (`Archivo → Hacer una copia`).
2. Nombrarla empezando con `TEST -` (coincide con `EXPECTED_SPREADSHEET_NAME`
   diseñado en `DECISIONES_BACKEND_ATOMICO_FASE_3A.md` §2.6).
3. Revisar que la copia tenga todas las hojas necesarias: `PRODUCTOS`,
   `PEDIDOS`, `DETALLE_PEDIDOS`, `MOVIMIENTOS_STOCK`, y agregar las nuevas
   (`APERTURAS`, `HISTORIAL_PEDIDOS`, `OPERACIONES_PEDIDOS` si corresponde
   según el estado de aprobación de esos diseños).
4. Vaciar los pedidos reales copiados (la copia trae todo lo productivo);
   dejar solo `PRODUCTOS` y `CONFIG` como base, sin `PEDIDOS` reales.
5. Cargar los datos semilla de §E de este documento.
6. Duplicar el proyecto de Apps Script (`scripts/apps-script-pedidos.gs` como
   punto de partida) en un proyecto nuevo, separado del productivo.
7. Configurar `SPREADSHEET_ID`, `ENVIRONMENT=TEST` y
   `EXPECTED_SPREADSHEET_NAME` como propiedades del script (no como
   constantes pegadas en el código, según el diseño ya aprobado) y desplegar
   como Web App TEST.
8. Crear un token admin nuevo, exclusivo de TEST (no reutilizar el
   productivo).
9. Configurar las variables `_TEST` de §D en `.env.local` **local**, sin
   commitear nada, y actualizar `.env.example` con las claves vacías.
10. Probar lectura: `listarProductos`, `listarPedidos` contra el deployment
    TEST.
11. Probar escritura controlada: crear un pedido de prueba, confirmar que
    aparece en la Sheet TEST y no en la productiva.
12. Probar stock: descuento al confirmar, devolución al cancelar, caso de
    stock insuficiente.
13. Probar calendario: crear/editar/cancelar una apertura TEST, verificar
    que `obtenerEstadoPublicoWeb` calculado coincide con lo esperado.
14. Probar modo presencial: activar `modo_presencial_estado` en una apertura
    TEST y verificar el flujo, sin clientes reales.
15. Solo después de 10–14 aprobados, evaluar cualquier integración adicional
    (panel admin real, tienda en modo presencial) — nunca antes.

---

## Resumen para decidir rápido

**Esta sesión:** diagnóstico de riesgo actual, estrategia documentada,
guardrails de código puro sin conectar, variables propuestas (solo nombres),
datos semilla propuestos, plan operativo de 15 pasos.

**No hecho, y no se debe hacer sin este plan ejecutado primero:** crear la
Sheet TEST, el Apps Script TEST, el deployment TEST, ningún token, ninguna
conexión real desde Next.js.
