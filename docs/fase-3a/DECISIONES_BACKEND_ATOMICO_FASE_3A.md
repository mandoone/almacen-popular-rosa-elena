# DECISIONES_BACKEND_ATOMICO_FASE_3A.md — Especificación previa

> Estado: **decisiones técnicas propuestas; no implementadas**
>
> Fecha: **2026-08-12**
>
> Rama: `feature/fase-3a-operativa`
>
> Línea base documental: `1fcdbc9 docs: registrar qa local y plan backend fase 3a`

Este documento resuelve las contradicciones detectadas entre el plan atómico, el
contrato propuesto y las columnas de Sheets. No autoriza cambios en Google Sheets,
Apps Script, Next.js, Vercel ni producción.

Las decisiones marcadas como **propuesta cerrada** se consideran la opción técnica
recomendada, pero todavía requieren aprobación de Omar antes de implementarse. Las
marcadas como **abiertas** necesitan evidencia o una decisión adicional.

## 1. Estado

La parte local de Next.js que no modifica el backend está completada:

- el proxy admin valida las transiciones de Fase 3A;
- el panel deriva sus acciones de `transicionesPosibles()`;
- existe un modo demo aislado para desarrollo local;
- el QA visual del modo demo fue aprobado;
- la última validación técnica registrada del proyecto es **46/46 tests**, además
  de lint y build correctos. Esa validación no se volvió a ejecutar para crear
  este documento, porque esta etapa es exclusivamente documental.

El backend productivo todavía conserva el modelo anterior: los pedidos nacen en
`pendiente` y descuentan stock al crearse. La copia `.gs` del repositorio tampoco
es prueba suficiente del código actualmente desplegado.

## 2. Decisiones propuestas

### 2.1 Semántica de stock y `fecha_confirmacion`

**Decisión: propuesta cerrada.**

`fecha_confirmacion` será un marcador histórico e inmutable. Significa:

> Este pedido descontó stock al menos una vez, ya sea al confirmarse bajo Fase 3A
> o al crearse bajo el modelo heredado.

No significa que el stock continúe actualmente comprometido. Una cancelación
posterior devuelve el stock, pero no borra la evidencia histórica de que antes se
había descontado.

El stock se considera actualmente descontado del inventario solo cuando se cumple:

```text
fecha_confirmacion no está vacía
Y estado_pedido pertenece a pendiente | listo | entregado
```

Reglas derivadas:

| Estado | `fecha_confirmacion` | Stock actualmente descontado | Tratamiento |
|---|---|---:|---|
| `recibido` | vacía | No | Situación normal para un pedido nuevo |
| `recibido` | con valor | Indeterminado | Inconsistencia; marcar para revisión |
| `pendiente` | con valor | Sí | Situación normal |
| `listo` | con valor | Sí | Situación normal |
| `entregado` | con valor | Sí | El stock salió y no se devuelve |
| `cancelado` | vacía | No | Se canceló antes de descontar |
| `cancelado` | con valor | No | Se había descontado y luego fue devuelto |
| estado ilegible | cualquiera | No inferir | Bloquear mutaciones y revisar manualmente |

`fecha_confirmacion` se escribe una sola vez en `recibido → pendiente` o
`recibido → listo`. Los cambios posteriores no la reemplazan ni la borran.

Para pedidos heredados se puede poblar con la fecha de migración porque fueron
creados bajo un modelo que descontaba stock al crear. Antes de hacerlo se debe
auditar cualquier estado ilegible y reconciliar los cancelados contra movimientos.

**No se recomienda agregar `stock_aplicado` en esta etapa.** Mantener dos campos
editables para la misma verdad aumentaría el riesgo de divergencia. Solo deberá
reabrirse esta decisión si el ensayo demuestra casos reales que no puedan
determinarse con estado, `fecha_confirmacion` y movimientos de stock.

### 2.2 Códigos de error

**Decisión: propuesta cerrada.**

Aunque Apps Script pueda devolver HTTP 200 en el transporte, el cuerpo incluirá un
`codigo` lógico que Next.js propagará:

| Código | Casos | Escrituras |
|---:|---|---|
| `400` | payload incompleto; acción mal formada; estado solicitado, esperado o almacenado ilegible; motivo o responsable requerido ausente | Ninguna |
| `401` | token inválido | Ninguna |
| `404` | pedido inexistente | Ninguna |
| `409` | `estado_esperado` distinto; transición inválida; `operacion_id` reutilizado con otro payload; stock insuficiente | Ninguna nueva |
| `500` | error interno no recuperable | Detener y reconciliar si la operación había comenzado |
| `503` | timeout de `LockService` o indisponibilidad temporal | Ninguna si no se adquirió el lock |

