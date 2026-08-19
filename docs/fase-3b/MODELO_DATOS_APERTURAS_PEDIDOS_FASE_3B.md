# MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md — Modelo de datos

> Estado: **diseño documental, no implementado.** No se creó ninguna hoja, no se
> tocó Google Sheets ni Apps Script real.
> Fuente: `docs/fase-3b/DECISIONES_OPERATIVAS_FASE_3B.md` (calendario editable y
> modo presencial, ya aprobados a nivel de decisión operativa). Este documento
> baja esas decisiones a campos, tipos y una máquina de estados concreta.
> Relacionado: `docs/fase-3a/MODELO_ESTADOS_PEDIDOS.md`,
> `docs/fase-3a/COLUMNAS_SHEETS_PROPUESTAS.md` §6,
> `docs/fase-3b/COLUMNAS_PROPUESTAS_FASE_3B.md` (mapeo a columnas de Sheet).

---

## A. Entidad `APERTURAS`

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `apertura_id` | string (`APE-yyyyMMdd`) | Sí | Identificador único de la apertura |
| `fecha_apertura` | fecha `yyyy-MM-dd` | Sí | Día de la apertura |
| `hora_inicio` | hora `HH:mm` | Sí | Por defecto `11:00` (§1.1 de decisiones), editable |
| `hora_termino` | hora `HH:mm` | Sí | Por defecto `15:00`, editable |
| `lugar` | texto | Sí | Dirección o punto de retiro |
| `cierre_pedidos_anticipados` | fecha-hora `yyyy-MM-ddTHH:mm` | Sí | Ver regla base en §A.2 |
| `estado_apertura` | enum (§A.1) | Sí | Estado operativo de la apertura |
| `pedidos_anticipados_estado` | enum (§A.1) | Sí | Estado del canal de pedido anticipado |
| `modo_presencial_estado` | enum (§A.1) | Sí | Estado del modo presencial QR |
| `mensaje_publico` | texto | No | Lo que ve la web pública sobre esta apertura |
| `observaciones_internas` | texto | No | Solo visible en el panel admin |
| `creada_por` | texto | Sí | Responsable que creó el registro |
| `actualizada_por` | texto | No | Responsable del último cambio |
| `creado_en` | fecha-hora | Sí | Marca de creación |
| `actualizado_en` | fecha-hora | No | Marca de última modificación |

### A.1 Enumeraciones

**`estado_apertura`** (estado operativo de la fecha):

