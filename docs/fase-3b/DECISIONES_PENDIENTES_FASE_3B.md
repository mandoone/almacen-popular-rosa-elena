# DECISIONES_PENDIENTES_FASE_3B.md — F.1 y F.3, con recomendación

> Estado: **✅ APROBADAS por coordinación** como criterio base para avanzar a
> demo local (Etapa 2). Ver §0. La recomendación técnica original de este
> documento (§1–§2) se mantiene sin cambios: coordinación aprobó exactamente lo
> recomendado, sin modificaciones. Esto **no autoriza** integración real,
> Sheets, Apps Script ni producción — sigue siendo diseño y, desde ahora,
> también demo local (Etapa 2).
> Cierra las dos preguntas abiertas más relevantes de
> `docs/fase-3b/MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md` §F: F.1 (venta
> presencial asistida) y F.3 (selección de apertura relevante). F.2 y F.4 no
> se tocan aquí — siguen tal como quedaron documentadas, porque son de bajo
> impacto y no bloquean ninguna etapa próxima.

## 0. Aprobación

Coordinación aprobó ambas recomendaciones tal como quedaron documentadas en
§1 y §2, sin modificaciones:

- **F.1:** la venta presencial asistida nace en `listo` (no `recibido`, no
  `entregado`). Motivo confirmado por coordinación: evita la ventana ciega de
  caja, mantiene trazabilidad, no usa `entregado` como estado inicial
  terminal, permite corregir antes de finalizar la entrega, es compatible con
  Fase 3A. Coincide punto por punto con el análisis de §1.3.
- **F.3:** orden de prioridad determinista — (1) modo presencial usable ahora,
  (2) apertura activa de hoy, (3) próxima apertura programada, (4) `null` si
  no hay apertura clara. El solapamiento o conflicto **no se adivina**: se
  trata como conflicto explícito. Coincide con §2.1.

**Alcance de esta aprobación:** habilita construir la Etapa 2 (demo local del
calendario en `/admin?demo=1`) usando estos criterios como base de los datos
simulados. **No** habilita la Etapa 4 (integración admin real), la Etapa 6
(modo presencial QR real) ni la Etapa 7 (venta asistida real): esas etapas
siguen requiriendo, además de esta aprobación de criterio, el entorno TEST
(Etapa 3) y el diseño del contrato de backend correspondiente, ninguno de los
cuales existe todavía.
>
> Producto de una auditoría de coherencia entre
> `MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md`,
> `COLUMNAS_PROPUESTAS_FASE_3B.md`, `PLAN_IMPLEMENTACION_FASE_3B.md`,
> `PLAN_PRUEBAS_FASE_3B.md` y `src/lib/fase3b/*.ts` — ver el resumen de esa
> auditoría en §3.

---

## 1. F.1 — Venta presencial asistida: ¿en qué estado nace?

Aplica a los dos orígenes donde alguien del Almacén registra una venta que
**ya ocurrió físicamente** antes de tocar el sistema: `presencial_vendedor`
(el vendedor arma y cobra en el momento) y `comanda_papel` (se transcribe una
comanda de papel, en el momento o después). `presencial_qr` **no** está en
discusión aquí: ya quedó decidido que nace en `recibido`, igual que un pedido
web, porque lo arma el cliente solo y sí necesita revisión antes de
comprometer stock (§E de `MODELO_DATOS...md`).

### 1.1 Las tres opciones

**Opción A — nace en `recibido`, se confirma después.**
Mismo camino que un pedido web: `recibido → pendiente/listo`. Cero cambios en
`estados.ts` ni en el contrato de creación; reutiliza `crearPedido_` tal cual.

**Opción B — nace directamente en `pendiente` o `listo`.**
Requiere un nuevo camino de creación (una variante de `crearPedido_` que
descuenta stock al crear, no al confirmar), pero no toca la matriz de
transiciones: el pedido sigue siendo reversible (puede cancelarse y devuelve
stock, puede pasar por `pendiente ↔ listo`).