El tipo de error debe acompañar al código, por ejemplo `peticion_invalida`,
`estado_ilegible`, `estado_desactualizado`, `transicion_invalida`,
`stock_insuficiente`, `operacion_duplicada`, `operacion_incierta` u
`operacion_ocupada`.

No habrá reintento automático de una mutación sin idempotencia. Ante `503`, timeout
de red o respuesta incierta, Next.js consultará primero el resultado de la misma
`operacion_id`. No generará otra operación para repetir silenciosamente el cambio.

### 2.3 Compatibilidad heredada

**Decisión: compatibilidad temporal propuesta, pendiente de aprobar su ventana.**

La acción nueva `cambiarEstadoPedido` exige siempre `estado_esperado`,
`responsable` y, al cancelar, `motivo_cancelacion`. No completa silenciosamente
campos ausentes.

Durante una ventana de despliegue coordinada podrán conservarse los alias
`actualizarEstadoPedido` y `cancelarPedido` bajo estas restricciones:

1. Debe existir una propiedad explícita `ALLOW_LEGACY_ADMIN_ACTIONS=true`.
2. Los alias deben entrar al mismo `ScriptLock`, matriz de transiciones, validación
   de stock, idempotencia y núcleo de escritura que la acción nueva.
3. El estado real se lee dentro del lock y se usa como referencia interna. Se
   acepta que el alias no ofrece bloqueo optimista al cliente; por eso el modo es
   temporal, visible en auditoría y no una solución permanente.
4. `actualizarEstadoPedido` solo puede ejecutar transiciones válidas o una
   actualización de pago compatible. Nunca puede cancelar por un camino que no
   devuelva stock.
5. Si `cancelarPedido` no trae motivo o responsable, el adaptador registra
   `motivo_cancelacion = compatibilidad_heredada`,
   `responsable = sistema_legacy_nextjs`, una observación automática y
   `requiere_revision = SI`. No se inventa una persona ni un motivo operacional.
6. Toda llamada heredada se registra con acción, fecha, pedido y
   `compatibilidad_heredada = SI`.
7. Los alias no admiten reintento automático y deben retirarse después de
   confirmar que Next.js ya usa el contrato nuevo.

Si `ALLOW_LEGACY_ADMIN_ACTIONS` no es exactamente `true`, ambas acciones se
rechazan con `400`, tipo `accion_obsoleta`, mensaje que indique usar
`cambiarEstadoPedido`, y cero escrituras.

El modo de compatibilidad nunca estará habilitado por defecto en un proyecto nuevo.

### 2.4 Idempotencia con `operacion_id`

**Decisión: propuesta cerrada.**

Toda mutación nueva usará `operacion_id`. Para llamadas originadas en la web:

- Next.js lo genera con un UUID criptográficamente aleatorio por intención del
  usuario;
- el mismo ID se conserva si se consulta o reintenta la misma operación después
  de una respuesta incierta;
- una acción nueva del usuario genera un ID nuevo;
- Apps Script no reemplaza ni regenera un ID recibido.

Se propone una hoja aditiva `OPERACIONES_PEDIDOS` como diario técnico, separada del
historial operacional. Campos mínimos:

| Campo | Propósito |
|---|---|
| `operacion_id` | Clave única |
| `fecha_inicio` / `fecha_fin` | Auditoría temporal |
| `accion` / `id_pedido` | Alcance de la mutación |
| `hash_solicitud` | Detectar un mismo ID con payload diferente |
| `estado_operacion` | `preparada`, `completada`, `fallida`, `requiere_revision` |
| `plan_cambios` | Valores anteriores, nuevos y deltas previstos, sin secretos |
| `resultado` | Respuesta lógica mínima para repetición segura |
| `detalle_error` | Diagnóstico sanitizado |

Comportamiento al recibir un ID repetido:

- mismo hash y `completada`: no se escribe nada y se devuelve el resultado ya
  registrado con `repetida: true`;
- hash distinto: `409 operacion_id_reutilizado`;
- `preparada`, `fallida` o `requiere_revision`: no se reaplica automáticamente;
  se devuelve `409 operacion_incierta` y se inicia reconciliación;
