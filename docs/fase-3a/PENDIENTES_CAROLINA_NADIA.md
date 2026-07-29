# PENDIENTES_CAROLINA_NADIA.md — Decisiones abiertas (FASE 3A)

> Las 11 preguntas del levantamiento (§2), más los pendientes técnicos surgidos en
> el diagnóstico.
>
> **Criterio (§1 y §10 del levantamiento):** ninguna de estas preguntas bloquea la
> implementación. Cada una tiene un **valor por defecto seguro** que permite
> avanzar y que se cambia sin reescribir lógica. Lo que **no** se hace es dar por
> decidida una respuesta que nadie dio.

---

## 1. Cómo se maneja cada pendiente

| Estrategia | Cuándo se usa |
|---|---|
| **Parámetro editable** | La respuesta es un dato (una lista, un horario). Se implementa con un valor por defecto en una constante o en `CONFIG`, y se cambia sin tocar código de negocio. |
| **Pendiente controlado** | La respuesta cambia el comportamiento. Se implementa el camino más conservador y se deja registrado qué cambiaría. |
| **Bloqueado** | No se puede implementar nada razonable sin la respuesta. Solo §2.1 y §2.2 caen aquí. |

---

## 2. Las 11 preguntas

### P1 — Horario de apertura/retiro (§2.1) · 🔴 Bloqueado
**Pregunta:** ¿Qué horario tendrán las próximas fechas? ¿Es el mismo para todas?
**Fechas informadas:** 18 jul · 1 ago · 15 ago · 5 sep · 19 sep (a evaluar).
**Manejo:** la hoja `APERTURAS` se diseña con `hora_inicio` / `hora_fin` por fecha
(soporta horarios distintos, que es el caso general). **No se inventa un horario
por defecto**: una hora equivocada publicada en la web es peor que ninguna.
**Impacto si cambia:** ninguno en código; es dato.

### P2 — Cierre de pedidos online (§2.2) · 🔴 Bloqueado
**Pregunta:** ¿Cuándo deja de recibirse pedidos antes de cada apertura?
**Manejo:** el modelo ya acepta pedidos sin apertura activa (§3.3), así que
**no aplicar ningún cierre es el comportamiento correcto por ahora**. La columna
`cierre_pedidos_online` queda diseñada.
**Impacto si cambia:** medio — agrega una validación al crear el pedido y un aviso
en la tienda.

### P3 — Quién confirma pedidos y descuenta stock (§2.3) · 🟡 Pendiente controlado
**Propuesta del levantamiento:** administración (Carolina/Nadia) y operación
(Lucía/Seba); venta solo si ellas quieren.
**Manejo:** en primera versión **cualquier sesión admin puede confirmar**, y queda
registrado **quién** en `responsable_confirmacion` + historial. Auditoría en vez de
permiso.
**Por qué:** el login es una contraseña compartida; no distingue personas. Un
control real de permisos exige usuarios individuales, que §9.2 deja fuera de
alcance. Fingir permisos sobre una contraseña compartida da falsa seguridad.
**Impacto si cambia:** alto — implicaría usuarios individuales (fase posterior).

### P4 — Quién cancela pedidos (§2.4) · 🟡 Pendiente controlado
**Propuesta:** administración y operación; venta no cancela en v1.
**Manejo:** igual que P3 — se permite y se audita con responsable y motivo
obligatorios.
**Impacto si cambia:** alto (mismo motivo que P3).

### P5 — Validación del flujo general (§2.5) · 🟡 Pendiente controlado
**Manejo:** se implementa el flujo del §3.4 tal cual fue aprobado. Si al usarlo no
acomoda, cambiar la tabla de transiciones es una edición localizada
(`src/lib/fase3a/estados.ts` + la matriz de tests).
**Impacto si cambia:** bajo, si el cambio es de transiciones; alto si cambia el
momento del descuento de stock.

### P6 — Categorías oficiales (§2.6) · 🟢 Parámetro editable
**Propuesta base:** Granel · Alimentos · Limpieza · Higiene · Otros.
**Manejo:** `CATEGORIAS_PROPUESTAS` en `src/lib/fase3a/productos.ts`, marcada
explícitamente como propuesta. La hoja `PRODUCTOS` ya tiene columna `categoria`
con texto libre, así que nada se rompe si cambian.
**Impacto si cambia:** bajo.