| Valor | Significado |
|---|---|
| `programada` | Fecha definida, aún no llegó ni fue confirmada como próxima a mostrar |
| `activa` | Es la apertura vigente que la web muestra como próxima o en curso |
| `cerrada` | Ya ocurrió u horario terminado; ninguna acción pública disponible |
| `cancelada` | Se canceló antes de ocurrir |
| `por_confirmar` | Fecha tentativa, aún no confirmada por el Almacén (pendiente #6/#7 de `PENDIENTES_ALMACEN_FASE_3B.md`) |

**`pedidos_anticipados_estado`** (estado del canal de pedido anticipado, independiente de `estado_apertura`):

| Valor | Significado |
|---|---|
| `activo` | Recibe pedidos anticipados; se compara contra `cierre_pedidos_anticipados` |
| `cerrado` | Ya no recibe pedidos anticipados (cierre normal, por fecha) |
| `reabierto_manual` | El admin reabrió pedidos por excepción; **ignora** la comparación de fecha de cierre mientras dure |
| `pausado` | El admin cerró pedidos manualmente antes de la fecha de cierre normal |

**`modo_presencial_estado`** (estado del modo presencial QR, independiente de los dos anteriores):

| Valor | Significado |
|---|---|
| `inactivo` | Modo presencial no habilitado para esta apertura |
| `activo` | Habilitado; se activa en la web solo dentro del horario de la apertura (§B) |
| `pausado` | El admin lo desactivó temporalmente durante la apertura |
| `cerrado` | La apertura ya terminó; el modo presencial no vuelve a activarse para esta fecha |

Los tres campos de estado son **independientes entre sí**. Ejemplo: una apertura
`activa` puede tener `pedidos_anticipados_estado = cerrado` (se acabó el plazo) y
`modo_presencial_estado = activo` (se prepara para el día de retiro) al mismo
tiempo. La combinación de los tres es lo que decide el estado público de la web
(§B), no un único campo.

### A.2 Regla base de cierre de pedidos anticipados

**Regla:** el jueves anterior a `fecha_apertura`, a las 23:59. Se calcula
buscando el jueves más cercano **estrictamente anterior** a la fecha de
apertura — la misma regla para cualquier día de la semana en que caiga la
apertura (sábado, domingo o cualquier otro). No hay una regla distinta por día:
los casos excepcionales se resuelven **sobrescribiendo el campo**
`cierre_pedidos_anticipados` a mano, no cambiando el cálculo.

Ejemplos:
- Apertura sábado 15 → jueves anterior = 13 → cierre `...-13T23:59`.
- Apertura domingo 16 → jueves anterior = 13 (mismo jueves) → cierre `...-13T23:59`.
- Apertura jueves 20 → jueves anterior = 13 (semana previa, no el mismo día) →
  cierre `...-13T23:59`. Esto evita una ventana de cero días entre cierre y
  apertura si algún día se programa una apertura en jueves.

El admin puede:
- editar `cierre_pedidos_anticipados` para una apertura puntual;
- pasar `pedidos_anticipados_estado` a `pausado` para cerrar antes de la fecha
  calculada;
- pasar `pedidos_anticipados_estado` a `reabierto_manual` para aceptar pedidos
  después del cierre, sin mover la fecha de cierre registrada (queda como
  evidencia de cuál era el plazo normal).

---

## B. Estado público de la web

Seis estados posibles, refinamiento del listado de 5 estados de
`docs/fase-3b/DECISIONES_OPERATIVAS_FASE_3B.md` §3.3 (ver mapeo en §B.2).

| Estado | Ve catálogo | Pedido anticipado | Comanda presencial | Mensaje público sugerido |
|---|---|---|---|---|
| `sin_apertura_programada` | Sí (solo informativo) | No | No | "Aún no hay próxima apertura confirmada." |
| `pedido_anticipado_activo` | Sí | Sí | No | "Pedidos abiertos hasta el [cierre]. Retiro el [fecha], [hora_inicio]–[hora_termino]." |
| `pedido_anticipado_cerrado` | Sí | No | No | "Pedidos anticipados cerrados. Próxima apertura el [fecha]." |
| `modo_presencial_activo` | Sí | No | Sí | "¡Estamos abiertos! Escanea el QR para armar tu comanda en el local." |
| `apertura_cerrada` | Sí | No | No | "Cerramos por hoy. Próxima apertura a confirmar." |
| `apertura_cancelada` | Sí | No | No | "La apertura del [fecha] fue cancelada." |

El catálogo se muestra siempre (permite planificar), salvo que no exista ningún
producto activo — eso es un problema de datos de `PRODUCTOS`, no de este
modelo.

### B.1 Precedencia de reglas

Evaluadas en este orden (la primera que aplica define el estado; documentado
así porque el enunciado original de reglas del encargo tiene dos casos —
"pedidos cerrados" y "apertura terminada" — que no son mutuamente excluyentes
sin un orden explícito):

1. No hay apertura relevante, o su `estado_apertura = por_confirmar` →
   `sin_apertura_programada`.
2. `estado_apertura = cancelada` → `apertura_cancelada`.
3. Modo presencial puede usarse ahora (`modo_presencial_estado = activo` **y**
   la hora actual está dentro de `[hora_inicio, hora_termino]` del día de la
   apertura) → `modo_presencial_activo`.
4. `estado_apertura = cerrada`, o la hora actual ya pasó `hora_termino` del
   día de la apertura → `apertura_cerrada`.
5. Puede recibir pedido anticipado ahora (ver regla de
   `puedeRecibirPedidoAnticipado` en §D) → `pedido_anticipado_activo`.
6. Cualquier otro caso → `pedido_anticipado_cerrado`.

**Supuesto explícito de zona horaria:** todo el cálculo es aritmética de
calendario/hora de pared (string ISO `yyyy-MM-dd` / `HH:mm`), sin conversión de
zona horaria. Se asume que toda fecha/hora que entra al módulo ya está expresada
en hora de Santiago de Chile. La conversión real desde un reloj de servidor (UTC
u otro) a hora de Santiago queda para la capa de integración (Etapa 4+ de
`PLAN_IMPLEMENTACION_FASE_3B.md`), no para este módulo puro.

**Selección de "la apertura relevante" entre varias:** este documento y el
código de §D asumen que ya se les entrega **una** apertura (o `null`). Elegir
cuál apertura del calendario es "la relevante" cuando hay varias vigentes o
próximas **no está resuelto todavía** — queda como decisión pendiente explícita
en §F.3, no como comportamiento implementado.

### B.2 Mapeo con el listado previo de 5 estados

| `DECISIONES_OPERATIVAS_FASE_3B.md` §3.3 | Este documento |
|---|---|
| Pedido anticipado activo | `pedido_anticipado_activo` |
| Pedido anticipado cerrado | `pedido_anticipado_cerrado` |
| Modo presencial activo | `modo_presencial_activo` |
| Apertura cerrada | `apertura_cerrada` |
| Próxima fecha por confirmar | `sin_apertura_programada` (aproximado) |
| *(nuevo)* | `apertura_cancelada` |

`apertura_cancelada` es un estado nuevo que no estaba en el listado original:
se separó de "apertura cerrada" porque el mensaje público correcto es distinto
(cancelada ≠ terminó normalmente) y porque una apertura cancelada no debe
sumarse como "aperturas pasadas" en reportes futuros.

---

## C. `canal` vs `origen_pedido`

**Hallazgo del código actual:** `canal` existe hoy en `PEDIDOS`
(`scripts/apps-script-pedidos.gs:33,188`) pero es una constante fija,
`CANAL_WEB = 'web'`, escrita siempre igual por `crearPedido_`. Hoy no
distingue nada: todo pedido que existe tiene `canal = 'web'`.

**Decisión: opción 3 — mantener ambos, con significados separados y
explícitos.**

| Campo | Nivel | Valores | Para qué sirve |
|---|---|---|---|
| `canal` | Medio general | `web` \| `presencial` | Filtro grueso: ¿el pedido nació en la web o en el local? Sirve para reportes simples y para no romper el valor que ya escribe `crearPedido_`. |
| `origen_pedido` | Detalle operativo | `online_anticipado` \| `presencial_qr` \| `presencial_vendedor` \| `comanda_papel` | Cómo nació exactamente el pedido. Sirve para caja, trazabilidad y para decidir el flujo de confirmación (§E). |

`canal` se **deriva** de `origen_pedido`, no se ingresan por separado (evita
que queden inconsistentes entre sí):

```
online_anticipado    → canal = web
presencial_qr         → canal = presencial
presencial_vendedor   → canal = presencial
comanda_papel         → canal = presencial
```

Se descartaron las otras dos opciones:

- **Opción 1 (reutilizar `canal` para todo):** perdería el detalle entre QR,
  venta asistida y comanda papel, que caja necesita distinguir.
- **Opción 2 (agregar solo `origen_pedido` y dejar `canal` fijo en `'web'`
  para todo):** produciría reportes de canal incorrectos en cuanto exista un
  solo pedido presencial.

---

## D. Relación con `PEDIDOS`

Campos nuevos propuestos para `PEDIDOS` (aditivos; no reemplazan ni renombran
columnas existentes — mismo criterio que
`docs/fase-3a/COLUMNAS_SHEETS_PROPUESTAS.md` §0):

| Campo | Tipo | Descripción |
|---|---|---|
| `apertura_id` | string, referencia a `APERTURAS` | A qué apertura pertenece el pedido. Vacío para pedidos heredados o sin calendario asignado (§F). |
| `origen_pedido` | enum (§C) | Cómo nació el pedido |
| `modo_operacion` | enum: `anticipado` \| `presencial` | Redundante con `origen_pedido`, pero explícito para lógica de UI que no necesita saber el detalle |
| `creado_por_tipo` | enum: `cliente_web` \| `vendedor` \| `admin` | Quién generó el registro en el sistema |
| `responsable_confirmacion` | texto | Ya propuesto en Fase 3A (`COLUMNAS_SHEETS_PROPUESTAS.md` §1); se reutiliza sin cambios |
| `responsable_entrega` | texto | Quién entregó/cerró la venta presencial, cuando aplica |
| `responsable_pago` | texto | Ya propuesto en Fase 3A; se reutiliza sin cambios |
| `es_presencial` | booleano | Derivado de `origen_pedido`; se guarda igual para facilitar filtros simples en Sheets sin fórmulas |
| `requiere_confirmacion_admin` | booleano | Ver §E — falso para venta asistida ya cobrada en el acto |
| `observaciones_operativas` | texto | Notas del vendedor o admin al ingresar la venta presencial |

`modo_operacion` y `es_presencial` son **derivados** de `origen_pedido`, igual
que `canal` (§C). Se guardan como columnas propias porque Sheets no tiene
columnas calculadas confiables entre hojas grandes, no porque sean una fuente
de verdad independiente. Si alguna vez difieren de lo que `origen_pedido`
implica, `origen_pedido` manda.

---

## E. Compatibilidad con el flujo de Fase 3A

`docs/fase-3a/MODELO_ESTADOS_PEDIDOS.md` no cambia: sigue siendo
`recibido → pendiente/listo → entregado`, con `entregado` y `cancelado` como
estados finales. Fase 3B no reabre esa máquina de estados; solo define **cómo
entra** cada pedido a ella según su origen:

| `origen_pedido` | Estado inicial | Por qué |
|---|---|---|
| `online_anticipado` | `recibido` | Igual que hoy: nace sin revisar, sin descontar stock (§1 `MODELO_ESTADOS_PEDIDOS.md`). |
| `presencial_qr` | `recibido` | La persona arma su comanda sola; igual que un pedido web, requiere revisión de un vendedor/admin antes de comprometer stock. |
| `presencial_vendedor` | `recibido` **o** `pendiente`/`listo` directamente, según decisión operativa (ver nota) | Venta asistida: el vendedor/admin ya está presente y puede confirmar en el acto. Queda como **decisión pendiente** si conviene saltar `recibido` para no duplicar el paso de confirmación cuando la misma persona que vende también confirma (ver §F.1). |
| `comanda_papel` | Igual que `presencial_vendedor` | El vendedor la transcribe al sistema; no es un origen que cambie la máquina de estados, solo de dónde salió el pedido. |

Ningún origen agrega un estado nuevo a `estados.ts`. La confirmación y
cancelación siguen siendo **admin-only** para todos los orígenes
(`DECISIONES_OPERATIVAS_FASE_3B.md` §1.3–§1.4); "vendedor" no confirma por su
cuenta mientras no exista el rol vendedor de FASE 2 con permisos propios.

---

## F. Decisiones pendientes explícitas

No se decidieron por cuenta propia; quedan registradas para resolver antes de
implementar código conectado:

### F.1 ¿Venta asistida entra en `recibido` o ya confirmada? — ✅ Aprobada
Si un vendedor arma la venta y la cobra en el momento, exigir que pase por
`recibido → pendiente/listo` como un pedido web es una fricción operativa (dos
pasos para una sola persona). Pero saltarse `recibido` rompe la regla actual de
que todo pedido nuevo nace sin comprometer stock. Se necesita una decisión
explícita, no un valor por defecto inventado aquí.

**Aprobado por coordinación como criterio base:** la venta presencial asistida
nace directamente en `listo` (no `recibido`, no `entregado`). Detalle y
justificación en `docs/fase-3b/DECISIONES_PENDIENTES_FASE_3B.md` §0 y §1.
Habilita la Etapa 2 (demo local); la Etapa 7 (venta asistida real) sigue
bloqueada hasta diseñar el contrato de backend correspondiente.

### F.2 Pedidos sin `apertura_id`
Todo pedido histórico (Fase 3A y anteriores) no tiene `apertura_id`. Se
recomienda que el campo sea opcional y que la ausencia se interprete como "sin
calendario asignado", no como error. Falta decidir si vale la pena
retro-poblarlo para pedidos históricos o si se deja vacío indefinidamente (bajo
impacto: no se usa para stock ni pagos).

### F.3 Selección de "la apertura vigente" entre varias — ✅ Aprobada
Cuando el calendario tiene más de una apertura `programada`/`activa` a la vez
(por ejemplo, la próxima y la siguiente ya cargada), falta definir el criterio
para elegir cuál le muestra la web pública como *la* apertura relevante. No se
inventa un criterio en este documento — es información que puede depender de
cómo el Almacén quiera anunciar aperturas dobles o consecutivas.

**Aprobado por coordinación como criterio base:** orden de prioridad
determinista — (1) modo presencial usable ahora, (2) apertura activa de hoy,
(3) próxima apertura programada, (4) `null` si no hay apertura clara. El
solapamiento o conflicto no se adivina: se trata como conflicto explícito.
Detalle en `docs/fase-3b/DECISIONES_PENDIENTES_FASE_3B.md` §0 y §2. Habilita
la Etapa 2 (demo local, con una sola apertura de ejemplo a la vez); la
función real de selección para la Etapa 5 sigue sin implementarse.

### F.4 Horario único vs. horario por apertura
`DECISIONES_OPERATIVAS_FASE_3B.md` §1.1 registra 11:00–15:00 como el horario
informado, pero no confirma si es el mismo para *todas* las aperturas futuras
(pendiente #6 de `PENDIENTES_ALMACEN_FASE_3B.md`). El modelo ya soporta
horarios distintos por apertura (`hora_inicio`/`hora_termino` son campos por
registro), así que esta pregunta no bloquea el diseño, solo el valor por
defecto que se precargue.