- ID nuevo: se procesa normalmente dentro del lock.

`operacion_id` también se escribirá en `MOVIMIENTOS_STOCK` y
`HISTORIAL_PEDIDOS`. Así se puede demostrar que un descuento o devolución ocurrió
una sola vez y enlazar todos los efectos de una misma operación.

Los alias heredados que no envíen ID recibirán uno interno con prefijo `legacy-`.
Ese ID sirve para auditoría de una ejecución, pero no convierte reintentos de un
cliente antiguo en idempotentes. La protección adicional será la transición de
estado y la prohibición de reintento automático.

### 2.5 Atomicidad parcial y orden de escrituras

**Decisión: propuesta cerrada como estrategia de contención.**

`LockService` evita carreras, pero no convierte varias hojas en una transacción.
Antes de escribir se debe leer y validar todo dentro del lock, calcular el plan
completo en memoria y registrar una operación `preparada` con valores anteriores,
nuevos y deltas. Solo entonces comienza la aplicación del plan.

Orden recomendado por tipo de operación:

#### Cambio de estado con impacto de stock

```text
1. OPERACIONES_PEDIDOS = preparada
2. PRODUCTOS: aplicar todos los nuevos stocks calculados
3. MOVIMIENTOS_STOCK: agregar movimientos con operacion_id
4. PEDIDOS: escribir estado y campos asociados
5. HISTORIAL_PEDIDOS: registrar el cambio
6. OPERACIONES_PEDIDOS = completada + resultado
7. SpreadsheetApp.flush()
```

Se prioriza que un pedido no aparezca confirmado o cancelado antes de aplicar el
impacto de inventario. El diario conserva el plan necesario si el proceso se corta
después de modificar productos.

#### Cambio de estado sin impacto de stock o registro de pago

```text
1. OPERACIONES_PEDIDOS = preparada
2. PEDIDOS: escribir el cambio
3. HISTORIAL_PEDIDOS: registrar el cambio
4. OPERACIONES_PEDIDOS = completada + resultado
5. SpreadsheetApp.flush()
```

#### Creación de pedido `recibido`

```text
1. OPERACIONES_PEDIDOS = preparada y reservar id_pedido
2. DETALLE_PEDIDOS: escribir líneas completas
3. PEDIDOS: escribir cabecera en recibido, sin descontar stock
4. HISTORIAL_PEDIDOS: registrar creación
5. OPERACIONES_PEDIDOS = completada + resultado
6. SpreadsheetApp.flush()
```

Un detalle huérfano es más fácil de detectar y aislar por `id_pedido` que una
cabecera visible sin detalle. La operación preparada permite identificarlo.

Si falla una escritura intermedia:

1. no continuar con pasos posteriores;
2. capturar el error sin incluir token ni URL;
3. intentar marcar la operación como `requiere_revision`;
4. no reejecutar ni compensar automáticamente dentro de la misma petición;
5. bloquear nuevas mutaciones de ese pedido hasta reconciliar;
6. comparar `plan_cambios`, pedido, detalle, productos, movimientos e historial;
7. decidir con evidencia si se completa hacia adelante o se revierte;
8. registrar la corrección con una `operacion_id` nueva y referencia a la original.

La reconciliación deberá verificar al menos:

- un único estado final por pedido;
- stock resultante igual al valor anterior más la suma de deltas confirmados;
- un movimiento por cada delta aplicado;
- ausencia de movimientos duplicados por `operacion_id` y producto;
- detalle y total coherentes;
- historial y diario enlazados.

Esta estrategia hace las fallas detectables y recuperables, pero no promete
rollback automático multitabla.

### 2.6 Conexión Apps Script–Sheet TEST

**Decisión de diseño cerrada; mecanismo productivo aún sin confirmar.**

La documentación y `scripts/apps-script-pedidos.gs` del repositorio muestran
`SpreadsheetApp.openById(SPREADSHEET_ID)` con una constante configurada a mano.
El propio contrato advierte que la copia `.gs` no es necesariamente el código que
corre. Por lo tanto, todavía falta inspeccionar de forma separada y de solo lectura
el proyecto realmente desplegado antes de crear el entorno TEST.

Para TEST y para una futura versión productiva:

