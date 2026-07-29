# Levantamiento operativo — Fase 3A / Fase 4
## Web Almacén Popular Rosa Elena Morales

**Estado:** levantamiento operativo completo  
**Total revisado:** 56/56 preguntas  
**Avance:** 100%  
**Decisiones definidas:** 45  
**Preguntas pendientes para Carolina/Nadia:** 11  

---

## 1. Criterio general adoptado

El levantamiento queda listo para pasar a diagnóstico e implementación técnica de **Fase 3A**, siempre que las preguntas pendientes para Carolina/Nadia se traten como parámetros editables o pendientes controlados, no como bloqueo absoluto.

La implementación no debe esperar a tener todo el contenido editorial final. Debe avanzar primero con el flujo operativo mínimo: pedidos, stock, pagos, responsables, estados, cancelaciones, catálogo y panel admin.

---

## 2. Preguntas pendientes para Carolina/Nadia

### 2.1 Horario de apertura/retiro

**Pregunta:** ¿Cuál será el horario de apertura o retiro para las próximas fechas del Almacén?

**Fechas informadas:** 18 de julio, 1 de agosto, 15 de agosto, 5 de septiembre y 19 de septiembre a evaluar.

**Propuesta:** Confirmar si todas las fechas tendrán el mismo horario o si el horario puede cambiar según la fecha.

**Respuesta Carolina/Nadia:** Pendiente.

### 2.2 Fecha u hora límite para pedidos online

**Pregunta:** ¿Cuándo debería cerrarse la recepción de pedidos online antes de cada apertura?

**Propuesta:** Definir una regla simple: día anterior en la noche, mismo día temprano, una hora específica antes de la apertura, u otra regla definida por Carolina/Nadia.

**Respuesta Carolina/Nadia:** Pendiente.

### 2.3 Quién puede confirmar pedidos y descontar stock

**Pregunta:** ¿Quiénes deben poder confirmar un pedido “Recibido” y pasarlo a “Pendiente” o “Listo”?

**Contexto:** El pedido “Recibido” no descuenta stock. Al confirmarlo pasa a “Pendiente” o “Listo” y ahí descuenta stock.

**Propuesta inicial:** Carolina/Nadia por administración; Lucía/Seba por operación; vendedores solo si Carolina/Nadia quieren que también puedan confirmar stock/pedido.

**Respuesta Carolina/Nadia:** Pendiente.

### 2.4 Quién puede cancelar pedidos

**Pregunta:** ¿Quiénes pueden cancelar pedidos?

**Contexto:** Cancelar un pedido puede devolver stock si ya estaba confirmado.

**Propuesta inicial:** Administración y operación pueden cancelar. Venta no cancela en primera versión; puede avisar a administración/operación.

**Respuesta Carolina/Nadia:** Pendiente.

### 2.5 Validación general del flujo operativo

**Pregunta:** ¿El flujo general de pedido recibido, revisión, confirmación, pago, entrega y rendición les acomoda para la operación real del Almacén?

**Propuesta:** Validar el flujo como base inicial, con ajustes posteriores cuando el sistema tome ritmo.

**Respuesta Carolina/Nadia:** Pendiente.

### 2.6 Categorías oficiales iniciales

**Pregunta:** ¿Cuáles serán las categorías oficiales iniciales del catálogo?

**Propuesta base:** Granel, Alimentos, Limpieza, Higiene y Otros.

**Criterio Omar:** Preguntar a Nadia y Carolina según los productos que tengan actualmente o que piensen integrar. Mostrarles estas categorías como propuesta base y consultar si quieren agregar, quitar o cambiar alguna.

**Respuesta Carolina/Nadia:** Pendiente.

### 2.7 Orden de categorías en la tienda

**Pregunta:** ¿En qué orden deben mostrarse las categorías en la tienda?

**Propuesta base:** Granel, Alimentos, Limpieza, Higiene y Otros.

**Criterio Omar:** De acuerdo con la propuesta, pero debe validarse con Carolina/Nadia porque depende de las categorías oficiales que definan.

**Respuesta Carolina/Nadia:** Pendiente.

### 2.8 Unidades de venta

**Pregunta:** ¿Qué unidades de venta debe aceptar el sistema?

**Propuesta base:** Unidad, kilo, gramos, litro, mililitro y pack.

**Criterio Omar:** Preguntar a Carolina y Nadia según las categorías y productos existentes. Mostrarles el listado de productos actual y una propuesta de unidades según esos productos.

**Respuesta Carolina/Nadia:** Pendiente.

### 2.9 Productos solo para venta presencial

**Pregunta:** ¿Qué hacer con productos que existan en el almacén, pero no se quieran vender online?

**Propuesta base:** Tener un estado o marca “Solo venta presencial”. En primera versión simple: dejarlos inactivos online y registrar nota interna.

