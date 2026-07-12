---
DOCUMENTO: "Estado de avance actualizado"
VERSION: "0.2"
FECHA: "2026-07-08"
ESTADO: "EN_REVISION"
FUENTE:
  - "docs/PROJECT_STATE.md"
  - "docs/TASKS.md"
  - "docs/CHANGELOG.md"
TIPO_INFORME: "AVANCE_ALMACEN"
---

# Informe de avance para el Almacén
## Web Almacén Popular Rosa Elena Morales

**Documento:** Estado de avance actualizado
**Versión:** v0.2
**Fecha:** 2026-07-08
**Estado actual:** Fase 2 completada
**Próxima prioridad:** Fase 3 — Configuración real y orden operativo de pedidos
**Meta:** Avanzar hacia una primera versión operativa completa para el funcionamiento del almacén.

---

## Estado general

La web del Almacén Popular Rosa Elena Morales ya tiene una base funcional más segura y ordenada.

Actualmente la página permite:

- mostrar productos reales;
- recibir pedidos online;
- guardar pedidos en una base compartida;
- descontar stock al crear pedidos;
- revisar pedidos desde un panel admin;
- proteger el panel admin con acceso seguro.

El avance más importante de esta etapa es que el panel admin ya no queda abierto para cualquier persona con el link. Ahora requiere inicio de sesión.

---

## Resumen de avance

| Área | Estado |
|---|---|
| Página web base | Realizada |
| Catálogo de productos | Realizado |
| Carrito | Realizado |
| Envío por WhatsApp | Realizado |
| Pedidos reales en base compartida | Realizado |
| Panel admin leyendo pedidos | Realizado |
| Seguridad del panel admin | Realizada |
| Organización Drive / base web | Realizada |
| Configuración real del almacén | Próxima etapa |
| Productos, stock, precios e imágenes | Pendiente operativo |
| Panel vendedor y comandas | Pendiente |
| Caja, pendientes y cierre | Pendiente |

---

## Trabajo complementario realizado

Además de las fases del plan original, se realizó un trabajo de orden interno para dejar la información del proyecto mejor organizada.

Se creó una carpeta específica para la web dentro del Drive del almacén:

```txt
WEB — Almacén Popular Rosa Elena Morales
```

Dentro de esa carpeta se ordenó la información en subcarpetas:

```txt
00_Documentación
01_Base operativa WEB
02_Respaldos y versiones
03_Diseño y recursos visuales
99_Archivo histórico
```

La base operativa de la web quedó ubicada en:

```txt
WEB — Almacén Popular Rosa Elena Morales
└── 01_Base operativa WEB
    └── BD_WEB_ALMACEN_ROSA_ELENA_MORALES
```

Esto permite que la web tenga una base más clara y que el trabajo no dependa de archivos sueltos.

Checklist:

- [x] Crear carpeta web dentro del Drive del almacén.
- [x] Crear subcarpetas de documentación, base, respaldos, diseño y archivo histórico.
- [x] Ubicar la base operativa web en la carpeta correspondiente.
- [x] Mantener funcionando la conexión de la web después del ordenamiento.
- [x] Dejar la base lista para seguir trabajando por etapas.

---

## Fase 0 — Orden inicial del proyecto

**Estado:** Lista.

- [x] Revisar la página existente.
- [x] Ordenar el trabajo por etapas.
- [x] Definir un plan general de avance.
- [x] Separar lo técnico de lo operativo y lo público.
- [x] Empezar a organizar la información disponible.
- [x] Revisar Drive del almacén de forma preliminar.
- [x] Identificar documentos útiles para el sistema.

---

## Fase 1 — Base operativa y pedidos reales

**Estado:** Funcional y probada.

Esta fase permitió que los pedidos ya no dependan solo del navegador o de un computador específico.

### 1.1 Base operativa

- [x] Crear una base operativa para la web.
- [x] Crear hojas principales para productos, pedidos, detalle de pedidos, clientes, ventas, compras, movimientos de stock y configuración.
- [x] Cargar configuración inicial.
- [x] Cargar productos iniciales.

### 1.2 Productos iniciales