- no se usará `getActiveSpreadsheet()` ni otra selección implícita;
- el ID se leerá de una propiedad del script `SPREADSHEET_ID`;
- también existirán `ENVIRONMENT`, `EXPECTED_SPREADSHEET_NAME` y el token
  correspondiente al entorno;
- `ENVIRONMENT` solo aceptará `TEST` o `PRODUCTION`;
- TEST y producción tendrán proyectos, propiedades, tokens y deployments distintos;
- antes de atender una acción, el script abrirá por ID y comprobará que el nombre
  coincide con `EXPECTED_SPREADSHEET_NAME`;
- en `TEST`, el nombre esperado deberá comenzar con `TEST -`;
- una inconsistencia de entorno, ID o nombre producirá `500
  configuracion_insegura` sin realizar escrituras.

Las propiedades reales y sus valores no se documentarán ni versionarán.

### 2.7 Actualización del plan general

**Decisión: diferida a una etapa documental posterior.**

`PLAN_IMPLEMENTACION_FASE_3A.md` debe actualizarse para registrar:

- proxy admin: completado;
- UI de acciones por estado: completada;
- modo demo local: completado;
- QA visual del demo: aprobado;
- última suite registrada: 46/46 tests, no 29;
- filtro `Recibido`, pagos, responsables, edición y backend real: pendientes según
  su alcance efectivo.

No se reescribe ese documento en esta etapa para mantener el cambio limitado a
esta especificación.

## 3. Decisiones aún abiertas

Antes de implementar hay que cerrar explícitamente:

1. Aprobar o rechazar el modo de compatibilidad temporal y definir su fecha de
   retirada, responsable y orden exacto de despliegue.
2. Inspeccionar en modo lectura el Apps Script desplegado y confirmar versión,
   uso real de `SPREADSHEET_ID`, locks, acciones y deployment. No se deben copiar
   secretos al repo ni al informe.
3. Aprobar la creación de `OPERACIONES_PEDIDOS` y las columnas `operacion_id` en
   movimientos e historial.
4. Definir cuánto tiempo se conservará el diario de operaciones.
5. Diseñar y ensayar el procedimiento operativo que resuelve operaciones
   `requiere_revision`; el código no debe decidir automáticamente entre completar
   o revertir.
6. Auditar datos heredados para comprobar que la regla histórica de
   `fecha_confirmacion` representa correctamente cancelaciones y estados libres.
7. Definir cómo se obtiene el responsable real mientras exista una contraseña
   admin compartida. `sistema_legacy_nextjs` solo identifica al adaptador, no a una
   persona.
8. Fijar el timeout del lock y los límites de tamaño de `plan_cambios` y
   `resultado`; el código lógico `503` ya queda decidido.

## 4. Impacto en Apps Script

La implementación futura requerirá:

- portar la máquina de estados y mantenerla alineada con `estados.ts`;
- crear un núcleo único para cambios de estado;
- exigir `estado_esperado`, `responsable` y `operacion_id` en el contrato nuevo;
- adquirir el `ScriptLock` antes de releer estado, stock e idempotencia;
- propagar códigos lógicos `400`, `409` y `503` según esta especificación;
- consultar y actualizar el diario de operaciones;
- incluir `operacion_id` en movimientos e historial;
- detectar pedidos con operaciones inciertas y bloquear nuevas mutaciones;
- implementar los alias solo bajo la propiedad temporal autorizada;
- reemplazar constantes pegadas en código por propiedades del script;
- validar explícitamente entorno, ID y nombre del Sheet.

Nada de esto se implementará primero en el proyecto productivo. Debe comenzar en
una copia identificada de Apps Script conectada a una copia identificada del Sheet.

## 5. Impacto en Sheets

Además de las columnas ya propuestas, esta especificación agrega para evaluación:

- hoja `OPERACIONES_PEDIDOS`;
- columna `operacion_id` en `MOVIMIENTOS_STOCK`;
- columna `operacion_id` en `HISTORIAL_PEDIDOS`;
- restricciones lógicas de unicidad por operación y, en movimientos, por
  operación más producto.

`fecha_confirmacion` conserva su columna propuesta, pero cambia su definición: es
histórica, no un indicador suficiente del compromiso actual. No se agrega
`stock_aplicado` salvo evidencia del ensayo.

Todas las estructuras nuevas deben ser aditivas, probarse en una copia y quedar
incluidas en backup, reconciliación y rollback.

## 6. Impacto en Next.js

Next.js deberá:

