# Fase 5 + Fase 6 — preparación técnica: panel vendedor, comandas y caja

**Estado:** implementada en código; pendiente despliegue y validación manual en
TEST. No implementada ni autorizada en producción.
**Alcance:** venta presencial, comanda y resumen/cierre de lectura por apertura.

## Diagnóstico de partida

La aplicación ya dispone de panel administrativo autenticado, listado y manejo
de pedidos anticipados, catálogo con reglas de stock y cantidad, y calendario
`APERTURAS` validado exclusivamente en TEST. El modelo histórico además
contempla `VENTAS`, `DETALLE_VENTAS` y `MOVIMIENTOS_STOCK`.

El código ya incluye una pantalla protegida por la sesión admin existente,
escritura TEST en `VENTAS`, `DETALLE_VENTAS`, `MOVIMIENTOS_STOCK` y `PRODUCTOS`,
comanda, y resumen de caja. No existe todavía un rol vendedor separado ni un
cierre persistente. La preparación aditiva y el flujo E2E deben ejecutarse y
verificarse manualmente en la Sheet TEST antes de considerar cerradas las fases.

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

## Acciones Apps Script implementadas en el repositorio

El archivo `scripts/apps-script-pedidos.gs` incorpora, siempre bajo
`APP_ENV=TEST` y token administrativo:

1. preparación aditiva e idempotente de columnas mínimas;
2. `crearVentaPresencial`: bajo `LockService`, validar apertura habilitada,
   catálogo, stock y precios de servidor; escribir `VENTAS`, `DETALLE_VENTAS`
   y `MOVIMIENTOS_STOCK` de manera coherente;
3. `obtenerVentaPresencial` y `listarVentasPorApertura`;
4. `obtenerResumenApertura`, incluyendo pedidos anticipados, pendientes y
   cancelados separados;
5. UI de cierre de lectura/borrador, sin mutar `estado_apertura`.

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
3. Pegar/desplegar Apps Script TEST y ejecutar la preparación aditiva.
4. Probar venta, stock, comanda, concurrencia e idempotencia.
5. Validar el resumen de lectura con una apertura TEST controlada.
6. Evaluar cierre persistente solo después de auditoría operativa.