**Opción C — nace directamente en `entregado`.**
Requiere el mismo nuevo camino de creación que B, más la validación de pago
completo (`validarEntrega`) en el momento de crear. `entregado` es terminal
(`MODELO_ESTADOS_PEDIDOS.md` §3.2): no hay transición de vuelta, solo la
"acción distinta y explícita" para revertir una entrega que ese mismo
documento deja como pendiente sin resolver todavía.

### 1.2 Análisis por criterio

| Criterio | Opción A (`recibido`) | Opción B (`pendiente`/`listo`) | Opción C (`entregado`) |
|---|---|---|---|
| **Trazabilidad** | La mejor: mismo ciclo de vida completo que cualquier pedido, con el evento de confirmación explícito en `HISTORIAL_PEDIDOS`. | Buena: se pierde un evento de transición, pero la creación puede registrarse con su propio `accion = creacion_confirmada` en el historial. | Buena en el momento, pero cualquier corrección posterior sale del modelo normal de historial y entra al procedimiento especial de reversión de entrega (que hoy **no existe**, ver §3.2 de `MODELO_ESTADOS_PEDIDOS.md`). |
| **Caja** | Riesgo real: el dinero ya se cobró, pero el sistema todavía no lo refleja hasta el segundo paso. Si nadie confirma, la venta es invisible para caja aunque la plata ya esté en la caja física. | Coincide con la realidad: se cobra y se descuenta stock en el mismo instante que se registra. | Igual que B, pero además exige que el pago quede completo *antes* de poder guardar la venta — puede ser una traba si se cobra en efectivo y se registra un segundo después. |
| **Stock** | Cero riesgo nuevo: usa exactamente el invariante ya probado (`recibido` no compromete, `pendiente`/`listo` sí). | Requiere un nuevo invariante de creación ("nace ya comprometiendo stock"), pero **no** reabre la matriz de transiciones de `estados.ts` — es aditivo. | Mismo requisito que B, más el caso límite de que un pedido nazca y termine en la misma operación (creación + entrega simultánea), que hoy no tiene precedente en el modelo. |
| **Simplicidad operativa** | Peor: dos pasos para una venta que ya ocurrió en un solo momento físico. Y con el rol vendedor de FASE 2 (aún no existe), sería peor todavía: confirmar es admin-only (§1.3 de `DECISIONES_OPERATIVAS_FASE_3B.md`), así que un vendedor sin login admin no podría cerrar su propia venta. | La mejor: un paso, coincide con "cobrar y entregar es un solo evento" en el mostrador. | Un paso también, pero sin red de seguridad: `esEditable` solo aplica a `recibido` (§3.4 de `MODELO_ESTADOS_PEDIDOS.md`), así que un error de tipeo en la cantidad queda atrapado en un pedido terminal. |
| **Compatibilidad con Fase 3A** | Total — cero superficie nueva. | Parcial — un nuevo camino de creación, pero reutiliza `estados.ts` sin modificarlo. | Parcial — mismo nuevo camino que B, más una dependencia de un procedimiento de reversión de entrega que **no está diseñado** todavía en ningún documento de Fase 3A. |
| **Uso real del Almacén** (operación voluntaria, probablemente apurada en horario de apertura) | No calza con el momento: revisar después algo que ya se cobró es trabajo extra sin beneficio real. | Calza con el momento: un solo gesto para una sola acción física. | Calza con el momento, pero sin margen de error para un volunariado sin caja registradora profesional. |

### 1.3 Recomendación (✅ Aprobada por coordinación, ver §0)

**Opción B, con un matiz:** que la venta asistida nazca directamente en
**`listo`** (no en `pendiente`), con el pago registrado como parte de la misma
operación de creación (reutilizando la validación de método y responsable de
pago que ya existe para pagos, sin exigir el chequeo completo de
`validarEntrega` que exige C). El "Entregado" queda como un segundo toque
explícito, separado, que representa el momento físico de entregar la bolsa —
no la creación del pedido.

