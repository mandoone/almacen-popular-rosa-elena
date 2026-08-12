---
DOCUMENTO: "Estado de avance actualizado — Fase 3A"
VERSION: "0.3"
FECHA: "2026-08-12"
DESTINATARIAS:
  - "Nadia"
  - "Carolina"
  - "Almacén Popular Rosa Elena Morales"
ESTADO: "AVANCE_ACTUALIZADO_PARA_REVISION"
FUENTE:
  - "Fase 3A — operación de pedidos y panel admin"
  - "QA visual local del modo demo"
  - "Checklist interno del entorno TEST"
  - "docs/PROJECT_STATE.md"
  - "docs/TASKS.md"
  - "docs/fase-3a/PLAN_IMPLEMENTACION_FASE_3A.md"
TIPO_INFORME: "AVANCE_ALMACEN"
CORTE_TECNICO: "1adcbb6 docs: actualizar estado y checklist fase 3a"
REFERENCIA_VISUAL_FUTURA: "2026-07-12_avance-almacen_estado-proyecto_v0.2.2.pdf"
---

# Informe de avance para el Almacén
## Web Almacén Popular Rosa Elena Morales — Fase 3A

**Versión:** v0.3

**Fecha:** 2026-08-12

**Destinatarias:** Nadia y Carolina / Almacén Popular Rosa Elena Morales

**Estado:** Avance actualizado para revisión

**Próxima prioridad:** Preparar un entorno de prueba separado antes de cambiar el stock real

**Meta de esta etapa:** Dejar el panel administrativo más claro y seguro, y acordar con el Almacén las reglas necesarias para adaptar el sistema a su operación cotidiana.

---

## 1. Resumen ejecutivo

Desde el informe anterior se avanzó en la claridad del panel administrativo y en
las validaciones que evitan cambios de estado incorrectos. La nueva versión de la
web presenta un flujo base propuesto y preparado para validación, muestra las
acciones que corresponden a cada estado e impide ofrecer cambios que ese flujo no
permite.

También se creó un modo de demostración local para revisar el panel sin conectarlo
a pedidos reales. Esta demostración fue revisada visualmente y aprobada. Permitió
comprobar los estados, botones y cambios de pantalla sin consultar ni modificar la
base operativa del Almacén.

Estos avances están listos para revisión controlada, pero todavía no fueron
publicados como cambios de producción. Durante esta etapa:

- no se modificó Google Sheets real;
- no se modificó Apps Script productivo;
- no se modificó Vercel ni la web en producción;
- no se realizaron pruebas de stock sobre pedidos reales.

El próximo paso técnico será crear copias separadas de Google Sheets y Apps Script
para probar el nuevo manejo del stock de manera segura. En paralelo, Nadia y
Carolina deben responder o validar algunas reglas operativas para personalizar el
sistema según el funcionamiento real del Almacén.

> **Idea central:** el panel ya tiene una base más clara y revisable. El cambio del
> stock real se hará después, usando un entorno de prueba separado y con un
> criterio explícito para validar si el nuevo manejo de stock está listo para
> implementarse en producción.

---

## 2. Qué cambió desde la versión anterior

### 2.1 Panel administrativo más claro

- Se ordenaron las acciones disponibles para cada estado del pedido.
- Se agregaron acciones válidas que antes no aparecían.
- Se ocultaron acciones que el flujo no permite.
- Los pedidos entregados o cancelados no ofrecen nuevos cambios de estado.
- Los estados desconocidos quedan sin acciones y requieren revisión manual.

### 2.2 Flujo de estados definido

El flujo base preparado para Fase 3A es:

```text
Recibido → Pendiente → Listo → Entregado
     └────────→ Listo

Listo → Pendiente
Recibido / Pendiente / Listo → Cancelado
```

Un pedido no pasa directamente de `Pendiente` a `Entregado`: primero debe quedar
`Listo`. Los pedidos `Entregado` y `Cancelado` son finales y no se reabren desde
el panel.

### 2.3 Validaciones para evitar errores

La nueva versión de la web revisa el estado conocido antes de ofrecer o reenviar
una acción desde el panel. Esto reduce el riesgo de:

- cancelar dos veces un pedido;
- cambiar un pedido ya entregado;
- ofrecer una transición no permitida por el flujo base;
- operar automáticamente un estado que el sistema no reconoce.

Esta es una protección preventiva del panel y de su proxy administrativo, la capa
intermedia de la web. La validación definitiva dentro del backend real de Apps
Script y Sheets todavía no fue implementada y se probará primero en el entorno
TEST.

### 2.4 Revisión de prueba del panel

Se preparó una versión de prueba del panel administrativo con pedidos ficticios.
Esta versión no está publicada en la página real ni afecta los pedidos del
Almacén.

Omar puede mostrarla en una revisión guiada para que Nadia y Carolina vean cómo
funcionaría el nuevo flujo de pedidos, estados y acciones. Al recargar la página,
los datos de prueba vuelven al estado inicial.

### 2.5 QA visual aprobado

La revisión local confirmó que:

- se muestran todos los estados necesarios;
- las acciones visibles corresponden a cada estado;
- los cambios se pueden simular visualmente;
- no se realiza ninguna solicitud a `/api/admin/pedidos`;
- no se consultan pedidos ni datos reales.

### 2.6 Preparación del siguiente bloque

Se documentó el futuro manejo seguro y coordinado de pedidos y stock —llamado
internamente backend atómico— y se creó un checklist para preparar un entorno TEST
separado. Este trabajo permite avanzar con orden sin improvisar cambios en
producción.

---

## 3. Qué se puede revisar ya

Omar puede mostrar la versión actual mediante una revisión local guiada del modo
demo del panel administrativo. Esta revisión sirve para evaluar la claridad de los
nombres, los botones y el orden del trabajo. No es una URL pública productiva, no
permite operar pedidos reales y no toca datos productivos.

### 3.1 Estados visibles en la demostración

- `Recibido`
- `Pendiente`
- `Listo`
- `Entregado`
- `Cancelado`
- un estado desconocido para comprobar la revisión manual

### 3.2 Acciones visibles por estado

| Estado | Acciones disponibles en el demo |
|---|---|
| Recibido | Confirmar pendiente · Marcar listo · Cancelar |
| Pendiente | Marcar listo · Cancelar |
| Listo | Volver a pendiente · Entregado · Cancelar |
| Entregado | Sin cambios de estado |
| Cancelado | Sin cambios de estado |
| Estado desconocido | Sin cambios; requiere revisión |

### 3.3 Límite de esta revisión

El demo no está conectado a pedidos reales. Por eso permite revisar con seguridad
la organización del panel, pero todavía no demuestra el futuro movimiento de
stock. Esa prueba corresponde al siguiente bloque técnico, sobre copias TEST.

---

## 4. Estado actual de Fase 3A

### 4.1 Completado

- Modelo base de estados y transiciones.
- Validaciones preventivas en el acceso administrativo.
- Botones del panel alineados con el flujo permitido.
- Acciones válidas faltantes agregadas.
- Modo demo local aislado.
- QA visual local aprobado.
- Diseño del backend futuro documentado.
- Checklist interno del entorno TEST preparado.
- Rama técnica preparada para respaldo y revisión mediante Git.

### 4.2 Decisiones para personalizar con el Almacén

Quedan algunas definiciones prácticas para responder junto con Nadia y Carolina,
además de propuestas operativas que necesitan su validación. Estas respuestas
permitirán personalizar el sistema; no se presentan como errores ni como retrasos
del Almacén.

### 4.3 Pendiente técnico interno

- Crear copias TEST de Google Sheets y Apps Script.
- Conectar ambas copias sin usar recursos productivos.
- Implementar en TEST el nuevo momento de descuento del stock.
- Probar concurrencia, es decir, dos acciones realizadas al mismo tiempo, además
  de errores y recuperación.
- Ensayar cómo volver de forma segura al estado anterior —rollback— antes de
  considerar producción.

### 4.4 Próxima prioridad

La prioridad inmediata es crear el entorno TEST y demostrar que el stock se
descuenta o devuelve una sola vez, incluso cuando existen acciones simultáneas o
problemas de conexión.