- enviar `cambiarEstadoPedido` con `estado_esperado` tomado de la UI;
- generar `operacion_id` por intención del usuario;
- conservarlo ante timeout o consulta de resultado;
- no reemplazar el estado esperado con una lectura silenciosa antes de reintentar;
- no reintentar mutaciones automáticamente sin consultar la operación;
- mostrar mensajes claros para `400`, `409` y `503`;
- ante `estado_desactualizado`, recargar el pedido y pedir una nueva decisión;
- ante `operacion_incierta`, bloquear la acción y solicitar revisión;
- dejar de usar los alias antes de deshabilitar la compatibilidad.

La UI demo y las reglas puras no necesitan cambiar por estas decisiones.

## 7. Riesgos

1. El diario de operaciones mejora detección y recuperación, pero sigue sin haber
   transacciones reales entre hojas.
2. Un fallo al escribir `OPERACIONES_PEDIDOS` puede impedir registrar el estado de
   una operación; por eso no se inicia ninguna otra escritura si no quedó
   `preparada`.
3. Un cliente heredado carece de bloqueo optimista e idempotencia entre requests.
4. Marcar pedidos heredados sin auditar movimientos puede ocultar inconsistencias
   anteriores.
5. Dos fuentes editables para stock causarían divergencia; por eso no se propone
   `stock_aplicado` por ahora.
6. La identidad de quien opera sigue siendo declarativa mientras la sesión admin
   sea compartida.
7. Configurar un ID equivocado podría conectar TEST a producción; las propiedades
   y salvaguardas deben validarse antes de la primera escritura.
8. Cambiar backend y frontend en un orden incompatible puede romper el panel o
   dejar activo el modo heredado más tiempo del acordado.

## 8. Requisitos antes de crear entorno TEST

Antes de copiar o configurar recursos deben existir:

1. aprobación de las decisiones de este documento;
2. checklist versionado para crear y verificar las copias TEST;
3. nombres únicos para Sheet, Apps Script y deployment TEST;
4. inspección de solo lectura del mecanismo real de conexión productiva;
5. inventario de hojas, encabezados, acciones y versión desplegada, sin secretos;
6. esquema aprobado de `OPERACIONES_PEDIDOS` y columnas de `operacion_id`;
7. fixture mínimo con todos los estados, stock suficiente, insuficiente y
   productos compartidos para concurrencia;
8. matriz de resultados esperados para stock, errores e idempotencia;
9. procedimiento de reconciliación de operaciones parciales;
10. backup y rollback ensayables exclusivamente sobre las copias;
11. variables y tokens TEST separados, no versionados y nunca cargados en Vercel;
12. confirmación de que ninguna URL, ID o propiedad TEST apunta a producción.

## 9. Criterio de aprobación

Esta especificación se considera aprobada para pasar a la creación del entorno
TEST cuando Omar confirme explícitamente:

- la semántica histórica de `fecha_confirmacion` y la decisión de no agregar
  `stock_aplicado` por ahora;
- la tabla `400/409/503`;
- si se habilitará la compatibilidad temporal y durante qué ventana;
- el uso obligatorio de `operacion_id` y del diario de operaciones;
- el orden de escrituras y la política de no compensar automáticamente;
- el uso de propiedades del script y las salvaguardas de entorno;
- las decisiones abiertas con responsable y fecha de resolución.

La aprobación autoriza preparar copias y pruebas, no modificar ni desplegar
producción.

## 10. Documentos a actualizar después

Una vez aprobada esta especificación, se recomienda actualizar en una pasada
documental separada:

1. `PLAN_BACKEND_ATOMICO_FASE_3A.md`: semántica histórica, idempotencia, diario,
   orden de escrituras, errores y compatibilidad.
2. `CONTRATO_APPS_SCRIPT_PROPUESTO.md`: `operacion_id`, payload de alias, códigos
   `400/409/503` y respuestas repetidas o inciertas.
3. `COLUMNAS_SHEETS_PROPUESTAS.md`: corregir el invariante de
   `fecha_confirmacion` y agregar las estructuras de idempotencia aprobadas.
4. `PLAN_IMPLEMENTACION_FASE_3A.md`: actualizar progreso, dependencias y la cifra
   registrada de 46/46 tests.
5. Crear `CHECKLIST_ENTORNO_TEST_FASE_3A.md` con responsables, evidencias y
   criterios go/no-go.