Por qué no A ni C tal cual:

- **No A:** un pedido que ya se cobró y hoy no está reflejado en el sistema es
  el peor escenario para caja — es exactamente el tipo de "ventana ciega"
  que todos los documentos de Fase 3A intentan evitar (`DECISIONES_BACKEND_ATOMICO_FASE_3A.md`
  §2.5 sobre atomicidad). Además, quedaría bloqueado por el mismo admin-only de
  confirmación que ya rige para pedidos anticipados (§1.3 de
  `DECISIONES_OPERATIVAS_FASE_3B.md`), lo cual es una fricción mayor cuando
  exista el rol vendedor.
- **No C tal cual:** remueve toda posibilidad de corregir un error de tipeo sin
  inventar un procedimiento de reversión que hoy no existe en ningún
  documento. El costo de ese procedimiento (diseñarlo, probarlo, no
  automatizarlo) es mayor que el beneficio de ahorrarse un tap.
- **B con el matiz `listo` en vez de `pendiente`:** una venta asistida ya está,
  por definición, lista para entregar (el vendedor la armó y la cobró en el
  momento; no hay una etapa de "preparación" pendiente como sí la hay para un
  pedido anticipado que se prepara antes de la apertura). Aterrizar en
  `pendiente` agregaría un paso sin sentido operativo real.

### 1.4 Riesgos de la recomendación