### P7 — Orden de categorías en la tienda (§2.7) · 🟢 Parámetro editable
**Manejo:** el orden de la constante es el orden de despliegue. La columna
`prioridad` de `PRODUCTOS` ya existe para ordenar dentro de cada categoría.
**Impacto si cambia:** bajo.

### P8 — Unidades de venta (§2.8) · 🟢 Parámetro editable
**Propuesta base:** unidad · kilo · gramos · litro · mililitro · pack.
**Manejo:** `UNIDADES_PROPUESTAS`. La lógica real no depende de la etiqueta sino de
`permite_decimal` y `paso_venta`, que son por producto.
**Impacto si cambia:** bajo.

### P9 — Productos solo para venta presencial (§2.9) · 🟡 Pendiente controlado
**Manejo:** por defecto, `estado_producto = inactivo` + nota interna, tal como
propone el levantamiento para primera versión. Se propone además la columna
`solo_venta_presencial` para distinguirlo de un producto simplemente desactivado.
**Impacto si cambia:** bajo.

### P10 — Textos públicos actuales (§2.10) · 🟢 Sin bloqueo
**Manejo:** se mantienen como preliminares. **No se tocó ningún texto público en
esta sesión.**
**Impacto si cambia:** ninguno técnico.

### P11 — Historia, comunidad y participación (§2.11) · 🟢 Sin bloqueo
**Manejo:** igual que P10. Contenido preliminar hasta validación editorial.
**Impacto si cambia:** ninguno técnico.

---

## 3. Pendientes técnicos (para Omar, no para Carolina/Nadia)

Surgieron del diagnóstico. **No son preguntas para el Almacén.**

### T1 — `pendiente → entregado` queda prohibido
El flujo aprobado (§3.4) enumera `Listo → Entregado` pero **no**
`Pendiente → Entregado`. El panel actual **sí** permite ese atajo.
Se respetó el levantamiento: el modelo nuevo lo prohíbe.
**A decidir:** ¿es deseado (obliga a preparar antes de entregar) o es una fricción?
Si se quiere permitir, es una línea en `TRANSICIONES` y una fila en la matriz de
tests. **No se cambió por cuenta propia.**

### T2 — Momento de la migración
Cambiar cuándo se descuenta el stock **no se puede hacer a medias**. Requiere
columnas nuevas, migración de datos y despliegue coordinado, fuera de un sábado de
apertura. Ver `COLUMNAS_SHEETS_PROPUESTAS.md` §7.

### T3 — Sin entorno de prueba
La misma planilla sirve a producción. Probar el backend nuevo exige una copia de la
hoja y un despliegue de Apps Script aparte. **Debería resolverse antes de la
migración**, no durante.

### T4 — Rotación de la contraseña de correo
§12 del levantamiento: la contraseña compartida por WhatsApp sigue pendiente de
cambio. No es tarea de código; queda como recordatorio operativo.

### T5 — `forma_pago` y `vendedor_admin` quedan obsoletas
Se reemplazan por `metodo_pago` y `responsable_pago`. **No se borran** de la hoja
(rompería `agregarFila_`): se dejan de escribir y quedan como histórico.

---

## 4. Resumen para decidir rápido

| # | Pregunta | Estado | ¿Bloquea? |
|---|---|---|---|
| P1 | Horario de apertura | 🔴 Bloqueado | Solo publicar horarios |
| P2 | Cierre de pedidos online | 🔴 Bloqueado | Solo aplicar el cierre |
| P3 | Quién confirma | 🟡 Controlado | No |
| P4 | Quién cancela | 🟡 Controlado | No |
| P5 | Validación del flujo | 🟡 Controlado | No |
| P6 | Categorías | 🟢 Editable | No |
| P7 | Orden de categorías | 🟢 Editable | No |
| P8 | Unidades de venta | 🟢 Editable | No |
| P9 | Solo venta presencial | 🟡 Controlado | No |
| P10 | Textos públicos | 🟢 Sin bloqueo | No |
| P11 | Historia/comunidad | 🟢 Sin bloqueo | No |

**Ninguna de las 11 bloquea la implementación de FASE 3A.** Solo P1 y P2 bloquean
publicar horarios y aplicar el cierre de pedidos.

El texto listo para enviar por WhatsApp está en §11 del levantamiento consolidado.