**Criterio Omar:** Preguntar a Carolina/Nadia.

**Respuesta Carolina/Nadia:** Pendiente.

### 2.10 Validación de textos públicos actuales

**Pregunta:** ¿Qué hacer con los textos públicos actuales de la web mientras no estén validados por el Almacén?

**Propuesta:** Mantenerlos como preliminares y no bloquear avance técnico.

**Criterio Omar:** Avanzar igual, pero dejar pendiente que Carolina/Nadia validen la información de cada sección o propongan otros textos, imágenes, videos, referencias, páginas o links.

**Respuesta Carolina/Nadia:** Pendiente.

### 2.11 Historia, comunidad y participación

**Pregunta:** ¿Qué se debe hacer con las secciones de historia, comunidad y participación?

**Propuesta:** Dejarlas como contenido preliminar hasta validación editorial.

**Criterio Omar:** Avanzar igual, pero dejar pendiente que Carolina/Nadia validen la información de cada sección o propongan otros textos, imágenes, videos, referencias, páginas o links.

**Respuesta Carolina/Nadia:** Pendiente.

---

## 3. Decisiones aprobadas por Omar

### 3.1 Roles iniciales

**Administración + operación, acceso máximo inicial:** Carolina Catalán y Nadia Valdebenito.  
**Operación + venta:** Lucía.  
**Operación:** Seba.  
**Venta:** Juan Py, Cris, Mati y Lizzie.

**Criterio:** Carolina y Nadia quedan como responsables principales del sistema durante la etapa inicial. Tendrán acceso máximo para administrar configuración, productos, precios, stock, aperturas y operación de pedidos.

### 3.2 Lugar de retiro

**Lugar definido:** Almacén Popular Rosa Elena Morales, Gamero 2670, Independencia, Espacio Recuperado Trenza la Río.

### 3.3 Catálogo y pedidos

- El catálogo siempre debe estar visible.
- La tienda no se oculta cuando no hay apertura activa.
- Los pedidos pueden ingresarse fuera de horario o sin apertura activa.
- El pedido queda registrado y se informa que será revisado por el Almacén.
- Los pedidos no se asocian automáticamente a una fecha de apertura si no existe una apertura activa.

**Mensaje de confirmación al cliente:**  
Tu pedido fue recibido correctamente. El Almacén Popular revisará tu solicitud y te contactará por WhatsApp para confirmar disponibilidad, retiro y forma de pago.

### 3.4 Estados de pedido

| Estado | Descripción | Stock |
|---|---|---|
| Recibido | Pedido ingresado por la web, pendiente de revisión interna. | No descuenta stock. |
| Pendiente | Pedido revisado y aceptado, pendiente de preparación. | Descuenta stock. |
| Listo | Pedido preparado, pendiente de retiro o entrega. | Descuenta stock. |
| Entregado | Pedido retirado o entregado. | Stock ya descontado. |
| Cancelado | Pedido anulado. | Depende del estado anterior. |

**Flujo aprobado:** Recibido → Pendiente; Recibido → Listo; Pendiente → Listo; Listo → Pendiente; Listo → Entregado; Recibido/Pendiente/Listo → Cancelado. Cancelado no se reabre. Entregado no se cancela en flujo normal.

### 3.5 Reabrir pedidos cancelados

No permitir reabrir pedidos cancelados en primera versión. Si el cliente quiere retomar el pedido, se debe crear un nuevo pedido.

### 3.6 Edición de pedidos

Solo los pedidos en estado “Recibido” son editables.

**Permitido en Recibido:** cambiar cantidades, quitar productos, recalcular total y dejar observación interna.  
**No permitido en primera versión:** agregar productos nuevos dentro de un pedido ya recibido.  
**No editables:** Pendiente, Listo, Entregado y Cancelado.

### 3.7 Sin stock suficiente

Si no alcanza stock, el pedido queda en “Recibido”, administración/operación contacta al cliente por WhatsApp, se ajustan cantidades o productos antes de confirmar, y recién al confirmar se descuenta stock. Si el cliente no acepta, se cancela sin afectar stock.

### 3.8 Cancelación y devolución de stock

| Transición | Regla de stock |
|---|---|
| Recibido → Cancelado | No devuelve stock, porque nunca descontó. |
| Pendiente → Cancelado | Devuelve stock automáticamente. |
| Listo → Cancelado | Devuelve stock automáticamente. |
| Entregado → Cancelado | No permitido en flujo normal. |

**Motivo de cancelación obligatorio:** Cliente no retira, Cliente cancela, Producto sin stock real, Error en el pedido, Pedido duplicado u Otro. Si el motivo es “Otro”, debe exigirse observación interna.

### 3.9 Observaciones internas

