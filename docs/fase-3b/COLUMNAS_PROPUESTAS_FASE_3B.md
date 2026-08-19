# COLUMNAS_PROPUESTAS_FASE_3B.md — Anexo de columnas (Fase 3B)

> ⚠️ **PROPUESTA. No ejecutada.** Ninguna hoja real fue creada ni modificada.
> Complementa a `docs/fase-3a/COLUMNAS_SHEETS_PROPUESTAS.md` sin reemplazarlo:
> ese documento sigue vigente para las columnas de Fase 3A (`PEDIDOS`,
> `PRODUCTOS`, `HISTORIAL_PEDIDOS`, `OPERACIONES_PEDIDOS`). Este anexo cubre
> exclusivamente lo nuevo de Fase 3B, para no mezclar el historial de ambas
> fases en un mismo archivo.
> Fuente de diseño: `docs/fase-3b/MODELO_DATOS_APERTURAS_PEDIDOS_FASE_3B.md`.

---

## 0. Por qué un anexo y no editar `COLUMNAS_SHEETS_PROPUESTAS.md`

`docs/fase-3a/COLUMNAS_SHEETS_PROPUESTAS.md` §6 dejaba la hoja `APERTURAS`
bloqueada por falta de respuesta del Almacén sobre horario y cierre de pedidos.
Esas respuestas ya llegaron (`DECISIONES_OPERATIVAS_FASE_3B.md` §1), y el
diseño de `APERTURAS` creció bastante más allá de las 6 columnas originales.
Se documenta aparte, en vez de reescribir esa sección, para que:

- el historial de decisiones de Fase 3A quede intacto y legible tal como se
  aprobó;
- este anexo pueda revisarse y aprobarse como una unidad propia de Fase 3B;
- quede un único lugar que reemplace §6 de ese documento cuando se apruebe
  (ver §4 de este anexo).

Todo lo propuesto aquí es **aditivo**, con el mismo criterio de
`COLUMNAS_SHEETS_PROPUESTAS.md` §0: agregar columnas y hojas nuevas no rompe
`col_()`; renombrar o borrar columnas existentes sí.

---

## 1. Hoja nueva `APERTURAS`

Reemplaza el diseño mínimo de `COLUMNAS_SHEETS_PROPUESTAS.md` §6. Columnas
completas y su origen en el modelo de datos:

| Columna | Tipo | Ref. |
|---|---|---|
| `apertura_id` | `APE-yyyyMMdd` | Modelo §A |
| `fecha_apertura` | `yyyy-MM-dd` | Modelo §A |
| `hora_inicio` | `HH:mm` | Modelo §A |
| `hora_termino` | `HH:mm` | Modelo §A |
| `lugar` | texto | Modelo §A |
| `cierre_pedidos_anticipados` | `yyyy-MM-ddTHH:mm` | Modelo §A.2 |
| `estado_apertura` | enum: `programada`·`activa`·`cerrada`·`cancelada`·`por_confirmar` | Modelo §A.1 |
| `pedidos_anticipados_estado` | enum: `activo`·`cerrado`·`reabierto_manual`·`pausado` | Modelo §A.1 |
| `modo_presencial_estado` | enum: `inactivo`·`activo`·`pausado`·`cerrado` | Modelo §A.1 |
| `mensaje_publico` | texto | Modelo §A |
| `observaciones_internas` | texto | Modelo §A |
| `creada_por` | texto | Modelo §A |
| `actualizada_por` | texto | Modelo §A |
| `creado_en` | fecha-hora | Modelo §A |
| `actualizado_en` | fecha-hora | Modelo §A |

