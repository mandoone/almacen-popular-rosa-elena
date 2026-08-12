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

## 5. Checklist completo del proceso por fases

Este checklist mantiene la continuidad del informe v0.2.2. Presenta el proceso
completo, desde la organización inicial hasta la primera versión operativa, y
actualiza la Fase 3 con los avances reales de Fase 3A. Cada tarea conserva su
estado principal y, cuando corresponde, indica si requiere respuesta o validación
del Almacén o si es trabajo técnico interno.

### Fase 0 — Orden inicial del proyecto — **[Realizado]**

- [x] **[Realizado]** Revisar la página existente.
- [x] **[Realizado]** Ordenar el trabajo por etapas.
- [x] **[Realizado]** Definir un plan general de avance.
- [x] **[Realizado]** Separar lo técnico de lo operativo y lo público.
- [x] **[Realizado]** Empezar a organizar la información disponible.
- [x] **[Realizado]** Revisar informe anterior de estado.
- [x] **[Realizado]** Revisar Drive del almacén de forma preliminar.
- [x] **[Realizado]** Identificar documentos útiles para el sistema.

### Fase 1 — Base operativa y pedidos reales — **[Realizado]**


El modelo de stock vigente corresponde todavía a la versión anterior y será revisado en TEST.
Los pedidos dejaron de depender del navegador de cada persona. La tienda, la base operativa y el panel admin trabajan sobre información compartida.

#### 1.1 Base operativa

- [x] **[Realizado]** Crear una base operativa para la web.
- [x] **[Realizado]** Crear hojas principales para productos, pedidos, detalle de pedidos, clientes, ventas, compras, movimientos de stock y configuración.
- [x] **[Realizado]** Cargar configuración temporal.
- [x] **[Realizado]** Cargar productos iniciales.

#### 1.2 Productos iniciales

- [x] **[Realizado]** Cargar 53 productos reales.
- [x] **[Realizado]** Crear códigos internos para los productos.
- [x] **[Realizado]** Usar códigos tipo PROD-001 , PROD-002 , etc.
- [x] **[Realizado]** Cargar precios iniciales.
- [x] **[Realizado]** Usar stock temporal para pruebas.

#### 1.3 Pedidos reales

- [x] **[Realizado]** Crear backend con Apps Script.
- [x] **[Realizado]** Permitir crear pedidos reales.
- [x] **[Realizado]** Guardar pedidos en Google Sheets.
- [x] **[Realizado]** Guardar detalle de productos pedidos.
- [x] **[Realizado]** Descontar stock al crear pedido.
- [x] **[Realizado]** Registrar movimientos de stock.
- [x] **[Realizado]** Permitir cancelar pedidos.
- [x] **[Realizado]** Devolver stock al cancelar.
- [x] **[Realizado]** Permitir cambiar estado del pedido.
- [x] **[Realizado]** Permitir cambiar estado de pago.

#### 1.4 Conexión con la web

- [x] **[Realizado]** Conectar la tienda con la base operativa.
- [x] **[Realizado]** Conectar el catálogo a productos reales.
- [x] **[Realizado]** Conectar el panel admin a pedidos reales.
- [x] **[Realizado]** Dejar de depender de localStorage como base real de pedidos.
- [x] **[Realizado]** Probar el flujo completo: tienda, pedido, base operativa, panel admin y stock.

### Fase 2 — Seguridad del panel admin — **[Realizado]**

La protección básica anterior fue reemplazada por un acceso administrativo real y probado. Se conserva completo el checklist de la v0.1 y se incorporan las validaciones realizadas después.