---

## 5. Checklist actualizado

### 5.1 Avances realizados

- [x] **[Realizado]** Proteger el panel administrativo.
- [x] **[Realizado]** Preparar el flujo base de estados para validación.
- [x] **[Realizado]** Validar transiciones peligrosas antes de reenviarlas.
- [x] **[Realizado]** Alinear los botones del panel administrativo.
- [x] **[Realizado]** Agregar las acciones válidas que faltaban.
- [x] **[Realizado]** Crear un modo demo local y aislado.
- [x] **[Realizado]** Aprobar el QA visual local del modo demo.
- [x] **[Realizado]** Confirmar que el demo no consulta `/api/admin/pedidos`.
- [x] **[Realizado]** Documentar el manejo seguro y coordinado de pedidos y stock.
- [x] **[Realizado]** Crear el checklist interno del entorno TEST.
- [x] **[Realizado]** Dejar la rama preparada para push y revisión.

### 5.2 Propuestas que debe validar el Almacén

- [ ] **[Validar Almacén]** Confirmar el flujo `Recibido → Pendiente/Listo → Entregado`.
- [ ] **[Validar Almacén]** Confirmar que no se entregue directamente desde `Pendiente`.
- [ ] **[Validar Almacén]** Confirmar que `Entregado` y `Cancelado` sean estados finales.
- [ ] **[Validar Almacén]** Confirmar que un pedido cancelado deba reemplazarse por uno nuevo si la persona vuelve a pedirlo.
- [ ] **[Validar Almacén]** Confirmar que el stock se descuente al aceptar el pedido, no al recibirlo por la web.
- [ ] **[Validar Almacén]** Confirmar las categorías iniciales propuestas: Granel, Alimentos, Limpieza, Higiene y Otros.
- [ ] **[Validar Almacén]** Confirmar las unidades de venta propuestas: unidad, kilo, gramos, litro, mililitro y pack.
- [ ] **[Validar Almacén]** Validar los textos públicos actuales como base preliminar.

### 5.3 Decisiones que debe responder el Almacén

- [ ] **[Responde Almacén]** Definir el horario de apertura y retiro.
- [ ] **[Responde Almacén]** Definir cuándo se cierran los pedidos online antes de cada apertura.
- [ ] **[Responde Almacén]** Definir quiénes pueden confirmar pedidos.
- [ ] **[Responde Almacén]** Definir quiénes pueden cancelar pedidos.
- [ ] **[Responde Almacén]** Informar qué productos serán solo para venta presencial.
- [ ] **[Responde Almacén]** Indicar cambios o aportes para los textos, historia, comunidad y participación.

### 5.4 Próxima prioridad técnica

- [ ] **[Próxima prioridad]** Preparar copias TEST separadas.
- [ ] **[Próxima prioridad]** Probar el stock y dos acciones realizadas al mismo tiempo.
- [ ] **[Próxima prioridad]** Validar si el nuevo manejo de stock está listo para implementarse en producción antes de planificar cambios reales.

### 5.5 Trabajo de uso interno técnico

- [ ] **[Uso interno técnico]** Crear la copia Sheet TEST.
- [ ] **[Uso interno técnico]** Crear la copia Apps Script TEST.
- [ ] **[Uso interno técnico]** Conectar Apps Script a Sheet mediante un ID explícito.
- [ ] **[Uso interno técnico]** Usar variables TEST únicamente en el entorno local.
- [ ] **[Uso interno técnico]** Implementar `estado_esperado` e idempotencia —evitar descuentos repetidos— en TEST.
- [ ] **[Uso interno técnico]** Probar descuentos y devoluciones de stock.
- [ ] **[Uso interno técnico]** Probar acciones concurrentes.
- [ ] **[Uso interno técnico]** Ensayar rollback y reconciliación.
- [ ] **[Uso interno técnico]** Mantener producción intacta hasta validar si el nuevo manejo de stock está listo para implementarse en producción.

### 5.6 Pendientes posteriores