- [x] Cargar 53 productos reales.
- [x] Crear códigos internos para los productos.
- [x] Usar códigos tipo `PROD-001`, `PROD-002`, etc.
- [x] Cargar precios iniciales.
- [x] Usar stock temporal para pruebas.

### 1.3 Pedidos reales

- [x] Crear backend con Apps Script.
- [x] Permitir crear pedidos reales.
- [x] Guardar pedidos en Google Sheets.
- [x] Guardar detalle de productos pedidos.
- [x] Descontar stock al crear pedido.
- [x] Registrar movimientos de stock.
- [x] Permitir cancelar pedidos.
- [x] Permitir cambiar estado del pedido.
- [x] Permitir cambiar estado de pago.

### 1.4 Conexión con la web

- [x] Conectar la tienda con la base operativa.
- [x] Conectar el catálogo a productos reales.
- [x] Conectar el panel admin a pedidos reales.
- [x] Dejar de depender de `localStorage` como base real de pedidos.
- [x] Probar flujo completo: tienda, pedido, base operativa, panel admin y stock.

---

## Fase 2 — Seguridad del panel admin

**Estado:** Lista y probada.

Esta fase era prioritaria porque el sistema ya maneja pedidos reales y datos de personas.

Antes, el panel admin tenía una protección muy básica. Ahora se implementó un acceso más seguro.

Checklist actualizado:

- [x] Crear acceso seguro para administrador.
- [x] Sacar clave hardcodeada del frontend.
- [x] Crear inicio de sesión real.
- [x] Crear cierre de sesión.
- [x] Usar sesión segura con cookie `httpOnly`.
- [x] Proteger el panel admin.
- [x] Proteger rutas internas del admin.
- [x] Evitar que cualquier persona con el link pueda ver pedidos.
- [x] Mantener claves y datos sensibles fuera del código público.
- [x] Probar acceso correcto.
- [x] Probar acceso rechazado sin sesión.
- [x] Probar cierre de sesión.
- [x] Probar que la tienda pública sigue funcionando.
- [x] Probar que el catálogo público sigue funcionando.

Resultado:

```txt
El panel admin ahora pide inicio de sesión.
Si una persona no tiene acceso, no puede entrar a ver los pedidos.
```

---

## Información disponible actualmente

- [x] Página web base.
- [x] Catálogo inicial.
- [x] Carrito.
- [x] Envío por WhatsApp.
- [x] Primera versión de admin.
- [x] Base operativa inicial.
- [x] Productos iniciales cargados.
- [x] Pedidos reales funcionando.
- [x] Panel admin leyendo pedidos reales.
- [x] Stock descontándose.
- [x] Flujo tienda -> base operativa -> admin probado.
- [x] Drive del almacén identificado.
- [x] Carpeta específica para la web creada.
- [x] Base operativa ubicada dentro del Drive del almacén.
- [x] Seguridad admin implementada.
- [x] Acceso admin probado en producción.

---

## Información pendiente por confirmar

- [ ] WhatsApp oficial para pedidos.
- [ ] Contacto general del almacén.
- [ ] Correo oficial del almacén para la web.
- [ ] Próxima fecha de apertura.
- [ ] Texto oficial de aportes.
- [ ] Texto oficial sobre cómo participar.
- [ ] Texto oficial sobre el almacén.
- [ ] Texto oficial sobre Rosa Elena Morales.
- [ ] Links públicos oficiales.
- [ ] Personas con acceso admin.
- [ ] Personas con acceso vendedor.
- [ ] Criterio final para publicación de imágenes de productos.
- [ ] Criterio final para publicación de imágenes históricas o comunitarias.

---

## Observaciones detectadas para la próxima etapa

Durante las pruebas del panel admin se detectaron puntos que conviene revisar antes de seguir agregando funciones grandes.

### 1. Estados de los pedidos

Hoy el sistema permite cambiar estados, pero falta revisar si el flujo es cómodo para el uso real.

Ejemplo: si un pedido se marca como `Listo`, puede ser necesario volverlo a `Pendiente` si fue un error.

Esto se debe ordenar en la próxima etapa.

### 2. Pago de pedidos

Apareció un estado como:

```txt
pagado_efectivo
```

Conviene revisar si eso representa:

- que el pedido está pagado;
- que el método fue efectivo;
- o ambas cosas juntas.

Para una operación más clara, probablemente convenga separar:

```txt
Estado de pago: pendiente / pagado
Método de pago: efectivo / transferencia
```

### 3. Stock y cancelaciones

El sistema descuenta stock al crear pedidos. En la próxima revisión conviene confirmar bien qué pasa cuando un pedido se cancela o se corrige.

---

## Fase 3 — Configuración real del almacén

**Estado:** Próxima prioridad.

Esta fase busca reemplazar datos temporales por información oficial del almacén y ordenar el funcionamiento real del panel.

Checklist inicial:

- [ ] Confirmar WhatsApp oficial para pedidos.
- [ ] Confirmar contacto general.
- [ ] Confirmar correo oficial del almacén para la web.
- [ ] Confirmar próxima apertura.
- [ ] Confirmar textos principales de la página.
- [ ] Confirmar texto público para la sección de aportes.
- [ ] Confirmar texto sobre cómo participar.
- [ ] Confirmar links oficiales.
- [ ] Definir qué información del Drive se usará en la web pública.
- [ ] Definir qué información queda solo como referencia interna.

### Fase 3A — Orden operativo de pedidos, pago y stock

Se recomienda agregar esta subfase antes de avanzar a productos avanzados, caja o panel vendedor.

Objetivo:

```txt
Dejar claro cómo se manejan los pedidos, pagos, cancelaciones y stock para evitar errores en la operación real.
```

Checklist sugerido:

- [ ] Revisar estados actuales de pedido.
- [ ] Definir si se puede volver de `Listo` a `Pendiente`.
- [ ] Revisar cómo se registra el pago.
- [ ] Separar estado de pago y método de pago si corresponde.
- [ ] Confirmar qué pasa con el stock cuando se cancela un pedido.
- [ ] Confirmar qué pasa si se corrige un pedido.
- [ ] Mejorar botones del panel admin para evitar errores.
- [ ] Agregar confirmaciones antes de acciones importantes.

---

## Roadmap actualizado

| Fase | Nombre | Estado |
|---|---|---|
| Fase 0 | Orden inicial del proyecto | Lista |
| Fase 1 | Base operativa y pedidos reales | Funcional y probada |
| Bloque complementario | Drive, base web y configuración de producción | Realizado |
| Fase 2 | Seguridad del panel admin | Lista y probada |
| Fase 3 | Configuración real del almacén | Próxima prioridad |
| Fase 3A | Estados, pago y stock | Próximo diagnóstico recomendado |
| Fase 4 | Productos, stock, precios e imágenes | Pendiente operativo |
| Fase 5 | Panel vendedor y comandas | Pendiente |
| Fase 6 | Caja, pendientes y cierre por apertura | Pendiente |
| Fase 7 | Compras y abastecimiento | Pendiente con criterio definido |
| Fase 8 | Historial, reportes y administración avanzada | Pendiente avanzado |
| Fase 9 | Contenido público, historia y comunidad | Pendiente no urgente |
| Fase 10 | Producción y versión operativa final | Meta final |

---

## Próximo paso recomendado

Avanzar con:

```txt
Fase 3A — Orden operativo de pedidos, pago y stock.
```

Antes de sumar nuevas funciones, conviene revisar el flujo real de pedidos para asegurar que el panel sea fácil y seguro de usar durante la operación del almacén.

Después de eso, se recomienda avanzar con:

- Fase 3 — configuración real del almacén;
- Fase 4 — productos, stock, precios e imágenes;
- Fase 5 — panel vendedor y comandas.

---

## Síntesis

La web ya no es solo una vitrina informativa. Ahora tiene una base operativa real, recibe pedidos, descuenta stock y permite revisar pedidos desde un panel protegido.

La Fase 2, que antes era la prioridad pendiente, ya está completada.

El siguiente avance debe enfocarse en ordenar el uso diario del panel: estados de pedido, pagos, cancelaciones y stock. Esto permitirá avanzar con mayor seguridad hacia productos, comandas, caja, compras e historial.