- [x] **[Realizado]** Crear acceso seguro para administrador.
- [x] **[Realizado]** Sacar clave hardcodeada del frontend.
- [x] **[Realizado]** Crear inicio de sesión real.
- [x] **[Realizado]** Crear cierre de sesión.
- [x] **[Realizado]** Usar sesión segura con cookie httpOnly .
- [x] **[Realizado]** Proteger el panel admin.
- [x] **[Realizado]** Proteger rutas internas del admin.
- [x] **[Realizado]** Evitar que cualquier persona con el link pueda ver pedidos.
- [x] **[Realizado]** Mantener claves y datos sensibles fuera del código público.
- [x] **[Realizado]** Probar acceso correcto.
- [x] **[Realizado]** Probar acceso rechazado sin sesión.
- [x] **[Realizado]** API admin sin sesión responde 401 (agregado v0.2.2) .
- [x] **[Realizado]** Variables seguras configuradas (agregado v0.2.2) .
- [x] **[Realizado]** Validación en producción (agregado v0.2.2) .
- [x] **[Realizado]** Logout probado (agregado v0.2.2) .

> **Seguridad:** el informe no incluye contraseñas. Cualquier clave compartida por
> WhatsApp debe tratarse posteriormente por un canal seguro y no quedar en
> documentos públicos.

### Fase 3 — Configuración real del almacén — **[Próxima prioridad]**

La fase está en curso. Ya se recibieron datos oficiales y Fase 3A avanzó en el
panel administrativo; todavía faltan decisiones operativas del Almacén y pruebas
técnicas sobre copias TEST.

#### 3.1 Datos oficiales recibidos

- [x] **[Realizado]** WhatsApp oficial para pedidos recibido.
- [x] **[Realizado]** Contacto general recibido.
- [x] **[Realizado]** Correo oficial recibido, sin incluir claves en este informe.
- [x] **[Realizado]** Fechas preliminares de apertura recibidas.
- [x] **[Realizado]** Listado preliminar de roles de administración, operación y venta recibido.
- [x] **[Realizado]** Disponibilidad de fotos de productos en Drive informada.
- [x] **[Realizado]** Documento de preguntas pendientes enviado el 29/7/2026.

#### 3.2 Decisiones para personalizar con el Almacén

- [ ] **[Pendiente]** **[Responde Almacén]** Definir horario de apertura y retiro.
- [ ] **[Pendiente]** **[Responde Almacén]** Definir cierre de pedidos online.
- [ ] **[Pendiente]** **[Responde Almacén]** Definir quiénes pueden confirmar pedidos.
- [ ] **[Pendiente]** **[Responde Almacén]** Definir quiénes pueden cancelar pedidos.
- [ ] **[Pendiente]** **[Validar Almacén]** Validar el flujo `Recibido → Pendiente/Listo → Entregado` y sus estados finales.
- [ ] **[Pendiente]** **[Validar Almacén]** Validar categorías iniciales.
- [ ] **[Pendiente]** **[Validar Almacén]** Validar unidades de venta.
- [ ] **[Pendiente]** **[Responde Almacén]** Informar productos solo presenciales.
- [ ] **[Pendiente]** **[Validar Almacén]** Validar textos públicos actuales.
- [ ] **[Pendiente]** **[Responde Almacén]** Definir cambios en historia, comunidad y participación.

#### 3.3 Avances técnicos de Fase 3A

- [x] **[Realizado]** Implementar reglas visuales del panel admin.
- [x] **[Realizado]** Validar transiciones peligrosas desde la web y su proxy administrativo.
- [x] **[Realizado]** Alinear botones del panel con el flujo permitido.
- [x] **[Realizado]** Agregar acciones válidas faltantes.
- [x] **[Realizado]** Crear revisión de prueba del panel con pedidos ficticios.
- [x] **[Realizado]** Aprobar QA visual local.
- [x] **[Realizado]** Crear checklist interno del entorno TEST.
- [x] **[Realizado]** Preparar rama para revisión y push.

#### 3.4 Próxima prioridad técnica

- [ ] **[Próxima prioridad]** **[Uso interno técnico]** Preparar copias TEST de Sheet y Apps Script y conectarlas por ID explícito.
- [ ] **[Próxima prioridad]** **[Uso interno técnico]** Probar stock y dos acciones realizadas al mismo tiempo.
- [ ] **[Próxima prioridad]** **[Uso interno técnico]** Validar si el nuevo manejo de stock está listo para implementarse en producción.

### Fase 4 — Productos, stock, precios e imágenes — **[Pendiente]**

Esta fase busca ordenar los productos y cómo se venderán.

#### 4.1 Productos y categorías