- [ ] **[Pendiente]** Separar completamente estado de pago y método de pago.
- [ ] **[Pendiente]** Agregar motivo y responsable en las cancelaciones reales.
- [ ] **[Pendiente]** Permitir edición controlada de pedidos recibidos.
- [ ] **[Pendiente]** Agregar filtros operativos pendientes al panel.
- [ ] **[Pendiente]** Revisar productos, precios, categorías, unidades e imágenes después de estabilizar pedidos y stock.

---

## 6. Continuidad del plan general

| Bloque | Estado actualizado |
|---|---|
| Base de la página, catálogo y carrito | **[Realizado]** |
| Pedidos reales y base operativa compartida | **[Realizado]** con modelo de stock anterior |
| Seguridad del panel administrativo | **[Realizado]** |
| UI y validaciones administrativas de Fase 3A | **[Realizado]** en la rama técnica |
| Revisión demo de Fase 3A | **[Realizado]** localmente |
| Reglas operativas del Almacén | **[Responde Almacén]** / **[Validar Almacén]** |
| Entorno TEST y backend de stock | **[Próxima prioridad]** |
| Migración y cambio productivo de stock | **[Pendiente]** hasta validar si el nuevo manejo de stock está listo para implementarse en producción |
| Productos, panel vendedor, caja y compras | **[Pendiente]** para etapas posteriores |

---

## 7. Próximos pasos por responsable

### 7.1 Almacén — Nadia y Carolina

1. **[Responde Almacén]** Responder los puntos operativos pendientes.
2. **[Validar Almacén]** Revisar si el flujo de estados propuesto acomoda la operación real.
3. **[Validar Almacén]** Confirmar categorías, unidades y textos preliminares.
4. **[Validar Almacén]** Indicar ajustes de lenguaje o nombres de botones que hagan el panel más claro.

### 7.2 Omar / desarrollo

1. **[Próxima prioridad]** Subir la rama para respaldo y revisión, sin desplegarla automáticamente como cambio productivo.
2. **[Uso interno técnico]** Preparar el entorno TEST separado.
3. **[Uso interno técnico]** Probar el comportamiento del stock usando solo las copias.
4. **[Uso interno técnico]** Documentar resultados y validar si el nuevo manejo de stock está listo para implementarse en producción.
5. **[Pendiente]** Revisar y aprobar el PDF local antes de preparar una versión final.

### 7.3 Límites técnicos de esta etapa

- **[Uso interno técnico]** No tocar producción todavía.
- **[Uso interno técnico]** No probar sobre Google Sheet real.
- **[Uso interno técnico]** No editar Apps Script productivo.
- **[Uso interno técnico]** No modificar Vercel antes de aprobar el siguiente bloque.

---

## 8. Síntesis final

El proyecto avanzó desde el diagnóstico hacia una base administrativa más clara y
controlada. El panel ya refleja un flujo base propuesto y preparado para
validación, evita ofrecer acciones inválidas y cuenta con una demostración local
revisada y aprobada.

El Almacén ya puede revisar la lógica general, los nombres y las decisiones de
operación sin que esa revisión afecte pedidos o stock reales. Lo que falta por
parte de Nadia y Carolina es personalizar el sistema mediante respuestas y
validaciones concretas sobre horarios, responsables, categorías, unidades y
contenido.

El cambio del stock real todavía no fue aplicado. Antes de tocar producción se
creará un entorno TEST con copias separadas, se probarán descuentos, devoluciones,
acciones simultáneas y la recuperación segura ante errores. Con esos resultados se
validará si el nuevo manejo de stock está listo para implementarse en producción.

> **Cierre:** la base administrativa de Fase 3A ya es revisable. El siguiente paso
> combina dos trabajos coordinados: validación operativa del Almacén y pruebas
> técnicas seguras fuera de producción.

---

**Corte técnico del informe:** `1adcbb6 docs: actualizar estado y checklist fase 3a`

**Rama:** `feature/fase-3a-operativa`

**Referencia visual para una salida posterior:** `2026-07-12_avance-almacen_estado-proyecto_v0.2.2.pdf`

**Nota:** este archivo es la fuente Markdown. El HTML y el PDF local se generaron para revisión; no fueron publicados ni subidos a Drive.