1. Requiere una nueva operación atómica de creación en el backend ("crear +
   comprometer stock + registrar pago" en un solo paso), que no existe hoy ni
   en `crearPedido_` ni en el contrato propuesto de
   `CONTRATO_APPS_SCRIPT_PROPUESTO.md`. Es trabajo nuevo, no reutilización.
2. Si el stock no alcanza al momento de la venta asistida, el vendedor lo
   sabe de inmediato (a diferencia de un pedido anticipado, donde el
   desabastecimiento se descubre recién al confirmar) — hay que decidir el
   mensaje de error en el momento, no diseñado todavía.
3. Mientras no exista el rol vendedor (FASE 2), quien registra la venta usa la
   sesión admin compartida — la trazabilidad de "quién" sigue siendo
   declarativa, mismo límite ya documentado para F.1 de Fase 3A
   (`PENDIENTES_CAROLINA_NADIA.md` P3/P4).

### 1.5 Qué debe validar el Almacén

Nada de esto bloquea al Almacén — es una decisión de modelado interno. Sí
vale la pena una validación **liviana y no bloqueante**: cuando exista la
Etapa 2 (demo local), mostrarle a quien vaya a vender en el mostrador el flujo
de un solo tap y confirmar que se siente natural, en vez de preguntarlo en
abstracto ahora.

### 1.6 Qué puede decidir desarrollo sin bloquear al Almacén

Todo lo de esta sección: la elección entre A/B/C es un asunto de modelado de
datos y atomicidad, no una pregunta operativa para Carolina/Nadia. Desarrollo
puede aprobar y avanzar el diseño de la Etapa 7 sin esperar respuesta externa.

### 1.7 Impacto en la próxima etapa (demo local)

La Etapa 2 (demo local, sin Sheets real) puede construirse **sin** resolver
F.1 primero: el modo demo solo necesita mostrar datos de ejemplo con distintos
`origen_pedido` y estados ya fijados, no necesita ejecutar la lógica de
creación real. F.1 sí bloquea la Etapa 7 (venta asistida real), que está más
adelante en el plan.

---

## 2. F.3 — Selección de la apertura relevante

Cuando `APERTURAS` tiene más de un registro, ¿cuál le muestra la web pública a
`obtenerEstadoPublicoWeb()`? Hoy esa función recibe una apertura ya elegida (o
`null`); falta la función que elige.

### 2.1 Recomendación: orden de prioridad determinista (✅ Aprobada por coordinación, ver §0)

1. **Si existe exactamente una apertura con modo presencial usable ahora mismo**
   (`puedeUsarModoPresencial` verdadero) → esa es la relevante. Máxima
   prioridad: hay alguien físicamente en el local en este instante.
2. **Si no, si existe exactamente una apertura `activa` cuya fecha es hoy**
   (aunque el modo presencial esté apagado) → esa es la relevante. Sigue
   siendo "la apertura de hoy".
3. **Si no, entre las aperturas con `estado_apertura` en `{activa,
   programada}` y `fecha_apertura` mayor o igual a hoy** → la de fecha más
   próxima (mínimo `fecha_apertura`). Es "la próxima apertura".
4. **Si ninguna califica** → no hay apertura relevante (`null`,
   `sin_apertura_programada`). Esto incluye el caso en que todas las
   aperturas cargadas están en `por_confirmar`: una fecha tentativa no cuenta
   como "programada" para efectos de selección pública.
5. **Aperturas `cancelada`:** se muestran como relevantes (`apertura_cancelada`)
   únicamente hasta su propia `fecha_apertura`. Pasada esa fecha, se
   descartan de la selección como cualquier apertura vencida — no tiene
   sentido seguir anunciando la cancelación de algo que ya pasó en el
   calendario.
6. **Empates o solapamiento** (dos aperturas activas al mismo tiempo, o dos
   con la misma `fecha_apertura` más próxima): **no se resuelven adivinando**.
   La función de selección debe señalar el conflicto explícitamente (por
   ejemplo, devolviendo una marca distinguible de "conflicto" en vez de
   escoger una al azar) para que el panel admin lo muestre como alerta. Elegir
   en silencio podría mostrarle a un cliente el QR o el mensaje de la apertura
   equivocada.

### 2.2 Por qué este orden y no otro

- Prioriza "lo que está pasando ahora" sobre "lo que viene", porque alguien
  parado frente al local con el QR es la situación más urgente de resolver
  bien.
- Excluye `por_confirmar` de la selección automática a propósito: coincide
  con la filosofía ya usada en Fase 3A de "no inventar una fecha/horario
  cuando el dato real no está confirmado" (`PENDIENTES_CAROLINA_NADIA.md` P1).
- Tratar el solapamiento como error visible, no como ambigüedad a resolver en
  silencio, seria consistente con el criterio ya aplicado repetidamente en
  Fase 3A para errores de datos (`DECISIONES_BACKEND_ATOMICO_FASE_3A.md` §2.1:
  "estado ilegible... bloquear mutaciones y revisar manualmente").

### 2.3 Riesgos de la recomendación

1. El paso 6 (detectar y señalar conflicto) requiere una función nueva, no
   solo una elección de orden — hay que definir cómo se representa "conflicto"
   en el tipo de retorno (¿`null`? ¿un tercer valor? ¿lanzar y que la capa de
   integración decida?). No se resuelve en este documento.
2. La prevención real de solapamiento debería vivir en la **creación/edición**
   de aperturas (Etapa 4: no permitir guardar dos aperturas `activa` con
   fechas u horarios que se crucen), no solo en la selección. La selección es
   la última línea de defensa, no la principal.
3. El paso 5 (cancelada visible solo hasta su fecha) es una decisión de UX que
   nadie pidió explícitamente — queda documentada como tal, no como un hecho
   dado.

### 2.4 Qué debe validar el Almacén

Nada de esto tampoco depende del Almacén directamente — es un criterio interno
de selección de datos. Se relaciona indirectamente con el pendiente #7 de
`PENDIENTES_ALMACEN_FASE_3B.md` ("confirmar criterios para aperturas
especiales"), pero ese pendiente es sobre *cuándo* el Almacén quiere abrir
fechas especiales, no sobre *cómo* el sistema elige cuál mostrar cuando hay
varias — son preguntas independientes.

### 2.5 Qué puede decidir desarrollo sin bloquear al Almacén

Todo el criterio de §2.1. Es una decisión de ingeniería de datos.

### 2.6 Impacto en la próxima etapa (demo local)

La Etapa 2 puede construirse con **una sola apertura de ejemplo** a la vez
(igual que el modo demo actual de Fase 3A usa un fixture fijo en
`src/lib/fase3a/adminDemo.ts`), sin necesitar todavía la función de selección
entre varias. F.3 bloquea recién la Etapa 5 (web pública contra el calendario
real, donde sí puede haber más de una apertura cargada).

---

## 3. Resumen de la auditoría de coherencia

Revisión cruzada entre `MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md`,
`COLUMNAS_PROPUESTAS_FASE_3B.md`, `PLAN_IMPLEMENTACION_FASE_3B.md`,
`PLAN_PRUEBAS_FASE_3B.md` y `src/lib/fase3b/*.ts` (con sus tests, 87/87
verdes al momento de esta auditoría).

**Sin contradicciones de fondo.** Documentación, tipos, funciones y tests
están alineados: los tres módulos puros implementan exactamente lo descrito en
el modelo de datos (enumeraciones, regla de cierre, precedencia de estados
públicos, derivación de `canal` desde `origen_pedido`), y los 41 tests nuevos
cubren las secciones 1, 2, 4 (parcial) y 7 (parcial) del plan de pruebas tal
como ese plan decía que se cubrirían.

**Inconsistencias menores encontradas y corregidas en esta sesión** (documental,
sin tocar código):

1. `PLAN_IMPLEMENTACION_FASE_3B.md` marcaba la Etapa 1 con un estado ambiguo
   ("ver el resultado reportado al final de esta sesión", de la sesión
   anterior) en vez de reflejar que ya está completada. Corregido a ✅ con
   referencia al commit `165f761`.
2. `PLAN_PRUEBAS_FASE_3B.md` tenía una condición futura ("si el Bloque 6 se
   implementa") sobre algo que ya se implementó en la sesión anterior.
   Corregido a afirmación en pasado.
3. `docs/TASKS.md` (bloque FASE 3B) todavía marcaba como pendientes (⬜) el
   modelo de datos, el origen de pedido y la máquina de estados públicos, los
   tres ya completados. Corregido.
4. `docs/PROJECT_STATE.md` decía explícitamente "Fase 3B iniciada (diseño, sin
   código)", lo cual ya no era cierto (existen 3 módulos puros y 41 tests
   desde el commit `165f761`). Corregido.

**Observación menor, sin corregir (cosmética, no contradicción):** los
mensajes de `mensajePublicoSugerido` en `src/lib/fase3b/estadoPublicoWeb.ts`
son texto estático genérico, mientras que la tabla B de
`MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md` muestra ejemplos con
placeholders (`[fecha]`, `[cierre]`) pensados para interpolarse con los datos
reales de la `Apertura`. No es un error — son "sugerencias" de respaldo, no el
mensaje final — pero quien implemente la Etapa 5 (web pública) debería
interpolar los campos reales de la apertura en vez de usar el string estático
tal cual, si quiere el nivel de detalle que muestra la tabla del modelo. No se
tocó el código para esto porque no es una corrección, es una nota para la
etapa que integre la UI.

**Sobre F.1 y F.3:** no eran contradicciones — eran decisiones pendientes ya
señaladas explícitamente como tales desde la sesión anterior (§F del modelo de
datos). Esa sesión dejó una recomendación (§1 y §2 de este documento); esta
sesión registra su **aprobación por coordinación** (§0), sin cambios sobre lo
recomendado. Eso habilita la Etapa 2 (demo local). La Etapa 7 sigue bloqueada
por la falta del contrato de backend para F.1, y la Etapa 5 sigue bloqueada
por la falta de la función de selección real para F.3 — la aprobación fija el
criterio, no construye todavía ninguna de las dos.