- [ ] **[Pendiente]** Revisar categorías reales.
- [ ] **[Pendiente]** Ordenar productos por categoría: granel, alimentos, higiene, limpieza y otros.
- [ ] **[Pendiente]** Revisar productos a granel.
- [ ] **[Pendiente]** Permitir cantidades con decimales para productos a granel.
- [ ] **[Pendiente]** Definir unidad de venta: unidad, kilo, gramos, litro y mililitros.
- [ ] **[Pendiente]** Revisar stock real por producto.
- [ ] **[Pendiente]** Definir stock mínimo por producto.
- [ ] **[Pendiente]** Definir prioridad por producto: alta, media y baja.
- [ ] **[Pendiente]** Mostrar alerta cuando un producto esté bajo stock.

#### 4.2 Precios

El sistema debe manejar tres valores: precio costo, precio sugerido y precio final de venta.

- [ ] **[Pendiente]** Mantener precio costo por producto.
- [ ] **[Pendiente]** Calcular precio sugerido.
- [ ] **[Pendiente]** Mantener precio final de venta.
- [ ] **[Pendiente]** Mostrar al comprador solo el precio final de venta.
- [ ] **[Pendiente]** Mostrar al admin el precio costo y precio sugerido.
- [ ] **[Pendiente]** Usar margen global inicial de 10%.
- [ ] **[Pendiente]** Permitir cambiar el margen global.
- [ ] **[Pendiente]** Permitir margen por categoría.
- [ ] **[Pendiente]** Permitir margen específico por producto.
- [ ] **[Pendiente]** Aplicar jerarquía de margen: por producto, por categoría y global.
- [ ] **[Pendiente]** No cambiar automáticamente el precio publicado cuando cambie el costo.
- [ ] **[Pendiente]** Dejar producto como “requiere revisión de precio” cuando cambie el costo.
- [ ] **[Pendiente]** Permitir que el admin confirme o ajuste el precio final.
- [ ] **[Pendiente]** Guardar historial de cambios de costo y precio.

#### 4.3 Imágenes de productos

- [ ] **[Pendiente]** Guardar originales sin editar.
- [ ] **[Pendiente]** Guardar imágenes limpias aprobadas para web.
- [ ] **[Pendiente]** Separar imágenes pendientes de revisión.
- [ ] **[Pendiente]** Separar imágenes descartadas.
- [ ] **[Pendiente]** Asociar cada imagen al código interno del producto.
- [ ] **[Pendiente]** Agregar campo de imagen en la base operativa de productos.
- [ ] **[Pendiente]** Definir si las imágenes finales se cargarán desde Drive, desde el proyecto web o desde otro sistema de almacenamiento.

### Fase 5 — Panel vendedor y comandas — **[Pendiente]**

Esta fase busca digitalizar la venta presencial, manteniendo la lógica de las comandas actuales.

- [ ] **[Pendiente]** Crear panel vendedor.
- [ ] **[Pendiente]** Registrar venta presencial.
- [ ] **[Pendiente]** Buscar productos.
- [ ] **[Pendiente]** Agregar productos a una venta.
- [ ] **[Pendiente]** Ingresar cantidades.
- [ ] **[Pendiente]** Permitir cantidades decimales para productos a granel.
- [ ] **[Pendiente]** Calcular total automáticamente.
- [ ] **[Pendiente]** Descontar stock al confirmar venta.
- [ ] **[Pendiente]** Generar número de comanda.
- [ ] **[Pendiente]** Generar comanda automática.
- [ ] **[Pendiente]** Mantener formato similar al actual.
- [ ] **[Pendiente]** Permitir imprimir comanda.
- [ ] **[Pendiente]** Registrar nombre de vecina/o.
- [ ] **[Pendiente]** Registrar teléfono si corresponde.
- [ ] **[Pendiente]** Registrar integrante que atiende.
- [ ] **[Pendiente]** Registrar modo de pago: efectivo, transferencia o pendiente.
- [ ] **[Pendiente]** Registrar cuando alguien queda debiendo.
- [ ] **[Pendiente]** Asociar pendientes al número de comanda.