Permitir observaciones internas opcionales en todos los estados. Son obligatorias cuando se cancele con motivo “Otro” o cuando se registre responsable “Otro”.

### 3.10 Historial de cambios

Guardar historial automático para acciones críticas: creación del pedido, edición de cantidades en Recibido, confirmación, cambio a Listo, cambio a Entregado, cancelación, registro de pago, cambio de método de pago y corrección de stock asociada.

---

## 4. Pagos y rendición

### 4.1 Estado de pago y método de pago

Separar estado de pago y método de pago.

**Estado de pago:** Pendiente de pago / Pagado.  
**Método de pago:** Efectivo / Transferencia.  
**No usar estados mezclados:** pagado_efectivo, pagado_transferencia, pendiente_transferencia.

### 4.2 Pago parcial

No incluir pago parcial en primera versión. Dejar para después: abono, pago parcial, saldo pendiente y control de deuda.

### 4.3 Cuándo se puede marcar como pagado

| Estado pedido | ¿Puede marcarse pagado? |
|---|---|
| Recibido | No |
| Pendiente | Sí |
| Listo | Sí |
| Entregado | Puede quedar pagado |
| Cancelado | No |

Solo pedidos confirmados pueden marcarse como pagados.

### 4.4 Entregado requiere pago

Un pedido no puede pasar a “Entregado” si mantiene estado de pago “Pendiente de pago”. Antes de entregar debe estar pagado, tener método de pago y responsable registrado.

### 4.5 Registro de pago

Al marcar un pedido como Pagado, será obligatorio seleccionar método de pago, registrar fecha/hora automáticamente y registrar responsable de venta/pago. El comprobante de transferencia no será obligatorio en primera versión.

### 4.6 Quién puede registrar pago

Pueden registrar pago y marcar como Pagado: administración, operación y venta. Cada persona que venda o reciba un pago debe rendirlo en el sistema.

### 4.7 Responsable de venta/pago

Debe seleccionarse desde lista autorizada: Carolina, Nadia, Lucía, Seba, Juan Py, Cris, Mati y Lizzie.

**Responsable “Otro”:** permitido solo como excepción. Debe quedar con alerta: “Responsable no autorizado / pendiente de validación administrativa”.

---

## 5. Catálogo, productos y stock

### 5.1 Cantidades decimales para granel

Permitir cantidades decimales para productos a granel. Unidad mínima base: 0,25 kg. Incrementos de 0,25 kg para productos por kilo.

### 5.2 Productos sin stock

Mostrar el producto como “Agotado”, pero no permitir agregarlo al pedido.

### 5.3 Productos sin imagen

Un producto sin foto puede estar visible si tiene nombre, unidad, precio y estado de stock definidos. Usar imagen genérica o marcador visual simple.

### 5.4 Productos con precio dudoso

No mostrarlos como vendibles hasta confirmar precio. Producto con precio dudoso queda inactivo o en borrador.

### 5.5 Productos activos e inactivos

**Activo:** aparece en tienda y puede recibir pedidos si tiene stock suficiente.  
**Inactivo:** no aparece en tienda y queda disponible solo para administración.

### 5.6 Corrección manual de stock

Solo administración puede corregir stock manualmente en primera versión: Carolina y Nadia. Motivo obligatorio: recuento físico, merma, error de carga inicial, compra/abastecimiento, devolución, ajuste por pedido cancelado u Otro.

### 5.7 Precio costo, precio público y margen

Separar precio costo, precio público y margen. El precio público debe ser aprobado manualmente por administración.

### 5.8 Quién aprueba precios

Solo administración puede aprobar o modificar precios públicos en primera versión: Carolina y Nadia.

### 5.9 Cambio de precio costo

No cambiar automáticamente el precio público si cambia el precio costo. Si cambia el costo, el producto queda marcado como “requiere revisión de precio”.

---

## 6. Fotos de productos

### 6.1 Carpeta de fotos

Crear o usar una carpeta en Drive dentro de recursos visuales:

```text
03_Diseño y recursos visuales / productos
```

**Subcarpetas sugeridas:** originales, aprobadas, pendientes y descartadas.

### 6.2 Criterio para aprobar fotos

Producto visible completo, imagen clara, fondo simple o no distractor, sin exceso de texto externo, sin información incorrecta y sin marcas confusas si el producto se vende a granel.

### 6.3 Nombre de archivos de imágenes

**Criterio técnico adoptado:** usar nombres simples, estables y compatibles con web.

**Regla final:** minúsculas, sin tildes, sin ñ, sin espacios, sin caracteres especiales, palabras separadas con guion bajo.

**Formato:**

```text
nombre_producto_01.jpg
nombre_producto_02.jpg
```

**Ejemplos:**

