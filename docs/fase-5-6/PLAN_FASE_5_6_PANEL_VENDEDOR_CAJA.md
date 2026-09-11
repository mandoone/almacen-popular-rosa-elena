# Fase 5 + Fase 6 — preparación técnica: panel vendedor, comandas y caja

**Estado:** preparación local; no implementada en TEST ni en producción.
**Alcance:** define el siguiente bloque técnico sin crear escrituras, rutas ni
acciones de Apps Script.

## Diagnóstico de partida

La aplicación ya dispone de panel administrativo autenticado, listado y manejo
de pedidos anticipados, catálogo con reglas de stock y cantidad, y calendario
`APERTURAS` validado exclusivamente en TEST. El modelo histórico además
contempla `VENTAS`, `DETALLE_VENTAS` y `MOVIMIENTOS_STOCK`.

No existe aún un rol/sesión de vendedor separado, una pantalla de venta
presencial, una escritura real en `VENTAS` o `DETALLE_VENTAS`, ni un resumen o
cierre persistente de caja. La existencia y encabezados operativos de esas
hojas deben verificarse en la Sheet TEST antes de la siguiente implementación;
este plan no los da por creados ni los modifica.

## Fase 5 — panel vendedor y comandas

### Objetivo y pantallas futuras

Permitir que una persona autorizada registre una venta presencial asociada a
una apertura habilitada y obtenga una comanda preparada para impresión futura.
Se requerirán acceso de vendedor diferenciado, resolución segura de apertura,
catálogo/carrito presencial, confirmación de pago/vendedor y comanda posterior
a la asignación de `venta_id` por el servidor.

### Reglas preparadas

- `apertura_id`, fecha/hora, vendedor y líneas son obligatorios.
- El origen se guardará como `presencial`; el canal específico sigue las
  decisiones Fase 3B y debe confirmarse en el contrato de backend.
- Cada producto debe existir, estar vendible, respetar unidad/decimales y no
  superar stock.
- Precio y total se calculan desde catálogo confiable del servidor; el
  navegador no será fuente de precios ni de totales.
- Una comanda conserva venta, apertura, detalle, total y estado de pago; su
  formato impreso queda pendiente de validación operativa.

## Fase 6 — caja, pendientes y cierre por apertura

### Objetivo y resumen futuro

Consolidar por apertura pedidos anticipados y ventas presenciales, separar
cancelados y pendientes, y preparar un cierre revisable sin cerrar por
accidente. El resumen incluirá totales/cantidades por origen, total general
vigente, cobrado, pendiente, cancelado, formas de pago, efectivo esperado,
declarado, diferencia y observaciones.

La primera versión será de lectura/preparación. Una diferencia de caja genera
revisión humana, no bloquea ni aprueba automáticamente el cierre.

## Acciones Apps Script que requiere una tarea futura

Ninguna de estas acciones existe por este cambio. En TEST, y tras verificar el
schema, la implementación futura debe incorporar:

1. lectura de productos vendibles para venta presencial;
2. `crearVentaPresencial`: bajo `LockService`, validar apertura habilitada,
   catálogo, stock y precios de servidor; escribir `VENTAS`, `DETALLE_VENTAS`
   y `MOVIMIENTOS_STOCK` de manera coherente;
3. lectura de resumen por `apertura_id`, incluyendo pedidos anticipados;
4. borrador/revisión de cierre de solo lectura;
5. solo después de validar el contrato, una acción explícita de cierre con
   responsable, efectivo declarado, observaciones y auditoría.

La acción final debe rechazar producción mientras no exista autorización Go/No-Go
separada y conservar los guardrails TEST ya establecidos.

## Riesgos y decisiones pendientes

- Confirmar quién puede vender, corregir/anular una venta y aprobar diferencias.
- Definir cómo se registra el efectivo al retirar sin duplicar caja.
- Confirmar formato, numeración y contenido visible de la comanda.
- Definir política de devoluciones/ajustes y sus movimientos de stock.
- Confirmar si el cierre cambia `APERTURAS.estado_apertura` o si es registro
  separado; esta preparación no toma esa decisión.

## Secuencia recomendada para TEST

1. Revisar hojas y encabezados reales, sin inferir datos faltantes.
2. Acordar contrato, permisos y estados con el Almacén.
3. Implementar Apps Script TEST y migración aditiva, con prueba controlada.
4. Conectar UI protegida y probar venta, cancelación, stock y comanda.
5. Implementar resumen de lectura y validar caja con una apertura real.
6. Evaluar cierre persistente solo después de auditoría operativa.