### Fase 6 — Caja, pendientes y cierre por apertura — **[Pendiente]**

Esta fase busca ordenar ventas, dinero disponible, gastos y pendientes.

#### 6.1 Caja por apertura

- [ ] **[Pendiente]** Registrar fecha de apertura.
- [ ] **[Pendiente]** Registrar ventas totales.
- [ ] **[Pendiente]** Separar efectivo.
- [ ] **[Pendiente]** Separar transferencias.
- [ ] **[Pendiente]** Separar pendientes.
- [ ] **[Pendiente]** Separar gastos extra.
- [ ] **[Pendiente]** Registrar integrante responsable.
- [ ] **[Pendiente]** Generar cierre por apertura.

#### 6.2 Pendientes

Los pendientes son ventas o comandas donde alguien quedó debiendo. Se tratan como cuentas por cobrar y no entran automáticamente como caja real.

- [ ] **[Pendiente]** Registrar pendiente por cobrar.
- [ ] **[Pendiente]** Asociar pendiente a número de comanda.
- [ ] **[Pendiente]** Guardar nombre.
- [ ] **[Pendiente]** Guardar teléfono si existe.
- [ ] **[Pendiente]** Guardar monto.
- [ ] **[Pendiente]** Guardar fecha.
- [ ] **[Pendiente]** Guardar estado: pendiente o pagado.
- [ ] **[Pendiente]** Permitir marcar pendiente como pagado.
- [ ] **[Pendiente]** Registrar fecha de pago.
- [ ] **[Pendiente]** Registrar modo de pago cuando se regulariza: efectivo o transferencia.
- [ ] **[Pendiente]** Mostrar total de pendientes por cobrar.

#### 6.3 Gastos extra

- [ ] **[Pendiente]** Registrar gastos extra.
- [ ] **[Pendiente]** Usar categorías iniciales: bencina, bolsas, propina, transporte, materiales y otros.
- [ ] **[Pendiente]** Ver historial de gastos.
- [ ] **[Pendiente]** Considerar estos gastos en la caja.

### Fase 7 — Compras y abastecimiento — **[Pendiente]**

Esta fase toma como referencia el documento de diseño de compra existente y busca automatizar parte del proceso.

#### 7.1 Registro de compras

- [ ] **[Pendiente]** Registrar compras de productos.
- [ ] **[Pendiente]** Registrar fecha.
- [ ] **[Pendiente]** Registrar responsable.
- [ ] **[Pendiente]** Registrar productos comprados.
- [ ] **[Pendiente]** Registrar cantidad.
- [ ] **[Pendiente]** Registrar costo unitario.
- [ ] **[Pendiente]** Registrar costo total.
- [ ] **[Pendiente]** Actualizar stock.
- [ ] **[Pendiente]** Registrar movimiento de stock.
- [ ] **[Pendiente]** Actualizar precio costo.
- [ ] **[Pendiente]** Guardar historial de precios.

#### 7.2 Caja disponible para compra

El sistema debe considerar saldo en cuenta, efectivo disponible, pendientes por cobrar como referencia, gastos extra y la caja final definida por el equipo.

- [ ] **[Pendiente]** Registrar saldo en cuenta.
- [ ] **[Pendiente]** Registrar efectivo disponible.
- [ ] **[Pendiente]** Mostrar pendientes por cobrar como referencia.
- [ ] **[Pendiente]** Registrar gastos extra estimados.
- [ ] **[Pendiente]** Calcular caja disponible sugerida.
- [ ] **[Pendiente]** Permitir editar manualmente la caja final para compra.
- [ ] **[Pendiente]** Usar caja final confirmada para diseñar compra.

#### 7.3 Diseño automático de compra

- [ ] **[Pendiente]** Revisar stock actual.
- [ ] **[Pendiente]** Revisar stock mínimo.
- [ ] **[Pendiente]** Revisar prioridad de productos.
- [ ] **[Pendiente]** Revisar costo actualizado.
- [ ] **[Pendiente]** Revisar caja final disponible.
- [ ] **[Pendiente]** Proponer productos a comprar.
- [ ] **[Pendiente]** Priorizar productos críticos bajo stock.
- [ ] **[Pendiente]** Permitir editar la propuesta antes de confirmar.
- [ ] **[Pendiente]** Confirmar compra.
- [ ] **[Pendiente]** Actualizar stock.
- [ ] **[Pendiente]** Actualizar costos.
- [ ] **[Pendiente]** Generar historial.