```text
avena_integral_01.jpg
garbanzos_01.jpg
lentejas_01.jpg
```

Aunque para quien sube fotos pueda parecer más fácil usar espacios, técnicamente conviene evitarlos porque después generan problemas en rutas, URLs, sincronización y automatización. En la planilla se puede mostrar el nombre del producto normal, pero el archivo debe ir limpio.

---

## 7. Panel admin

### 7.1 Filtros mínimos

**Filtros:** fecha, estado del pedido, estado de pago, método de pago y responsable de venta/pago.  
**Búsqueda:** nombre cliente, teléfono cliente y número de pedido.

### 7.2 Vista de detalle del pedido

Usar detalle desplegable o panel expandible. Debe mostrar: datos del cliente, teléfono, productos, cantidades, subtotales, total, estado del pedido, estado de pago, método de pago, responsable, observaciones internas e historial básico.

### 7.3 Alertas importantes

Pedido recibido sin revisar; responsable “Otro” pendiente; pago por transferencia pendiente de revisión externa; producto sin stock suficiente al confirmar; producto con precio pendiente; stock bajo; pedido cancelado con motivo “Otro”.

---

## 8. Contenido público

Mantener textos actuales como preliminares y no bloquear avance técnico. Carolina/Nadia deben validar información de cada sección o proponer otros textos, imágenes, videos, referencias, páginas o links.

Las secciones de historia, comunidad y participación quedan como contenido preliminar hasta validación editorial.

---

## 9. Alcance Fase 3A

### 9.1 Debe entrar sí o sí

- Datos reales de contacto.
- Lugar de retiro.
- Fechas de apertura registrables.
- Catálogo siempre visible.
- Pedido recibido sin descontar stock.
- Confirmación manual de pedido.
- Estados de pedido definidos.
- Pago separado de método de pago.
- Responsable obligatorio.
- Reglas de cancelación y devolución de stock.
- Edición limitada de pedidos en estado Recibido.
- Historial básico de acciones críticas.
- Observaciones internas.
- Panel admin más claro para operar pedidos.
- Productos activos/inactivos.
- Manejo de productos sin stock, sin imagen y con precio dudoso.
- Corrección de stock solo por administración.

### 9.2 Dejar para después

Pagos parciales, usuarios individuales complejos con permisos avanzados, caja completa, reportes avanzados, compras/abastecimiento completo, contenido editorial final, sistema avanzado de imágenes y gestión completa de proveedores.

---

## 10. Criterio para pasar a implementación técnica

El levantamiento ya queda listo para diagnóstico e implementación técnica de Fase 3A. Las preguntas pendientes para Carolina/Nadia deben quedar separadas como pendientes controlados o parámetros editables.

No esperar a tener contenido editorial completo para avanzar con Fase 3A.

---

## 11. Texto listo para WhatsApp a Carolina/Nadia

Chiquillas, estamos cerrando las reglas operativas para la siguiente etapa de la web del Almacén. Ya dejamos definido el flujo base de pedidos, pagos, stock y administración, pero necesitamos validar con ustedes algunos puntos prácticos para que el sistema quede cómodo para la operación real.

1. ¿Cuál será el horario de apertura o retiro para las próximas fechas del Almacén?
2. ¿Cuándo debería cerrarse la recepción de pedidos online antes de cada apertura?
3. ¿Quiénes deberían poder confirmar un pedido recibido y descontar stock?
4. ¿Quiénes deberían poder cancelar pedidos?
5. ¿El flujo general les acomoda? Pedido recibido → revisión → confirmación → preparación → pago → entrega → rendición.
6. Para el catálogo, proponemos estas categorías iniciales: Granel, Alimentos, Limpieza, Higiene y Otros. ¿Les sirven o quieren agregar/cambiar alguna?
7. ¿En qué orden prefieren mostrar las categorías en la tienda?
8. Según los productos actuales, proponemos estas unidades de venta: Unidad, kilo, gramos, litro, mililitro y pack. ¿Falta alguna unidad?
9. ¿Existen productos que quieren tener registrados internamente, pero que no se vendan online y sean solo para venta presencial?
10. Los textos actuales de la web pueden quedar como preliminares mientras seguimos avanzando. ¿Quieren corregir textos, agregar secciones, imágenes, videos, links o referencias?
11. En las secciones de historia, comunidad y participación, ¿quieren mantener la base actual o proponer otra información?

Con esas respuestas dejamos la Fase 3A lista para implementación técnica.

---

## 12. Nota de seguridad

La contraseña del correo fue compartida por WhatsApp durante el levantamiento. No debe quedar registrada en documentos públicos, código, Drive operativo ni checklist compartido. Se debe cambiar la contraseña y guardar el nuevo acceso por un canal seguro. Este documento no reproduce esa contraseña.
