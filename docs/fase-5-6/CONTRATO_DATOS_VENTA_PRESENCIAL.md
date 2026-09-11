# Contrato de datos propuesto — venta presencial, comandas y caja

**Estado:** contrato preparatorio local. No crea columnas, hojas, rutas ni
escrituras. La migración aditiva debe revisarse y ejecutarse primero en TEST.

## Relación con APERTURAS

Toda venta presencial requiere `apertura_id` existente y habilitado para modo
presencial. El backend futuro calculará esa condición desde `APERTURAS`; el
cliente nunca la declara como verdadera. Las fechas se manejan como hora local
de Santiago en formato `yyyy-MM-ddTHH:mm`, sin conversiones de zona horaria.

## Entrada mínima desde el panel vendedor

| Campo | Formato | Regla |
| --- | --- | --- |
| `apertura_id` | `APE-yyyyMMdd` | Obligatorio; debe corresponder a una apertura habilitada. |
| `fecha_hora` | `yyyy-MM-ddTHH:mm` | Obligatoria; el servidor puede reemplazarla por su hora confiable. |
| `lineas[].producto_id` | id de PRODUCTOS | Obligatorio y existente. |
| `lineas[].cantidad` | número positivo | Entera o decimal según producto y paso de venta. |
| `forma_pago` | `efectivo`, `transferencia`, `pendiente` | Obligatoria. |
| `vendedor` | identificador autorizado | Obligatorio; se validará contra sesión/rol futuro. |
| `observaciones` | texto | Opcional, interno. |

No se recibe como confiable `precio_unitario`, subtotal, total, stock ni estado
de apertura. Los calcula o verifica el backend con lock de concurrencia.

## Registros propuestos

### VENTAS

Campos mínimos por confirmar antes de crear o migrar la hoja: `venta_id`,
`fecha_hora`, `apertura_id`, `origen_venta` (`presencial`), `total`,
`estado_venta`, `estado_pago`, `forma_pago`, `vendedor`, `observaciones` y
auditoría técnica. `estado_venta` y la política de anulación siguen pendientes
de confirmación del Almacén.

### DETALLE_VENTAS

Cada fila: `detalle_venta_id`, `venta_id`, `producto_id`, nombre de referencia
si se necesita para lectura, `cantidad`, `precio_unitario` calculado y
`subtotal` calculado. El detalle no acepta precio desde navegador.

### MOVIMIENTOS_STOCK

La venta confirmada generará una salida trazable con origen de venta y
referencia a `venta_id`. Las devoluciones, anulaciones y ajustes requieren una
decisión operativa antes de implementarse para no duplicar stock.

## Comanda preparada

Una comanda derivada contiene `venta_id`, `fecha_hora`, `apertura_id`, detalle,
total y `estado_pago`. No expone observaciones internas ni auditoría. Su diseño
de impresión, copias y numeración visible quedan por validar con el Almacén.

## Resumen por apertura

| Campo | Tratamiento |
| --- | --- |
| total/cantidad pedidos anticipados | Se muestran aparte de venta presencial. |
| total/cantidad ventas presenciales | Se calculan solo desde ventas vigentes. |
| total general | Suma vigente; no incluye cancelados. |
| pendientes | Cantidad y monto separado para revisión. |
| cancelados | Cantidad y monto separado, sin sumar a caja. |
| formas de pago | Efectivo, transferencia y efectivo al retirar cuando aplique. |
| efectivo esperado/declarado | La diferencia se reporta, no se resuelve automáticamente. |

`efectivo_al_retirar` necesita una regla de origen antes de implementarse: debe
evitar contar dos veces un pedido anticipado que se paga al entregarse.

## Público, interno y acceso

Esta información es de operación; no forma parte de endpoints públicos. Un
vendedor verá solo lo necesario para vender/comandar. Caja, observaciones,
auditoría, diferencias y reportes completos permanecen para roles autorizados.

## Validaciones que deben vivir en el servidor futuro

1. Sesión y autorización de vendedor/administración.
2. Apertura existente, no cerrada/cancelada y modo presencial habilitado.
3. Producto activo, cantidad válida, stock suficiente y precio vigente.
4. Cálculo de total y descuento de stock bajo bloqueo de concurrencia.
5. Escritura coherente de cabecera, detalle y movimiento o reversión completa.
6. Resumen filtrado por `apertura_id` y exclusión de cancelados.
7. Cierre con responsable, efectivo declarado, revisión de pendientes y
   diferencia documentada; no autorizar cierres silenciosos.