### Fase 8 — Historial, reportes y administración avanzada — **[Pendiente]**

- [ ] **[Pendiente]** Ver historial de pedidos online.
- [ ] **[Pendiente]** Ver historial de ventas presenciales.
- [ ] **[Pendiente]** Ver historial de compras.
- [ ] **[Pendiente]** Ver historial de movimientos de stock.
- [ ] **[Pendiente]** Ver historial de precios.
- [ ] **[Pendiente]** Ver historial de pendientes.
- [ ] **[Pendiente]** Ver ventas por apertura.
- [ ] **[Pendiente]** Ver caja por apertura.
- [ ] **[Pendiente]** Ver productos más vendidos.
- [ ] **[Pendiente]** Ver productos bajo stock.
- [ ] **[Pendiente]** Editar productos desde admin.
- [ ] **[Pendiente]** Crear productos nuevos.
- [ ] **[Pendiente]** Activar o desactivar productos.
- [ ] **[Pendiente]** Editar stock con registro de motivo.
- [ ] **[Pendiente]** Editar configuración del almacén desde admin.
- [ ] **[Pendiente]** Mejorar control de roles: admin y vendedor.

### Fase 9 — Contenido público, historia y comunidad — **[Pendiente]**

Esta fase usa el material del Drive que sirve para mostrar la identidad del almacén.

- [ ] **[Pendiente]** Revisar imágenes de Rosa Elena.
- [ ] **[Pendiente]** Revisar logo.
- [ ] **[Pendiente]** Revisar afiches.
- [ ] **[Pendiente]** Revisar boletines.
- [ ] **[Pendiente]** Revisar infografías.
- [ ] **[Pendiente]** Revisar fotos y videos.
- [ ] **[Pendiente]** Revisar calendario mensual.
- [ ] **[Pendiente]** Revisar libro o material histórico.
- [ ] **[Pendiente]** Definir si el libro se citará o enlazará desde la web.
- [ ] **[Pendiente]** Definir qué contenido va en la web pública.
- [ ] **[Pendiente]** Definir qué contenido queda como archivo interno.
- [ ] **[Pendiente]** Mejorar la sección de historia.
- [ ] **[Pendiente]** Explicar cómo funciona el almacén.
- [ ] **[Pendiente]** Explicar cómo participar.
- [ ] **[Pendiente]** Explicar cómo aportar.
- [ ] **[Pendiente]** Mejorar diseño visual.
- [ ] **[Pendiente]** Revisar versión móvil.

### Fase 10 — Producción y versión operativa final — **[Pendiente]**

Esta es la meta final de la primera versión completa del sistema.

- [ ] **[Pendiente]** Definir hosting final.
- [ ] **[Pendiente]** Configurar variables de producción.
- [ ] **[Pendiente]** Configurar claves definitivas de forma segura.
- [ ] **[Pendiente]** Configurar la credencial técnica definitiva sin exponer su valor.
- [ ] **[Pendiente]** Probar tienda desde celular.
- [ ] **[Pendiente]** Probar pedidos desde fuera de red local.
- [ ] **[Pendiente]** Probar admin desde otro computador.
- [ ] **[Pendiente]** Probar panel vendedor.
- [ ] **[Pendiente]** Probar comanda imprimible.
- [ ] **[Pendiente]** Probar cierre de apertura.
- [ ] **[Pendiente]** Probar compra y actualización de stock.
- [ ] **[Pendiente]** Probar pendientes.
- [ ] **[Pendiente]** Validar flujo completo con el equipo del almacén.
- [ ] **[Pendiente]** Capacitar uso básico.
- [ ] **[Pendiente]** Dejar documentación mínima de uso.
- [ ] **[Pendiente]** Cerrar primera versión operativa.
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