Fechas ya informadas por el Almacén como referencia (no confirmadas como
vigentes todavía, pendiente #6 de `PENDIENTES_ALMACEN_FASE_3B.md`): 18 de
julio, 1 de agosto, 15 de agosto, 5 de septiembre, 19 de septiembre.

---

## 2. Hoja `PEDIDOS` — columnas nuevas de Fase 3B

Estas se **suman** a las ya propuestas en `COLUMNAS_SHEETS_PROPUESTAS.md` §1
(`metodo_pago`, `responsable_pago`, `fecha_pago`, `motivo_cancelacion`,
`observacion_interna`, `fecha_confirmacion`, `responsable_confirmacion`,
`requiere_revision`). No hay colisión de nombres entre ambos documentos.

| Columna nueva | Valores | Ref. |
|---|---|---|
| `apertura_id` | referencia a `APERTURAS.apertura_id`, o vacío | Modelo §D |
| `origen_pedido` | `online_anticipado`·`presencial_qr`·`presencial_vendedor`·`comanda_papel` | Modelo §C, §D |
| `modo_operacion` | `anticipado`·`presencial` (derivado de `origen_pedido`) | Modelo §D |
| `creado_por_tipo` | `cliente_web`·`vendedor`·`admin` | Modelo §D |
| `responsable_entrega` | texto | Modelo §D |
| `es_presencial` | `SI`·`NO` (derivado de `origen_pedido`) | Modelo §D |
| `requiere_confirmacion_admin` | `SI`·`NO` | Modelo §D, pendiente F.1 |
| `observaciones_operativas` | texto | Modelo §D |

### Nota sobre `canal`

`canal` **no cambia de nombre ni de columna**. Sigue existiendo tal como está
hoy (`scripts/apps-script-pedidos.gs:33`, valor fijo `'web'`). Lo único nuevo
es que, cuando exista un pedido presencial, `crearPedido_` (o su reemplazo de
Fase 3A) deberá escribir `canal = 'presencial'` derivado de `origen_pedido`
(Modelo §C), en vez de asumir siempre `'web'`. Es un cambio de **valor
escrito**, no de estructura de columnas.

---

## 3. Configuración pública derivada

No es una hoja nueva: es el resultado de leer `APERTURAS` y aplicar
`obtenerEstadoPublicoWeb()` (`src/lib/fase3b/estadoPublicoWeb.ts`, ver
`PLAN_IMPLEMENTACION_FASE_3B.md` Etapa 1). La web pública no necesita una
columna de "estado público" persistida: se calcula en cada carga a partir de
`APERTURAS` y la hora actual. Guardarlo como columna aparte crearía una
segunda fuente de verdad que podría desincronizarse del cálculo real — mismo
argumento que en `COLUMNAS_SHEETS_PROPUESTAS.md` sobre no agregar
`stock_aplicado`.

---

## 4. Relación entre `apertura_id` y pedidos

- Un pedido referencia **una** apertura (`apertura_id`), no varias.
- Una apertura puede tener **cero o muchos** pedidos.
- `apertura_id` vacío es válido y significa "sin calendario asignado" (pedidos
  heredados, o excepciones fuera de una apertura publicada) — no es un error
  de datos, ver Modelo §F.2.
- Borrar una apertura del calendario **no debe** implementarse mientras tenga
  pedidos asociados con cualquier estado no terminal; cancelar la apertura
  (`estado_apertura = cancelada`) es la operación segura, análoga a por qué
  `cancelado` es terminal para pedidos en `MODELO_ESTADOS_PEDIDOS.md`.

---

## 5. Notas de compatibilidad

- Todas las columnas de este anexo son aditivas; ninguna reemplaza o borra una
  columna existente de `PEDIDOS` ni de `PRODUCTOS`.
- Pedidos existentes (Fase 3A y anteriores) seguirán siendo válidos con estos
  campos vacíos — ver Modelo §F.2 y el plan de pruebas de compatibilidad en
  `PLAN_PRUEBAS_FASE_3B.md` §7.
- El orden de ejecución de `COLUMNAS_SHEETS_PROPUESTAS.md` §7 (columnas antes
  que migración, migración antes que despliegue) aplica igual aquí: agregar
  `APERTURAS` y las columnas nuevas de `PEDIDOS` es de riesgo bajo; lo que
  requiere cuidado es el día en que `crearPedido_` empiece a escribir
  `origen_pedido` y `canal` derivado, y el día en que el panel admin empiece a
  exigir `apertura_id` para pedidos anticipados nuevos.

---

## 6. Estado de aprobación

Este anexo queda **listo para reemplazar** `COLUMNAS_SHEETS_PROPUESTAS.md` §6
cuando Omar lo apruebe explícitamente. Hasta entonces, ambos documentos
coexisten: §6 de ese archivo describe el diseño mínimo original (aprobado como
punto de partida), y este anexo es la versión ampliada vigente para Fase 3B.
